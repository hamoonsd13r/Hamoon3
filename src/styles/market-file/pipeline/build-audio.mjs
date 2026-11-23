// Market File · the reel mix (Node + ffmpeg, no npm): your narration on top, a CC0/licensed music bed automated in JS,
// the effects on the visual hits. The rules that made the reels sound right:
//   · voice → −20 LUFS, untouched apart from a 60 Hz high-pass and one fixed gain
//   · music → −25 LUFS before automation, then: a low-pass under the hook that opens into the first drop; −6 dB under
//     every sentence; +3 dB in pauses ≥ 0.4 s; +3.5 dB bumps on the drops / the accent flood; −4 dB on a break; a full
//     STOP under the «key point» line; per-word dips so every word sits ≥ `target` dB over the bed; a fade after the voice
//   · effects: each file levelled to −20 dBFS RMS, then `sfxDb` (≈ −6) + its own db; the whole bus ducks under the voice
//   · final −14 LUFS, true peak ≤ −1 (limiter); stems to check: voice ≈ −20, music ≈ −32, effects ≈ −40 LUFS
// Usage: node src/styles/market-file/pipeline/build-audio.mjs <audio.json> [--stems] [--nomusic]
//   writes <out>/mix.wav (and <out>/mix-nomusic.wav with --nomusic: the same mix without the song, for Instagram)
// audio.json: see audio.example.json next to this file.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { loadWords } from "../../../../tools/lib/words.mjs";

const args = process.argv.slice(2);
const cfgPath = args.find((a) => !a.startsWith("--"));
if (!cfgPath) { console.log("usage: node src/styles/market-file/pipeline/build-audio.mjs <audio.json> [--stems] [--nomusic]"); process.exit(1); }
const A = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const STEMS = args.includes("--stems"), NOMUSIC = args.includes("--nomusic");
const OUT = A.out ?? "out/mix";
fs.mkdirSync(OUT, { recursive: true });
const SR = 48000;
const W = loadWords(A.words);
const DUR = A.length ?? Math.max(...W.map((w) => w.e)) + 2.9;
const VOICE_END = Math.max(...W.map((w) => w.e));
const M = { start: 0, lufs: -25, sentenceDip: -6, pauseLift: 3, target: 13.5, maxDip: 18, fadeAfter: 0.8, bumps: [], breaks: [], stops: [], ...(A.music ?? {}) };
const cl01 = (x) => Math.min(1, Math.max(0, x));

