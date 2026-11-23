// Light Swarm Epic · the film's particle shapes: the light-logo set (with your logo as data) + the light-swarm base shapes (tree, diamond, phoenix, crown) + new ones.
// Every generator fills all N particles: xyz + w = category + build order × 0.999 (see styles/light-swarm/shapes.ts).
// Categories used here beyond the base ones: 7 globe arcs · 8 lighthouse beams · 12 sound-wave bars · 13 lighthouse sea
// · 14 screen glow (windows, phone screen) · 3 rocket exhaust (flame).
import { CAT, N, bez2, bez3, circle, fillPaths, haze, jit, put, sphere, type Path, type V3 } from "../../light-swarm/shapes";
import { rng } from "../../light-swarm/math";
import { LIGHT_EXTRA as EXTRA24, LIGHT_SHAPES as SHAPES24 } from "../../light-logo/lib/shapes";
import LAND from "./data/land1.json";
import PAINT from "./data/paint.json";
import W_AI from "./data/w-AI.json";
import W_YOU from "./data/w-YOU.json";
import W_VIRAL from "./data/w-VIRAL.json";
import W_LIVE from "./data/w-LIVE.json";

const R = rng(4141);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = R();
  while (v === 0) v = R();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const X: V3 = [1, 0, 0];
const Y: V3 = [0, 1, 0];
const Z: V3 = [0, 0, 1];
const PI = Math.PI;
const flat = (pts: [number, number][], z = 0): V3[] => pts.map(([x, y]) => [x, y, z]);
const seg = (a: V3, b: V3, n = 2): V3[] => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / (n - 1), a[1] + ((b[1] - a[1]) * i) / (n - 1), a[2] + ((b[2] - a[2]) * i) / (n - 1)]);
const L = (pts: V3[], b0: number, b1: number, thick = 0.07, w = 1, cat: number = CAT.line): Path => ({ pts, b0, b1, cat, thick, w });
/** flat symbol: paths + a few hot points + a faint haze around it */
const symbol = (paths: Path[], hi: V3[], hiR: number, nHi = 1800, nPath = 56000) => {
  const o = new Float32Array(N * 4);
  let i = fillPaths(o, 0, nPath - nHi, paths);
  for (let k = 0; k < nHi; k++, i++) put(o, i, jit(hi[k % hi.length], hiR), CAT.highlight, R());
  haze(o, i, N, 50, 130, 0.6);
  return o;
};
/** a solid of revolution: profile [r, y] revolved into meridians + rings */
const lathe = (prof: [number, number][], c: V3, b0: number, b1: number, mer = 20, rings = prof.length, thick = 0.05): Path[] => {
  const out: Path[] = [];
  for (let m = 0; m < mer; m++) {
    const a = (m / mer) * PI * 2;
    out.push(L(prof.map(([r, y]) => [c[0] + Math.cos(a) * r, c[1] + y, c[2] + Math.sin(a) * r] as V3), b0, b1, thick, 0.6));
  }
  for (let k = 0; k < rings; k++) {
    const [r, y] = prof[Math.floor((k / rings) * prof.length)];
    if (r > 0.2) out.push(L(circle([c[0], c[1] + y, c[2]], r, X, Z, 48), b0 + ((b1 - b0) * k) / rings, b0 + ((b1 - b0) * (k + 1)) / rings, thick, 0.9));
  }
  return out;
};

