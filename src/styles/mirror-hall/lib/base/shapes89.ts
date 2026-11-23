// Mirror Hall · the light world's shapes: the warrior, the singer and the cat drawn as strands of light for the
// light-swarm engine (65 536 particles per shape, like the films in STYLE 12 / the video-24 intro).
// Every shape uses the same index layout — [floor dust | haze | hero | others] — and every strand has a fixed
// particle count, so a morph between two poses moves body parts (a punch, a kneel) instead of reshuffling dots.
// All positions are deterministic per particle index (no shared random state).
import { N, put, type V3 } from "../../../light-swarm/shapes";
import { W_POSES } from "./moon89";

export type V2 = [number, number];
export type Pose = (typeof W_POSES)["ready"];

export const fr = (x: number) => x - Math.floor(x);
export const h1 = (i: number, k: number) => fr(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
export const gs = (i: number, k: number) => {
  const u = Math.max(1e-6, h1(i, k)), v = h1(i, k + 17.3);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v);
};

export const G = -20; // the floor (world units)
export const FIG_H = 40; // a standing warrior is 40 units tall
export const NF = 6000; // floor dust
export const NH = 4500; // ambient haze
export const IW0 = NF + NH; // hero range
export const IW1 = IW0 + 30000;
export const IO0 = IW1; // others: crowd, trio, copies …

// category (integer part of w): brightness/colour class in engine89
export const CAT89 = { haze: 0, line: 1, hi: 2, far: 3, eye: 4, tip: 5 } as const;

export type Strand = { pts: V3[]; n: number; cat: number; th: number; b0: number; b1: number };
export type Place = { x: number; z: number; s: number; rot?: number };

/** pose space (y up is negative, ~300 tall, ground at 0) + depth → world */
export const toW = (pl: Place, x: number, y: number, z = 0): V3 => {
  const k = (FIG_H / 300) * pl.s;
  let X = x * k, Z = z * k;
  if (pl.rot) {
    const c = Math.cos(pl.rot), s = Math.sin(pl.rot);
    [X, Z] = [c * X + s * Z, -s * X + c * Z];
  }
  return [pl.x + X, G - y * k, pl.z + Z];
};
export const hb = (y: number) => Math.min(1, Math.max(0, -y / 330)); // build order by height: feet first

