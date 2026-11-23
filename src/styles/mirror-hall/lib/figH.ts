// Mirror Hall · the people, made of light (the light-swarm engine): the heroine in a long dress
// with long hair, the faces she trusted, her mother, and her copies. Same index layout as the light world of the first
// version: [floor glow | air motes | heroine (30 000) | others (25 036)], every strand a fixed share, so a morph between
// two shapes moves her body (a turn, a reach, a step) instead of reshuffling dots.
import { N, put, type V3 } from "../../light-swarm/shapes";
import {
  CAT89, G, IO0, IW0, IW1, NF, NH, PR, bez, fillStrands, gs, h1, hand3, hb, head3, lerp2, part, path, ring, toW, warriorLite,
  type Place, type Pose, type Strand, type V2,
} from "./base/shapes89";
import { W_POSES } from "./base/moon89";
import { A as APO } from "./archH";

export const CATH = { ...CAT89, warm: 6, glass: 7, aura: 8 } as const;

// ───────────────────────── her poses (pose space: ~285 tall, y up is negative, the floor at 0) ─────────────────────────
export type PoseF = Pose & { hair?: V2; hairZ?: number; skirt?: { c: V2; rx: number; rz: number }; armZ?: [number, number] };
const st = (p: Partial<PoseF>): PoseF => ({ ...STAND, ...p });
const STAND: PoseF = {
  head: [0, -282], neck: [0, -252], pelvis: [0, -146],
  sh: [[-19, -240], [19, -240]], el: [[-25, -192], [25, -192]], ha: [[-24, -146], [24, -146]],
  hip: [[-13, -144], [13, -144]], kn: [[-9, -72], [9, -72]], ft: [[-10, 0], [10, 0]], staff: [[0, 0], [0, 0]],
  hair: [-4, 150],
};
const mirrorX = (p: PoseF): PoseF => {
  const m = (v: V2): V2 => [-v[0], v[1]];
  return {
    ...p, head: m(p.head), neck: m(p.neck), pelvis: m(p.pelvis),
    sh: [m(p.sh[1]), m(p.sh[0])], el: [m(p.el[1]), m(p.el[0])], ha: [m(p.ha[1]), m(p.ha[0])],
    hip: [m(p.hip[1]), m(p.hip[0])], kn: [m(p.kn[1]), m(p.kn[0])], ft: [m(p.ft[1]), m(p.ft[0])],
    hair: p.hair ? m(p.hair) : undefined, skirt: p.skirt ? { ...p.skirt, c: m(p.skirt.c) } : undefined,
  };
};
const SIT: PoseF = {
  head: [0, -162], neck: [-2, -132], pelvis: [0, -34],
  sh: [[-20, -122], [18, -122]], el: [[-36, -70], [28, -84]], ha: [[-46, -7], [16, -58]],
  hip: [[-13, -34], [13, -34]], kn: [[46, -16], [54, -12]], ft: [[-6, -4], [6, -3]], staff: [[0, 0], [0, 0]],
  hair: [-10, 118], skirt: { c: [14, -2], rx: 62, rz: 48 },
};
const D1: PoseF = st({
  pelvis: [6, -146], hip: [[-7, -144], [19, -142]], kn: [[-4, -72], [18, -74]], ft: [[-10, 0], [16, 0]],
  neck: [2, -252], head: [-6, -281], sh: [[-17, -238], [21, -242]],
  el: [[-50, -214], [44, -282]], ha: [[-22, -196], [16, -330]], hair: [-24, 140],
});
export const HP: Record<string, PoseF> = {
  stand: STAND,
  sit: SIT,
  sitUp: { ...SIT, head: [4, -168], neck: [0, -136], hair: [-14, 112] },
  sitEnd: { ...SIT, ha: [[-12, -60], [14, -58]], el: [[-30, -84], [28, -84]], head: [2, -160] },
  kneelCry: {
    head: [14, -170], neck: [8, -152], pelvis: [0, -66],
    sh: [[-14, -142], [26, -144]], el: [[-10, -110], [34, -112]], ha: [[8, -158], [22, -158]],
    hip: [[-13, -66], [13, -66]], kn: [[-12, -6], [12, -6]], ft: [[-14, 0], [14, 0]], staff: [[0, 0], [0, 0]],
    hair: [16, 118], skirt: { c: [0, -2], rx: 52, rz: 44 },
  },
  rise: st({ head: [0, -284], el: [[-34, -196], [34, -196]], ha: [[-44, -154], [44, -154]] }),
  hold: st({ el: [[-24, -200], [24, -200]], ha: [[-15, -236], [15, -236]] }),
  drop: st({ head: [0, -288], el: [[-50, -228], [50, -228]], ha: [[-84, -252], [84, -252]], hair: [-6, 146] }),
  fly: st({ head: [0, -288], ft: [[-8, -7], [8, -7]], el: [[-66, -238], [66, -238]], ha: [[-124, -246], [124, -246]], hair: [-14, 140] }),
  Y: st({ head: [0, -286], el: [[-36, -282], [36, -282]], ha: [[-54, -332], [54, -332]], hair: [0, 150] }),
  d1: D1,
  d2: mirrorX(D1),
  d3: st({ pelvis: [-4, -146], head: [3, -282], el: [[-38, -284], [38, -284]], ha: [[-6, -338], [6, -338]], hair: [8, 146] }),
  d4: st({ pelvis: [-6, -146], hip: [[-19, -144], [7, -146]], el: [[-62, -234], [62, -234]], ha: [[-104, -262], [104, -210]], head: [4, -281], hair: [10, 146] }),
  d5: st({ el: [[-64, -236], [64, -236]], ha: [[-112, -232], [112, -232]], hair: [62, 92], skirt: { c: [0, -16], rx: 66, rz: 52 } }),
  d6: st({ pelvis: [-4, -144], el: [[-44, -172], [44, -262]], ha: [[-92, -132], [70, -306]], kn: [[-10, -72], [22, -70]], ft: [[-12, 0], [34, -20]], hair: [-18, 144] }),
  d7: st({ pelvis: [4, -146], neck: [-8, -250], head: [-16, -276], el: [[-44, -270], [30, -282]], ha: [[-80, -300], [4, -326]], hair: [-40, 130] }),
  d8: st({ head: [0, -276], el: [[-22, -188], [22, -188]], ha: [[-6, -214], [6, -214]] }),
  walk1: st({ kn: [[-14, -74], [14, -70]], ft: [[-24, 0], [22, -4]], el: [[-30, -192], [26, -192]], ha: [[-36, -148], [30, -146]], skirt: { c: [0, -8], rx: 40, rz: 32 } }),
  walk2: st({ kn: [[-14, -70], [14, -74]], ft: [[-22, -4], [24, 0]], el: [[-26, -192], [30, -192]], ha: [[-30, -146], [36, -148]], skirt: { c: [0, -8], rx: 40, rz: 32 } }),
  touch: {
    head: [24, -172], neck: [16, -148], pelvis: [0, -66],
    sh: [[0, -138], [32, -140]], el: [[-24, -120], [34, -66]], ha: [[-6, -110], [40, -4]],
    hip: [[-13, -66], [13, -66]], kn: [[-20, -4], [26, -58]], ft: [[-44, 0], [30, 0]], staff: [[0, 0], [0, 0]],
    hair: [20, 116], skirt: { c: [4, -2], rx: 56, rz: 46 },
  },
  offer: st({ el: [[-24, -194], [26, -214]], ha: [[-8, -210], [34, -232]], head: [2, -282], armZ: [0, 80] }),
  // her mother, kneeling behind her (both face the camera): hands forward on her shoulders, then around her
  motherKneel: {
    head: [0, -188], neck: [0, -160], pelvis: [0, -70],
    sh: [[-18, -150], [18, -150]], el: [[-26, -132], [26, -132]], ha: [[-20, -120], [20, -120]],
    hip: [[-13, -70], [13, -70]], kn: [[-12, -6], [12, -6]], ft: [[-14, 0], [14, 0]], staff: [[0, 0], [0, 0]],
    hair: [-4, 120], skirt: { c: [0, -2], rx: 50, rz: 42 }, armZ: [86, 86],
  },
  motherHug: {
    head: [10, -180], neck: [4, -156], pelvis: [0, -70],
    sh: [[-18, -146], [18, -146]], el: [[-30, -128], [30, -128]], ha: [[-7, -108], [7, -110]],
    hip: [[-13, -70], [13, -70]], kn: [[-12, -6], [12, -6]], ft: [[-14, 0], [14, 0]], staff: [[0, 0], [0, 0]],
    hair: [-10, 116], skirt: { c: [0, -2], rx: 50, rz: 42 }, armZ: [98, 98],
  },
  sitF: { ...SIT, ha: [[-30, -46], [12, -60]], head: [2, -164] },
};

