// Verdict Noir · palette, fonts and motion helpers. A courtroom thriller: ink black, ONE danger red, cream legal paper,
// walnut and brass; gavel hits, red ink stamps, papers that fly at the lens, a camera that films a desk.
// Default accent = the red. Your palette: setPalette({ red, red2, redDeep, ai }).
import React from "react";

export const C = {
  ink: "#07070A",
  ink2: "#0E0E12",
  panel: "#141418",
  panel2: "#1B1B21",
  line: "rgba(244,238,230,0.10)",
  line2: "rgba(244,238,230,0.18)",
  cream: "#F4EEE6", // text on black
  dim: "rgba(244,238,230,0.62)",
  faint: "rgba(244,238,230,0.34)",
  paper: "#F2EBDD", // legal paper / documents
  paper2: "#E6DCC8",
  inkOnPaper: "#1A1714",
  red: "#E5322D", // THE accent: danger, verdicts, stamps, key words
  red2: "#FF5A4E", // red text on black (lighter, readable)
  redDeep: "#5A0D0D",
  ai: "#F7E7C6", // the machine's writing cursor / marks (a warm white light)
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);

/** font families (all OFL, public/fonts) */
export const F = {
  ui: "VNInter", // Inter — UI and Latin labels
  head: "VNLalezar", // Lalezar — big Persian words, captions, stamps
  fa: "VNVazirBlack", // Vazirmatn Black — Persian titles on cards
  vz: "VNVazir", // Vazirmatn Regular — document body
  vzB: "VNVazirB", // Vazirmatn Bold — document titles, lists
  anton: "VNAnton", // timers and big numbers
  serif: "VNBaskerville", // Libre Baskerville — English legal type («ATTORNEY AT LAW», the giant backdrop word)
  cond: "VNOswald", // condensed caps labels (CASE FILE, EXHIBIT A…)
};

export const FPS = 30, W = 1080, H = 1920;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  in: (x: number) => clamp(x) ** 3,
  out: (x: number) => 1 - (1 - clamp(x)) ** 3,
  inOut: (x: number) => {
    const c = clamp(x);
    return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
  },
  outBack: (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
};
export const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
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
/** a damped jolt from `at` (gavel slams, camera kicks) */
export const jolt = (t: number, at: number, amp: number, freq = 30, damp = 9) => (t < at ? 0 : amp * Math.exp(-(t - at) * damp) * Math.sin((t - at) * freq));
/** a one-sided punch: 0 → 1 in 60 ms, then decays */
export const punch = (t: number, at: number, decay = 6) => (t < at ? 0 : clamp((t - at) / 0.06) * Math.exp(-Math.max(0, t - at - 0.06) * decay));
/** settle 0→1 with a small overshoot (exactly 0 before `a`, so gates stay closed) */
export const pop = (t: number, a: number, d = 0.42) => (t <= a ? 0 : ease.outBack(clamp((t - a) / d)));
export const inn = (t: number, a: number, d = 0.4) => ease.out(clamp((t - a) / d));
export const out = (t: number, a: number, d = 0.3) => 1 - ease.inOut(clamp((t - a) / d));

/** a soft text shadow that keeps type readable over anything */
export const SD = "0 2px 6px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.5)";
/** Latin digits → Persian digits (Persian labels; the big timers stay Latin) */
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
