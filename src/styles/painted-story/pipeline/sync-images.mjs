// Painted Story · bring the generated images into the film. Copies every image named by its shot id (s001.jpg,
// s018b.png, i04.webp, P14.png …) from your image folder into public/, converts / downsizes it, and writes the list of
// ids that exist (imgs.json) — the film shows the nearest earlier still for any shot whose image is not there yet, and
// an `opt` shot (an extra close-up / second pose) only exists once its image does. Safe to re-run any time.
//
//   node sync-images.mjs <imgDir> <public/vNN/img> <src/vNN/imgs.json> [--max 2560] [--match] [--order order.txt]
//     --max 2560   longest side in px (stills are shown with ×1.1–1.35 zoom: 2560 keeps them sharp in 1080p)
//     --match      images from another model (e.g. ChatGPT 1672×941 among Gemini 2752×1536): upscale (lanczos +
//                  light unsharp) and make them a touch cooler / less saturated so they sit with the rest
//     --order f    the files are not named by id but numbered in download order: f lists the ids in that order
//                  (⚠ an upload order is not the PDF order — open every image and fix the list by what it shows)
//   Cut-outs (ids starting with Y or C, or any PNG with transparency) stay PNG — run cutouts.mjs on them.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const [SRC, DST, OUT] = args.filter((a, i) => !a.startsWith("--") && !(["--max", "--order"].includes(args[i - 1])));
if (!SRC || !DST || !OUT) throw new Error("usage: node sync-images.mjs <imgDir> <public/vNN/img> <src/vNN/imgs.json> [--max 2560] [--match] [--order order.txt]");
const MAX = +(opt("--max") ?? 2560), MATCH = args.includes("--match");
const ORDER = opt("--order") ? fs.readFileSync(opt("--order"), "utf8").split(/\s+/).filter(Boolean) : null;
fs.mkdirSync(DST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const pairs = ORDER ? files.map((f, i) => [f, ORDER[i]]).filter(([, id]) => id) : files.map((f) => [f, /^([A-Za-z]{1,2}\d{2,3}[a-z]?)\.(jpe?g|png|webp)$/i.exec(f)?.[1]]).filter(([, id]) => id);
const probe = (f) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,pix_fmt", "-of", "csv=p=0", f]).toString().trim().split(",");
const have = [];
let copied = 0;
for (const [f, id] of pairs) {
  const src = path.join(SRC, f);
  if (fs.statSync(src).size < 50000) { console.log("skip (too small, probably a failed download):", f); continue; }
  const [w, h, pix] = probe(src);
  const alpha = /a/.test(pix ?? "") && /\.png$/i.test(f);
  const cutout = /^(Y|C)\d/i.test(id) || alpha;
  const dst = path.join(DST, `${id}.${cutout ? "png" : "jpg"}`);
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) { have.push(id); continue; }
  const long = Math.max(+w, +h);
  const vf = [];
  if (long > MAX) vf.push(`scale=${+w >= +h ? MAX : -2}:${+w >= +h ? -2 : MAX}:flags=lanczos`);
  else if (MATCH && long < MAX) vf.push(`scale=${+w >= +h ? MAX : -2}:${+w >= +h ? -2 : MAX}:flags=lanczos`, "unsharp=5:5:0.6");
  if (MATCH && !cutout) vf.push("eq=saturation=0.92", "colorbalance=rs=-0.02:bs=0.03:rm=-0.01:bm=0.02");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, ...(vf.length ? ["-vf", vf.join(",")] : []), ...(cutout ? [] : ["-q:v", "2"]), dst]);
  copied++;
  have.push(id);
}
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(have));
console.log(`${have.length} images ready (${copied} new) → ${DST} · list → ${OUT}`);
