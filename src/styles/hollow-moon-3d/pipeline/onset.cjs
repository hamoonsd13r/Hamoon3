// Hollow Moon 3D · where exactly does a hit fall? The 5 ms RMS of a file (a stem or the mix) around a time, and the
// first window that jumps by 6 dB. Check the strike against the frame of the lightning (BOLT, error under 10 ms).
//   node src/styles/hollow-moon-3d/pipeline/onset.cjs <file.wav> <around s> [span s = 0.12]
const { execFileSync } = require("child_process");
const SR = 48000, [file, at, sp] = process.argv.slice(2), T = Number(at), S = Number(sp || 0.12);
const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const x = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
const w = Math.round(0.005 * SR);
let prev = null, out = [], best = null;
for (let t = T - S; t < T + S; t += 0.005) {
  const i0 = Math.round(t * SR);
  let q = 0;
  for (let i = i0; i < i0 + w; i++) q += x[i] * x[i];
  const d = 10 * Math.log10(q / w + 1e-12);
  if (prev !== null && d - prev > 6 && !best) best = t;
  out.push(`${t.toFixed(3)} ${d.toFixed(1)}`);
  prev = d;
}
console.log(file.split("/").pop(), "around", T, "· first jump of 6 dB at", best === null ? "–" : best.toFixed(3));
console.log(out.join(" | "));
