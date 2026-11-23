// Painted Story · the sound of one part. A long story is published in parts: the same film rendered with
// { start, pre, end, card, part, next } (a part title of `pre` s, then film time start → end, the end card at `card`).
// This cuts the full mix to match: `pre` s of silence under the title, start → end, a short fade at the end.
// (Pick `end` a few seconds after the end card starts, so the music tail plays under it.) Feed the result to tools/finalize.mjs with the part's silent render.
//
//   node part.mjs <mix-norm.wav> <out.wav> <start> <end> [--pre 2.6] [--fade 0.35]
//   e.g. part 1 = 0 → end of line 13: node part.mjs out/mix-norm.wav out/p1.wav 0 89.5
//        part 2 starting at line 14 with a 2.6 s title: node part.mjs out/mix-norm.wav out/p2.wav 85.0 277.5 --pre 2.6
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const [IN, OUT, S, E] = args.filter((a, i) => !a.startsWith("--") && !(["--pre", "--fade"].includes(args[i - 1])));
if (!IN || !OUT || S === undefined || E === undefined) throw new Error("usage: node part.mjs <mix.wav> <out.wav> <start> <end> [--pre 2.6] [--fade 0.35]");
const start = +S, end = +E, PRE = opt("--pre", 0), FADE = opt("--fade", 0.35);
const len = end - start;
const af = [`atrim=start=${start}:end=${end}`, "asetpts=PTS-STARTPTS", `afade=t=out:st=${(len - FADE).toFixed(3)}:d=${FADE}`];
if (PRE > 0) af.push(`adelay=${Math.round(PRE * 1000)}:all=1`, `afade=t=in:st=${PRE.toFixed(3)}:d=0.25`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", IN, "-af", af.join(","), "-ar", "48000", OUT], { stdio: "inherit" });
console.log(`→ ${OUT}  (${(len + PRE).toFixed(2)} s = ${PRE} s title + ${len.toFixed(2)} s of film)`);
