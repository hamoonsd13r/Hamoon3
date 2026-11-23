// Talk Cutout · time helpers. Every frame is a pure function of film time t (seconds): Look stills (one frame per entry
// of `times`) render exactly what the film shows at that second.
import React from "react";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  /** overshoot; NOTE outBack(0) is ~2e-16, not 0: gate on time (pop) instead of «value > 0» */
  outBack: (u: number) => {
    const x = clamp(u), c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};

/** deterministic noise: the same value for the same input */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};

/** film time and the render frame (they differ in Look stills) */
export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);

/** piecewise interpolation through [time, value] keys (eased between neighbours) */
export const kf = (t: number, keys: [number, number][], e: (u: number) => number = ease.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return mix(va, vb, e(b <= a ? 1 : (t - a) / (b - a)));
    }
  }
  return keys[keys.length - 1][1];
};
/** a damped jolt that starts at `at` (camera kicks) */
export const jolt = (t: number, at: number, amp: number, freq = 30, damp = 9) =>
  t < at ? 0 : amp * Math.exp(-(t - at) * damp) * Math.sin((t - at) * freq);
/** a one-sided punch: 0 → 1 in 60 ms, then decays */
export const punch = (t: number, at: number, decay = 6) => (t < at ? 0 : clamp((t - at) / 0.06) * Math.exp(-Math.max(0, t - at - 0.06) * decay));
/** spring-ish settle 0 → 1 with a small overshoot; exactly 0 before `a` (so gates stay closed) */
export const pop = (t: number, a: number, d = 0.42) => (t <= a ? 0 : ease.outBack(clamp((t - a) / d)));
export const inn = (t: number, a: number, d = 0.4) => (t <= a ? 0 : ease.out(clamp((t - a) / d)));
export const out = (t: number, a: number, d = 0.3) => 1 - ease.inOut(clamp((t - a) / d));
/** visibility of a window [a, b]: eased in over `di`, out over `dout` (0 outside) */
export const vis = (t: number, a: number, b: number, di = 0.35, dout = 0.3) => (t < a || t > b + dout ? 0 : inn(t, a, di) * out(t, b, dout));
/** is t inside [a, b) */
export const win = (t: number, a: number, b: number) => t >= a && t < b;

/** a music grid: pulses on beats and bars from a downbeat `grid` (film s) at `bpm`. Put a downbeat on the cut into the
 *  first motion section, and the end card on a downbeat after the last word. */
export const makeBeat = (bpm: number, grid: number) => {
  const BEAT = 60 / bpm;
  const beatT = (k: number) => grid + k * BEAT;
  const pulse = (t: number, period: number, decay: number) => {
    const x = (t - grid) / period;
    return Math.exp(-(x - Math.floor(x)) * period * decay);
  };
  return {
    BEAT,
    beatT,
    /** 0..1, peaks on every beat (sharp attack, short decay): small living accents */
    beatPulse: (t: number, decay = 9) => pulse(t, BEAT, decay),
    /** 0..1, peaks on every bar downbeat (4 beats) */
    barPulse: (t: number, decay = 5) => pulse(t, BEAT * 4, decay),
    /** the first downbeat at or after t */
    nextBar: (t: number) => grid + Math.ceil((t - grid) / (BEAT * 4) - 1e-6) * BEAT * 4,
  };
};

/** "14.7K" style for views; never shows «0»: callers start from the first real value */
export const fmtK = (v: number, dec = 1) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(dec)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : dec)}K`;
  return `${Math.round(v)}`;
};
export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
