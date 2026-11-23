// Talk Cutout · caption chunks cut by hand on the phrases (an automatic splitter breaks phrases in the wrong place):
// words.json + a config → captions.ts (Cap[]: a, b, text, key, hide, at).
//   counts: words per chunk, sentence by sentence ([[7,2,6],[4,4,3],…]); each sentence must add up to its word count
//   disp:   spoken → shown («سه» → «3»: Latin digits on screen; «کلمه» → «کلمه‌ی»)
//   star:   true → «درآمد» → «درآ*مد», «دلار» → «د*لار» (on screen, in captions and on cards)
//   key:    words that turn accent (match without punctuation; «"«قدم»"» matches only the quoted one)
//   hide:   [[a, b], …] film seconds where captions step aside (e.g. while her words type themselves into an app)
//   hideChunks: [[si, k], …] the same by chunk (sentence si, its k-th chunk): survives a new voice's timings
//   importFrom: the path of lib/captions from the folder of the output (default "../lib/captions")
// usage: node pipeline/captions.mjs <words.json> <captions.config.json> <out captions.ts>
import fs from "node:fs";

const [wPath, cPath, out] = process.argv.slice(2);
if (!out) throw new Error("usage: node captions.mjs <words.json> <captions.config.json> <out captions.ts>");
const raw = JSON.parse(fs.readFileSync(wPath, "utf8"));
const W = Array.isArray(raw) ? raw : raw.words;
const cfg = JSON.parse(fs.readFileSync(cPath, "utf8"));
const disp = cfg.disp ?? {};
const keys = new Set(cfg.key ?? []);
const hide = cfg.hide ?? [];
const star = (s) => (cfg.star ? s.replace(/درآمد/g, "درآ*مد").replace(/دلار/g, "د*لار") : s);
const bare = (s) => s.replace(/[.،؟!؛:,]$/, "");
const hideChunks = cfg.hideChunks ?? [];
const chunks = [];
cfg.counts.forEach((counts, si) => {
  const ws = W.filter((w) => w.si === si);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== ws.length) throw new Error(`sentence ${si}: the counts add up to ${total}, words.json has ${ws.length} words`);
  let k = 0;
  counts.forEach((n, ci) => {
    const toks = ws.slice(k, k + n).map((w) => {
      const m = w.w.match(/^(.*?)([.،؟!؛:]?)$/);
      return { w: star((disp[m[1]] ?? m[1]) + m[2]), s: w.s };
    });
    toks.hid = hideChunks.some(([a, b]) => a === si && b === ci);
    chunks.push(toks);
    k += n;
  });
});
const lastC = chunks[chunks.length - 1];
if (!/[.،؟!]$/.test(lastC[lastC.length - 1].w)) lastC[lastC.length - 1].w += ".";
const total = W[W.length - 1].e;
const lines = chunks.map((toks, i) => {
  const a = Math.max(0, toks[0].s - 0.06);
  const b = i + 1 < chunks.length ? Math.max(0, chunks[i + 1][0].s - 0.06) : total + 0.6;
  const key = toks.map((x) => x.w).filter((x) => keys.has(bare(x)) || keys.has(x));
  const hid = toks.hid || toks.some((x) => hide.some(([h0, h1]) => x.s >= h0 && x.s < h1));
  return `  { a: ${a.toFixed(2)}, b: ${b.toFixed(2)}, text: ${JSON.stringify(toks.map((x) => x.w).join(" "))}${key.length ? `, key: ${JSON.stringify(key)}` : ""}${hid ? ", hide: true" : ""}, at: [${toks.map((x) => x.s.toFixed(2)).join(", ")}] },`;
});
fs.writeFileSync(
  out,
  `// Caption chunks, generated from words.json by pipeline/captions.mjs (do not edit by hand: edit the config, re-run).
// Each chunk shows from a to b; its words appear on the spoken words (at). Key words turn accent.
import type { Cap } from "${cfg.importFrom ?? "../lib/captions"}";

export const CAPS: Cap[] = [
${lines.join("\n")}
];
`,
);
console.log(lines.join("\n"));
