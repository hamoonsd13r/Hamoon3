// The demo film's sound script, kept as the template for yours (new-video.mjs copies it to videos/<id>/build-audio.cjs).
// It is only a cue list: every time comes from the narration's words (W) or the picture's plan (P.cue / P.shot /
// P.whips, written by pipeline/plan.mjs from story.ts), never a copied formula.
// Inputs (videos/<id>/): vo.wav (tools/doc-build-vo.mjs), plan/plan.json (pipeline/plan.mjs), music/music.(mp3|wav)
// (optional: ElevenLabs Music with a plan, or a CC0 / licensed track); src/<id>/vo.json = the film's word timing.
// Beds and thunder are synthesized (mixer roar / hiss); effects come from the project's free libraries
// (public/kenney CC0, public/sfx-lib). Out: videos/<id>/audio/stem-*.wav + mix.wav -> margin.mjs -> master.mjs -> tools/finalize.mjs.
// Usage (from the project root): node videos/<id>/build-audio.cjs
const fs = require("fs"), path = require("path");
const ID = process.argv[2] ?? "demo";
const FILM = path.resolve(process.env.TOON3D_WORK ?? "videos", ID), PIPE = path.resolve("src/styles/toon3d/pipeline");
const { mixer } = require(path.join(PIPE, "mixer.cjs"));
const P = require(path.join(PIPE, "plancues.cjs")).plan(FILM);
if (P.stale()) console.warn("warning: the plan is older than the sources; re-run plan.mjs first");
const voFile = [path.resolve("src", ID, "vo.json"), path.join(FILM, "dlg/vo.json"), ID === "demo" ? path.resolve("src/styles/toon3d/demo/vo.json") : ""].find((f) => f && fs.existsSync(f));
if (!voFile) throw new Error(`no vo.json for ${ID} (src/${ID}/vo.json from tools/doc-build-vo.mjs)`);
const mx = mixer({ total: P.frames / P.fps, vo: voFile });
const { W, place, roar, hiss } = mx;
const K = (f) => path.resolve("public/kenney", f);

// ---------------- tracks ----------------
const voWav = path.join(FILM, "vo.wav");
const voice = fs.existsSync(voWav) ? mx.voice(voWav) : mx.track();
const mFile = ["music.mp3", "music.wav"].map((f) => path.join(FILM, "music", f)).find((f) => fs.existsSync(f));
// cut a score on its bar lines when it does not follow the story: mx.musicEdit(file, [[0, bar8], [bar12, bar30], ...])
const music = mFile ? mx.musicEdit(mFile, [[0, P.frames / P.fps + 1]]) : mx.track();
const fx = mx.track(), amb = mx.track();

// ---------------- places: inside (galley) and outside (sea), crossfaded on the dissolves ----------------
const END = P.frames / P.fps, SEA0 = P.cue("toSea"), SEA1 = P.cue("toGalley"), X = 0.3;
// inside: the hull's deep groan and the rain muffled by the planks; outside: rain, swell, wind
roar(amb, [[0, -24], [SEA0 - X, -24], [SEA0 + X, -60], [SEA1 - X, -60], [SEA1 + X, -24], [END, -24]], { lp: 90, lp2: 220 });
hiss(amb, [[0, -40], [SEA0 - X, -40], [SEA0 + X, -70], [SEA1 - X, -70], [SEA1 + X, -40], [END, -40]], { hp: 300, lp: 1400, seed: 11 });
hiss(amb, [[SEA0 - X, -70], [SEA0 + X, -14], [SEA1 - X, -14], [SEA1 + X, -70]], { hp: 1500, lp: 9000, seed: 23 });
roar(amb, [[SEA0 - X, -60], [SEA0 + X, -8], [SEA1 - X, -8], [SEA1 + X, -60]], { lp: 260, lp2: 700, gain: 4 });
hiss(amb, [[SEA0 - X, -70], [SEA0 + X, -24], [SEA1 - X, -24], [SEA1 + X, -70]], { hp: 250, lp: 900, seed: 37 });

// ---------------- story cues ----------------
// thunder: a crack and a long roll on the lightning frame (the picture's flash comes from the same cue)
const TH = P.cue("thunder");
roar(fx, [[TH - 0.02, -50], [TH + 0.04, -4], [TH + 0.5, -10], [TH + 2.2, -22], [TH + 4.0, -60]], { lp: 140, lp2: 520, gain: 4 });
hiss(fx, [[TH - 0.01, -60], [TH + 0.03, -10], [TH + 0.35, -40]], { hp: 2000, lp: 8000, seed: 5 });
// the lamp creaks at each end of its swing (the roll clock of story.ts) while we are inside
const PER = P.cue("rollPeriod"), PH = P.cue("rollPhase");
for (let k = 0; ; k++) {
  const t = k * (PER / 2) + PER / 4 - PH;
  if (t > END) break;
  if (t < 0 || (t > SEA0 - 0.2 && t < SEA1 + 0.2)) continue;
  place(fx, K(`impact/impactWood_light_00${k % 5}.ogg`), t, { db: -24, rate: 0.7, lp: 2500 });
}
// the cook's fright, his walk to the soup, the bowl on the punchline
place(fx, K("impact/impactPlate_light_001.ogg"), W("بیفته", 2) - 0.03, { db: -22 });
for (let i = 0; i < 3; i++) place(fx, K(`impact/footstep_wood_00${i}.ogg`), P.cue("walk") + 0.12 + i * 0.34, { db: -24 });
place(fx, K("impact/impactTin_medium_002.ogg"), W("سوپشه", 7) - 0.02, { db: -22 });
// every fast camera move heard: a whoosh peaking on its fastest frame
for (const w of P.whips) { const s = P.whoosh(w); place(fx, s.file, s.at, { db: s.db }); }

// ---------------- mix (levels of the accepted films: vo.wav ~ -22 LUFS) ----------------
if (mFile) mx.duck(music, voice, { db: -6, attack: 0.04, release: 0.45, also: [[amb, 0.6]] });
mx.duckWords(voice, 7.6, [[music, -11]], [[fx, -13], [amb, -9]], { margin: 12, max: 10 });
mx.write(path.join(FILM, "audio"), [["voice", voice, 7.6], ["music", music, -11], ["fx", fx, -13], ["amb", amb, -9]]);