/** distribute exactly (end-start) particles over the strands (fixed shares → index-stable across poses) */
export function fillStrands(o: Float32Array, start: number, end: number, S: Strand[], seed: number) {
  const tot = S.reduce((a, s) => a + s.n, 0);
  let i = start;
  S.forEach((s, si) => {
    const n = si === S.length - 1 ? end - i : Math.round((s.n / tot) * (end - start));
    const cum = [0];
    for (let j = 1; j < s.pts.length; j++) {
      const a = s.pts[j - 1], b = s.pts[j];
      cum.push(cum[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    const L = cum[cum.length - 1] || 1;
    let j = 0;
    for (let k = 0; k < n && i < end; k++, i++) {
      const u = Math.min(0.99999, (k + h1(i, seed)) / n);
      const d = u * L;
      while (j > 0 && cum[j] > d) j--;
      while (j < cum.length - 2 && cum[j + 1] < d) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const f = (d - cum[j]) / seg;
      const a = s.pts[j], b = s.pts[Math.min(j + 1, s.pts.length - 1)];
      const p: V3 = [a[0] + (b[0] - a[0]) * f + gs(i, 1) * s.th, a[1] + (b[1] - a[1]) * f + gs(i, 2) * s.th, a[2] + (b[2] - a[2]) * f + gs(i, 3) * s.th];
      put(o, i, p, s.cat, s.b0 + (s.b1 - s.b0) * u);
    }
  });
  return i;
}

/** a bundle of fibres along a bone: strands converge at the joints and spread in the middle */
export function bone(pl: Place, a: V2, b: V2, nStr: number, per: number, spread: number, dz: number, seed: number, cat: number = CAT89.line, th = 0.05, bOff = 0): Strand[] {
  const out: Strand[] = [];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let s = 0; s < nStr; s++) {
    const off = nStr === 1 ? 0 : (s / (nStr - 1) - 0.5) * spread;
    const bow = (h1(seed + s * 3.1, 5) - 0.5) * 0.1 * L;
    const zz = dz + (nStr === 1 ? 0 : (s / (nStr - 1) - 0.5) * spread * 0.6);
    const pts: V3[] = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, w = Math.sin(Math.PI * u);
      const o2 = off * (0.3 + 0.7 * w) + bow * w;
      pts.push(toW(pl, a[0] + dx * u + nx * o2, a[1] + dy * u + ny * o2, zz));
    }
    out.push({ pts, n: per, cat, th: th * pl.s, b0: Math.min(1, hb(a[1]) + bOff), b1: Math.min(1, hb(b[1]) + bOff) });
  }
  return out;
}
/** an ellipse ring in pose space, optionally turned around the vertical axis (phi) for a 3D head */
export function ring(pl: Place, c: V2, rx: number, ry: number, phi: number, per: number, cat: number, b0: number, b1: number, seed: number, wob = 0): Strand {
  const pts: V3[] = [];
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const r = 1 + wob * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7 + seed * 2.3) * 0.3);
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    pts.push(toW(pl, c[0] + x * Math.cos(phi), c[1] + y, x * Math.sin(phi)));
  }
  return { pts, n: per, cat, th: 0.045 * pl.s, b0, b1 };
}
export const path = (pl: Place, pts: V2[], per: number, cat: number, b0: number, b1: number, dz = 0, th = 0.05): Strand => ({ pts: pts.map((p) => toW(pl, p[0], p[1], dz)), n: per, cat, th: th * pl.s, b0, b1 });
export const lerp2 = (a: V2, b: V2, k: number): V2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const bez = (a: V2, c: V2, b: V2, n = 16): V2[] => Array.from({ length: n + 1 }, (_, i) => {
  const u = i / n;
  return [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
});

// ───────────────────────── the warrior ─────────────────────────
/** a limb as a tube of light fibres spiralling around its axis (the body reads as a volume, not a stick) */
export function tube(pl: Place, a: V2, b: V2, ra: number, rb: number, nf: number, per: number, dz: number, seed: number, cat: number = CAT89.line, twist = 0.8, bulge = 0.2, bOff = 0, bScale = 1): Strand[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const th0 = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.35;
    const pts: V3[] = [];
    for (let k = 0; k <= 14; k++) {
      const u = k / 14;
      const r = (ra + (rb - ra) * u) * (1 + bulge * Math.sin(Math.PI * u));
      const th = th0 + twist * u;
      const o2 = Math.cos(th) * r, oz = Math.sin(th) * r;
      pts.push(toW(pl, a[0] + dx * u + nx * o2, a[1] + dy * u + ny * o2, dz + oz));
    }
    out.push({ pts, n: per, cat, th: 0.03 * pl.s, b0: bOff + hb(a[1]) * bScale, b1: bOff + hb(b[1]) * bScale });
  }
  return out;
}
/** a horizontal ring (head parallels) */
export function hring(pl: Place, c: V2, r: number, rz: number, per: number, cat: number, b0: number, b1: number): Strand {
  const pts: V3[] = [];
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    pts.push(toW(pl, c[0] + Math.cos(a) * r, c[1], Math.sin(a) * rz));
  }
  return { pts, n: per, cat, th: 0.03 * pl.s, b0, b1 };
}
/** an ellipsoid of light: meridians + parallels */
export function globe(pl: Place, c: V2, rx: number, ry: number, nm: number, np: number, perM: number, perP: number, cat: number, b0: number, b1: number, seed: number): Strand[] {
  const S: Strand[] = [];
  for (let m = 0; m < nm; m++) S.push(ring(pl, c, rx, ry, (m / nm) * Math.PI, perM, cat, b0, b1, seed + m));
  for (let p = 0; p < np; p++) {
    const s = -0.6 + (1.2 * p) / Math.max(1, np - 1);
    const r = rx * Math.sqrt(1 - s * s);
    S.push(hring(pl, [c[0], c[1] + s * ry], r, r, perP, cat, b0, b1));
  }
  return S;
}
/** the torso: fibres wrapped around a waisted barrel from the hips to the shoulders */
function torso(pl: Place, P: Pose, nf: number, per: number, seed: number, bOff = 0, bScale = 1, wScale = 1): Strand[] {
  const top = lerp2(P.neck, P.pelvis, 0.06);
  const dx = top[0] - P.pelvis[0], dy = top[1] - P.pelvis[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const W = (v: number) => (v < 0.4 ? 29 - 13 * v : v < 0.82 ? 23.8 + ((v - 0.4) / 0.42) * 11 : 34.8 - ((v - 0.82) / 0.18) * 18) * wScale;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const th0 = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.25;
    const pts: V3[] = [];
    for (let k = 0; k <= 16; k++) {
      const v = k / 16;
      const w = W(v), d = w * 0.58;
      const th = th0 + 0.5 * v;
      const o2 = Math.cos(th) * w;
      pts.push(toW(pl, P.pelvis[0] + dx * v + nx * o2, P.pelvis[1] + dy * v + ny * o2, Math.sin(th) * d));
    }
    out.push({ pts, n: per, cat: CAT89.line, th: 0.03 * pl.s, b0: bOff + hb(P.pelvis[1]) * bScale, b1: bOff + hb(top[1]) * bScale });
  }
  return out;
}
// ───────────────────────── a body of light, like a 3D scan: fibres along every part + contour rings across it ─────────────────────────
type Prof = (u: number) => number;
export const pk = (keys: [number, number][]): Prof => (u) => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (u <= keys[i][0]) {
      const [u0, r0] = keys[i - 1], [u1, r1] = keys[i];
      const f = (u - u0) / (u1 - u0), s = f * f * (3 - 2 * f);
      return r0 + (r1 - r0) * s;
    }
  return keys[keys.length - 1][1];
};
// muscle profiles along each bone (pose units; the body is 300 tall)
export const PR = {
  upper: pk([[0, 11], [0.3, 10.4], [0.6, 9.4], [1, 7.4]]),
  fore: pk([[0, 7.6], [0.25, 8.4], [0.7, 6.0], [1, 4.8]]),
  thigh: pk([[0, 15.5], [0.3, 14.2], [0.75, 10.8], [1, 9.0]]),
  shin: pk([[0, 9.0], [0.28, 10.6], [0.55, 8.2], [0.86, 5.4], [1, 5.0]]),
  neck: pk([[0, 9], [1, 8]]),
  foot: pk([[0, 6.4], [0.5, 5.6], [1, 3.0]]),
  palm: pk([[0, 5.0], [0.5, 6.4], [1, 5.4]]),
};
/** one body part: fibres along it (a slight twist) and contour rings across it */
export function part(pl: Place, a: V2, b: V2, prof: Prof, nf: number, perF: number, nr: number, perR: number, dz: number, seed: number, cat: number = CAT89.line, bOff = 0, bScale = 1, k = 1): Strand[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const P3 = (u: number, th: number): V3 => {
    const r = prof(u) * k;
    return toW(pl, a[0] + dx * u + nx * Math.cos(th) * r, a[1] + dy * u + ny * Math.cos(th) * r, dz + Math.sin(th) * r);
  };
  const bA = bOff + hb(a[1]) * bScale, bB = bOff + hb(b[1]) * bScale;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const th0 = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.2;
    out.push({ pts: Array.from({ length: 15 }, (_, i) => P3(i / 14, th0 + 0.25 * (i / 14))), n: perF, cat, th: 0.02 * pl.s, b0: bA, b1: bB });
  }
  for (let r = 0; r < nr; r++) {
    const u = (r + 0.5) / nr;
    out.push({ pts: Array.from({ length: 25 }, (_, i) => P3(u, (i / 24) * Math.PI * 2)), n: perR, cat, th: 0.018 * pl.s, b0: bA + (bB - bA) * u, b1: bA + (bB - bA) * u });
  }
  return out;
}
/** the torso: a real chest-waist-hips silhouette with a little forward S-curve, as fibres + contour rings */
export function torso3(pl: Place, P: Pose, nf: number, perF: number, nr: number, perR: number, seed: number, bOff = 0, bScale = 1, k = 1): Strand[] {
  const top = lerp2(P.neck, P.pelvis, 0.04);
  const dx = top[0] - P.pelvis[0], dy = top[1] - P.pelvis[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const Wd = pk([[0, 27], [0.18, 28], [0.42, 22.5], [0.72, 31], [0.88, 33], [1, 17]]);
  const Dp = pk([[0, 17], [0.42, 14], [0.72, 19.5], [0.9, 15], [1, 10.5]]);
  const P3 = (v: number, th: number): V3 => {
    const w = Wd(v) * k, d = Dp(v) * k;
    return toW(pl, P.pelvis[0] + dx * v + nx * Math.cos(th) * w, P.pelvis[1] + dy * v + ny * Math.cos(th) * w, Math.sin(th) * d + Math.sin(Math.PI * v) * 4 * k);
  };
  const b0 = bOff + hb(P.pelvis[1]) * bScale, b1 = bOff + hb(top[1]) * bScale;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const th0 = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.15;
    out.push({ pts: Array.from({ length: 17 }, (_, i) => P3(i / 16, th0 + 0.18 * (i / 16))), n: perF, cat: CAT89.line, th: 0.02 * pl.s, b0, b1 });
  }
  for (let r = 0; r < nr; r++) {
    const v = (r + 0.5) / nr;
    out.push({ pts: Array.from({ length: 33 }, (_, i) => P3(v, (i / 32) * Math.PI * 2)), n: perR, cat: CAT89.line, th: 0.018 * pl.s, b0: b0 + (b1 - b0) * v, b1: b0 + (b1 - b0) * v });
  }
  return out;
}
/** a head: skull + narrower jaw, as meridians and horizontal slices, tilted with the neck */
export function head3(pl: Place, P: Pose, nm: number, perM: number, ns: number, perS: number, seed: number, bOff = 0, bScale = 1, k = 1): Strand[] {
  const c = P.head;
  const tilt = Math.atan2(P.head[0] - P.neck[0], -(P.head[1] - P.neck[1]));
  const rx = 19 * k, ry = 26 * k, rz = 21 * k;
  const R = (y: number) => Math.sqrt(Math.max(0, 1 - y * y)) * (y > 0.25 ? 1 - (0.36 * (y - 0.25)) / 0.75 : 1);
  const W3 = (x: number, y: number, z: number): V3 => {
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    return toW(pl, c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, z);
  };
  const hbh = hb(c[1]);
  const b0 = bOff + (hbh - 0.04) * bScale, b1 = bOff + hbh * bScale;
  const out: Strand[] = [];
  for (let m = 0; m < nm; m++) {
    const phi = (m / nm) * Math.PI;
    out.push({ pts: Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2, y = -Math.cos(t), s = Math.sign(Math.sin(t)) || 1;
      return W3(s * R(y) * rx * Math.cos(phi), y * ry, s * R(y) * rz * Math.sin(phi));
    }), n: perM, cat: CAT89.line, th: 0.018 * pl.s, b0, b1 });
  }
  for (let i = 0; i < ns; i++) {
    const y = -0.86 + (1.72 * (i + 0.5)) / ns;
    out.push({ pts: Array.from({ length: 29 }, (_, j) => {
      const a = (j / 28) * Math.PI * 2;
      return W3(Math.cos(a) * R(y) * rx, y * ry, Math.sin(a) * R(y) * rz);
    }), n: perS, cat: i === Math.floor(ns * 0.42) ? CAT89.hi : CAT89.line, th: 0.016 * pl.s, b0, b1 });
  }
  return out;
}
/** a hand: palm (fibres + rings) and four fingers and a thumb along the forearm's direction */
export function hand3(pl: Place, el: V2, ha: V2, dz: number, seed: number, cat: number = CAT89.line, bOff = 0, bScale = 1, k = 1, lite = false): Strand[] {
  const dx = ha[0] - el[0], dy = ha[1] - el[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const pe: V2 = [ha[0] + ux * 15 * k, ha[1] + uy * 15 * k];
  const S = part(pl, ha, pe, PR.palm, lite ? 2 : 5, 40, lite ? 1 : 2, 36, dz, seed, cat, bOff, bScale, k);
  const fingers = lite ? 2 : 4;
  for (let f = 0; f < fingers; f++) {
    const o = (f - (fingers - 1) / 2) * 3.4 * k;
    const a: V2 = [pe[0] + nx * o, pe[1] + ny * o];
    const len = (12 - Math.abs(f - (fingers - 1) / 2) * 2) * k;
    const b: V2 = [a[0] + ux * len + nx * o * 0.3, a[1] + uy * len + ny * o * 0.3];
    S.push({ pts: [toW(pl, a[0], a[1], dz + o * 0.4), toW(pl, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dz + o * 0.5 + 1.5 * k), toW(pl, b[0], b[1], dz + o * 0.6 + 2.5 * k)], n: 30, cat, th: 0.016 * pl.s, b0: bOff + hb(a[1]) * bScale, b1: bOff + hb(b[1]) * bScale });
  }
  const t0: V2 = [ha[0] + ux * 5 * k - nx * 6 * k, ha[1] + uy * 5 * k - ny * 6 * k];
  const t1: V2 = [t0[0] + ux * 9 * k - nx * 5 * k, t0[1] + uy * 9 * k - ny * 5 * k];
  S.push({ pts: [toW(pl, t0[0], t0[1], dz + 2 * k), toW(pl, t1[0], t1[1], dz + 4 * k)], n: 26, cat, th: 0.016 * pl.s, b0: bOff + hb(t0[1]) * bScale, b1: bOff + hb(t1[1]) * bScale });
  return S;
}
/** full detail: an anatomical body of light (contour rings + fibres), head, hands, feet, and the staff with a hot tip */
export function warriorFull(pl: Place, P: Pose, seed = 1): Strand[] {
  const S: Strand[] = [];
  S.push(...torso3(pl, P, 16, 220, 12, 170, seed + 1));
  for (const sd of [0, 1] as const) S.push(...globe(pl, P.sh[sd], 11, 11, 2, 2, 60, 50, CAT89.line, hb(P.sh[sd][1]) - 0.02, hb(P.sh[sd][1]), seed + 3 + sd));
  S.push(...part(pl, lerp2(P.neck, P.pelvis, 0.06), lerp2(P.neck, P.head, 0.45), PR.neck, 6, 50, 3, 50, 0, seed + 9));
  S.push(...head3(pl, P, 8, 150, 7, 130, seed + 10));
  for (const sd of [0, 1] as const) {
    const dz = sd ? 9 : -9;
    S.push(...part(pl, P.sh[sd], P.el[sd], PR.upper, 10, 90, 6, 70, dz, seed + 20 + sd));
    S.push(...part(pl, P.el[sd], P.ha[sd], PR.fore, 10, 80, 6, 60, dz, seed + 22 + sd));
    S.push(...hand3(pl, P.el[sd], P.ha[sd], dz, seed + 24 + sd));
    S.push(...part(pl, P.hip[sd], P.kn[sd], PR.thigh, 12, 110, 7, 90, dz, seed + 26 + sd));
    S.push(...part(pl, P.kn[sd], P.ft[sd], PR.shin, 12, 100, 7, 80, dz, seed + 28 + sd));
    const toe: V2 = [P.ft[sd][0] + (P.ft[sd][0] >= P.pelvis[0] ? 30 : -30), P.ft[sd][1] - 2];
    S.push(...part(pl, P.ft[sd], toe, PR.foot, 6, 40, 4, 40, dz, seed + 30 + sd));
  }
  // the staff: a bright core inside four spiralling fibres, grip bands, and a hot tip
  const [tip, butt] = P.staff;
  if (Math.hypot(tip[0] - butt[0], tip[1] - butt[1]) > 20) {
    S.push(...tube(pl, butt, tip, 2.6, 2.6, 4, 400, 12, seed + 35, CAT89.line, 3.0, 0, 0.86, 0.14));
    S.push({ pts: Array.from({ length: 13 }, (_, i) => toW(pl, butt[0] + (tip[0] - butt[0]) * (i / 12), butt[1] + (tip[1] - butt[1]) * (i / 12), 12)), n: 600, cat: CAT89.hi, th: 0.022 * pl.s, b0: 0.86, b1: 1 });
    for (let r = 0; r < 3; r++) S.push(ring(pl, tip, 7, 7, (r / 3) * Math.PI, 120, CAT89.tip, 0.98, 1, seed + 40 + r));
  } else {
    for (let s = 0; s < 5; s++) S.push(...tube(pl, P.el[s % 2], P.ha[s % 2], 8, 6, 1, s < 4 ? 400 : 600, s % 2 ? 9 : -9, seed + 50 + s));
    for (let r = 0; r < 3; r++) S.push(ring(pl, P.ha[r % 2], 7, 7, (r / 3) * Math.PI, 120, CAT89.line, 0.9, 1, seed + 40 + r));
  }
  return S;
}
/** the old fibre-bundle body (kept for reference) */
export function warriorFibres(pl: Place, P: Pose, seed = 1): Strand[] {
  const S: Strand[] = [];
  S.push(...torso(pl, P, 14, 330, seed + 1));
  S.push(...bone(pl, P.sh[0], P.sh[1], 1, 260, 0, 0, seed + 7, CAT89.hi, 0.04));
  S.push(...bone(pl, P.hip[0], P.hip[1], 1, 200, 0, 0, seed + 8, CAT89.line, 0.04));
  S.push(...tube(pl, lerp2(P.neck, P.pelvis, 0.08), lerp2(P.neck, P.head, 0.5), 10, 9, 6, 60, 0, seed + 9));
  // head: an ellipsoid of light, with a bright band at the eyes
  const hc = P.head;
  const hbh = hb(hc[1]);
  S.push(...globe(pl, hc, 21, 28, 7, 2, 210, 180, CAT89.line, hbh - 0.04, hbh, seed + 10));
  S.push(hring(pl, [hc[0], hc[1] - 3], 21.5, 21.5, 160, CAT89.hi, hbh - 0.02, hbh));
  // arms and legs (left side behind, right side in front)
  for (const sd of [0, 1] as const) {
    const dz = sd ? 8 : -8;
    S.push(...tube(pl, P.sh[sd], P.el[sd], 10.5, 8.5, 8, 170, dz, seed + 20 + sd));
    S.push(...tube(pl, P.el[sd], P.ha[sd], 8, 6, 8, 150, dz, seed + 22 + sd));
    S.push(...globe(pl, P.ha[sd], 7, 8, 2, 0, 80, 0, CAT89.line, hb(P.ha[sd][1]), hb(P.ha[sd][1]), seed + 24 + sd));
    S.push(...tube(pl, P.hip[sd], P.kn[sd], 14, 10, 8, 210, dz, seed + 26 + sd));
    S.push(...tube(pl, P.kn[sd], P.ft[sd], 10, 6.5, 8, 190, dz, seed + 28 + sd));
    const toe: V2 = [P.ft[sd][0] + (P.ft[sd][0] >= P.pelvis[0] ? 26 : -26), P.ft[sd][1] - 2];
    S.push(...tube(pl, P.ft[sd], toe, 6, 3, 4, 60, dz, seed + 30 + sd, CAT89.line, 0.3, 0));
  }
  // the staff: a bright core inside four spiralling fibres, and a hot tip
  const [tip, butt] = P.staff;
  if (Math.hypot(tip[0] - butt[0], tip[1] - butt[1]) > 20) {
    S.push(...tube(pl, butt, tip, 2.6, 2.6, 4, 520, 10, seed + 35, CAT89.line, 3.0, 0, 0.86, 0.14));
    S.push({ pts: Array.from({ length: 13 }, (_, k) => toW(pl, butt[0] + (tip[0] - butt[0]) * (k / 12), butt[1] + (tip[1] - butt[1]) * (k / 12), 10)), n: 700, cat: CAT89.hi, th: 0.025 * pl.s, b0: 0.86, b1: 1 });
    for (let r = 0; r < 3; r++) S.push(ring(pl, tip, 7, 7, (r / 3) * Math.PI, 140, CAT89.tip, 0.98, 1, seed + 40 + r));
  } else {
    // no staff in this pose: the fibres wrap the forearms instead (keeps the index layout)
    for (let s = 0; s < 5; s++) S.push(...tube(pl, P.el[s % 2], P.ha[s % 2], 8, 6, 1, s < 4 ? 520 : 700, s % 2 ? 8 : -8, seed + 50 + s));
    for (let r = 0; r < 3; r++) S.push(ring(pl, P.ha[r % 2], 7, 7, (r / 3) * Math.PI, 140, CAT89.line, 0.9, 1, seed + 40 + r));
  }
  return S;
}
/** a lighter figure (crowds, copies): the same anatomy with fewer fibres and rings; `glowHands` lights the
 *  hands (a clap that lands) */
export function warriorLite(pl: Place, P: Pose, staff: boolean, seed: number, bOff = 0, bScale = 1, glowHands = false): Strand[] {
  const S: Strand[] = [];
  S.push(...torso3(pl, P, 6, 34, 4, 22, seed, bOff, bScale));
  S.push(...head3(pl, P, 3, 30, 2, 22, seed + 1, bOff, bScale));
  for (const sd of [0, 1] as const) {
    const dz = sd ? 8 : -8;
    S.push(...part(pl, P.sh[sd], P.el[sd], PR.upper, 3, 18, 2, 12, dz, seed + 3 + sd, CAT89.line, bOff, bScale));
    S.push(...part(pl, P.el[sd], P.ha[sd], PR.fore, 3, 16, 2, 10, dz, seed + 5 + sd, CAT89.line, bOff, bScale));
    S.push(...hand3(pl, P.el[sd], P.ha[sd], dz, seed + 13 + sd, glowHands ? CAT89.tip : CAT89.line, bOff, bScale, 1, true));
    S.push(...part(pl, P.hip[sd], P.kn[sd], PR.thigh, 3, 22, 2, 14, dz, seed + 7 + sd, CAT89.line, bOff, bScale));
    S.push(...part(pl, P.kn[sd], P.ft[sd], PR.shin, 3, 20, 2, 12, dz, seed + 9 + sd, CAT89.line, bOff, bScale));
  }
  const [tip, butt] = P.staff;
  if (staff && Math.hypot(tip[0] - butt[0], tip[1] - butt[1]) > 20) {
    const s = bone(pl, butt, tip, 1, 70, 0, 12, seed, CAT89.hi, 0.04)[0];
    S.push({ ...s, b0: bOff + 0.86 * bScale, b1: bOff + bScale });
    S.push(ring(pl, tip, 6, 6, 0, 20, CAT89.tip, bOff + bScale, bOff + bScale, seed + 2));
  } else S.push(...torso3(pl, P, 3, 30, 0, 0, seed + 11, bOff, bScale, 0.6)); // keeps the share: inner torso fibres
  return S;
}

// ───────────────────────── the singer (seated, guitar) ─────────────────────────
export function singerFull(pl: Place, seed = 3): Strand[] {
  const S: Strand[] = [];
  const b = (y: number) => hb(y) * 0.9;
  // stool: a seat ring and three legs
  const seat: V2 = [0, -118];
  const sp: V3[] = [];
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    sp.push(toW(pl, seat[0] + Math.cos(a) * 34, seat[1], Math.sin(a) * 34));
  }
  S.push({ pts: sp, n: 300, cat: CAT89.line, th: 0.05 * pl.s, b0: 0.18, b1: 0.24 });
  for (const [x, z] of [[-26, -20], [26, -20], [0, 30]] as V2[]) S.push({ pts: [toW(pl, seat[0] + x * 0.6, seat[1], z * 0.6), toW(pl, seat[0] + x, 0, z)], n: 120, cat: CAT89.line, th: 0.05 * pl.s, b0: 0, b1: 0.18 });
  // body
  const pel: V2 = [0, -132], neck: V2 = [14, -252], head: V2 = [30, -300];
  S.push(...bone(pl, pel, neck, 2, 300, 18, 0, seed + 1));
  S.push(path(pl, bez([-18, -132], [-30, -200], [-4, -246]), 250, CAT89.line, b(-132), b(-246)));
  S.push(path(pl, bez([18, -136], [30, -196], [30, -242]), 250, CAT89.line, b(-136), b(-242)));
  // head: egg tilted towards the guitar, the hair curl, the long nose and the moustache
  S.push(ring(pl, head, 26, 42, 0, 420, CAT89.line, b(-300), b(-330), seed + 2));
  S.push(ring(pl, head, 26, 42, Math.PI / 2, 300, CAT89.line, b(-300), b(-330), seed + 3));
  S.push(ring(pl, [head[0] - 24, head[1] - 6], 8, 8, 0, 90, CAT89.line, b(-306), b(-306), seed + 4));
  S.push(path(pl, bez([50, -306], [62, -290], [52, -282]), 70, CAT89.line, 0.88, 0.9, 6));
  S.push(path(pl, bez([36, -276], [48, -282], [58, -274]), 70, CAT89.hi, 0.88, 0.9, 6));
  S.push(ring(pl, [44, -310], 3.5, 2.5, 0, 50, CAT89.eye, 0.9, 0.9, seed + 5));
  // legs: thighs forward, shins down to the stool's rung
  for (const sd of [0, 1] as const) {
    const dz = sd ? 8 : -8;
    S.push(...bone(pl, [0, -126], [80 - sd * 8, -130], 1, 220, 0, dz, seed + 10 + sd));
    S.push(...bone(pl, [80 - sd * 8, -130], [86 - sd * 8, -14], 1, 200, 0, dz, seed + 12 + sd));
    S.push(path(pl, [[86 - sd * 8, -14], [112 - sd * 8, -10]], 80, CAT89.line, 0, 0.02, dz));
  }
  // the guitar: two bouts, a sound hole, the neck, strings
  const gz = 14;
  const lowB: V2 = [44, -150], upB: V2 = [82, -178];
  S.push(ring(pl, lowB, 46, 40, 0, 420, CAT89.hi, 0.42, 0.56, seed + 20));
  S.push(ring(pl, upB, 34, 30, 0, 330, CAT89.hi, 0.5, 0.62, seed + 21));
  S.push(ring(pl, [64, -166], 10, 10, 0, 120, CAT89.line, 0.55, 0.6, seed + 22));
  for (let s = 0; s < 2; s++) S.push(path(pl, [[106 + s * 4, -192 + s * 4], [196 + s * 4, -258 + s * 4]], 260, CAT89.line, 0.6, 0.78, gz));
  S.push(path(pl, [[196, -258], [218, -274], [214, -282], [192, -266]], 90, CAT89.line, 0.78, 0.8, gz));
  for (let s = 0; s < 3; s++) S.push(path(pl, [[40 + s * 3, -142 + s * 3], [196 + s * 2, -262 + s * 2]], 200, CAT89.hi, 0.6, 0.8, gz + 1, 0.025));
  // arms: one strums over the sound hole, one holds the neck
  S.push(...bone(pl, [18, -240], [44, -192], 2, 150, 5, 10, seed + 30));
  S.push(...bone(pl, [44, -192], [62, -170], 2, 150, 5, 12, seed + 31));
  S.push(...bone(pl, [10, -242], [80, -226], 2, 150, 5, -6, seed + 32));
  S.push(...bone(pl, [80, -226], [156, -236], 2, 150, 5, 4, seed + 33));
  return S;
}
export function singerLite(pl: Place, seed: number, bOff = 0, bScale = 1): Strand[] {
  const S: Strand[] = [];
  const sb = (s: Strand) => {
    s.b0 = bOff + s.b0 * bScale;
    s.b1 = bOff + s.b1 * bScale;
    S.push(s);
  };
  sb(path(pl, [[-20, -118], [20, -118]], 24, CAT89.line, 0.2, 0.2));
  sb(path(pl, [[-14, -118], [-20, 0]], 16, CAT89.line, 0, 0.2));
  sb(path(pl, [[14, -118], [20, 0]], 16, CAT89.line, 0, 0.2));
  sb(path(pl, [[0, -132], [14, -252]], 60, CAT89.line, 0.25, 0.75));
  sb(ring(pl, [30, -300], 24, 40, 0, 70, CAT89.line, 0.8, 0.95, seed));
  sb(path(pl, [[0, -126], [78, -130], [84, -14]], 50, CAT89.line, 0.1, 0.3));
  sb(ring(pl, [52, -158], 42, 36, 0, 80, CAT89.hi, 0.45, 0.6, seed + 1));
  sb(path(pl, [[100, -190], [196, -258]], 50, CAT89.line, 0.6, 0.75, 12));
  sb(path(pl, [[18, -240], [44, -192], [62, -170]], 36, CAT89.line, 0.6, 0.7, 10));
  return S;
}

