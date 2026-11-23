// Painted Story · cut-outs: trim every transparent PNG to its visible box (+ a small pad), scale it to a sane height,
// save it as WebP with alpha (5–20× smaller than the PNG), and write cutouts.json { id: { w, h } } — `Cut` needs the
// aspect (ar = w / h) to place a cut-out by its anchor point. ffmpeg only.
//
//   node cutouts.mjs <srcDir> <dstDir> <out cutouts.json> [--h 1600] [--pad 6] [--white]
//     --white   the image came back on a plain white background instead of transparent: key the white out first
//               (fine for most subjects; white clothes or a white blanket need a real transparent image instead)
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const [SRC, DST, OUT] = args.filter((a, i) => !a.startsWith("--") && !(["--h", "--pad"].includes(args[i - 1])));
if (!SRC || !DST || !OUT) throw new Error("usage: node cutouts.mjs <srcDir> <dstDir> <out cutouts.json> [--h 1600] [--pad 6] [--white]");
const H = opt("--h", 1600), PAD = opt("--pad", 6), WHITE = args.includes("--white");
fs.mkdirSync(DST, { recursive: true });

const info = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
for (const f of fs.readdirSync(SRC).filter((x) => /\.png$/i.test(x)).sort()) {
  const id = f.replace(/\.png$/i, "");
  const src = path.join(SRC, f);
  const key = WHITE ? "colorkey=0xFFFFFF:0.10:0.06," : "";
  // the visible box: alpha as a grey picture, then cropdetect finds the non-black area
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", src, "-vf", `format=rgba,${key}alphaextract,cropdetect=limit=12:round=2:reset=0:skip=0`, "-frames:v", "1", "-f", "null", "-"]).stderr.toString();
  const m = [...r.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
  if (!m) { console.log("skip (no transparency found):", f); continue; }
  const [cw, ch, cx, cy] = m.slice(1).map(Number);
  const [W0, H0] = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", src]).toString().trim().split(",").map(Number);
  const x = Math.max(0, cx - PAD), y = Math.max(0, cy - PAD), w = Math.min(W0 - x, cw + 2 * PAD), h = Math.min(H0 - y, ch + 2 * PAD);
  const outH = Math.min(H, h);
  const outW = Math.round((w * outH) / h / 2) * 2;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `format=rgba,${key}crop=${w}:${h}:${x}:${y},scale=${outW}:${outH}:flags=lanczos`, "-c:v", "libwebp", "-pix_fmt", "yuva420p", "-quality", "85", path.join(DST, `${id}.webp`)]);
  info[id] = { w: outW, h: outH };
  console.log(`${id}: ${w}×${h} → ${outW}×${outH}  (ar ${(outW / outH).toFixed(3)})`);
}
fs.writeFileSync(OUT, JSON.stringify(info, null, 1));
console.log(`→ ${OUT}`);
