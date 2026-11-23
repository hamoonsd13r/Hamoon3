// Speech Cleanup · step 9 — renders the edited voice exactly as the timeline plays it (hard cuts, sample-accurate atrim + concat).
// usage: node src/styles/speech-cleanup/pipeline/render-audio.mjs <segments-A.json> <voice.flac> <check/edited-16k.flac> [fps=60] [extra ffmpeg output args…]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [segPath, input, output, fpsArg = "60", ...outArgs] = process.argv.slice(2);
const FPS = Number(fpsArg);
const segs = JSON.parse(fs.readFileSync(segPath, "utf8"));
const lines = [`[0:a]asplit=${segs.length}${segs.map((_, i) => `[s${i}]`).join("")};`];
segs.forEach((s, i) => lines.push(`[s${i}]atrim=start=${(s.fa / FPS).toFixed(6)}:end=${(s.fb / FPS).toFixed(6)},asetpts=PTS-STARTPTS[p${i}];`));
lines.push(`${segs.map((_, i) => `[p${i}]`).join("")}concat=n=${segs.length}:v=0:a=1[out]`);
const script = path.join(path.dirname(output), path.basename(output) + ".graph.txt");
fs.writeFileSync(script, lines.join("\n"));
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", input, "-/filter_complex", script, "-map", "[out]", ...outArgs, output], { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr.slice(-800));
const dur = segs.reduce((s, x) => s + (x.fb - x.fa), 0) / FPS;
console.log(`${segs.length} pieces, ${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, "0")} → ${output}`);
