// Talk Page · variant "Silver": one persistent white rounded stage in the lower third (no paper). Its content swaps with
// blur + scale; heavy italic caps + a light italic line; a huge faded word drifts behind; silver spheres glide to a
// new layout on every scene; dark glossy pills for names (text, no logos); an iOS-like toggle; a chrome tick or cross.
// The original used Montserrat (OFL — add it to public/fonts and set SF below if you want it); Inter ships with the kit.
import React from "react";
import { F } from "../theme";
import { eBack, eInOut, eOut, eOut5, mix, ramp, useT } from "../time";

export const S = { white: "#FBFBFA", white2: "#EDEDEC", ink: "#161616", ink2: "#3A3A3A", grey: "#6F6F6E", bgWord: "#E9E9E7" };
/** the stage (absolute frame px): x 60–960 keeps it clear of the Reels buttons */
export const STAGE = { x: 60, y: 1370, w: 900, h: 292 };
const SF = F.ui;

export const Stage: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = STAGE.y }) => {
  const t = useT();
  const p = eOut5(ramp(t, 0, 0.55));
  return (
    <div style={{ position: "absolute", left: STAGE.x, top: y, width: STAGE.w, height: STAGE.h, transform: `translateY(${(1 - p) * 70}px) scale(${0.94 + 0.06 * p})`, filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined, opacity: ramp(t, 0, 0.2) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 40, background: `linear-gradient(180deg, #FFFFFF 0%, ${S.white} 55%, ${S.white2} 100%)`, boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 6px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** a scene inside the stage: blurs/scales in, slow push, blurs/scales out (the next one is already coming) */
export const Scene: React.FC<{ a: number; b: number; children: React.ReactNode; last?: boolean }> = ({ a, b, children, last }) => {
  const t = useT();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const pin = eOut(ramp(t, a, a + 0.38));
  const out = last ? 0 : eInOut(ramp(t, b - 0.26, b));
  const sc = mix(0.94, 1, pin) * (1 + 0.025 * ramp(t, a, b)) * (1 + out * 0.06);
  const blur = (1 - pin) * 14 + out * 16;
  return <div style={{ position: "absolute", inset: 0, opacity: ramp(t, a, a + 0.2) * (1 - out), transform: `scale(${sc})`, transformOrigin: "40% 55%", filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>{children}</div>;
};

/** huge faded word behind everything; tracks in and drifts */
export const BgWord: React.FC<{ text: string; a: number; size?: number; x?: number; y?: number }> = ({ text, a, size = 230, x = -20, y = 40 }) => {
  const t = useT();
  const p = eOut(ramp(t, a, a + 0.9));
  return <div style={{ position: "absolute", left: x - (t - a) * 6, top: y, fontFamily: SF, fontWeight: 900, fontStyle: "italic", fontSize: size, lineHeight: 1, letterSpacing: `${mix(0.18, -0.02, p)}em`, whiteSpace: "nowrap", color: S.bgWord, opacity: p }}>{text}</div>;
};

/** heavy italic caps: each word pops from big + blur */
export const Heavy: React.FC<{ text: string; at: number; size?: number; stagger?: number; style?: React.CSSProperties; color?: string }> = ({ text, at, size = 66, stagger = 0.12, style, color = S.ink }) => {
  const t = useT();
  return (
    <div style={{ fontFamily: SF, fontWeight: 850, fontStyle: "italic", fontSize: size, lineHeight: 1.02, letterSpacing: "-0.02em", textTransform: "uppercase", whiteSpace: "nowrap", color, ...style }}>
      {text.split(" ").map((w, i) => {
        const s = at + i * stagger;
        const p = ramp(t, s, s + 0.32);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.22em", opacity: ramp(t, s, s + 0.1), transform: `scale(${t < s ? 1.45 : mix(1.45, 1, eBack(p, 1.2))})`, transformOrigin: "50% 70%", filter: p < 1 ? `blur(${(1 - eOut(p)) * 10}px)` : undefined, textShadow: "0 2px 0 rgba(0,0,0,0.06)" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** light italic line: slides in from the right with blur */
export const Light: React.FC<{ text: string; at: number; size?: number; stagger?: number; style?: React.CSSProperties; color?: string }> = ({ text, at, size = 36, stagger = 0.06, style, color = S.grey }) => {
  const t = useT();
  return (
    <div style={{ fontFamily: SF, fontWeight: 400, fontStyle: "italic", fontSize: size, lineHeight: 1.15, color, whiteSpace: "nowrap", ...style }}>
      {text.split(" ").map((w, i) => {
        const p = eOut(ramp(t, at + i * stagger, at + i * stagger + 0.45));
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: p, transform: `translateX(${(1 - p) * 26}px)`, filter: p < 1 ? `blur(${(1 - p) * 9}px)` : undefined }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** small letter-spaced caption */
export const Cap: React.FC<{ text: string; at: number; size?: number; style?: React.CSSProperties; color?: string }> = ({ text, at, size = 26, style, color = S.ink2 }) => {
  const t = useT();
  const p = eOut(ramp(t, at, at + 0.5));
  return <div style={{ fontFamily: SF, fontWeight: 600, fontSize: size, letterSpacing: `${mix(0.32, 0.16, p)}em`, color, opacity: p, whiteSpace: "nowrap", ...style }}>{text}</div>;
};

/** silver spheres that glide to a new layout at every key time (stage px); keep them inside the stage */
export type Ball = { x: number; y: number; r: number };
export const Spheres: React.FC<{ keys: { t: number; balls: Ball[] }[] }> = ({ keys }) => {
  const t = useT();
  let k = 0;
  while (k + 1 < keys.length && t >= keys[k + 1].t) k++;
  const A = keys[k];
  const B = keys[Math.min(k + 1, keys.length - 1)];
  const p = k + 1 < keys.length ? eInOut(ramp(t, B.t - 0.45, B.t + 0.55)) : 0;
  return (
    <>
      {A.balls.map((a, i) => {
        const b = B.balls[i] ?? a;
        const x = mix(a.x, b.x, p) + Math.sin(t * 0.5 + i * 2) * 6;
        const y = mix(a.y, b.y, p) + Math.cos(t * 0.45 + i) * 5;
        const r = mix(a.r, b.r, p);
        if (r < 1) return null;
        const hl = 30 + Math.sin(t * 0.4 + i) * 6;
        return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: 999, background: `radial-gradient(circle at ${hl}% ${hl - 4}%, #FFFFFF 0%, #E9E9E8 22%, #C9C9C7 52%, #9C9C9A 80%, #868684 100%)`, boxShadow: `0 ${r * 0.18}px ${r * 0.35}px rgba(0,0,0,0.16)`, opacity: ramp(t, 0.1, 0.6) }} />;
      })}
    </>
  );
};

/** dark glossy pill: a product or app name as text (no logos) */
export const DarkPill: React.FC<{ at: number; label: string; icon?: React.ReactNode; size?: number; rot?: number }> = ({ at, label, icon, size = 30, rot = 0 }) => {
  const t = useT();
  const p = eBack(ramp(t, at, at + 0.4), 1.6);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: `${size * 0.32}px ${size * 0.62}px`, borderRadius: 999, background: "linear-gradient(180deg, #3a3a3a 0%, #121212 55%, #050505 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 20px rgba(0,0,0,0.28)", color: "#F6F6F6", fontFamily: SF, fontWeight: 700, fontSize: size, opacity: ramp(t, at, at + 0.12), transform: `translateY(${Math.sin((t - at) * 1.6) * 3}px) rotate(${rot}deg) scale(${t < at ? 0.4 : 0.4 + 0.6 * p})`, whiteSpace: "nowrap" }}>
      {icon}
      {label}
    </div>
  );
};

/** iOS-like toggle; offAt / onAt flip it with a small overshoot */
export const Toggle: React.FC<{ at: number; offAt?: number; onAt?: number; startOn?: boolean; w?: number }> = ({ at, offAt, onAt, startOn = true, w = 92 }) => {
  const t = useT();
  const h = w * 0.58;
  let on = startOn ? 1 : 0;
  if (offAt !== undefined) on = 1 - eBack(ramp(t, offAt, offAt + 0.32), 1.3);
  if (onAt !== undefined) on = eBack(ramp(t, onAt, onAt + 0.32), 1.3);
  const p = eOut(ramp(t, at, at + 0.35));
  const c = Math.max(0, Math.min(1, on));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 999, background: `rgb(${mix(214, 22, c)},${mix(214, 22, c)},${mix(212, 22, c)})`, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.18)", opacity: p, transform: `scale(${0.7 + 0.3 * p})`, flex: "none" }}>
      <div style={{ position: "absolute", top: h * 0.08, left: mix(h * 0.08, w - h * 0.92, on), width: h * 0.84, height: h * 0.84, borderRadius: 999, background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F1F1F1 60%, #D8D8D8 100%)", boxShadow: "0 3px 6px rgba(0,0,0,0.3)" }} />
    </div>
  );
};

/** extruded chrome tick or cross that pops and rocks */
export const ChromeGlyph: React.FC<{ at: number; kind: "check" | "cross"; size?: number }> = ({ at, kind, size = 120 }) => {
  const t = useT();
  const p = eBack(ramp(t, at, at + 0.45), 1.5);
  const d = kind === "check" ? "M18 56 L44 82 L92 22" : "M24 24 L86 86 M86 24 L24 86";
  const id = `tp-chr-${kind}`;
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" style={{ overflow: "visible", flex: "none", opacity: ramp(t, at, at + 0.1), transform: `scale(${t < at ? 0.3 : 0.3 + 0.7 * p}) rotate(${-8 + Math.sin((t - at) * 1.3) * 7}deg)`, filter: "drop-shadow(0 12px 14px rgba(0,0,0,0.28))" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5F5F5" />
          <stop offset="0.3" stopColor="#9A9A98" />
          <stop offset="0.5" stopColor="#E6E6E4" />
          <stop offset="0.75" stopColor="#3A3A3A" />
          <stop offset="1" stopColor="#D0D0D0" />
        </linearGradient>
      </defs>
      {[6, 4, 2].map((o) => (
        <path key={o} d={d} transform={`translate(${o} ${o})`} fill="none" stroke={`rgb(${70 + o * 9},${70 + o * 9},${68 + o * 9})`} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" transform="translate(-3 -3)" />
    </svg>
  );
};