// ───────────────────────── the singer and the cat as holograms (same anatomy language as the warrior) ─────────────────────────
const SEATED: Pose = {
  head: [30, -300], neck: [14, -252], pelvis: [0, -128],
  sh: [[0, -238], [24, -240]], el: [[80, -226], [44, -192]], ha: [[150, -236], [62, -170]],
  hip: [[-10, -126], [10, -128]], kn: [[80, -132], [72, -134]], ft: [[86, -14], [78, -14]],
  staff: [[0, 0], [0, 0]],
};
/** the singer on his stool with the guitar, as a body of light (lite = for the crowds) */
function singerHolo(pl: Place, seed: number, lite: boolean, bOff = 0, bScale = 1): Strand[] {
  const P = SEATED;
  const f = lite ? 0.35 : 1;
  const n = (x: number) => Math.max(1, Math.round(x * f));
  const S: Strand[] = [];
  const add = (s: Strand) => S.push({ ...s, b0: bOff + s.b0 * bScale, b1: bOff + s.b1 * bScale });
  // the stool: a seat ring and three legs
  const seatY = -118;
  add({ pts: Array.from({ length: 41 }, (_, i) => toW(pl, Math.cos((i / 40) * 6.283) * 34, seatY, Math.sin((i / 40) * 6.283) * 34)), n: 200, cat: CAT89.line, th: 0.03 * pl.s, b0: 0.16, b1: 0.22 });
  for (const [x, z] of [[-26, -20], [26, -20], [0, 30]] as V2[]) add({ pts: [toW(pl, x * 0.6, seatY, z * 0.6), toW(pl, x, 0, z)], n: 80, cat: CAT89.line, th: 0.03 * pl.s, b0: 0, b1: 0.16 });
  S.push(...torso3(pl, P, n(14), 160, n(9), 120, seed + 1, bOff, bScale, 0.92));
  S.push(...head3(pl, P, n(7), 130, n(6), 110, seed + 2, bOff, bScale, 1.3));
  // her long hair: fibres from the crown over the back of the head and down her back, a side fringe, lips and a
  // small warm earring glint (her face reads even in light)
  const hc = P.head;
  const nh = lite ? 4 : 11;
  for (let j = 0; j < nh; j++) {
    const u = nh > 1 ? j / (nh - 1) : 0.5;
    const dz = (u - 0.5) * 30;
    const fall = 120 + 40 * h1(seed * 7 + j, 3);
    add(path(pl, bez([hc[0] + 6 - 10 * u, hc[1] - 42], [hc[0] - 58, hc[1] - 34], [hc[0] - 46 - 10 * h1(seed + j, 5), hc[1] + fall], 14), n(70), CAT89.line, 0.86, 0.96, dz, 0.03));
  }
  add(path(pl, bez([hc[0] + 2, hc[1] - 40], [hc[0] + 30, hc[1] - 36], [hc[0] + 38, hc[1] - 16], 8), n(50), CAT89.hi, 0.9, 0.94, 14, 0.02));
  add(path(pl, bez([hc[0] + 14, hc[1] + 24], [hc[0] + 22, hc[1] + 20], [hc[0] + 30, hc[1] + 24], 6), n(40), CAT89.hi, 0.92, 0.94, 24, 0.015));
  if (!lite) add(ring(pl, [hc[0] - 10, hc[1] + 26], 3, 3, 0, 24, CAT89.tip, 0.95, 0.95, seed + 4));
  for (const sd of [0, 1] as const) {
    const dz = sd ? 10 : -10;
    S.push(...part(pl, P.sh[sd], P.el[sd], PR.upper, n(8), 70, n(5), 50, dz, seed + 10 + sd, CAT89.line, bOff, bScale));
    S.push(...part(pl, P.el[sd], P.ha[sd], PR.fore, n(8), 60, n(5), 45, dz, seed + 12 + sd, CAT89.line, bOff, bScale));
    S.push(...hand3(pl, P.el[sd], P.ha[sd], dz, seed + 14 + sd, CAT89.line, bOff, bScale, 1, lite));
    S.push(...part(pl, P.hip[sd], P.kn[sd], PR.thigh, n(10), 80, n(5), 60, dz, seed + 16 + sd, CAT89.line, bOff, bScale));
    S.push(...part(pl, P.kn[sd], P.ft[sd], PR.shin, n(10), 70, n(5), 55, dz, seed + 18 + sd, CAT89.line, bOff, bScale));
    S.push(...part(pl, P.ft[sd], [P.ft[sd][0] + 28, P.ft[sd][1] - 2], PR.foot, n(5), 30, n(3), 30, dz, seed + 20 + sd, CAT89.line, bOff, bScale));
  }
  // the guitar: front and back of the body, joined at the sides, a sound hole, the neck and the strings
  const gz = 20;
  for (const dzz of [-5, 5]) {
    add(ring(pl, [44, -150], 46, 40, 0, n(260), CAT89.hi, 0.42, 0.56, seed + 30));
    S[S.length - 1].pts = S[S.length - 1].pts.map((p) => [p[0], p[1], p[2] + (gz + dzz) * (FIG_H / 300) * pl.s] as V3);
    add(ring(pl, [82, -178], 34, 30, 0, n(200), CAT89.hi, 0.5, 0.62, seed + 31));
    S[S.length - 1].pts = S[S.length - 1].pts.map((p) => [p[0], p[1], p[2] + (gz + dzz) * (FIG_H / 300) * pl.s] as V3);
  }
  for (let j = 0; j < (lite ? 3 : 8); j++) {
    const a = (j / (lite ? 3 : 8)) * Math.PI * 2;
    const x = 44 + Math.cos(a) * 46, y = -150 + Math.sin(a) * 40;
    add({ pts: [toW(pl, x, y, gz - 5), toW(pl, x, y, gz + 5)], n: 16, cat: CAT89.line, th: 0.02 * pl.s, b0: 0.5, b1: 0.5 });
  }
  add(ring(pl, [64, -166], 10, 10, 0, n(90), CAT89.line, 0.55, 0.6, seed + 32));
  S[S.length - 1].pts = S[S.length - 1].pts.map((p) => [p[0], p[1], p[2] + (gz + 5) * (FIG_H / 300) * pl.s] as V3);
  S.push(...tube(pl, [106, -192], [196, -258], 4, 3.4, lite ? 2 : 4, n(160), gz, seed + 33, CAT89.line, 0.4, 0, bOff + 0.6 * bScale, 0.18 * bScale));
  add(path(pl, [[196, -258], [218, -274], [214, -282], [192, -266]], n(80), CAT89.line, 0.78, 0.8, gz));
  if (!lite) for (let s = 0; s < 4; s++) add(path(pl, [[40 + s * 3, -142 + s * 3], [196 + s * 2, -262 + s * 2]], 150, CAT89.hi, 0.6, 0.8, gz + 6, 0.02));
  return S;
}
/** the cat as a creature of light: a round head with ears, big glowing eyes, a round body, legs and the tail */
function catHolo(pl: Place, seed: number, lite: boolean, bOff = 0, bScale = 1): Strand[] {
  const f = lite ? 0.35 : 1;
  const n = (x: number) => Math.max(1, Math.round(x * f));
  const S: Strand[] = [];
  const add = (s: Strand) => S.push({ ...s, b0: bOff + s.b0 * bScale, b1: bOff + s.b1 * bScale });
  const head: V2 = [0, -190];
  S.push(...globe(pl, head, 54, 48, n(7), n(5), 160, 140, CAT89.line, 0.6 * bScale + bOff, 0.8 * bScale + bOff, seed + 1));
  // ears: cones of fibres
  for (const sd of [-1, 1]) for (let j = 0; j < (lite ? 2 : 5); j++) {
    const a = (j / (lite ? 2 : 5)) * Math.PI * 2;
    const base: V3 = toW(pl, sd * 30 + Math.cos(a) * 14, -232, Math.sin(a) * 12);
    add({ pts: [base, toW(pl, sd * 46, -292, 0)], n: 50, cat: CAT89.line, th: 0.02 * pl.s, b0: 0.8, b1: 0.86 });
  }
  // eyes on the face (bright), with pupils
  for (const sd of [-1, 1]) {
    const eye = ring(pl, [sd * 22, -188], 15, 13, 0, n(200), CAT89.eye, 0.9, 0.95, seed + 10 + sd, 0);
    eye.pts = eye.pts.map((p) => [p[0], p[1], p[2] + 38 * (FIG_H / 300) * pl.s] as V3);
    add(eye);
    const pu = ring(pl, [sd * 22 + 3, -188], 5, 5, 0, n(70), CAT89.eye, 0.95, 0.97, seed + 12 + sd, 0);
    pu.pts = pu.pts.map((p) => [p[0], p[1], p[2] + 40 * (FIG_H / 300) * pl.s] as V3);
    add(pu);
  }
  if (!lite) for (const sd of [-1, 1]) for (let w = 0; w < 3; w++) add(path(pl, bez([sd * 20, -168 + w * 5], [sd * 60, -172 + w * 7], [sd * (96 + w * 6), -176 + w * 12], 8), 40, CAT89.line, 0.92, 0.96, 34, 0.02));
  // body, legs, tail
  S.push(...globe(pl, [0, -100], 32, 42, n(6), n(4), 120, 100, CAT89.line, 0.25 * bScale + bOff, 0.5 * bScale + bOff, seed + 20));
  for (const sd of [-1, 1]) S.push(...part(pl, [sd * 14, -62], [sd * 16, 0], pk([[0, 8], [1, 5]]), n(5), 40, n(3), 30, 0, seed + 24 + sd, CAT89.line, bOff, bScale));
  const tail = bez([26, -78], [74, -96], [64, -168], 10);
  for (let j = 0; j < (lite ? 2 : 4); j++) {
    const a = (j / (lite ? 2 : 4)) * Math.PI * 2;
    add({ pts: tail.map((p) => toW(pl, p[0] + Math.cos(a) * 4, p[1], Math.sin(a) * 4)), n: 60, cat: CAT89.line, th: 0.02 * pl.s, b0: 0.3, b1: 0.55 });
  }
  return S;
}

