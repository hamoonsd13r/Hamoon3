// Master the film's mix for delivery: gain measured to -14 LUFS (integrated), a peak limiter (~-1.5 dBTP), 48 kHz.
// Then hand it to the kit's last step:  node tools/finalize.mjs <silent.mp4> videos/<id>/audio/mix-14.wav videos/<id>/final <name>
// (finalize muxes it, converts to TV-range BT.709, checks frames and audio length, makes the phone copy and the cover).
// Usage: node src/styles/toon3d/pipeline/master.mjs <id> [--mix videos/<id>/audio/mix.wav] [--lufs -14]
import { parseArgs, die, film, ff, run } from "./lib.mjs";

const a = parseArgs();
const [id] = a._;
if (!id) die("usage: node src/styles/toon3d/pipeline/master.mjs <id> [--mix file] [--lufs -14]");
const mix = a.mix ?? `${film(id)}/audio/mix.wav`, target = Number(a.lufs ?? -14), out = `${film(id)}/audio/mix-14.wav`;
const loud = (file) => {
  const e = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], { capture: true }).stderr;
  const s = e.slice(e.lastIndexOf("Summary"));
  return { I: Number(s.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]), TP: Number(s.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]) };
};
const m0 = loud(mix);
if (!Number.isFinite(m0.I)) die(`could not measure ${mix}`);
const gain = (target - m0.I).toFixed(2);
console.log(`mix: ${m0.I} LUFS, true peak ${m0.TP} dBFS -> gain ${gain} dB`);
ff(["-i", mix, "-af", `volume=${gain}dB,alimiter=limit=0.82:attack=4:release=60:level=false,aresample=48000`, "-c:a", "pcm_s16le", out]);
const m1 = loud(out);
console.log(`${out}: ${m1.I} LUFS, true peak ${m1.TP} dBFS`);
