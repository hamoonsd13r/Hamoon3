// Word-by-word ducking of the music under a narration (for narrated reels; edits of the speaker's own video use
// music-steady.mjs instead). Inside each word (−20 ms … +60 ms) the music comes down just enough for the voice to sit
// ≥ --target dB above it, measured in the speech band (300 Hz – 5 kHz, where phones play), at most --max dB; fast down
// (20 ms, with 20 ms look-ahead) and slow back (180 ms). A sidechain compressor is too slow for quiet word endings and
// never reacts to a soft line.
// --gain is the music's gain in the final mix (dB), --eq the mix EQ on the music (so the measure matches what plays).
// Usage: node tools/duck-words.mjs <music.wav> <voice.wav> <words.json> <out.wav> [--gain -14] [--target 14] [--max 7]
//          [--eq "highpass=f=28,bass=g=-4:f=110:w=0.7"]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { loadWords } from "./lib/words.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const [musicFile, voiceFile, wordsFile, outFile] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!outFile) { console.log("usage: node tools/duck-words.mjs <music.wav> <voice.wav> <words.json> <out.wav> [--gain -14] [--target 14] [--max 7] [--eq \"…\"]"); process.exit(1); }
const GAIN = Number(opt("gain", -14)), TARGET = Number(opt("target", 14)), MAXCUT = Number(opt("max", 7)), EQ = opt("eq", "");
const SR = 48000, BAND = "highpass=f=300,lowpass=f=5000";
const rd = (f, ch, af) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, ...(af ? ["-af", af] : []), "-ac", String(ch), "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const voice = rd(voiceFile, 1, BAND);
const musM = rd(musicFile, 1, (EQ ? EQ + "," : "") + BAND);
const mus = rd(musicFile, 2);
const N = mus.length / 2, HOP = SR / 100, F = Math.ceil(N / HOP), mg = Math.pow(10, GAIN / 20), W = Math.round(0.03 * SR);
const rms = (x, c, k = 1) => { let s = 0, n = 0; for (let i = Math.max(0, c - W); i < Math.min(x.length, c + W); i++) { const v = x[i] * k; s += v * v; n++; } return 20 * Math.log10(Math.sqrt(s / Math.max(1, n)) + 1e-9); };
const need = new Float32Array(F);
const words = loadWords(wordsFile);
for (const w of words)
  for (let f = Math.max(0, Math.floor((w.s - 0.02) * 100)); f < Math.min(F, Math.ceil((w.e + 0.06) * 100)); f++) {
    const v = rms(voice, f * HOP);
    if (v < -60) continue;
    need[f] = Math.min(need[f], Math.max(-MAXCUT, Math.min(0, v - TARGET - rms(musM, f * HOP, mg))));
  }
const g = new Float32Array(F);
let cur = 0;
const ka = 1 - Math.exp(-1 / 2), kr = 1 - Math.exp(-1 / 18);
for (let f = 0; f < F; f++) { const tgt = Math.min(need[f], need[Math.min(F - 1, f + 2)]); cur += (tgt - cur) * (tgt < cur ? ka : kr); g[f] = cur; }
const out = new Float32Array(N * 2);
for (let n = 0; n < N; n++) {
  const fp = n / HOP, f0 = Math.floor(fp), u = fp - f0;
  const k = Math.pow(10, (g[Math.min(F - 1, f0)] * (1 - u) + g[Math.min(F - 1, f0 + 1)] * u) / 20);
  out[n * 2] = mus[n * 2] * k;
  out[n * 2 + 1] = mus[n * 2 + 1] * k;
}
const tmp = outFile + ".f32";
fs.writeFileSync(tmp, Buffer.from(out.buffer));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", tmp, "-c:a", "pcm_s24le", outFile]);
fs.unlinkSync(tmp);
console.log(`${outFile} · ${words.length} words · frames ducked ${Array.from(g).filter((x) => x < -0.5).length}/${F} · deepest ${Math.min(...g).toFixed(1)} dB`);
