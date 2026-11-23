// Lowpoly Dialogue 3D · palette, font names (all OFL) and the small timing helpers every part of the film uses.
// Change COL.glow to retint the robot's core light and the screen highlight (one accent only).
export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const COL = {
  night: "#0b1030",
  navy: "#141c46",
  ink: "#0b0b0d",
  glow: "#FFB45A", // the one accent: the robot's core light, the screen highlight
  warm: "#FFD9A0", // string lights / city windows
  red: "#E5484D", // only for «no / wrong»
  text: "#ECEAF4",
};

export const FA = "LDFa"; // Vazirmatn SemiBold: the Persian subtitles
export const UI = "LDUi"; // Inter: the laptop app
export const MONO = "LDMono"; // IBM Plex Mono: timers on the screen
export const HUD = "LDHud"; // Chakra Petch: labels on the robot's face

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  in: (x: number) => x * x * x,
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
/** eased 0→1 over [a, a+d] */
export const inK = (t: number, a: number, d = 0.4, e = ease.out) => e(ramp(t, a, a + d));
/** 0→1→0 window: up over [a−d, a], down over [b, b+d] */
export const win = (t: number, a: number, b: number, d = 0.25) => Math.min(ramp(t, a - d, a), 1 - ramp(t, b, b + d));
/** an impulse at `at` that decays with time constant tau */
export const hit = (t: number, at: number, tau = 0.15) => (t < at ? 0 : Math.exp(-(t - at) / tau));
/** stable pseudo-random 0..1 from a number */
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** smooth wobble −1..1 (two sines), for handheld camera and idle life */
export const wob = (t: number, seed: number, f = 1) => Math.sin(t * f * 1.31 + seed * 1.7) * 0.6 + Math.sin(t * f * 2.93 + seed * 4.1) * 0.4;
