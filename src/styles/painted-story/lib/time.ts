// Painted Story · time helpers. Every frame is a pure function of film time t (seconds), so a Look still at any time
// equals the same frame of the full render. Deterministic noise only (no Math.random).
import React from "react";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** 0→1 between times a and b (linear, clamped); a step when b <= a */
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  /** overshoot. ⚠ outBack(0) is ~2e-16, not 0 — gate visibility on time, never on `outBack(...) > 0` */
  outBack: (u: number) => {
    const x = clamp(u), c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
/** cosine ease 0→1 (camera moves) */
export const sine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));
/** in-and-out envelope of an element living from t0 to t1 */
export const fade = (t: number, t0: number, t1: number, inD = 0.4, outD = 0.4) => ease.out(ramp(t, t0, t0 + inD)) * (1 - ease.in(ramp(t, t1 - outD, t1)));

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** smooth value noise in -1..1 */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};

/** decaying jolts at the given times: 1 right on a hit, 0 after `len` s (knocks, slams, impacts) */
export const pulseAt = (t: number, times: number[], len = 0.45) => {
  let k = 0;
  for (const x of times) {
    const d = t - x;
    if (d >= 0 && d < len) k = Math.max(k, Math.pow(1 - d / len, 2));
  }
  return k;
};

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
