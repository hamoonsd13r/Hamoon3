// Voice over bed, word by word: for every narration word (its spoken frames), the voice stem's level minus everything else (music + fx +
// amb stems) in the same window. The house rule: every word at least ~10 dB over the bed; report median, p10 and the
// words under the bar (the loudest effect there is usually the culprit: lower it or move it off the word).
// Usage: node src/styles/toon3d/pipeline/margin.mjs <id> [--min 10]     (reads videos/<id>/audio/stem-*.wav and src/<id>/vo.json)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { parseArgs, die, film, ROOT } from "./lib.mjs";

const a = parseArgs();
const [slug] = a._;
if (!slug) die("usage: node src/styles/toon3d/pipeline/margin.mjs <id> [--min 10]");
const dir = film(slug) + "/audio", min = Number(a.min ?? 10), SR = 16000;
const pcm = (f) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const stems = fs.readdirSync(dir).filter((f) => /^stem-.*\.wav$/.test(f));
if (!stems.includes("stem-voice.wav")) die(`no ${dir}/stem-voice.wav (run the film's build-audio.cjs first)`);
const voice = pcm(`${dir}/stem-voice.wav`);
const bed = new Float32Array(voice.length);
const parts = {};
for (const f of stems.filter((f) => f !== "stem-voice.wav")) { const x = pcm(`${dir}/${f}`); parts[f.slice(5, -4)] = x; for (let i = 0; i < Math.min(x.length, bed.length); i++) bed[i] += x[i]; }
const rms = (x, i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, i1 - i0)) + 1e-9; };
const db = (r) => 20 * Math.log10(r);
// the film's word timing: src/<id>/vo.json (doc-build-vo output), else videos/<id>/dlg/vo.json
const voFile = [path.join(ROOT, "src", slug, "vo.json"), film(slug) + "/dlg/vo.json"].find((f) => fs.existsSync(f));
if (!voFile) die(`no vo.json for ${slug} (src/${slug}/vo.json or videos/${slug}/dlg/vo.json)`);
const VO = JSON.parse(fs.readFileSync(voFile, "utf8"));
// the spoken part of each word: its 10 ms frames within 10 dB of the word's loudest (trailing silence does not count)
const spoken = (i0, i1) => { const F = 160, fr = []; for (let k = i0; k + F <= i1; k += F) fr.push([k, rms(voice, k, k + F)]); const top = Math.max(...fr.map((p) => p[1])); return fr.filter((p) => p[1] >= top / Math.sqrt(10)).map((p) => p[0]); };
const rmsAt = (x, ks) => Math.sqrt(ks.reduce((s, k) => s + rms(x, k, k + 160) ** 2, 0) / Math.max(1, ks.length)) + 1e-9;
const rows = VO.words.map((w) => {
  const i0 = Math.round(w.s * SR), i1 = Math.max(i0 + 160, Math.round(w.e * SR)), ks = spoken(i0, i1);
  const m = db(rmsAt(voice, ks)) - db(rmsAt(bed, ks));
  const loud = Object.entries(parts).map(([k, x]) => [k, db(rmsAt(x, ks))]).sort((p, q) => q[1] - p[1])[0];
  return { w: w.w, line: w.line, s: w.s, m, loud: loud?.[0] };
});
const ms = rows.map((r) => r.m).sort((p, q) => p - q), q = (p) => ms[Math.floor(p * (ms.length - 1))];
console.log(`${rows.length} words: voice over bed median ${q(0.5).toFixed(1)} dB, p10 ${q(0.1).toFixed(1)} dB, min ${ms[0].toFixed(1)} dB`);
const low = rows.filter((r) => r.m < min);
console.log(low.length ? `under ${min} dB (${low.length}):` : `every word is at least ${min} dB over the bed`);
for (const r of low) console.log(`  ${r.s.toFixed(2)}s  line ${r.line}  ${r.w}  ${r.m.toFixed(1)} dB  (loudest bed stem: ${r.loud})`);
