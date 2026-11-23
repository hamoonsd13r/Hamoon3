// Replace frame ranges of a long render with re-rendered segments, frame-exact, in one re-encode; checks the count.
// Usage: node src/styles/toon3d/pipeline/splice.mjs <base.mp4> <out.mp4> <seg.mp4>@<firstFrame> [<seg2.mp4>@<first2> ...] [--crf 17]
// A segment from `render.mjs ... --frames=1484-1503` goes in as seg.mp4@1484 (its length is read from the file).
import { parseArgs, die, ff, frames, mb } from "./lib.mjs";

const a = parseArgs();
const [base, out, ...specs] = a._;
if (!base || !out || !specs.length) die("usage: node src/styles/toon3d/pipeline/splice.mjs <base.mp4> <out.mp4> <seg.mp4>@<firstFrame> [...] [--crf 17]");
const N = frames(base);
const segs = specs.map((s) => { const i = s.lastIndexOf("@"); const file = s.slice(0, i), at = Number(s.slice(i + 1)); return { file, at, n: frames(file) }; })
  .sort((p, q) => p.at - q.at);
let cur = 0, parts = [], g = [];
segs.forEach((s, i) => {
  if (s.at < cur) die(`segments overlap at frame ${s.at}`);
  if (s.at > cur) parts.push({ base: true, a: cur, b: s.at });
  parts.push({ seg: i + 1 });
  cur = s.at + s.n;
});
if (cur < N) parts.push({ base: true, a: cur, b: N });
const nb = parts.filter((p) => p.base).length;
g.push(`[0:v]split=${nb}${parts.filter((p) => p.base).map((_, i) => `[b${i}]`).join("")}`);
let bi = 0;
const labels = parts.map((p, i) => {
  if (p.base) { g.push(`[b${bi++}]trim=start_frame=${p.a}:end_frame=${p.b},setpts=PTS-STARTPTS[p${i}]`); return `[p${i}]`; }
  g.push(`[${p.seg}:v]setpts=PTS-STARTPTS[p${i}]`); return `[p${i}]`;
});
g.push(`${labels.join("")}concat=n=${parts.length}:v=1:a=0,fps=30[v]`);
ff(["-i", base, ...segs.flatMap((s) => ["-i", s.file]), "-filter_complex", g.join(";"), "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", String(a.crf ?? 17), "-pix_fmt", "yuv420p", out]);
const n2 = frames(out);
console.log(`${out}: ${n2} frames (base ${N})${n2 === N ? "" : "  <-- COUNT CHANGED"}, ${mb(out)}`);
for (const s of segs) console.log(`  frames ${s.at}-${s.at + s.n - 1} from ${s.file}`);
