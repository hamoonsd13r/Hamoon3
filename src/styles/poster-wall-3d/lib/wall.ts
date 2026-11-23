// Poster Wall 3D · the poster wall and the camera. The wall is a grid of 4:5 cards on the plane z = 0 (world units = poster
// pixels, y up). The camera is a pure function of time: stations joined by moves (a pull-back from the opening hero,
// whips that land on the music's beats, slower crane moves, a final whip into the ending hero), with a slow drift on
// every station so the frame never stops. Which poster each card shows is worked out from that path: cards that are
// ever on screen together never repeat a poster, and neighbours alternate dark and light.
import * as THREE from "three";
import { DUR, ease, mix, ramp } from "./theme";

export let CW = 1080, CH = 1350;
export const GAP = 64;
export let PX = CW + GAP, PY = CH + GAP;
export const COLS: [number, number] = [-8, 12];
export const ROWS: [number, number] = [-10, 15];

// the music (take m2, 100 BPM): every beat is a kick; beat k at BEAT0 + k · BEAT
export const BEAT0 = 0.03, BEAT = 0.6; // beat k sits 20–30 ms after the kick's onset (onsets 0.01 + 0.5996 k)
export const beat = (k: number) => BEAT0 + BEAT * k;

/** the two hero cards: the opening (full frame at t = 0) and the ending push-in */
export const HERO_A: [number, number] = [0, 0];
export const HERO_B: [number, number] = [3, 7];
export let HERO_IDS = { A: "", B: "" }; // the opening hero (full frame at t = 0) and the ending one — set by configureWall
// the cards right above and below each hero: dark, quiet on the edge that shows (set by configureWall)
let FRAMING: [number, number, string][] = [];

// ---------------------------------------------------------------------------------------------------------- camera
export type Pose = { tx: number; ty: number; d: number; yaw: number; pitch: number; roll: number; fov: number };
type Station = { pose: Pose; v: [number, number, number] }; // drift (units/s) on tx, ty and d while held

const deg = Math.PI / 180;
const at = (c: number, r: number) => ({ tx: c * PX, ty: r * PY });
export const S3_AT: [number, number] = [0.4, -2.2]; // right of whip 1's hold: cards that hold has not shown

// stations (where the camera rests) and the moves between them
const buildStations = (): Station[] => [
  { pose: { ...at(HERO_A[0], HERO_A[1]), d: 2900, yaw: 0, pitch: 0, roll: 0, fov: 38 }, v: [0, 0, -140] }, // the opening hero, frontal, already pushing
  { pose: { ...at(-0.3, 0.6), d: 4900, fov: 38, yaw: 24, pitch: 34, roll: -8 }, v: [45, 40, 0] }, // pulled back: the wall
  { pose: { ...at(-1.6, -2.4), d: 4400, fov: 38, yaw: 27, pitch: 37, roll: -10 }, v: [100, 160, -90] }, // whip 1 lands
  { pose: { ...at(S3_AT[0], S3_AT[1]), d: 3800, fov: 38, yaw: -18, pitch: 32, roll: 7 }, v: [-60, 55, 0] }, // crane across to fresh cards, swinging round
  { pose: { ...at(2.6, 2.0), d: 4400, fov: 38, yaw: -24, pitch: 36, roll: 9 }, v: [95, -135, -90] }, // whip 2 lands
  { pose: { ...at(2.2, 3.4), d: 4000, fov: 38, yaw: 12, pitch: 28, roll: -4 }, v: [60, 40, 0] }, // crane lower and closer
  { pose: { tx: HERO_B[0] * PX, ty: HERO_B[1] * PY - 215, d: 3000, yaw: 0, pitch: 0, roll: 0, fov: 38 }, v: [0, 0, -120] }, // the ending hero, a little high (clear of the Reels caption)
  { pose: { tx: HERO_B[0] * PX, ty: HERO_B[1] * PY - 60, d: 14000, yaw: 9, pitch: 22, roll: -3, fov: 38 }, v: [0, 0, 0] }, // the whole wall, receding into the dark (still moving at the last frame)
];
let S: Station[] = buildStations();
// a whip: hard acceleration (quart), a longer cubic landing that comes to rest 1.5 % past the mark on the beat, then
// settles back over 0.16 s (see poseAt) — weight instead of a dead stop
const OVER = 0.015, SETTLE = 0.16;
const whip = (u: number) => (1 + OVER) * (u < 0.45 ? 0.38 * (u / 0.45) ** 4 : 1 - 0.62 * ((1 - u) / 0.55) ** 3);
/** 0→1: eases in over the first 15 %, then constant speed (no settle) */
const easeInSteady = (u: number) => (u < 0.15 ? (u * u) / 0.3 : u - 0.075) / 0.925;
// moves: [start, end, to station, easing] — whips land on a beat
export const MOVES: [number, number, number, (u: number) => number][] = [
  [beat(0.5), beat(3), 1, ease.inOut], // pull-back reveal
  [beat(3.4), beat(4), 2, whip], // whip 1 → beat 4
  [beat(8), beat(10.6), 3, ease.sine], // crane
  [beat(11.4), beat(12), 4, whip], // whip 2 → beat 12
  [beat(15.5), beat(17.5), 5, ease.sine], // crane
  [beat(18.4), beat(19), 6, whip], // whip 3 → the last hit (beat 19)
  [12.3, 15.4, 7, easeInSteady], // the ring-out: ease out of the hold, then pull back at a steady rate to the last frame
];

