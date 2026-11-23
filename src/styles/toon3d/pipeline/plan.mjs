// The plan check: the whole film read from its story alone, before any still or render (the kit's {"plan":true} pass:
// no world is built, so it takes seconds and costs no images). Idea taken from the storyboard engines that check a
// plan before rendering it; here it reads our own shot list and cameras.
// Usage: node src/styles/toon3d/pipeline/plan.mjs <id> <Comp> [--mids] [--shots 3,8,12] [--scale 0.35] [--rebundle]
// Out:   videos/<id>/plan/plan.md   shot table + warnings (read this, not the stills, to check the timeline)
//        videos/<id>/plan/plan.json shots, camera speed per frame, fast moves ("whips"), static holds, jumps, captions and
//                              spec.cues (the story's named times) -> build-audio.cjs reads it (pipeline/plancues.cjs)
//        --mids: one still from the middle of every shot (or of --shots) -> videos/<id>/plan/mids/sheet.jpg
// Camera speed is the picture's motion in degrees per frame: turn + sideways travel / distance to the look point +
// push travel x half the fov + zoom + roll. Thresholds: whip >= 2.5 deg/frame, static < 0.02 for 0.4 s, jump = one
// frame 4x faster than its neighbours.
import fs from "node:fs";
import { parseArgs, die, film, bundle, compositions, lookStills, sheet, lookOf } from "./lib.mjs";

const a = parseArgs();
const [slug, comp] = a._;
if (!slug || !comp) die("usage: node src/styles/toon3d/pipeline/plan.mjs <id> <Comp> [--mids] [--shots 3,8] [--scale 0.35] [--rebundle]");
const dir = `${film(slug)}/plan`;
fs.mkdirSync(dir + "/run", { recursive: true });
const b = bundle({ force: !!a.rebundle });
if (!compositions(b)[comp]) die(`no composition ${comp} in the bundle`);
const { out } = lookStills(b, lookOf(comp), dir + "/run", { times: [0], plan: true }, { scale: 0.1, concurrency: 1, log: true });
fs.writeFileSync(dir + "/run/log.txt", out);

