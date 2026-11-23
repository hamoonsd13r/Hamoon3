// Hollow Moon 3D · shared constants of the world, math and deterministic noise (three.js).
// World: 1 unit = 1 metre, sea level y = 0, the hollow moon (radius R) hangs over the sea at MOON.
// The film's own clock (music grid, cuts, shots) lives in demo/film.ts.
export const FPS = 30;

/** moon radius, crust thickness, inner hall radius */
export const R = 100;
export const CRUST = 6.5;
export const HALL = 90;
/** centre of the moon in the world: it hangs low over the sea (its lowest point 65 m above the water) */
export const MOON: [number, number, number] = [0, 165, 0];

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ramp = (x: number, a: number, b: number) => (a === b ? (x < a ? 0 : 1) : clamp((x - a) / (b - a)));
export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  quad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

/** mulberry32 */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
export const hash2 = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123;
  return v - Math.floor(v);
};

// ── Perlin gradient noise (seeded permutation), range about [-1, 1]
const PERM = new Uint8Array(512);
{
  const r = rng(9111);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const grad3 = (h: number, x: number, y: number, z: number) => {
  const hh = h & 15;
  const u = hh < 8 ? x : y;
  const v = hh < 4 ? y : hh === 12 || hh === 14 ? x : z;
  return ((hh & 1) === 0 ? u : -u) + ((hh & 2) === 0 ? v : -v);
};
export function noise3(x: number, y: number, z: number) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  const xf = x - X, yf = y - Y, zf = z - Z;
  const xi = X & 255, yi = Y & 255, zi = Z & 255;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const A = PERM[xi] + yi, AA = PERM[A] + zi, AB = PERM[A + 1] + zi;
  const B = PERM[xi + 1] + yi, BA = PERM[B] + zi, BB = PERM[B + 1] + zi;
  return lerp(
    lerp(lerp(grad3(PERM[AA], xf, yf, zf), grad3(PERM[BA], xf - 1, yf, zf), u), lerp(grad3(PERM[AB], xf, yf - 1, zf), grad3(PERM[BB], xf - 1, yf - 1, zf), u), v),
    lerp(lerp(grad3(PERM[AA + 1], xf, yf, zf - 1), grad3(PERM[BA + 1], xf - 1, yf, zf - 1), u), lerp(grad3(PERM[AB + 1], xf, yf - 1, zf - 1), grad3(PERM[BB + 1], xf - 1, yf - 1, zf - 1), u), v),
    w,
  );
}
/** fractal sum, about [-1, 1] */
export function fbm3(x: number, y: number, z: number, oct = 4, lac = 2.03, gain = 0.5) {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x, y, z);
    n += a;
    x = x * lac + 17.13;
    y = y * lac - 9.71;
    z = z * lac + 3.37;
    a *= gain;
  }
  return s / n;
}

/** Catmull-Rom through scalar keys */
export function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export type V3 = [number, number, number];
/** the moon is turned about its vertical axis so the near side of the NASA map faces the opening shot */
export const MOON_YAW = -1.47;
/** direction of the opening in moon space (lat -24°, lon 27° of the map, as baked) and in the world */
export const BREACH_L: V3 = (() => { const la = (-24 * Math.PI) / 180, lo = (27 * Math.PI) / 180; return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)] as V3; })();
export const BREACH_W: V3 = (() => { const c = Math.cos(MOON_YAW), s = Math.sin(MOON_YAW), b = BREACH_L; return [b[0] * c + b[2] * s, b[1], -b[0] * s + b[2] * c] as V3; })();
/** axis of the great ring: its plane leans towards the lens of the opening shot, the near side dips below the moon */
export const RING_AXIS: V3 = (() => { const l = Math.hypot(0.2, 0.82, 0.52); return [0.2 / l, 0.82 / l, 0.52 / l] as V3; })();
/** ring-local vector (x, y = along the axis, z) → world direction (the rotation that takes +Y to the axis) */
export function ringToWorld(v: V3): V3 {
  const a = RING_AXIS, kl = Math.hypot(a[2], a[0]) || 1, k: V3 = [a[2] / kl, 0, -a[0] / kl];
  const c = a[1], s = Math.sqrt(Math.max(0, 1 - c * c));
  const kv: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]], kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}
/** point of the ring frame: angle around the axis (radians), distance from the axis, height along the axis → offset from the moon's centre */
export const ringPt = (th: number, rad: number, ax = 0): V3 => ringToWorld([Math.cos(th) * rad, ax, Math.sin(th) * rad]);
/** the angle at which the ring comes nearest to the lens of the opening shot (its lowest, level stretch) */
export const RING_NEAR = (() => { let best = -9, bt = 0; for (let i = 0; i < 3600; i++) { const th = (i / 3600) * Math.PI * 2, p = ringToWorld([Math.cos(th), 0, Math.sin(th)]); const d = p[0] * 0.08 - p[1] * 0.3 + p[2]; if (d > best) { best = d; bt = th; } } return bt; })();
export const vadd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vmul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vlen = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a: V3): V3 => {
  const l = vlen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const vcross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
