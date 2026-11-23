// How far the voice sits above the music, word by word, in the speech band (300 Hz – 5 kHz — what a phone plays).
// Aim (narrated reels): every word ≥ 10 dB, median ≈ 20 dB. Prints min / p10 / median / p90 and the lowest words, so
// you fix the exact spots (duck-words, a line's gain, or a quieter bed) instead of guessing.
// Inputs are the voice and the music as they are IN THE MIX (stems from doc-mix --stems, or your own build).
// --gain dB is applied to the music first (its gain in the mix, if the file is the raw bed).
// Usage: node tools/word-margin.mjs <voice.wav> <music-stem.wav> <words.json> [--gain 0] [--lowest 8]
import { execFileSync } from "node:child_process";
import { loadWords } from "./lib/words.mjs";

const args = process.argv.slice(2);
const li = args.indexOf("--lowest");
const LOW = li >= 0 ? Number(args[li + 1]) : 8;
const gi = args.indexOf("--gain");
const GAIN = gi >= 0 ? Number(args[gi + 1]) : 0;
const [voiceFile, musicFile, wordsFile] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!wordsFile) { console.log("usage: node tools/word-margin.mjs <voice.wav> <music-stem.wav> <words.json> [--lowest 8]"); process.exit(1); }
const SR = 16000;
const load = (f) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-af", "highpass=f=300,lowpass=f=4000", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 }); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const rms = (x, a, b) => { let s = 0, n = 0; for (let i = Math.floor(a * SR); i < Math.min(x.length, Math.floor(b * SR)); i++) { s += x[i] * x[i]; n++; } return 10 * Math.log10(s / Math.max(1, n) + 1e-12); };
const v = load(voiceFile), m = load(musicFile);
const rows = loadWords(wordsFile).filter((w) => w.e - w.s > 0.08).map((w) => ({ t: w.s, w: w.w, d: rms(v, w.s, w.e) - rms(m, w.s, w.e) - GAIN })).sort((a, b) => a.d - b.d);
if (!rows.length) { console.log("no words"); process.exit(1); }
const q = (p) => rows[Math.floor(p * (rows.length - 1))].d.toFixed(1);
console.log(`words ${rows.length} | min ${q(0)} · p10 ${q(0.1)} · median ${q(0.5)} · p90 ${q(0.9)} dB`);
console.log(rows.slice(0, LOW).map((r) => `  ${r.t.toFixed(2)}s  ${r.w}  ${r.d.toFixed(1)} dB`).join("\n"));
