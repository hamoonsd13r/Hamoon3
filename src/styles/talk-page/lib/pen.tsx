// Talk Page — pen-and-ink marks and small printed pieces. Any container coordinates; all pure functions of t.
import React from "react";
import { C, F } from "./theme";
import { clamp, eInOut, eOut, eOut5, grp, mix, ramp, useT } from "./time";

/** an svg sheet the size of the zone (860 × 304 by default), overflow visible */
export const Svg: React.FC<{ w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w = 860, h = 304, style, children }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

/** pen stroke along an svg path, drawn 0 → 1 (pathLength-normalised, so no dash leaks on long paths) */
export const Stroke: React.FC<{ d: string; p: number; w?: number; color?: string; fill?: string; op?: number }> = ({ d, p, w = 3, color = C.ink, fill = "none", op = 1 }) =>
  p <= 0 ? null : <path d={d} pathLength={1} fill={fill} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - clamp(p)} opacity={op} />;

/** dashed pen line drawn on progressively: the polyline is cut at fraction p of its length, then dashed */
export const DashPoly: React.FC<{ pts: [number, number][]; p: number; w?: number; color?: string; dash?: string; op?: number }> = ({ pts, p, w = 3, color = C.ink, dash = "10 9", op = 1 }) => {
  if (p <= 0 || pts.length < 2) return null;
  const seg: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(s);
    L += s;
  }
  let left = clamp(p) * L;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / seg[i - 1]);
    d += ` L${mix(pts[i - 1][0], pts[i][0], k).toFixed(1)} ${mix(pts[i - 1][1], pts[i][1], k).toFixed(1)}`;
    left -= seg[i - 1];
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} opacity={op} />;
};

/** sample a cubic bezier into points (for DashPoly) */
export const bez = (a: [number, number], b: [number, number], c: [number, number], d: [number, number], n = 32): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
  });

/** hand-drawn pen loop around a box (opened with a conic mask, so it never shows a dash gap) */
export const Ring: React.FC<{ x: number; y: number; w: number; h: number; at: number; dur?: number; color?: string; sw?: number }> = ({ x, y, w, h, at, dur = 0.5, color = C.accent, sw = 4 }) => {
  const t = useT();
  const p = eInOut(ramp(t, at, at + dur));
  if (p <= 0) return null;
  const mask = `conic-gradient(from 20deg at 50% 50%, #000 ${p * 372}deg, transparent ${p * 372 + 0.5}deg)`;
  return (
    <svg style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "visible", WebkitMaskImage: mask, maskImage: mask }} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 58 4 C 88 2, 101 30, 99 52 C 97 80, 70 98, 45 97 C 16 96, 1 74, 2 50 C 3 22, 26 5, 52 3 C 63 2, 72 6, 78 10" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** handwritten note, written on in reading direction (Caveat; Persian text falls back to Vazirmatn — set rtl) */
export const Note: React.FC<{ text: string; at: number; x: number; y: number; size?: number; rot?: number; dur?: number; color?: string; shadow?: boolean; rtl?: boolean }> = ({
  text,
  at,
  x,
  y,
  size = 40,
  rot = -4,
  dur = 0.5,
  color = C.accent,
  shadow,
  rtl,
}) => {
  const t = useT();
  const p = eInOut(ramp(t, at, at + dur));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: rtl ? F.fa : F.pen,
        fontWeight: 700,
        fontSize: rtl ? size * 0.82 : size,
        lineHeight: 1.1,
        color,
        direction: rtl ? "rtl" : "ltr",
        transform: `rotate(${rot}deg)`,
        clipPath: rtl ? `inset(-30% -5% -30% ${(1 - p) * 100}%)` : `inset(-30% ${(1 - p) * 100}% -30% -5%)`,
        whiteSpace: "nowrap",
        width: "max-content",
        textShadow: shadow ? "0 1px 2px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.6)" : undefined,
      }}
    >
      {text}
    </div>
  );
};

