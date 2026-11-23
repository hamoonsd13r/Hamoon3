// Hollow Moon 3D · where the key light falls from in each shot's picture (x: from the right, y: from above). A crater
// reads as a bowl only when the light comes from the top of the picture (up > 0); lit from below it reads as a dome.
//   npx tsx src/styles/hollow-moon-3d/pipeline/lightdir.mts
import { camAt } from "../lib/cam";
import path from "node:path";
import { pathToFileURL } from "node:url";
// the demo film, or yours: FILM=src/v01/film.ts npx tsx …
const FILM_MOD = (await import(process.env.FILM ? pathToFileURL(path.resolve(process.env.FILM)).href : "../demo/film")) as typeof import("../demo/film");
const { SHOTS } = FILM_MOD;

/** the key light of the scene: the bright part of the real cloud deck, up and behind the lens of shot A (engine.ts KEY) */
const KEY = [-0.55, 0.62, 0.56];
const n = (v: number[]) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const K = n(KEY);
for (const s of SHOTS) for (const t of [s.t0, (s.t0 + s.t1) / 2, s.t1]) {
  const c = camAt(s, t), v = n([c.t[0] - c.p[0], c.t[1] - c.p[1], c.t[2] - c.p[2]]);
  const r = n(cross(v, [0, 1, 0])), u = cross(r, v);
  console.log(s.id, t.toFixed(2), "light from right", dot(K, r).toFixed(2), "up", dot(K, u).toFixed(2), "towards lens", (-dot(K, v)).toFixed(2));
}
