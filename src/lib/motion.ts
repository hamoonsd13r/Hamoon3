// motion.ts: small motion helpers for Remotion scenes (pure functions of time; time in seconds or frames, your choice,
// as long as the keys use the same unit). Adapted from rossark-motion-skill (MIT © 2026 rossark0, see
// LICENSES/rossark-motion-skill-MIT.txt): the curves and the track / flow / seg / wave / loop / bell / seeded
// functions, without Reanimated; followThrough and headCounter are ours (the skill's §4 rule as code).

/** a cubic-bezier easing (CSS semantics): x(u), y(u) with P0 = (0,0) and P3 = (1,1) */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let u = p;
    for (let i = 0; i < 6; i++) {
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= (sx(u) - p) / d;
    }
    u = Math.min(1, Math.max(0, u));
    return sy(u);
  };
};
/** things that travel (gaze, sway, a head turning, a lid closing) */
export const EASE_IN_OUT = bezier(0.77, 0, 0.175, 1);
/** things that open or arrive (a mouth, a lid reopening, a prop appearing) */
export const EASE_OUT = bezier(0.23, 1, 0.32, 1);
/** only for things leaving or falling away; never for something the eye is waiting on */
export const EASE_IN = bezier(0.55, 0, 1, 0.45);

/** a keyframe: time, value, and the curve of the segment ARRIVING here ('out', or ease-in-out by default) */
export type Key = readonly [number, number, "out"?];
/** the value of a track at time t; for loops, make the last key equal the first so nothing jumps */
export function track(t: number, keys: readonly Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t <= k1[0]) {
      const k0 = keys[i - 1];
      const span = k1[0] - k0[0];
      const p = span > 0 ? (t - k0[0]) / span : 1;
      return k0[1] + (k1[1] - k0[1]) * (k1[2] === "out" ? EASE_OUT(p) : EASE_IN_OUT(p));
    }
  }
  return keys[keys.length - 1][1];
}

/** a key pose for `flow`: [time, value], sorted by time */
export type FlowKey = readonly [number, number];
/**
 * A smooth track through key poses for acting (a body, arms, a head turn): it passes through every key with a
 * continuous speed and never overshoots (a monotone cubic). `track` eases in and out of every key, so a chain of
 * poses reads stop-and-go; use `flow` for acting and `track` for single moves. Repeat a value to hold.
 */
export function flow(t: number, k: readonly FlowKey[]): number {
  const n = k.length;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 0;
  while (k[i + 1][0] < t) i++;
  const slope = (j: number) => (k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0]);
  const tangent = (j: number) => {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1), b = slope(j);
    if (a * b <= 0) return 0;
    const h0 = k[j][0] - k[j - 1][0], h1 = k[j + 1][0] - k[j][0];
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  };
  const h = k[i + 1][0] - k[i][0];
  const s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * tangent(i) + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * tangent(i + 1);
}

/** 0 → 1 inside the window [a, b] (eased), 0 before it, 1 after: one beat of a scene */
export function seg(t: number, a: number, b: number, curve: "out" | "inOut" = "out"): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const p = (t - a) / (b - a);
  return curve === "out" ? EASE_OUT(p) : EASE_IN_OUT(p);
}
/** a smooth back-and-forth from −1 to 1; `phase` (0..1) offsets one item from the next */
export const wave = (t: number, period: number, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
/** progress through a loop, 0..1, with a phase (drifting or falling items) */
export const loop = (t: number, period: number, phase = 0) => {
  const p = (t / period + phase) % 1;
  return p < 0 ? p + 1 : p;
};
/** 0 at both ends and 1 in the middle: fade in and out (steam, sparkles, ripples) */
export const bell = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
/** a stable pseudo-random number in [0, 1) for item i: variety that is the same every render */
export const seeded = (i: number, salt = 0) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Follow-through: a part that hangs off another (an ear, a tail, a sleeve, a scarf) repeats the parent's motion a
 * little later and a little weaker. `parent` is any function of time; delay in the same unit as t (≈ 0.06–0.15 s).
 */
export const followThrough = (parent: (t: number) => number, t: number, delay = 0.09, k = 0.45) => k * parent(t - delay);
/** the head counters the body's lean a moment later, so the gaze stays put: head(t) = own(t) − k · lean(t − delay) */
export const headCounter = (own: (t: number) => number, lean: (t: number) => number, t: number, delay = 0.11, k = 0.45) => own(t) - k * lean(t - delay);