/** pen arrow from (x1,y1) to (x2,y2) with a slight bow; the head appears when the shaft is drawn */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number; dur?: number; bow?: number; color?: string; w?: number }> = ({ x1, y1, x2, y2, at, dur = 0.35, bow = 0.18, color = C.accent, w = 4 }) => {
  const t = useT();
  const p = eInOut(ramp(t, at, at + dur));
  if (p <= 0) return null;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bow;
  const my = (y1 + y2) / 2 + (x2 - x1) * bow;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const hd = (s: number) => `${x2 + Math.cos(ang + s) * 16} ${y2 + Math.sin(ang + s) * 16}`;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <Stroke d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} p={p} w={w} color={color} />
      {p > 0.92 ? <path d={`M${hd(Math.PI - 0.5)} L${x2} ${y2} L${hd(Math.PI + 0.5)}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
};

/** typed mono label (Latin types letter by letter; rtl Persian appears word by word, never letter by letter) */
export const Typed: React.FC<{ text: string; at: number; size?: number; color?: string; weight?: number; spacing?: string; cps?: number; style?: React.CSSProperties; caret?: boolean; rtl?: boolean }> = ({
  text,
  at,
  size = 21,
  color = C.label,
  weight = 600,
  spacing = "0.14em",
  cps = 55,
  style,
  caret = true,
  rtl,
}) => {
  const t = useT();
  if (rtl) {
    const ws = text.split(" ");
    const n = Math.floor(ramp(t, at, at + ws.length * 0.12) * ws.length);
    return <div style={{ fontFamily: F.fa, fontWeight: Math.max(500, weight), fontSize: size * 1.05, color, whiteSpace: "pre", direction: "rtl", ...style }}>{ws.slice(0, Math.max(t >= at ? 1 : 0, n)).join(" ")}</div>;
  }
  const n = Math.floor(ramp(t, at, at + text.length / cps) * text.length);
  const typing = t >= at && n < text.length;
  return (
    <div style={{ fontFamily: F.mono, fontWeight: weight, fontSize: size, letterSpacing: spacing, color, whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {caret ? <span style={{ opacity: typing ? 1 : 0 }}>▍</span> : null}
    </div>
  );
};

/** generic enter: fade + rise + unblur */
export const In: React.FC<{ at: number; dy?: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, dy = 16, dur = 0.42, style, children }) => {
  const t = useT();
  const p = eOut(ramp(t, at, at + dur));
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: p < 1 ? `blur(${(1 - p) * 5}px)` : undefined, ...style }}>{children}</div>;
};

/** number that counts up from `from` and lands with a small pop (shows nothing before `at`, never a lonely 0) */
export const Count: React.FC<{ to: number; at: number; from?: number; dur?: number; size: number; color?: string; prefix?: string; suffix?: string; weight?: number; minW?: string; fmt?: (n: number) => string }> = ({
  to,
  at,
  from,
  dur = 0.9,
  size,
  color = C.ink,
  prefix = "",
  suffix = "",
  weight = 600,
  minW,
  fmt = grp,
}) => {
  const t = useT();
  if (t < at) return null;
  const p = eOut5(ramp(t, at, at + dur));
  const pop = ramp(t, at + dur - 0.1, at + dur) * (1 - ramp(t, at + dur, at + dur + 0.35));
  const start = from ?? (to > 0 ? Math.max(1, to * 0.08) : to);
  return (
    <span style={{ display: "inline-block", fontFamily: F.serif, fontWeight: weight, fontSize: size, color, lineHeight: 1, fontVariantNumeric: "lining-nums tabular-nums", opacity: ramp(t, at, at + 0.12), transform: `scale(${1 + pop * 0.06})`, transformOrigin: "0 70%", minWidth: minW, textAlign: minW ? "right" : undefined }}>
      {prefix}
      {fmt(mix(start, to, p))}
      {suffix}
    </span>
  );
};

/** rubber stamp: slams in (1.7 → 1), stays; optional `until` lifts it before the next thing lands on it */
export const Stamp: React.FC<{ text: string; at: number; x?: number; y?: number; rot?: number; size?: number; color?: string; until?: number; style?: React.CSSProperties }> = ({
  text,
  at,
  x,
  y,
  rot = -8,
  size = 28,
  color = C.accent,
  until,
  style,
}) => {
  const t = useT();
  const p = eOut5(ramp(t, at, at + 0.22));
  const o = until !== undefined ? 1 - eInOut(ramp(t, until - 0.2, until)) : 1;
  if (p <= 0 || o <= 0) return null;
  return (
    <div
      style={{
        position: x !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        display: "inline-block",
        padding: "8px 14px 7px",
        border: `3.5px solid ${color}`,
        borderRadius: 8,
        fontFamily: F.mono,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color,
        whiteSpace: "pre",
        lineHeight: 1,
        background: "rgba(251,248,241,0.9)",
        opacity: clamp(p * 1.6) * o,
        transform: `rotate(${rot}deg) scale(${mix(1.7, 1, p)})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** pen tick ✓ (or cross ✗) drawn into a box */
export const Tick: React.FC<{ at: number; size?: number; cross?: boolean; color?: string; box?: boolean }> = ({ at, size = 34, cross, color = C.ink, box = true }) => {
  const t = useT();
  const p = eOut(ramp(t, at, at + 0.3));
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ overflow: "visible", flex: "none" }}>
      {box ? <path d="M5 6 L35 5 L36 35 L4 36 Z" fill="none" stroke={C.ink3} strokeWidth={2} strokeLinejoin="round" /> : null}
      {cross ? (
        <>
          <Stroke d="M9 10 L32 34" p={ramp(p, 0, 0.5)} w={4} color={color} />
          <Stroke d="M32 9 L9 35" p={ramp(p, 0.5, 1)} w={4} color={color} />
        </>
      ) : (
        <Stroke d="M8 21 L17 31 L39 1" p={p} w={4.2} color={color} />
      )}
    </svg>
  );
};

/** a dark or cream label pill (fact labels: ILLUSTRATION · ESTIMATE · MY TAKE · HYPOTHETICAL) */
export const Tag: React.FC<{ text: string; at: number; until?: number; x?: number; y?: number; dark?: boolean; size?: number }> = ({ text, at, until, x, y, dark, size = 21 }) => {
  const t = useT();
  const p = eOut5(ramp(t, at, at + 0.3)) * (until !== undefined ? 1 - eInOut(ramp(t, until - 0.2, until)) : 1);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: x !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        display: "inline-block",
        padding: "6px 11px 5px",
        borderRadius: 5,
        background: dark ? C.ink : "rgba(251,248,241,0.95)",
        border: dark ? "none" : `2px solid ${C.ink}`,
        fontFamily: F.mono,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: dark ? C.paperHi : C.ink,
        whiteSpace: "pre",
        lineHeight: 1,
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
      }}
    >
      {text}
    </div>
  );
};