// ─────────────── the Earth: land from 1° cells, a faint graticule, glowing cities and arcs between them
const sph = (lon: number, lat: number, r: number): V3 => {
  const a = (lon * PI) / 180;
  const b = (lat * PI) / 180;
  return [Math.cos(b) * Math.sin(a) * r, Math.sin(b) * r, Math.cos(b) * Math.cos(a) * r];
};
const CITIES: [number, number][] = [
  [51.4, 35.7], [-74, 40.7], [-0.1, 51.5], [2.35, 48.86], [139.7, 35.7], [-118.2, 34], [37.6, 55.8], [116.4, 39.9], [77.2, 28.6], [55.3, 25.2],
  [-46.6, -23.5], [151.2, -33.9], [31.2, 30], [28.98, 41], [103.8, 1.35], [-99.1, 19.4], [18.4, -33.9], [-79.4, 43.7], [126.98, 37.6], [13.4, 52.5],
  [-122.4, 37.8], [100.5, 13.75], [-58.4, -34.6], [3.4, 6.5], [36.8, -1.3], [121.5, 31.2], [-3.7, 40.4], [12.5, 41.9], [-87.6, 41.9], [44.4, 33.3],
];
export const GLOBE_R = 26;
function globe() {
  const o = new Float32Array(N * 4);
  const Rg = GLOBE_R;
  const nl = LAND.length / 2;
  let i = 0;
  for (let k = 0; k < 34000; k++, i++) {
    const j = Math.floor(R() * nl);
    const lon = LAND[j * 2] + (R() - 0.5);
    const lat = LAND[j * 2 + 1] + (R() - 0.5);
    put(o, i, sph(lon, lat, Rg + gauss() * 0.06), CAT.line, (lon + 180) / 360);
  }
  const grat: Path[] = [];
  for (let lon = -180; lon < 180; lon += 30) grat.push(L(Array.from({ length: 41 }, (_, k) => sph(lon, -90 + (k * 180) / 40, Rg * 1.002)), 0, 1, 0.03, 1, CAT.haze));
  for (let lat = -60; lat <= 60; lat += 30) grat.push(L(Array.from({ length: 73 }, (_, k) => sph(-180 + k * 5, lat, Rg * 1.002)), 0, 1, 0.03, 1, CAT.haze));
  i = fillPaths(o, i, 7000, grat);
  for (const [lon, lat] of CITIES) for (let k = 0; k < 90; k++, i++) put(o, i, jit(sph(lon, lat, Rg * 1.01), 0.22), CAT.highlight, 0.6 + R() * 0.1);
  // arcs: great circles lifted off the surface, drawn last (the build runs along each arc)
  const arcs: Path[] = [];
  for (let k = 0; k < CITIES.length; k++) {
    const a = CITIES[k];
    const b = CITIES[(k * 7 + 3) % CITIES.length];
    const pa = sph(a[0], a[1], 1);
    const pb = sph(b[0], b[1], 1);
    const pts: V3[] = [];
    for (let s = 0; s <= 40; s++) {
      const u = s / 40;
      const v: V3 = [pa[0] * (1 - u) + pb[0] * u, pa[1] * (1 - u) + pb[1] * u, pa[2] * (1 - u) + pb[2] * u];
      const l = Math.hypot(...v) || 1;
      const h = Rg * (1.01 + 0.22 * Math.sin(PI * u));
      pts.push([(v[0] / l) * h, (v[1] / l) * h, (v[2] / l) * h]);
    }
    arcs.push(L(pts, 0.7 + (k / CITIES.length) * 0.25, 0.75 + (k / CITIES.length) * 0.25, 0.05, 1, 7));
  }
  i = fillPaths(o, i, 9000, arcs);
  haze(o, i, N, 40, 130, 0.6);
  return o;
}

// ─────────────── the web: nodes in a ball, each wired to its nearest neighbours; it spreads from the centre out
function web() {
  const o = new Float32Array(N * 4);
  const nodes: V3[] = [];
  while (nodes.length < 150) {
    const p = sphere(Math.pow(R(), 0.45) * 34);
    p[1] *= 0.72;
    if (nodes.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > 4.2)) nodes.push(p);
  }
  nodes.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const bo = (p: V3) => Math.min(1, Math.hypot(...p) / 36);
  const paths: Path[] = [];
  nodes.forEach((a, ia) => {
    const near = nodes
      .map((b, ib) => ({ b, ib, d: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }))
      .filter((x) => x.ib > ia)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    for (const { b } of near) paths.push(L(seg(a, b, 12), bo(a), bo(b), 0.05));
  });
  let i = fillPaths(o, 0, 38000, paths);
  for (const p of nodes) {
    for (let k = 0; k < 90; k++, i++) put(o, i, jit(p, 0.3), CAT.highlight, bo(p));
    i = fillPaths(o, i, 40, [L(circle(p, 1.3, X, Y, 18), bo(p), bo(p) + 0.02, 0.04)]);
  }
  haze(o, i, N, 40, 120, 0.65);
  return o;
}

// ─────────────── a voice: 120 bars (category 12: the shader makes them talk), a baseline, two faint echo lines
function wave() {
  const o = new Float32Array(N * 4);
  const n = 120;
  let i = 0;
  for (let j = 0; j < n; j++) {
    const x = -60 + (120 * j) / (n - 1);
    const env = Math.pow(Math.sin((PI * j) / (n - 1)), 0.7) * (0.55 + 0.45 * Math.abs(Math.sin(j * 0.37) * Math.cos(j * 0.11)));
    const h = 2 + env * 17;
    for (let k = 0; k < 380; k++, i++) put(o, i, [x + gauss() * 0.08, (R() * 2 - 1) * h, gauss() * 0.1], 12, j / (n - 1));
  }
  i = fillPaths(o, i, 4000, [L(flat([[-62, 0], [62, 0]]), 0, 1, 0.04)]);
  for (const y of [-24, 24]) i = fillPaths(o, i, 2200, [L(Array.from({ length: 61 }, (_, k) => [-60 + k * 2, y + Math.sin(k * 0.5) * 0.8, 0] as V3), 0, 1, 0.04, 0.4, CAT.haze)]);
  haze(o, i, N, 50, 130, 0.6);
  return o;
}

