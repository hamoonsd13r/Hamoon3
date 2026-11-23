// Toon3D kit: the camera grammar. Pure math on camera definitions, in whatever space the world understands (a ship's
// deck, a room, the world). Moves: keyed glides (camRun), push-in / pull-out (push), hand sway, sea clearance. Framing
// presets aim the lens so faces land ABOVE the caption band of a 9:16 frame (captions sit at ~67-74 % of the height).
import { FPS as DEF_FPS } from "./defaults";

export type V3 = [number, number, number];
export type CamDef<S extends string = string> = {
  space: S; pos: V3; look: V3; fov: number; roll?: number; upFollow?: number; up?: V3;
  /** glide (k 0..1) from this camera into a second one in another space (a hand-off between moving frames) */
  blend?: { space: S; pos: V3; look: V3; k: number; upFollow?: number };
};
/** a camera key: from t it glides from the previous state over `dur` seconds with `ease` */
export type CK = { t: number; pos: V3; look: V3; fov?: number; roll?: number; dur?: number; ease?: (u: number) => number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mixV = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const addV = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const subV = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const lenV = (a: V3) => Math.hypot(a[0], a[1], a[2]);

/** keyed glides: each key glides from the state before it (default ease: smoother) */
export const camRun = <S extends string>(space: S, keys: CK[], t: number, extra: Partial<CamDef<S>> = {}): CamDef<S> => {
  let pos = keys[0].pos, look = keys[0].look, fov = keys[0].fov ?? 40, roll = keys[0].roll ?? 0;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t < k.t) break;
    const u = (k.ease ?? smoother)(clamp01((t - k.t) / (k.dur ?? 0.8)));
    pos = mixV(pos, k.pos, u); look = mixV(look, k.look, u); fov = lerp(fov, k.fov ?? fov, u); roll = lerp(roll, k.roll ?? roll, u);
  }
  return { space, pos, look, fov, roll, ...extra };
};
/** push in (rate > 0) / pull out (rate < 0): the lens slides along its line of sight by `rate` per frame since t0,
 *  easing out over `tau` seconds if given (the reference measures pushes in %/frame) */
export const push = <C extends CamDef<string>>(c: C, t: number, t0: number, rate: number, tau = 0, fps = DEF_FPS): C => {
  const x = Math.max(0, t - t0) * fps, s = tau > 0 ? rate * tau * fps * (1 - Math.exp(-x / (tau * fps))) : rate * x, k = Math.exp(-s);
  return { ...c, pos: [c.look[0] + (c.pos[0] - c.look[0]) * k, c.look[1] + (c.pos[1] - c.look[1]) * k, c.look[2] + (c.pos[2] - c.look[2]) * k] };
};
/** a slow hand sway (roll amplitude a radians, period per seconds) */
export const sway = (t: number, a: number, per = 5.3, ph = 0) => a * Math.sin((2 * Math.PI * t) / per + ph);
/** a low world-space lens never dips under the water: it rides up (with its look) to m metres over height(x, z) */
export const clear = <C extends CamDef<string>>(c: C, height: (x: number, z: number) => number, m = 2.8): C => {
  if (c.space !== "world") return c;
  const d = Math.max(0, height(c.pos[0], c.pos[2]) + m - c.pos[1]);
  return d > 0 ? { ...c, pos: [c.pos[0], c.pos[1] + d, c.pos[2]], look: [c.look[0], c.look[1] + d, c.look[2]] } : c;
};

// ---------------- caption-safe framing ----------------
/** where things may sit in a 9:16 frame (fractions of the height from the top) */
export const SAFE = {
  /** the caption block (Persian, 104 px at y 1290 of 1920) */
  captionTop: 1290 / 1920, captionBottom: 1430 / 1920,
  /** faces of speaking characters sit above this line */
  faceMax: 0.6,
  /** Instagram's own UI covers the top ~8 % and the bottom ~20 % */
  uiTop: 0.08, uiBottom: 0.8,
};
/** screen y (fraction from the top) -> NDC y (up = +1) */
export const ndcY = (fromTop: number) => 1 - 2 * fromTop;

