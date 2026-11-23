// Shorten the pauses of a narration WITHOUT touching any word: only the pauses between sentences (to --sent, default
// 0.14 s) and after commas (to --comma, default 0.18 s). Only the part of a gap that is real silence (< --floor dB,
// from silencedetect) is removed, with a safety margin next to both words, so soft tails and onsets (س، ش، ه) and
// breaths stay. Cuts get 6 ms fades. Pauses between words inside a sentence are never touched (lesson: «مکث‌های بین
// جمله‌ها، نه بین کلمات»).
// Writes <out.wav>, <out>.words.json (the same words with shifted times — use it instead of the old file) and
// <out>.map.json (kept segments).
// Usage: node tools/vo-tighten.mjs <voice.(wav|mp3)> <words.json> <out.wav> [--sent 0.14] [--comma 0.18] [--floor -40]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { loadWords, pauseKind } from "./lib/words.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const [inp, wordsPath, out] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!inp || !wordsPath || !out) { console.log("usage: node tools/vo-tighten.mjs <voice> <words.json> <out.wav> [--sent 0.14] [--comma 0.18] [--floor -40]"); process.exit(1); }
const SENT = opt("sent", 0.14), COMMA = opt("comma", 0.18), FLOOR = opt("floor", -40), KEEP_TAIL = 0.045, KEEP_HEAD = 0.035;

const words = loadWords(wordsPath);
const log = spawnSync("ffmpeg", ["-hide_banner", "-i", inp, "-af", `silencedetect=n=${FLOOR}dB:d=0.05`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const sil = [];
let s0 = null;
for (const m of log.matchAll(/silence_(start|end): ([0-9.]+)/g)) {
  if (m[1] === "start") s0 = +m[2];
  else if (s0 !== null) { sil.push([s0, +m[2]]); s0 = null; }
}
const dur = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", inp], { encoding: "utf8" }).stdout.trim();

const cuts = [];
for (let i = 0; i + 1 < words.length; i++) {
  const kind = pauseKind(words, i);
  if (kind === "word") continue;
  const target = kind === "sent" ? SENT : COMMA;
  const e = words[i].e, s = words[i + 1].s;
  if (s - e <= target + 0.03) continue;
  // the longest silent stretch inside this gap
  const ov = sil.map(([a, b]) => [Math.max(a, e - 0.03), Math.min(b, s + 0.03)]).filter(([a, b]) => b - a > 0.04).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0];
  if (!ov) continue;
  const lo = Math.max(ov[0], e) + KEEP_TAIL, hi = Math.min(ov[1], s) - KEEP_HEAD;
  const r = Math.min(s - e - target, hi - lo);
  if (r < 0.03) continue;
  const c0 = lo + (hi - lo - r) / 2;
  cuts.push([+c0.toFixed(4), +(c0 + r).toFixed(4), words[i].w, words[i + 1].w]);
}
const keep = [];
let p = 0;
for (const [a, b] of cuts) { keep.push([p, a]); p = b; }
keep.push([p, dur]);
const graph = keep.map(([a, b], i) => `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,afade=t=out:st=${Math.max(0, b - a - 0.006).toFixed(4)}:d=0.006[k${i}]`);
graph.push(`${keep.map((_, i) => `[k${i}]`).join("")}concat=n=${keep.length}:v=0:a=1[o]`);
fs.writeFileSync(out + ".graph.txt", graph.join(";\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", inp, "-/filter_complex", out + ".graph.txt", "-map", "[o]", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", out], { stdio: "inherit" });
fs.rmSync(out + ".graph.txt");
// shift every word by the silence removed before it
const shift = (t) => cuts.reduce((x, [a, b]) => x + (b <= t ? b - a : a < t ? t - a : 0), 0);
const moved = words.map((w) => ({ ...w, s: +(w.s - shift(w.s)).toFixed(3), e: +(w.e - shift(w.e)).toFixed(3) }));
fs.writeFileSync(out.replace(/\.wav$/i, "") + ".words.json", JSON.stringify(moved));
fs.writeFileSync(out.replace(/\.wav$/i, "") + ".map.json", JSON.stringify({ keep, cuts }, null, 1));
const removed = cuts.reduce((x, [a, b]) => x + (b - a), 0);
console.log(`cuts ${cuts.length} · removed ${removed.toFixed(2)} s · ${dur.toFixed(2)} → ${(dur - removed).toFixed(2)} s`);
for (const c of cuts.slice(0, 40)) console.log(`  ${c[0].toFixed(2)}–${c[1].toFixed(2)} (${(c[1] - c[0]).toFixed(2)}) ${c[2]} | ${c[3]}`);