// ─────────────── a page being written: lines of words, left → right, top → bottom, a caret at the end
function page() {
  const paths: Path[] = [];
  const lines = 9;
  const W0 = -30;
  let total = 0;
  const words: { x0: number; x1: number; y: number }[] = [];
  for (let l = 0; l < lines; l++) {
    let x = W0 + (l === 0 ? 0 : 0);
    const y = 18 - l * 4.6;
    const end = l === lines - 1 ? 2 : 30;
    while (x < end) {
      const w = 2.5 + R() * 7;
      if (x + w > 30) break;
      words.push({ x0: x, x1: x + w, y });
      x += w + 1.4;
    }
  }
  total = words.length;
  words.forEach((w, k) => paths.push(L(flat([[w.x0, w.y], [w.x1, w.y]]), k / total, (k + 1) / total, 0.28, 1)));
  // the sheet's edge and a title bar
  paths.push(L(flat([[-34, 25], [34, 25], [34, -25], [-34, -25], [-34, 25]]), 0, 0.15, 0.05, 0.5));
  paths.push(L(flat([[-30, 22.5], [-6, 22.5]]), 0, 0.05, 0.5, 0.8));
  const last = words[words.length - 1];
  return symbol(paths, [[last.x1 + 1.6, last.y, 0]], 0.5, 1200);
}

// ─────────────── </>
function code() {
  const paths: Path[] = [
    L(flat([[-12, 14], [-26, 0], [-12, -14]]), 0, 0.35, 0.12, 1.4),
    L(flat([[12, 14], [26, 0], [12, -14]]), 0.65, 1, 0.12, 1.4),
    L(flat([[5, 19], [-5, -19]]), 0.35, 0.65, 0.12, 1.4),
  ];
  for (let k = 0; k < 6; k++) paths.push(L(flat([[-40 + k * 2, -26 - k * 0.0], [-28 + k * 9, -26]]), 0.8, 1, 0.04, 0.3, CAT.haze));
  return symbol(paths, [[-26, 0, 0], [26, 0, 0]], 0.7, 1400);
}

// ─────────────── The Great Wave (Hokusai, 1831, public domain): edge points of the print, built left → right
export const PAINT_W = 96;
function paint() {
  const o = new Float32Array(N * 4);
  const P = PAINT as number[];
  const n = P.length / 3;
  // weighted draw: strong edges more often
  const cum = new Float32Array(n);
  let s = 0;
  for (let k = 0; k < n; k++) cum[k] = s += 0.3 + P[k * 3 + 2] / 255;
  let i = 0;
  const pick = () => {
    const v = R() * s;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cum[m] < v) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  for (let k = 0; k < 56000; k++, i++) {
    const j = pick();
    const x = P[j * 3] * PAINT_W * 0.5;
    const y = P[j * 3 + 1] * PAINT_W * 0.5;
    const strong = P[j * 3 + 2] > 150;
    put(o, i, [x + gauss() * 0.05, y + gauss() * 0.05, gauss() * 0.15 + (x > 0 ? -1 : 1) * 0.0], strong ? CAT.highlight : CAT.line, (P[j * 3] + 1) / 2);
  }
  haze(o, i, N, 50, 130, 0.5);
  return o;
}

// ─────────────── music: a staff of five lines, a clef-like curl and a phrase of notes
function notes() {
  const paths: Path[] = [];
  for (let l = 0; l < 5; l++) paths.push(L(flat([[-44, -8 + l * 4], [44, -8 + l * 4]]), 0, 0.25, 0.04, 0.8));
  paths.push(L(bez3([-38, -14, 0], [-30, 2, 0], [-46, 14, 0], [-38, 20, 0], 40), 0.15, 0.3, 0.09, 1.2));
  paths.push(L(bez3([-38, 20, 0], [-32, 10, 0], [-34, -2, 0], [-41, -2, 0], 30), 0.2, 0.32, 0.09, 1.2));
  const ys = [-6, 0, 4, -2, 6, 2, -4, 8];
  ys.forEach((y, k) => {
    const x = -24 + k * 9;
    const b = 0.35 + (k / ys.length) * 0.6;
    const head = Array.from({ length: 26 }, (_, a) => {
      const t = (a / 25) * PI * 2;
      const cx = Math.cos(t) * 2.2;
      const cy = Math.sin(t) * 1.45;
      return [x + cx * 0.94 - cy * 0.34, y + cx * 0.34 + cy * 0.94, 0] as V3;
    });
    paths.push(L(head, b, b + 0.04, 0.1, 1.2));
    paths.push(L(flat([[x + 2, y + 0.5], [x + 2, y + 13]]), b, b + 0.04, 0.07, 1));
    if (k % 2 === 0 && k + 1 < ys.length) paths.push(L(flat([[x + 2, y + 13], [x + 11, ys[k + 1] + 13]]), b + 0.04, b + 0.08, 0.2, 1.2));
  });
  return symbol(paths, ys.map((y, k) => [-24 + k * 9, y, 0] as V3), 0.9, 1600);
}

