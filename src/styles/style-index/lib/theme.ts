// Style Index · shared constants: the reel frame, the poster frame, the beat grid, fonts,
// easing and deterministic noise. Every frame is a pure function of time.
import React from "react";

export const FPS = 30;
export const W = 1080; // the reel
export const H = 1920;
export const PW = 720; // one style poster (rendered on its own, shown in the reel's card)
export const PH = 1280;
export const POSTER_SEC = 6;

// 120 BPM: card i (0-based) on i seconds = 2 beats; the CTA on 20 s; the music's last stab on 24 s
export const STEP = 1;
export const CTA_AT = 20;
export const HIT = 24;
export const DUR = 24.9;

export const C = {
  paper: "#F6EFE8", // the reel's cream (warmer than the reference's pink cream)
  ink: "#141110",
  inkSoft: "#3A332D",
  mute: "#B9B0A6",
  faint: "#DCD3C9",
  orange: "#FF6A1F",
};

export const F = {
  fa: "SIFaBold", // Vazirmatn Bold
  faH: "SIFaBlack", // Vazirmatn Black
  faS: "SIFaSemi", // Vazirmatn SemiBold
  faHead: "SILalezar", // Lalezar
  inter: "SIInter", // Inter variable 100–900
  anton: "SIAnton",
  chakra: "SIChakra",
  playfair: "SIPlayfair",
  playfairI: "SIPlayfairI",
  bodoni: "SIBodoni",
  bodoniI: "SIBodoniI",
  shrikhand: "SIShrikhand",
  rubikMono: "SIRubikMono",
  bungee: "SIBungee",
  bungeeShade: "SIBungeeShade",
  sedgwick: "SISedgwick",
  marker: "SIMarker",
  wetPaint: "SIWetPaint",
  apple: "SIHomemadeApple",
  reenie: "SIReenie",
  press: "SIPress",
  unbounded: "SIUnbounded",
  syne: "SISyne",
  grotesk: "SIGrotesk",
  monoton: "SIMonoton",
  instrument: "SIInstrument",
  instrumentI: "SIInstrumentI",
  cormorant: "SICormorant",
  cormorantI: "SICormorantI",
  abril: "SIAbril",
  dmSerif: "SIDMSerif",
  dmSerifI: "SIDMSerifI",
  bagel: "SIBagel",
  pinyon: "SIPinyon",
  rye: "SIRye",
  vt: "SIVT323",
  orbitron: "SIOrbitron",
  yeseva: "SIYeseva",
  italiana: "SIItaliana",
  fraktur: "SIFraktur",
  michroma: "SIMichroma",
  caveat: "SICaveat",
  sniglet: "SISniglet",
  bebas: "SIBebas",
  baskerville: "SIBaskerville",
  jp: '"Yu Gothic UI", "Yu Gothic", "Meiryo", "MS Gothic", sans-serif', // system katakana
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ease = {
  out: (u: number) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u: number) => Math.pow(clamp(u), 3),
  inOut: (u: number) => {
    const x = clamp(u);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  outBack: (u: number, s = 1.70158) => {
    const x = clamp(u), c3 = s + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  },
  expo: (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u))),
  expoInOut: (u: number) => {
    const x = clamp(u);
    if (x === 0 || x === 1) return x;
    return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  },
  sine: (u: number) => -(Math.cos(Math.PI * clamp(u)) - 1) / 2,
  // damped spring settle 0 → 1 (overshoots, rings out)
  spring: (u: number, k = 9, d = 6) => (u <= 0 ? 0 : 1 - Math.exp(-d * u) * Math.cos(k * u)),
};
/** a 0→1 move between a and b with an easing */
export const tween = (t: number, a: number, b: number, fn: (u: number) => number = ease.out) => fn(ramp(t, a, b));
/** key-framed value: kf(t, [[t0, v0], [t1, v1], …], easing) */
export const kf = (t: number, keys: [number, number][], fn: (u: number) => number = ease.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], fn(ramp(t, keys[i - 1][0], keys[i][0])));
  return keys[keys.length - 1][1];
};
/** stop-motion: time held on n frames per second */
export const stepT = (t: number, n = 12) => Math.floor(t * n) / n;

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), u) * 2 - 1;
};

export const TimeCtx = React.createContext({ t: 0 });
export const useT = () => React.useContext(TimeCtx);
