// Hand-drawn films without npm: preview sheets, spot frames and a silent MP4 straight from a film's own hooks
// (window.__grid / __strip / __frame), driving the installed Chrome over the DevTools protocol (Node ≥ 22: global
// WebSocket + fetch). Same job as the upstream skill/scripts/render.mjs, which needs `npm i puppeteer-core`.
//   node hd-preview.mjs <film.html> --grid 24 [--ar 9:16] [--w 1080] [--out dir]     contact sheet, n frames evenly spaced
//   node hd-preview.mjs <film.html> --strip 48,12                                    12 consecutive frames from 48 (motion QA)
//   node hd-preview.mjs <film.html> --only 0,60,120                                  full-size PNGs
//   node hd-preview.mjs <film.html> --mp4 [--w 1080]                                 every frame → <out>/<name>.mp4 (24 fps, silent)
//   extra:  --look pencil (films that read ?look=)  --chrome <path>  --timeout 60
// Chrome: --chrome, or $CHROME, or the usual install paths (Windows, macOS, Linux).
// The Remotion route (Style-HandDrawn-*) is the normal way to deliver; this is for fast checks while drawing.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(`--${k}`);
const file = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--mp4"].includes(args[i - 1])));
if (!file || !fs.existsSync(file)) { console.log("usage: node hd-preview.mjs <film.html> [--grid 24 | --strip 48,12 | --only 0,24 | --mp4] [--ar 9:16] [--w 1080] [--out dir]"); process.exit(1); }
const name = path.basename(file, ".html");
const out = path.resolve(opt("out", path.join(path.dirname(file), "out")));
fs.mkdirSync(out, { recursive: true });

const findChrome = () => {
  const c = [opt("chrome"), process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    path.join(os.homedir(), "AppData/Local/Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/nfp/chrome-linux64/chrome"].filter(Boolean);
  const hit = c.find((p) => fs.existsSync(p));
  if (!hit) throw new Error("No Chrome found: pass --chrome <path> or set CHROME");
  return hit;
};

const url = pathToFileURL(path.resolve(file));
url.searchParams.set("bare", "1");
if (opt("ar")) url.searchParams.set("ar", opt("ar"));
if (opt("w")) url.searchParams.set("w", opt("w"));
if (opt("look")) url.searchParams.set("look", opt("look"));

const prof = fs.mkdtempSync(path.join(os.tmpdir(), "hd-prev-"));
const port = 9300 + Math.floor(Math.random() * 600);
const chrome = spawn(findChrome(), ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "about:blank"],
  { stdio: "ignore" });
const cleanup = () => { try { chrome.kill(); } catch {} setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} }, 600); };
process.on("exit", cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const save = (f, dataUrl) => fs.writeFileSync(f, Buffer.from(dataUrl.split(",")[1], "base64"));

try {
  let target;
  for (let k = 0; k < 100 && !target; k++) {
    await sleep(100);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("Chrome did not start");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: url.href });
  const timeout = Number(opt("timeout", 60)) * 1000, t0 = Date.now();
  for (;;) {
    await sleep(80);
    const st = await evaluate("({ready: window.__ready === true, error: window.__error || null})").catch(() => ({ ready: false }));
    if (st.error || errors.length) throw new Error(`${name}: ${st.error || errors.join("\n")}`);
    if (st.ready) break;
    if (Date.now() - t0 > timeout) throw new Error(`${name}: not ready after ${timeout / 1000} s (a script error, a missing script path, or a core name redefined in the film)`);
  }
  const meta = await evaluate("({N: window.__NDRAW, fps: window.__fps, size: window.__size})");
  console.log(`${name}: ${meta.N} frames at ${meta.fps} fps (${(meta.N / meta.fps).toFixed(2)} s), ${meta.size.w}x${meta.size.h}`);
  if (opt("grid")) {
    const f = path.join(out, `${name}-grid.jpg`);
    save(f, await evaluate(`window.__grid(${Number(opt("grid"))}, ${Number(opt("cell", 240))})`));
    console.log(f);
  } else if (opt("strip")) {
    const [a, n] = opt("strip").split(",").map(Number);
    const f = path.join(out, `${name}-strip-${a}.jpg`);
    save(f, await evaluate(`window.__strip(${a}, ${n || 12}, ${Number(opt("cell", 240))})`));
    console.log(f);
  } else if (opt("only")) {
    for (const i of opt("only").split(",").map(Number)) {
      const f = path.join(out, `${name}-${String(i).padStart(4, "0")}.png`);
      save(f, await evaluate(`window.__frame(${i})`));
      console.log(f);
    }
  } else if (has("mp4")) {
    const mp4 = path.join(out, `${name}.mp4`);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(meta.fps), "-i", "-", "-vf", "fps=24,format=yuv420p",
      "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = 0; i < meta.N; i++) {
      const png = Buffer.from((await evaluate(`window.__frame(${i})`)).split(",")[1], "base64");
      if (errors.length) throw new Error(`frame ${i}: ${errors.join("\n")}`);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      if ((i + 1) % 48 === 0) console.log(`${i + 1}/${meta.N}`);
    }
    ff.stdin.end();
    await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg exit ${c}`)))));
    console.log(mp4, execFileSync("ffprobe", ["-v", "error", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", mp4], { encoding: "utf8" }).trim(), "frames");
  } else {
    const f = path.join(out, `${name}-grid.jpg`);
    save(f, await evaluate("window.__grid(24, 240)"));
    console.log(f);
  }
} catch (e) {
  console.error(String(e.message || e));
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  cleanup();
}
