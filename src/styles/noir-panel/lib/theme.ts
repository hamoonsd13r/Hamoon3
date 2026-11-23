// Noir Panel · palette, fonts, time helpers. Near-black, one rounded footage window, white captions with the key
// words in one accent, a chapter tag top right and a mono source label on the footage. Minimal and cinematic.
// Default accent: warm coral. Your brand: setPalette({ accent, accentHi, accentLo }).
import React from "react";

export const C = {
  bg: "#050507",
  panel: "#0B0B10",
  line: "rgba(255,255,255,0.09)",
  text: "#F2F1F5",
  dim: "#9B99A8",
  accent: "#FF8A5B",
  accentHi: "#FFC2A6",
  accentLo: "#E0602F",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const n = parseInt(C.accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const FA = "NPFa"; // Vazirmatn
export const MONO = "NPMono"; // IBM Plex Mono
export const FPS = 30, W = 1080, H = 1920;
export const SHADOW = "0 2px 16px rgba(0,0,0,.8)";
/** the footage window (frame px) */
export const PANEL = { x: 48, y: 300, w: 984, h: 1100, r: 34 };
/** subtitle line centre (under the window, above the IG caption) */
export const SUB_Y = 1468;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const back = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
