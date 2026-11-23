// The last step of every video: one command makes everything you hand over, with the checks that caught real bugs.
//   <out>/<name>.mp4               H.264 (crf 18), TV-range BT.709 (Remotion renders full-range BT.601), AAC 320k 48 kHz
//   <out>/<name>-phone.mp4         under --phone-mb (29) MB for sending to a phone: HEVC two-pass, 1080p if the bitrate
//                                  allows, else 720p
//   <out>/<name>-nomusic(-phone).mp4  with --nomusic <mix without the song> (a copyrighted song: the user adds it inside
//                                  Instagram instead)
// Checks: the silent render's frame count (a broken render chunk once left the "final" with half its picture), audio
// length vs picture (the audio is padded or cut to the picture — never -shortest), loudness (I, true peak) of the final.
// Usage: node tools/finalize.mjs <silent.mp4> <mix.wav> <outDir> <name> [--nomusic mix-nomusic.wav]
//          [--phone-mb 29] [--crf 18] [--frames N] [--keep-range] (skip the BT.709 conversion)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const [silent, mix, outDir, name] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--keep-range"].includes(args[i - 1])));
if (!name) { console.log("usage: node tools/finalize.mjs <silent.mp4> <mix.wav> <outDir> <name> [--nomusic mix.wav] [--phone-mb 29] [--frames N]"); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const probe = (f, entries, stream = "v:0") => execFileSync("ffprobe", ["-v", "error", "-select_streams", stream, "-show_entries", entries, "-of", "csv=p=0", f], { encoding: "utf8" }).trim().replace(/,+$/, "");
const frames = Number(execFileSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", silent], { encoding: "utf8" }).replace(/[^0-9]/g, ""));
const [fn, fd] = probe(silent, "stream=r_frame_rate").split("/").map(Number);
const fps = fn / (fd || 1);
const [w, h] = probe(silent, "stream=width,height").split(",").map(Number);
const dur = frames / fps;
console.log(`picture: ${w}×${h} · ${fps.toFixed(3)} fps · ${frames} frames · ${dur.toFixed(2)} s`);
if (opt("frames") && Number(opt("frames")) !== frames) { console.error(`✗ frame count ${frames} ≠ expected ${opt("frames")} — a render chunk is missing; re-render before finalising`); process.exit(2); }
const adur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mix], { encoding: "utf8" }).trim());
if (Math.abs(adur - dur) > 0.3) console.warn(`⚠ audio ${adur.toFixed(2)} s vs picture ${dur.toFixed(2)} s — padded/cut to the picture; check the end`);
const VF = flag("keep-range") ? "format=yuv420p" : "scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p";
const TAGS = flag("keep-range") ? [] : ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });

const make = (audio, base) => {
  const final = path.join(outDir, `${base}.mp4`);
  ff(["-i", silent, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-vf", VF, "-c:v", "libx264", "-crf", opt("crf", "18"), "-preset", "slow", ...TAGS,
    "-af", "apad", "-t", dur.toFixed(3), "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", final]);
  // phone: the size budget decides the bitrate; 1080p when it allows ≥ 2.5 Mbps, else 720p
  const target = Number(opt("phone-mb", 29)) * 1e6 * 0.96;
  const vk = Math.max(400, Math.min(8000, Math.floor((target * 8) / dur / 1000 - 96)));
  const short = vk >= 2500 ? 1080 : 720;
  const sc = w >= h ? `scale=-2:${short}` : `scale=${short}:-2`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "finalize-"));
  const stats = path.join(tmp, "x265.log").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
  const phone = path.join(outDir, `${base}-phone.mp4`);
  const common = ["-i", final, "-vf", `${sc}:flags=lanczos,format=yuv420p`, "-c:v", "libx265", "-b:v", `${vk}k`, "-preset", "slow"];
  ff([...common, "-x265-params", `pass=1:stats=${stats}:log-level=error`, "-an", "-f", "null", os.platform() === "win32" ? "NUL" : "/dev/null"]);
  ff([...common, "-x265-params", `pass=2:stats=${stats}:log-level=error`, "-tag:v", "hvc1", ...TAGS.filter((t, i, a) => t !== "-color_range" && a[i - 1] !== "-color_range"), "-color_range", "tv", "-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-movflags", "+faststart", phone]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const lufs = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", final, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = lufs.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop(), P = lufs.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop();
  console.log(`✓ ${final} (${(fs.statSync(final).size / 1e6).toFixed(1)} MB · ${I} · true ${P})`);
  console.log(`✓ ${phone} (${(fs.statSync(phone).size / 1e6).toFixed(1)} MB · ${short}p · ${vk} kbps)`);
  return final;
};
const final = make(mix, name);
if (opt("nomusic")) make(opt("nomusic"), `${name}-nomusic`);
