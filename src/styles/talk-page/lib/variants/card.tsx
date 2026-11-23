// Talk Page · variant "Card": the first form of the look — a printed card (like a page torn from a paper) lies on the
// table in the lower third and is swapped for the next one: running header (source · section · page), a few lines of
// serif text whose key words get a marker, a pen underline, a pen circle or a strike on the spoken word, counters,
// stamps, ticks, a footnote. Smaller than the page; good when the talk is about one document, study or article.
import React from "react";
import { paperBg } from "../page";
import { C, F } from "../theme";
import { eInOut, eOut, eOut5, ramp, useT, wob } from "../time";

/** where the card lies (absolute frame px) */
export const CARD_AT = { x: 64, y: 1290, w: 920 };

/** a card from a to b: drops in with a tilt, settles, breathes, leaves down at b */
export const Card: React.FC<{ a: number; b: number; h: number; tilt?: number; seed?: number; head?: string; sec?: string; page?: number; foot?: React.ReactNode; children: React.ReactNode }> = ({
  a,
  b,
  h,
  tilt = -0.5,
  seed = 1,
  head = "",
  sec,
  page,
  foot,
  children,
}) => {
  const t = useT();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const pin = eOut5(ramp(t, a, a + 0.62));
  const out = eInOut(ramp(t, b - 0.34, b));
  const y = (1 - pin) * 120 + out * 70 + Math.sin(t * 0.9 + seed) * 2.2;
  const rot = tilt + (1 - pin) * 4.5 * (seed % 2 ? 1 : -1) - out * 1.2 + Math.sin(t * 0.55 + seed * 2) * 0.18;
  const rule = eOut(ramp(t, a + 0.2, a + 0.9));
  return (
    <div style={{ position: "absolute", left: CARD_AT.x, top: CARD_AT.y, width: CARD_AT.w, height: h, transform: `translateY(${y}px) rotate(${rot}deg) scale(${1 - out * 0.03 + (1 - pin) * 0.04})`, transformOrigin: "50% 100%", opacity: ramp(t, a, a + 0.22) * (1 - out) }}>
      <div style={{ position: "absolute", inset: "14px -6px -22px -6px", background: "rgba(0,0,0,0.55)", filter: "blur(22px)", borderRadius: 18, transform: `translateY(${10 + (1 - pin) * 30}px)` }} />
      <div style={{ position: "absolute", inset: 0, background: paperBg, borderRadius: 3, boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(60,48,30,0.10), 0 2px 6px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 18, display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 20, fontWeight: 500, letterSpacing: "0.12em", color: "#6F685C" }}>
          <span>{head}</span>
          <span>
            {sec}
            {page !== undefined ? `  ·  p.${page}` : ""}
          </span>
        </div>
        <div style={{ position: "absolute", left: 40, top: 48, height: 1.5, width: (CARD_AT.w - 80) * rule, background: C.rule }} />
        <div style={{ position: "absolute", left: 40, right: 40, top: 66, bottom: foot ? 44 : 22 }}>{children}</div>
        {foot ? <div style={{ position: "absolute", left: 40, right: 40, bottom: 12, fontFamily: F.serif, fontStyle: "italic", fontSize: 22, color: C.ink2, opacity: ramp(t, a + 0.5, a + 1.0), borderTop: `1px solid ${C.rule}`, paddingTop: 5 }}>{foot}</div> : null}
      </div>
    </div>
  );
};

/** card words: hl marker · ul underline · circ pen circle · strike — each at its spoken time */
export type Mark = { hl?: number; ul?: number; circ?: number; strike?: number; b?: boolean; i?: boolean; pen?: boolean };
export type Tok = string | ({ w: string } & Mark);
export const H = (w: string, at: number, m: Mark = {}): Tok => ({ w, hl: at, ...m });
export const U = (w: string, at: number, m: Mark = {}): Tok => ({ w, ul: at, ...m });
export const O = (w: string, at: number, m: Mark = {}): Tok => ({ w, circ: at, ...m });
export const X = (w: string, at: number, m: Mark = {}): Tok => ({ w, strike: at, ...m });

