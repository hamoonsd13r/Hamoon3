// Snow Castle 3D · review stills from ONE browser page (the world is built once, ~20 s), at film seconds and/or free
// cameras, optionally tiled into a labelled sheet. Run from the project root.
//   node src/styles/snow-castle-3d/pipeline/look.mjs <outDir> --times 1.2,9,22,34 [--sheet]
//   node src/styles/snow-castle-3d/pipeline/look.mjs <outDir> --cams "62,16,176,-34,86,44,40;-" --times 0,5
//   options: --cams "px,py,pz,tx,ty,tz,fov[,focus,aper];…" ("-" = the film's own camera at that time)
//            --dbg "nofog,noao,expo=1.2,skyexp=1.1" (engine switches and numbers, see the card) · --scale 0.5 · --ss 2
//            --comp <id> (default Style-SnowCastle3D-Look; your film: V01-Look) · --entry src/index.ts · --public public
//            --reuse (skip bundling when only times/cams/dbg changed) · --sheet · --png
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";

const a = process.argv.slice(2);
const flags = ["--times", "--cams", "--dbg", "--scale", "--ss", "--comp", "--entry", "--public"];
const val = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const out = a.find((x, i) => !x.startsWith("--") && !flags.includes(a[i - 1]));
if (!out) { console.error("usage: node src/styles/snow-castle-3d/pipeline/look.mjs <outDir> [--times …] [--cams …] [--sheet]"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const times = (val("--times") ?? "").split(",").filter(Boolean).map(Number);
const cams = (val("--cams") ?? "").split(";").filter(Boolean).map((s) => (s.trim() === "-" ? null : s.split(",").map(Number)));
const n = Math.max(times.length, cams.length, 1);
const inputProps = { times: times.length ? times : [0], ...(cams.length ? { cams } : {}), dbg: val("--dbg") ?? "", ...(val("--ss") ? { ss: Number(val("--ss")) } : {}) };
const BUNDLE = path.join(os.tmpdir(), "nfp-look-snow-castle-3d");
let serveUrl = BUNDLE;
if (!a.includes("--reuse") || !fs.existsSync(path.join(BUNDLE, "index.html"))) {
  const t0 = Date.now();
  serveUrl = await bundle({ entryPoint: path.resolve(val("--entry") ?? "src/index.ts"), publicDir: path.resolve(val("--public") ?? "public"), outDir: BUNDLE });
  console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
// a normal Chrome if one is installed (the headless-shell download is blocked in some countries); else Remotion's own
const browserExecutable = [
  process.env.REMOTION_CHROME,
  process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Google/Chrome/Application/chrome.exe"),
  process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Google/Chrome/Application/chrome.exe"),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p)) ?? null;
const chromiumOptions = { gl: "angle" };
const seen = new Set();
const onBrowserLog = (l) => { if (/\[snow-castle\]|rror|WebGL|THREE/.test(l.text) && !seen.has(l.text)) { seen.add(l.text); console.log("  ·", l.text.slice(0, 1800)); } };
const composition = await selectComposition({ serveUrl, id: val("--comp") ?? "Style-SnowCastle3D-Look", inputProps, browserExecutable, chromiumOptions, onBrowserLog, timeoutInMilliseconds: 300000, logLevel: "error" });
const png = a.includes("--png");
const tmp = path.join(out, "_frames");
fs.rmSync(tmp, { recursive: true, force: true });
const t1 = Date.now();
await renderFrames({
  serveUrl, composition, inputProps, outputDir: tmp, imageFormat: png ? "png" : "jpeg", jpegQuality: 92, concurrency: 1, scale: Number(val("--scale") ?? 1),
  browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog, onStart: () => {}, onFrameUpdate: (f) => process.stdout.write(`\r  frame ${f}/${n}`), logLevel: "error",
});
console.log(`\nrendered ${n} in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
const ext = png ? "png" : "jpg";
const files = [];
fs.readdirSync(tmp).filter((f) => /\.(jpe?g|png)$/.test(f)).sort().forEach((f, i) => {
  const label = cams[i] ? `c${String(i).padStart(2, "0")}` : `t${(times[Math.min(i, times.length - 1)] ?? 0).toFixed(2)}`;
  const dst = path.join(out, `${label}.${ext}`);
  fs.copyFileSync(path.join(tmp, f), dst);
  files.push([dst, label]);
  console.log("→", dst);
});
fs.rmSync(tmp, { recursive: true, force: true });
if (a.includes("--sheet") && files.length > 1) {
  // labels in the kit's own font (relative path: no drive letter to escape for drawtext)
  const font = fs.existsSync("public/fonts/ChakraPetch-Medium.ttf") ? "public/fonts/ChakraPetch-Medium.ttf" : null;
  const tl = [];
  for (const [f, label] of files) {
    const g = f.replace(/\.(jpg|png)$/, "_l.jpg");
    const text = font ? `,drawtext=fontfile=${font}:text='${label}':x=8:y=8:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4` : "";
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-vf", `scale=960:-2${text},format=yuvj420p`, g]);
    tl.push(g);
  }
  const list = path.join(out, "_list.txt");
  fs.writeFileSync(list, tl.map((g) => `file '${path.resolve(g).replace(/\\/g, "/")}'`).join("\n"));
  const cols = Math.min(2, tl.length), rows = Math.ceil(tl.length / cols);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `tile=${cols}x${rows}:padding=4:color=0x222222`, "-frames:v", "1", "-q:v", "3", path.join(out, "sheet.jpg")]);
  for (const g of tl) fs.rmSync(g);
  fs.rmSync(list);
  console.log("sheet →", path.join(out, "sheet.jpg"));
}
