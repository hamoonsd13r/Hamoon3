// Painted Story · is every line heard? Voice vs bed (music + effects) per narration line, from the mix stems
// (tools/doc-mix.mjs --stems writes mix-o1 = voice, o2 = music, o3 = effects). Rule of the style: every line ≥ 10 dB
// over the bed. The climax is where it fails (the score swells, effects pile up): lower the music there (musicKeys),
// add a dip around 2.2 kHz (musicEq), move effects into the pauses, or give the quiet line a few dB (gain in lines.json).
//
//   node margin.mjs <mix-o1.wav> <mix-o2.wav> <mix-o3.wav> <vo.json> [--min 10]
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const [V, M, X, VOJ] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--min");
if (!V || !M || !X || !VOJ) throw new Error("usage: node margin.mjs <voice.wav> <music.wav> <fx.wav> <vo.json> [--min 10]");
const mi = args.indexOf("--min");
const MIN = mi >= 0 ? +args[mi + 1] : 10;
const VO = JSON.parse(fs.readFileSync(VOJ, "utf8"));
const SR = 8000;
const rd = (f) => {
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 29 });
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
};
const v = rd(V), m = rd(M), x = rd(X);
const rms = (a, s, e, b) => {
  let t = 0, n = 0;
  for (let i = Math.floor(s * SR); i < Math.min(a.length, e * SR); i++) { const y = a[i] + (b ? b[i] ?? 0 : 0); t += y * y; n++; }
  return 10 * Math.log10(t / Math.max(1, n) + 1e-12);
};
const rows = VO.segs.map((s) => ({ n: s.n, sp: s.sp, d: rms(v, s.start, s.end) - rms(m, s.start, s.end, x) }));
console.log(rows.map((r) => `${r.n}:${r.d.toFixed(1)}`).join(" "));
const low = rows.filter((r) => r.d < MIN);
console.log(`lines under ${MIN} dB:`, low.map((r) => `${r.n}(${r.sp}) ${r.d.toFixed(1)}`).join(" · ") || "none");