const lufs = (f, extra = []) => {
  const m = spawnSync("ffmpeg", ["-hide_banner", "-i", f, ...extra, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = m.match(/I:\s+(-?[\d.]+) LUFS/g), P = m.match(/Peak:\s+(-?[\d.]+) dBFS/g);
  return { I: I ? parseFloat(I.pop().match(/-?[\d.]+/)[0]) : -70, tp: P ? parseFloat(P.pop().match(/-?[\d.]+/)[0]) : -70 };
};
const decode = (f, ch, pre = [], af) => {
  const b = execFileSync("ffmpeg", ["-v", "error", ...pre, "-i", f, ...(af ? ["-af", af] : []), "-ac", String(ch), "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const rmsDb = (x, ch, a, b) => {
  let s = 0, n = 0;
  for (let i = Math.max(0, Math.floor(a * SR)); i < Math.min(x.length / ch, Math.floor(b * SR)); i++) for (let c = 0; c < ch; c++) { const v = x[i * ch + c]; s += v * v; n++; }
  return 10 * Math.log10(s / Math.max(1, n) + 1e-12);
};

// ── voice ──
const vG = -20 - lufs(A.voice).I;
const voi = decode(A.voice, 1, [], "highpass=f=60");

// ── music: automation in JS ──
let MUSIC_AUTO = null;
if (A.music?.file) {
  const mG = M.lufs - lufs(A.music.file, ["-ss", String(M.start), "-t", String(DUR)]).I;
  const mus = decode(A.music.file, 2, ["-ss", String(M.start), "-t", String(DUR)]);
  // 1 · the hook in a low-pass (two one-pole stages), opening over 0.1 s into the first drop
  if (M.lowpassUntil) {
    const D1 = M.lowpassUntil, st = [0, 0, 0, 0];
    for (let i = 0; i < mus.length / 2; i++) {
      const t = i / SR;
      const fc = t >= D1 + 0.02 ? 20000 : t < D1 - 0.08 ? 800 : Math.exp(Math.log(800) + (Math.log(20000) - Math.log(800)) * cl01((t - (D1 - 0.08)) / 0.1));
      if (fc >= 19999) { st[0] = st[1] = mus[2 * i]; st[2] = st[3] = mus[2 * i + 1]; continue; }
      const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
      for (let c = 0; c < 2; c++) {
        const x = mus[2 * i + c];
        st[2 * c] += a * (x - st[2 * c]);
        st[2 * c + 1] += a * (st[2 * c] - st[2 * c + 1]);
        mus[2 * i + c] = st[2 * c + 1] * 1.3; // make-up so the dark stretch doesn't sag
      }
    }
  }
  // 2 · gain automation
  const sis = [...new Set(W.map((w) => w.si))].filter((x) => x !== undefined);
  const SENTS = sis.length ? sis.map((si) => { const ws = W.filter((w) => w.si === si); return [ws[0].s, ws[ws.length - 1].e]; }) : [[W[0].s, VOICE_END]];
  const PAUSES = [];
  for (let i = 0; i + 1 < W.length; i++) if (W[i + 1].s - W[i].e >= 0.4) PAUSES.push([W[i].e + 0.05, W[i + 1].s - 0.05]);
  const baseDb = (t) => {
    let d = 0;
    for (const [s0, e0] of SENTS) { const a = s0 - 0.12, b = e0 + 0.45; d = Math.min(d, M.sentenceDip * Math.min(cl01((t - (a - 0.12)) / 0.12), cl01((b + 0.3 - t) / 0.3))); }
    return d;
  };
  const arcDb = (t) => {
    let d = 0;
    for (const [a, b] of PAUSES) d = Math.max(d, M.pauseLift * Math.min(cl01((t - a) / 0.12), cl01((b - t) / 0.12)));
    for (const b0 of M.bumps) { if (t < b0 - 0.05 || t > b0 + 1.8) continue; d = Math.max(d, 3.5 * (t < b0 + 0.6 ? cl01((t - (b0 - 0.05)) / 0.05) : 1 - (t - (b0 + 0.6)) / 1.2)); }
    for (const [a, b] of M.breaks) d -= 4 * Math.min(cl01((t - a) / 0.3), cl01((b - t) / 0.08));
    if (t >= VOICE_END + 0.05) d = Math.max(d, 4 * cl01((t - VOICE_END - 0.05) / 0.2));
    return d;
  };
  // per-word: dip just enough for the voice to sit ≥ target dB over the bed (measured on the levelled signals)
  const extra = W.map((w) => {
    const mid = (w.s + w.e) / 2;
    const vd = rmsDb(voi, 1, w.s, w.e) + vG;
    const md = rmsDb(mus, 2, w.s, w.e) + mG + baseDb(mid) + arcDb(mid);
    return [w.s, w.e, Math.max(0, Math.min(M.maxDip, M.target - (vd - md)))];
  });
  const END_A = VOICE_END + M.fadeAfter;
  const lin = (t) => {
    let db = baseDb(t) + arcDb(t), x = 0;
    for (const [s, e, dd] of extra) if (dd > 0) x = Math.max(x, dd * Math.min(cl01((t - (s - 0.14)) / 0.1), cl01((e + 0.25 - t) / 0.15)));
    let g = Math.pow(10, (db - x) / 20);
    for (const [a, b] of M.stops) g *= 1 - Math.min(cl01((t - a) / 0.04), cl01((b - t) / 0.03));
    g *= 1 - cl01((t - END_A) / Math.max(0.3, DUR - 0.15 - END_A));
    return g;
  };
  const GSTEP = 0.005, gl = [];
  for (let t = 0; t <= DUR + GSTEP; t += GSTEP) gl.push(lin(t));
  for (let i = 0; i < mus.length / 2; i++) {
    const x = i / SR / GSTEP, j = Math.min(gl.length - 2, Math.floor(x)), f = x - j;
    const g = (gl[j] * (1 - f) + gl[j + 1] * f) * Math.pow(10, mG / 20);
    mus[2 * i] *= g;
    mus[2 * i + 1] *= g;
  }
  MUSIC_AUTO = path.join(OUT, "music-auto.wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_f32le", MUSIC_AUTO], { input: Buffer.from(mus.buffer) });
}

// ── effects: level each file, align its onset or its peak to the event time ──
const info = new Map();
const sfxInfo = (f) => {
  if (info.has(f)) return info.get(f);
  const x = decode(f, 1);
  let peak = 0, pk = 0, onset = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > pk) { pk = v; peak = i / SR; } }
  const thr = pk * 0.1;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > thr) { onset = i / SR; break; }
  // RMS of the active part (above −40 dB of the peak)
  let s = 0, n = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.01) { s += x[i] * x[i]; n++; }
  const r = { peak, onset, rmsDb: 10 * Math.log10(s / Math.max(1, n) + 1e-12) };
  info.set(f, r);
  return r;
};
const E = A.sfx ?? [];
const SFX_DB = A.sfxDb ?? -6;

