// Hollow Moon 3D · camera strings for the look tool (--cams), written with the frame helpers of lib/cam.ts, so a new key
// can be tried as a still before it goes into a shot.
//   npx tsx src/styles/hollow-moon-3d/pipeline/pt.mts "sf(74,-75,140) | sf(50,-62,99) | 38" "ax(200,0,0) | ax(0,0,0) | 42 | 150 | 0"
// each argument: position | target | fov [| focus | aper]; prints one --cams value (entries joined with ";").
// helpers: m(x,y,z) offset from the moon's centre · lc(x,y,z) the moon's own frame (hall, armillary) · rg(deg,rad,ax)
//          the great ring · ax(d,right,up) along the axis of the opening · sf(th,ph,rad) over the surface (th from the
//          axis of the opening, ph around it: 0 = up, 90 = right).   --keys prints the film's own cameras.
import { H, camAt } from "../lib/cam";
import path from "node:path";
import { pathToFileURL } from "node:url";
// the demo film, or yours: FILM=src/v01/film.ts npx tsx …
const FILM_MOD = (await import(process.env.FILM ? pathToFileURL(path.resolve(process.env.FILM)).href : "../demo/film")) as typeof import("../demo/film");
const { CUT, SHOTS } = FILM_MOD;

const args = process.argv.slice(2);
if (args[0] === "--keys") {
  console.log("CUT", Object.entries(CUT).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · "));
  for (const s of SHOTS) for (const t of [s.t0, (s.t0 + s.t1) / 2, s.t1]) { const c = camAt(s, t); console.log(s.id, t.toFixed(2), c.p.map((v) => v.toFixed(1)).join(","), "→", c.t.map((v) => v.toFixed(1)).join(","), "fov", c.fov.toFixed(1)); }
} else {
  // a helper call with plain numbers, e.g. "sf(74, -75, 140)" (parsed, never evaluated)
  const f = (e: string): number[] => {
    const mt = /^(m|lc|rg|ax|sf)\(([-+\d.,\s]*)\)$/.exec(e);
    if (!mt) throw new Error(`cannot read "${e}": use m(), lc(), rg(), ax() or sf() with numbers`);
    const nums = mt[2].split(",").map((s) => Number(s.trim()));
    if (nums.some((v) => !Number.isFinite(v))) throw new Error(`bad number in "${e}"`);
    return (H as unknown as Record<string, (...a: number[]) => number[]>)[mt[1]](...nums);
  };
  console.log(args.map((a) => { const [p, t, ...rest] = a.split("|").map((s) => s.trim()); return [...f(p), ...f(t)].map((v: number) => v.toFixed(2)).concat(rest).join(","); }).join(";"));
}
