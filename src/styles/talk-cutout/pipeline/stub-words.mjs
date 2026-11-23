// Talk Cutout · planning timings before you have a voice: script.txt (one sentence per line) → words.json with
// estimated times (a casual Persian pace, ~2.7 words/s, pauses after «،» «؛» «:» and at sentence ends). Lay the film
// out on these, then replace words.json with the real alignment of the speaker's voice (tools/eleven-align.mjs or
// words-from-stt.mjs) — every cue is a word (at(si, "کلمه")), so the picture follows the real voice by itself.
// usage: node pipeline/stub-words.mjs <script.txt> <out words.json> [start=0.15] [pace=1]
import fs from "node:fs";

const [src, out, start = "0.15", pace = "1"] = process.argv.slice(2);
if (!out) throw new Error("usage: node stub-words.mjs <script.txt> <out words.json> [start] [pace]");
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const k = Number(pace);
let t = Number(start);
const words = [];
lines.forEach((line, si) => {
  const toks = line.split(/\s+/);
  toks.forEach((w, wi) => {
    const letters = w.replace(/[.,!?؟،؛:«»"'()‌]/g, "").length;
    const d = Math.min(0.62, Math.max(0.14, 0.08 + 0.05 * letters)) / k;
    words.push({ si, wi, w, s: +t.toFixed(3), e: +(t + d).toFixed(3) });
    t += d + 0.03 / k;
    if (/[،,:]$/.test(w)) t += 0.16 / k;
    if (/[؛;]$/.test(w)) t += 0.22 / k;
    if (wi === toks.length - 1) t += 0.38 / k;
  });
});
fs.writeFileSync(out, JSON.stringify(words));
lines.forEach((_, si) => {
  const ws = words.filter((w) => w.si === si);
  console.log(si, ws[0].s.toFixed(2), "→", ws[ws.length - 1].e.toFixed(2), "|", ws.map((w) => w.w).join(" "));
});
console.log(words.length, "words · ends", words[words.length - 1].e.toFixed(2), "s");
