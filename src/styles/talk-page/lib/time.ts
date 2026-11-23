// Talk Page — time and easing. Every piece is a pure function of t (seconds on the speaker's own clock):
// the film wraps the layer in <TCtx.Provider value={t}>, pieces read it with useT().
import { createContext, useContext } from "react";

export const TCtx = createContext(0);
export const useT = () => useContext(TCtx);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** 0 → 1 between a and b (a step when b ≤ a) */
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const eOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const eOut5 = (x: number) => 1 - Math.pow(1 - clamp(x), 5);
export const eInOut = (x: number) => {
  const k = clamp(x);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};
/** overshoot; gate it on time yourself (eBack(0) is not exactly 0) */
export const eBack = (x: number, s = 1.5) => 1 + (s + 1) * Math.pow(clamp(x) - 1, 3) + s * Math.pow(clamp(x) - 1, 2);
/** fast in, soft settle (0 → 1 from `at` over d s) */
export const pop = (t: number, at: number, d = 0.4) => eOut5(ramp(t, at, at + d));
/** in at `a`, out at `b` (both over d s) */
export const fade = (t: number, a: number, b: number, d = 0.3) => pop(t, a, d) * (1 - eInOut(ramp(t, b - d, b)));
/** a short 0 → 1 → 0 pulse at `at` */
export const hit = (t: number, at: number, d = 0.35) => (t < at || t > at + d ? 0 : Math.sin(((t - at) / d) * Math.PI));
/** deterministic noise in [0, 1) */
export const hash = (i: number, s = 1) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** deterministic wobble in [−0.5, 0.5] (hand-drawn strokes) */
export const wob = (i: number, s: number) => Math.sin(i * 12.9898 + s * 78.233) * 0.5;
/** Latin number with thousands separators */
export const grp = (n: number) => Math.round(n).toLocaleString("en-US");
