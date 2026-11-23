// Snow Castle 3D · frame-to-frame change over a whole render: the mean absolute difference of each frame to the one
// before it, and the frames that jump against their neighbours (a pop, a flicker, a dropped frame). Dissolves are slow
// and never jump; a jump that is not a cut you made is a bug — look at that frame at full size.
//   node src/styles/snow-castle-3d/pipeline/check-frames.cjs <video.mp4> [fps = 30] [cut seconds, comma-separated]
// Measure at FULL size: on a downscaled copy the near-black frames of a fade read as huge jumps (4.4× once, 0.09 real).
const { spawnSync } = require("child_process");
const [V, fpsArg, cutsArg] = process.argv.slice(2);
if (!V) { console.error("usage: node check-frames.cjs <video.mp4> [fps] [cuts]"); process.exit(1); }
const FPS = Number(fpsArg || 30);
const cutF = (cutsArg || "").split(",").filter(Boolean).map((s) => Math.round(Number(s) * FPS));
const r = spawnSync("ffmpeg", ["-v", "error", "-i", V, "-vf", "format=gbrp,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
const d = [];
for (const m of r.stdout.matchAll(/YAVG=([\d.]+)/g)) d.push(Number(m[1]));
console.log("frames measured:", d.length + 1);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const out = [];
for (let i = 0; i < d.length; i++) {
  const f = i + 1; // d[i] = |frame f − frame f−1|
  const nb = [];
  for (let k = -8; k <= 8; k++) if (k && Math.abs(k) > 1 && d[i + k] !== undefined) nb.push(d[i + k]);
  const m = med(nb), ratio = d[i] / Math.max(m, 0.02);
  const cut = cutF.some((cf) => Math.abs(cf - f) <= 1);
  if (ratio > 2.2 || d[i] < m * 0.2) out.push({ f, t: (f / FPS).toFixed(2), d: d[i].toFixed(2), m: m.toFixed(2), ratio: ratio.toFixed(1), note: cut ? "cut" : "" });
}
for (const o of out) console.log(`frame ${String(o.f).padStart(4)} (${o.t} s)  diff ${o.d}  neighbours ${o.m}  ×${o.ratio}  ${o.note}`);
console.log("unexplained:", out.filter((o) => !o.note).length);
let line = "";
for (let s = 0; s * FPS < d.length; s++) { const a = d.slice(s * FPS, s * FPS + FPS); line += `${s}:${(a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1)).toFixed(1)} `; }
console.log("mean change per second:", line);