// ───────────────────────── the cat (scribble loops) ─────────────────────────
export function catFull(pl: Place, seed = 5): Strand[] {
  const S: Strand[] = [];
  const head: V2 = [0, -190];
  for (let l = 0; l < 4; l++) S.push(ring(pl, [head[0] + (h1(seed, l) - 0.5) * 8, head[1] + (h1(seed, l + 4) - 0.5) * 6], 54 + l * 3, 48 + l * 2, (l - 1.5) * 0.4, 380, CAT89.line, 0.55 + l * 0.04, 0.7 + l * 0.04, seed + l, 0.08));
  // ears
  for (const sd of [-1, 1]) S.push(path(pl, [[sd * 30, -230], [sd * 48, -292], [sd * 10, -244]], 180, CAT89.line, 0.8, 0.86));
  // eyes: bright rings with pupils
  for (const sd of [-1, 1]) {
    S.push(ring(pl, [sd * 22, -188], 15, 13, 0, 220, CAT89.eye, 0.9, 0.95, seed + 10 + sd, 0));
    S.push(ring(pl, [sd * 22 + 3, -188], 5, 5, 0, 80, CAT89.eye, 0.95, 0.97, seed + 12 + sd, 0));
  }
  // whiskers
  for (const sd of [-1, 1]) for (let w = 0; w < 3; w++) S.push(path(pl, bez([sd * 20, -168 + w * 5], [sd * 60, -172 + w * 7], [sd * (96 + w * 6), -176 + w * 12], 8), 40, CAT89.line, 0.92, 0.96, 4, 0.03));
  // body loops, belly, legs, tail
  for (let l = 0; l < 3; l++) S.push(ring(pl, [(h1(seed, l + 9) - 0.5) * 6, -100], 30 + l * 2, 40 + l * 2, (l - 1) * 0.5, 250, CAT89.line, 0.25 + l * 0.05, 0.4 + l * 0.05, seed + 20 + l, 0.1));
  S.push(ring(pl, [2, -92], 16, 24, 0, 150, CAT89.hi, 0.35, 0.45, seed + 24, 0.12));
  for (const sd of [-1, 1]) S.push(path(pl, [[sd * 14, -62], [sd * 16, 0]], 120, CAT89.line, 0, 0.2));
  S.push(path(pl, bez([26, -78], [74, -96], [64, -168]), 220, CAT89.line, 0.3, 0.55));
  for (const sd of [-1, 1]) S.push(path(pl, [[sd * 26, -116], [sd * 52, -88]], 90, CAT89.line, 0.4, 0.5));
  return S;
}
export function catLite(pl: Place, seed: number, bOff = 0, bScale = 1): Strand[] {
  const S: Strand[] = [];
  const sb = (s: Strand) => {
    s.b0 = bOff + s.b0 * bScale;
    s.b1 = bOff + s.b1 * bScale;
    S.push(s);
  };
  sb(ring(pl, [0, -190], 54, 48, 0.3, 90, CAT89.line, 0.55, 0.75, seed, 0.08));
  sb(ring(pl, [0, -190], 58, 50, -0.4, 60, CAT89.line, 0.6, 0.8, seed + 1, 0.08));
  for (const sd of [-1, 1]) sb(path(pl, [[sd * 30, -230], [sd * 48, -292], [sd * 10, -244]], 22, CAT89.line, 0.8, 0.86));
  for (const sd of [-1, 1]) sb(ring(pl, [sd * 22, -188], 14, 12, 0, 34, CAT89.eye, 0.9, 0.95, seed + 3 + sd, 0));
  sb(ring(pl, [0, -100], 30, 40, 0.2, 60, CAT89.line, 0.25, 0.45, seed + 5, 0.1));
  sb(path(pl, bez([26, -78], [74, -96], [64, -168], 10), 30, CAT89.line, 0.3, 0.55));
  for (const sd of [-1, 1]) sb(path(pl, [[sd * 14, -62], [sd * 16, 0]], 14, CAT89.line, 0, 0.2));
  return S;
}

