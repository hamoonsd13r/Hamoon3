// Talk Cutout · kinetic type for the motion sections: the step slams («قدم 1»), a number lifted off a screen toward
// the lens (with a dark scrim under it so it never sits on UI text), small glass tags.
import React from "react";
import { C, F, SD } from "./theme";
import { clamp, ease, jolt, mix } from "./time";

// ── «قدم N»: slams in big over a dark scrim, holds, dissolves IN PLACE (never flies across the UI); a small badge
//    «قدم N/M» then rests in a corner while that step plays ─────────────────────────────────────────────────────────
export type StepSlamsP = {
  t: number;
  at: number[]; // film time of each «قدم» (the cut lands on a music downbeat)
  end: number; // the badge leaves (the steps are over)
  word?: string; // «قدم»
  badge?: { x: number; y: number } | null; // null: no badge (when an app header would sit under it the whole time)
  rest?: [number, number][]; // windows where the badge steps aside (an app header or a lifted number sits there)
  w?: number; // frame width
};
export const StepSlams: React.FC<StepSlamsP> = ({ t, at, end, word = "قدم", badge = { x: 64, y: 262 }, rest = [], w = 1080 }) => {
  if (t < at[0] - 0.05 || t > end + 0.3) return null;
  let k = 0;
  for (let i = 0; i < at.length; i++) if (t >= at[i]) k = i;
  const lt = t - at[k];
  const slam = ease.out(clamp(lt / 0.2));
  const gone = ease.in(clamp((lt - 0.62) / 0.26));
  const scrim = clamp(lt / 0.1) * (1 - clamp((lt - 0.66) / 0.3));
  const kick = jolt(t, at[k], 14, 32, 9);
  const o = clamp((t - (end - 0.1)) / 0.25);
  const winOf = (a: number, b: number) => clamp((t - a) / 0.2) * (1 - clamp((t - b) / 0.2));
  const r = rest.reduce((m, [a, b]) => Math.max(m, winOf(a, b)), 0);
  const b = badge ? ease.out(clamp((lt - 0.7) / 0.3)) * (1 - r) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 1 - o }}>
      {scrim > 0 ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 55% at 50% 30%, rgba(4,5,6,0.92), rgba(4,5,6,0.68))", opacity: scrim }} /> : null}
      {gone < 1 ? (
        <div style={{ position: "absolute", left: w / 2 - 400, top: 200 + kick, width: 800, height: 340, display: "flex", alignItems: "center", justifyContent: "center", gap: 34, direction: "rtl", transform: `scale(${mix(1.45, 1, slam) * (1 + 0.12 * gone)})`, opacity: slam * (1 - gone), filter: slam < 1 || gone > 0 ? `blur(${(1 - slam) * 16 + gone * 12}px)` : undefined }}>
          <span style={{ fontFamily: F.head, fontSize: 160, color: C.cream, textShadow: "0 12px 50px rgba(0,0,0,0.55)" }}>{word}</span>
          <span style={{ fontFamily: F.ui, fontWeight: 900, fontSize: 300, lineHeight: 1, color: C.accent, letterSpacing: -10, textShadow: "0 12px 50px rgba(0,0,0,0.45)" }}>{k + 1}</span>
        </div>
      ) : null}
      {b > 0 && badge ? (
        <div style={{ position: "absolute", left: badge.x, top: badge.y, height: 84, padding: "0 28px", borderRadius: 42, display: "flex", alignItems: "center", gap: 16, background: "rgba(14,16,19,0.86)", border: "1px solid rgba(244,238,230,0.16)", backdropFilter: "blur(10px)", boxShadow: "0 18px 50px rgba(0,0,0,0.45)", direction: "rtl", opacity: b, transform: `translateY(${(1 - b) * -16}px)` }}>
          <span style={{ fontFamily: F.head, fontSize: 44, color: C.cream }}>{word}</span>
          {/* «1/3» as one left-to-right group, so it never reads «3/1» inside the RTL line */}
          <span style={{ direction: "ltr", unicodeBidi: "isolate", fontFamily: F.ui, fontWeight: 900, fontSize: 48, color: C.faint, whiteSpace: "nowrap" }}>
            <span style={{ color: C.accent }}>{k + 1}</span>/{at.length}
          </span>
        </div>
      ) : null}
    </div>
  );
};

// ── a number lifted off a screen ──────────────────────────────────────────────────────────────────────────────
export type Rect = { x: number; y: number; w: number; h: number };
/** a value lifted off a screen: starts on the screen (`from`, frame px), flies to (tx, ty), grows, casts a deep shadow;
 *  `label` sits under it. It IS the screen's own value: no counter from zero. Leaves (sinks + fades) at `b`. */