const CWord: React.FC<{ k: { w: string } & Mark; t: number; at: number; idx: number }> = ({ k, t, at, idx }) => {
  const p = eOut(ramp(t, at, at + 0.42));
  const hl = k.hl !== undefined ? eOut(ramp(t, k.hl, k.hl + 0.32)) : 0;
  const ul = k.ul !== undefined ? eOut(ramp(t, k.ul, k.ul + 0.38)) : 0;
  const ci = k.circ !== undefined ? eInOut(ramp(t, k.circ, k.circ + 0.5)) : 0;
  const st = k.strike !== undefined ? eOut(ramp(t, k.strike, k.strike + 0.3)) : 0;
  const hit = Math.max(k.hl !== undefined ? ramp(t, k.hl, k.hl + 0.12) * (1 - ramp(t, k.hl + 0.12, k.hl + 0.45)) : 0, k.circ !== undefined ? ramp(t, k.circ, k.circ + 0.12) * (1 - ramp(t, k.circ + 0.12, k.circ + 0.45)) : 0);
  const mask = `conic-gradient(from 20deg at 50% 50%, #000 ${ci * 372}deg, transparent ${ci * 372 + 0.5}deg)`;
  return (
    <span style={{ position: "relative", display: "inline-block", zIndex: 0, marginRight: "0.26em", opacity: p, transform: `translateY(${(1 - p) * 0.45}em) scale(${1 + hit * 0.06})`, filter: p < 1 ? `blur(${(1 - p) * 7}px)` : undefined, fontWeight: k.b ? 650 : undefined, fontStyle: k.i ? "italic" : undefined, color: k.pen ? C.accent : undefined }}>
      {k.hl !== undefined ? <span style={{ position: "absolute", left: "-0.12em", right: "-0.14em", top: "0.14em", bottom: "0.02em", background: C.mark, mixBlendMode: "multiply", borderRadius: "0.1em 0.18em 0.12em 0.2em", transform: `scaleX(${hl}) skewX(-4deg) rotate(${wob(idx, 1) * 1.2}deg)`, transformOrigin: "0 50%", zIndex: -1 }} /> : null}
      {k.w}
      {k.ul !== undefined && ul > 0 ? (
        <svg style={{ position: "absolute", left: "-4%", width: "108%", top: "88%", height: "0.32em", overflow: "visible", clipPath: `inset(-60% ${(1 - ul) * 100}% -60% -2%)` }} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d={`M0 ${5 + wob(idx, 2) * 3} C 30 ${2 + wob(idx, 3) * 3}, 65 ${8 + wob(idx, 4) * 2}, 100 ${4 + wob(idx, 5) * 3}`} fill="none" stroke={C.accent} strokeWidth={3.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      {k.strike !== undefined && st > 0 ? (
        <svg style={{ position: "absolute", left: "-3%", width: "106%", top: "48%", height: "0.2em", overflow: "visible", clipPath: `inset(-60% ${(1 - st) * 100}% -60% -2%)` }} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d={`M0 6 L100 ${3 + wob(idx, 6) * 3}`} fill="none" stroke={C.accent} strokeWidth={3.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      {k.circ !== undefined && ci > 0 ? (
        <svg style={{ position: "absolute", left: "-14%", width: "128%", top: "-18%", height: "136%", overflow: "visible", WebkitMaskImage: mask, maskImage: mask }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 58 4 C 88 2, 101 30, 99 52 C 97 80, 70 98, 45 97 C 16 96, 1 74, 2 50 C 3 22, 26 5, 52 3 C 63 2, 72 6, 78 10" fill="none" stroke={C.accent} strokeWidth={3.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
    </span>
  );
};

/** a block of card text; words ink in at at + i·stagger, marks fire on their own times */
export const Words: React.FC<{ toks: Tok[]; at: number; size: number; stagger?: number; weight?: number; italic?: boolean; color?: string; lh?: number; style?: React.CSSProperties }> = ({ toks, at, size, stagger = 0.045, weight = 500, italic, color = C.ink, lh = 1.18, style }) => {
  const t = useT();
  const ws: ({ w: string } & Mark)[] = [];
  for (const k of toks) {
    if (typeof k === "string") k.split(/\s+/).filter(Boolean).forEach((w) => ws.push({ w }));
    else ws.push(k);
  }
  return (
    <div style={{ fontFamily: F.serif, fontSize: size, fontWeight: weight, fontStyle: italic ? "italic" : undefined, color, lineHeight: lh, ...style }}>
      {ws.map((k, i) => (
        <CWord key={i} k={k} t={t} at={at + i * stagger} idx={i} />
      ))}
    </div>
  );
};
