// Talk Page · variant "Strips" (declassified): torn manila strips lie on the table under the speaker's hands, one
// line each; the key words sit under a black redaction bar that slides off when they are said; a typed dossier row,
// an ink clock that ticks, an accent stamp. No page, no headline row — lighter than the main page.
// Layout rules (the accepted version): strips x 60–960 (clear of the Reels buttons), top ≥ the fingertips (~1382),
// labels 20 px #5E584C, meaning-carrying text ≥ 26 px, one strip at a time (the old one leaves before the next lands).
import React from "react";
import { F } from "../theme";
import { eBack, eInOut, eOut, eOut5, hash, ramp, useT, wob } from "../time";

export const K = {
  paper: "#ECE3CF",
  paper2: "#DFD2B6",
  ink: "#191714",
  ink2: "#4A443A",
  ink3: "#857C6C",
  label: "#5E584C",
  accent: "#C2411B",
  bar: "#141210",
};
export const STRIP = { x: 60, y: 1382, w: 900 };

const GRAIN3 =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http%3A//www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.33  0 0 0 0 0.27  0 0 0 0 0.18  0 0 0 0.12 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
const FIBERS3 =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http%3A//www.w3.org/2000/svg' width='700' height='300'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.003 0.07' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>\")";
// torn top/bottom edges, clean-cut ends
const tornPath = (w: number, h: number, seed: number) => {
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 11) pts.push(`${Math.min(x, w)}px ${(1 + hash(x, seed) * 4.5).toFixed(1)}px`);
  pts.push(`${w}px ${h - 2}px`);
  for (let x = w; x >= 0; x -= 11) pts.push(`${Math.max(x, 0)}px ${(h - 1 - hash(x, seed + 9) * 4.5).toFixed(1)}px`);
  return `polygon(${pts.join(",")})`;
};

/** label row of a strip: an accent square + typed mono text */
export const StripTag: React.FC<{ text: string; at: number; size?: number; color?: string }> = ({ text, at, size = 20, color = K.label }) => {
  const t = useT();
  const n = Math.floor(ramp(t, at, at + text.length * 0.02) * text.length);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontWeight: 600, fontSize: size, letterSpacing: "0.16em", color, whiteSpace: "pre" }}>
      <span style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55), background: K.accent, opacity: ramp(t, at - 0.1, at) }} />
      {text.slice(0, n)}
    </div>
  );
};

/** one torn strip, slides in from the left at a, leaves to the right at b */
export const Strip: React.FC<{ a: number; b: number; h: number; w?: number; x?: number; y?: number; tilt?: number; seed?: number; tag?: string; tagAt?: number; right?: React.ReactNode; exit?: number; children: React.ReactNode }> = ({
  a,
  b,
  h,
  w = STRIP.w,
  x = STRIP.x,
  y = STRIP.y,
  tilt = -0.6,
  seed = 1,
  tag,
  tagAt,
  right,
  exit = 0.32,
  children,
}) => {
  const t = useT();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const pin = eOut5(ramp(t, a, a + 0.55));
  const out = eInOut(ramp(t, b - exit, b));
  const xx = x - 150 * (1 - pin) + out * 80;
  const yy = y + out * 26 + Math.sin(t * 0.8 + seed) * 1.6;
  const rot = tilt - 2.6 * (1 - pin) + out * 0.9 + Math.sin(t * 0.5 + seed * 1.7) * 0.12;
  return (
    <div style={{ position: "absolute", left: xx, top: yy, width: w, height: h, transform: `rotate(${rot}deg)`, transformOrigin: "0% 100%", opacity: ramp(t, a, a + 0.18) * (1 - out) }}>
      <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.5)) drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: tornPath(w, h, seed), background: `${FIBERS3}, ${GRAIN3}, linear-gradient(172deg, #F3EBD9 0%, ${K.paper} 50%, ${K.paper2} 100%)` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,250,235,0.16), rgba(70,50,20,0.10))" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, top: 18, bottom: 14 }}>
        {tag ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 26 }}>
            <StripTag text={tag} at={tagAt ?? a + 0.12} />
            {right ?? null}
          </div>
        ) : null}
        <div style={{ position: "relative", marginTop: tag ? 6 : 0 }}>{children}</div>
      </div>
    </div>
  );
};

