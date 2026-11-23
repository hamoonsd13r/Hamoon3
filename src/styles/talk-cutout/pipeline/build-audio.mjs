// Talk Cutout · step 8–9: the mix. Her voice (cleaned by voice.sh, words untouched) levelled to −21 LUFS; the music
// (music-steady.mjs: one continuous, levelled piece) at ONE fixed gain with a static EQ — a low-shelf −4 dB at 110 Hz so
// phones still hear it, a gentle −3 dB dip at 2.5 kHz under her voice — and NO ducking, NO sidechain, NO automation on
// it; effects on picture events (each levelled to −20 dBFS active RMS, aligned on its onset or its peak), the effects
// bus gently keyed by her voice. Then one linear gain to −14 LUFS and a limiter. --nomusic: the same without the song
// (a copyrighted song is added inside Instagram instead). --stems: voice / music / sfx stems for margin.mjs.
// usage: node build-audio.mjs <audio.config.json> [--stems] [--nomusic]
// config: { dur, words, voice, voiceLufs?, music, musicDb, sfxDb?, sfxRoot, out, cues: [[file, time, vol, "on"|"pk"]] }
//   time = seconds, or a word: "W:<sentence>:<word>:<n>[+/-offset]" (the same word clock the picture cuts on)
//   sounds: the kit's free libraries under sfxRoot (public/sfx-lib/*.wav, public/kenney/**/*.ogg) or your own files.
//   A kind of sound at most 4–5 times in a film, never on her words' peaks; effects sit ~20 dB under her voice.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const cfgPath = args.find((a) => !a.startsWith("--"));
if (!cfgPath) throw new Error("usage: node build-audio.mjs <audio.config.json> [--stems] [--nomusic]");
const STEMS = args.includes("--stems"), NOMUSIC = args.includes("--nomusic");
const C = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const base = path.dirname(path.resolve(cfgPath));
const P = (p) => (path.isAbsolute(p) ? p : path.resolve(base, p));
const W = JSON.parse(fs.readFileSync(P(C.words), "utf8"));
const WORDS = Array.isArray(W) ? W : W.words;
const norm = (x) => x.replace(/[.,!?؟،؛«»:;"']/g, "").replace(/\u200c/g, "");
const time = (v) => {
  if (typeof v === "number") return v;
  const m = String(v).match(/^W:(\d+):(.+):(\d+)([+-][\d.]+)?$/);
  if (!m) throw new Error("bad cue time " + v);
  const ws = WORDS.filter((w) => w.si === Number(m[1]) && norm(w.w) === norm(m[2]));
  if (!ws[Number(m[3])]) throw new Error(`no word «${m[2]}» #${m[3]} in sentence ${m[1]}`);
  return ws[Number(m[3])].s + Number(m[4] ?? 0);
};

// each sound file: active RMS, onset and peak (decoded once)
const info = new Map();
const measure = (f) => {
  if (info.has(f)) return info.get(f);
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const x = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
  let pk = 0, pi = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk) { pk = Math.abs(x[i]); pi = i; }
  let on = 0;
  while (on < x.length && Math.abs(x[on]) < pk * 0.1) on++;
  let s = 0, n = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.05) { s += x[i] * x[i]; n++; }
  const r = { rmsDb: 20 * Math.log10(Math.sqrt(s / Math.max(1, n)) + 1e-9), onset: on / 48000, peak: pi / 48000 };
  info.set(f, r);
  return r;
};
const lufs = (f) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const m = r.stderr.match(/Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS/);
  return m ? Number(m[1]) : NaN;
};

