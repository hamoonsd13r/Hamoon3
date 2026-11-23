// Painted Story · the sound plan → a tools/doc-mix.mjs plan + knocks.json.
// For every effect the plan uses: picks the best generated take (drops near-silent ones — always measure), levels it
// (active RMS −20 dBFS, ambience beds −26, peak ≤ −1 dBFS), trims its lead silence and measures its onset/peak so the
// hit lands exactly on its cue (a word of the narration). Knock-motif events also write knocks.json: the film jolts
// and darkens on every single hit.
//
//   node build-audio.mjs <events.json> <vo.json> <outDir> [--knocks src/vNN/knocks.json]
//   then: node tools/doc-mix.mjs <outDir>/audio.json <outDir>/mix.wav --stems   (→ mix-norm.wav, −14 LUFS)
//         node .../pipeline/margin.mjs <outDir>/mix-o1.wav <outDir>/mix-o2.wav <outDir>/mix-o3.wav <vo.json>
//
// events.json (see events.example.json):
//   vo: the dialogue (vo.wav, or vo-fx.wav after vo-fx.mjs) · raw: folder of takes <id>-1.mp3, <id>-2.mp3 (eleven-sfx)
//   motifDir: knock-motif.mjs output · sfx: [[id, cue, volume, "on"|"pk"]] ("on" = the sound's start lands on the cue,
//   "pk" = its loudest moment does) · beds: [[id, start, end, volume]] · music: [[file, start, fadeIn, end, fadeOut]]
//   mix: doc-mix settings (musicBase/musicLift or musicKeys, sfxGain, duck, musicEq)
//   cues: a number (s) · "S:n" line start · "E:n" line end · "W:n:word[:k]" a word (k = 0-based occurrence) · "end", ± s
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const [EVF, VOJ, OUT] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--knocks");
if (!EVF || !VOJ || !OUT) throw new Error("usage: node build-audio.mjs <events.json> <vo.json> <outDir> [--knocks src/vNN/knocks.json]");
const ki = args.indexOf("--knocks");
const KNOCKS_OUT = ki >= 0 ? args[ki + 1] : null;
const EV = JSON.parse(fs.readFileSync(EVF, "utf8"));
const VO = JSON.parse(fs.readFileSync(VOJ, "utf8"));
const N = path.join(OUT, "sfx-n");
fs.mkdirSync(N, { recursive: true });

// ── analysis: 8 kHz mono envelope, 10 ms frames
const env = (f) => {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const n = buf.length / 2, fr = 80, out = [];
  for (let i = 0; i + fr <= n; i += fr) {
    let s = 0;
    for (let j = 0; j < fr; j++) { const v = buf.readInt16LE((i + j) * 2) / 32768; s += v * v; }
    out.push(Math.sqrt(s / fr));
  }
  return out;
};
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
const analyse = (f) => {
  const e = env(f);
  let pk = 0, pi = 0;
  e.forEach((v, i) => { if (v > pk) { pk = v; pi = i; } });
  const on = Math.max(0, e.findIndex((v) => v > pk * Math.pow(10, -30 / 20)));
  const act = e.filter((v) => v > pk * Math.pow(10, -40 / 20));
  const rms = Math.sqrt(act.reduce((s, v) => s + v * v, 0) / Math.max(1, act.length));
  return { pkDb: db(pk), pkT: pi / 100, onT: on / 100, rmsDb: db(rms) };
};

