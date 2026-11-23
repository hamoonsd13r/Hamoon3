// Painted Story · a sound for each voice. The narrator stays clean; a voice that comes through something gets that
// thing's sound: an intercom (small speaker, band-limited, a metal box), an air vent (duct echo, no highs), a radio, and
// a "mimic" (a voice that copies someone: their own take a semitone lower, with a hollow echo). Each speaker's lines
// (from vo.json segs) go through their own chain, then everything is summed back into one dialogue track.
//
//   node vo-fx.mjs <vo.wav> <vo.json> <out.wav> <fx.json>
//   fx.json: { "N": "clean", "U": "intercom", "M": "vent", "X": "mimic", "R": "radio" }   (or a raw ffmpeg chain)
//   Prints each speaker's loudness on their own lines — keep them within ~2 LU of each other (raise a quiet one with
//   the gain in lines.json, never with a compressor on the narrator).
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const [IN, VOJ, OUT, FXJ] = process.argv.slice(2);
if (!IN || !VOJ || !OUT || !FXJ) throw new Error("usage: node vo-fx.mjs <vo.wav> <vo.json> <out.wav> <fx.json>");
const VO = JSON.parse(fs.readFileSync(VOJ, "utf8"));
const FX = JSON.parse(fs.readFileSync(FXJ, "utf8"));
const PRESET = {
  clean: "highpass=f=60",
  warm: "highpass=f=80,volume=0.9",
  intercom: "highpass=f=380,lowpass=f=3300,equalizer=f=1700:t=q:w=1.2:g=5,acompressor=threshold=0.08:ratio=4:attack=5:release=80,aecho=0.85:0.4:7|13:0.25|0.15,volume=6.5,alimiter=limit=0.7:level=false",
  vent: "highpass=f=170,lowpass=f=2700,aecho=0.85:0.7:9|19|31:0.32|0.22|0.12,equalizer=f=900:t=q:w=1:g=3,volume=2.6",
  radio: "highpass=f=320,lowpass=f=3200,equalizer=f=1500:t=q:w=1:g=4,acompressor=threshold=0.1:ratio=3:attack=5:release=60,volume=4,alimiter=limit=0.7:level=false",
  mimic: "asetrate=48000*0.944,aresample=48000,atempo=1.0593,lowpass=f=5200,aecho=0.8:0.55:45|95:0.28|0.16,volume=1.62",
};
const SP = Object.keys(FX).filter((s) => VO.segs.some((x) => x.sp === s));
if (!SP.length) throw new Error("no speaker of fx.json appears in vo.json");
// gate: each branch hears only its own lines (+ a short tail for echoes)
const only = (sp) => `volume=0:enable='not(${VO.segs.filter((s) => s.sp === sp).map((s) => `between(t,${(s.start - 0.08).toFixed(3)},${(s.end + 0.35).toFixed(3)})`).join("+")})'`;
const g = [`[0:a]aresample=48000,asplit=${SP.length}${SP.map((s) => `[i${s}]`).join("")}`];
for (const s of SP) g.push(`[i${s}]${only(s)},${PRESET[FX[s]] ?? FX[s]}[o${s}]`);
g.push(`${SP.map((s) => `[o${s}]`).join("")}amix=inputs=${SP.length}:normalize=0:duration=first[out]`);
const graph = path.join(path.dirname(path.resolve(OUT)), path.basename(OUT).replace(/\.wav$/i, "") + ".graph");
fs.writeFileSync(graph, g.join(";\n")); // a file, not the command line: long line lists overflow Windows' limit
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", IN, "-/filter_complex", graph, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s16le", OUT], { stdio: "inherit" });
for (const s of SP) {
  const parts = VO.segs.filter((x) => x.sp === s).map((x) => `between(t,${x.start.toFixed(2)},${x.end.toFixed(2)})`).join("+");
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", OUT, "-af", `volume=0:enable='not(${parts})',ebur128=framelog=quiet`, "-f", "null", "-"]).stderr.toString();
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.slice(r.lastIndexOf("Summary")));
  console.log(`${s} (${FX[s]}) ≈ ${m ? m[1] : "?"} LUFS on its own lines`);
}
console.log("→", OUT);
