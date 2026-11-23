// Rainy Window · the scene of the demo plate: a cheetah cub and a little robot in a tea house on a rainy night.
// Everything is a pure function of t and repeats every L seconds (seamless loop).
// Coordinates are plate pixels of the master image (1536 × 2752). A new plate = new numbers here (measure them on it).

// 12 s = 4 bars of the lofi track (bars measured 3.0 s apart; the 4-bar cut is stretched to exactly 12 s)
// so picture and music loop together
export const L = 12; // loop length (s)
export const BAR = 3.0;
export const BEAT = BAR / 4;
export const FPS = 30;
export const PLATE = { w: 1536, h: 2752 };

export const WIN = { x0: 772, y0: 636, x1: 1506, y1: 1686 }; // inside of the shop window (glass)
export const CUB = { x0: 800, y0: 1130, x1: 1128, y1: 1700 }; // pose-swap region (cub only, not the robot's hand)
export const GUTTER = { y: 492, x0: 395, x1: 1530 }; // drips fall from the gutter's lower lip
export const DOWNPIPE = { x: 497, y: 1948 }; // outlet of the downpipe shoe
// our drop hangs from the ceiling stain a little right of the painted one (which is hidden): its fall reads
// against the teal tiles instead of the bright lantern, and it lands near the umbrella's rim
export const LEAK = { x: 1248, y: 792, canopyY: 1177 };
export const CANOPY = { apex: { x: 1165, y: 1117 }, right: { x: 1263, y: 1188 }, left: { x: 1068, y: 1180 } };
export const SCREEN = { x0: 1222, y0: 1245, x1: 1310, y1: 1332, r: 18 }; // the robot's dark screen face
export const ANTENNA = { x: 1324, y: 1163 };
export const MUG = { x: 1080, y: 1372 }; // mug rim in pose A / C (steam source)

// ── poses: A = master (looks out), B = sip, C = content smile
type Key = [number, number, number, number]; // t, wA, wB, wC
const POSE_KEYS: Key[] = [
  [0, 1, 0, 0],
  [BAR, 1, 0, 0], // bar 2: the cub lifts the mug and sips
  [BAR + 0.12, 0, 1, 0],
  [7 * BEAT, 0, 1, 0], // beat 8: lowers it, content
  [7 * BEAT + 0.12, 0, 0, 1],
  [14 * BEAT, 0, 0, 1], // beat 15: back to watching the rain
  [14 * BEAT + 0.3, 1, 0, 0],
  [L, 1, 0, 0],
];
export const poseW = (t: number): { a: number; b: number; c: number } => {
  for (let i = 0; i < POSE_KEYS.length - 1; i++) {
    const [t0, a0, b0, c0] = POSE_KEYS[i];
    const [t1, a1, b1, c1] = POSE_KEYS[i + 1];
    if (t >= t0 && t <= t1) {
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      const s = u * u * (3 - 2 * u);
      return { a: a0 + (a1 - a0) * s, b: b0 + (b1 - b0) * s, c: c0 + (c1 - c0) * s };
    }
  }
  return { a: 1, b: 0, c: 0 };
};

// ── the leak gag: a drop swells on the ceiling, falls on the robot's umbrella, the robot is delighted
export const G = 4800; // gravity, plate px / s^2
export const G_IN = 2600; // the leak falls a bit slower, so the gag reads
// the drop lands on the umbrella exactly on bar 4's downbeat
export const LEAK_HIT = 3 * BAR;
export const LEAK_T = { swell: LEAK_HIT - 2.0, fall: LEAK_HIT - Math.sqrt((2 * (LEAK.canopyY - LEAK.y)) / G_IN) };