/** The look point that puts point p at screen position (sx, sy) (NDC, -1..1, y up) for a lens at pos with vertical fov
 *  (degrees) and the given aspect (width / height). Default: centred, at 42 % of the height (above the captions). */
export const aimAt = (pos: V3, p: V3, fov: number, sx = 0, sy = ndcY(0.42), aspect = 9 / 16): V3 => {
  const d = subV(p, pos), h = Math.hypot(d[0], d[2]), dist = Math.max(0.01, Math.hypot(h, d[1]));
  const tv = Math.tan((fov * Math.PI) / 360);
  const yaw = Math.atan2(d[0], d[2]) + Math.atan(sx * tv * aspect), pitch = Math.atan2(d[1], h) - Math.atan(sy * tv);
  return [pos[0] + dist * Math.cos(pitch) * Math.sin(yaw), pos[1] + dist * Math.sin(pitch), pos[2] + dist * Math.cos(pitch) * Math.cos(yaw)];
};
/** a lens placed from a subject: along the horizontal direction `from` (x, z), at `dist`, raised by `rise` */
export const placeFrom = (p: V3, from: [number, number], dist: number, rise = 0): V3 => {
  const l = Math.hypot(from[0], from[1]) || 1;
  return [p[0] + (from[0] / l) * dist, p[1] + rise, p[2] + (from[1] / l) * dist];
};
/** the distance at which a subject `size` metres tall fills `frac` of the frame height */
export const distFor = (size: number, frac: number, fov: number) => size / frac / (2 * Math.tan((fov * Math.PI) / 360));

export type ShotOpts = { fov?: number; rise?: number; at?: number; sx?: number };
/** close-up of one face: the head fills ~38 % of the frame height, the face at 42 % from the top */
export const closeUp = <S extends string>(space: S, face: V3, from: [number, number], o: ShotOpts & { frac?: number } = {}): CamDef<S> => {
  const fov = o.fov ?? 34, pos = placeFrom(face, from, distFor(0.55, o.frac ?? 0.38, fov), o.rise ?? 0.05);
  return { space, pos, look: aimAt(pos, face, fov, o.sx ?? 0, ndcY(o.at ?? 0.42)), fov };
};
/** medium shot: waist up (~1.3 m of body fills the frame), the face at 36 % */
export const medium = <S extends string>(space: S, face: V3, from: [number, number], o: ShotOpts = {}): CamDef<S> => {
  const fov = o.fov ?? 40, pos = placeFrom(face, from, distFor(1.4, 0.75, fov), o.rise ?? 0.2);
  return { space, pos, look: aimAt(pos, face, fov, o.sx ?? 0, ndcY(o.at ?? 0.36)), fov };
};
/** two-shot: both faces in, their midpoint at 40 % from the top; dist grows with their spacing (portrait is narrow) */
export const twoShot = <S extends string>(space: S, a: V3, b: V3, from: [number, number], o: ShotOpts = {}): CamDef<S> => {
  const fov = o.fov ?? 40, mid = mixV(a, b, 0.5), gap = lenV(subV(a, b));
  const halfW = Math.tan((fov * Math.PI) / 360) * (9 / 16);
  const dist = Math.max(distFor(1.2, 0.6, fov), (gap / 2 + 0.55) / halfW);
  const pos = placeFrom(mid, from, dist, o.rise ?? 0.15);
  return { space, pos, look: aimAt(pos, mid, fov, o.sx ?? 0, ndcY(o.at ?? 0.4)), fov };
};
/** wide / establishing: around a target at yaw/pitch (degrees), the target at `at` from the top */
export const wide = <S extends string>(space: S, target: V3, yawDeg: number, pitchDeg: number, dist: number, o: ShotOpts = {}): CamDef<S> => {
  const fov = o.fov ?? 46, y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  const pos: V3 = [target[0] + dist * Math.cos(p) * Math.sin(y), target[1] + dist * Math.sin(p), target[2] + dist * Math.cos(p) * Math.cos(y)];
  return { space, pos, look: aimAt(pos, target, fov, o.sx ?? 0, ndcY(o.at ?? 0.5)), fov };
};
