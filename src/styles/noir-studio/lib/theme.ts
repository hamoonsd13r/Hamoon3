// Noir Studio · palette, fonts, time helpers. A black studio lit by ONE clean colour per section (never a muddy mix),
// a giant outlined word sliding behind, contour lines, a glossy floor; real-looking app screens built in code; numbers
// that lift off a screen toward the lens; word-by-word captions. Default accent: orange. Your brand: setPalette().
import React from "react";

export const C = {
  bg: "#060708",
  bg2: "#0c0e11",
  panel: "#121418",
  panel2: "#181b20",
  line: "rgba(244,238,230,0.10)",
  line2: "rgba(244,238,230,0.18)",
  cream: "#F4EEE6",
  dim: "rgba(244,238,230,0.62)",
  faint: "rgba(244,238,230,0.36)",
  accent: "#FF6A1F", // the one accent (bars under lifted numbers, keys in captions, buttons)
  accent2: "#FF8B45",
  accentSoft: "rgba(255,106,31,0.16)",
  yt: "#FF0033", // the platforms' own colours, only inside their screens
  ig1: "#FEDA75",
  ig2: "#FA7E1E",
  ig3: "#D62976",
  ig4: "#962FBF",
  ig5: "#4F5BD5",
  igBlue: "#4A5DF9",
  ok: "#3DDC84", // a «sent / done» tick inside app UI only
  red: "#FF3B3B",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const IG_GRAD = () => `linear-gradient(45deg, ${C.ig1} 0%, ${C.ig2} 25%, ${C.ig3} 50%, ${C.ig4} 75%, ${C.ig5} 100%)`;

export const F = {
  ui: "NSInter", // Inter (variable 100–900) — every app screen, big Latin numbers
  head: "NSLalezar", // Lalezar — kinetic Persian words, captions
  fa: "NSFa", // Vazirmatn Black — Persian display
  faB: "NSFaB", // Vazirmatn Bold — Persian labels
  faS: "NSFaS", // Vazirmatn SemiBold
  vz: "NSVazir", // Vazirmatn Regular — Persian text inside app screens
  vzB: "NSFaB",
  anton: "NSAnton", // Anton — the giant outlined backdrop word
};

export const FPS = 30, W = 1080, H = 1920;

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
  outBack: (u: number) => {
    const x = clamp(u), c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** the music grid: set BEAT (s) for your song; pulses peak on each beat / bar downbeat */
export const MUSIC = { beat: 0.5, offset: 0 };
export const beatPulse = (t: number, decay = 9) => {
  const x = (t + MUSIC.offset) / MUSIC.beat;
  return Math.exp(-(x - Math.floor(x)) * MUSIC.beat * decay);
};
export const barPulse = (t: number, decay = 5) => {
  const x = (t + MUSIC.offset) / (MUSIC.beat * 4);
  return Math.exp(-(x - Math.floor(x)) * MUSIC.beat * 4 * decay);
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
/** a damped jolt that starts at `at` (punches and kicks) */
export const jolt = (t: number, at: number, amp: number, freq = 30, damp = 9) => (t < at ? 0 : amp * Math.exp(-(t - at) * damp) * Math.sin((t - at) * freq));
/** a one-sided punch: 0 → 1 in 60 ms, then decays */
export const punch = (t: number, at: number, decay = 6) => (t < at ? 0 : clamp((t - at) / 0.06) * Math.exp(-Math.max(0, t - at - 0.06) * decay));
/** spring-ish settle 0→1 with a small overshoot (gated on time: exactly 0 before `a`) */
export const pop = (t: number, a: number, d = 0.42) => (t <= a ? 0 : ease.outBack(clamp((t - a) / d)));
export const inn = (t: number, a: number, d = 0.4) => ease.out(clamp((t - a) / d));
export const out = (t: number, a: number, d = 0.3) => 1 - ease.inOut(clamp((t - a) / d));
/** "14.7K"-style counter text */
export const fmtK = (v: number, dec = 1) => {
  const s = v >= 1e6 ? `${(v / 1e6).toFixed(dec)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e5 ? 0 : dec)}K` : `${Math.round(v)}`;
  return s.replace(/\.0(?=[KM])/, "");
};
export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
/** a soft text shadow that keeps type readable over anything */
export const SD = "0 2px 6px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.5)";

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
