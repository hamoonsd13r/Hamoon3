// Check frames before a full render: renders a -Look composition (props { times }) at the times you give, labels every
// frame with its time and tiles them into one contact sheet (12 half-size frames ≈ 1.6k tokens to view — far cheaper
// than separate stills). Judge final quality on a few full-size frames (--scale 1) of the key moments.
// Usage: node tools/look.mjs <CompId> <times> <outDir> [--entry src/index.ts] [--scale 0.5] [--cols 6]
//          [--gl angle] [--public-dir <dir>] [--timeout 240000] [--props extra.json]
//   times: "0,1.5,3.2" or "0:30:2.5" (from:to:step, both ends included)
//   three.js styles: add --gl angle (renders with --concurrency=1)
// Writes <outDir>/frames/*.jpeg, <outDir>/sheet.jpg (and sheet-2.jpg … when there are more than cols×4 frames).
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const [comp, timesArg, outDirArg] = pos;
if (!comp || !timesArg || !outDirArg) { console.log("usage: node tools/look.mjs <CompId> <times|a:b:step> <outDir> [--entry src/index.ts] [--scale 0.5] [--cols 6] [--gl angle]"); process.exit(1); }
const times = timesArg.includes(":") && !timesArg.includes(",")
  ? (() => { const [a, b, s] = timesArg.split(":").map(Number); const r = []; for (let t = a; t <= b + 1e-6; t += s) r.push(+t.toFixed(3)); return r; })()
  : timesArg.split(",").map(Number);
const outDir = path.resolve(outDirArg), frames = path.join(outDir, "frames");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
const extra = opt("props") ? JSON.parse(fs.readFileSync(opt("props"), "utf8")) : {};
const propsFile = path.join(outDir, "props.json");
fs.writeFileSync(propsFile, JSON.stringify({ ...extra, times }));
const cli = path.join(RM, "node_modules/@remotion/cli/remotion-cli.js");
const r = [cli, "render", opt("entry", "src/index.ts"), comp, frames, "--sequence", "--image-format=jpeg", `--scale=${opt("scale", "0.5")}`, `--props=${propsFile}`, "--log=error", `--timeout=${opt("timeout", "240000")}`];
if (opt("gl")) r.push(`--gl=${opt("gl")}`, "--concurrency=1");
if (opt("public-dir")) r.push(`--public-dir=${opt("public-dir")}`);
const res = spawnSync(process.execPath, r, { cwd: RM, stdio: "inherit" });
if (res.status !== 0) process.exit(res.status ?? 1);
const files = fs.readdirSync(frames).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
if (!files.length) { console.log("no frames rendered"); process.exit(1); }
// label each frame with its time, then tile (all tiles yuvj420p, or tile restarts)
const font = path.join(outDir, "label.ttf");
fs.copyFileSync(path.join(RM, "public/fonts/ChakraPetch-Medium.ttf"), font);
const COLS = Number(opt("cols", 6)), ROWS_MAX = 4;
files.forEach((f, i) => {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(frames, f), "-vf", `drawtext=fontfile=label.ttf:text='${(times[i] ?? i).toFixed(2)}s':x=8:y=8:fontsize=h/24:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6,format=yuvj420p`, `lab-${String(i).padStart(3, "0")}.jpg`], { cwd: outDir });
});
const per = COLS * ROWS_MAX, sheets = [];
for (let k = 0; k * per < files.length; k++) {
  const n = Math.min(per, files.length - k * per), rows = Math.ceil(n / COLS), name = k ? `sheet-${k + 1}.jpg` : "sheet.jpg";
  execFileSync("ffmpeg", ["-v", "error", "-y", "-start_number", String(k * per), "-i", "lab-%03d.jpg", "-frames:v", "1", "-vf", `tile=${Math.min(COLS, n)}x${rows}:nb_frames=${n}:padding=4:color=0x202020`, "-q:v", "3", name], { cwd: outDir });
  sheets.push(path.join(outDir, name));
}
for (const f of fs.readdirSync(outDir).filter((x) => /^lab-\d+\.jpg$/.test(x))) fs.rmSync(path.join(outDir, f));
fs.rmSync(font);
console.log(`${files.length} frames → ${sheets.join(", ")}`);
