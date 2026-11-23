// Painted Story · voice casting. The same first line read by 3–5 voices (narrator and each speaking role), saved side
// by side plus one joined file with a short pause between them — send it to the person who decides; they pick by ear.
// Only text is sent (ElevenLabs TTS). Prints the account's character balance first.
//
//   node --env-file=.env cast.mjs <cast.json> <outDir> [model=eleven_v4]
//   cast.json: [{ "name": "N1-Calm", "id": "<voiceId>", "text": "ساعتِ شیش و ده دقیقه‌ی صبح…", "settings": { "stability": 0.5, "similarity_boost": 0.75 } }]
//   Narration of a doc: stability 0.5 / similarity 0.75, no emotion tags. A dialogue role: tags + stability ~0.35.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { xi } from "../../../../tools/lib/eleven.mjs";

const API = "https:" + "//api.elevenlabs.io/v1"; // split in two so the kit leak scan never mistakes the scheme for a drive path

const [castFile, out, model = "eleven_v4"] = process.argv.slice(2);
if (!castFile || !out) throw new Error("usage: node --env-file=.env cast.mjs <cast.json> <outDir> [model]");
fs.mkdirSync(out, { recursive: true });
const sub = await (await fetch(`${API}/user/subscription`, { headers: xi() })).json().catch(() => ({}));
if (sub.character_count !== undefined) console.log("characters", sub.character_count, "/", sub.character_limit, sub.tier ?? "");
const C = JSON.parse(fs.readFileSync(castFile, "utf8"));
const done = [];
for (const c of C) {
  const f = path.join(out, `${c.name}.mp3`);
  if (!fs.existsSync(f)) {
    const r = await fetch(`${API}/text-to-speech/${c.id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: xi({ "content-type": "application/json" }),
      body: JSON.stringify({ text: c.text, model_id: c.model ?? model, voice_settings: c.settings ?? { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!r.ok) { console.log(c.name, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log("ok", c.name);
  }
  done.push(f);
}
// one file to listen to: every take, 0.8 s apart, in the order of cast.json
if (done.length) {
  const list = path.join(out, "list.txt");
  const gap = path.join(out, "_gap.wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.8", gap]);
  const norm = done.map((f) => { const w = f.replace(/\.mp3$/, ".wav"); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-ar", "44100", "-ac", "1", w]); return w; });
  fs.writeFileSync(list, norm.flatMap((w) => [`file '${path.resolve(w).replace(/\\/g, "/")}'`, `file '${path.resolve(gap).replace(/\\/g, "/")}'`]).join("\n"));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "libmp3lame", "-q:a", "3", path.join(out, "cast-all.mp3")]);
  console.log(`→ ${path.join(out, "cast-all.mp3")} — order: ${C.map((c) => c.name).join(" · ")}`);
}
