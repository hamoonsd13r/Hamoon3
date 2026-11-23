// Toon3D pipeline: shared paths, argument parsing, process helpers (Remotion CLI, ffmpeg), bundling, stills, sheets.
// Run every tool from the PROJECT ROOT (the folder with package.json):  node src/styles/toon3d/pipeline/<tool>.mjs ...
// A film's working folder is videos/<id>/ (dlg, music, audio, plan, look, qa, render, final). Renders read one bundle
// of the project (out/toon3d-bundle, rebuilt when anything under src/ changed) and keep Remotion's temp files in
// out/_tmp (every bundle copies public/ there; delete out/_tmp after a film). Override with env:
//   TOON3D_ENTRY   the Remotion entry (default src/index.ts)     TOON3D_TMP     the temp folder (default out/_tmp)
//   TOON3D_WORK    the films' folder (default videos)           TOON3D_BUNDLE  the bundle folder (default out/toon3d-bundle)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "package.json"))) {
  console.error("run the Toon3D tools from the project root (the folder with package.json)");
  process.exit(1);
}
export const ENTRY = process.env.TOON3D_ENTRY ?? "src/index.ts";
export const TMP = path.resolve(process.env.TOON3D_TMP ?? path.join(ROOT, "out", "_tmp")).split(path.sep).join("/");
export const BUNDLE = path.resolve(process.env.TOON3D_BUNDLE ?? path.join(ROOT, "out", "toon3d-bundle")).split(path.sep).join("/");
export const CLI = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
/** drawtext font for sheet labels: an OFL font of the project, as a relative path (no drive colon to escape) */
export const FONT = "public/fonts/Inter.ttf";
/** a film's working folder */
export const WORK = path.resolve(process.env.TOON3D_WORK ?? path.join(ROOT, "videos"));
export const film = (id) => path.join(WORK, id).split(path.sep).join("/");
fs.mkdirSync(TMP, { recursive: true });

/** argv -> { _: positionals, flag: value | true } ("--k v", "--k=v", "--flag") */
export function parseArgs(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const eq = a.indexOf("=");
    if (eq > 0) { o[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const k = a.slice(2), nx = argv[i + 1];
    if (nx !== undefined && !nx.startsWith("--")) { o[k] = nx; i++; } else o[k] = true;
  }
  return o;
}
export const die = (msg) => { console.error(msg); process.exit(1); };

const env = () => ({ ...process.env, TEMP: TMP, TMP: TMP, TMPDIR: TMP });
/** run a program; throws on failure unless o.ok. o.capture -> returns { stdout, stderr } */
export function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { cwd: o.cwd ?? ROOT, env: env(), encoding: "utf8", maxBuffer: 1 << 30, stdio: o.capture ? "pipe" : "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0 && !o.ok) throw new Error(`${path.basename(cmd)} failed (${r.status})${o.capture ? "\n" + (r.stderr || "").slice(-3000) : ""}`);
  return r;
}
export const remotion = (args, o = {}) => run(process.execPath, [CLI, ...args], o);
export const ff = (args, o = {}) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], o);
export const frames = (file) => parseInt(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", file], { capture: true }).stdout.replace(/[^0-9]/g, ""));
export const duration = (file) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { capture: true }).stdout.trim().replace(/,$/, ""));
export const mb = (file) => (fs.statSync(file).size / 1048576).toFixed(1) + " MB";

const newest = (dir) => {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
};
/** the project bundle, rebuilt when any source under src/ is newer (or when force) */
export function bundle({ force = false } = {}) {
  const idx = BUNDLE + "/index.html";
  const stale = !fs.existsSync(idx) || newest(path.join(ROOT, "src")) > fs.statSync(idx).mtimeMs;
  if (force || stale) {
    console.log(`bundling ${ENTRY} ...`);
    remotion(["bundle", ENTRY, `--out-dir=${BUNDLE}`], { capture: true });
  }
  return BUNDLE;
}
/** composition ids, fps and frame counts in a bundle */
export function compositions(bundleDir) {
  const r = remotion(["compositions", bundleDir], { capture: true });
  const out = {};
  for (const line of (r.stdout + "\n" + r.stderr).split("\n")) {
    const m = line.replace(/\x1b\[[0-9;]*m/g, "").match(/^\s*(\S+)\s+(\d+)\s+(\d+)x(\d+)\s+(\d+)/);
    if (m) out[m[1]] = { fps: +m[2], w: +m[3], h: +m[4], frames: +m[5] };
  }
  return out;
}
/** the stills composition of a film: <Comp>-Look */
export const lookOf = (comp) => `${comp}-Look`;
/** render stills of a Look composition (frame i = times[i]) into dir; returns the image files in order */
export function lookStills(bundleDir, lookComp, dir, props, { scale = 0.4, concurrency = 2, png = false, log = false } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^element-\d+\.(png|jpe?g)$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const pf = path.join(dir, "props.json");
  fs.writeFileSync(pf, JSON.stringify(props));
  const r = remotion(["render", bundleDir, lookComp, dir, "--sequence", `--image-format=${png ? "png" : "jpeg"}`, "--jpeg-quality=88", `--props=${pf}`,
    `--scale=${scale}`, "--gl=angle", `--concurrency=${concurrency}`, "--timeout=240000", ...(log ? ["--log=verbose"] : [])], { capture: true });
  const files = fs.readdirSync(dir).filter((f) => /^element-\d+\./.test(f)).sort((a, b) => parseInt(a.slice(8)) - parseInt(b.slice(8)));
  return { files: files.map((f) => path.join(dir, f).split(path.sep).join("/")), out: r.stdout + "\n" + r.stderr };
}
/** label each image (top-left) and tile them `cols` wide into one sheet */
export function sheet(images, labels, out, { cols = 6, w = 300 } = {}) {
  const tmp = path.join(path.dirname(out), "_tiles");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const n = images.length, rows = Math.ceil(n / cols);
  images.forEach((img, i) => {
    const txt = String(labels[i] ?? "").replace(/['\\:]/g, "");
    ff(["-i", img, "-vf", `scale=${w}:-2,drawtext=fontfile='${FONT}':expansion=none:text='${txt}':x=6:y=6:fontsize=${Math.round(w / 15)}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4`,
      path.join(tmp, String(i).padStart(3, "0") + ".jpg")]);
  });
  for (let i = n; i < rows * cols; i++) ff(["-i", path.join(tmp, "000.jpg"), "-vf", "drawbox=t=fill:color=white", path.join(tmp, String(i).padStart(3, "0") + ".jpg")]);
  ff(["-framerate", "1", "-i", path.join(tmp, "%03d.jpg"), "-vf", `tile=${cols}x${rows}:padding=4:color=white`, "-frames:v", "1", "-q:v", "3", out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}
/** times from the command line: numbers or ranges a:b:step (e.g. 10:14:0.5) */
export const parseTimes = (ts) => ts.flatMap((s) => {
  const p = String(s).split(":").map(Number);
  if (p.length === 1) return [p[0]];
  const out = []; for (let t = p[0]; t <= p[1] + 1e-9; t += p[2] ?? 1) out.push(Math.round(t * 1000) / 1000);
  return out;
});
