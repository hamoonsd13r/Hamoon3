// Premiere Showcase · kinetic type: a line slices, slams, whips, drops or rises in with motion blur, and can be
// filled with films (the film plays inside the letters). Plus the camera shake used on the hits.
import React from "react";
import { ease, hash, ramp } from "./theme";
import { measure } from "./fonts";
import { FilmView, type Film } from "./film";

export type KRun = { s: string; f?: string; c?: string; k?: number }; // k: size factor for this run
export type KMode = "slice" | "slam" | "whip" | "drop" | "rise";
export type KFill = { film: Film; t0: number; t1: number };
export type KLine = {
  id: string;
  runs: KRun[];
  cy: number;
  size: number;
  family: string;
  color: string;
  mode: KMode;
  t0: number;
  dur?: number;
  dir?: 1 | -1;
  fill?: KFill[]; // films inside the letters, one after another
  out?: number; // leaves at this time…
  outMode?: "cut" | "fade" | "sliceOut";
  lh?: number; // line box height factor (default 1.5)
  glow?: string;
};

export const runsWidth = (runs: KRun[], family: string, size: number) =>
  runs.reduce((a, r) => a + measure(r.s, r.f ?? family, size * (r.k ?? 1)), 0);
/** the largest size (≤ max) at which the runs fit `width` px */
export const fitK = (runs: KRun[], family: string, max: number, width: number) => Math.min(max, (width * 100) / runsWidth(runs, family, 100));

/** a few frames of camera shake after each hit */
export const shakeAt = (t: number, hits: { t: number; a: number }[]) => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = t - h.t;
    if (d < 0 || d > 0.16) continue;
    const k = h.a * (1 - d / 0.16);
    const f = Math.floor(t * 30);
    x += (hash(f * 3.7 + h.t) - 0.5) * 2 * k;
    y += (hash(f * 5.1 + h.t * 2) - 0.5) * 2 * k;
  }
  return { x, y };
};

const expo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const backOut = (u: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
};

const Spans: React.FC<{ l: KLine; color?: string }> = ({ l, color }) => (
  <>
    {l.runs.map((r, i) => (
      <span key={i} style={{ fontFamily: r.f ?? l.family, fontSize: l.size * (r.k ?? 1), color: color ?? r.c ?? l.color, whiteSpace: "pre" }}>
        {r.s}
      </span>
    ))}
  </>
);

// the line's content: solid type, or the films playing inside the letters. The film is clipped by an SVG
// clipPath made of the same text (a true cut-out, transparent outside the letters — blend-mode tricks leave a dark
// box inside transformed groups), over a faint base of the same text so dark film areas keep the letter shapes.
// Filled lines are single words (one font), so the SVG text and the clip line up exactly.
const Content: React.FC<{ l: KLine; t: number; lh: number }> = ({ l, t, lh }) => {
  const row: React.CSSProperties = {
    position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center",
    direction: "rtl", whiteSpace: "nowrap", lineHeight: `${lh}px`,
  };
  if (!l.fill) {
    return (
      <div style={{ ...row, textShadow: l.glow ?? "0 6px 30px rgba(0,0,0,0.55)" }}>
        <Spans l={l} />
      </div>
    );
  }
  const cur = l.fill.find((f) => t >= f.t0 && t < f.t1) ?? l.fill[l.fill.length - 1];
  const cid = `kc-${l.id}`;
  const text = (fill?: string) => (
    <text x={540} y={lh / 2} textAnchor="middle" dominantBaseline="central" direction="rtl" fontFamily={l.family} fontSize={l.size} fill={fill}>
      {l.runs.map((r) => r.s).join("")}
    </text>
  );
  return (
    <>
      <svg width={1080} height={lh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <clipPath id={cid} clipPathUnits="userSpaceOnUse">
            {text()}
          </clipPath>
        </defs>
        {text("rgba(255,240,220,0.22)")}
      </svg>
      <div style={{ position: "absolute", inset: 0, clipPath: `url(#${cid})` }}>
        <div style={{ position: "absolute", inset: 0, filter: "contrast(0.82) brightness(1.32) saturate(1.35)", transform: `translateX(${((0.5 - ramp(t, cur.t0, cur.t1)) * 9).toFixed(2)}%) scale(1.12)` }}>
          <FilmView key={cur.film.id + cur.t0} film={cur.film} t0={cur.t0} />
        </div>
      </div>
    </>
  );
};

/** one kinetic line, absolutely placed across the frame width, centred on cy */
export const KText: React.FC<{ l: KLine; t: number; origin?: { x: number; y: number } }> = ({ l, t }) => {
  if (t < l.t0) return null;
  if (l.out !== undefined && (l.outMode ?? "cut") === "cut" && t >= l.out) return null;
  const lh = l.size * (l.lh ?? 1.5);
  const dur = l.dur ?? (l.mode === "drop" ? 0.36 : l.mode === "rise" ? 0.4 : 0.24);
  const u = ramp(t, l.t0, l.t0 + dur);
  const e = expo(u);
  const dir = l.dir ?? 1;
  // exits
  let oa = 1;
  let ox = 0;
  if (l.out !== undefined && t >= l.out) {
    const v = ramp(t, l.out, l.out + 0.2);
    if (v >= 1) return null;
    if (l.outMode === "fade") oa = 1 - v;
    if (l.outMode === "sliceOut") ox = ease.in(v) * 900;
  }
  let tx = 0;
  let ty = 0;
  let sc = 1;
  let op = oa;
  let bx = 0;
  let by = 0;
  switch (l.mode) {
    case "slam":
      sc = 1 + 0.9 * (1 - e);
      op *= Math.min(1, u * 6);
      bx = by = 16 * (1 - e);
      break;
    case "whip":
      tx = dir * 1200 * (1 - e);
      bx = 60 * (1 - e);
      break;
    case "drop": {
      const b = backOut(u);
      ty = -460 * (1 - b);
      by = 34 * (1 - e);
      op *= Math.min(1, u * 5);
      break;
    }
    case "rise":
      ty = 90 * (1 - e);
      op *= e;
      by = 10 * (1 - e);
      break;
    case "slice":
      bx = 44 * (1 - e);
      break;
  }
  const box: React.CSSProperties = { position: "absolute", left: 0, top: l.cy - lh / 2, width: 1080, height: lh };
  const fid = `kb-${l.id}`;
  const blur = bx > 0.4 || by > 0.4;
  const filt = blur ? `url(#${fid})` : undefined;
  const svg = blur ? (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation={`${bx.toFixed(1)} ${by.toFixed(1)}`} />
      </filter>
    </svg>
  ) : null;
  if (l.mode === "slice") {
    // the line in two halves that slide in from opposite sides and lock together (and part on the way out)
    const d = 760 * (1 - e) + ox;
    const half = (top: boolean) => (
      <div style={{ ...box, clipPath: top ? "inset(0 0 50% 0)" : "inset(50% 0 0 0)", transform: `translateX(${(top ? dir : -dir) * d}px)`, opacity: op, filter: filt }}>
        <Content l={l} t={t} lh={lh} />
      </div>
    );
    return (
      <>
        {svg}
        {half(true)}
        {half(false)}
      </>
    );
  }
  return (
    <>
      {svg}
      <div style={{ ...box, transform: `translate(${tx + ox}px, ${ty}px) scale(${sc})`, opacity: op, filter: filt }}>
        <Content l={l} t={t} lh={lh} />
      </div>
    </>
  );
};
