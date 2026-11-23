// Archive Doc · palette, fonts, time. A warm black-and-white archival documentary: every clip and photo graded into
// one world (GRADE), cream type on dark plates, ONE warm accent (`brass`) and one "other side" colour (`red`) for
// maps and report sketches. Your colours: setPalette({ brass: "#…" }) at module load.
import React from "react";

export const C = {
  ink: "#0b0a08", // warm black
  base: "#14120e",
  cream: "#efe6d2",
  creamDim: "rgba(239,230,210,0.74)",
  creamFaint: "rgba(239,230,210,0.38)",
  paper: "#e6dcc4", // report sketches, dossier cards
  paperDark: "#cfc2a3",
  inkLine: "#22201a",
  brass: "#d9a441", // the one warm accent: rules, labels, the side we follow
  red: "#b8402e", // the other side on maps and sketches, hits, stamps
  shade: "rgba(8,7,5,0.62)",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);

/** all footage is graded into one world: warm black-and-white, a little contrast (a colour film: drop grayscale) */
export const GRADE = "grayscale(1) sepia(0.18) contrast(1.12) brightness(1.03)";

export const F = {
  title: "ARTitle", // Vazirmatn Black — the film title, chapter names
  fa: "ARFa", // Vazirmatn Bold — captions, name supers
  faS: "ARFaS", // Vazirmatn SemiBold
  ui: "ARUi", // Vazirmatn 400–900 — small text, spec rows
  mono: "ARMono", // Vazir Code — typed report labels, dossier lines
  lat: "ARLat", // Libre Baskerville — Latin dates and places in print style
  num: "ARNum", // Oswald — big condensed numbers
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  outBack: (u: number) => {
    const x = clamp(u), c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
/** deterministic noise (the same value for the same inputs — every frame is a pure function of time) */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};
export const fa = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
