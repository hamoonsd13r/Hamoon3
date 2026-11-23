// Poster Wall 3D · shared constants: the reel frame, the room colour, easing and deterministic noise.
// Every frame is a pure function of time.
import React from "react";

export const FPS = 30;
export const W = 1080; // the reel (vertical)
export const H = 1920;
export const DUR = 15;
export const FRAMES = DUR * FPS;

export const BG = "#05070c"; // the room the wall hangs in


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
  outBack: (u: number, s = 1.70158) => {
    const x = clamp(u), c3 = s + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  },
  expo: (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u))),
  expoInOut: (u: number) => {
    const x = clamp(u);
    if (x === 0 || x === 1) return x;
    return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  },
  quint: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
  },
  sine: (u: number) => -(Math.cos(Math.PI * clamp(u)) - 1) / 2,
};
/** a 0→1 move between a and b with an easing */
export const tween = (t: number, a: number, b: number, fn: (u: number) => number = ease.out) => fn(ramp(t, a, b));
/** key-framed value: kf(t, [[t0, v0], [t1, v1], …], easing) */
export const kf = (t: number, keys: [number, number][], fn: (u: number) => number = ease.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], fn(ramp(t, keys[i - 1][0], keys[i][0])));
  return keys[keys.length - 1][1];
};

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** smooth 1D value noise in −1…1 */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};

export const TimeCtx = React.createContext({ t: 0 });
export const useT = () => React.useContext(TimeCtx);
