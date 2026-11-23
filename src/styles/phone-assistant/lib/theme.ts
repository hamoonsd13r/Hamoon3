// Phone Assistant · palette, fonts, easing and the voice envelope. A night stage: obsidian cards with a rim light,
// one accent (orange by default) for the voice orb, line icons, ticks and the toggles; the phone is the hero.
// Your brand: setPalette({ accent, accentHot, accentHi, accent300, accent500, onAccent }).
import React from "react";

export const C = {
  ink: "#050507", // the stage
  ink2: "#08080D",
  card: "#0C0C13",
  cardHi: "#10101A",
  badge: "#15151F",
  line: "#1C1C26",
  line2: "#2A2A3A",
  edge: "#3D3B4A",
  fg: "#F2F1F5",
  fgDim: "#C9C7D3",
  fgMute: "#9B99A8",
  fgCap: "#8A8798",
  accent: "#FF9A4A", // the voice orb, icons, ticks
  accentHot: "#FFF3E6", // the orb's core
  accentHi: "#FFD0A8",
  accent300: "#FFB27A", // small accent text
  accent500: "#F07A2A", // pressed
  ember: "#7E3A16",
  onAccent: "#170A02", // text on accent
  red: "#FF6B6B",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
export const accentA = (a: number) => {
  const n = parseInt(C.accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const FA = "PAFa"; // Vazirmatn — display
export const BODY = "PABody"; // Vazirmatn — labels, bubbles
export const MONO = "PAMono"; // IBM Plex Mono — times, numbers in UI
export const FPS = 30, W = 1080, H = 1920;

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

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 before a, up over inLen, hold, down to 0 ending at b */
export const win = (t: number, a: number, b: number, inLen = 0.3, outLen = 0.25) => Math.min(ramp(t, a, a + inLen), 1 - ramp(t, b - outLen, b));
/** a decaying hit that starts at a */
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

// ── the voice envelope that drives the orb and the call waveform ─────────────────────────────────────────────
// With a real voice: VOICE.env = the narration's loudness per frame (0..1, e.g. tools/audio-env.mjs).
// Without one (the demo): it is synthesised from the word times (a syllable-like flutter inside each word).
export const VOICE: { env: number[] | null; words: { s: number; e: number }[] } = { env: null, words: [] };
export const voiceAmp = (t: number) => {
  if (VOICE.env) {
    const f = t * FPS, i = Math.floor(f), A = VOICE.env;
    const a = A[Math.max(0, Math.min(A.length - 1, i))] ?? 0, b = A[Math.max(0, Math.min(A.length - 1, i + 1))] ?? 0;
    return a + (b - a) * (f - i);
  }
  const w = VOICE.words.find((x) => t >= x.s - 0.03 && t <= x.e + 0.05);
  if (!w) return 0;
  const u = (t - w.s) / Math.max(0.12, w.e - w.s);
  return clamp(0.35 + 0.45 * Math.abs(Math.sin(u * Math.PI * Math.max(1, Math.round((w.e - w.s) / 0.18)))) + 0.15 * Math.sin(t * 31));
};

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
