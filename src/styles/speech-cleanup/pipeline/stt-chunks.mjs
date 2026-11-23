// Speech Cleanup · step 2 — transcribes a long recording with ElevenLabs Scribe: splits it at silences into ~N-minute
// chunks, sends 2 at a time (retrying 429/5xx), then merges the words back onto the original clock. Only audio is sent.
// Cost (measured): about 20 credits per minute (scribe_v2 with speakers) — a 70-minute class ≈ 1,400 credits.
// usage: node --env-file=.env src/styles/speech-cleanup/pipeline/stt-chunks.mjs <audio> <outDir> [lang=fas] [chunkMin=17]
// Writes <outDir>/chunks/*.flac + *.json, <outDir>/words.json, <outDir>/chunks.json, <outDir>/transcript.txt
// Re-running skips chunks already transcribed (their .json exists).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { elevenReady, xi } from "../../../../tools/lib/eleven.mjs";
import { STT_URL } from "./scribe.mjs";

const [input, outDir, lang = "fas", chunkMin = "17"] = process.argv.slice(2);
if (!input || !outDir) throw new Error("usage: stt-chunks.mjs <audio> <outDir> [lang] [chunkMin]");
if (!elevenReady()) throw new Error("no ElevenLabs key: put ELEVENLABS_API_KEY in .env and run with node --env-file=.env");
const chunkDir = path.join(outDir, "chunks");
fs.mkdirSync(chunkDir, { recursive: true });

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(-500)}`);
  return r;
};
const dur = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]).stdout);

// split points: the quietest 100 ms within ±90 s of every chunkMin minutes (relative, so room noise doesn't matter)
const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", input, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 }).stdout;
const energy = new Float64Array(Math.floor(pcm.length / 3200)); // 100 ms windows
for (let k = 0; k < energy.length; k++) for (let q = 0; q < 1600; q++) { const x = pcm.readInt16LE((k * 1600 + q) * 2); energy[k] += x * x; }
const cuts = [0];
for (let t = chunkMin * 60; t < dur - 120; t += chunkMin * 60) {
  let best = t, bestE = Infinity;
  const k0 = Math.max(Math.ceil((cuts.at(-1) + 60) * 10), Math.floor((t - 90) * 10)), k1 = Math.min(energy.length, Math.floor((t + 90) * 10));
  for (let k = k0; k < k1; k++) if (energy[k] < bestE) { bestE = energy[k]; best = k / 10 + 0.05; }
  cuts.push(best);
}
cuts.push(dur);
const chunks = cuts.slice(0, -1).map((a, i) => ({ i, a, b: cuts[i + 1], file: path.join(chunkDir, `c${String(i).padStart(2, "0")}.flac`) }));
for (const c of chunks) if (!fs.existsSync(c.file)) run("ffmpeg", ["-v", "error", "-y", "-ss", c.a.toFixed(3), "-t", (c.b - c.a).toFixed(3), "-i", input, "-c:a", "flac", c.file]);
console.log(`${dur.toFixed(1)} s → ${chunks.length} chunks at`, cuts.map((x) => x.toFixed(1)).join(", "));

async function transcribe(c) {
  const out = c.file.replace(/\.flac$/, ".json");
  if (fs.existsSync(out)) return JSON.parse(fs.readFileSync(out, "utf8"));
  for (let attempt = 1; attempt <= 5; attempt++) {
    const form = new FormData();
    form.append("file", new Blob([fs.readFileSync(c.file)]), path.basename(c.file));
    form.append("model_id", "scribe_v2");
    form.append("language_code", lang);
    form.append("diarize", "true");
    form.append("timestamps_granularity", "word");
    form.append("tag_audio_events", "true");
    try {
      const r = await fetch(STT_URL, { method: "POST", headers: xi(), body: form });
      const t = await r.text();
      if (r.ok) { fs.writeFileSync(out, t); console.log(`chunk ${c.i} done`); return JSON.parse(t); }
      console.log(`chunk ${c.i} attempt ${attempt}: ${r.status} ${t.slice(0, 200)}`);
      if (r.status < 429 && r.status !== 408) throw new Error(`chunk ${c.i}: ${r.status}`);
    } catch (e) {
      if (/chunk \d+: \d+/.test(e.message)) throw e;
      console.log(`chunk ${c.i} attempt ${attempt}: ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, 15000 * attempt));
  }
  throw new Error(`chunk ${c.i} failed 5 times`);
}

const results = [];
let next = 0;
await Promise.all([0, 1].map(async () => { while (next < chunks.length) { const c = chunks[next++]; results[c.i] = await transcribe(c); } }));

const words = [];
for (const c of chunks) for (const w of results[c.i].words) words.push({ ...w, start: +(w.start + c.a).toFixed(3), end: +(w.end + c.a).toFixed(3), speaker_id: `${c.i}:${w.speaker_id}`, chunk: c.i });
fs.writeFileSync(path.join(outDir, "words.json"), JSON.stringify(words));
fs.writeFileSync(path.join(outDir, "chunks.json"), JSON.stringify(chunks.map(({ i, a, b }) => ({ i, a, b }))));
fs.writeFileSync(path.join(outDir, "transcript.txt"), chunks.map((c) => `[chunk ${c.i} @${c.a.toFixed(1)}s]\n${results[c.i].text}`).join("\n\n"));
console.log("words", words.filter((w) => w.type === "word").length, "→", path.join(outDir, "words.json"));
