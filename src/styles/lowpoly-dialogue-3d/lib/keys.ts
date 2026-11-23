// Tiny keyframe system: every channel is a list of [time, value] keys; between keys the value eases (smoothstep).
import { clamp } from "./theme";

export type Keys = [number, number][];

/** value of a key track at t (holds before the first / after the last key) */
export function K(t: number, keys: Keys, def = 0): number {
  if (!keys.length) return def;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [b, vb] = keys[i];
    if (t <= b) {
      const [a, va] = keys[i - 1];
      const k = b <= a ? 1 : clamp((t - a) / (b - a));
      const s = k * k * (3 - 2 * k);
      return va + (vb - va) * s;
    }
  }
  return keys[keys.length - 1][1];
}

/** a pose "move": go to v over [a, a+inD], hold, come back to rest over [b, b+outD] (rest = value before) */
export const move = (rest: number, v: number, a: number, b: number, inD = 0.35, outD = 0.45): Keys => [
  [a, rest],
  [a + inD, v],
  [b, v],
  [b + outD, rest],
];

/** merge several key lists into one sorted track (later keys win at equal times) */
export const track = (...parts: Keys[]): Keys => parts.flat().sort((x, y) => x[0] - y[0]);

/** a sequence of target values reached at given times (each segment eases over d seconds before its time) */
export const steps = (start: number, pts: [number, number][], d = 0.35): Keys => {
  const out: Keys = [[0, start]];
  let cur = start;
  for (const [tm, v] of pts) {
    out.push([tm - d, cur], [tm, v]);
    cur = v;
  }
  return out.sort((x, y) => x[0] - y[0]);
};
