// Archive Machine · constants, palette, fonts and helpers. Horizontal 1920×1080, 24 fps; every frame is a pure function
// of film time t (seconds). The demo's times are plain numbers in the scenes (cue them to your own soundtrack).
export { clamp, ease, hash, mix, noise1, ramp, TimeCtx, useT } from "./time";
import { clamp, ease, mix } from "./time";

export const FPS = 24, W = 1920, H = 1080;
export const END = 21.6; // the demo film ends on the outro title

export const C = {
  bg: "#020405",
  cyan: "#7FE9F4",
  cyanDim: "rgba(127,233,244,0.55)",
  cyanFaint: "rgba(127,233,244,0.22)",
  teal: "#0E6E78",
  white: "#EAF8FA",
  orange: "#FF8A2A",
  red: "#FF3B30",
};

export const F = {
  hud: "AMChakra", // Chakra Petch — every HUD label and number
  hudB: "AMChakraB",
  ui: "AMInter",
  title: "AMAnton",
};

/** piecewise interpolation through [time, value] keys (eased between neighbours) */
export const kf = (t: number, keys: [number, number][], e: (u: number) => number = ease.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return mix(va, vb, e(b <= a ? 1 : (t - a) / (b - a)));
    }
  }
  return keys[keys.length - 1][1];
};
export const jolt = (t: number, at: number, amp: number, freq = 32, damp = 10) =>
  t < at ? 0 : amp * Math.exp(-(t - at) * damp) * Math.sin((t - at) * freq);
export const punch = (t: number, at: number, decay = 7) => (t < at ? 0 : clamp((t - at) / 0.04) * Math.exp(-Math.max(0, t - at - 0.04) * decay));
