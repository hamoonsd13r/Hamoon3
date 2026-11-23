// Hollow Moon 3D · the camera grammar and the film spec. A film = hard cuts on the bars of the music, each shot a
// Hermite spline through keys written in the moon's own frames (helpers below), and the inside of the core at the end.
// Every value is a pure function of film time. The accepted film's own shots and cuts live in demo/film.ts.
import type { LogoTimes } from "./logo";
import type { Brand } from "./brand";
import { BREACH_W, MOON, MOON_YAW, RING_NEAR, clamp, ease, lerp, ringPt, vcross, vnorm, type V3 } from "./util";

/** focus = distance in metres · aper = blur constant in px·m at 1080p (0 = everything sharp) · exp = exposure factor */
export type Cam = { p: V3; t: V3; fov: number; roll?: number; focus?: number; aper?: number; exp?: number };
export type Key = { at: number; p: V3; t: V3; fov: number; roll?: number; focus?: number; aper?: number; exp?: number };
/** sea: the shot sees the ocean (outside the moon) · cone: strength of the light cone that leaves the opening (1) */
export type Shot = { id: string; t0: number; t1: number; keys: Key[]; sea: boolean; cone?: number };

/** what the engine needs from a film. Cut seconds (all film time):
 *  BOLT  the frame of the lightning's return stroke (put it on the first hit of the music)
 *  B, C  the ring's lit name passes the lens midway between them
 *  DROP  the music's climax: the hall holds its breath 0.56 s before it and its lights surge on it
 *  F     the lens enters the core: the shots end, the logo world begins (white flash in, the reveal times in logoT) */
export type FilmSpec = {
  dur: number;
  shots: Shot[];
  cut: { BOLT: number; B: number; C: number; DROP: number; F: number };
  /** reveal of the logo, seconds after F */
  logoT: LogoTimes;
  /** 1 = full picture; the film fades out over its last second */
  fadeAt: (t: number) => number;
  brand: Brand;
  /** far silent flashes in the cloud deck: [film second, compass offset from shot 1 (°), elevation (°), strength] */
  farFlashes?: [number, number, number, number][];
};

const M = MOON;
/** point relative to the centre of the moon (world axes) */
const m = (x: number, y: number, z: number): V3 => [M[0] + x, M[1] + y, M[2] + z];
/** point in the moon's own frame (the frame the hall and the armillary are built in) */
const lc = (x: number, y: number, z: number): V3 => { const c = Math.cos(MOON_YAW), s = Math.sin(MOON_YAW); return [M[0] + x * c + z * s, M[1] + y, M[2] - x * s + z * c]; };
/** ring frame → world: angle from the nearest stretch (degrees), distance from the axis, height along the axis */
const rg = (deg: number, rad: number, ax: number): V3 => { const p = ringPt(RING_NEAR + (deg * Math.PI) / 180, rad, ax); return [M[0] + p[0], M[1] + p[1], M[2] + p[2]]; };
/** the frame of the opening: its axis (outwards), screen-right and up as seen by a lens that looks into it */
const AXIS = BREACH_W;
const SIDE: V3 = vnorm([AXIS[2], 0, -AXIS[0]]);
const UP: V3 = vcross(AXIS, SIDE);
/** along the axis of the opening: distance from the centre, offsets to the right and upwards */
const ax = (d: number, right = 0, up = 0): V3 => [M[0] + AXIS[0] * d + SIDE[0] * right + UP[0] * up, M[1] + AXIS[1] * d + SIDE[1] * right + UP[1] * up, M[2] + AXIS[2] * d + SIDE[2] * right + UP[2] * up];
/** a point over the surface: angle from the axis of the opening, azimuth around it (0 = up, 90 = right; degrees), distance from the centre */
const sf = (th: number, ph: number, rad: number): V3 => {
  const a = (th * Math.PI) / 180, b = (ph * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), cu = sa * Math.cos(b), cs = sa * Math.sin(b);
  return [M[0] + rad * (AXIS[0] * ca + UP[0] * cu + SIDE[0] * cs), M[1] + rad * (AXIS[1] * ca + UP[1] * cu + SIDE[1] * cs), M[2] + rad * (AXIS[2] * ca + UP[2] * cu + SIDE[2] * cs)];
};
/** the helpers for camera keys (pipeline/pt.mts turns them into --cams strings for the look tool) */
export const H = { m, lc, rg, ax, sf };

function sample(s: Shot, t: number): Cam {
  const k = s.keys;
  const tt = clamp(t, k[0].at, k[k.length - 1].at);
  let i = 0;
  while (i < k.length - 2 && tt > k[i + 1].at) i++;
  const a = k[Math.max(i - 1, 0)], b = k[i], c = k[i + 1], d = k[Math.min(i + 2, k.length - 1)];
  const u = (tt - b.at) / (c.at - b.at);
  // non-uniform key spacing: scale the tangents by the span ratio so the speed stays continuous across a key
  const hb = (c.at - b.at) / Math.max(b.at - a.at, 1e-4), hc = (c.at - b.at) / Math.max(d.at - c.at, 1e-4);
  const cr = (p0: number, p1: number, p2: number, p3: number) => {
    const m1 = i === 0 ? p2 - p1 : 0.5 * ((p2 - p1) + (p1 - p0) * hb), m2 = i + 2 > k.length - 1 ? p2 - p1 : 0.5 * ((p2 - p1) + (p3 - p2) * hc);
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
  };
  const v3 = (f: (q: Key) => V3): V3 => [0, 1, 2].map((j) => cr(f(a)[j], f(b)[j], f(c)[j], f(d)[j])) as V3;
  const num = (f: (q: Key) => number | undefined, def: number) => {
    // carry the last defined value forward so keys may leave a field out
    const val = (qi: number) => { for (let j = qi; j >= 0; j--) { const v = f(k[j]); if (v !== undefined) return v; } return def; };
    return lerp(val(i), val(i + 1), ease.sine(u));
  };
  return { p: v3((q) => q.p), t: v3((q) => q.t), fov: cr(a.fov, b.fov, c.fov, d.fov), roll: num((q) => q.roll, 0), focus: num((q) => q.focus, 200), aper: num((q) => q.aper, 0), exp: num((q) => q.exp, 1) };
}

/** the shots alive at film time t with their dissolve weights (weights sum to 1; abutting shots = a hard cut) */
export function shotsAt(shots: Shot[], t: number): { shot: Shot; cam: Cam; w: number }[] {
  const live = shots.filter((s) => t >= s.t0 && t <= s.t1);
  if (!live.length) { const s = t < shots[0].t0 ? shots[0] : shots[shots.length - 1]; return [{ shot: s, cam: sample(s, t), w: 1 }]; }
  if (live.length === 1) return [{ shot: live[0], cam: sample(live[0], t), w: 1 }];
  const [a, b] = live;
  const w = ease.sine(clamp((t - b.t0) / Math.max(a.t1 - b.t0, 1e-4)));
  return [
    { shot: a, cam: sample(a, t), w: 1 - w },
    { shot: b, cam: sample(b, t), w },
  ];
}
export const camAt = (s: Shot, t: number) => sample(s, t);
