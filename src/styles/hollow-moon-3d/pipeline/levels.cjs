// Hollow Moon 3D · the two stems of the mix, window by window: RMS of the music and of the storm + effects (dBFS), the
// difference, and the peak of the effects. Shows where the storm or an effect comes too close to the music
// (rule: ambience ≥ 14 dB and effects ≥ 10 dB under it, except the thunder's first half second).
//   node src/styles/hollow-moon-3d/pipeline/levels.cjs [stem dir = out/hollow-moon-audio] [window s = 0.5] [from s] [to s]
// (build the stems first: build-audio.cjs … --stems)
const { execFileSync } = require("child_process");
const path = require("path");
const [dirArg, wArg, t0Arg, t1Arg] = process.argv.slice(2);
const A = path.resolve(dirArg || "out/hollow-moon-audio"), SR = 48000;
const W = Number(wArg || 0.5), T0 = Number(t0Arg || 0), T1 = Number(t1Arg || 35);
const dec = (file) => {
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const m = dec(path.join(A, "stem-music.wav")), f = dec(path.join(A, "stem-fx.wav"));
const db = (x) => (x > 1e-9 ? (20 * Math.log10(x)).toFixed(1).padStart(6) : "  -inf");
const n = Math.round(W * SR);
console.log("   t     music     fx    fx-music  fx peak");
for (let t = T0; t < T1 - 1e-6; t += W) {
  const i0 = Math.round(t * SR);
  let sm = 0, sf = 0, pk = 0, c = 0;
  for (let i = i0; i < i0 + n && i * 2 + 1 < m.length && i * 2 + 1 < f.length; i++) {
    sm += m[i * 2] ** 2 + m[i * 2 + 1] ** 2;
    sf += f[i * 2] ** 2 + f[i * 2 + 1] ** 2;
    pk = Math.max(pk, Math.abs(f[i * 2]), Math.abs(f[i * 2 + 1]));
    c += 2;
  }
  if (!c) break;
  const rm = Math.sqrt(sm / c), rf = Math.sqrt(sf / c);
  const d = rm > 1e-9 && rf > 1e-9 ? (20 * Math.log10(rf / rm)).toFixed(1).padStart(7) : "      –";
  console.log(`${t.toFixed(2).padStart(6)}  ${db(rm)}  ${db(rf)}  ${d}   ${db(pk)}`);
}
