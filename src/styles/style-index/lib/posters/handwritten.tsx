// 20 · Handwritten — a real hand with a red marker writes the word on a notebook page, its shadow moving with it, then
// swooshes an underline and lifts away; around it, ink notes and doodles boil at 12 fps.
import React, { useMemo } from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, hash, mix, ramp, stepT, tween } from "../theme";
import { Frame, Grain, Paper, ar, img, type PosterProps } from "../kit";

const RED = "#D7261E", INK = "#1B1714", RULE = "rgba(70,110,170,0.22)";

/** smooth path through points (Catmull-Rom → cubic) */
const smooth = (p: [number, number][]) => {
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  }
  return d;
};
const plen = (p: [number, number][]) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const Draw: React.FC<{ d: string; len: number; u: number; c?: string; w?: number }> = ({ d, len, u, c = INK, w = 5 }) => (
  <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - u)} />
);

// the hand (HAN-01, trimmed, with its own soft shadow): 700 wide; the marker's tip in image px
const HW = 700, HH = HW * ar("HAN-01"), HK = HW / 1112, TIPX = 100 * HK, TIPY = 953 * HK;
// the two lines of the word, and their timing
const FS = 150, ROT = (-5 * Math.PI) / 180;
const LINES = [
  { text: "Hand-", x: 84, y: 520, a: 0.0, b: 0.28 },
  { text: "written", x: 112, y: 672, a: 0.34, b: 0.66 },
];
const UNDER: [number, number][] = [[130, 872], [280, 886], [450, 862], [610, 842]];
const UA = 0.68, UB = 0.84;