// ───────────────────────── shared layers ─────────────────────────
function floorAndHaze(o: Float32Array) {
  for (let i = 0; i < NF; i++) {
    const r = 4 + 128 * Math.pow(h1(i, 1), 1.55), a = h1(i, 2) * Math.PI * 2;
    put(o, i, [Math.cos(a) * r, G + gs(i, 3) * 0.12, Math.sin(a) * r * 0.85 - 10], CAT89.haze, 0.05 * h1(i, 4));
  }
  for (let i = NF; i < IW0; i++) {
    const r = 46 + 120 * Math.pow(h1(i, 1), 0.7), u = h1(i, 2) * 2 - 1, a = h1(i, 3) * Math.PI * 2, s = Math.sqrt(1 - u * u);
    put(o, i, [Math.cos(a) * s * r, u * r * 0.55 + 6, Math.sin(a) * s * r - 20], CAT89.haze, h1(i, 4));
  }
}
/** unused particles wait far out in the dark (they fly in when a crowd or a copy needs them) */
export function farHaze(o: Float32Array, start: number, end: number) {
  for (let i = start; i < end; i++) {
    const r = 170 + 140 * h1(i, 11), u = h1(i, 12) * 2 - 1, a = h1(i, 13) * Math.PI * 2, s = Math.sqrt(1 - u * u);
    put(o, i, [Math.cos(a) * s * r, u * r * 0.45 + 10, Math.sin(a) * s * r - 40], CAT89.far, h1(i, 14));
  }
}
/** light sparkle dust in a box around the figures (fills the gaps between them) */
export function sparkle(o: Float32Array, start: number, end: number, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  for (let i = start; i < end; i++) put(o, i, [x0 + (x1 - x0) * h1(i, 21), y0 + (y1 - y0) * Math.pow(h1(i, 22), 1.4), z0 + (z1 - z0) * h1(i, 23)], CAT89.haze, h1(i, 24));
}