// ─────────────── an eye: lids, iris fibres, the pupil and a catch-light
function eye() {
  const paths: Path[] = [
    L(bez3([-34, 0, 0], [-16, 17, 0], [16, 17, 0], [34, 0, 0], 60), 0, 0.3, 0.1, 1.5),
    L(bez3([-34, 0, 0], [-16, -15, 0], [16, -15, 0], [34, 0, 0], 60), 0, 0.3, 0.1, 1.5),
    L(circle([0, 0, 0], 11.5, X, Y, 80), 0.3, 0.55, 0.09, 1.3),
    L(circle([0, 0, 0], 5, X, Y, 50), 0.55, 0.7, 0.1, 1.2),
  ];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * PI * 2;
    paths.push(L([[Math.cos(a) * 5.6, Math.sin(a) * 5.6, 0], [Math.cos(a + 0.12) * 11, Math.sin(a + 0.12) * 11, 0]], 0.55, 0.9, 0.04, 0.35));
  }
  for (let k = 0; k < 11; k++) {
    const u = 0.12 + (k / 10) * 0.76;
    const x = -34 + 68 * u;
    const y = 0.75 * 17 * Math.sin(PI * u) * 0.98;
    paths.push(L([[x, y, 0], [x + (u - 0.5) * 6, y + 5, 0]], 0.25, 0.32, 0.05, 0.5));
  }
  return symbol(paths, [[3.2, 3.2, 0], [0, 0, 0]], 1.1, 1800);
}

// ─────────────── chess (1997): a board in perspective and a king, revolved from a profile
function chess() {
  const o = new Float32Array(N * 4);
  const S = 6;
  const y0 = -14;
  const paths: Path[] = [];
  for (let k = 0; k <= 8; k++) {
    paths.push(L([[-4 * S + k * S, y0, -4 * S], [-4 * S + k * S, y0, 4 * S]], 0, 0.4, 0.04, 0.8));
    paths.push(L([[-4 * S, y0, -4 * S + k * S], [4 * S, y0, -4 * S + k * S]], 0, 0.4, 0.04, 0.8));
  }
  let i = fillPaths(o, 0, 12000, paths);
  for (let a = 0; a < 8; a++)
    for (let b = 0; b < 8; b++) {
      if ((a + b) % 2) continue;
      for (let k = 0; k < 120; k++, i++) put(o, i, [-4 * S + (a + R()) * S, y0 + gauss() * 0.04, -4 * S + (b + R()) * S], CAT.haze, 0.1 + ((a + b) / 14) * 0.3);
    }
  const king: [number, number][] = [[6, 0], [6.2, 1], [4.6, 2.2], [3.2, 4], [2.6, 9], [2.4, 14], [3.8, 15.2], [2.6, 16.4], [3.4, 19.5], [2.2, 21.5], [0.4, 22.2]];
  const kp = lathe(king, [3, y0, 3], 0.4, 0.9, 22, 11, 0.05);
  kp.push(L([[3, y0 + 22, 3], [3, y0 + 28, 3]], 0.9, 1, 0.12, 1.5), L([[0.6, y0 + 25.6, 3], [5.4, y0 + 25.6, 3]], 0.92, 1, 0.12, 1.5));
  const pawn: [number, number][] = [[4.2, 0], [4.3, 0.8], [3, 1.8], [2, 3.5], [1.6, 7], [2.6, 8], [1.4, 8.8], [2.4, 10.6], [2, 12.2], [0.6, 13]];
  const pp = lathe(pawn, [-15, y0, -9], 0.45, 0.85, 18, 10, 0.05);
  i = fillPaths(o, i, 30000, [...kp, ...pp]);
  for (let k = 0; k < 900; k++, i++) put(o, i, jit([3, y0 + 25.6, 3], 0.6), CAT.highlight, 0.95);
  haze(o, i, N, 45, 130, 0.5);
  return o;
}