/** a strip word: red = the redaction bar slides off at that time (on the spoken word); ul / strike = pen marks */
export type RW = string | { w: string; red?: number; ul?: number; strike?: number; it?: boolean; b?: boolean; color?: string };
const PenLine: React.FC<{ d: string; p: number; w?: number; top: string; h: string }> = ({ d, p, w = 3, top, h }) =>
  p <= 0 ? null : (
    <svg style={{ position: "absolute", left: "-1%", width: "102%", top, height: h, overflow: "visible", clipPath: `inset(-60% ${(1 - p) * 100}% -60% -2%)` }} viewBox="0 0 100 10" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={K.accent} strokeWidth={w} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
const RWord: React.FC<{ k: Exclude<RW, string>; at: number; i: number; t: number }> = ({ k, at, i, t }) => {
  const p = eOut(ramp(t, at, at + 0.4));
  const bar = k.red !== undefined ? 1 - eInOut(ramp(t, k.red, k.red + 0.36)) : 0;
  const hit = k.red !== undefined ? ramp(t, k.red + 0.2, k.red + 0.3) * (1 - ramp(t, k.red + 0.3, k.red + 0.75)) : 0;
  const ul = k.ul !== undefined ? eOut(ramp(t, k.ul, k.ul + 0.4)) : 0;
  const st = k.strike !== undefined ? eOut(ramp(t, k.strike, k.strike + 0.3)) : 0;
  return (
    <span style={{ position: "relative", display: "inline-block", marginRight: "0.25em", opacity: p, transform: `translateX(${(1 - p) * 8}px) scale(${1 + hit * 0.05})`, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined, fontStyle: k.it ? "italic" : undefined, fontWeight: k.b ? 650 : undefined, color: k.color }}>
      {k.w}
      {k.red !== undefined && bar > 0 ? <span style={{ position: "absolute", left: "-0.08em", right: "-0.1em", top: "0.16em", bottom: "0.04em", background: K.bar, transform: `scaleX(${bar})`, transformOrigin: "100% 50%", borderRadius: 1 }} /> : null}
      {k.ul !== undefined ? <PenLine d={`M0 ${5 + wob(i, 2) * 3} C 30 ${2 + wob(i, 3) * 3}, 65 ${8 + wob(i, 4) * 2}, 100 ${4 + wob(i, 5) * 3}`} p={ul} top="90%" h="0.3em" /> : null}
      {k.strike !== undefined ? <PenLine d={`M0 6 L100 ${3 + wob(i, 6) * 3}`} p={st} w={3.4} top="50%" h="0.2em" /> : null}
    </span>
  );
};
export const RedLine: React.FC<{ ws: RW[]; at: number; size: number; weight?: number; italic?: boolean; color?: string; stagger?: number; style?: React.CSSProperties }> = ({ ws, at, size, weight = 600, italic, color = K.ink, stagger = 0.045, style }) => {
  const t = useT();
  const list: Exclude<RW, string>[] = [];
  for (const k of ws) {
    if (typeof k === "string") k.split(/\s+/).filter(Boolean).forEach((w) => list.push({ w }));
    else list.push(k);
  }
  return (
    <div style={{ fontFamily: F.serif, fontSize: size, fontWeight: weight, fontStyle: italic ? "italic" : undefined, color, lineHeight: 1.16, ...style }}>
      {list.map((k, i) => (
        <RWord key={i} k={k} at={at + i * stagger} i={i} t={t} />
      ))}
    </div>
  );
};

/** typed dossier row: LABEL  value (the value types in, an accent rule underlines it at hiAt) */
export const Dossier: React.FC<{ label: string; value: string; at: number; hiAt?: number }> = ({ label, value, at, hiAt }) => {
  const t = useT();
  const n = Math.floor(ramp(t, at + 0.15, at + 0.15 + value.length * 0.022) * value.length);
  const hi = hiAt !== undefined ? eOut(ramp(t, hiAt, hiAt + 0.35)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 18, height: 44, opacity: ramp(t, at, at + 0.15) }}>
      <span style={{ width: 150, fontFamily: F.mono, fontWeight: 600, fontSize: 20, letterSpacing: "0.16em", color: K.label }}>{label}</span>
      <span style={{ position: "relative", fontFamily: F.serif, fontSize: 34, color: K.ink }}>
        {value.slice(0, n)}
        <span style={{ position: "absolute", left: 0, bottom: -3, height: 2.5, width: `${hi * 100}%`, background: K.accent }} />
      </span>
    </div>
  );
};