export const Lift: React.FC<{ t: number; a: number; b: number; from: Rect; tx: number; ty: number; size: number; value: string; label?: React.ReactNode; color?: string; ink?: string }> = ({ t, a, b, from, tx, ty, size, value, label, color = C.cream, ink }) => {
  if (t < a || t > b + 0.35) return null;
  const f = ease.inOut(clamp((t - a) / 0.5));
  const leave = ease.in(clamp((t - b) / 0.3));
  const x = mix(from.x + from.w / 2, tx, f), y = mix(from.y + from.h / 2, ty, f);
  const s0 = from.h / (size * 0.8);
  const sc = mix(s0, 1, f) * (1 + 0.03 * Math.sin(clamp((t - a - 0.5) / 2) * Math.PI));
  return (
    <div style={{ position: "absolute", left: x - 500, top: y - size * 0.6, width: 1000, height: size * 1.6, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", opacity: 1 - leave, transform: `scale(${sc * (1 - 0.2 * leave)})`, transformOrigin: "50% 37.5%" }}>
      <div style={{ position: "relative", fontFamily: F.ui, fontWeight: 850, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.035, color, direction: "ltr", fontVariantNumeric: "tabular-nums", textShadow: `0 ${4 + 30 * f}px ${10 + 50 * f}px rgba(0,0,0,${0.3 + 0.35 * f})` }}>
        <span style={{ opacity: ink ? clamp((f - 0.15) / 0.35) : 1 }}>{value}</span>
        {/* `ink`: the screen's own colour at the start (a light page), cross-fading to `color` as the page darkens */}
        {ink && f < 0.5 ? <span style={{ position: "absolute", left: 0, top: 0, color: ink, textShadow: "none", opacity: 1 - clamp((f - 0.15) / 0.35) }}>{value}</span> : null}
      </div>
      {label ? <div style={{ marginTop: size * 0.08, opacity: clamp((t - a - 0.35) / 0.25), transform: `translateY(${(1 - ease.out(clamp((t - a - 0.35) / 0.3))) * 16}px)` }}>{label}</div> : null}
      <div style={{ position: "absolute", top: size * 1.02, width: size * 1.2 * f, height: 5, borderRadius: 3, background: C.accent, opacity: f * 0.9, left: 500 - size * 0.6 * f }} />
    </div>
  );
};
/** a dark scrim that pulls the eye off a busy screen while a lift holds (a white screen under it: brightness ≤ 0.2 too) */
export const Scrim: React.FC<{ a: number }> = ({ a }) => (a > 0 ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 50% at 50% 45%, rgba(4,5,6,0.55), rgba(4,5,6,0.82))", opacity: a, pointerEvents: "none" }} /> : null);

/** small glass label (English UI words, tags, «نمونه») */
export const Tag: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; color?: string; fa?: boolean }> = ({ children, style, color = C.cream, fa }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "rgba(20,22,26,0.78)", border: "1px solid rgba(244,238,230,0.14)", backdropFilter: "blur(10px)", fontFamily: fa ? F.vzB : F.ui, fontWeight: 700, fontSize: 30, color, letterSpacing: fa ? 0 : 0.5, direction: fa ? "rtl" : "ltr", whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

/** a big kinetic word: slams (scale + blur), breathes, leaves with blur */
export const Punch: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; x?: number; y?: number; size?: number; color?: string; font?: string; rtl?: boolean }> = ({ t, a, b, children, x = 540, y = 760, size = 210, color = C.cream, font = F.head, rtl = true }) => {
  if (t < a - 0.02 || t > b + 0.3) return null;
  const u = clamp((t - a) / 0.2), v = clamp((t - b) / 0.22);
  const e = ease.out(u);
  const life = 1 + 0.035 * clamp((t - a) / Math.max(0.3, b - a));
  return (
    <div style={{ position: "absolute", left: x - 520, top: y - size, width: 1040, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ direction: rtl ? "rtl" : "ltr", fontFamily: font, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap", textShadow: SD, opacity: e * (1 - v), filter: u < 1 || v > 0 ? `blur(${(1 - e) * 14 + v * 10}px)` : undefined, transform: `translateY(${-v * 40}px) scale(${mix(1.45, 1, e) * life * (1 + v * 0.12)})` }}>
        {children}
      </div>
    </div>
  );
};
