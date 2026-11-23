// Speech Cleanup — transcribes short windows on their own, to tell an audio problem from a slip of the long-file
// transcript (a long file sometimes drops whole sentences: send that spot alone before "fixing" anything).
// usage: node --env-file=.env src/styles/speech-cleanup/pipeline/stt-window.mjs <audio> <outDir> <lang> <start-end> [start-end …]   (seconds)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { xi } from "../../../../tools/lib/eleven.mjs";
import { STT_URL } from "./scribe.mjs";

const [audio, outDir, lang, ...wins] = process.argv.slice(2);
if (!wins.length) throw new Error("usage: stt-window.mjs <audio> <outDir> <lang> <start-end> [start-end …]");
fs.mkdirSync(outDir, { recursive: true });
const T = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
await Promise.all(wins.map(async (w) => {
  const [a, b] = w.split("-").map(Number);
  const file = path.join(outDir, `win-${a}-${b}.wav`); // WAV: a FLAC encoder rejects the tiny first block after a seek
  spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(a), "-t", String(b - a), "-i", audio, "-c:a", "pcm_s16le", file]);
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("model_id", "scribe_v2");
  form.append("language_code", lang);
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "true");
  const r = await fetch(STT_URL, { method: "POST", headers: xi(), body: form });
  const j = await r.json();
  const ws = (j.words || []).filter((x) => x.type !== "spacing").map((x) => `${x.text}@${T(x.start + a)}`);
  console.log(`\n[${T(a)}–${T(b)}] ${j.text || JSON.stringify(j).slice(0, 200)}\n   ${ws.join(" ")}`);
}));