// ───────────────────────── the shapes ─────────────────────────
// the fight needs more moves than the 2D warrior had: a guard, an overhead strike and a low sweep
const P: Record<string, Pose> = {
  ...W_POSES,
  guard: { head: [4, -262], neck: [2, -232], pelvis: [0, -118], sh: [[-22, -222], [24, -222]], el: [[-50, -186], [52, -188]], ha: [[-38, -160], [44, -162]], hip: [[-13, -116], [13, -118]], kn: [[-58, -62], [58, -64]], ft: [[-88, 0], [90, 0]], staff: [[196, -168], [-196, -156]] },
  overhead: { head: [-6, -288], neck: [-4, -256], pelvis: [0, -136], sh: [[-26, -246], [20, -248]], el: [[-58, -292], [46, -296]], ha: [[-40, -338], [30, -342]], hip: [[-12, -134], [14, -136]], kn: [[-52, -70], [42, -72]], ft: [[-82, 0], [72, 0]], staff: [[-214, -362], [196, -322]] },
  sweep: { head: [-40, -172], neck: [-32, -148], pelvis: [-10, -82], sh: [[-50, -140], [-10, -144]], el: [[-92, -112], [30, -118]], ha: [[-132, -82], [70, -92]], hip: [[-22, -80], [6, -82]], kn: [[-70, -42], [100, -26]], ft: [[-60, 0], [192, 0]], staff: [[-334, -32], [152, -122]] },
  // the army's salute: the right hand lifts the staff high, the head comes up
  raise: { head: [2, -302], neck: [0, -268], pelvis: [0, -150], sh: [[-22, -258], [22, -262]], el: [[-32, -202], [46, -318]], ha: [[-28, -150], [52, -378]], hip: [[-12, -148], [12, -148]], kn: [[-16, -74], [16, -74]], ft: [[-30, 0], [30, 0]], staff: [[58, -500], [46, -140]] },
};
const HERO: Place = { x: 0, z: 0, s: 1 };
const crowdPlaces = (): Place[] =>
  Array.from({ length: 16 }, (_, m) => {
    const th = -1.3 + (2.6 * m) / 15;
    const R = 40 + (m % 2) * 9;
    const x = R * Math.sin(th), z = -R * Math.cos(th) * 0.85 - 4;
    return { x, z, s: 0.42 + 0.04 * h1(m, 2), rot: Math.atan2(-x, -z) }; // each one faces the warrior
  });

function heroWith(pose: Pose, others: (o: Float32Array) => void) {
  return () => {
    const o = new Float32Array(N * 4);
    floorAndHaze(o);
    fillStrands(o, IW0, IW1, warriorFull(HERO, pose), 7);
    others(o);
    return o;
  };
}
const crowd = (pose: Pose, glow = false) => (o: Float32Array) => {
  const pl = crowdPlaces();
  const per = Math.floor((N - IO0) / pl.length);
  pl.forEach((p, m) => fillStrands(o, IO0 + m * per, m === pl.length - 1 ? N : IO0 + (m + 1) * per, warriorLite(p, pose, false, 30 + m, 0, 1, glow), 40 + m));
};
/** "They left": every member of the crowd turns its back and walks away into the dark */
const crowdAway = (o: Float32Array) => {
  const pl = crowdPlaces().map((p) => ({ x: p.x * 1.75, z: p.z * 1.75 - 12, s: p.s * 0.95, rot: (p.rot ?? 0) + Math.PI }));
  const per = Math.floor((N - IO0) / pl.length);
  pl.forEach((p, m) => fillStrands(o, IO0 + m * per, m === pl.length - 1 ? N : IO0 + (m + 1) * per, warriorLite(p, P.leave, false, 30 + m), 40 + m));
};
/** spare light waiting close behind him (copies then form from nearby dust, not from streaks across the frame) */
const nearHaze = (o: Float32Array) => {
  for (let i = IO0; i < N; i++) {
    const a = h1(i, 81) * Math.PI * 2, r = 30 + 55 * Math.pow(h1(i, 82), 0.8);
    put(o, i, [Math.cos(a) * r, G + 4 + 46 * Math.pow(h1(i, 83), 1.3), -Math.abs(Math.sin(a)) * r - 12], CAT89.far, h1(i, 84));
  }
};
/** "they left": each member of the crowd lifts away as faint dust above where it stood */
const crowdGone = (o: Float32Array) => {
  const pl = crowdPlaces();
  const per = Math.floor((N - IO0) / pl.length);
  pl.forEach((p, m) => {
    const s = IO0 + m * per, e = m === pl.length - 1 ? N : s + per;
    for (let i = s; i < e; i++) put(o, i, [p.x + gs(i, 71) * 5, G + 14 + 55 * Math.pow(h1(i, 72), 0.8), p.z + gs(i, 73) * 5], CAT89.far, h1(i, 74));
  });
};

/** the clapping crowd (clapA hands apart / clapB hands together, lit) around the fighting warrior */
const fight = (hero: string, clap: string) => heroWith(P[hero], crowd(P[clap], clap === "clapB"));
/** the fight on the beats of "They clapped when I was fighting": eight moves, the crowd claps on every other beat */
export const FIGHT89: [string, string][] = [
  ["ready", "clapA"],
  ["thrust", "clapB"],
  ["slash", "clapA"],
  ["spin", "clapB"],
  ["overhead", "clapA"],
  ["sweep", "clapB"],
  ["guard", "clapA"],
  ["thrust", "clapB"],
];

function trio() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  fillStrands(o, IW0, IW1, warriorFull({ x: 34, z: 0, s: 0.95 }, P.rise), 7);
  const nS = Math.round((N - IO0) * 0.52), nC = Math.round((N - IO0) * 0.36);
  // singer first, then the cat, then the warrior (build order bands)
  fillStrands(o, IO0, IO0 + nS, singerHolo({ x: -42, z: -2, s: 0.9 }, 51, false, 0, 0.33), 51);
  fillStrands(o, IO0 + nS, IO0 + nS + nC, catHolo({ x: -2, z: 8, s: 0.8 }, 52, false, 0.33, 0.33), 52);
  sparkle(o, IO0 + nS + nC, N, -70, 70, G, G + 50, -20, 20);
  // the warrior part builds last
  for (let i = IW0; i < IW1; i++) o[i * 4 + 3] = Math.floor(o[i * 4 + 3]) + (0.66 + 0.34 * fr(o[i * 4 + 3])) * 0.999;
  return o;
}
/** everything falls into a pool of light on the floor: ripple rings + a hot centre */
function pool() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const radii = [2.5, 7, 13, 21, 31, 43, 57, 72];
  for (let i = IW0; i < N; i++) {
    const q = h1(i, 31);
    if (q < 0.12) {
      const r = Math.abs(gs(i, 32)) * 2.2;
      const a = h1(i, 33) * Math.PI * 2;
      put(o, i, [Math.cos(a) * r, G + Math.abs(gs(i, 34)) * 1.2, Math.sin(a) * r], CAT89.hi, h1(i, 35));
    } else {
      const ri = Math.min(radii.length - 1, Math.floor(Math.pow(h1(i, 36), 0.8) * radii.length));
      const r = radii[ri] + gs(i, 37) * 0.35;
      const a = h1(i, 38) * Math.PI * 2;
      put(o, i, [Math.cos(a) * r, G + gs(i, 39) * 0.08, Math.sin(a) * r], ri < 3 ? CAT89.hi : CAT89.line, ri / radii.length);
    }
  }
  return o;
}
/** "a thousand different places": rows of light warriors that rise out of the pool, the centre first. Fewer and
 *  bigger than the first test (117 figures of ~470 particles read as columns of dust): 55 figures in a wedge of
 *  five rows, ~1000 particles each, so the front rows read as bodies and the back rows fall into the depth */
