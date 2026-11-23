// Paper UI · palette, fonts, time helpers. A light product look: warm paper with a moving dot grid, soft glows, one
// faint giant word per section; white cards and light app windows, dark devices; one accent for fills (orange by
// default) and a deeper shade for accent TEXT on paper (never a light accent as text on cream).
// Your brand: setPalette({ accent, accentHi, accentInk }).
import React from "react";

export const C = {
  bg: "#F3F0E9",
  bg2: "#E8E2D5",
  ink: "#111116",
  sub: "#6E6A76",
  line: "rgba(17,17,22,0.08)",
  card: "#FFFFFF",
  dark: "#0E0E14",
  dark2: "#181822",
  accent: "#FF8A3D", // fills: markers, buttons, the lit calendar day
  accentHi: "#FFC29A",
  accentInk: "#C2560E", // accent text on paper
  red: "#E5484D", // alarms, stamps, missed calls
  green: "#1F9D6B",
  ghost: "#E6E0D2",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const n = parseInt(C.accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const FA = "PUFa"; // Vazirmatn
export const LATIN = "PUInter"; // Inter
export const MONO = "PUMono"; // IBM Plex Mono
export const FPS = 30, W = 1080, H = 1920;
export const SUB_Y = 1530;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const eo = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const eio = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
/** overshoot ease, exactly 0 before the start */
export const back = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const pop = (t: number, t0: number, d = 0.45) => back(ramp(t, t0, t0 + d));
/** a slow float */
export const bob = (t: number, amp = 8, sp = 1.3, ph = 0) => Math.sin(t * sp + ph) * amp;
/** a damped wobble after `t0` (a stamp hit, a shake) */
export const wob = (t: number, t0: number, amp: number, freq = 30, decay = 7) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * decay) * Math.sin((t - t0) * freq));
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