const mixOnce = (withMusic, outFile, stems) => {
  const inputs = ["-i", A.voice];
  const music = withMusic && MUSIC_AUTO;
  if (music) inputs.push("-i", MUSIC_AUTO);
  const base = music ? 2 : 1;
  const parts = [];
  E.forEach((e, i) => {
    const x = sfxInfo(e.file);
    const off = e.align === "peak" ? x.peak : x.onset;
    const g = -20 - x.rmsDb + (e.db ?? 0) + SFX_DB;
    const start = e.t - off, head = start < 0 ? -start : 0, d = Math.max(0, Math.round(start * 1000));
    const trim = [head > 0 ? `atrim=start=${head.toFixed(3)}` : "", e.len > 0 ? `atrim=end=${(head + e.len).toFixed(3)},afade=t=out:st=${(head + e.len - 0.12).toFixed(3)}:d=0.12` : ""].filter(Boolean).join(",");
    inputs.push("-i", e.file);
    parts.push(`[${i + base}:a]aformat=sample_rates=48000:channel_layouts=stereo,${trim ? trim + ",asetpts=PTS-STARTPTS," : ""}volume=${g.toFixed(1)}dB,adelay=${d}|${d}[s${i}]`);
  });
  const hasFx = E.length > 0;
  const g = [
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=60,volume=${vG.toFixed(2)}dB,apad=whole_dur=${DUR}[v]`,
    `[v]asplit=3[vm][vk][vs]`,
    ...(music ? [`[1:a]aformat=sample_rates=48000:channel_layouts=stereo,equalizer=f=2600:t=q:w=1.2:g=-3,afade=t=in:d=0.03,apad=whole_dur=${DUR}[mu]`, `[mu][vk]sidechaincompress=threshold=0.06:ratio=1.5:attack=30:release=600:makeup=1[md]`] : [`[vk]anullsink`]),
    ...parts,
    ...(hasFx ? [`${E.map((_, i) => `[s${i}]`).join("")}amix=inputs=${E.length}:normalize=0,apad=whole_dur=${DUR}[fx0]`, `[fx0][vs]sidechaincompress=threshold=0.04:ratio=2.5:attack=10:release=250:makeup=1[fx]`] : [`[vs]anullsink`]),
    ...(music ? [`[md]asplit=2[md1][md2]`] : []),
    ...(hasFx ? [`[fx]asplit=2[fx1][fx2]`] : []),
    `[vm]asplit=2[vm1][vm2]`,
    `[vm1]${music ? "[md1]" : ""}${hasFx ? "[fx1]" : ""}amix=inputs=${1 + (music ? 1 : 0) + (hasFx ? 1 : 0)}:normalize=0,atrim=0:${DUR}[mix]`,
  ];
  const graph = path.join(OUT, "graph.txt");
  fs.writeFileSync(graph, g.join(";\n"));
  const raw = path.join(OUT, "mix-raw.wav");
  const maps = ["-map", "[mix]", "-ar", "48000", raw, "-map", "[vm2]", "-ar", "48000", path.join(OUT, "stem-voice.wav")];
  if (music) maps.push("-map", "[md2]", "-ar", "48000", path.join(OUT, "stem-music.wav"));
  if (hasFx) maps.push("-map", "[fx2]", "-ar", "48000", path.join(OUT, "stem-fx.wav"));
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-/filter_complex", graph, ...maps]);
  let gain = -14 - lufs(raw).I, res;
  for (let pass = 0; pass < 3; pass++) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.79:attack=5:release=50:level=false`, "-ar", "48000", outFile]);
    res = lufs(outFile);
    if (Math.abs(res.I + 14) <= 0.1) break;
    gain += -14 - res.I;
  }
  const st = (n) => (fs.existsSync(path.join(OUT, `stem-${n}.wav`)) ? lufs(path.join(OUT, `stem-${n}.wav`)).I : "–");
  console.log(`${path.basename(outFile)}: ${res.I} LUFS, TP ${res.tp} | DUR ${DUR.toFixed(2)} s, ${E.length} effects` + (stems ? ` | stems voice ${st("voice")}, music ${st("music")}, fx ${st("fx")}` : ""));
  fs.rmSync(raw, { force: true });
};

mixOnce(true, path.join(OUT, "mix.wav"), STEMS);
if (NOMUSIC && MUSIC_AUTO) mixOnce(false, path.join(OUT, "mix-nomusic.wav"), false);
