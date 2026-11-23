// Speech Cleanup · step 2b — re-transcribes short windows around chunk joins that fell inside speech and splices them
// into words.json (a word cut in half at a join comes back wrong or missing). Each window starts and ends at the
// quietest 100 ms found 5–15 s either side of the join. Joins are in <sttDir>/chunks.json (b of each chunk).
// usage: node --env-file=.env src/styles/speech-cleanup/pipeline/stt-patch.mjs <audio> <env10ms.f32> <sttDir> <lang> <join1> [join2 …]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { xi } from "../../../../tools/lib/eleven.mjs";
import { STT_URL } from "./scribe.mjs";

const [audio, envPath, dir, lang, ...joins] = process.argv.slice(2);
if (!joins.length) throw new Error("usage: stt-patch.mjs <audio> <env10ms.f32> <sttDir> <lang> <join1> [join2 …]");
const b = fs.readFileSync(envPath);
const env = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const quietest = (lo, hi) => {
  let best = lo, bestV = Infinity;
  for (let t = lo; t < hi; t += 0.01) {
    let s = 0; for (let k = 0; k < 10; k++) s += 10 ** (env[Math.floor(t * 100) + k] / 10);
    if (s < bestV) { bestV = s; best = t + 0.05; }
  }
  return +best.toFixed(2);
};
const wordsPath = path.join(dir, "words.json");
let words = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
for (const j of joins.map(Number)) {
  const q0 = quietest(j - 15, j - 5), q1 = quietest(j + 5, j + 15);
  const file = path.join(dir, "chunks", `patch-${j}.wav`); // WAV: a FLAC encoder rejects the tiny first block after a seek
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(q0), "-t", String(q1 - q0), "-i", audio, "-c:a", "pcm_s16le", file]);
  if (r.status !== 0) throw new Error("ffmpeg failed");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("model_id", "scribe_v2");
  form.append("language_code", lang);
  form.append("diarize", "true");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "true");
  const res = await fetch(STT_URL, { method: "POST", headers: xi(), body: form });
  const t = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${t.slice(0, 200)}`);
  fs.writeFileSync(file.replace(/\.wav$/, ".json"), t);
  const fresh = JSON.parse(t).words.map((w) => ({ ...w, start: +(w.start + q0).toFixed(3), end: +(w.end + q0).toFixed(3), speaker_id: `p${j}:${w.speaker_id}`, chunk: `p${j}` }));
  const old = words.filter((w) => w.start >= q0 && w.start < q1);
  const show = (ws) => ws.filter((w) => w.type === "word").map((w) => w.text).join(" ");
  console.log(`join ${j}: window ${q0}–${q1}\n  old: ${show(old)}\n  new: ${show(fresh)}`);
  words = words.filter((w) => !(w.start >= q0 && w.start < q1)).concat(fresh).sort((a, b) => a.start - b.start);
}
fs.writeFileSync(wordsPath, JSON.stringify(words));