/** stamp on a strip (never on top of words) */
export const StripStamp: React.FC<{ text: string; at: number; rot?: number; size?: number; style?: React.CSSProperties }> = ({ text, at, rot = -7, size = 28, style }) => {
  const t = useT();
  if (t < at) return null;
  const p = ramp(t, at, at + 0.14);
  return (
    <div style={{ position: "absolute", fontFamily: F.mono, fontWeight: 600, fontSize: size, letterSpacing: "0.22em", color: K.accent, border: `3px solid ${K.accent}`, padding: "5px 12px 4px 16px", transform: `rotate(${rot}deg) scale(${1.6 - 0.6 * eOut(p)})`, opacity: p, mixBlendMode: "multiply", whiteSpace: "nowrap", ...style }}>
      {text}
    </div>
  );
};

/** ink clock: the second hand jumps once a second (with a tiny overshoot); hh:mm:ss under it */
export const InkClock: React.FC<{ at: number; size: number; startSec?: number; hhmm?: string }> = ({ at, size, startSec = 40, hhmm = "23:59" }) => {
  const t = useT();
  const p = eOut(ramp(t, at, at + 0.5));
  const el = Math.max(0, t - at);
  const whole = Math.floor(el);
  const sec = startSec + whole + eBack(ramp(el - whole, 0, 0.16), 2.2);
  const r = size / 2 - 6;
  const c = size / 2;
  const hand = (deg: number, len: number, w: number, col: string) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return <line x1={c} y1={c} x2={c + Math.cos(a) * len} y2={c + Math.sin(a) * len} stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };
  const shown = Math.min(59, Math.floor(startSec + whole));
  return (
    <div style={{ width: size, opacity: p, transform: `scale(${0.85 + 0.15 * p})`, flex: "none" }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        <circle cx={c} cy={c} r={r} fill="rgba(255,255,255,0.3)" stroke={K.ink} strokeWidth={2.4} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = ((i * 6 - 90) * Math.PI) / 180;
          const big = i % 5 === 0;
          const r0 = r - (big ? 12 : 6);
          return <line key={i} x1={c + Math.cos(a) * r0} y1={c + Math.sin(a) * r0} x2={c + Math.cos(a) * (r - 2)} y2={c + Math.sin(a) * (r - 2)} stroke={i === 0 ? K.accent : K.ink2} strokeWidth={big ? 2.2 : 1} />;
        })}
        {hand(359.5 + 0.5 * (sec / 60), r * 0.5, 4.2, K.ink)}
        {hand(354 + (sec / 60) * 6, r * 0.78, 3, K.ink)}
        {hand(sec * 6, r * 0.86, 1.6, K.accent)}
        <circle cx={c} cy={c} r={4} fill={K.accent} />
      </svg>
      <div style={{ textAlign: "center", fontFamily: F.mono, fontWeight: 600, fontSize: 22, letterSpacing: "0.1em", color: K.ink2, marginTop: 4 }}>
        {hhmm}:<span style={{ color: K.accent }}>{String(shown).padStart(2, "0")}</span>
      </div>
    </div>
  );
};
