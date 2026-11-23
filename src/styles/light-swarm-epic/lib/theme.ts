// Light Swarm Epic · constants, helpers, fonts and the words the HUD writes. Fonts: Chakra Petch (HUD, captions) + Anton
// (kinetic type), both OFL. The song grid lives in the film's score (demo/score.ts), not here.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
/** the countdown runs TOTAL → 00:00 over the whole film (the score sets it: setTotal(END)) */
export let TOTAL = 600;
export const setTotal = (s: number) => {
  TOTAL = s;
};
/** every word the HUD writes on screen: change them for your event */
export const COPY = { startsIn: "THE LIVE STARTS IN", corner: "YOUR BRAND · LIVE", live: "WE'RE LIVE", brand: "YOUR BRAND" };

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  out: (k: number) => 1 - (1 - k) ** 3,
  in: (k: number) => k ** 3,
  io: (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  expo: (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
};
export const hit = (t: number, at: number, tau = 0.1) => (t < at ? 0 : Math.exp(-(t - at) / tau));
export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** a damped shake (px) after each time in `at` */
export const shake = (t: number, at: number[], amp = 9, tau = 0.11) => {
  let x = 0;
  let y = 0;
  for (const a of at) {
    const d = t - a;
    if (d < 0 || d > 0.6) continue;
    const k = amp * Math.exp(-d / tau);
    x += k * Math.sin(d * 71 + a * 13);
    y += k * Math.cos(d * 57 + a * 7) * 0.7;
  }
  return [x, y] as const;
};

/** this style's files: public/styles/light-swarm-epic/<p> (footage clips go in clips/) */
export const asset = (p: string) => staticFile(`styles/light-swarm-epic/${p}`);

export const CH = "EpicHud";
export const AN = "EpicType";
const FONTS: [string, string, string][] = [
  [CH, "fonts/ChakraPetch-Light.ttf", "300"],
  [CH, "fonts/ChakraPetch-Regular.ttf", "400"],
  [CH, "fonts/ChakraPetch-Medium.ttf", "500"],
  [CH, "fonts/ChakraPetch-SemiBold.ttf", "600"],
  [CH, "fonts/ChakraPetch-Bold.ttf", "700"],
  [AN, "fonts/Anton-Regular.ttf", "400"],
];
let fontsP: Promise<unknown> | null = null;
export const useEpicFonts = () => {
  const [h] = useState(() => delayRender("light-swarm-epic fonts"));
  useEffect(() => {
    fontsP ??= Promise.all(FONTS.map(([fam, file, weight]) => new FontFace(fam, `url(${staticFile(file)})`, { weight }).load().then((f) => document.fonts.add(f))));
    fontsP.then(() => continueRender(h)).catch((e) => {
      console.error(e);
      continueRender(h);
    });
  }, [h]);
};
