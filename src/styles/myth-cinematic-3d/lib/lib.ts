// Myth Cinematic 3D · «Shahmaran» — the Persian legend of Jamasp and the serpent queen (40 s cinematic, English narration).
// Horizontal 1920×1080 at 24 fps, 2.39:1 letterbox, subtitles in the lower bar (English + Persian).
// Narration: Jasper Vayne (N) + Kristen (S), ElevenLabs v3; every cue below comes from vo.json word times.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

export const FPS = 24;
export const W = 1920;
export const H = 1080;
export const DUR = 40;
export const FRAMES = DUR * FPS;
/** letterbox bar height for 2.39:1 */
export const BAR = Math.round((H - W / 2.39) / 2);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  out: (k: number) => 1 - (1 - k) ** 3,
  in: (k: number) => k ** 3,
  io: (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  sine: (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * k),
  expo: (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
};
export const hit = (t: number, at: number, tau = 0.12) => (t < at ? 0 : Math.exp(-(t - at) / tau));
export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** smooth 1D value noise */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i + seed * 101.3), rnd(i + 1 + seed * 101.3), u);
};
/** candle flicker 0.75..1.15 */
export const flicker = (t: number, seed: number) => 0.8 + 0.25 * noise1(t * 9 + seed * 7, seed) + 0.1 * noise1(t * 23 + seed, seed + 3);

/** a file of this style in public/styles/myth-cinematic-3d/ */
export const asset = (p: string) => staticFile(`styles/myth-cinematic-3d/${p}`);

// ---------- word cues (vo.json, tempo 1.08) ----------
export const CUE = {
  persia: 1.11, boy: 2.57, die: 3.79, well: 5.46,
  friends: 7.02, honey: 7.88, cut: 9.44, rope: 9.81,
  but: 10.67, door: 11.59, behind: 13.03, kingdom: 15.24, serpents: 15.89,
  queen: 17.75, shahmaran: 19.28,
  teach: 21.62, secret: 22.74, healing: 23.46, jamasp: 24.06, never: 25.76, name: 26.68,
  years: 27.67, king: 28.87, dying: 29.49, cure: 31.23, her: 32.65,
  so: 33.45, led: 35.08, down: 35.48,
  knew: 36.47, would: 37.01,
  title: 37.85,
};

// ---------- subtitles ----------
/** phrase cards: each appears ON its first word (never before it is spoken) and holds until the next card */
const CARDS: [number, string, string, boolean?][] = [
  [0.9, "In ancient Persia…", "در ایران باستان…"],
  [2.5, "a boy was left to die,", "پسری را رها کردند تا بمیرد،"],
  [4.32, "at the bottom of a well.", "ته یک چاه."],
  [6.97, "His friends took the honey…", "دوستانش عسل را برداشتند…"],
  [9.25, "and cut the rope.", "و طناب را بریدند."],
  [10.62, "But the well had a door.", "اما آن چاه دری داشت."],
  [12.98, "And behind it…", "و پشتش…"],
  [15.03, "a kingdom of serpents.", "سرزمینی از مارها."],
  [17.18, "And their queen…", "و ملکه‌شان…"],
  [19.22, "Shahmaran.", "شاهماران."],
  [21.34, "“I will teach you every secret of healing, Jamasp.”", "«همه‌ی رازهای درمان را یادت می‌دهم، جاماسب.»", true],
  [25.58, "“Just never speak my name.”", "«فقط هرگز نامم را بر زبان نیاور.»", true],
  [27.6, "Years later, a king lay dying…", "سال‌ها بعد، پادشاهی رو به مرگ بود…"],
  [30.48, "and the only cure, was her.", "و تنها درمانش، او بود."],
  [33.39, "So Jamasp… led them down.", "پس جاماسب… آن‌ها را به پایین برد."],
  [36.34, "“I knew you would.”", "«می‌دانستم این کار را می‌کنی.»", true],
];
/** end of each spoken line (the card leaves 0.45 s after it unless the next card comes first) */
const LINE_END = [6.72, 10.17, 16.98, 20.88, 27.17, 33.14, 35.99, 37.67];
export const SUBS: { a: number; b: number; en: string; fa: string; queen?: boolean }[] = CARDS.map(([a, en, fa, queen], i) => {
  const next = CARDS[i + 1]?.[0] ?? 99;
  const end = (LINE_END.find((e) => e > a) ?? 40) + 0.45;
  return { a, b: Math.min(next, end), en, fa, queen };
});

// ---------- fonts ----------
export const F = { title: "Cinzel29", en: "Cormorant29", enI: "Cormorant29I", fa: "Vazir29" };
const FONTS: [string, string][] = [
  [F.title, "fonts/Cinzel-Regular.ttf"],
  [F.en, "fonts/CormorantInfant-Regular.ttf"],
  [F.enI, "fonts/CormorantInfant-Italic.ttf"],
  [F.fa, "fonts/Vazirmatn-SemiBold.ttf"],
];
let fontsP: Promise<unknown> | null = null;
export const useMythFonts = () => {
  const [ready, setReady] = useState(false);
  const [h] = useState(() => delayRender("myth-cinematic-3d fonts"));
  useEffect(() => {
    fontsP ??= Promise.all(FONTS.map(([fam, file]) => new FontFace(fam, `url(${staticFile(file)})`).load().then((f) => { document.fonts.add(f); })));
    fontsP.then(() => { setReady(true); continueRender(h); }).catch((e) => { console.error(e); setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};
