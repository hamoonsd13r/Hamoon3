// Talk Cutout · step 8: the music at ONE STEADY LEVEL (the accepted taste for to-camera edits: «ثابت باشه، صداش کم و
// زیاد نباشه، یک عدد ثابت»): ONE continuous piece of the song (no cuts inside, no tape-stops, no muffling, no silences,
// no ducking), levelled so its short-term loudness (3 s window) holds one target, then a 0.12 s fade-in and a fade-out
// over the last 0.9 s. Pick `start` so a bar downbeat lands on her cut into the first motion section
// (tools/beat-map.mjs), and the end card lands on a later downbeat. The mix then plays it at one fixed gain.
// usage: node music-steady.mjs <song> <start s in the file> <duration s> <out.wav>
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [src, startArg, durArg, out] = process.argv.slice(2);
if (!out) throw new Error("usage: node music-steady.mjs <song> <start> <dur> <out.wav>");
const SR = 48000, M0 = Number(startArg), DUR = Number(durArg);
const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(M0), "-t", String(DUR + 0.2), "-i", src, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const srcPcm = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
const N = Math.round(DUR * SR);
const pcm = new Float32Array(N * 2);
pcm.set(srcPcm.subarray(0, Math.min(srcPcm.length, N * 2)));
const write = (buf, f) => {
  fs.writeFileSync(f + ".f32", Buffer.from(buf.buffer));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", f + ".f32", "-c:a", "pcm_s24le", f]);
  fs.unlinkSync(f + ".f32");
};
const shortTerm = (f) => {
  const txt = execFileSync("ffmpeg", ["-nostats", "-i", f, "-af", "ebur128=metadata=1,ametadata=print:key=lavfi.r128.S:file=-", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  const pts = [];
  let t = 0;
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) t = Number(m[1]);
    const s = line.match(/lavfi\.r128\.S=(-?[\d.]+)/);
    if (s && Number(s[1]) > -70) pts.push([t, Number(s[1])]);
  }
  return pts;
};
const pre = out.replace(/\.wav$/i, "") + "-pre.wav";
write(pcm, pre);
const S = shortTerm(pre).filter(([t]) => t >= 3);
const TARGET = S.reduce((s, [, v]) => s + v, 0) / S.length;
const gAt = (t) => {
  let s = 0, n = 0;
  for (const [tt, v] of S) if (Math.abs(tt - 1.5 - t) <= 2) { s += TARGET - v; n++; }
  if (!n) { const p = S.reduce((b, q) => (Math.abs(q[0] - 1.5 - t) < Math.abs(b[0] - 1.5 - t) ? q : b)); return TARGET - p[1]; }
  return Math.max(-6, Math.min(6, s / n));
};
const curve = [];
for (let t = 0; t <= DUR + 0.1; t += 0.05) curve.push(gAt(t));
for (let n = 0; n < N; n++) {
  const t = n / SR, p = t / 0.05, i = Math.floor(p);
  let w = Math.pow(10, (curve[i] + (curve[Math.min(curve.length - 1, i + 1)] - curve[i]) * (p - i)) / 20);
  if (t < 0.12) w *= t / 0.12;
  if (t > DUR - 0.9) w *= Math.max(0, (DUR - t) / 0.9);
  pcm[n * 2] *= w;
  pcm[n * 2 + 1] *= w;
}
write(pcm, out);
fs.unlinkSync(pre);
const after = shortTerm(out).filter(([t]) => t >= 3 && t <= DUR - 1).map(([, v]) => v);
console.log(`${out}: target ${TARGET.toFixed(1)} LUFS · short-term range after levelling ${Math.min(...after).toFixed(1)} … ${Math.max(...after).toFixed(1)} (${(Math.max(...after) - Math.min(...after)).toFixed(1)} dB; aim ≤ 2 dB)`);
