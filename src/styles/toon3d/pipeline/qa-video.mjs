// Signal QA of a finished render (the style card's delivery checks): black frames, unplanned white frames, freezes (12+ frames
// without change), the hard cuts (compare with the shot list: a cut that is not in story.ts is a jump), loudness and
// silences. Run it on the final MP4 (a silent render skips the audio part).
// Usage: node src/styles/toon3d/pipeline/qa-video.mjs <video.mp4> [--freeze 0.4] [--cut 32]
import { parseArgs, die, run } from "./lib.mjs";

const a = parseArgs();
const [video] = a._;
if (!video) die("usage: node src/styles/toon3d/pipeline/qa-video.mjs <video.mp4> [--freeze 0.4] [--cut 32]");
const ffo = (vf, map = "0:v:0", filt = "-vf") => { const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-map", map, filt, vf, "-f", "null", "-"], { capture: true, ok: true }); return r.stderr + r.stdout; };
const spans = (txt, a0, a1) => [...txt.matchAll(new RegExp(`${a0}:\\s*([\\d.]+)[\\s\\S]*?${a1}:\\s*([\\d.]+)`, "g"))].map((m) => [+m[1], +m[2]]);
const fmt = (l) => (l.length ? l.map(([p, q]) => `${p.toFixed(2)}-${q.toFixed(2)}`).join(", ") : "none");
const black = spans(ffo("scale=180:320,blackdetect=d=0.03:pix_th=0.06"), "black_start", "black_end");
const white = spans(ffo("scale=180:320,negate,blackdetect=d=0.03:pix_th=0.07"), "black_start", "black_end");
const fz = ffo(`scale=180:320,freezedetect=n=0.002:d=${a.freeze ?? 0.4},scdet=t=${a.cut ?? 32}:s=1`);
const freezes = spans(fz, "freeze_start", "freeze_end");
const cuts = [...fz.matchAll(/lavfi\.scd\.time:\s*([\d.]+)/g)].map((m) => +m[1]);
const out = [`# QA ${video}`, `black: ${fmt(black)}`, `white: ${fmt(white)}`, `frozen (>= ${a.freeze ?? 0.4} s): ${fmt(freezes)}`,
  `hard cuts (${cuts.length}): ${cuts.map((t) => t.toFixed(2)).join(" ")}`];
const au = ffo("ebur128=peak=true,silencedetect=n=-45dB:d=0.3", "0:a:0?", "-af");
if (au.includes("Summary")) {
  const s = au.slice(au.lastIndexOf("Summary"));
  out.push(`loudness: I ${s.match(/I:\s+(-?[\d.]+)/)?.[1]} LUFS, LRA ${s.match(/LRA:\s+(-?[\d.]+)/)?.[1]} LU, true peak ${s.match(/Peak:\s+(-?[\d.]+)/)?.[1]} dBFS`,
    `silences (< -45 dB, >= 0.3 s): ${fmt(spans(au, "silence_start", "silence_end"))}`);
} else out.push("audio: none");
console.log(out.join("\n"));