export const Handwritten: React.FC<PosterProps> = ({ t }) => {
  const boil = Math.floor(stepT(t, 12) * 12) % 3;
  const j = (k: number) => (hash(boil * 11 + k) - 0.5) * 3;
  // the word's widths, measured in the marker font (fonts are loaded before the first frame)
  const widths = useMemo(() => {
    if (typeof document === "undefined") return LINES.map(() => 400);
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = `${FS}px ${F.marker}`;
    return LINES.map((l) => c.measureText(l.text).width);
  }, []);
  // a point in a rotated line's own space → the page
  const onLine = (i: number, lx: number, ly: number): [number, number] => {
    const l = LINES[i], w = widths[i], cx = l.x + w / 2, cy = l.y + FS / 2, dx = lx - w / 2, dy = ly - FS / 2;
    return [cx + dx * Math.cos(ROT) - dy * Math.sin(ROT), cy + dx * Math.sin(ROT) + dy * Math.cos(ROT)];
  };
  // where the marker's tip is: writing each line (with small up-down loops), hopping between them, the underline, away
  const tip = (): [number, number, number] => {
    const wig = (k: number) => Math.sin(t * 25 + k) * 22 + Math.sin(t * 11) * 8;
    if (t < LINES[0].b) {
      const u = ramp(t, LINES[0].a, LINES[0].b);
      return [...onLine(0, u * widths[0], FS * 0.6 + wig(0)), 0];
    }
    if (t < LINES[1].a) {
      const u = ease.inOut(ramp(t, LINES[0].b, LINES[1].a));
      const A = onLine(0, widths[0], FS * 0.6), B = onLine(1, 0, FS * 0.6);
      return [mix(A[0], B[0], u), mix(A[1], B[1], u) - Math.sin(u * Math.PI) * 30, Math.sin(u * Math.PI)];
    }
    if (t < LINES[1].b) {
      const u = ramp(t, LINES[1].a, LINES[1].b);
      return [...onLine(1, u * widths[1], FS * 0.6 + wig(2)), 0];
    }
    if (t < UA) {
      const u = ease.inOut(ramp(t, LINES[1].b, UA));
      const A = onLine(1, widths[1], FS * 0.6), B = UNDER[0];
      return [mix(A[0], B[0], u), mix(A[1], B[1], u) - Math.sin(u * Math.PI) * 40, Math.sin(u * Math.PI)];
    }
    if (t < UB) {
      const u = ramp(t, UA, UB), k = Math.min(UNDER.length - 2, Math.floor(u * (UNDER.length - 1))), f = u * (UNDER.length - 1) - k;
      return [mix(UNDER[k][0], UNDER[k + 1][0], f), mix(UNDER[k][1], UNDER[k + 1][1], f), 0];
    }
    const u = ease.in(ramp(t, UB, 1.4));
    const E = UNDER[UNDER.length - 1];
    return [E[0] + u * 420, E[1] + u * 520, Math.min(1, u * 3)];
  };
  const [tx, ty, lift] = tip();
  const handRot = mix(-4, 4, (tx - 80) / 560);
  const under = tween(t, UA, UB, (u) => u);
  const doodle = tween(t, 0, 0.3, ease.out);
  const loop: [number, number][] = Array.from({ length: 22 }, (_, i) => {
    const a = -0.6 + (i / 21) * Math.PI * 2.15;
    return [560 + Math.cos(a) * (96 + j(i)), 206 + Math.sin(a) * (50 + j(i + 3))];
  });
  const arrow: [number, number][] = [[196, 258 + j(5)], [186, 340], [198, 420 + j(6)], [232, 492]];
  return (
    <Frame bg="#F5EFE3">
      <Paper color="#F5EFE3" amt={0.35} id="hand" />
      {/* notebook rules and the margin */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: 24 }, (_, i) => <line key={i} x1={0} x2={PW} y1={120 + i * 50} y2={120 + i * 50} stroke={RULE} strokeWidth={1.5} />)}
        <line x1={64} x2={64} y1={0} y2={PH} stroke="rgba(215,38,30,0.35)" strokeWidth={2} />
        {/* ink notes, boiling */}
        <Draw d={smooth(loop)} len={plen(loop) * 1.05} u={doodle} />
        <Draw d={smooth(arrow)} len={plen(arrow) * 1.05} u={doodle} w={4} />
        <Draw d="M212,480 L236,496 L240,466" len={64} u={doodle} w={4} />
        <Draw d={`M590,${1004 + j(1)} l12,-26 l12,26 l-30,-16 l36,0 Z`} len={160} u={tween(t, 0.1, 0.4)} w={3.5} />
        <Draw d={`M118,${1032 + j(2)} c-20,-30 20,-44 30,-16 c10,-28 50,-14 30,16 l-30,30 Z`} len={200} u={tween(t, 0.15, 0.45)} w={3.5} />
        {/* the red underline, swooshed by the marker */}
        <Draw d={smooth(UNDER)} len={plen(UNDER) * 1.08} u={under} c={RED} w={10} />
      </svg>
      <div style={{ position: "absolute", left: 500, top: 172, fontFamily: F.reenie, fontSize: 64, color: INK, opacity: doodle, transform: `rotate(-6deg) translate(${j(7)}px, ${j(8)}px)` }}>23.10</div>
      <div style={{ position: "absolute", left: 84, top: 140, fontFamily: F.reenie, fontSize: 54, color: INK, opacity: doodle, transform: `rotate(-4deg) translate(${j(9)}px, 0)` }}>note to self:</div>
      {/* the word, written by the hand */}
      {LINES.map((l, i) => (
        <div key={i} style={{ position: "absolute", left: l.x, top: l.y, height: FS, fontFamily: F.marker, fontSize: FS, lineHeight: 1, color: RED, whiteSpace: "pre", transform: "rotate(-5deg)", clipPath: `inset(-40% ${100 - 100 * ramp(t, l.a, l.b)}% -40% 0)` }}>
          {l.text}
        </div>
      ))}
      <div style={{ position: "absolute", left: 300, top: 1100, fontFamily: F.reenie, fontSize: 56, color: INK, clipPath: `inset(-40% ${100 - 100 * tween(t, 0.9, 1.3)}% -40% 0)`, transform: "rotate(-3deg)" }}>— with love, a pen</div>
      {/* the hand: its marker tip on the writing point */}
      {t < 1.45 ? (
        <div style={{ position: "absolute", left: tx - TIPX, top: ty - TIPY, width: HW, height: HH, transformOrigin: `${TIPX}px ${TIPY}px`, transform: `rotate(${handRot}deg) scale(${1 + lift * 0.04})` }}>
          <Img src={img("HAN-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
        </div>
      ) : null}
      <Grain t={t} amt={0.08} blend="multiply" />
    </Frame>
  );
};
