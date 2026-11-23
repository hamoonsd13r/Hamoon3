// Hollow Moon 3D · the brand the film carries: a logo as vector paths, and the words engraved on the gold rings.
// The logo comes from the kit tool (any transparent PNG of a logo, ≥ 1000 px wide):
//   node tools/logo-trace.mjs logo.png src/vNN --accent=#FF5A1F --sub=x0,y0,x1,y1 --only=paths --preview
// → logo-paths.json { w, h, box, cut, main, accent?, sub? }: main = the mark/wordmark (extruded as solid letters that
// ignite from left to right), accent = the pixels near the --accent colour (lands last with a quarter turn),
// sub = a second line inside the --sub box, one path per letter (revealed letter by letter). No logo? Render the
// text card (Style-HollowMoon3D-LogoCard) to a PNG and trace that.
import { THEME, type Theme } from "./theme";

export type LogoPaths = { w: number; h: number; box?: number[]; cut?: number; main: string; accent?: string; sub?: string[] };
export type Brand = {
  logo: LogoPaths;
  /** words engraved between the graduations of the gold rings (Latin capitals read best; 6 repeats per ring) */
  inscription: string[];
  /** a line of light along the horizontal cut through the logo: only for a logo that really has such a cut (`cut`) */
  slit?: boolean;
  theme?: Partial<Theme>;
};

type Box = { x0: number; x1: number; y0: number; y1: number };
export type LogoGeom = {
  main: Box;
  accent: Box | null;
  sub: Box | null;
  /** the logo line of the cut (slit) and the line that becomes y = 0 in the core (middle of everything) */
  cutY: number;
  cy: number;
  slit: boolean;
  paths: { main: string; accent: string | null; sub: string[] };
};

/** the logo of the film being built (set once by the engine before anything reads it) */
export const LOGO: LogoGeom = {
  main: { x0: 0, x1: 1, y0: 0, y1: 1 }, accent: null, sub: null, cutY: 0.5, cy: 0.5, slit: false,
  paths: { main: "", accent: null, sub: [] },
};
/** the look tokens in force (theme.ts merged with the brand's overrides) */
export const TH: Theme = { ...THEME };

/** bounding box of "M x y L x y … Z" path strings (logo units) */
export function boxOf(paths: string[]): Box {
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const d of paths) {
    const n = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    for (let i = 0; i + 1 < n.length; i += 2) {
      b.x0 = Math.min(b.x0, n[i]); b.x1 = Math.max(b.x1, n[i]);
      b.y0 = Math.min(b.y0, n[i + 1]); b.y1 = Math.max(b.y1, n[i + 1]);
    }
  }
  return b;
}

export function setBrand(b: Brand) {
  const L = b.logo;
  if (!L?.main) throw new Error("brand.logo needs at least `main` (a path string from tools/logo-trace.mjs)");
  const accent = L.accent && L.accent.trim() ? L.accent : null;
  const sub = (L.sub ?? []).filter((d) => d.trim());
  // the word on the ring and the extruded name are the main mark + its accent; the box of both sets the scale
  const main = boxOf(accent ? [L.main, accent] : [L.main]);
  const all = boxOf([L.main, ...(accent ? [accent] : []), ...sub]);
  LOGO.main = main;
  LOGO.accent = accent ? boxOf([accent]) : null;
  LOGO.sub = sub.length ? boxOf(sub) : null;
  LOGO.cutY = L.cut ?? (main.y0 + main.y1) / 2;
  LOGO.cy = (all.y0 + all.y1) / 2;
  LOGO.slit = !!b.slit;
  LOGO.paths = { main: L.main, accent, sub };
  Object.assign(TH, THEME, b.theme ?? {});
}