const lerpPose = (A: Pose, B: Pose, u: number): Pose => ({
  tx: mix(A.tx, B.tx, u), ty: mix(A.ty, B.ty, u), d: A.d * Math.pow(B.d / A.d, u),
  yaw: mix(A.yaw, B.yaw, u), pitch: mix(A.pitch, B.pitch, u), roll: mix(A.roll, B.roll, u), fov: mix(A.fov, B.fov, u),
});

/** each station's drift is centred on its own mid time (heroes: on their exact frame) so drift never piles up */
const stationSpan = (k: number): [number, number] => [k === 0 ? 0 : MOVES[k - 1][1], k < MOVES.length ? MOVES[k][0] : DUR];
const drifted = (k: number, t: number): Pose => {
  const [a, b] = stationSpan(k), m = k === 0 ? 0 : k === S.length - 1 ? a : (a + b) / 2, dt = t - m;
  const p = S[k].pose, v = S[k].v;
  return { ...p, tx: p.tx + v[0] * dt, ty: p.ty + v[1] * dt, d: p.d + v[2] * dt };
};

export const poseAt = (t: number): Pose => {
  for (let i = 0; i < MOVES.length; i++) {
    const [a, b, to, fn] = MOVES[i];
    if (t < a) {
      const prev = MOVES[i - 1];
      if (prev && prev[3] === whip && t < prev[1] + SETTLE) return lerpPose(drifted(i - 1, t), drifted(i, t), 1 + OVER * (1 - ease.inOut(ramp(t, prev[1], prev[1] + SETTLE))));
      return drifted(i, t);
    }
    if (t <= b) return lerpPose(drifted(to - 1, t), drifted(to, t), fn(ramp(t, a, b)));
  }
  return drifted(S.length - 1, t);
};

/** mid-hold rack focus: on a beat the focus slides to the rows beyond, and comes back as the next move starts */
const focusPull = (t: number) =>
  0.22 * (ease.inOut(ramp(t, beat(5.67), beat(6.33))) - ease.inOut(ramp(t, beat(8), beat(8.5)))) +
  0.22 * (ease.inOut(ramp(t, beat(13.67), beat(14.33))) - ease.inOut(ramp(t, beat(15.5), beat(16))));

export type CamState = { pos: [number, number, number]; target: [number, number, number]; roll: number; fov: number; focus: number };
export const camAt = (t: number): CamState => {
  const p = poseAt(t);
  const yaw = p.yaw * deg, pitch = p.pitch * deg;
  const dir = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  return { pos: [p.tx + dir[0] * p.d, p.ty + dir[1] * p.d, dir[2] * p.d], target: [p.tx, p.ty, 0], roll: p.roll * deg, fov: p.fov, focus: p.d * (1 + focusPull(t)) };
};

/** how fast the frame moves (px per frame at the frame centre), to choose the motion-blur sample count */
export const speedPx = (t: number, fps: number, H: number) => {
  const a = poseAt(t - 0.5 / fps), b = poseAt(t + 0.5 / fps);
  const pxPerUnit = H / (2 * b.d * Math.tan((b.fov * deg) / 2));
  const dPos = Math.hypot(b.tx - a.tx, b.ty - a.ty) * pxPerUnit;
  const dAng = (Math.abs(b.yaw - a.yaw) + Math.abs(b.pitch - a.pitch) + Math.abs(b.roll - a.roll)) * deg * H;
  const dZoom = (Math.abs(b.d - a.d) / b.d) * H * 0.5;
  return dPos + dAng + dZoom;
};
export const SHUTTER = 0.4; // of a frame (144°)
export const shutterSamples = (t: number, fps: number, H: number) => Math.min(128, Math.max(1, Math.ceil((speedPx(t, fps, H) * SHUTTER) / 3)));