// ─────────────── Go (2016): a 19×19 grid and the stones of a game, placed in order
function goboard() {
  const o = new Float32Array(N * 4);
  const S = 3;
  const h = 9 * S;
  const y0 = -10;
  const paths: Path[] = [];
  for (let k = 0; k < 19; k++) {
    paths.push(L([[-h + k * S, y0, -h], [-h + k * S, y0, h]], 0, 0.3, 0.035, 0.7));
    paths.push(L([[-h, y0, -h + k * S], [h, y0, -h + k * S]], 0, 0.3, 0.035, 0.7));
  }
  let i = fillPaths(o, 0, 16000, paths);
  const stones: [number, number, number][] = [];
  const taken = new Set<string>();
  while (stones.length < 70) {
    const a = Math.round(9 + gauss() * 4.2);
    const b = Math.round(9 + gauss() * 4.2);
    if (a < 0 || a > 18 || b < 0 || b > 18 || taken.has(`${a},${b}`)) continue;
    taken.add(`${a},${b}`);
    stones.push([a, b, stones.length % 2]);
  }
  stones.forEach(([a, b, white], k) => {
    const c: V3 = [-h + a * S, y0 + 0.6, -h + b * S];
    const bo = 0.3 + (k / stones.length) * 0.68;
    if (white) for (let q = 0; q < 380; q++, i++) { const p = sphere(1.25); put(o, i, [c[0] + p[0], c[1] + p[1] * 0.45, c[2] + p[2]], CAT.highlight, bo); }
    else i = fillPaths(o, i, 380, [L(circle(c, 1.25, X, Z, 24), bo, bo + 0.01, 0.06), L(circle([c[0], c[1] + 0.35, c[2]], 0.8, X, Z, 16), bo, bo + 0.01, 0.05)]);
  });
  haze(o, i, N, 45, 130, 0.5);
  return o;
}

// ─────────────── a rocket on its pad, the plume (category 3) is animated in the shader
function rocket() {
  const o = new Float32Array(N * 4);
  const body: [number, number][] = [[0, 34], [1.2, 32.5], [2.8, 29], [4, 24], [4.4, 18], [4.4, -14], [4.6, -16], [4.6, -20]];
  const paths = lathe(body, [0, 0, 0], 0.1, 0.9, 24, 8, 0.045);
  for (const s of [-1, 1]) {
    const bst: [number, number][] = [[0, 8], [1.1, 6.5], [1.7, 3], [1.8, -18], [2.2, -21]];
    paths.push(...lathe(bst, [s * 6.6, 0, 0], 0.05, 0.6, 14, 5, 0.04));
  }
  for (const a of [0, PI / 2, PI, PI * 1.5]) {
    const d: V3 = [Math.cos(a), 0, Math.sin(a)];
    paths.push(L([[d[0] * 4.4, -10, d[2] * 4.4], [d[0] * 8.5, -18, d[2] * 8.5], [d[0] * 8.5, -21, d[2] * 8.5], [d[0] * 4.6, -20, d[2] * 4.6]], 0.6, 0.8, 0.06, 1.2));
  }
  // launch tower
  for (const [x, z] of [[-13, -3], [-13, 3], [-19, -3], [-19, 3]]) paths.push(L([[x, -22, z], [x, 30, z]], 0, 0.3, 0.05, 0.8));
  for (let k = 0; k < 13; k++) {
    const y = -22 + k * 4.2;
    paths.push(L([[-13, y, -3], [-19, y, 3]], 0, 0.3, 0.03, 0.3), L([[-13, y, 3], [-19, y, -3]], 0, 0.3, 0.03, 0.3));
  }
  paths.push(L([[-13, 18, 0], [-4.6, 18, 0]], 0.3, 0.35, 0.05, 0.6), L([[-13, 6, 0], [-4.6, 6, 0]], 0.3, 0.35, 0.05, 0.6));
  let i = fillPaths(o, 0, 44000, paths);
  for (let k = 0; k < 9000; k++, i++) {
    const r = Math.pow(R(), 0.6);
    const y = -22 - r * 26;
    const w = 2 + r * 9;
    put(o, i, [gauss() * w * 0.45, y, gauss() * w * 0.45], CAT.flame, R());
  }
  for (let k = 0; k < 1400; k++, i++) put(o, i, jit([0, -21, 0], 1.6), CAT.highlight, 0.95);
  haze(o, i, N, 45, 130, 0.6);
  return o;
}