// ── the knock motif (knock-motif.mjs): one levelled file per variant, hits at known offsets
const motif = EV.motifDir && fs.existsSync(path.join(EV.motifDir, "motif.json")) ? JSON.parse(fs.readFileSync(path.join(EV.motifDir, "motif.json"), "utf8")) : {};
const BEDS = new Set((EV.beds ?? []).map((b) => b[0]));
const used = new Set([...(EV.sfx ?? []).map((s) => s[0]), ...(EV.beds ?? []).map((b) => b[0])]);
const INFO = {};
for (const id of used) {
  if (motif[id]) {
    const src = path.join(EV.motifDir, `${id}.wav`);
    const a = analyse(src);
    const out = path.join(N, `${id}.wav`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", `volume=${Math.min(-18 - a.rmsDb, -1 - a.pkDb).toFixed(2)}dB`, "-ar", "48000", "-ac", "2", out]);
    INFO[id] = { file: out, pk: a.pkT, on: a.onT, hits: motif[id] };
    continue;
  }
  const takes = [1, 2, 3].map((k) => path.join(EV.raw ?? "", `${id}-${k}.mp3`)).filter((f) => fs.existsSync(f));
  if (!takes.length) { console.log("MISSING effect", id); continue; }
  const an = takes.map((f) => ({ f, ...analyse(f) })).filter((a) => a.pkDb > (BEDS.has(id) ? -55 : -32));
  if (!an.length) { console.log("SILENT effect (every take near-silent — regenerate or use a library sound):", id); continue; }
  const best = an.sort((a, b) => b.rmsDb - a.rmsDb)[0];
  const gain = Math.min((BEDS.has(id) ? -26 : -20) - best.rmsDb, -1 - best.pkDb);
  const lead = BEDS.has(id) ? 0 : Math.max(0, best.onT - 0.02);
  const out = path.join(N, `${id}.wav`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", lead.toFixed(3), "-i", best.f, "-af", `volume=${gain.toFixed(2)}dB`, "-ar", "48000", "-ac", "2", out]);
  INFO[id] = { file: out, pk: Math.max(0, best.pkT - lead), on: Math.max(0, best.onT - lead), take: path.basename(best.f) };
}

// ── cue strings → seconds (same grammar as tools/doc-mix.mjs)
const clean = (w) => w.replace(/[‌ً-ْٰ«»"'،؛,.!?؟:\s]/g, "").toLowerCase();
const T = (c) => {
  if (typeof c === "number") return c;
  const m = /^([^+−-]+)(?:([+−-])([\d.]+))?$/.exec(String(c).trim());
  if (!m) throw new Error(`bad cue ${c}`);
  const key = m[1];
  let base = 0;
  if (key === "end") base = VO.total;
  else if (/^[\d.]+$/.test(key)) base = +key;
  else if (key.startsWith("S:")) base = VO.segs.find((s) => s.n === +key.slice(2)).start;
  else if (key.startsWith("E:")) base = VO.segs.find((s) => s.n === +key.slice(2)).end;
  else if (key.startsWith("W:")) {
    const [, n, word, k] = key.split(":");
    const ws = VO.words.filter((w) => w.line === +n);
    let hits = ws.filter((w) => clean(w.w) === clean(word));
    if (!hits.length) hits = ws.filter((w) => clean(w.w).startsWith(clean(word)));
    if (!hits[+(k ?? 0)]) throw new Error(`no word ${word} in line ${n}`);
    base = hits[+(k ?? 0)].s;
  }
  return base + (m[2] ? (m[2] === "+" ? 1 : -1) * +m[3] : 0);
};

const sfx = [], knocks = [];
for (const [id, cue, vol, align] of EV.sfx ?? []) {
  const I = INFO[id];
  if (!I) continue;
  const off = align === "pk" ? I.pk : I.on;
  sfx.push([I.file, cue, vol, +off.toFixed(3)]);
  if (I.hits) for (const h of I.hits) knocks.push(+(T(cue) + h).toFixed(3));
}
const beds = (EV.beds ?? []).filter((b) => INFO[b[0]]).map(([id, s, e, vol]) => [INFO[id].file, s, e, vol]);
const plan = { vo: EV.vo, voJson: VOJ, music: EV.music ?? [], sfx, beds, ...(EV.mix ?? {}) };
fs.writeFileSync(path.join(OUT, "audio.json"), JSON.stringify(plan, null, 1));
if (KNOCKS_OUT) fs.writeFileSync(KNOCKS_OUT, JSON.stringify(knocks.sort((a, b) => a - b)));
console.log(`${Object.keys(INFO).length} effects levelled · ${sfx.length} events · ${beds.length} beds · ${plan.music.length} music cues · ${knocks.length} knock hits → ${path.join(OUT, "audio.json")}`);
