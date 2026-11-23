// Market File · cards and marks: the glass card, the verdict marks (check / cross / warn / dash), list rows that
// stamp their mark on a word, the footage glitch on a hit, the target reticle.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FA, accentA, clamp, easeOut, kick, ramp, rng } from "./theme";

/** dark glass card (rises 40 px as k goes 0→1) */
export const Glass: React.FC<{ x: number; y: number; w: number; h: number; k?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, k = 1, children, style }) => {
  const e = easeOut(clamp(k));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 34, background: "rgba(11,11,12,.82)", border: `2px solid ${C.line2}`, opacity: e, transform: `translateY(${(1 - e) * 40}px)`, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
};

/** accent tick in a circle; k 0→1 draws it */
export const Check: React.FC<{ k: number; size?: number; on?: "dark" | "light" }> = ({ k, size = 64, on = "dark" }) => {
  const e = easeOut(clamp(k));
  const L = 40;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, transform: `scale(${0.7 + 0.3 * e + 0.12 * Math.sin(Math.PI * clamp(k * 1.4))})`, opacity: clamp(k * 3) }}>
      <circle cx={32} cy={32} r={30} fill={on === "dark" ? C.accent : C.ink} />
      <path d="M18 33 L28 43 L47 22" fill="none" stroke={on === "dark" ? C.ink : C.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp((k - 0.15) / 0.6))} />
    </svg>
  );
};

/** a cream cross in a ring (the claim that doesn't hold) */
export const Cross: React.FC<{ k: number; size?: number }> = ({ k, size = 72 }) => {
  const e = easeOut(clamp(k));
  const L = 26;
  const d = clamp((k - 0.15) / 0.6);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, opacity: clamp(k * 3), transform: `scale(${0.7 + 0.3 * e + 0.14 * Math.sin(Math.PI * clamp(k * 1.4))})` }}>
      <circle cx={32} cy={32} r={29} fill={C.ink} stroke={C.cream} strokeWidth={3} />
      <path d="M22 22 L42 42" stroke={C.cream} strokeWidth={6} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp(d * 2))} />
      <path d="M42 22 L22 42" stroke={C.cream} strokeWidth={6} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp(d * 2 - 1))} />
    </svg>
  );
};

/** a warning mark (accent disc with «!») */
export const Warn: React.FC<{ k: number; size?: number }> = ({ k, size = 72 }) => {
  const e = easeOut(clamp(k));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, opacity: clamp(k * 3), transform: `scale(${0.7 + 0.3 * e + 0.12 * Math.sin(Math.PI * clamp(k * 1.4))})` }}>
      <circle cx={32} cy={32} r={30} fill={C.accent} />
      <rect x={28.5} y={14} width={7} height={24} rx={3.5} fill={C.ink} />
      <circle cx={32} cy={47} r={4.4} fill={C.ink} />
    </svg>
  );
};

/** neutral: a ring with a dash (no call either way) */
export const Dash: React.FC<{ k: number; size?: number }> = ({ k, size = 72 }) => {
  const e = easeOut(clamp(k));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, opacity: clamp(k * 3), transform: `scale(${0.7 + 0.3 * e})` }}>
      <circle cx={32} cy={32} r={29} fill={C.ink} stroke={C.creamDim} strokeWidth={3} />
      <rect x={20} y={29} width={24 * clamp(k * 1.5)} height={6} rx={3} fill={C.cream} />
    </svg>
  );
};

export type Mark = "check" | "cross" | "warn" | "dash";
export const MarkIcon: React.FC<{ kind: Mark; k: number; size?: number }> = ({ kind, k, size }) =>
  kind === "check" ? <Check k={k} size={size} /> : kind === "cross" ? <Cross k={k} size={size} /> : kind === "dash" ? <Dash k={k} size={size} /> : <Warn k={k} size={size} />;

/** one list row: title (+ Persian sub) on the right, the mark on the left; it slides in at `at`, its mark stamps at `mark` */
export const Row: React.FC<{ t: number; at: number; mark: number; title: string; sub?: string; kind: Mark; y: number; h?: number; size?: number }> = ({ t, at: a, mark, title, sub, kind, y, h = 96, size = 52 }) => {
  const k = easeOut(ramp(t, a - 0.1, a + 0.28));
  if (k <= 0) return null;
  const mk = ramp(t, mark, mark + 0.45);
  const flash = kick(t, mark, 0.4);
  return (
    <div dir="rtl" style={{ position: "absolute", left: 22, right: 22, top: y, height: h, borderRadius: 24, padding: "0 16px", display: "flex", alignItems: "center", gap: 24, opacity: k, transform: `translateX(${(1 - k) * 50}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined, background: flash > 0 ? accentA(0.12 * flash) : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FA, fontWeight: 900, fontSize: size, lineHeight: 1.08, color: C.cream, whiteSpace: "nowrap" }}>{title}</div>
        {sub && <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: C.creamDim, marginTop: 6, whiteSpace: "nowrap", opacity: easeOut(ramp(t, mark, mark + 0.35)) }}>{sub}</div>}
      </div>
      <MarkIcon kind={kind} k={mk} size={72} />
    </div>
  );
};

/** footage glitch on a hit: accent/cream slices that jump for ~0.2 s */
export const Glitch: React.FC<{ t: number; at: number; len?: number }> = ({ t, at: a, len = 0.2 }) => {
  if (t < a || t > a + len) return null;
  const r = rng(Math.floor((t - a) * 60) + 7);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 5 }, (_, i) => {
        const y = r() * 1920, h = 6 + r() * 34;
        return <div key={i} style={{ position: "absolute", left: -40 + r() * 80, top: y, width: 1160, height: h, background: i % 2 ? C.accent : C.cream, opacity: 0.18 + 0.3 * r(), mixBlendMode: "screen" }} />;
      })}
    </AbsoluteFill>
  );
};

/** a target reticle that closes in on (cx, cy) from `a` (the word that names the target) */
export const Reticle: React.FC<{ t: number; a: number; cx?: number; cy?: number }> = ({ t, a, cx = 540, cy = 964 }) => {
  const k = easeOut(ramp(t, a - 0.05, a + 0.35));
  if (k <= 0) return null;
  const r = 300 - 120 * k;
  const spin = (t - a) * 30;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: k }}>
      <g transform={`translate(${cx} ${cy}) rotate(${spin})`}>
        <circle r={r} fill="none" stroke={C.accent} strokeWidth={4} strokeDasharray="40 22" />
        <circle r={r * 0.55} fill="none" stroke={C.accent} strokeWidth={3} opacity={0.7} />
        {[0, 90, 180, 270].map((d) => (
          <line key={d} x1={0} y1={-r - 40} x2={0} y2={-r + 30} stroke={C.accent} strokeWidth={5} transform={`rotate(${d})`} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={10} fill={C.accent} />
    </svg>
  );
};
