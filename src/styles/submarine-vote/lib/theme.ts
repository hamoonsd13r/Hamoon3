// Submarine Vote · fonts and helpers. A cartoon «who stays behind?» format: a cast of cel characters stuck in a
// flooding room, then each one speaks on a phone voice screen and names who should stay; captions never sit on a
// character. Everything is a pure function of t.
import React from "react";

export const FPS = 30, W = 1080, H = 1920;
export const F = {
  ui: "SVInter", // Inter — names on the voice screen and tags
  fa: "SVVazirBlack", // Vazirmatn Black — Persian captions
  faB: "SVVazirB",
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const out3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const io = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const kick = (t: number, a: number, len = 0.3) => (t < a || t > a + len ? 0 : Math.pow(1 - (t - a) / len, 3));
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** smooth value noise in −1..1 */
export const noise = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
};
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
