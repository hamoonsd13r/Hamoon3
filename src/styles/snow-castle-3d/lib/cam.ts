// Snow Castle 3D · the camera grammar and the film spec. A film = a list of slow shots (Catmull-Rom through keys,
// joined by dissolves) + two clocks (dusk and the light clock). Every value is a pure function of film time.
// The accepted film's own shots live in demo/film.ts.
import { catmull, clamp, ease, lerp } from "./util";

export type V3 = [number, number, number];
/** focus = distance in metres · aper = blur constant in px·m at 1080p (0 = everything sharp) */
export type Cam = { p: V3; t: V3; fov: number; roll?: number; focus?: number; aper?: number };
export type Key = { at: number; p: V3; t: V3; fov: number; focus?: number; aper?: number };
/** a shot lives from t0 to t1; where two shots overlap the film dissolves between them */
export type Shot = { id: string; t0: number; t1: number; keys: Key[] };

/** what the engine needs from a film */
export type FilmSpec = {
  dur: number;
  shots: Shot[];
  /** spruces set by hand for the opening (x, z, height, turn): trees the scatter would put in the lens are removed */
  openingTrees?: [number, number, number, number][];
  /** 0 = the cold afternoon, 1 = dusk: sky, sky light and key fall together, the grade turns bluer */
  duskAt: (t: number) => number;
  /** the light clock: each window and lantern of the castle has its own second on this clock (castle.ts · tOn) */
  litAt: (t: number) => number;
  /** fade in over the first `in` seconds, fade out between out[0] and out[1] (film seconds) */
  fade?: { in: number; out: [number, number] };
};

export function sampleShot(s: Shot, t: number): Cam {
  const k = s.keys;
  const tt = clamp(t, k[0].at, k[k.length - 1].at);
  let i = 0;
  while (i < k.length - 2 && tt > k[i + 1].at) i++;
  const a = k[Math.max(i - 1, 0)], b = k[i], c = k[i + 1], d = k[Math.min(i + 2, k.length - 1)];
  const u = (tt - b.at) / (c.at - b.at);
  const v3 = (f: (q: Key) => V3): V3 => [0, 1, 2].map((j) => catmull(f(a)[j], f(b)[j], f(c)[j], f(d)[j], u)) as V3;
  return { p: v3((q) => q.p), t: v3((q) => q.t), fov: catmull(a.fov, b.fov, c.fov, d.fov, u), focus: lerp(b.focus ?? 200, c.focus ?? 200, ease.sine(u)), aper: lerp(b.aper ?? 0, c.aper ?? 0, ease.sine(u)) };
}

/** the shots alive at film time t with their dissolve weights (weights sum to 1) */
export function shotsAt(shots: Shot[], t: number): { shot: Shot; cam: Cam; w: number }[] {
  const live = shots.filter((s) => t >= s.t0 && t <= s.t1);
  if (!live.length) {
    const s = t < shots[0].t0 ? shots[0] : shots[shots.length - 1];
    return [{ shot: s, cam: sampleShot(s, t), w: 1 }];
  }
  if (live.length === 1) return [{ shot: live[0], cam: sampleShot(live[0], t), w: 1 }];
  const [a, b] = live;
  const w = ease.sine(clamp((t - b.t0) / Math.max(a.t1 - b.t0, 1e-4)));
  return [
    { shot: a, cam: sampleShot(a, t), w: 1 - w },
    { shot: b, cam: sampleShot(b, t), w },
  ];
}

/** points the cameras pass (the world spends its detail there: hero trees, boulders, real lamp lights) */
export function camPath(shots: Shot[]): V3[] {
  const out: V3[] = [];
  for (const s of shots) for (let t = s.t0; t <= s.t1; t += 0.5) out.push(sampleShot(s, t).p);
  return out;
}