// ───────────────────────── her body ─────────────────────────
function partZ(pl: Place, a: V2, b: V2, prof: (u: number) => number, nf: number, perF: number, nr: number, perR: number, dzA: number, dzB: number, seed: number, cat: number, bOff: number, bScale: number, k: number): Strand[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const P3 = (u: number, th: number): V3 => {
    const r = prof(u) * k;
    return toW(pl, a[0] + dx * u + nx * Math.cos(th) * r, a[1] + dy * u + ny * Math.cos(th) * r, dzA + (dzB - dzA) * u + Math.sin(th) * r);
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
/** her torso: hips → waist → bust → shoulders, as fibres + contour rings (a dress bodice) */
function torsoF(pl: Place, P: Pose, nf: number, perF: number, nr: number, perR: number, seed: number, bOff = 0, bScale = 1, k = 1): Strand[] {
  const top = lerp2(P.neck, P.pelvis, 0.04);
  const dx = top[0] - P.pelvis[0], dy = top[1] - P.pelvis[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const wd = (v: number) => (v < 0.15 ? 29 + 2 * (v / 0.15) : v < 0.42 ? 31 - 12 * ((v - 0.15) / 0.27) : v < 0.72 ? 19 + 5 * ((v - 0.42) / 0.3) : v < 0.9 ? 24 - 1 * ((v - 0.72) / 0.18) : 23 - 10 * ((v - 0.9) / 0.1));
  const dp = (v: number) => (v < 0.42 ? 18 - 5 * (v / 0.42) : v < 0.7 ? 13 + 5.5 * ((v - 0.42) / 0.28) : 18.5 - 9.5 * ((v - 0.7) / 0.3));
  const P3 = (v: number, th: number): V3 => {
    const w = wd(v) * k, d = dp(v) * k;
    return toW(pl, P.pelvis[0] + dx * v + nx * Math.cos(th) * w, P.pelvis[1] + dy * v + ny * Math.cos(th) * w, Math.sin(th) * d + Math.sin(Math.PI * v) * 3 * k);
  };
  const b0 = bOff + hb(P.pelvis[1]) * bScale, b1 = bOff + hb(top[1]) * bScale;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const th0 = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.15;
    out.push({ pts: Array.from({ length: 17 }, (_, i) => P3(i / 16, th0 + 0.15 * (i / 16))), n: perF, cat: CATH.line, th: 0.018 * pl.s, b0, b1 });
  }
  for (let r = 0; r < nr; r++) {
    const v = (r + 0.5) / nr;
    out.push({ pts: Array.from({ length: 33 }, (_, i) => P3(v, (i / 32) * Math.PI * 2)), n: perR, cat: CATH.line, th: 0.016 * pl.s, b0: b0 + (b1 - b0) * v, b1: b0 + (b1 - b0) * v });
  }
  return out;
}
/** the skirt: a bell of fibres from the waist to a folded hem (a ring that may lie on the floor around her) */
function skirtF(pl: Place, P: PoseF, nf: number, perF: number, nr: number, perR: number, seed: number, bOff = 0, bScale = 1, cat: number = CATH.line): Strand[] {
  const wc = lerp2(P.pelvis, P.neck, 0.3);
  const sk = P.skirt ?? { c: [(P.ft[0][0] + P.ft[1][0]) / 2, -6] as V2, rx: Math.max(34, Math.abs(P.ft[0][0] - P.ft[1][0]) / 2 + 22), rz: 30 };
  const wrx = 19, wrz = 13;
  const hem = (a: number): [number, number, number] => {
    const fold = 1 + 0.1 * Math.sin(a * 8 + seed) + 0.05 * Math.sin(a * 13 + seed * 2.1);
    return [sk.c[0] + Math.cos(a) * sk.rx * fold, sk.c[1], Math.sin(a) * sk.rz * fold];
  };
  const at = (a: number, u: number): V3 => {
    // bell: the hem is reached late (a soft A-line), with a little outward bulge half way down
    const [hx, hy, hz] = hem(a);
    const wx = wc[0] + Math.cos(a) * wrx, wz = Math.sin(a) * wrz, wy = wc[1];
    const e = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
    const bulge = Math.sin(Math.PI * u) * 0.08;
    // the fabric flows: each fibre sways a little along its length (a fold that moves down the skirt)
    const sw = Math.sin(u * Math.PI * 1.6 + a * 3 + seed) * 2.6 * u;
    const x = wx + (hx - wx) * e + sw * Math.cos(a + 1.2), z = wz + (hz - wz) * e + sw * Math.sin(a + 1.2) * 0.8;
    const cx = (wc[0] + sk.c[0]) / 2;
    return toW(pl, x + (x - cx) * bulge, wy + (hy - wy) * u, z * (1 + bulge));
  };
  const bW = bOff + hb(wc[1]) * bScale, bH = bOff + hb(sk.c[1]) * bScale;
  const out: Strand[] = [];
  for (let j = 0; j < nf; j++) {
    const a = (j / nf) * Math.PI * 2 + h1(seed, j) * 0.1;
    out.push({ pts: Array.from({ length: 15 }, (_, i) => at(a, i / 14)), n: perF, cat, th: 0.022 * pl.s, b0: bW, b1: bH });
  }
  for (let r = 0; r < nr; r++) {
    const u = r === nr - 1 ? 1 : (r + 1) / nr;
    out.push({ pts: Array.from({ length: 49 }, (_, i) => at((i / 48) * Math.PI * 2, u)), n: r === nr - 1 ? perR * 2 : perR, cat: r === nr - 1 ? CATH.hi : cat, th: 0.018 * pl.s, b0: bW + (bH - bW) * u, b1: bW + (bH - bW) * u });
  }
  return out;
}
/** long hair: strands from the crown over the back of the head, down her back to `hair` (an offset from the head) */
function hairF(pl: Place, P: PoseF, n: number, per: number, seed: number, bOff = 0, bScale = 1): Strand[] {
  const c = P.head;
  const tilt = Math.atan2(P.head[0] - P.neck[0], -(P.head[1] - P.neck[1]));
  const end = P.hair ?? [-4, 150];
  const back = P.hairZ ?? -16;
  const out: Strand[] = [];
  const hbh = hb(c[1]);
  for (let j = 0; j < n; j++) {
    const u = n > 1 ? j / (n - 1) : 0.5;
    const ang = -1.25 + 2.5 * u; // across the skull, ear to ear over the crown
    const rx = 19 * Math.sin(ang), rz = back * 0.4 - 6 * Math.cos(ang);
    const root: V2 = [c[0] + rx * Math.cos(tilt) + 24 * Math.sin(tilt), c[1] - 24 * Math.cos(tilt) + Math.abs(rx) * 0.6];
    const spread = (u - 0.5) * 26;
    const tip: V2 = [c[0] + end[0] + spread + (h1(seed, j) - 0.5) * 10, c[1] + end[1] * (0.82 + 0.3 * h1(seed + 3, j))];
    const mid: V2 = [c[0] + rx * 1.3 + end[0] * 0.25, c[1] + 18];
    const pts2 = bez(root, mid, tip, 16);
    const zr = rz, ze = back + (u - 0.5) * 18;
    const pts = pts2.map((p, i) => toW(pl, p[0], p[1], zr + (ze - zr) * (i / 16) + Math.sin(i * 0.7 + j) * 1.5));
    out.push({ pts, n: per, cat: j % 5 === 2 ? CATH.hi : CATH.line, th: 0.02 * pl.s, b0: bOff + (hbh - 0.02) * bScale, b1: bOff + hbh * bScale });
  }
  return out;
}
/** her face (towards +z): lips, the line of the nose, two eye glints */
function faceF(pl: Place, P: Pose, seed: number, bOff = 0, bScale = 1, lite = false): Strand[] {
  const c = P.head;
  const tilt = Math.atan2(P.head[0] - P.neck[0], -(P.head[1] - P.neck[1]));
  const R = (x: number, y: number): V2 => [c[0] + x * Math.cos(tilt) - y * Math.sin(tilt), c[1] + x * Math.sin(tilt) + y * Math.cos(tilt)];
  const b = bOff + hb(c[1]) * bScale;
  const out: Strand[] = [];
  const zf = 19;
  const lip = [R(-5, 13), R(0, 14.5), R(5, 13)].map((p) => toW(pl, p[0], p[1], zf - 1));
  out.push({ pts: lip, n: lite ? 8 : 40, cat: CATH.hi, th: 0.012 * pl.s, b0: b, b1: b });
  if (!lite) {
    out.push({ pts: [R(0, -2), R(0.5, 6)].map((p) => toW(pl, p[0], p[1], zf + 1.5)), n: 26, cat: CATH.line, th: 0.012 * pl.s, b0: b, b1: b });
    for (const s of [-1, 1]) out.push(ring(pl, R(s * 6.5, -4), 2.2, 1.2, 0, 22, CATH.eye, b, b, seed + s));
    // the brows
    for (const s of [-1, 1]) out.push({ pts: [R(s * 3, -9), R(s * 7, -10.5), R(s * 10.5, -9)].map((p) => toW(pl, p[0], p[1], zf - 1)), n: 16, cat: CATH.line, th: 0.01 * pl.s, b0: b, b1: b });
  }
  return out;
}

/** soft wide light along her spine, limbs and inside the skirt */
function auraF(pl: Place, P: PoseF, k: number, bOff = 0, bScale = 1): Strand[] {
  const out: Strand[] = [];
  const b = (y: number) => bOff + hb(y) * bScale;
  const seg = (a: V2, c: V2, n: number, th: number, dz = 0): Strand => ({ pts: [toW(pl, a[0], a[1], dz), toW(pl, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, dz), toW(pl, c[0], c[1], dz)], n: Math.round(n * k), cat: CATH.aura, th: th * pl.s, b0: b(a[1]), b1: b(c[1]) });
  out.push(seg(P.pelvis, P.neck, 700, 1.6));
  out.push(seg(P.neck, P.head, 260, 1.2));
  for (const sd of [0, 1] as const) {
    out.push(seg(P.sh[sd], P.el[sd], 160, 0.6, sd ? 8 : -8));
    out.push(seg(P.el[sd], P.ha[sd], 140, 0.5, sd ? 8 : -8));
  }
  const sk = P.skirt ?? { c: [(P.ft[0][0] + P.ft[1][0]) / 2, -6] as V2, rx: 34, rz: 30 };
  const wc = lerp2(P.pelvis, P.neck, 0.3);
  out.push(seg(wc, [sk.c[0], sk.c[1] - 4], 900, 2.6));
  return out;
}
/** the heroine at full detail (~30 000 particles in the hero range) */
export function heroine(pl: Place, P: PoseF, seed = 1, cat: number = CATH.line): Strand[] {
  const S: Strand[] = [];
  const k = 0.86; // a slimmer frame than the warrior's
  S.push(...torsoF(pl, P, 18, 220, 6, 150, seed + 1));
  S.push(...skirtF(pl, P, 44, 250, 3, 300, seed + 2, 0, 1, cat));
  S.push(...part(pl, lerp2(P.neck, P.pelvis, 0.05), lerp2(P.neck, P.head, 0.5), PR.neck, 6, 50, 3, 44, 0, seed + 4, cat, 0, 1, 0.8));
  S.push(...head3(pl, P, 8, 140, 5, 110, seed + 5, 0, 1, 0.9));
  S.push(...hairF(pl, P, 20, 210, seed + 6));
  S.push(...faceF(pl, P, seed + 7));
  // an aura: wide soft light inside her body (she glows, not a wireframe)
  S.push(...auraF(pl, P, 1));
  // a necklace and earrings: small warm glints
  S.push(ring(pl, lerp2(P.neck, P.pelvis, 0.12), 13, 4, 0, 90, CATH.tip, hb(P.neck[1]) - 0.03, hb(P.neck[1]) - 0.03, seed + 8));
  for (const sd of [0, 1] as const) {
    const dz = sd ? 9 : -9;
    const az = P.armZ ? P.armZ[sd] : 0;
    S.push(...partZ(pl, P.sh[sd], P.el[sd], PR.upper, 9, 80, 4, 60, dz, dz + az * 0.5, seed + 20 + sd, cat, 0, 1, k * 0.92));
    S.push(...partZ(pl, P.el[sd], P.ha[sd], PR.fore, 9, 70, 4, 50, dz + az * 0.5, dz + az, seed + 22 + sd, cat, 0, 1, k * 0.9));
    S.push(...hand3(pl, P.el[sd], P.ha[sd], dz + az, seed + 24 + sd, cat, 0, 1, 0.82));
    // legs: faint through the dress, the feet below the hem
    S.push(...part(pl, P.hip[sd], P.kn[sd], PR.thigh, 4, 50, 2, 40, dz * 0.6, seed + 26 + sd, cat, 0, 1, 0.78));
    S.push(...part(pl, P.kn[sd], P.ft[sd], PR.shin, 4, 50, 2, 40, dz * 0.6, seed + 28 + sd, cat, 0, 1, 0.78));
    const toe: V2 = [P.ft[sd][0] + (sd ? 18 : -18) * 0.3, P.ft[sd][1] - 1];
    S.push(...part(pl, P.ft[sd], [toe[0], toe[1]], PR.foot, 4, 30, 2, 26, dz * 0.6 + 8, seed + 30 + sd, cat, 0, 1, 0.75));
  }
  return S;
}
/** a lighter her (copies, the mother at a distance) */
export function heroineLite(pl: Place, P: PoseF, seed: number, bOff = 0, bScale = 1, cat: number = CATH.line): Strand[] {
  const S: Strand[] = [];
  S.push(...torsoF(pl, P, 5, 30, 3, 22, seed, bOff, bScale));
  S.push(...skirtF(pl, P, 10, 26, 3, 26, seed + 1, bOff, bScale, cat));
  S.push(...head3(pl, P, 3, 24, 2, 20, seed + 2, bOff, bScale, 0.9));
  S.push(...hairF(pl, P, 6, 24, seed + 3, bOff, bScale));
  for (const sd of [0, 1] as const) {
    const dz = sd ? 8 : -8;
    const az = P.armZ ? P.armZ[sd] : 0;
    S.push(...partZ(pl, P.sh[sd], P.el[sd], PR.upper, 3, 14, 1, 10, dz, dz + az * 0.5, seed + 4 + sd, cat, bOff, bScale, 0.8));
    S.push(...partZ(pl, P.el[sd], P.ha[sd], PR.fore, 3, 12, 1, 8, dz + az * 0.5, dz + az, seed + 6 + sd, cat, bOff, bScale, 0.78));
    S.push(...hand3(pl, P.el[sd], P.ha[sd], dz + az, seed + 8 + sd, cat, bOff, bScale, 0.8, true).map((h) => ({ ...h, n: Math.round(h.n * 0.3) })));
  }
  // a soft body of light, so a copy reads as a person at a distance (not a few lines and two bright hands)
  S.push(...auraF(pl, P, 0.11, bOff, bScale));
  return S;
}

// ───────────────────────── layers shared by every shape ─────────────────────────
/** floor glow under her + motes in the candle-lit air around her place */
export function airAround(o: Float32Array, c: [number, number], r = 1) {
  for (let i = 0; i < NF; i++) {
    const rr = (3 + 34 * Math.pow(h1(i, 1), 1.6)) * r, a = h1(i, 2) * Math.PI * 2;
    put(o, i, [c[0] + Math.cos(a) * rr, G + 0.15 + Math.abs(gs(i, 3)) * 0.1, c[1] + Math.sin(a) * rr], CATH.haze, 0.05 * h1(i, 4));
  }
  for (let i = NF; i < NF + NH; i++) {
    const rr = 20 + 90 * Math.pow(h1(i, 1), 0.7), u = h1(i, 2) * 2 - 1, a = h1(i, 3) * Math.PI * 2, s = Math.sqrt(1 - u * u);
    put(o, i, [c[0] + Math.cos(a) * s * rr, G + 30 + u * 46 + rr * 0.15, c[1] + Math.sin(a) * s * rr], CATH.haze, h1(i, 4));
  }
}
/** unused light waits outside the hall, behind the walls (hidden by them; it comes in through the mirrors) */
export function parked(o: Float32Array, start: number, end: number) {
  for (let i = start; i < end; i++) {
    const a = h1(i, 11) * Math.PI * 2, r = APO + 30 + 40 * h1(i, 12);
    put(o, i, [Math.sin(a) * r, G + 10 + 130 * h1(i, 13), -Math.cos(a) * r], CATH.far, h1(i, 14));
  }
}

// ───────────────────────── who is where ─────────────────────────
export type HerAt = { x: number; z: number; rot: number; s?: number };
export const herPlace = (h: HerAt): Place => ({ x: h.x, z: h.z, s: h.s ?? 1, rot: h.rot });

/** a shape = her (pose, place) + what the other 25 000 particles do */
export function shapeOf(her: { pose: string; at: HerAt } | null, others: (o: Float32Array) => void, airC?: [number, number]) {
  return () => {
    const o = new Float32Array(N * 4);
    const ac = airC ?? (her ? [her.at.x, her.at.z] : [0, 0]);
    airAround(o, ac as [number, number]);
    if (her) fillStrands(o, IW0, IW1, heroine(herPlace(her.at), HP[her.pose], 7), 7);
    else parked(o, IW0, IW1);
    others(o);
    return o;
  };
}
export const none = (o: Float32Array) => parked(o, IO0, N);

/** the faces she trusted: 14 figures standing in an arc around her (behind her, towards the camera's side) */
export function crowdAround(pose: string, center: [number, number], face: number, R = 52, glow = false, away = false) {
  const P0 = (W_POSES as Record<string, Pose>)[pose];
  return (o: Float32Array) => {
    const n = 14;
    const per = Math.floor((N - IO0) / n);
    for (let m = 0; m < n; m++) {
      const th = face + (-1.15 + (2.3 * m) / (n - 1));
      const rr = (R + (m % 2) * 10) * (away ? 1.9 : 1);
      const x = center[0] + Math.sin(th) * rr, z = center[1] + Math.cos(th) * rr;
      const rot = Math.atan2(center[0] - x, center[1] - z) + (away ? Math.PI : 0);
      const pl: Place = { x, z, s: 0.92 + 0.06 * h1(m, 2), rot };
      fillStrands(o, IO0 + m * per, m === n - 1 ? N : IO0 + (m + 1) * per, warriorLite(pl, P0, false, 30 + m, 0, 1, glow), 40 + m);
    }
  };
}
/** her copies (lite) at the given places, all in one pose */
export function copies(places: Place[], pose: string, bOff = 0, bScale = 1, start = IO0) {
  return (o: Float32Array) => {
    const n = places.length;
    const per = Math.floor((N - start) / n);
    places.forEach((pl, m) => fillStrands(o, start + m * per, m === n - 1 ? N : start + (m + 1) * per, heroineLite(pl, HP[pose], 60 + m, bOff, bScale), 60 + m));
  };
}
/** her mother: a full figure of warm light */
export function mother(at: HerAt, pose: string) {
  return (o: Float32Array) => fillStrands(o, IO0, N, heroine(herPlace(at), HP[pose], 21, CATH.warm), 21);
}
/** points scattered over the hall's mirror surfaces (the walls between floor + 20 and the cove, and the dome) */
export function wallPoints(o: Float32Array, start: number, end: number, share = 0.14) {
  for (let i = start; i < end; i++) {
    if (h1(i, 49) > share) {
      parked(o, i, i + 1);
      continue;
    }
    const q = h1(i, 41);
    if (q < 0.55) {
      const k = Math.floor(h1(i, 42) * 8), u = (h1(i, 43) - 0.5) * 120, v = 22 + 140 * h1(i, 44);
      const phi = (k * Math.PI) / 4;
      const x = Math.sin(phi) * (APO - 1) + Math.cos(phi) * u, z = -Math.cos(phi) * (APO - 1) + Math.sin(phi) * u;
      put(o, i, [x, G + v, z], CATH.glass, h1(i, 45));
    } else {
      const th = Math.acos(1 - h1(i, 46) * 0.98) , az = h1(i, 47) * Math.PI * 2;
      const r = 140;
      put(o, i, [Math.sin(th) * Math.sin(az) * r, G + 205 + Math.cos(th) * r, -Math.sin(th) * Math.cos(az) * r], CATH.glass, h1(i, 45));
    }
  }
}
/** a slow cloud of light shards around her (between the shattered mirror and the walls) */
export function shardCloud(c: [number, number], y0: number, r0: number, r1: number) {
  return (o: Float32Array) => {
    for (let i = IO0; i < N; i++) {
      if (h1(i, 59) > 0.1) {
        parked(o, i, i + 1);
        continue;
      }
      const a = h1(i, 51) * Math.PI * 2, rr = r0 + (r1 - r0) * Math.pow(h1(i, 52), 0.6);
      const y = G + y0 + (h1(i, 53) - 0.3) * 70;
      // short dashes (pieces): two neighbouring indices share a piece
      put(o, i, [c[0] + Math.cos(a) * rr + gs(i, 54) * 0.4, y, c[1] + Math.sin(a) * rr + gs(i, 55) * 0.4], CATH.glass, h1(i, 56));
    }
  };
}
export { path };

/** her light, as a few point lights (head, chest, hips, hands) in world space — for the walls, the floor and the
 *  mirror pieces' glints */
export function herLightPts(pose: string, at: HerAt): V3[] {
  const P = HP[pose];
  const pl = herPlace(at);
  const chest = lerp2(P.neck, P.pelvis, 0.3);
  return [toW(pl, P.head[0], P.head[1], 0), toW(pl, chest[0], chest[1], 0), toW(pl, P.pelvis[0], P.pelvis[1], 0), toW(pl, P.ha[0][0], P.ha[0][1], -8), toW(pl, P.ha[1][0], P.ha[1][1], 8)];
}

// ───────────────────────── the faces, the copies, the formations ─────────────────────────
const WP = W_POSES as Record<string, Pose>;
/** the other people (gender-neutral light figures): standing, clapping, holding a piece, throwing */
export const CP: Record<string, Pose> = {
  stand: WP.leave,
  clapA: WP.clapA,
  clapB: WP.clapB,
  hold: { ...WP.clapA, el: [[-30, -204], [30, -204]], ha: [[-6, -212], [6, -212]] },
  throw: { ...WP.clapA, el: [[-30, -212], [42, -300]], ha: [[-40, -176], [30, -348]] },
};
/** n figures on an arc around `center`, centred on direction `face` (0 = +z). mode: stand (facing the centre) ·
 *  away (turned, walking off at twice the distance) · gone (risen and dark: they leave one by one, by index) */
export function crowdArc(pose: string, center: [number, number], face: number, R: number, mode: "stand" | "away" | "gone" = "stand", n = 14, glow = false, span = 1.05) {
  const P0 = CP[pose];
  return (o: Float32Array) => {
    const per = Math.floor((N - IO0) / n);
    for (let m = 0; m < n; m++) {
      const th = face + (-span + (2 * span * m) / (n - 1));
      const rr = (R + (m % 2) * 9) * (mode === "away" ? 1.9 : 1);
      const x = center[0] + Math.sin(th) * rr, z = center[1] + Math.cos(th) * rr;
      const rot = Math.atan2(center[0] - x, center[1] - z) + (mode === "away" ? Math.PI : 0);
      const s = IO0 + m * per, e = m === n - 1 ? N : s + per;
      const order = (m * 7) % n; // they leave in a scattered order
      if (mode === "gone") {
        for (let i = s; i < e; i++) put(o, i, [x + gs(i, 61) * 4, G + 20 + 40 * h1(i, 62), z + gs(i, 63) * 4], CATH.far, (order / n) * 0.85 + 0.1 * h1(i, 64));
        continue;
      }
      const pl: Place = { x, z, s: 0.92 + 0.06 * h1(m, 2), rot };
      fillStrands(o, s, e, warriorLite(pl, P0, false, 30 + m, mode === "away" ? (order / n) * 0.8 : 0, mode === "away" ? 0.2 : 1, glow), 40 + m);
    }
  };
}
/** where the crowd's hands are (for the pieces they hold): world positions, same order as crowdArc */
export function crowdHands(pose: string, center: [number, number], face: number, R: number, n = 14): V3[] {
  const P0 = CP[pose];
  const out: V3[] = [];
  for (let m = 0; m < n; m++) {
    const th = face + (-1.05 + (2.1 * m) / (n - 1));
    const rr = R + (m % 2) * 9;
    const x = center[0] + Math.sin(th) * rr, z = center[1] + Math.cos(th) * rr;
    const rot = Math.atan2(center[0] - x, center[1] - z);
    const pl: Place = { x, z, s: 0.92 + 0.06 * h1(m, 2), rot };
    const hx = (P0.ha[0][0] + P0.ha[1][0]) / 2, hy = (P0.ha[0][1] + P0.ha[1][1]) / 2;
    out.push(pose === "throw" ? toW(pl, P0.ha[1][0], P0.ha[1][1], 8) : toW(pl, hx, hy, 14));
  }
  return out;
}
export const ringPlaces = (n: number, R: number, phase = 0, faceIn = true, s = 1): Place[] =>
  Array.from({ length: n }, (_, m) => {
    const a = phase + (m / n) * Math.PI * 2;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    return { x, z, s, rot: faceIn ? Math.atan2(-x, -z) : Math.atan2(x, z) };
  });
/** rows behind her, odd and even rows staggered (aligned columns leave a see-through aisle) */
export const rowPlaces = (rows: [number, number][], gap: number, s = 1): Place[] =>
  rows.flatMap(([z, n], r) => Array.from({ length: n }, (_, c) => ({ x: (c - (n - 1) / 2) * gap + (r % 2) * gap * 0.5 * 0 + (h1(r * 31 + c, 9) - 0.5) * 4, z: z + (h1(r * 7 + c, 3) - 0.5) * 5, s, rot: 0 })));
/** an 8-point star: copies along the star's arms */
export const starPlaces = (radii: number[], s = 1, phase = Math.PI / 8): Place[] =>
  radii.flatMap((R, k) => Array.from({ length: 8 }, (_, m) => {
    const a = phase + (m / 8) * Math.PI * 2 + (k % 2) * (Math.PI / 8);
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    return { x, z, s, rot: Math.atan2(x, z) };
  }));
/** her copies at the given places, all dancing the same move (every other one mirrored: a kaleidoscope) */
export function copiesOf(places: Place[], pose: string, mirrorOdd = true, bOrder = false) {
  return (o: Float32Array) => {
    const n = places.length;
    const per = Math.floor((N - IO0) / n);
    places.forEach((pl, m) => {
      const P = mirrorOdd && m % 2 === 1 ? mirrorXF(HP[pose]) : HP[pose];
      fillStrands(o, IO0 + m * per, m === n - 1 ? N : IO0 + (m + 1) * per, heroineLite(pl, P, 60 + m, bOrder ? (m / n) * 0.7 : 0, bOrder ? 0.3 : 1), 60 + m);
    });
  };
}
export const mirrorXF = (p: PoseF): PoseF => {
  const m = (v: V2): V2 => [-v[0], v[1]];
  return {
    ...p, head: m(p.head), neck: m(p.neck), pelvis: m(p.pelvis),
    sh: [m(p.sh[1]), m(p.sh[0])], el: [m(p.el[1]), m(p.el[0])], ha: [m(p.ha[1]), m(p.ha[0])],
    hip: [m(p.hip[1]), m(p.hip[0])], kn: [m(p.kn[1]), m(p.kn[0])], ft: [m(p.ft[1]), m(p.ft[0])],
    hair: p.hair ? m(p.hair) : undefined, skirt: p.skirt ? { ...p.skirt, c: m(p.skirt.c) } : undefined, armZ: p.armZ ? [p.armZ[1], p.armZ[0]] : undefined,
  };
};
/** puddles of light on the floor where her copies will rise (one per place) */
export function puddlesAt(places: Place[]) {
  return (o: Float32Array) => {
    const n = places.length;
    const per = Math.floor((N - IO0) / n);
    places.forEach((pl, m) => {
      const s = IO0 + m * per, e = m === n - 1 ? N : s + per;
      for (let i = s; i < e; i++) {
        const r = 3.2 * Math.sqrt(h1(i, 71)) * pl.s, a = h1(i, 72) * Math.PI * 2;
        put(o, i, [pl.x + Math.cos(a) * r, G + 0.15, pl.z + Math.sin(a) * r], r > 2.6 ? CATH.hi : CATH.line, (m / n) * 0.5 + 0.5 * h1(i, 73));
      }
    });
  };
}
/** light gathered into the candle flames (her mother's light flows into the two candles) */
export function intoFlames(flames: V3[]) {
  return (o: Float32Array) => {
    for (let i = IO0; i < N; i++) {
      const f = flames[i % flames.length];
      const r = 0.6 * Math.sqrt(h1(i, 81)), a = h1(i, 82) * Math.PI * 2, y = (h1(i, 83) - 0.3) * 1.6;
      put(o, i, [f[0] + Math.cos(a) * r, f[1] + y, f[2] + Math.sin(a) * r], CATH.warm, h1(i, 84));
    }
  };
}
/** the others' share as a combination: a figure-range filler for the mother + parked rest */
export function motherAt(at: HerAt, pose: string) {
  return (o: Float32Array) => fillStrands(o, IO0, N, heroine(herPlace(at), HP[pose], 21, CATH.warm), 21);
}
