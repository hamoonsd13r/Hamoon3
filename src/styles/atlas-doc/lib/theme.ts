// Atlas Doc · palette, fonts, curves, time. A long-form documentary look: near-black, bone-white type, a cold
// satellite map, and TWO semantic colours only — `zone` (the side/area the story is about: losses, a territory, a
// flood) and `mark` (highlights, routes, the thing to look at). One film = these two and nothing else.
// Your brand colours: setPalette({ zone: "#…", mark: "#…" }) at module load.
import React from "react";

export const C = {
  ink0: "#050608", // deepest background, end card
  ink1: "#0a0c10", // panels
  sea: "#05080c", // the map's sea (no satellite tiles)
  land: "#14181f", // the map's land (no satellite tiles)
  landHi: "#1c222b", // the focus country (no satellite tiles)
  bone: "#eee8dc", // primary text
  boneDim: "rgba(238,232,220,0.72)",
  boneFaint: "rgba(238,232,220,0.38)",
  ash: "#9aa0a8",
  hair: "rgba(238,232,220,0.16)",
  zone: "#e8572e", // areas, losses, the subject's territory (warm red-orange)
  mark: "#ffc94a", // highlights, routes, key words (warm yellow)
  river: "rgba(120,150,185,0.55)",
  plate: "rgba(5,6,8,0.80)", // the dark backing for any text over pictures
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);

/** every clip and photo is graded into one world: a touch of contrast, less colour, cool shadows */
export const GRADE = "contrast(1.2) saturate(0.76) brightness(0.98) sepia(0.1)";

export const F = {
  title: "ADTitle", // Vazirmatn Black — titles, chapter names, big numbers
  faB: "ADFaB", // Vazirmatn Bold — headlines
  faS: "ADFaS", // Vazirmatn SemiBold — labels
  faL: "ADFaL", // Vazirmatn Regular — quiet numbers
  lat: "ADLat", // Chakra Petch — Latin tags, sources, kickers (UPPERCASE)
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const ease = {
  in: (u: number) => u * u * u,
  out: (u: number) => 1 - Math.pow(1 - u, 3),
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outBack: (u: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
};
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** Latin digits → Persian (thousands separator ٬) */
export const fa = (s: string | number) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[+d]).replace(/,/g, "٬");

/** the film clock for nested pieces (footage needs the frame, not only t) */
export const TimeCtx = React.createContext<{ t: number; frame: number }>({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
