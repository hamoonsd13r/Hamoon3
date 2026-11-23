// Subtitles file (SRT) for YouTube / Instagram from the narration timing — what YouTube shows as closed captions
// (searchable, translatable) instead of, or beside, burned-in captions. Persian works as is (UTF-8 with BOM).
// Input, best first:
//   captions.json (tools/captions.mjs: the SHOWN wording — digits, Latin names — timed by the spoken words)
//   vo.json / words.json / Scribe JSON (spoken words; sentences from line numbers or end punctuation)
// Cues follow sentences; a sentence longer than --max characters is split at a punctuation mark (or word) near its middle,
// timed by the word there. Each cue lasts until shortly after its last word (--tail), never into the next cue.
// Usage: node tools/srt.mjs <captions.json|words.json> <out.srt> [--max 70] [--tail 0.25] [--shift 0]
import fs from "node:fs";
import { loadWords, pauseKind } from "./lib/words.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const [inp, out] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!out) { console.log("usage: node tools/srt.mjs <captions.json|words.json> <out.srt> [--max 70] [--tail 0.25] [--shift 0]"); process.exit(1); }
const MAX = opt("max", 70), TAIL = opt("tail", 0.25), SHIFT = opt("shift", 0);

// → sentences: [{ words: [{ w, s, e }] }]
const j = JSON.parse(fs.readFileSync(inp, "utf8"));
let sentences = [];
if (Array.isArray(j) && j.length && Array.isArray(j[0].words)) {
  // captions.json chunks: group consecutive chunks of the same narration line
  for (const c of j) {
    const ws = c.words.map((x) => ({ w: x.w, s: x.s, e: x.e }));
    const last = sentences.at(-1);
    if (last && last.line === c.line) last.words.push(...ws);
    else sentences.push({ line: c.line, words: ws });
  }
} else {
  const words = loadWords(inp);
  let cur = [];
  words.forEach((w, i) => { cur.push(w); if (pauseKind(words, i) === "sent") { sentences.push({ words: cur }); cur = []; } });
  if (cur.length) sentences.push({ words: cur });
}
const text = (ws) => ws.map((x) => x.w).join(" ");
const split = (ws) => {
  if (text(ws).length <= MAX || ws.length < 4) return [ws];
  const mid = text(ws).length / 2;
  let best = -1, bd = Infinity, acc = 0;
  const pick = (punct) => { acc = 0; ws.forEach((x, i) => { acc += x.w.length + 1; if (i > 0 && i < ws.length - 2 && (!punct || /[،,؛;:]$/.test(x.w)) && Math.abs(acc - mid) < bd) { bd = Math.abs(acc - mid); best = i; } }); };
  pick(true);
  if (best < 0 || bd > mid * 0.45) { bd = Infinity; pick(false); }
  return [...split(ws.slice(0, best + 1)), ...split(ws.slice(best + 1))];
};
const cues = [];
for (const s of sentences) for (const ws of split(s.words)) cues.push([ws[0].s + SHIFT, ws.at(-1).e + SHIFT, text(ws)]);
const ts = (sec) => { const ms = Math.max(0, Math.round(sec * 1000)); const p = (n, k = 2) => String(n).padStart(k, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`; };
const body = cues.map(([a, b, x], i) => `${i + 1}\n${ts(a)} --> ${ts(Math.min(b + TAIL, i + 1 < cues.length ? cues[i + 1][0] - 0.02 : b + TAIL))}\n${x}\n`).join("\n");
fs.writeFileSync(out, "﻿" + body);
console.log(`${cues.length} cues → ${out}`);
