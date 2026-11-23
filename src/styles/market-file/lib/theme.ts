// Market File · palette, fonts, curves, small maths. ONE accent per film (default warm orange on ink / on the accent
// flood: ink). Never neon green, teal or purple. Put your own brand colour in with setPalette({ accent: "#…" }) at the
// top of your video file (module load, before the first render).
export const C = {
  ink: "#0b0b0c", // main background
  ink2: "#060607", // deep: the music-stop beat, interludes
  ink3: "#141416", // card surfaces, empty footage slots
  cream: "#f2efe8", // main text on footage / ink
  creamDim: "rgba(242,239,232,.66)",
  creamMute: "rgba(242,239,232,.42)",
  line: "rgba(242,239,232,.07)",
  line2: "rgba(242,239,232,.15)",
  accent: "#f2762e", // the only accent: chips, rings, drawn lines, the flood
  accentGlow: "rgba(242,118,46,.35)",
  accentSoft: "rgba(242,118,46,.14)",
  neg: "#ff5c5c", // a falling price / a broken claim only
};

/** ink text tones when the background is the accent flood or paper */
export const INK = {
  dim: "rgba(11,11,12,.74)",
  mute: "rgba(11,11,12,.55)",
  line: "rgba(11,11,12,.18)",
};

/** swap colours for your brand (call once at module load) */
export const setPalette = (p: Partial<typeof C>) => {
  Object.assign(C, p);
  if (p.accent && !p.accentGlow) C.accentGlow = hexA(p.accent, 0.35);
  if (p.accent && !p.accentSoft) C.accentSoft = hexA(p.accent, 0.14);
};
export const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** the current accent at alpha a (follows setPalette) */
export const accentA = (a: number) => hexA(C.accent, a);

// font families registered by fonts.ts (all OFL, from public/fonts)
export const FA = "MFFa"; // Vazirmatn 400/600/700/900 — every Persian line
export const LATIN = "MFLatin"; // Inter (variable) — Latin names, big Latin numbers
export const MONO = "MFMono"; // IBM Plex Mono 500/600 — HUD labels, sources, tickers (UPPERCASE)

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// two curves: entries/moves (easeOut), wipes/floods (easeCinema)
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
};
export const easeOut = bezier(0.16, 1, 0.3, 1);
export const easeCinema = bezier(0.85, 0.05, 0.18, 1);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 before a, up over inLen, hold, down to 0 ending at b */
export const win = (t: number, a: number, b: number, inLen = 0.3, outLen = 0.25) => Math.min(ramp(t, a, a + inLen), 1 - ramp(t, b - outLen, b));
/** a decaying hit that starts at a (1 → 0 over len, cubic) */
export const kick = (t: number, a: number, len = 0.3) => (t < a || t > a + len ? 0 : Math.pow(1 - (t - a) / len, 3));
export const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
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

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** Latin digits → Persian digits (Persian lines use Persian digits; HUD / sources stay Latin) */
export const faNum = (s: string | number) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
/** 1234567 → ۱٬۲۳۴٬۵۶۷ */
export const faMoney = (n: number) => faNum(Math.round(n).toLocaleString("en-US")).replace(/,/g, "٬");