// ─────────────── a planet (Mars): craters and dust bands on a sphere, a small moon on its orbit
function planet() {
  const o = new Float32Array(N * 4);
  const Rp = 22;
  let i = 0;
  const craters: [V3, number][] = Array.from({ length: 26 }, () => [sphere(1) as V3, 0.06 + R() * 0.16]);
  while (i < 40000) {
    const d = sphere(1) as V3;
    const band = 0.5 + 0.5 * Math.sin(d[1] * 9 + Math.sin(d[0] * 4) * 1.5);
    let rim = 0;
    for (const [c, r] of craters) {
      const ang = Math.acos(Math.max(-1, Math.min(1, d[0] * c[0] + d[1] * c[1] + d[2] * c[2])));
      rim = Math.max(rim, Math.exp(-(((ang - r) / 0.012) ** 2)));
    }
    if (R() > 0.12 + 0.35 * band + 0.9 * rim) continue;
    put(o, i++, [d[0] * Rp, d[1] * Rp, d[2] * Rp], rim > 0.5 ? CAT.highlight : CAT.line, (Math.atan2(d[0], d[2]) + PI) / (2 * PI));
  }
  i = fillPaths(o, i, 4000, [L(circle([0, 0, 0], Rp * 1.7, X, [0, 0.25, 0.97], 120), 0.8, 1, 0.03, 1, CAT.haze)]);
  for (let k = 0; k < 700; k++, i++) { const p = sphere(1.8); put(o, i, [Rp * 1.7 + p[0], p[1], p[2]], CAT.line, 0.95); }
  haze(o, i, N, 40, 130, 0.6);
  return o;
}

// ─────────────── a phone with a video on it: frame, a playing clip (category 14 glows), the like / comment / share rail
function phone() {
  const paths: Path[] = [];
  const w = 15;
  const h = 31;
  const r = 3.2;
  const rr = (x0: number, y0: number, x1: number, y1: number, rad: number): V3[] => {
    const pts: [number, number][] = [];
    const corner = (cx: number, cy: number, a0: number) => {
      for (let k = 0; k <= 8; k++) {
        const a = a0 + (k / 8) * (PI / 2);
        pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
      }
    };
    corner(x1 - rad, y1 - rad, 0);
    corner(x0 + rad, y1 - rad, PI / 2);
    corner(x0 + rad, y0 + rad, PI);
    corner(x1 - rad, y0 + rad, PI * 1.5);
    pts.push(pts[0]);
    return flat(pts);
  };
  paths.push(L(rr(-w, -h, w, h, r), 0, 0.3, 0.1, 1.6));
  paths.push(L(rr(-w + 1.4, -h + 1.4, w - 1.4, h - 1.4, r - 1), 0.1, 0.35, 0.04, 0.6));
  paths.push(L(flat([[-3.5, h - 2.6], [3.5, h - 2.6]]), 0.3, 0.35, 0.25, 0.8));
  // the play triangle and the progress bar
  paths.push(L(flat([[-4, 6], [-4, -6], [6.5, 0], [-4, 6]]), 0.4, 0.55, 0.1, 1.5));
  paths.push(L(flat([[-11, -22], [11, -22]]), 0.55, 0.6, 0.05, 0.5));
  paths.push(L(flat([[-11, -22], [2, -22]]), 0.6, 0.7, 0.16, 1));
  // the rail: heart, bubble, arrow
  const hx = 10.5;
  paths.push(L(Array.from({ length: 41 }, (_, k) => { const t = (k / 40) * PI * 2; return [hx + 0.13 * 16 * Math.sin(t) ** 3, 6 + 0.13 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)), 0] as V3; }), 0.7, 0.8, 0.07, 1));
  paths.push(L(circle([hx, 0, 0], 1.9, X, Y, 24), 0.8, 0.85, 0.06, 0.8));
  paths.push(L(flat([[hx - 1.8, -7], [hx + 1.8, -5.5], [hx - 1.8, -4]]), 0.85, 0.9, 0.06, 0.8));
  paths.push(L(flat([[-11, -16], [-1, -16]]), 0.9, 1, 0.12, 0.6), L(flat([[-11, -18.6], [-5, -18.6]]), 0.9, 1, 0.08, 0.4));
  const o = symbol(paths, [[0, 0, 0]], 2.6, 900, 40000);
  // the screen's own light: a soft glow of the playing clip
  let i = 40000;
  for (let k = 0; k < 9000; k++, i++) put(o, i, [(R() * 2 - 1) * (w - 2), (R() * 2 - 1) * (h - 2), -0.4], 14, R());
  return o;
}

// ─────────────── a heart (a like), outline + two inner echoes
function heart() {
  const H = (s: number, z = 0): V3[] => Array.from({ length: 121 }, (_, k) => { const t = (k / 120) * PI * 2; return [s * 16 * Math.sin(t) ** 3, s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 2, z] as V3; });
  return symbol([L(H(1.45), 0, 0.5, 0.12, 1.6), L(H(1.1), 0.3, 0.7, 0.06, 0.7), L(H(0.75), 0.5, 0.9, 0.05, 0.4)], [[0, 2, 0]], 6, 1200);
}

