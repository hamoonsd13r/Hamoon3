// Contact sheets of a rendered video with exact time labels (the source timestamps are kept, so the label under each
// frame is its real time even when starting mid-film). Pages of cols x rows.
// Usage: node src/styles/toon3d/pipeline/sheet.mjs <video.mp4> <out-prefix> [--every 1] [--from 0] [--to <end>] [--cols 8] [--rows 6] [--w 200]
// Out:   <out-prefix>-01.jpg, -02.jpg, ...
import fs from "node:fs";
import path from "node:path";
import { parseArgs, die, ff, duration, FONT } from "./lib.mjs";

const a = parseArgs();
const [video, prefix] = a._;
if (!video || !prefix) die("usage: node src/styles/toon3d/pipeline/sheet.mjs <video.mp4> <out-prefix> [--every 1] [--from 0] [--to end] [--cols 8] [--rows 6] [--w 200]");
const every = Number(a.every ?? 1), from = Number(a.from ?? 0), to = Number(a.to ?? duration(video));
const cols = Number(a.cols ?? 8), rows = Number(a.rows ?? 6), w = Number(a.w ?? 200);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const sel = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${every - 0.001})'`;
ff(["-ss", String(from), "-t", String(to - from), "-copyts", "-i", video, "-vf",
  `${sel},scale=${w}:-2,drawtext=fontfile='${FONT}':text='%{pts\\:hms}':x=4:y=4:fontsize=${Math.round(w / 12)}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=3,tile=${cols}x${rows}:padding=3:color=white`,
  "-fps_mode", "vfr", "-q:v", "3", `${prefix}-%02d.jpg`]);
const pages = fs.readdirSync(path.dirname(prefix)).filter((f) => f.startsWith(path.basename(prefix) + "-") && f.endsWith(".jpg"));
console.log(pages.map((f) => path.join(path.dirname(prefix), f).split(path.sep).join("/")).join("\n"));
