// Talk Page — loudness of the talk's own sound, one value per video frame, for live waveforms on the table
// (VoiceWave + envLevel in lib/elements: a phone call, a voice note, a song playing).
// usage: node src/styles/talk-page/pipeline/voice-env.cjs <talk.mov> <src/v01/env.json> [fps=30]
// → {"fps":30,"db":[-61.2,-58.0,…]}  (RMS dBFS per 1/fps window of the first audio track)
const { execFileSync } = require("child_process");
const fs = require("fs");
const [inp, out, fpsArg = "30"] = process.argv.slice(2);
if (!inp || !out) {
  console.log("usage: node voice-env.cjs <talk.mov> <env.json> [fps]");
  process.exit(1);
}
const fps = Number(fpsArg);
const SR = 16000;
const buf = execFileSync("ffmpeg", ["-v", "error", "-i", inp, "-map", "0:a:0", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
const win = SR / fps;
const db = [];
for (let i = 0; i + win <= x.length; i += win) {
  let s = 0;
  for (let k = Math.floor(i); k < Math.floor(i + win); k++) s += x[k] * x[k];
  db.push(Math.round(10 * Math.log10(s / win + 1e-12) * 10) / 10);
}
fs.writeFileSync(out, JSON.stringify({ fps, db }));
console.log(`${db.length} frames (${(db.length / fps).toFixed(1)} s) → ${out}`);
