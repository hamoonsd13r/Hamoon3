// Explore Wall · palette, fonts, time helpers. «Explore Noir»: an Instagram-dark world where the reel covers are the
// colour, one accent for rings and lifted numbers, the Instagram gradient only for profile rings.
// Default accent: warm red. Your brand: setPalette({ accent, accentHi, accentDeep }).
import React from "react";

export const C = {
  bg: "#05070B",
  bg2: "#0A0E15",
  ig: "#0B0E14", // Instagram's dark background
  panel: "#11151C",
  panel2: "#171C25",
  line: "rgba(244,238,230,0.10)",
  line2: "rgba(244,238,230,0.18)",
  cream: "#F4EEE6",
  dim: "rgba(244,238,230,0.64)",
  faint: "rgba(244,238,230,0.36)",
  accent: "#FF4D4D",
  accentHi: "#FF7A6E",
  accentDeep: "#A4161A",
  ig1: "#FEDA75",
  ig2: "#FA7E1E",
  ig3: "#D62976",
  ig4: "#962FBF",
  ig5: "#4F5BD5",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const n = parseInt(C.accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const F = {
  ui: "EWInter", // Inter — numbers, UI
  fa: "EWFa", // Vazirmatn Black — Persian display
  faB: "EWFaB", // Vazirmatn Bold — Persian labels
  vz: "EWVazir", // Vazirmatn Regular — Persian UI text
  head: "EWLalezar", // Lalezar — captions
};
export const FPS = 30, W = 1080, H = 1920;
export const SD = "0 2px 6px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.5)";

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
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** spring-ish settle 0→1 (exactly 0 before `a`) */
export const pop = (t: number, a: number, d = 0.42) => (t <= a ? 0 : ease.outBack(clamp((t - a) / d)));

/** music grid: set BEAT (s) for your song */
export const MUSIC = { beat: 0.48, offset: 0 };
export const beatPulse = (t: number, decay = 9) => {
  const x = (t + MUSIC.offset) / MUSIC.beat;
  return Math.exp(-(x - Math.floor(x)) * MUSIC.beat * decay);
};

/** «1.2M» / «950K» (never «1.0M») */
export const fmtV = (v: number) => {
  if (v >= 1e6) {
    const m = Math.round(v / 1e5) / 10;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return `${Math.round(v)}`;
};

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
