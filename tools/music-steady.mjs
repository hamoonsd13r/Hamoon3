// One continuous groove at ONE steady level under a talking video (the accepted taste for edits of the speaker's own
// footage: no tape-stops, no muffling, no silences, no ducking — the bed never swells or drops).
// 1) Optionally re-orders whole phrases of the song so it lasts --dur: --seg "filmT:songT,filmT:songT,…" — each segment
//    plays from songT at film time filmT until the next one starts. Put seams on phrase starts (8 bars) and on a kick:
//    the seam sits --pre s (10 ms) before the cut with a --xf (15 ms) crossfade.
// 2) A slow leveller holds the short-term loudness (3 s window) on the mean level (±--max dB correction, smoothed ±2 s).
// 3) Fade in --in s, fade out over the last --out s. Then set ONE fixed gain in your mix (e.g. -22 dB) and EQ if needed.
// Usage: node tools/music-steady.mjs <song> <out.wav> --dur 53.85 [--seg "0:16,32:32,48:32"] [--pre 0.01] [--xf 0.015]
//          [--in 0.3] [--out 0.45] [--max 6]
// Check after: the printed short-term range should be ≲ 2 dB.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const [song, outFile] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const DUR = Number(opt("dur", NaN));
if (!song || !outFile || !Number.isFinite(DUR)) { console.log("usage: node tools/music-steady.mjs <song> <out.wav> --dur <s> [--seg \"0:16,32:32\"] [--max 6]"); process.exit(1); }
const SEG = String(opt("seg", "0:0")).split(",").map((p) => { const [a, s] = p.split(":").map(Number); return { a, s }; }).sort((x, y) => x.a - y.a);
const PRE = Number(opt("pre", 0.01)), XF = Number(opt("xf", 0.015)), FIN = Number(opt("in", 0.3)), FOUT = Number(opt("out", 0.45)), MAX = Number(opt("max", 6));
const SR = 48000;

const raw = execFileSync("ffmpeg", ["-v", "error", "-i", song, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const src = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
const N = Math.round(DUR * SR);
const out = new Float32Array(N * 2);
for (let k = 0; k < SEG.length; k++) {
  const g = SEG[k];
  const a = k === 0 ? 0 : g.a - PRE;
  const b = k + 1 < SEG.length ? SEG[k + 1].a - PRE + XF : DUR;
  for (let n = Math.floor(a * SR); n < Math.min(N, Math.ceil(b * SR)); n++) {
    const t = n / SR;
    let w = 1;
    if (k > 0 && t < a + XF) w = (t - a) / XF;
    if (k + 1 < SEG.length && t > b - XF) w = Math.min(w, (b - t) / XF);
    const i = Math.round((g.s + (t - g.a)) * SR);
    if (i < 0 || i >= src.length / 2) continue;
    out[n * 2] += w * src[i * 2];
    out[n * 2 + 1] += w * src[i * 2 + 1];
  }
}
const write = (buf, f) => {
  const tmp = f + ".f32";
  fs.writeFileSync(tmp, Buffer.from(buf.buffer));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", tmp, "-c:a", "pcm_s24le", f]);
  fs.unlinkSync(tmp);
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
const pre = outFile + ".pre.wav";
write(out, pre);
const S = shortTerm(pre).filter(([t]) => t >= 3); // the first 3 s window is incomplete
const TARGET = S.reduce((s, [, v]) => s + v, 0) / Math.max(1, S.length);
const gAt = (t) => {
  let s = 0, n = 0;
  for (const [tt, v] of S) if (Math.abs(tt - 1.5 - t) <= 2) { s += TARGET - v; n++; }
  if (!n) { const near = S.reduce((b, p) => (Math.abs(p[0] - 1.5 - t) < Math.abs(b[0] - 1.5 - t) ? p : b), S[0] ?? [0, TARGET]); return TARGET - near[1]; }
  return Math.max(-MAX, Math.min(MAX, s / n));
};
const curve = [];
for (let t = 0; t <= DUR + 0.1; t += 0.05) curve.push(gAt(t));
for (let n = 0; n < N; n++) {
  const t = n / SR, p = t / 0.05, i = Math.floor(p);
  const db = curve[i] + (curve[Math.min(curve.length - 1, i + 1)] - curve[i]) * (p - i);
  let w = Math.pow(10, db / 20);
  if (t < FIN) w *= t / FIN;
  if (t > DUR - FOUT) w *= Math.max(0, (DUR - t) / FOUT);
  out[n * 2] *= w;
  out[n * 2 + 1] *= w;
}
write(out, outFile);
fs.unlinkSync(pre);
const after = shortTerm(outFile).filter(([t]) => t >= 3 && t <= DUR - 0.5).map(([, v]) => v);
const mn = Math.min(...after), mx = Math.max(...after);
console.log(`${outFile} · short-term range after levelling: ${mn.toFixed(1)} … ${mx.toFixed(1)} LUFS (${(mx - mn).toFixed(1)} dB; aim ≲ 2)`);