const DUR = C.dur;
const EV = C.cues.map(([file, t, vol = 0.4, align = "on"]) => {
  const f = P(path.join(C.sfxRoot ?? ".", file));
  if (!fs.existsSync(f)) throw new Error("missing sound " + f);
  const m = measure(f);
  return { f, at: time(t), g: vol * Math.pow(10, (-20 - m.rmsDb) / 20), off: align === "pk" ? m.peak : m.onset };
});
const VOICE = P(C.voice);
const VOICE_DB = (C.voiceLufs ?? -21) - lufs(VOICE);
const inputs = ["-i", VOICE, "-i", P(C.music)];
const g = [];
g.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${VOICE_DB.toFixed(2)}dB,apad=whole_dur=${DUR},atrim=0:${DUR},asplit=2[vo][vk]`);
const eq = C.musicEq ?? { lowShelf: [-4, 110], dip: [-3, 2500] };
g.push(`[1:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${DUR},atrim=0:${DUR},highpass=f=28,volume=${NOMUSIC ? -120 : C.musicDb}dB,bass=g=${eq.lowShelf[0]}:f=${eq.lowShelf[1]}:w=0.7,equalizer=f=${eq.dip[1]}:width_type=o:w=1.4:g=${eq.dip[0]}[mus]`);
// effects: one input per file, asplit per cue (a long command line breaks on Windows: the graph goes in a file)
const groups = new Map();
for (const e of EV) (groups.get(e.f) ?? groups.set(e.f, []).get(e.f)).push(e);
const parts = [];
let n = 2, h = 0;
for (const [f, evs] of groups) {
  const i = n++;
  inputs.push("-i", f);
  const head = `[${i}:a]aresample=48000,aformat=channel_layouts=stereo`;
  const br = evs.map((e) => { const d = Math.max(0, Math.round((e.at - e.off) * 1000)); return `volume=${(20 * Math.log10(e.g)).toFixed(2)}dB,adelay=${d}|${d}`; });
  if (br.length === 1) { g.push(`${head},${br[0]}[h${h}]`); parts.push(`[h${h++}]`); continue; }
  g.push(`${head},asplit=${br.length}${br.map((_, k) => `[s${i}_${k}]`).join("")}`);
  br.forEach((b, k) => { g.push(`[s${i}_${k}]${b}[h${h}]`); parts.push(`[h${h++}]`); });
}
if (parts.length) {
  g.push(`${parts.join("")}amix=inputs=${parts.length}:normalize=0:duration=longest,apad=whole_dur=${DUR},atrim=0:${DUR},volume=${C.sfxDb ?? -13}dB[sx0]`);
  g.push(`[sx0][vk]sidechaincompress=threshold=0.05:ratio=2:attack=8:release=250:makeup=1[sfx]`);
} else {
  g.push(`anullsrc=r=48000:cl=stereo,atrim=0:${DUR}[sfx]`, "[vk]anullsink");
}
g.push(...(STEMS ? ["[vo]asplit=2[vo1][vo2]", "[mus]asplit=2[mu1][mu2]", "[sfx]asplit=2[sf1][sf2]", "[vo1][mu1][sf1]amix=inputs=3:normalize=0[mix]"] : ["[vo][mus][sfx]amix=inputs=3:normalize=0[mix]"]));
const out = P(C.out).replace(/\.wav$/i, NOMUSIC ? "-nomusic.wav" : ".wav");
const tmp = out.replace(/\.wav$/i, "");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(`${tmp}.graph.txt`, g.join(";\n"));
const a = ["-v", "error", "-y", ...inputs, "-/filter_complex", `${tmp}.graph.txt`, "-map", "[mix]", "-ar", "48000", "-c:a", "pcm_s16le", `${tmp}.raw.wav`];
if (STEMS) a.push("-map", "[vo2]", `${tmp}.st-voice.wav`, "-map", "[mu2]", `${tmp}.st-music.wav`, "-map", "[sf2]", `${tmp}.st-sfx.wav`);
execFileSync("ffmpeg", a, { stdio: "inherit" });
const I0 = lufs(`${tmp}.raw.wav`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${tmp}.raw.wav`, "-af", `volume=${(-14 - I0).toFixed(2)}dB,alimiter=limit=0.89:attack=4:release=60:level=false`, "-ar", "48000", "-c:a", "pcm_s16le", out]);
fs.rmSync(`${tmp}.raw.wav`);
fs.rmSync(`${tmp}.graph.txt`);
console.log(`${EV.length} cues · ${groups.size} files · voice ${VOICE_DB.toFixed(2)} dB · music ${NOMUSIC ? "off" : C.musicDb + " dB"} → ${out}: ${lufs(out)} LUFS`);
if (STEMS) for (const s of ["voice", "music", "sfx"]) console.log(`  stem ${s}: ${lufs(`${tmp}.st-${s}.wav`)} LUFS  (${tmp}.st-${s}.wav)`);
