// Premiere Showcase · palette, fonts, the music grid and time helpers. A premiere night: near-black page, the films
// are the light, one champagne accent for counters, chips and the running-time sum. No light effects: footage,
// type and motion. Your brand: setPalette({ accent, accentHi }).
import React from "react";

export const C = {
  bg: "#06060a",
  page: "#050507",
  cream: "#f1e9db",
  dim: "rgba(241,233,219,0.6)",
  accent: "#e6c084", // champagne (counters, chips, the sum)
  accentHi: "#ffe6b0",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const n = parseInt(C.accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const F = {
  head: "PSLalezar", // Lalezar — kinetic headlines
  anton: "PSAnton", // Anton — huge numerals
  fa: "PSFa", // Vazirmatn Black
  faBold: "PSFaBold", // Vazirmatn Bold — captions
  faSemi: "PSFaSemi", // Vazirmatn SemiBold
  num: "PSNum", // Chakra Petch SemiBold — running times, counters
};
export const FPS = 30, W = 1080, H = 1920;

/** the music grid: beat i at OFFSET + i × BEAT (set both for your song; cuts and hits sit on beats) */
export const GRID = { beat: 0.5, offset: 0.5 };
export const beat = (i: number) => GRID.offset + i * GRID.beat;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  expo: (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
};
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** running time as players show it (whole seconds) */
export const runtime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useTF = () => React.useContext(TimeCtx);