// ─────────────── a lighthouse on a rock: striped tower, lamp, two turning beams (8), the sea (13)
function lighthouse() {
  const o = new Float32Array(N * 4);
  const paths: Path[] = [];
  const prof: [number, number][] = [[5.2, -16], [4.6, -4], [3.9, 8], [3.4, 17]];
  paths.push(...lathe(prof, [0, 0, 0], 0, 0.5, 18, 4, 0.05));
  for (let k = 0; k < 5; k++) paths.push(L(circle([0, -13 + k * 6, 0], 5 - k * 0.38, X, Z, 40), k / 10, k / 10 + 0.1, 0.08, 1));
  paths.push(L(circle([0, 17.5, 0], 5, X, Z, 40), 0.5, 0.55, 0.06, 1), ...lathe([[3.2, 17.5], [3.2, 22], [2.2, 24.5], [0.2, 26]], [0, 0, 0], 0.55, 0.65, 14, 4, 0.05));
  for (let k = 0; k < 7; k++) paths.push(L(bez2([-26 + k * 8, -17, 0], [-22 + k * 8, -19 - R() * 3, 2], [-18 + k * 8, -17, 0], 12), 0, 0.2, 0.08, 0.8));
  let i = fillPaths(o, 0, 30000, paths);
  for (let k = 0; k < 2200; k++, i++) put(o, i, jit([0, 20, 0], 1.0), CAT.highlight, 0.7);
  for (let k = 0; k < 9000; k++, i++) { const u = Math.pow(R(), 0.7); put(o, i, [u * 70, 20 + gauss() * u * 2.2, gauss() * u * 2.2], 8, R() < 0.5 ? 0 : 0.5); }
  for (let k = 0; k < 12000; k++, i++) { const x = -60 + R() * 120; const z = -30 + R() * 40; put(o, i, [x, -18, z], 13, R()); }
  haze(o, i, N, 45, 140, 0.5);
  return o;
}

// ─────────────── a skyline in three depth layers, windows light up (category 14 flickers)
function skyline() {
  const o = new Float32Array(N * 4);
  const paths: Path[] = [];
  const wins: V3[] = [];
  let x = -58;
  let k = 0;
  while (x < 58) {
    const w = 3.5 + R() * 6;
    const z = [-10, 0, 8][k % 3] + gauss();
    const h = 8 + Math.pow(R(), 1.6) * (z < -5 ? 40 : z < 4 ? 30 : 18);
    const y0 = -18;
    const b = (x + 58) / 116;
    paths.push(L([[x, y0, z], [x, y0 + h, z], [x + w, y0 + h, z], [x + w, y0, z]], b * 0.7, b * 0.7 + 0.2, 0.05, 0.9));
    if (R() < 0.18) paths.push(L([[x + w / 2, y0 + h, z], [x + w / 2, y0 + h + 6 + R() * 6, z]], b * 0.7 + 0.2, b * 0.7 + 0.25, 0.05, 0.7));
    for (let wy = y0 + 1.5; wy < y0 + h - 1; wy += 1.6) for (let wx = x + 0.8; wx < x + w - 0.6; wx += 1.3) if (R() < 0.32) wins.push([wx, wy, z + 0.05]);
    x += w + 0.4 + R() * 1.5;
    k++;
  }
  paths.push(L([[-62, -18, 0], [62, -18, 0]], 0, 0.3, 0.05, 1));
  let i = fillPaths(o, 0, 30000, paths);
  for (let q = 0; q < 22000; q++, i++) { const p = wins[q % wins.length]; put(o, i, jit(p, 0.12), 14, (p[0] + 58) / 116); }
  haze(o, i, N, 50, 140, 0.45);
  return o;
}

// ─────────────── a crowd of tiny light figures, wide and deep, facing us
function crowd() {
  const o = new Float32Array(N * 4);
  let i = 0;
  const people: V3[] = [];
  for (let r = 0; r < 14; r++)
    for (let c = 0; c < 34; c++) people.push([-66 + c * 4 + (r % 2) * 2 + gauss() * 0.6, -16 + r * 0.6, -r * 4.5 + gauss() * 0.5]);
  const per = Math.floor(52000 / people.length);
  people.forEach((p, k) => {
    const bo = Math.min(1, Math.hypot(p[0], p[2] + 30) / 75);
    const s = 0.9 + R() * 0.25;
    for (let q = 0; q < per; q++, i++) {
      const u = R();
      let pt: V3;
      if (u < 0.32) { const d = sphere(1); pt = [p[0] + d[0] * 0.75 * s, p[1] + 4.3 * s + d[1] * 0.75 * s, p[2] + d[2] * 0.75 * s]; }
      else { const a = R() * PI * 2; const y = R(); const w = (0.5 + 0.9 * Math.sin(PI * Math.min(1, y * 1.3))) * s; pt = [p[0] + Math.cos(a) * w, p[1] + y * 3.4 * s, p[2] + Math.sin(a) * w * 0.6]; }
      put(o, i, pt, u < 0.32 ? CAT.highlight : CAT.line, bo);
    }
    if (k % 9 === 0) for (let q = 0; q < 60; q++, i++) put(o, i, jit([p[0] + 1.4, p[1] + 6.4 * s, p[2] + 0.4], 0.28), 14, bo); // a raised phone
  });
  haze(o, i, N, 50, 150, 0.45);
  return o;
}