/** a three camera set to the path at time t (for projection) */
export const setCamera = (cam: THREE.PerspectiveCamera, t: number) => {
  const s = camAt(t);
  cam.fov = s.fov;
  cam.updateProjectionMatrix();
  cam.position.set(...s.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...s.target);
  cam.rotateZ(s.roll);
  cam.updateMatrixWorld(true);
  return s;
};

// ----------------------------------------------------------------------------------------- which poster goes where
export let POSTER_IDS: string[] = [];
// dark (0), mid (1) and light (2) posters — neighbours should differ
let TONE: Record<string, number> = {};
// what each poster shows: a head, a figure, an object or a landscape — a hold should mix them
let CAT: Record<string, WallCat> = {};
let MINOR = new Set<string>(); // posters to keep small and soft (never in a hold)
export type Card = { c: number; r: number; x: number; y: number; id: string; slot: string };

const key = (c: number, r: number) => `${c},${r}`;
/** screen share of every card at time t: projected area (clipped to the frame, roughly) / frame area; and its
 * "attention": the share weighted by how sharp the card is (depth of field) and how still the frame is (whips) */
const prominence = (cam: THREE.PerspectiveCamera, t: number, aspect: number, out: Map<string, number>, att?: Map<string, number>, attT?: Map<string, number>) => {
  cam.aspect = aspect;
  const s = setCamera(cam, t);
  const still = 1 / (1 + (speedPx(t, 30, 1920) / 25) ** 2);
  const hold = (t > beat(4) && t < beat(8)) || (t > beat(12) && t < beat(15.5)) ? 2.5 : 1; // whip 1's and whip 2's holds
  const v = new THREE.Vector3();
  for (let c = COLS[0]; c <= COLS[1]; c++)
    for (let r = ROWS[0]; r <= ROWS[1]; r++) {
      const x = c * PX, y = r * PY;
      let inside = 0, behind = false;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 2; i++)
        for (let j = 0; j <= 2; j++) {
          v.set(x + (i - 1) * CW * 0.5, y + (j - 1) * CH * 0.5, 0).project(cam);
          if (v.z > 1) behind = true;
          if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1) inside++;
          if ((i === 0 || i === 2) && (j === 0 || j === 2)) pts.push([v.x, v.y]);
        }
      if (behind || !inside) continue;
      const [p0, p1, p3, p2] = pts; // (0,0) (0,2) (2,0) (2,2) → order around the quad: p0 p3 p2 p1
      const quad = [p0, p3, p2, p1];
      let A = 0;
      for (let k = 0; k < 4; k++) {
        const a = quad[k], b = quad[(k + 1) % 4];
        A += a[0] * b[1] - b[0] * a[1];
      }
      const share = (Math.abs(A) / 2 / 4) * (inside / 9);
      out.set(key(c, r), Math.max(out.get(key(c, r)) ?? 0, share));
      if (att) {
        v.set(x, y, 0).applyMatrix4(cam.matrixWorldInverse);
        const z = -v.z, coc = Math.min(22, (26 * Math.abs(z - s.focus)) / z); // as in the engine's shader
        const a = (hold * share * still) / (1 + (coc / 9) ** 2); // a soft card with a big title still registers
        if (a > (att.get(key(c, r)) ?? 0)) {
          att.set(key(c, r), a);
          attT?.set(key(c, r), t);
        }
      }
    }
};


// ---------------------------------------------------------------------------------------------------------- config
export type WallCat = "head" | "figure" | "object" | "land";
/** one poster on the wall: tone 0 dark · 1 mid · 2 light (neighbours differ), what it shows (holds mix them) */
export type WallCard = { id: string; tone: 0 | 1 | 2; cat: WallCat; minor?: boolean };
export type WallConfig = {
  cards: WallCard[]; // ~20 posters; the layout repeats them over a 21 × 26 wall so no hold shows one twice
  heroA: string; // full frame at t = 0 (pick a dark, striking one)
  heroB: string; // the ending push-in, then the pull-back
  framing?: { aboveA?: string; belowA?: string; aboveB?: string; belowB?: string }; // dark, calm posters
  cw?: number; // card size in wall units (default 1080 × 1350; 1080 × 1920 for 9:16 posters)
  ch?: number;
};
/** set the wall before the first frame (call at module level in your film) */
export const configureWall = (c: WallConfig) => {
  CW = c.cw ?? 1080;
  CH = c.ch ?? 1350;
  PX = CW + GAP;
  PY = CH + GAP;
  POSTER_IDS = c.cards.map((x) => x.id);
  TONE = Object.fromEntries(c.cards.map((x) => [x.id, x.tone]));
  CAT = Object.fromEntries(c.cards.map((x) => [x.id, x.cat]));
  MINOR = new Set(c.cards.filter((x) => x.minor).map((x) => x.id));
  HERO_IDS = { A: c.heroA, B: c.heroB };
  const f = c.framing ?? {};
  FRAMING = [];
  if (f.aboveA) FRAMING.push([HERO_A[0], HERO_A[1] + 1, f.aboveA]);
  if (f.belowA) FRAMING.push([HERO_A[0], HERO_A[1] - 1, f.belowA]);
  if (f.aboveB) FRAMING.push([HERO_B[0], HERO_B[1] + 1, f.aboveB]);
  if (f.belowB) FRAMING.push([HERO_B[0], HERO_B[1] - 1, f.belowB]);
  S = buildStations();
  cache = null;
};

