// Painted Story · storyboard timing BEFORE the voice exists. lines.json → vo.json with a believable start/end for every
// line and word (the pace of a calm Persian narrator on eleven_v4 at --tempo 1.08: ~0.088 s per letter, 0.074 s
// between words, longer after «؛ : . ؟»). Shots and cards anchor to words, so when the real voice arrives
// (tools/doc-build-vo.mjs writes the same vo.json format) every cut moves onto the real words by itself.
//
// lines.json (the same file tools/doc-voices.mjs reads):
//   [{ "n": 1, "sp": "N", "fa": "[calm] ساعتِ شیش صبح، …", "gap": 0.5 }]   [tags] are dropped, gap = pause after the line
// Usage: node estimate-vo.mjs <lines.json> <out vo.json> [--lead 0.6] [--tail 4] [--pace 1.0]
//   --pace 1.1 = 10% faster speech
import fs from "node:fs";

const args = process.argv.slice(2);
const [inFile, outFile] = args.filter((a) => !a.startsWith("--") && !/^[\d.]+$/.test(a));
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? +args[i + 1] : d;
};
if (!inFile || !outFile) throw new Error("usage: node estimate-vo.mjs <lines.json> <out vo.json> [--lead 0.6] [--tail 4] [--pace 1.0]");
const LEAD = opt("--lead", 0.6), TAIL = opt("--tail", 4), PACE = opt("--pace", 1.0);

const lines = JSON.parse(fs.readFileSync(inFile, "utf8"));
const letters = (w) => w.replace(/[‌ً-ْٰ«»"'“”،؛,.!?؟:;…()\-—]/g, "").length;
const latin = (w) => /[a-z]/i.test(w);

const segs = [], words = [];
let t = LEAD;
lines.forEach((l, i) => {
  const text = String(l.fa ?? l.text ?? "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  const ws = text.split(" ").filter(Boolean);
  const start = t;
  ws.forEach((w, j) => {
    const n = letters(w);
    let d = Math.max(0.16, n * (latin(w) ? 0.07 : 0.088)) / PACE;
    if (/[،,]$/.test(w)) d += 0.12 / PACE; // the voice stretches the word before a comma
    words.push({ w, s: +t.toFixed(3), e: +(t + d).toFixed(3), line: l.n });
    t += d;
    if (j < ws.length - 1) t += (/[؛:;]$/.test(w) ? 0.22 : /[.!?؟…]$/.test(w) ? 0.3 : 0.074) / PACE;
  });
  segs.push({ n: l.n, sp: l.sp ?? "N", start: +start.toFixed(3), end: +t.toFixed(3) });
  const next = lines[i + 1];
  t += l.gap ?? (next ? (next.sp !== l.sp ? 0.45 : 0.35) : 0);
});
const total = +(t + TAIL).toFixed(3);
fs.writeFileSync(outFile, JSON.stringify({ total, estimated: true, segs, words }));
console.log(`${segs.length} lines · ${words.length} words · ${total.toFixed(1)} s → ${outFile}`);
