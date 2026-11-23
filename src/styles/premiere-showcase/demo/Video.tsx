// Premiere Showcase · demo film. Copy this file + script.ts to src/vNN/, change the imports to
// ../styles/premiere-showcase/lib/…, then give FILMS your clips (`src`, `from`, real w/h/dur) and set theme.GRID to
// your song's beat. Every element is a pure function of t (s).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FilmView } from "../lib/film";
import { usePremiereFonts } from "../lib/fonts";
import { KText, fitK, shakeAt, type KLine } from "../lib/kinetic";
import { Captions, Counter, Montage } from "../lib/montage";
import { Wall } from "../lib/wall";
import { C, F, FPS, TimeCtx, beat, clamp, ease, hash, ramp } from "../lib/theme";
import { BARRAGE, DIVE, DUR, FILL19, FILMS, HITS, JUST, OP_END, ROWS, RUSH, SHOTS, T_END, WALL_T, WALL_TIMES, WATCH, WINDOWS } from "./script";

export type DemoProps = { times?: number[] };

// ── opening 1 · a barrage of five cuts, then the giant «19» with the films inside it ────────────────────────────
const Barrage: React.FC<{ t: number }> = ({ t }) => {
  if (t >= beat(1)) return null;
  const i = Math.min(BARRAGE.length - 1, Math.floor(t / (beat(1) / BARRAGE.length)));
  const t0 = (i * beat(1)) / BARRAGE.length;
  return (
    <AbsoluteFill style={{ transform: `scale(${1.08 - 0.08 * ease.out(ramp(t, t0, t0 + 0.2))})`, filter: "brightness(0.9)" }}>
      <FilmView film={FILMS[BARRAGE[i]]} t0={t0} />
    </AbsoluteFill>
  );
};
const N19: KLine = { id: "n19", runs: [{ s: "19" }], cy: 720, size: 840, family: F.anton, color: C.cream, mode: "slam", t0: beat(1), dur: 0.22, fill: FILL19, lh: 1.12 };
const WORD: KLine = { id: "film", runs: [{ s: "فیلم" }], cy: 1255, size: 210, family: F.head, color: C.cream, mode: "slice", t0: beat(2), dir: 1 };
const STEM = { x: 330, y: 720 }; // the stem of the «1»: the camera dives into it
const Nineteen: React.FC<{ t: number }> = ({ t }) => {
  if (t < beat(1) || t >= WINDOWS[0].t0) return null;
  const dive = ease.in(ramp(t, DIVE, WINDOWS[0].t0));
  const s = 1 + 0.04 * ramp(t, beat(1), DIVE) + 18 * dive;
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${STEM.x}px ${STEM.y}px`, opacity: 1 - ramp(t, WINDOWS[0].t0 - 0.06, WINDOWS[0].t0) }}>
      <KText l={N19} t={t} />
      <KText l={{ ...WORD, out: DIVE, outMode: "fade" }} t={t} />
    </AbsoluteFill>
  );
};

// ── opening 2 · the genres as windows: the film dimmed full frame, the word lit with the same film inside ────────
const Windows: React.FC<{ t: number }> = ({ t }) => {
  const i = WINDOWS.findIndex((w, j) => t >= w.t0 && t < (WINDOWS[j + 1]?.t0 ?? RUSH[0]));
  if (i < 0) return null;
  const w = WINDOWS[i];
  const film = FILMS[w.film];
  const end = WINDOWS[i + 1]?.t0 ?? RUSH[0];
  const runs = [{ s: w.word }];
  const l: KLine = { id: `win${i}`, runs, cy: 960, size: fitK(runs, F.head, 330, 920), family: F.head, color: C.cream, mode: i % 2 ? "whip" : "slam", dir: i % 2 ? 1 : -1, t0: w.t0, fill: [{ film, t0: w.t0, t1: end + 0.1 }], lh: 1.3 };
  return (
    <>
      <AbsoluteFill style={{ filter: "brightness(0.22) blur(3px)", transform: `scale(${1.04 + 0.03 * ramp(t, w.t0, end)})` }}>
        <FilmView film={film} t0={w.t0} />
      </AbsoluteFill>
      <KText l={l} t={t} />
    </>
  );
};

// ── opening 3 · the rush: two waves of film cards fly past the lens under «فقط» / «ببینید» ───────────────────────
const CARD = { w: 300, h: 533 };
const CARDS = RUSH.flatMap((t0, wi) =>
  Array.from({ length: 12 }, (_, i) => {
    const a = hash(i * 3.7 + wi * 11) * Math.PI * 2, r = 380 + 520 * hash(i * 5.3 + wi);
    return { t0: t0 + i * 0.07, x: Math.cos(a) * r, y: Math.sin(a) * r * 1.4, film: Object.keys(FILMS)[(i * 5 + wi * 7) % 19] };
  }),
);
const Rush: React.FC<{ t: number }> = ({ t }) => {
  if (t < RUSH[0] || t >= OP_END) return null;
  return (
    <AbsoluteFill style={{ perspective: 1000, perspectiveOrigin: "540px 960px" }}>
      {CARDS.map((c, i) => {
        const u = (t - c.t0) / 1.15;
        if (u < 0 || u > 1) return null;
        const z = -3200 + 4100 * ease.in(u);
        return (
          <div key={i} style={{ position: "absolute", left: 540 - CARD.w / 2 + c.x, top: 960 - CARD.h / 2 + c.y, width: CARD.w, height: CARD.h, borderRadius: 14, overflow: "hidden", transform: `translateZ(${z}px)`, opacity: clamp(u * 6) * (1 - ramp(u, 0.85, 1)), boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
            <FilmView film={FILMS[c.film]} t0={c.t0} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const JUST_L: KLine = { id: "just", runs: [{ s: "فقط" }], cy: 830, size: 300, family: F.head, color: C.cream, mode: "slam", t0: JUST, glow: "0 10px 50px rgba(0,0,0,0.85)", out: OP_END - 0.05, outMode: "fade" };
const WATCH_L: KLine = { id: "watch", runs: [{ s: "ببینید" }], cy: 1120, size: 300, family: F.head, color: C.accentHi, mode: "slam", t0: WATCH, glow: "0 10px 50px rgba(0,0,0,0.85)", out: OP_END - 0.05, outMode: "fade" };

// ── the wall's words and the end card ─────────────────────────────────────────────────────────────────────────
const msgLines = (): KLine[] => {
  const r1 = [{ s: "همه‌شون رو" }], r2 = [{ s: "خودشون ساختن" }], r3 = [{ s: "بدون " }, { s: "هیچ", c: C.accentHi }], r4 = [{ s: "تجربه‌ی قبلی" }];
  return [
    { id: "m1a", runs: r1, cy: 850, size: fitK(r1, F.head, 200, 900), family: F.head, color: C.cream, mode: "slice", t0: WALL_TIMES.msg + 0.04, dir: 1, out: beat(56) - 0.22, outMode: "sliceOut" },
    { id: "m1b", runs: r2, cy: 1085, size: fitK(r2, F.head, 200, 900), family: F.head, color: C.cream, mode: "slam", t0: beat(54), out: beat(56) - 0.22, outMode: "fade" },
    { id: "m2a", runs: r3, cy: 850, size: fitK(r3, F.head, 230, 900), family: F.head, color: C.cream, mode: "slam", t0: beat(56) + 0.02 },
    { id: "m2b", runs: r4, cy: 1080, size: fitK(r4, F.head, 170, 920), family: F.head, color: C.cream, mode: "slice", t0: beat(58), dir: -1 },
  ];
};
const FILLS_END = ["13", "09", "11", "05", "17", "02", "19", "04"].map((id, i) => ({ film: FILMS[id], t0: T_END + i * 0.5, t1: T_END + (i + 1) * 0.5 }));
const Finale: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_END) return null;
  const r1 = [{ s: "بهتون" }], r2 = [{ s: "افتخار می‌کنیم" }];
  const l1: KLine = { id: "proud1", runs: r1, cy: 800, size: fitK(r1, F.head, 380, 900), family: F.head, color: C.cream, mode: "slam", t0: T_END + 0.02, fill: FILLS_END, lh: 1.3 };
  const l2: KLine = { id: "proud2", runs: r2, cy: 1070, size: fitK(r2, F.head, 175, 900), family: F.head, color: C.accentHi, mode: "slice", t0: beat(62), dir: -1 };
  const sub = ease.out(ramp(t, T_END + 1.3, T_END + 1.8));
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.025 * ease.inOut(ramp(t, T_END, DUR))})`, transformOrigin: "540px 960px" }}>
      <KText l={l1} t={t} />
      <KText l={l2} t={t} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1195, textAlign: "center", direction: "rtl", fontFamily: F.faSemi, fontSize: 54, color: "rgba(241,233,219,0.85)", opacity: sub, transform: `translateY(${24 * (1 - sub)}px)` }}>
        فصل اول · <span style={{ fontFamily: F.num, color: C.accent }}>19</span> فیلم کوتاه
      </div>
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ t: number }> = ({ t }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <filter id="psgrain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(t * 24) % 100} />
    </filter>
    <rect width={1080} height={1920} filter="url(#psgrain)" />
  </svg>
);

export const PremiereShowcaseAt: React.FC<{ t: number }> = ({ t }) => {
  const sh = shakeAt(t, HITS);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        <Barrage t={t} />
        <Nineteen t={t} />
        <Windows t={t} />
        <Rush t={t} />
        {t >= RUSH[0] && t < OP_END ? (
          <>
            <KText l={JUST_L} t={t} />
            <KText l={WATCH_L} t={t} />
          </>
        ) : null}
        <Montage t={t} shots={SHOTS} films={FILMS} end={WALL_T} />
        <Captions t={t} shots={SHOTS} films={FILMS} end={WALL_T} />
        <Counter t={t} shots={SHOTS} end={WALL_T} />
        <Wall t={t} rows={ROWS} films={FILMS} shots={SHOTS} T={WALL_TIMES} lines={msgLines()} sumLabel="مجموع زمان این ۱۹ فیلم" />
        <Finale t={t} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(85% 65% at 50% 48%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55))", pointerEvents: "none" }} />
      <Grain t={t} />
    </AbsoluteFill>
  );
};

export const PremiereShowcaseDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = usePremiereFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <PremiereShowcaseAt t={t} />
    </TimeCtx.Provider>
  );
};
