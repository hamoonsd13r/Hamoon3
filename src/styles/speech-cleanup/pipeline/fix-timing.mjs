// Speech Cleanup · step 3 — clamps words whose timestamps run far past their sound (e.g. a word "lasting" 46 s across a silence)
// to the voiced part, using the 10 ms loudness envelope. Keeps the original as words-raw.json.
// usage: node src/styles/speech-cleanup/pipeline/fix-timing.mjs <sttDir> <env10ms.f32>
import fs from "node:fs";
import path from "node:path";

const [dir, envPath] = process.argv.slice(2);
const raw = path.join(dir, "words-raw.json"), cur = path.join(dir, "words.json");
if (!fs.existsSync(raw)) fs.copyFileSync(cur, raw);
const words = JSON.parse(fs.readFileSync(raw, "utf8"));
const b = fs.readFileSync(envPath);
const env = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const SIL = Float32Array.from(env).sort()[Math.floor(env.length * 0.1)] + 8;
const voicedAt = (t) => env[Math.floor(t * 100)] > SIL;

for (const w of words) {
  if (w.type !== "word") continue;
  const d = w.end - w.start, len = w.text.replace(/[^\p{L}]/gu, "").length;
  if (d < Math.max(1.0, 0.18 * len + 0.4)) continue;
  // voiced clusters inside the word (gaps under 0.3 s join)
  const cl = [];
  for (let t = w.start; t < w.end; t += 0.01) {
    if (!voicedAt(t)) continue;
    const last = cl.at(-1);
    if (last && t - last.b < 0.3) last.b = t + 0.01; else cl.push({ a: t, b: t + 0.01 });
  }
  if (!cl.length) continue;
  const voiced = cl.reduce((s, c) => s + c.b - c.a, 0);
  if (voiced / d > 0.7) continue;
  const was = `${w.start.toFixed(2)}–${w.end.toFixed(2)}`;
  if (cl[0].a - w.start < 0.3) w.end = +(cl[0].b + 0.03).toFixed(3); // sound at the start: the end was stretched
  else w.start = +(cl.at(-1).a - 0.03).toFixed(3); // sound at the end: the start was stretched
  console.log(`«${w.text}» ${was} → ${w.start.toFixed(2)}–${w.end.toFixed(2)}`);
}
// words given (almost) no duration: if a voiced stretch that no other token covers sits just before them,
// that stretch is the word (e.g. «اما» stamped 20 ms at 1488.74 while it was spoken at 1487.96–1488.44)
const toks = words.filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
toks.forEach((w, i) => {
  if (w.type !== "word" || w.end - w.start >= 0.035) return; // only stamps that are clearly broken (≈ zero length)
  const prevEnd = i > 0 ? toks[i - 1].end : 0;
  const lo = Math.max(prevEnd + 0.05, w.start - 1.2);
  // the last voiced cluster (gaps < 0.06 s join, so an isolated click stays out) before the stamp: skip the silence just before it first
  const strong = (x) => env[Math.floor(x * 100)] > SIL + 6; // the word's body, not breath or a click
  let t = w.start - 0.01;
  while (t > lo && !strong(t)) t -= 0.01;
  if (t <= lo) return;
  const b = t + 0.01;
  let a = t;
  for (t -= 0.01; t > lo; t -= 0.01) { if (strong(t)) a = t; else if (a - t > 0.06) break; }
  const maxLen = 0.3 + 0.12 * w.text.replace(/[^\p{L}]/gu, "").length;
  if (a == null || b - a < 0.08 || b - a > maxLen) return;
  const was = `${w.start.toFixed(2)}–${w.end.toFixed(2)}`;
  w.start = +(a - 0.02).toFixed(3);
  w.end = +Math.max(w.end, b + 0.02).toFixed(3);
  console.log(`«${w.text}» ${was} → ${w.start.toFixed(2)}–${w.end.toFixed(2)} (tiny stamp, voiced stretch before it)`);
});
fs.writeFileSync(cur, JSON.stringify(words));
