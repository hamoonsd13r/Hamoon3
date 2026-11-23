// Automatic framing QA: samples the film every N seconds through its Look composition with {"qa":"only"} (the world is
// built and checked, nothing is drawn, so it is fast), reads the QA lines the kit prints (lib/kit/film.tsx qaCheck), groups
// the problems into runs per shot and writes a report + a sheet of the worst moment of each problem, boxes drawn on it.
// Usage: node src/styles/toon3d/pipeline/qa.mjs <id> <Comp> [--every 0.25] [--from 0] [--to <end>] [--draw] [--limit 30] [--rebundle]
// Out:   videos/<id>/qa/report.md, qa.json, flagged.jpg (+ the raw log in qa/run/log.txt)
// What it flags (per head on screen; heads wholly out of frame are ignored):
//   caption  a face under the caption while one shows (head taller than 2 % of the frame)      -> fix the framing
//   cut      a head partly out of frame: < 60 % visible and smaller than 30 % of the frame     -> check (half a face at the edge)
//            (bigger heads cut by the edge are close-up crops: listed as info)
//   hidden   solid geometry (ship, room, prop) between the lens and the face                     -> check
//   low/high a face under Instagram's bottom 20 % / top 8 % UI                                    -> check
//   cam:*    camera problems the world reports (e.g. underwater, inside a hull)                   -> fix
import fs from "node:fs";
import { parseArgs, die, film, bundle, compositions, lookStills, sheet, ff, lookOf } from "./lib.mjs";

const a = parseArgs();
const [slug, comp] = a._;
if (!slug || !comp) die("usage: node src/styles/toon3d/pipeline/qa.mjs <id> <Comp> [--every 0.25] [--from 0] [--to end] [--draw] [--limit 30]");
const every = Number(a.every ?? 0.25), limit = Number(a.limit ?? 30);
const dir = `${film(slug)}/qa`;
fs.mkdirSync(dir + "/run", { recursive: true });
const b = bundle({ force: !!a.rebundle });
const info = compositions(b)[comp];
if (!info) die(`no composition ${comp} in the bundle`);
const end = Number(a.to ?? (info.frames - 1) / info.fps), from = Number(a.from ?? 0);
const times = [];
for (let t = from; t <= end + 1e-9; t += every) times.push(Math.round(t * 1000) / 1000);
console.log(`QA: ${times.length} samples, every ${every}s, ${from}-${end.toFixed(2)}s ...`);
const { out } = lookStills(b, lookOf(comp), dir + "/run", { times, qa: a.draw ? true : "only" }, { scale: 0.25, concurrency: 3, log: true });
fs.writeFileSync(dir + "/run/log.txt", out);

