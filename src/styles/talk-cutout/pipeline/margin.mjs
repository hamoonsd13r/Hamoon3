// Talk Cutout · step 8 check: is every word clear over the music? Per spoken word: her voice RMS minus the music RMS in
// the SPEECH BAND (300–5000 Hz) over that word, from the stems of build-audio.mjs --stems. Accepted level: the minimum
// ≥ ~9–10 dB, the median ≈ 19–23 dB. And measure the music in the PHONE band too (phone-band.sh): a bass-heavy song
// that reads loud on LUFS can be inaudible on a phone speaker — compare with the last version the user liked, never
// with the integrated LUFS alone («کمی کمتر» = about −2 dB in the phone band, not 11).
// usage: node margin.mjs <st-voice.wav> <st-music.wav> <words.json>
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [voice, music, wordsPath] = process.argv.slice(2);
if (!wordsPath) throw new Error("usage: node margin.mjs <st-voice.wav> <st-music.wav> <words.json>");
const raw = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
const WORDS = Array.isArray(raw) ? raw : raw.words;
const SR = 16000;
const rd = (f) => {
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-af", "highpass=f=300,lowpass=f=5000", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
  const x = new Float32Array(b.length / 2);
  for (let i = 0; i < x.length; i++) x[i] = b.readInt16LE(i * 2) / 32768;
  return x;
};
const v = rd(voice), m = rd(music);
const rms = (x, a, b) => { let s = 0, n = 0; for (let i = Math.round(a * SR); i < Math.round(b * SR) && i < x.length; i++) { s += x[i] * x[i]; n++; } return Math.sqrt(s / Math.max(1, n)); };
const r = WORDS.filter((w) => w.e - w.s > 0.08).map((w) => ({ w: w.w, t: w.s, d: 20 * Math.log10((rms(v, w.s, w.e) + 1e-9) / (rms(m, w.s, w.e) + 1e-9)) }));
const ds = r.map((x) => x.d).sort((a, b) => a - b);
const q = (p) => ds[Math.floor(p * (ds.length - 1))];
console.log(`${ds.length} words · voice over music in the speech band: min ${q(0).toFixed(1)} · p10 ${q(0.1).toFixed(1)} · median ${q(0.5).toFixed(1)} dB`);
console.log("lowest:", r.sort((a, b) => a.d - b.d).slice(0, 6).map((x) => `${x.w}@${x.t.toFixed(2)} ${x.d.toFixed(1)}`).join("   "));
