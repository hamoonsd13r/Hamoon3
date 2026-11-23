// The picture's clock for a film's sound script, read from videos/<id>/plan/plan.json (written by pipeline/plan.mjs
// from the story itself), so build-audio.cjs never copies the story's timing formulas.
//   const P = require("../../src/styles/toon3d/pipeline/plancues.cjs").plan("videos/<id>");   (path from your script)
//   P.cue("thunder")        a named time the story registered with cue("thunder", t) (lib/kit/timeline.ts makeCues)
//   P.shot(7).t0 / .t1      shot start / end (seconds); P.shots: all of them
//   P.whips                 fast camera moves [{ t (fastest frame), v (deg/frame), a, b (the move), shot }]
//   P.whoosh(w)             a whoosh whose LOUDEST moment lands on w.t: { file, at, db, dur }
//   for (const w of P.whips) { const s = P.whoosh(w); place(fx, s.file, s.at, { db: s.db }); }   // every fast move heard
// Re-run plan.mjs after any change to the shot list; P.stale() is true when the plan is older than the sources.
// The whooshes come from the project's own library (public/sfx-lib, synthesized, free) unless you pass your own files
// (CC0 / licensed) as plan(root, { whooshes: { short: [...], long: [...] } }); each file's peak is measured once.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");

/** whooshes by the length of the move they cover (paths from the project root) */
const SETS = {
  flick: ["public/sfx-lib/sweep.wav"],
  short: ["public/sfx-lib/sweep.wav", "public/sfx-lib/whoosh.wav"],
  medium: ["public/sfx-lib/whoosh.wav"],
  long: ["public/sfx-lib/whoosh.wav", "public/sfx-lib/riser.wav"],
};
const META = new Map();
/** duration and the time of the loudest 20 ms of a sound file (s) */
const measure = (file) => {
  if (META.has(file)) return META.get(file);
  const SR = 16000, b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4), F = SR / 50;
  let best = 0, at = 0;
  for (let k = 0; k + F <= x.length; k += F / 2) { let s = 0; for (let i = k; i < k + F; i++) s += x[i] * x[i]; if (s > best) { best = s; at = (k + F / 2) / SR; } }
  const m = { dur: x.length / SR, peak: at };
  META.set(file, m);
  return m;
};

function plan(root, opts = {}) {
  const file = path.join(root, "plan", "plan.json");
  if (!fs.existsSync(file)) throw new Error(`no ${file}: run  node src/styles/toon3d/pipeline/plan.mjs <id> <Comp>  first`);
  const P = JSON.parse(fs.readFileSync(file, "utf8"));
  const byId = new Map(P.shots.map((s) => [s.id, s]));
  // a move that runs across a shot boundary is measured once per shot: keep the fastest of whips < 0.35 s apart
  P.whips = (P.whips ?? []).reduce((acc, w) => { const l = acc[acc.length - 1]; if (l && w.t - l.t < 0.35) { if (w.v > l.v) acc[acc.length - 1] = { ...w, a: l.a }; else l.b = w.b; } else acc.push({ ...w }); return acc; }, []);
  const sets = { ...SETS, ...(opts.whooshes ?? {}) };
  let n = 0;
  return {
    ...P,
    shot: (id) => { const s = byId.get(id); if (!s) throw new Error(`no shot ${id} in the plan`); return s; },
    /** a cue by name; throws on a typo instead of silently placing a sound at 0 */
    cue: (name) => { if (!(name in P.cues)) throw new Error(`no cue "${name}" in the plan (story cues: ${Object.keys(P.cues).join(", ")})`); return P.cues[name]; },
    /** a whoosh for a fast move: its loudest moment on the move's fastest frame; louder for faster moves (-22..-13 dB) */
    whoosh: (w, o = {}) => {
      const dur = w.b - w.a, set = o.set ?? (dur < 0.25 ? "flick" : dur < 0.6 ? "short" : dur < 1.2 ? "medium" : "long");
      const files = sets[set], f = files[(o.pick ?? n++) % files.length], m = measure(f);
      const db = o.db ?? Math.max(-22, Math.min(-13, -22 + 4 * Math.log2(Math.max(1, w.v / 2.5))));
      return { file: f, at: Math.max(0, w.t - m.peak), db: +db.toFixed(1), dur: m.dur };
    },
    /** true when anything under src/ is newer than the plan (re-run plan.mjs) */
    stale: () => {
      const newest = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => Math.max(t, e.isDirectory() ? newest(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).mtimeMs), 0);
      return newest("src") > fs.statSync(file).mtimeMs;
    },
  };
}
module.exports = { plan, SETS, measure };
