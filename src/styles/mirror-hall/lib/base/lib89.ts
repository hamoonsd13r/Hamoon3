// Mirror Hall · shared clock: the song is cut at its first kick (song 30.66 s = film 0), 110.48 BPM.
import WORDS from "./words.json";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const S0 = 30.66; // song second that is film second 0
export const DUR = 210.5;
export const FRAMES = Math.round(DUR * FPS);

import BEATS from "./beats89.json";
export const BEAT = 60 / 110.48; // nominal 0.54308 s; the song drifts ±0.1 s, so real beats come from the table
const BT = BEATS as number[]; // film time of beat k (k = 0 … 392), fitted to the measured kicks
export const B0 = BT[0];
/** film time of beat k (fractional k interpolates; beyond the table it extends at the nominal tempo) */
export const beat = (k: number) => {
  if (k <= 0) return BT[0] + k * BEAT;
  const n = BT.length - 1;
  if (k >= n) return BT[n] + (k - n) * BEAT;
  const i = Math.floor(k), f = k - i;
  return BT[i] + (BT[i + 1] - BT[i]) * f;
};
export const bar = (k: number) => beat(4 * k);
/** beats since the first kick (fractional), the inverse of beat() */
export const beatPos = (t: number) => {
  if (t <= BT[0]) return (t - BT[0]) / BEAT;
  const n = BT.length - 1;
  if (t >= BT[n]) return n + (t - BT[n]) / BEAT;
  let lo = 0, hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (BT[m] <= t) lo = m;
    else hi = m;
  }
  return lo + (t - BT[lo]) / (BT[lo + 1] - BT[lo]);
};
/** 1 on every beat, decaying with time constant `tau` seconds */
export const kick = (t: number, tau = 0.12) => {
  const p = beatPos(t);
  if (p < 0) return 0;
  const dt = (p - Math.floor(p)) * BEAT;
  return Math.exp(-dt / tau);
};

export type Word = { w: string; a: number; b: number };
export const WORDS_ALL = WORDS as Word[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z']/g, "");
/** the n-th occurrence (0-based) of a word at or after time `after` → {a, b} (start/end in film seconds) */
export const word = (text: string, n = 0, after = 0): Word => {
  const k = norm(text);
  const hits = WORDS_ALL.filter((x) => x.a >= after - 1e-6 && norm(x.w) === k);
  const h = hits[Math.min(n, hits.length - 1)];
  if (!h) throw new Error(`word not found: ${text} after ${after}`);
  return h;
};

// ---- easing / helpers
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const sstep = (t: number, a: number, b: number) => {
  const x = ramp(t, a, b);
  return x * x * (3 - 2 * x);
};
export const ease = {
  inOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x: number) => {
    if (x <= 0) return 0;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
/** deterministic hash noise in [0,1) */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1e9) / 1e9;
  };
};
