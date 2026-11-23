// Arcade Reel · palette, fonts and motion helpers. Footage-first game reels: full-bleed gameplay with a camera (push,
// beat kicks, shake on hits), accent callouts that stay on a detail of the footage, HUD widgets, phrase captions with
// the spoken word lit. One accent on near-black. Your brand: setPalette({ accent, accentHot, accentHi, accent300, onAccent }).
import React from "react";

export const C = {
  ink: "#060608",
  fg: "#F2F1F5",
  fgDim: "#A6A4B2",
  line: "rgba(242,241,245,0.09)",
  line2: "rgba(242,241,245,0.18)",
  card: "#0E0E14",
  cardHi: "#17171F",
  badge: "#1C1C25",
  accent: "#FF5A36", // callouts, the spoken word, gauges
  accentHot: "#FFC2AE", // needle, hot centres
  accentHi: "#FF8F70",
  accent300: "#FF9C82", // mono labels
  onAccent: "#1A0905", // text on an accent fill
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
/** rgba() of the accent (hex) */
export const accentA = (a: number, hex = C.accent) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const FA = "ARFa"; // Vazirmatn
export const MONO = "ARMono"; // IBM Plex Mono
export const LATIN = "ARLatin"; // Inter
export const FPS = 30, W = 1080, H = 1920;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const kick = (t: number, a: number, len = 0.3) => (t < a || t > a + len ? 0 : Math.pow(1 - (t - a) / len, 3));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const io = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const back = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2));
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