// robot eye states over time
export type Eyes = { look: [number, number]; open: number; mode: "normal" | "squeeze" | "happy"; glow: number };
const blink = (t: number, at: number) => {
  const d = Math.abs(t - at);
  return d < 0.07 ? 0.08 : d < 0.11 ? 0.5 : 1;
};
export const eyesAt = (t: number): Eyes => {
  const hit = LEAK_HIT;
  if (t >= hit - 0.04 && t < hit + 0.14) return { look: [-1, -6], open: 1, mode: "squeeze", glow: 1.2 };
  if (t >= hit + 0.14 && t < hit + 1.15) return { look: [-2, -1], open: 1, mode: "happy", glow: 1.25 };
  const up = smooth(hit - 1.1, hit - 0.85, t) * (1 - smooth(hit - 0.06, hit - 0.04, t));
  const back = smooth(hit + 1.15, hit + 1.45, t);
  const look: [number, number] = [-4 + 3 * up * (1 - back), -9 * up * (1 - back)];
  const open = Math.min(blink(t, 1.15), blink(t, 4.45), blink(t, 6.9), blink(t, 11.2)) * (1 + 0.12 * up);
  return { look, open, mode: "normal", glow: 1 };
};

export const smooth = (a: number, b: number, t: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// lantern flicker (periodic in L)
export const flicker = (t: number) => {
  const w = (2 * Math.PI) / L;
  return 1 + 0.022 * Math.sin(w * 11 * t) + 0.016 * Math.sin(w * 19 * t + 1.3) + 0.012 * Math.sin(w * 43 * t + 2.1);
};

// gentle camera float (periodic)
export const camAt = (t: number) => {
  const w = (2 * Math.PI) / L;
  return { x: 2.2 * Math.sin(w * t), y: 1.6 * Math.sin(2 * w * t + 0.7), z: 1.0 + 0.0035 * Math.sin(w * t + 0.4) };
};

// ── seeded random
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

// ── raindrop impacts on the ground: x, y, start time, perspective scale, strength
export type Hit = { x: number; y: number; t0: number; k: number; s: number };
const persp = (y: number) => 0.5 + Math.min(1, Math.max(0, (y - 1720) / 1032)) * 1.05;
export const HITS: Hit[] = (() => {
  const r = rng(34001);
  const out: Hit[] = [];
  const add = (n: number, x0: number, x1: number, y0: number, y1: number, bias = 1) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = y0 + Math.pow(r(), bias) * (y1 - y0);
      out.push({ x, y, t0: r() * L, k: persp(y), s: 0.6 + 0.4 * r() });
    }
  };
  add(14 * L, 0, 520, 1735, 2060, 0.8); // the alley
  add(7 * L, 560, 1530, 1998, 2105); // sidewalk top
  add(42 * L, 0, 1536, 2125, 2740, 0.75); // street and puddles
  return out;
})();
export const HIT_LIFE = 1.15;
export const activeHits = (t: number, max = 96) => {
  const a: { h: Hit; age: number }[] = [];
  for (const h of HITS) {
    const age = (((t - h.t0) % L) + L) % L;
    if (age < HIT_LIFE) a.push({ h, age });
  }
  a.sort((p, q) => p.age - q.age);
  return a.slice(0, max);
};

// ── drips from the gutter (each source drips n times per loop) and a few steady streams
export type Drip = { x: number; n: number; ph: number; yEnd: number; size: number };
export const DRIPS: Drip[] = (() => {
  const r = rng(34002);
  const out: Drip[] = [];
  const f = L / 8; // drop rates were tuned per 8 s
  for (let x = GUTTER.x0; x < GUTTER.x1; x += 18 + r() * 22) {
    out.push({ x: x + r() * 8, n: Math.round((7 + Math.floor(r() * 14)) * f), ph: r(), yEnd: x < 540 ? 1972 : 1992, size: 0.75 + r() * 0.6 });
  }
  for (const x of [612, 868, 1012, 1236, 1388]) out.push({ x, n: Math.round(112 * f), ph: r(), yEnd: 1992, size: 1.1 });
  return out;
})();
export const DRIP_FALL = Math.sqrt((2 * (1992 - GUTTER.y)) / G);
