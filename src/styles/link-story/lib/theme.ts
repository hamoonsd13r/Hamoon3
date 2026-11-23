// Link Story · a 20 s Instagram story for a launch («registration is open»), built around the link sticker. Two films:
//   A «یه جمله، یه ویدئو» (prompt → editor → render)   B «تونل ریلز» (3D tunnel of reels)
// Vertical 1080×1920, 20 s, cut to a 124 BPM track (beat 1 at 0.00) with this shape (change the constants for yours):
//   0–7.3 groove · 7.3–9.4 bass breakdown · 9.4–13.36 full · 13.36 stop · 13.8–15.45 snare roll · 15.50 DROP ·
//   17.43 final hit · ring-out to 20.
// Everything is a pure function of t (seconds).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 20;
export const FRAMES = DUR * FPS;

export const BEAT = 60 / 124.02;
export const beat = (i: number) => i * BEAT;
export const STOP = 13.36;
export const ROLL = 13.8;
export const DROP = 15.5;
export const FINAL = 17.43;

/** Instagram link sticker sits on this slot for the whole story (kept clear of any other content). */
export const BOX = { cx: 540, cy: 1500, w: 780, h: 176 };
/** content never goes below this line (the slot and the IG reply bar live under it) */
export const SAFE_BOTTOM = 1365;

export const C = {
  bg: "#06080c",
  ink: "#f5f7fb",
  dim: "#bec6d2",
  faint: "#7f8796",
  orange: "#ff7a3d",
  hot: "#ffb36b",
  deep: "#c2410c",
  red: "#e0393f",
  glass: "rgba(255,255,255,0.055)",
  line: "rgba(255,255,255,0.12)",
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  out: (k: number) => 1 - (1 - k) ** 3,
  in: (k: number) => k ** 3,
  io: (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  expo: (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  back: (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2),
  sine: (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * k),
};
/** decaying pulse after `at` */
export const hit = (t: number, at: number, tau = 0.12) => (t < at ? 0 : Math.exp(-(t - at) / tau));
/** pulse on every beat in [a, b) */
export const kick = (t: number, a = 0, b = STOP, tau = 0.11) => {
  if (t < a || t >= b + 0.4) return 0;
  const k = Math.floor((t + 0.004) / BEAT);
  const at = k * BEAT;
  return at < a || at >= b ? 0 : hit(t, at, tau);
};
/** deterministic noise 0..1 */
export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** in/out window: 0 before a, ramps to 1 over fin, holds, ramps to 0 over fout ending at b */
export const win = (t: number, a: number, b: number, fin = 0.18, fout = 0.18) => Math.min(ramp(t, a, a + fin), 1 - ramp(t, b - fout, b));

export const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);


// ---------- fonts ----------
export const F = { head: "LSHead", text: "LSText", heavy: "LSHeavy", en: "LSEn", enB: "LSEnB" };
const FONTS: [string, string][] = [
  [F.head, "fonts/Lalezar-Regular.ttf"],
  [F.text, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.heavy, "fonts/Vazirmatn-Black.ttf"],
  [F.en, "fonts/ChakraPetch-Medium.ttf"],
  [F.enB, "fonts/ChakraPetch-Bold.ttf"],
];
let fontsP: Promise<unknown> | null = null;
export const useStoryFonts = () => {
  const [ready, setReady] = useState(false);
  const [h] = useState(() => delayRender("link-story fonts"));
  useEffect(() => {
    fontsP ??= Promise.all(FONTS.map(([fam, file]) => new FontFace(fam, `url(${staticFile(file)})`).load().then((f) => { document.fonts.add(f); })));
    fontsP.then(() => { setReady(true); continueRender(h); }).catch((e) => { console.error(e); setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

// ---------- shared script (both films) ----------
/** the sentence typed into the prompt */
export const PROMPT = "برای این آهنگ یه موزیک‌ویدئو بساز";
export const TYPE_A = 4.05;
export const TYPE_B = 5.12;
export const SEND = beat(11); // 5.32
/** style words on the four breakdown beats */
export const STYLES = [
  { at: beat(16), fa: "انیمیشن", scene: 4 },
  { at: beat(17), fa: "فیلم سینمایی", scene: 5 },
  { at: beat(18), fa: "موزیک‌ویدئو", scene: 1 },
  { at: beat(19), fa: "ویدئوی یوتیوب", scene: 2 },
];
/** feature cards, one per two beats in the full section */
export const FEATS = [
  { at: beat(20), big: "+۲۰", small: "جلسه‌ی کامل", icon: "play" },
  { at: beat(22), big: "+۱۰", small: "سبک ویدئو", icon: "grid" },
  { at: beat(24), big: "+۵۰", small: "قالب آماده", icon: "spark" },
  { at: beat(26), big: "بدون دوربین", small: "از صفرِ صفر", icon: "cam" },
] as const;
