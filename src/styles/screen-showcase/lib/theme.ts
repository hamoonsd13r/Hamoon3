// Screen Showcase · palette, fonts, time helpers. A coding-night look: near-black, a faint moving grid, two soft
// colour glows, scrolling code far behind; windows (browser / app) with real screens inside; one accent colour.
// Default accent: orange. Your brand: setPalette({ accent, accentHi, accentLo }).
import React from "react";

export const C = {
  bg: "#07080B",
  panel: "#0E0F14",
  panel2: "#15161D",
  chrome: "#121319",
  line: "rgba(255,255,255,0.08)",
  text: "#F2F1F5",
  dim: "rgba(242,241,245,0.62)",
  faint: "rgba(242,241,245,0.36)",
  accent: "#FF8A3D", // marks, carets, the send button, keys in captions
  accentHi: "#FFB27F",
  accentLo: "#C8571A",
  // syntax + glows (the screen's own colours)
  cyan: "#5CC8FF",
  violet: "#A78BFA",
  pink: "#FF7AB0",
  green: "#4ADE80",
  yellow: "#FFD166",
  glowA: "rgba(214,58,249,0.13)",
  glowB: "rgba(79,123,255,0.13)",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const h = C.accent.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const FA = "SSFa"; // Vazirmatn (400–900)
export const LATIN = "SSInter"; // Inter
export const MONO = "SSMono"; // IBM Plex Mono
export const FPS = 30, W = 1080, H = 1920;
export const SHADOW = "0 2px 6px rgba(0,0,0,.6), 0 10px 40px rgba(0,0,0,.55)";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const eo = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
export const eio = (u: number) => {
  const x = clamp(u);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** spring-ish settle 0→1 with a small overshoot (exactly 0 before `a`) */
export const pop = (t: number, a: number, d = 0.4) => {
  if (t <= a) return 0;
  const x = clamp((t - a) / d), c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** Persian digits */
export const faNum = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
