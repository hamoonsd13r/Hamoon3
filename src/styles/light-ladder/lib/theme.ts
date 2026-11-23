// Light Ladder · palette, fonts and motion helpers. Near-black stage, ONE light colour (a glowing point that climbs
// obsidian steps), white type, mono labels. Default light = ice blue. Your brand: setPalette({ light, lightHot, lightHi, light300 }).
import React from "react";

export const C = {
  bg: "#050507",
  card: "rgba(14,14,20,.92)",
  fg: "#F2F1F5",
  fgDim: "#A3A1B1",
  line: "rgba(242,241,245,0.09)",
  line2: "rgba(242,241,245,0.18)",
  light: "#7CC8FF", // the point, edges, key words
  lightHot: "#CDEBFF", // the point's core, lit labels
  lightHi: "#E8F6FF", // lit step top edge
  light300: "#9FD6FF", // mono labels, small marks
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
/** rgba() of the light colour (hex) */
export const lightA = (a: number, hex = C.light) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** [r, g, b] of a hex colour */
export const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const FA = "LLFa"; // Vazirmatn
export const MONO = "LLMono"; // IBM Plex Mono
export const LATIN = "LLLatin"; // Inter
export const FPS = 30, W = 1080, H = 1920;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** in over inLen from a, out over outLen before b */
export const win = (t: number, a: number, b: number, inLen = 0.3, outLen = 0.25) => Math.min(ramp(t, a, a + inLen), 1 - ramp(t, b - outLen, b));
/** a decaying kick from a */
export const kick = (t: number, a: number, len = 0.3) => (t < a || t > a + len ? 0 : Math.pow(1 - (t - a) / len, 3));
export const io = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const back = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2));
/** seeded random */
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