// ---- parse: QA|frame|t|captionOn|shot|label:state:vis:x:y:size ... cam:flag ----
const byFrame = new Map();
for (const raw of out.split("\n")) {
  const line = raw.replace(/\x1b\[[0-9;]*m/g, "");
  const m = line.match(/QA\|(\d+)\|([\d.]+)\|([01])\|(\d+)\|(.*)$/);
  if (!m) continue;
  const heads = [], cams = [];
  for (const tok of m[5].trim().split(/\s+/).filter(Boolean)) {
    const p = tok.split(":");
    if (p[0] === "cam") { cams.push(p.slice(1).join(":")); continue; }
    heads.push({ label: p[0], state: p[1], vis: +p[2], x: +p[3], y: +p[4], size: +p[5] });
  }
  byFrame.set(+m[1], { f: +m[1], t: +m[2], cap: m[3] === "1", shot: +m[4], heads, cams });
}
const S = [...byFrame.values()].sort((p, q) => p.f - q.f);
if (!S.length) die("no QA lines found (is the film on lib/kit/film.tsx? see qa/run/log.txt)");

const sev = (h) => h.state === "caption" ? (h.size >= 0.04 ? "fix" : "check") : h.state === "cut" ? (h.size >= 0.3 ? "info" : h.vis < 60 ? "check" : "info")
  : h.state === "hidden" ? (h.size > 0.02 ? "check" : "info") : h.state === "low" || h.state === "high" ? "check" : "ok";
// ---- runs: the same (shot, who, problem) on consecutive samples ----
const runs = [];
const open = new Map();
for (const s of S) {
  const seen = new Set();
  const items = [...s.heads.filter((h) => h.state !== "ok").map((h) => ({ key: `${s.shot}|${h.label}|${h.state}`, who: h.label, what: h.state, sev: sev(h), h })),
    ...s.cams.map((c) => ({ key: `${s.shot}|cam|${c}`, who: "camera", what: c, sev: "fix", h: null }))];
  for (const it of items) {
    seen.add(it.key);
    let r = open.get(it.key);
    if (!r || s.t - r.t1 > every * 1.6) { r = { shot: s.shot, who: it.who, what: it.what, sev: it.sev, t0: s.t, t1: s.t, n: 0, worst: null }; runs.push(r); open.set(it.key, r); }
    r.t1 = s.t; r.n++;
    if (it.sev === "fix" || (it.sev === "check" && r.sev !== "fix")) r.sev = it.sev;
    const score = it.h ? (it.what === "cut" ? 100 - it.h.vis : it.h.size) : 1;
    if (!r.worst || score > r.worst.score) r.worst = { t: s.t, f: s.f, score, h: it.h };
  }
  for (const k of [...open.keys()]) if (!seen.has(k) && s.t - open.get(k).t1 > every * 1.6) open.delete(k);
}
runs.sort((p, q) => p.t0 - q.t0);
fs.writeFileSync(dir + "/qa.json", JSON.stringify({ every, from, end, samples: S, runs }, null, 1));

// ---- report ----
const n = (v) => runs.filter((r) => r.sev === v).length;
const desc = (r) => r.who === "camera" ? `camera ${r.what}` : `${r.who} ${r.what}` + (r.worst?.h ? ` (vis ${r.worst.h.vis}%, head ${Math.round(r.worst.h.size * 100)}% of frame, at ${r.worst.h.x.toFixed(2)},${r.worst.h.y.toFixed(2)})` : "");
const L = [`# QA ${slug} (${comp})`, "", `${S.length} samples every ${every}s from ${from} to ${end.toFixed(2)}s.`,
  `**fix: ${n("fix")}   check: ${n("check")}   info: ${n("info")}**`, "",
  "| sev | time (s) | shot | problem |", "|---|---|---|---|",
  ...runs.filter((r) => r.sev !== "info").map((r) => `| ${r.sev} | ${r.t0.toFixed(2)}-${r.t1.toFixed(2)} | ${r.shot} | ${desc(r)} |`), "",
  "<details><summary>info (close-up crops, slight edge touches, tiny far heads)</summary>", "",
  ...runs.filter((r) => r.sev === "info").map((r) => `- ${r.t0.toFixed(2)}-${r.t1.toFixed(2)} shot ${r.shot}: ${desc(r)}`), "", "</details>"];
fs.writeFileSync(dir + "/report.md", L.join("\n"));
console.log(L.slice(0, 4).join("\n"));
for (const r of runs.filter((r) => r.sev !== "info")) console.log(`  ${r.sev.padEnd(5)} ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}  shot ${r.shot}  ${desc(r)}`);

// ---- the worst moment of each fix/check run, drawn, boxed and tiled ----
const pick = runs.filter((r) => r.sev !== "info").slice(0, limit);
if (pick.length) {
  const { files } = lookStills(b, lookOf(comp), dir + "/flag", { times: pick.map((r) => r.worst.t) }, { scale: 0.4, concurrency: 2 });
  const W = 1080 * 0.4, H = 1920 * 0.4;
  const boxed = files.map((img, i) => {
    const h = pick[i].worst.h, o = img.replace(/(\.\w+)$/, "-box.jpg");
    if (!h) { ff(["-i", img, o]); return o; }
    const r = Math.max(6, (h.size / 2) * H), cx = h.x * W, cy = h.y * H, col = pick[i].sev === "fix" ? "red" : "yellow";
    ff(["-i", img, "-vf", `drawbox=x=${Math.round(cx - r)}:y=${Math.round(cy - r)}:w=${Math.round(2 * r)}:h=${Math.round(2 * r)}:color=${col}@0.9:t=3`, o]);
    return o;
  });
  console.log(sheet(boxed, pick.map((r) => `${r.sev} t=${r.worst.t.toFixed(2)} s${r.shot} ${r.who} ${r.what}`), dir + "/flagged.jpg", { cols: 6 }));
}
console.log(dir + "/report.md");
