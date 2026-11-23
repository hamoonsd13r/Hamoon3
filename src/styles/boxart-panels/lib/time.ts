// Box-Art Panels · time helpers: clamp, ramp, mix, easing, hash noise, and the film clock (TimeCtx: { t, frame }).
import React from "react";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  outBack: (u: number) => {
    const x = clamp(u), c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  expo: (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u))),
};

// deterministic noise (same value for the same inputs — every frame is a pure function of time)
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