let cache: { cards: Card[]; first: Record<string, number>; peak: Record<string, number>; att: Record<string, number>; attT: Record<string, number> } | null = null;
/** the layout, computed once from the camera path */
export const layout = (aspect = 1080 / 1920) => {
  if (cache) return cache;
  const cam = new THREE.PerspectiveCamera(38, aspect, 50, 200000);
  const STEP = 1 / 30, PROM = 0.006; // every frame (whips cross many cards between frames); "seen" above 0.6 % of the frame
  const REPEAT = 6000; // cost of a repeat, × the geometric mean of the two cards' attention (repeating a poster you studied costs more)
  const seenAt = new Map<string, number>(); // first time a card is seen
  const peak = new Map<string, number>();
  const att = new Map<string, number>();
  const attT = new Map<string, number>(); // when each card is most watched
  const together: [string[], number][] = []; // cards on screen in each frame, and how still that frame is
  for (let t = 0; t <= DUR; t += STEP) {
    const m = new Map<string, number>();
    prominence(cam, t, aspect, m, att, attT);
    const seen: string[] = [];
    for (const [k, s] of m) {
      peak.set(k, Math.max(peak.get(k) ?? 0, s));
      if (s > PROM) {
        seen.push(k);
        if (!seenAt.has(k)) seenAt.set(k, t);
      }
    }
    together.push([seen, 1 / (1 + (speedPx(t, 30, 1920) / 60) ** 2)]);
  }
  // conflicts: cards seen in the same frame, weighted by the stillest such frame (a repeat inside a whip's smear is
  // invisible; one in a hold is not)
  const conf = new Map<string, Map<string, number>>();
  for (const [g, w] of together)
    for (const a of g) {
      const m = conf.get(a) ?? conf.set(a, new Map()).get(a)!;
      for (const b of g) if (a !== b) m.set(b, Math.max(m.get(b) ?? 0, w));
    }
  // what each hold shows: every card at least 35 % in frame at some moment of it. A poster in one hold should not
  // turn up in another (that is what the eye compares) — worst between the two long holds, bad between neighbours
  const HOLDS: [number, number][] = [[1.6, beat(3.4)], [beat(4) + 0.03, beat(8)], [beat(10.6) - 0.3, beat(11.4)], [beat(12) + 0.03, beat(15.5)], [beat(17.5), beat(18.4)]];
  const holdSets = HOLDS.map(([a, b]) => {
    const set = new Set<string>();
    const pv = new THREE.Vector3();
    for (let t = a; t <= b; t += 2 / 30) {
      cam.aspect = aspect;
      setCamera(cam, t);
      for (let c = COLS[0]; c <= COLS[1]; c++)
        for (let r = ROWS[0]; r <= ROWS[1]; r++) {
          let inside = 0;
          for (let i = 0; i < 7; i++)
            for (let j = 0; j < 7; j++) {
              pv.set(c * PX + (i / 6 - 0.5) * CW, r * PY + (j / 6 - 0.5) * CH, 0).project(cam);
              if (pv.z < 1 && Math.abs(pv.x) < 1 && Math.abs(pv.y) < 1) inside++;
            }
          if (inside >= 0.35 * 49) set.add(key(c, r));
        }
    }
    return set;
  });
  const holdCost = (i: number, j: number) => ((i === 1 && j === 3) || (i === 3 && j === 1) ? 4000 : Math.abs(i - j) === 1 ? 3000 : 1200);
  const id = new Map<string, string>();
  id.set(key(...HERO_A), HERO_IDS.A);
  id.set(key(...HERO_B), HERO_IDS.B);
  const uses = new Map<string, number>(POSTER_IDS.map((p) => [p, 0]));
  uses.set(HERO_IDS.A, 1);
  uses.set(HERO_IDS.B, 1);
  // the cards the hero frames cut: dark, and quiet on the edge that shows (above a hero its bottom, below it its top)
  for (const [c, r, p] of FRAMING) {
    id.set(key(c, r), p);
    uses.set(p, (uses.get(p) ?? 0) + 1);
  }
  const all: [number, number][] = [];
  for (let c = COLS[0]; c <= COLS[1]; c++) for (let r = ROWS[0]; r <= ROWS[1]; r++) all.push([c, r]);
  // the most watched cards choose first
  all.sort((a, b) => (att.get(key(...b)) ?? 0) - (att.get(key(...a)) ?? 0));
  for (const [c, r] of all) {
    const k = key(c, r);
    if (id.has(k)) continue;
    let best = "", bestCost = Infinity;
    for (const p of POSTER_IDS) {
      let cost = 0;
      for (const [o, w] of conf.get(k) ?? []) if (id.get(o) === p) cost += 8000 * Math.max(w, 0.02) * (0.25 + 0.75 * Math.min(1, Math.min(peak.get(k) ?? 0, peak.get(o) ?? 0) / 0.03));
      for (let dc = -1; dc <= 1; dc++)
        for (let dr = -1; dr <= 1; dr++) {
          if (!dc && !dr) continue;
          const n = id.get(key(c + dc, r + dr));
          if (!n) continue;
          if (n === p) cost += 400;
          if (TONE[n] === TONE[p]) cost += dc && dr ? 3 : 8;
          if (CAT[n] === CAT[p]) cost += (CAT[p] === "head" ? 40 : 12) * (dc && dr ? 0.4 : 1);
        }
      for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) if ((dc || dr) && id.get(key(c + dc, r + dr)) === p) cost += 60;
      // around a hero only dark posters, so the hero owns the frame
      const nearHero = Math.max(Math.abs(c - HERO_A[0]), Math.abs(r - HERO_A[1])) <= 1 || Math.max(Math.abs(c - HERO_B[0]), Math.abs(r - HERO_B[1])) <= 1;
      if (nearHero) cost += TONE[p] === 2 ? 900 : TONE[p] === 1 ? 60 : 0; // never a light poster beside a hero
      // the heroes stay special: keep them out of every other card that is ever seen
      if ((p === HERO_IDS.A || p === HERO_IDS.B) && (peak.get(k) ?? 0) > 0) cost += 1e6;
      if (MINOR.has(p)) cost += 20000 * (att.get(k) ?? 0);
      for (let i = 0; i < holdSets.length; i++) {
        if (!holdSets[i].has(k)) continue;
        if (MINOR.has(p)) cost += 3000; // never in a hold
        for (let j = 0; j < holdSets.length; j++) if (j !== i) for (const o of holdSets[j]) if (o !== k && id.get(o) === p) cost += holdCost(i, j);
      }
      // a poster you looked at in one shot should not come back big and sharp in another
      const ak = att.get(k) ?? 0;
      // (twice as bad when the two moments are close: the eye still remembers the first)
      if (ak > 0)
        for (const [o, q] of id)
          if (q === p) cost += REPEAT * Math.sqrt(ak * (att.get(o) ?? 0)) * (1 + Math.exp(-Math.abs((attT.get(k) ?? 0) - (attT.get(o) ?? 99)) / 1.5));
      cost += (uses.get(p) ?? 0) * 0.5 + (((p.charCodeAt(p.length - 1) || 0) * 7 + c * 13 + r * 29) % 5) * 0.01;
      if (cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
    id.set(k, best);
    uses.set(best, (uses.get(best) ?? 0) + 1);
  }
  const cards: Card[] = all.map(([c, r]) => {
    const p = id.get(key(c, r))!;
    const hero = c === HERO_A[0] && r === HERO_A[1] ? "A" : c === HERO_B[0] && r === HERO_B[1] ? "B" : "";
    return { c, r, x: c * PX, y: r * PY, id: p, slot: hero ? `${p}@${hero}` : p };
  });
  // when each poster (slot) is first seen, for its title to come in
  const first: Record<string, number> = {};
  for (const cd of cards) {
    const s = seenAt.get(key(cd.c, cd.r));
    if (s === undefined) continue;
    first[cd.slot] = Math.min(first[cd.slot] ?? Infinity, s);
  }
  cache = { cards, first, peak: Object.fromEntries(peak), att: Object.fromEntries(att), attT: Object.fromEntries(attT) };
  return cache;
};