// ---------------- parse ----------------
const rows = [];
let cues = {};
for (const raw of out.split("\n")) {
  const line = raw.replace(/\x1b\[[0-9;]*m/g, "");
  const c = line.indexOf("PLANCUES|");
  if (c >= 0) { try { cues = JSON.parse(line.slice(c + 9).trim()); } catch { /* keep {} */ } continue; }
  const i = line.indexOf("PLAN|");
  if (i < 0) continue;
  const p = line.slice(i + 5).split("|");
  if (p.length < 10) continue;
  const v3 = (s) => (s ? s.trim().split(/\s+/).map(Number) : null);
  rows.push({ f: +p[0], id: +p[1], id2: +p[2], a2: +p[3], space: p[4], pos: v3(p[5]), look: v3(p[6]), fov: +p[7], roll: +p[8], cap: (p[9] ?? "").trim() });
}
if (!rows.length) die(`no PLAN lines (see ${dir}/run/log.txt): is the film on lib/kit/film.tsx with a rebuilt bundle? try --rebundle`);
rows.sort((p, q) => p.f - q.f);
const FPS = 30, N = rows.length;

// ---------------- camera speed (degrees of picture motion per frame) ----------------
const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const len = (u) => Math.hypot(u[0], u[1], u[2]), DEG = 180 / Math.PI;
const speed = new Array(N).fill(0), valid = new Array(N).fill(false);
for (let k = 1; k < N; k++) {
  const p = rows[k - 1], q = rows[k];
  if (!p.pos || !q.pos || p.id !== q.id || p.space !== q.space) continue;
  const d0 = sub(p.look, p.pos), d1 = sub(q.look, q.pos), l0 = len(d0) || 1e-6, l1 = len(d1) || 1e-6;
  const turn = Math.acos(Math.max(-1, Math.min(1, dot(d0, d1) / (l0 * l1)))) * DEG;
  const mv = sub(q.pos, p.pos), dir = d1.map((x) => x / l1), along = dot(mv, dir);
  const side = len(sub(mv, dir.map((x) => x * along)));
  const half = q.fov / 2;
  speed[k] = turn + (side / l1) * DEG + (Math.abs(along) / l1) * half + Math.abs(q.fov - p.fov) / 2 + Math.abs(q.roll - p.roll) * DEG * 0.5;
  valid[k] = true;
}

// ---------------- shots ----------------
const shots = [];
for (const r of rows) {
  const s = shots[shots.length - 1];
  if (!s || s.id !== r.id) shots.push({ id: r.id, f0: r.f, f1: r.f + 1, caps: [] });
  else s.f1 = r.f + 1;
  const cur = shots[shots.length - 1];
  if (r.cap && cur.caps[cur.caps.length - 1] !== r.cap) cur.caps.push(r.cap);
}
for (const s of shots) {
  s.t0 = +(s.f0 / FPS).toFixed(3); s.t1 = +(s.f1 / FPS).toFixed(3); s.len = +((s.f1 - s.f0) / FPS).toFixed(2);
  s.mid = +(((s.f0 + s.f1) / 2) / FPS).toFixed(3);
  const sp = speed.slice(s.f0 + 1, s.f1).filter((_, i) => valid[s.f0 + 1 + i]);
  s.vmax = +(sp.length ? Math.max(...sp) : 0).toFixed(2);
  s.vmean = +(sp.length ? sp.reduce((x, y) => x + y, 0) / sp.length : 0).toFixed(3);
  s.space = rows[s.f0].space;
  s.text = s.caps.join(" ");
  s.dissolve = rows.slice(Math.max(0, s.f0 - 12), s.f0 + 12).some((r) => r.id2 === s.id);
}

// ---------------- fast moves, static holds, jumps ----------------
const WHIP = Number(a.whip ?? 2.5), MOVING = 1.0, CUTV = 60, STILL = 0.02, STILL_MIN = Math.round(0.4 * FPS);
// moves: runs of frames (inside one shot) where the picture moves >= 1 deg/frame; a move whose peak passes WHIP is a
// whoosh candidate, its sound peaking on the fastest frame. A peak over 60 deg in one frame is no camera move: it is a
// cut written inside the shot (a whip pan tops out around 40).
const whips = [], innerCuts = [];
for (let k = 1; k < N; k++) {
  if (!valid[k] || speed[k] < MOVING) continue;
  let e = k;
  while (e + 1 < N && valid[e + 1] && rows[e + 1].id === rows[k].id && speed[e + 1] >= MOVING) e++;
  let pk = k;
  for (let j = k; j <= e; j++) if (speed[j] > speed[pk]) pk = j;
  if (speed[pk] > CUTV) innerCuts.push({ shot: rows[k].id, t: +(pk / FPS).toFixed(3) });
  else if (speed[pk] >= WHIP) whips.push({ shot: rows[k].id, t: +(pk / FPS).toFixed(3), v: +speed[pk].toFixed(2), a: +((k - 1) / FPS).toFixed(3), b: +((e + 1) / FPS).toFixed(3) });
  k = e;
}
const statics = [];
for (const s of shots) {
  let run = null;
  for (let k = s.f0 + 1; k <= s.f1; k++) {
    const still = k < s.f1 && valid[k] && speed[k] < STILL;
    if (still) { run ??= k; continue; }
    if (run !== null && k - run >= STILL_MIN) statics.push({ shot: s.id, a: +(run / FPS).toFixed(2), b: +(k / FPS).toFixed(2), len: +((k - run) / FPS).toFixed(2) });
    run = null;
  }
}
const jumps = [];
for (let k = 2; k < N - 1; k++) {
  if (!valid[k] || !valid[k - 1] || !valid[k + 1] || speed[k] > CUTV) continue;
  const nb = Math.max(speed[k - 1], speed[k + 1], 0.25);
  if (speed[k] > 1 && speed[k] > 4 * nb) jumps.push({ shot: rows[k].id, t: +(k / FPS).toFixed(3), v: +speed[k].toFixed(2) });
}
// captions on screen for too short to read
const cards = [];
for (let k = 0; k < N; k++) {
  const c = rows[k].cap;
  if (!c) continue;
  const last = cards[cards.length - 1];
  if (last && last.text === c && last.f1 === k) last.f1 = k + 1;
  else cards.push({ text: c, f0: k, f1: k + 1 });
}
const CAPMIN = Number(a.capmin ?? 5);
const shortCards = cards.filter((c) => c.f1 - c.f0 < CAPMIN).map((c) => ({ text: c.text, t: +(c.f0 / FPS).toFixed(2), frames: c.f1 - c.f0 }));

// ---------------- report ----------------
const total = N / FPS, asl = total / shots.length;
const warn = [];
for (const s of shots) {
  if (s.len < 0.6) warn.push(`shot ${s.id} (${s.t0}s) lasts ${s.len}s: a flash cut. Intended?`);
  if (s.len > 5.5 && s.vmax < WHIP) warn.push(`shot ${s.id} (${s.t0}-${s.t1}s) holds ${s.len}s with no fast move: cut it or give it a bigger move`);
  if (!rows[s.f0].pos) warn.push(`shot ${s.id}: its frame def has no cam (the plan cannot read it)`);
}
for (const x of statics) warn.push(`shot ${x.shot}: the camera stands still ${x.a}-${x.b}s (${x.len}s). Fine if the action carries the shot; otherwise let it creep (push 0.15-0.35 %/frame)`);
for (const j of jumps) warn.push(`shot ${j.shot}: the camera jumps at ${j.t}s (${j.v} deg in one frame). A key with dur 0, or a step in a formula?`);
for (const c of innerCuts) warn.push(`shot ${c.shot}: a cut inside the shot at ${c.t}s (info: fine if intended; its own shot() keeps plan and QA clearer)`);
if (shortCards.length) warn.push(`${shortCards.length} caption cards show for under ${CAPMIN} frames: ` + shortCards.slice(0, 8).map((c) => `"${c.text}" ${c.t}s`).join(", ") + (shortCards.length > 8 ? " ..." : ""));

const md = [
  `# Plan: ${slug} (${comp})`,
  "",
  `${shots.length} shots, ${total.toFixed(1)} s, average shot ${asl.toFixed(2)} s, ${shots.filter((s) => s.dissolve).length} dissolves, ${whips.length} fast moves, ${warn.length} warnings.`,
  "",
  "| # | start | end | len | place | max move (deg/f) | captions |",
  "|---|---|---|---|---|---|---|",
  ...shots.map((s) => `| ${s.id}${s.dissolve ? " ~" : ""} | ${s.t0.toFixed(2)} | ${s.t1.toFixed(2)} | ${s.len.toFixed(2)} | ${s.space} | ${s.vmax}${s.vmax >= WHIP ? " fast" : s.vmean < STILL ? " still" : ""} | ${s.text.slice(0, 70)} |`),
  "",
  "## Fast moves (whoosh candidates: the sound peaks on `t`)",
  ...(whips.length ? whips.map((w) => `- ${w.t}s, shot ${w.shot}: ${w.v} deg/frame (move ${w.a}-${w.b}s, ${(w.b - w.a).toFixed(2)}s)`) : ["- none"]),
  "",
  "## Warnings",
  ...(warn.length ? warn.map((w) => "- " + w) : ["- none"]),
  "",
  `Named cues from the story (spec.cues): ${Object.keys(cues).length ? Object.keys(cues).join(", ") : "none (add cues to the film's makeFilm spec)"}`,
  "",
].join("\n");
fs.writeFileSync(dir + "/plan.md", md);
fs.writeFileSync(dir + "/plan.json", JSON.stringify({
  slug, comp, fps: FPS, frames: N, total: +total.toFixed(3), cues,
  shots: shots.map(({ caps, ...s }) => s), whips, innerCuts, statics, jumps, shortCards,
  speed: speed.map((v) => +v.toFixed(3)),
}, null, 1));
console.log(md);
console.log(`-> ${dir}/plan.md, plan.json`);

// ---------------- the middle of every shot (one sheet) ----------------
if (a.mids || a.shots) {
  const want = a.shots ? String(a.shots).split(",").map(Number) : shots.map((s) => s.id);
  const pick = shots.filter((s) => want.includes(s.id));
  const times = pick.map((s) => s.mid);
  console.log(`rendering ${times.length} mid-shot stills ...`);
  const { files } = lookStills(b, lookOf(comp), dir + "/mids", { times }, { scale: Number(a.scale ?? 0.35) });
  const o = sheet(files, pick.map((s) => `#${s.id}  t=${s.mid.toFixed(2)}`), `${dir}/mids/sheet.jpg`, { cols: Math.min(Number(a.cols ?? 8), files.length), w: 240 });
  console.log(o);
}
