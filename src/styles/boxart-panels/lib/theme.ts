// Box-Art Panels · constants, palette, fonts and helpers. Vertical 1080×1920, 30 fps; every frame is a pure function of
// film time t (seconds). The look: the frame is a living cover — photo or footage panels between slanted ink gutters —
// and the numbers ride on it as a game HUD. Change the palette here (ink, cream, gold, the HORIZON band).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { clamp, ease, mix } from "./time";
export { clamp, ease, hash, mix, noise1, ramp, TimeCtx, useT } from "./time";

export const FPS = 30, W = 1080, H = 1920;

/** the beat grid: one bar in seconds (2.0 = 120 BPM). Set it from your song (tools/beat-map.mjs → bpm). */
export let BAR = 2.0;
export const setBar = (s: number) => {
  BAR = s;
};
export const beatPulse = (t: number, decay = 9) => {
  const b = BAR / 4;
  const u = ((t % b) + b) % b;
  return Math.exp(-u * decay);
};
export const barPulse = (t: number, decay = 5) => {
  const u = ((t % BAR) + BAR) % BAR;
  return Math.exp(-u * decay);
};

export const C = {
  ink: "#0A0F1E", // gutters, plates (the cover's deep navy)
  ink2: "#121A30",
  ink3: "#1C2747",
  line: "rgba(245,241,232,0.12)",
  line2: "rgba(245,241,232,0.22)",
  cream: "#F5F1E8",
  dim: "rgba(245,241,232,0.66)",
  faint: "rgba(245,241,232,0.4)",
  pink: "#FF5A4F", // signal red (the one hot accent)
  pink2: "#FF8A7A",
  orange: "#FF9A3C",
  gold: "#FFB547",
  goldHi: "#FFE0A3",
  violet: "#4B6BFF",
  red: "#FF3B3B",
  ok: "#3DDC84",
};
/** the title band: night sky → blue hour → the horizon's amber (top to bottom) */
export const HORIZON = "linear-gradient(180deg, #0B1230 0%, #23407A 42%, #C8763A 80%, #FFB547 100%)";
export const HORIZON_H = "linear-gradient(90deg, #23407A 0%, #C8763A 55%, #FFB547 100%)";

export const F = {
  ui: "BAInter", // Inter — Latin UI words, chips
  head: "BALalezar", // Lalezar — kinetic Persian words, captions
  fa: "BAVazirBlack", // Vazirmatn Black — Persian labels
  faB: "BAVazirBold",
  vz: "BAVazir", // Vazirmatn — Persian text inside panels
  anton: "BAAnton", // big Latin numbers
};
const FONTS: [string, string, string?][] = [
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.head, "fonts/Lalezar-Regular.ttf"],
  [F.fa, "fonts/Vazirmatn-Black.ttf"],
  [F.faB, "fonts/Vazirmatn-Bold.ttf"],
  [F.vz, "fonts/Vazirmatn-Regular.ttf"],
  [F.anton, "fonts/Anton-Regular.ttf"],
];
let fontsP: Promise<unknown> | null = null;
export const useBoxFonts = () => {
  const [h] = useState(() => delayRender("boxart-panels fonts"));
  useEffect(() => {
    fontsP ??= Promise.all(FONTS.map(([fam, file, weight]) => new FontFace(fam, `url(${staticFile(file)})`, weight ? { weight } : {}).load().then((f) => document.fonts.add(f))));
    fontsP.then(() => continueRender(h)).catch((e) => {
      console.error(e);
      continueRender(h);
    });
  }, [h]);
};

// ── easing helpers ──────────────────────────────────────────────────────────
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
/** a damped jolt that starts at `at0` (punches, kicks) */
export const jolt = (t: number, at0: number, amp: number, freq = 30, damp = 9) => (t < at0 ? 0 : amp * Math.exp(-(t - at0) * damp) * Math.sin((t - at0) * freq));
/** a one-sided punch: 0 → 1 in 60 ms, then decays */
export const punch = (t: number, at0: number, decay = 6) => (t < at0 ? 0 : clamp((t - at0) / 0.06) * Math.exp(-Math.max(0, t - at0 - 0.06) * decay));
/** settle 0→1 with a small overshoot; exactly 0 until `a` (gates stay closed) */
export const pop = (t: number, a: number, d = 0.4) => (t <= a ? 0 : ease.outBack(clamp((t - a) / d)));
export const inn = (t: number, a: number, d = 0.4) => ease.out(clamp((t - a) / d));
export const out = (t: number, a: number, d = 0.3) => 1 - ease.inOut(clamp((t - a) / d));
/** 1 inside [a, b), with eased ramps of `fi` / `fo` seconds inside the window */
export const win = (t: number, a: number, b: number, fi = 0.2, fo = 0.2) =>
  t < a || t >= b ? 0 : Math.min(fi > 0 ? ease.out(clamp((t - a) / fi)) : 1, fo > 0 ? 1 - ease.in(clamp((t - (b - fo)) / fo)) : 1);

/** "16.4K"-style text for a value */
export const fmtK = (v: number, dec = 1) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(dec).replace(/\.0+$/, "")}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : dec).replace(/\.0+$/, "")}K`;
  return `${Math.round(v)}`;
};
export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
const FA_D = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (s: string | number) => String(s).replace(/\d/g, (d) => FA_D[+d]);

/** shadows: soft (reads over anything) and the poster one (a crisp ink step under the soft one) */
export const SD = "0 2px 6px rgba(4,8,20,0.6), 0 8px 30px rgba(4,8,20,0.55)";
export const SDP = "0 5px 0 rgba(8,12,26,0.92), 0 10px 26px rgba(4,8,20,0.6), 0 0 60px rgba(4,8,20,0.45)";
