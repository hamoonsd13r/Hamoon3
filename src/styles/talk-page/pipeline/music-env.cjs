// Talk Page — read a music track's real structure before cutting it: RMS and low band (< 150 Hz, the kick/bass) per
// 0.5 s in 4 columns; with ranges, a fine RMS per 0.1 s (to find a phrase's first kick for --seg in music-const.cjs).
// Generated music rarely keeps the sections of its plan — always measure.
// usage: node src/styles/talk-page/pipeline/music-env.cjs <music> [a-b a-b …]
const { execFileSync } = require("child_process");
const [f, ...ranges] = process.argv.slice(2);
if (!f) {
  console.log("usage: node music-env.cjs <music> [a-b …]");
  process.exit(1);
}
const sr = 8000;
const buf = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
const dB = (v) => (10 * Math.log10(v + 1e-12)).toFixed(0);
if (!ranges.length) {
  const W = sr / 2;
  let lp = 0;
  const out = [];
  const a = 1 - Math.exp((-2 * Math.PI * 150) / sr);
  for (let i = 0; i + W <= x.length; i += W) {
    let s = 0;
    let sl = 0;
    for (let j = i; j < i + W; j++) {
      lp += a * (x[j] - lp);
      s += x[j] * x[j];
      sl += lp * lp;
    }
    out.push(`${(i / sr).toFixed(1).padStart(5)} ${dB(s / W).padStart(4)} ${dB(sl / W).padStart(4)}`);
  }
  console.log("time   rms  low   (dBFS)");
  const rows = Math.ceil(out.length / 4);
  for (let r = 0; r < rows; r++) console.log([0, 1, 2, 3].map((c) => out[r + c * rows] ?? "").join("   |"));
} else {
  const W = sr / 10;
  for (const r of ranges) {
    const [a, b] = r.split("-").map(Number);
    const row = [];
    for (let t = a; t < b - 1e-9; t += 0.1) {
      const i = Math.round(t * sr);
      let s = 0;
      for (let j = i; j < i + W && j < x.length; j++) s += x[j] * x[j];
      row.push(dB(s / W));
    }
    console.log(`${a}-${b}: ${row.join(" ")}`);
  }
}
