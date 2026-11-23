// Speech Cleanup · step 10 — QA for a cut list: lists every join that removed words (to read for sentence flow) and any cut edge
// that lands inside a word.
// usage: node src/styles/speech-cleanup/pipeline/joins.mjs <dir> <variant> [fps=60]   → <dir>/joins-<variant>.txt (read every join for sentence flow)
import fs from "node:fs";
import path from "node:path";

const [dir, v, fpsArg = "60"] = process.argv.slice(2);
const FPS = Number(fpsArg);
const toks = JSON.parse(fs.readFileSync(path.join(dir, "stt/words.json"), "utf8")).filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
const segs = JSON.parse(fs.readFileSync(path.join(dir, `segments-${v}.json`), "utf8")).map((s) => ({ a: s.fa / FPS, b: s.fb / FPS }));
const kept = (w) => segs.some((s) => (w.start + w.end) / 2 >= s.a && (w.start + w.end) / 2 < s.b);
const eb = fs.readFileSync(path.join(dir, "env10ms.f32"));
const env = new Float32Array(eb.buffer, eb.byteOffset, eb.length / 4);
const SIL = Float32Array.from(env).sort()[Math.floor(env.length * 0.1)] + 8;
const words = toks.filter((w) => w.type === "word");
const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

let joins = 0;
const out = [];
for (let k = 0; k + 1 < segs.length; k++) {
  const gapA = segs[k].b, gapB = segs[k + 1].a;
  const gone = words.filter((w) => (w.start + w.end) / 2 >= gapA && (w.start + w.end) / 2 < gapB);
  if (!gone.length) continue;
  joins++;
  const before = words.filter((w) => w.end <= gapA + 0.05 && kept(w)).slice(-7).map((w) => w.text).join(" ");
  const after = words.filter((w) => w.start >= gapB - 0.05 && kept(w)).slice(0, 7).map((w) => w.text).join(" ");
  out.push(`${t(gapA)} …${before} ⟦${gone.map((w) => w.text).join(" ").slice(0, 90)}⟧ ${after}…`);
}
// cut edges inside words
const clipped = [];
for (const s of segs) for (const edge of [s.a, s.b]) {
  const w = toks.find((x) => x.type === "word" && edge > x.start + 0.04 && edge < x.end - 0.04);
  const loudAt = Math.max(...[-0.02, -0.01, 0, 0.01, 0.02].map((d) => env[Math.floor((edge + d) * 100)]));
  if (w && loudAt > SIL) clipped.push(`${t(edge)} inside «${w.text}» (${w.start.toFixed(2)}–${w.end.toFixed(2)}) at ${loudAt.toFixed(0)} dB`);
}
// fillers / coughs whose sound is still on the timeline
const FILL = /^(اِ|ا|اه|اِاِاِ|ااا|اِاَ|آ|آم|امم|اممم|اِمم|اِممم|مم|ممم|اوم|هوم)[.…]*$/;
for (const w of toks) {
  const junk = (w.type === "word" && FILL.test(w.text.replace(/[‌]/g, ""))) || (w.type === "audio_event" && /سرف|عطسه|خوردن|AirPod/.test(w.text));
  if (!junk) continue;
  for (const s of segs) {
    const x0 = Math.max(s.a, w.start), x1 = Math.min(s.b, w.end);
    if (x1 - x0 < 0.05) continue;
    let loud = 0;
    for (let x = x0; x < x1; x += 0.01) if (env[Math.floor(x * 100)] > SIL + 6) loud += 0.01;
    if (loud >= 0.06) clipped.push(`${t(w.start)} kept junk «${w.text}»: ${loud.toFixed(2)}s of its sound is still in`);
  }
}
fs.writeFileSync(path.join(dir, `joins-${v}.txt`), out.join("\n") + "\n");
console.log(`${v}: ${joins} joins remove words → joins-${v}.txt; edges inside a word: ${clipped.length}`);
clipped.forEach((c) => console.log("  ", c));