// odd and even row lengths alternate, so every row stands in the gaps of the one in front (aligned columns left a
// see-through aisle down the middle of the frame)
const ARMY_ROWS: [number, number][] = [[6, 7], [-28, 8], [-62, 11], [-96, 12], [-130, 15]];
function armyPlaces() {
  const out: { pl: Place; d: number; m: number }[] = [];
  ARMY_ROWS.forEach(([z0, n]) => {
    for (let c = 0; c < n; c++) {
      const m = out.length;
      const x = (c - (n - 1) / 2) * 22 + (h1(m, 41) - 0.5) * 6;
      const z = z0 + (h1(m, 42) - 0.5) * 6;
      const centre = z0 === 6 && c === (n - 1) / 2;
      out.push({ pl: { x, z, s: centre ? 0.92 : 0.8 + 0.05 * h1(m, 43), rot: centre ? 0 : (h1(m, 44) - 0.5) * 0.5 }, d: Math.hypot(x, (z - 6) * 0.9), m });
    }
  });
  return out;
}
const armyRange = (m: number, n: number) => {
  const per = Math.floor((N - IW0) / n);
  return [IW0 + m * per, m === n - 1 ? N : IW0 + (m + 1) * per];
};
/** the same rows in one pose (index-stable: the wave of raised staffs moves arms, not dots) */
const armyWith = (pose: Pose) => () => {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const places = armyPlaces();
  const dMax = Math.max(...places.map((p) => p.d));
  places.forEach((p) => {
    const [s, e] = armyRange(p.m, places.length);
    fillStrands(o, s, e, warriorLite(p.pl, pose, true, 60 + p.m, (p.d / dMax) * 0.82, 0.18), 60 + p.m);
  });
  return o;
};
/** "watch me": the pool's rings run out over the floor and settle as a puddle of light where each warrior will
 *  stand (then every body rises straight up out of its own puddle — short vertical flights, no streaks across the
 *  frame) */
function armySeed() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const places = armyPlaces();
  const dMax = Math.max(...places.map((p) => p.d));
  places.forEach((p) => {
    const [s, e] = armyRange(p.m, places.length);
    const b = (p.d / dMax) * 0.9;
    for (let i = s; i < e; i++) {
      const r = 3.4 * Math.sqrt(h1(i, 91)) * p.pl.s, a = h1(i, 92) * Math.PI * 2;
      put(o, i, [p.pl.x + Math.cos(a) * r, G + 0.15 + Math.abs(gs(i, 93)) * 0.25, p.pl.z + Math.sin(a) * r * 0.9], r > 2.7 * p.pl.s ? CAT89.hi : CAT89.line, b + 0.1 * h1(i, 94));
    }
  });
  return o;
}
/** the stone hits: the glass body breaks into pieces that fly apart from the impact. Cells around points on the
 *  body; every piece moves and tilts as one, so the cracks between them read as broken glass (the first test's
 *  turbulent flight read as a puffball) */
function shattered(base: () => Float32Array, hit: V3, push: V3, seed: number) {
  return () => {
    const o = base();
    // the body = the hero and both sets of cracks (a crack that is still dark moves with its piece too)
    const idx: number[] = [];
    for (let i = IW0; i < IO0 + 2 * NCR; i++) idx.push(i);
    const vis = idx.filter((i) => {
      const cat = Math.floor(o[i * 4 + 3] + 1e-4);
      return cat !== CAT89.haze && cat !== CAT89.far;
    });
    const NS = 64;
    const cells: V3[] = [];
    for (let s = 0; s < NS; s++) {
      const i = vis[Math.floor(h1(s, seed) * vis.length)];
      cells.push([o[i * 4], o[i * 4 + 1], o[i * 4 + 2]]);
    }
    const mv = cells.map((c, s) => {
      const dx = c[0] - hit[0], dy = c[1] - hit[1], dz = c[2] - hit[2];
      const L = Math.hypot(dx, dy, dz) || 1;
      // close to the impact the pieces fly far; the feet barely move (he still stands)
      const r = (2.5 + 11 / (1 + L / 8)) * (0.7 + 0.6 * h1(s, seed + 1));
      const f = 4 / (1 + L / 12);
      const d: V3 = [(dx / L) * r + push[0] * f + gs(s, seed + 2) * 0.8, (dy / L) * r * 0.7 + 1.2 + gs(s, seed + 3) * 0.8, (dz / L) * r + push[2] * f + gs(s, seed + 4) * 0.8];
      let ax: V3 = [gs(s, seed + 5), gs(s, seed + 6), gs(s, seed + 7)];
      const al = Math.hypot(...ax) || 1;
      ax = [ax[0] / al, ax[1] / al, ax[2] / al];
      const ang = (0.2 + 0.45 * h1(s, seed + 8)) * (h1(s, seed + 9) < 0.5 ? -1 : 1) / (1 + L / 20);
      return { d, ax, cs: Math.cos(ang), sn: Math.sin(ang) };
    });
    for (const i of idx) {
      const x = o[i * 4], y = o[i * 4 + 1], z = o[i * 4 + 2];
      let best = 0, bd = 1e18;
      for (let s = 0; s < NS; s++) {
        const e = (x - cells[s][0]) ** 2 + (y - cells[s][1]) ** 2 + (z - cells[s][2]) ** 2;
        if (e < bd) {
          bd = e;
          best = s;
        }
      }
      const c = cells[best], m = mv[best];
      // tilt about the cell's point (Rodrigues), then move the piece
      const v: V3 = [x - c[0], y - c[1], z - c[2]];
      const k = m.ax, kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
      const cx: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
      for (let a = 0; a < 3; a++) o[i * 4 + a] = c[a] + v[a] * m.cs + cx[a] * m.sn + k[a] * kv * (1 - m.cs) + m.d[a];
    }
    return o;
  };
}
/** particles per stone's cracks (they live right after the hero: [IO0, IO0+NCR) stone 1, then stone 2) */
const NCR = 3500;
const segD = (p: V3, a: V3, b: V3) => {
  const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2));
  return Math.hypot(p[0] - a[0] - ab[0] * u, p[1] - a[1] - ab[1] * u, p[2] - a[2] - ab[2] * u);
};
/** cracks in glass: a spider-web of bright jagged lines on the front of his body around where a stone hit —
 *  radial cracks with short cross-cracks between them. Drawn in the camera's picture plane and laid onto the
 *  body's front surface (the nearest-to-camera body point under each vertex), so they cut across the wireframe's
 *  own lines (a first version walked along the body's points and vanished into the grid) */
function crackStrands(o: Float32Array, hit: V3, seed: number): Strand[] {
  const [tip, butt] = P.ready.staff;
  const sa = toW(HERO, butt[0], butt[1], 12), sb = toW(HERO, tip[0], tip[1], 12);
  const az = 0.36; // the cameras of the stones shot look from the front-right
  const cd: V3 = [Math.sin(az), 0, Math.cos(az)]; // towards the camera
  const ux: V3 = [Math.cos(az), 0, -Math.sin(az)]; // the picture's right
  const C = 1.0;
  const grid = new Map<number, { u: number; v: number; d: number }[]>();
  const key = (u: number, v: number) => (Math.floor(u / C) + 500) + 1000 * (Math.floor(v / C) + 500);
  for (let i = IW0; i < IW1; i++) {
    if (Math.floor(o[i * 4 + 3] + 1e-4) !== CAT89.line) continue;
    const p: V3 = [o[i * 4], o[i * 4 + 1], o[i * 4 + 2]];
    if (segD(p, sa, sb) < 1.2) continue; // not on the staff
    const u = p[0] * ux[0] + p[2] * ux[2], v = p[1], d = p[0] * cd[0] + p[2] * cd[2];
    const k = key(u, v);
    const l = grid.get(k);
    if (l) l.push({ u, v, d });
    else grid.set(k, [{ u, v, d }]);
  }
  // the body's front surface under a picture point (null = off the body)
  const surf = (u: number, v: number): V3 | null => {
    let best = -1e9, n = 0;
    for (let du = -2; du <= 2; du++)
      for (let dv = -2; dv <= 2; dv++) {
        const l = grid.get(key(u + du * C, v + dv * C));
        if (!l) continue;
        for (const q of l)
          if ((q.u - u) ** 2 + (q.v - v) ** 2 < 2.4) {
            n++;
            if (q.d > best) best = q.d;
          }
      }
    if (n < 6) return null;
    const d = best + 0.12;
    return [ux[0] * u + cd[0] * d, v, ux[2] * u + cd[2] * d];
  };
  let rs = 0;
  const R = () => h1(seed * 131 + rs++, 5.3);
  const S: Strand[] = [];
  const add = (pts: V3[]) => {
    if (pts.length < 2) return;
    let len = 0;
    for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1], pts[j][2] - pts[j - 1][2]);
    S.push({ pts, n: Math.max(4, Math.round(len * 10)), cat: CAT89.hi, th: 0.04, b0: 0, b1: 1 });
  };
  const walk = (u0: number, v0: number, a0: number, steps: number, depth: number) => {
    let u = u0, v = v0, a = a0;
    const first = surf(u, v);
    if (!first) return;
    const pts: V3[] = [first];
    for (let s = 0; s < steps; s++) {
      a += (R() - 0.5) * 0.65;
      const L = (depth ? 0.8 : 1.1) + 0.8 * R();
      const nu = u + Math.cos(a) * L, nv = v + Math.sin(a) * L;
      const q = surf(nu, nv);
      if (!q) break;
      u = nu;
      v = nv;
      pts.push(q);
      // the web: short cross-cracks between the radial ones, close to the impact
      if (depth < 1 && s <= 4 && R() < 0.5) {
        const sg = R() < 0.5 ? -1 : 1;
        walk(u, v, a + sg * (Math.PI / 2 + (R() - 0.5) * 0.5), 1 + Math.round(2 * R()), depth + 1);
      }
    }
    add(pts);
  };
  const u0 = hit[0] * ux[0] + hit[2] * ux[2], v0 = hit[1];
  const nC = 11;
  for (let c = 0; c < nC; c++) walk(u0, v0, (c / nC) * Math.PI * 2 + R() * 0.45, 4 + Math.round(5 * R()), 0);
  return S;
}
/** "I'm made of glass": the warrior, and the cracks the stones leave in him. `lit` = which stones have hit so far
 *  (a crack that has not happened yet waits dark, on the body, where it will open) */
