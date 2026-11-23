// Speech Cleanup · step 1b — RMS level of an audio file every 10 ms, in dBFS, as Float32 (one value per 10 ms window).
// Every later step reads it: silences, cut edges on loudness valleys, the join pauses.
// usage: node src/styles/speech-cleanup/pipeline/envelope.cjs <voice.flac> <env10ms.f32>
const { spawn } = require("child_process");
const fs = require("fs");
const [input, out] = process.argv.slice(2);
const SR = 16000, WIN = 160; // 10 ms at 16 kHz
const ff = spawn("ffmpeg", ["-v", "error", "-i", input, "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"]);
const vals = [];
let carry = Buffer.alloc(0), acc = 0, n = 0;
ff.stdout.on("data", (buf) => {
  buf = carry.length ? Buffer.concat([carry, buf]) : buf;
  const usable = buf.length - (buf.length % 2);
  for (let i = 0; i < usable; i += 2) {
    const s = buf.readInt16LE(i) / 32768;
    acc += s * s;
    if (++n === WIN) { vals.push(10 * Math.log10(acc / WIN + 1e-12)); acc = 0; n = 0; }
  }
  carry = buf.subarray(usable);
});
ff.on("close", (code) => {
  if (code !== 0) throw new Error("ffmpeg failed");
  fs.writeFileSync(out, Buffer.from(new Float32Array(vals).buffer));
  const sorted = [...vals].sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))].toFixed(1);
  console.log(`${vals.length} windows (${(vals.length / 100).toFixed(1)} s)  dBFS p5 ${q(0.05)}  p20 ${q(0.2)}  p50 ${q(0.5)}  p90 ${q(0.9)}  p99 ${q(0.99)}`);
});
