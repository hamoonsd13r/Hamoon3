// Living Codex · palette, fonts (all OFL) and the small math everything shares: easing, noise, firelight flicker.
// The look: manuscripts and carved stone by candlelight — ink black, bone, amber, ember.
import { createContext, useContext } from "react";

export const FPS = 24;
export const C = {
  night: "#0d1220", ink: "#07090f", clay: "#b4643c", amber: "#f0a64a", ember: "#ff7a2f",
  bone: "#e9dcc4", paper: "#efe4cf", sepia: "#5a3d26", moon: "#7fa7c9", blood: "#8e2a20", sage: "#8fa27a",
};
/** titles: Libre Baskerville · labels: Chakra Petch Light · manuscripts: UnifrakturMaguntia · Persian: Vazirmatn */
export const F = { serif: "LCSerif", label: "LCLabel", fraktur: "LCFraktur", fa: "LCFa", faBold: "LCFaBold" };

/** film time for nested components (the demo provides it; pass `t` props everywhere else) */
export const TimeCtx = createContext<{ t: number; frame: number }>({ t: 0, frame: 0 });
export const useT = () => useContext(TimeCtx).t;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const sstep = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
/** 0→1 between a and a+d (smoothstep) */
export const win = (t: number, a: number, d = 0.5) => sstep(a, a + d, t);
/** fade in at a over d, fade out at b over d2 */
export const env = (t: number, a: number, b: number, d = 0.5, d2 = d) => win(t, a, d) * (1 - win(t, b, d2));
export const backOut = (x: number, s = 1.6) => { const k = clamp(x) - 1; return 1 + k * k * ((s + 1) * k + s); };
export const expOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x)));

// ── deterministic randomness / noise ────────────────────────────────────────────────────────────
export const rng = (seed: number) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};
export const hash1 = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const hh = (x: number, y: number, seed: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};
export const vnoise = (x: number, y: number, seed = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hh(xi, yi, seed), b = hh(xi + 1, yi, seed), c = hh(xi, yi + 1, seed), d = hh(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, oct = 4, seed = 0) => {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
};
/** smooth 1-D wobble in [-1, 1] */
export const wob = (t: number, seed = 0) => vnoise(t, seed * 7.3, 3) * 2 - 1;
/** firelight flicker in [0, 1] */
export const flick = (t: number, seed = 0) => clamp(0.55 + 0.3 * wob(t * 3.1, seed) + 0.15 * wob(t * 9.7, seed + 4));

/** #rrggbb + alpha → rgba() */
export const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/** a number with thousands separators */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** catmull-rom spline through points → SVG path (closed or open) */
export const spline = (pts: [number, number][], closed = true, k = 0.5) => {
  const n = pts.length;
  if (n < 2) return "";
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + " Z" : d;
};