function glassWith(lit: [boolean, boolean]) {
  return () => {
    const o = new Float32Array(N * 4);
    floorAndHaze(o);
    fillStrands(o, IW0, IW1, warriorFull(HERO, P.ready), 7);
    const spare = new Float32Array(N * 4);
    nearHaze(spare);
    o.set(spare.subarray(IO0 * 4), IO0 * 4);
    STONE_HITS.forEach((h, k) => {
      const s = IO0 + k * NCR;
      fillStrands(o, s, s + NCR, crackStrands(o, h.at, 900 + k * 37), 70 + k);
      if (!lit[k]) for (let i = s; i < s + NCR; i++) o[i * 4 + 3] = CAT89.far + fr(o[i * 4 + 3]);
    });
    return o;
  };
}
/** "I multiply": eight copies step out behind him in a V */
function legion() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  fillStrands(o, IW0, IW1, warriorFull(HERO, P.rise), 7);
  const spots: V2[] = [];
  for (let k = 1; k <= 4; k++) for (const sd of [-1, 1]) spots.push([sd * 17 * k, -15 * k]);
  const per = Math.floor((N - IO0) / spots.length);
  spots.forEach(([x, z], m) => fillStrands(o, IO0 + m * per, m === spots.length - 1 ? N : IO0 + (m + 1) * per, warriorLite({ x, z, s: 0.9 - 0.03 * Math.floor(m / 2) }, m % 4 < 2 ? P.rise : P.ready, true, 80 + m, (Math.floor(m / 2) / 4) * 0.7, 0.3), 80 + m));
  return o;
}
/** the finale: rows of all three of them (singers, cats, warriors) */
function crowd3() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const places = crowd3Places();
  const per = Math.floor((N - IW0) / places.length);
  places.forEach((p, m) => fillStrands(o, IW0 + m * per, m === places.length - 1 ? N : IW0 + (m + 1) * per, p.fn(p.pl, 90 + m, (p.row / 6) * 0.8, 0.2), 90 + m));
  return o;
}
/** the finale's rows first appear as puddles of light (like the army), then rise out of them */
function crowd3Seed() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const places = crowd3Places();
  const per = Math.floor((N - IW0) / places.length);
  places.forEach((p, m) => {
    const s = IW0 + m * per, e = m === places.length - 1 ? N : s + per;
    for (let i = s; i < e; i++) {
      const r = 3.4 * Math.sqrt(h1(i, 95)) * p.pl.s, a = h1(i, 96) * Math.PI * 2;
      put(o, i, [p.pl.x + Math.cos(a) * r, G + 0.15 + Math.abs(gs(i, 97)) * 0.25, p.pl.z + Math.sin(a) * r * 0.9], r > 2.7 * p.pl.s ? CAT89.hi : CAT89.line, (p.row / 6) * 0.8 + 0.2 * h1(i, 98));
    }
  });
  return o;
}
function crowd3Places() {
  const places: { fn: (pl: Place, seed: number, bOff: number, bScale: number) => Strand[]; pl: Place; row: number }[] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 9; c++) {
      const x = (c - 4) * 30 + (r % 2) * 15 + (h1(r * 9 + c, 51) - 0.5) * 6;
      const z = 16 - r * 38;
      const type = (c + r) % 3;
      const s = 0.62 + 0.06 * h1(r * 9 + c, 52);
      const fn = type === 0 ? (pl: Place, seed: number, bO: number, bS: number) => warriorLite(pl, c % 2 ? P.rise : P.ready, true, seed, bO, bS) : type === 1 ? (pl: Place, seed: number, bO: number, bS: number) => singerHolo(pl, seed, true, bO, bS) : (pl: Place, seed: number, bO: number, bS: number) => catHolo(pl, seed, true, bO, bS);
      places.push({ fn, pl: { x, z, s: type === 2 ? s * 0.95 : s }, row: r });
    }
  return places;
}
/** the title in light (sampled from the font) */
let wordPts: { x: number; y: number; edge: boolean }[] | null = null;
export function setWordFont(family: string) {
  const W = 1600, H = 320;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.font = `400 210px ${family}, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // letter-spaced like the 2D title
  const text = "LIGHT"; // a title in particles (swap for yours)
  const ws = text.split("").map((ch) => g.measureText(ch).width);
  const track = 46;
  const tot = ws.reduce((a, b) => a + b, 0) + track * (text.length - 1);
  let x = W / 2 - tot / 2;
  text.split("").forEach((ch, i) => {
    g.fillText(ch, x + ws[i] / 2, H / 2 + 8);
    x += ws[i] + track;
  });
  const d = g.getImageData(0, 0, W, H).data;
  const A = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3]);
  const pts: { x: number; y: number; edge: boolean }[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (A(x, y) > 128) pts.push({ x, y, edge: A(x - 3, y) < 128 || A(x + 3, y) < 128 || A(x, y - 3) < 128 || A(x, y + 3) < 128 });
  wordPts = pts;
}
function word() {
  const o = new Float32Array(N * 4);
  floorAndHaze(o);
  const pts = wordPts ?? [{ x: 800, y: 160, edge: true }];
  const edges = pts.filter((p) => p.edge), fill = pts.filter((p) => !p.edge);
  for (let i = IW0; i < N; i++) {
    const useEdge = h1(i, 61) < 0.55 && edges.length > 0;
    const src = useEdge ? edges : fill.length ? fill : edges;
    const p = src[Math.floor(h1(i, 62) * src.length)];
    const X = ((p.x - 800) / 1600) * 170 + gs(i, 63) * 0.05, Y = 4 - ((p.y - 160) / 320) * 34 + gs(i, 64) * 0.05;
    put(o, i, [X, Y, gs(i, 65) * 0.35], useEdge ? CAT89.hi : CAT89.line, h1(i, 66));
  }
  return o;
}

export const SHAPES89 = ["cloud", "seed", "w_ready", "w_rise", ...FIGHT89.map((_, i) => `f${i}`), "w_walk", "w_kneel", "trio", "pool", "army_seed", "army", "army_up", "w_steady", "w_shatA", "w_glassA", "w_shatB", "w_glassB", "legion", "crowd3_seed", "crowd3", "word"] as const;
// where the two stones hit him (world units; he stands at the origin, feet on G) and which way they push
export const STONE_HITS: { at: V3; push: V3 }[] = [
  { at: [-3, 6, 3], push: [0.9, 0, -0.4] },
  { at: [3, 0, 3], push: [-0.95, 0, 0.3] },
];
export const GEN89: Record<string, () => Float32Array> = {
  w_ready: heroWith(P.ready, nearHaze),
  w_rise: heroWith(P.rise, nearHaze),
  ...Object.fromEntries(FIGHT89.map(([h, c], i) => [`f${i}`, fight(h, c)])),
  w_walk: heroWith(P.kneel, crowdAway),
  w_kneel: heroWith(P.kneel, crowdGone),
  trio,
  pool,
  army_seed: armySeed,
  army: armyWith(P.rise),
  army_up: armyWith(P.raise),
  w_steady: glassWith([false, false]),
  w_shatA: shattered(glassWith([true, false]), STONE_HITS[0].at, STONE_HITS[0].push, 301),
  w_glassA: glassWith([true, false]),
  w_shatB: shattered(glassWith([true, true]), STONE_HITS[1].at, STONE_HITS[1].push, 337),
  w_glassB: glassWith([true, true]),
  legion,
  crowd3_seed: crowd3Seed,
  crowd3,
  word,
};
// brightness of one particle per shape (dense shapes need less, or they burn white)
export const DENS89: Record<string, number> = { cloud: 1.1, seed: 0.06, w_ready: 0.46, w_rise: 0.46, ...Object.fromEntries(FIGHT89.map((_, i) => [`f${i}`, 0.44])), w_walk: 0.44, w_kneel: 0.46, trio: 0.5, pool: 0.32, army_seed: 0.1, army: 0.78, army_up: 0.78, crowd3_seed: 0.1, w_steady: 0.46, w_shatA: 0.46, w_glassA: 0.46, w_shatB: 0.46, w_glassB: 0.46, legion: 0.46, crowd3: 0.62, word: 0.55 };

/** where the staff's hot tip is in a pose of the fight (world units; for the sparks on the beat) */
export const staffTip = (pose: string): V3 => {
  const [tip] = P[pose].staff;
  return toW(HERO, tip[0], tip[1], 12);
};