// ─────────────── a 1950s television set: cabinet, round-cornered screen (14 glows), knobs, rabbit ears
function tv() {
  const paths: Path[] = [
    L(flat([[-24, -16], [24, -16], [24, 17], [-24, 17], [-24, -16]]), 0, 0.3, 0.1, 1.5),
    L(flat([[-22, 13], [8, 13], [10, 11], [10, -11], [8, -13], [-22, -13], [-24 + 2, 11]]), 0.3, 0.5, 0.08, 1.2),
    L(circle([17, 6, 0], 2.6, X, Y, 30), 0.5, 0.6, 0.08, 1),
    L(circle([17, -3, 0], 2.6, X, Y, 30), 0.55, 0.65, 0.08, 1),
    L(flat([[14, -11], [20, -11]]), 0.6, 0.65, 0.06, 0.8),
    L(flat([[-14, -16], [-17, -22]]), 0.65, 0.7, 0.08, 1),
    L(flat([[14, -16], [17, -22]]), 0.65, 0.7, 0.08, 1),
    L(flat([[-2, 17], [-12, 32]]), 0.7, 0.85, 0.06, 0.9),
    L(flat([[2, 17], [13, 31]]), 0.7, 0.85, 0.06, 0.9),
  ];
  const o = symbol(paths, [[-12, 32, 0], [13, 31, 0]], 0.5, 600, 42000);
  let i = 42000;
  for (let k = 0; k < 9000; k++, i++) put(o, i, [-21 + R() * 30, -12 + R() * 24, -0.3], 14, R());
  return o;
}

// ─────────────── particle words (Anton, traced): edges + scan-line fill (category 9), built left → right
type WordPts = { w: number; h: number; box: number[]; edges: number[]; runs: number[] };
const word = (P: WordPts, height = 26) => () => {
  const o = new Float32Array(N * 4);
  const [x0, y0, x1, y1] = P.box;
  const s = height / (y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const toW = (x: number, y: number): V3 => [(x - cx) * s, (cy - y) * s, 0];
  const bx = (x: number) => Math.min(1, Math.max(0, (x - x0) / (x1 - x0) + gauss() * 0.01));
  const E = P.edges;
  const ne = E.length / 2;
  let i = 0;
  for (let k = 0; k < 34000; k++, i++) {
    const j = Math.floor(R() * ne);
    const x = E[j * 2] + (R() - 0.5);
    const y = E[j * 2 + 1] + (R() - 0.5);
    put(o, i, jit(toW(x, y), 0.05), CAT.line, bx(x));
  }
  const RU = P.runs;
  const lens: number[] = [];
  let tot = 0;
  for (let k = 0; k < RU.length; k += 3) {
    tot += RU[k + 2] - RU[k + 1];
    lens.push(tot);
  }
  for (let k = 0; k < 18000; k++, i++) {
    const v = R() * tot;
    let j = 0;
    while (lens[j] < v) j++;
    const y = RU[j * 3];
    const x = RU[j * 3 + 1] + R() * (RU[j * 3 + 2] - RU[j * 3 + 1]);
    put(o, i, jit(toW(x, y), 0.04), 9, bx(x));
  }
  haze(o, i, N, 45, 130, 0.5);
  return o;
};

export const EPIC_SHAPES = [
  ...SHAPES24,
  "tree", "diamond", "phoenix", "crown",
  "globe", "web", "wave", "page", "code", "paint", "notes", "eye", "chess", "goboard",
  "rocket", "planet", "phone", "heart", "lighthouse", "skyline", "crowd", "tv",
  "wAI", "wYOU", "wVIRAL", "wLIVE",
] as const;
export type EpicShape = (typeof EPIC_SHAPES)[number];
export const EPIC_EXTRA = {
  ...EXTRA24,
  globe, web, wave, page, code, paint, notes, eye, chess, goboard, rocket, planet, phone, heart, lighthouse, skyline, crowd, tv,
  wAI: word(W_AI as WordPts, 30), wYOU: word(W_YOU as WordPts, 30), wVIRAL: word(W_VIRAL as WordPts, 24), wLIVE: word(W_LIVE as WordPts, 30),
};
