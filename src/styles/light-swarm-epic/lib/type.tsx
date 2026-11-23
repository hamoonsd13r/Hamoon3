// Light Swarm Epic · the 2D layer: the countdown, the broadcast corners, kinetic words, lower thirds, footage.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence } from "remotion";
import { AN, CH, COPY, FPS, H, TOTAL, W, asset, clamp, ease, hit, ramp } from "./theme";

type P = React.CSSProperties;
export const TimeCtx = createContext({ t: 0, frame: 0 });
export const ACC = "#FF8A3D"; // the one accent (amber-orange on near-black)
export const INK = "#FFF6EC";

/** a muted footage clip, visible for t ∈ [t0, t0 + dur); `from` = seconds into the clip at t0 */
export const Clip: React.FC<{ n: string; t0: number; dur: number; from?: number; style?: P }> = ({ n, t0, dur, from = 0, style }) => {
  const { t, frame } = useContext(TimeCtx);
  if (t < t0 - 1e-6 || t >= t0 + dur) return null;
  return (
    <Sequence from={frame - Math.round((t - t0) * FPS)} durationInFrames={Math.max(1, Math.round(dur * FPS) + 1)} layout="none">
      <OffthreadVideo
        src={asset(`clips/${n}.mp4`)}
        startFrom={Math.round(from * FPS)}
        muted
        style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", maxWidth: "none", display: "block", ...style }}
      />
    </Sequence>
  );
};

let uid = 0;
/** RGB split: red right, blue left by d px (skipped when tiny) */
export const Split: React.FC<{ d: number; children: React.ReactNode }> = ({ d, children }) => {
  if (Math.abs(d) < 0.4) return <AbsoluteFill>{children}</AbsoluteFill>;
  const id = `rgb41-${++uid % 100000}`;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={d} result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-d} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────── the countdown: mm:ss, the changing digits roll up; a hairline shows how much of the 10 minutes is left
const Roll: React.FC<{ a: string; b: string; k: number; w: number }> = ({ a, b, k, w }) => {
  if (a === b || k >= 1) return <span style={{ display: "inline-block", width: w, textAlign: "center" }}>{b}</span>;
  const e = ease.out(k);
  return (
    <span style={{ display: "inline-block", width: w, height: "1.08em", position: "relative", overflow: "hidden", verticalAlign: "top" }}>
      <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", transform: `translateY(${(-e * 100).toFixed(1)}%)`, opacity: 1 - e }}>{a}</span>
      <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", transform: `translateY(${((1 - e) * 100).toFixed(1)}%)`, opacity: e }}>{b}</span>
    </span>
  );
};
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
export const Timer: React.FC<{ t: number; o: number }> = ({ t, o }) => {
  const left = Math.max(0, TOTAL - t);
  const s = Math.ceil(left - 1e-6);
  const since = t - Math.floor(t);
  const prev = t >= 1 ? mmss(Math.min(TOTAL, s + 1)) : mmss(s);
  const cur = mmss(s);
  const k = clamp(since / 0.18);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 44, display: "flex", flexDirection: "column", alignItems: "center", opacity: o }}>
      <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 14, letterSpacing: "0.46em", paddingLeft: "0.46em", color: "rgba(255,240,225,0.6)" }}>{COPY.startsIn}</div>
      <div style={{ marginTop: 4, fontFamily: CH, fontWeight: 500, fontSize: 52, lineHeight: "1.08em", color: INK, textShadow: "0 0 22px rgba(255,150,70,0.28)", display: "flex" }}>
        {cur.split("").map((ch, i) => (
          <Roll key={i} a={prev[i]} b={ch} k={k} w={ch === ":" ? 18 : 31} />
        ))}
      </div>
      <div style={{ marginTop: 9, width: 232, height: 1, background: "rgba(255,240,225,0.16)" }}>
        <div style={{ width: `${(100 * left) / TOTAL}%`, height: 1, background: ACC, boxShadow: `0 0 8px ${ACC}` }} />
      </div>
    </div>
  );
};

/** the broadcast frame: chapter on the left, the brand on the right */
export const Corners: React.FC<{ o: number; chapter: string; name: string }> = ({ o, chapter, name }) => {
  const st: P = { position: "absolute", top: 58, fontFamily: CH, fontWeight: 500, fontSize: 16, letterSpacing: "0.4em", color: "rgba(255,240,225,0.6)", whiteSpace: "nowrap" };
  return (
    <div style={{ opacity: o }}>
      <div style={{ ...st, left: 96 }}>
        <span style={{ color: ACC }}>{chapter}</span>
        <span style={{ margin: "0 0.8em", opacity: 0.5 }}>/</span>
        {name}
      </div>
      <div style={{ ...st, right: 96 - 5.6 }}>{COPY.corner}</div>
    </div>
  );
};

/** a small source caption, bottom-left, on every footage shot */
export const Caption: React.FC<{ t: number; t0: number; t1: number; text: string }> = ({ t, t0, t1, text }) => {
  if (t < t0 || t >= t1) return null;
  const u = ease.out(ramp(t, t0, t0 + 0.2));
  return (
    <div style={{ position: "absolute", left: 96, top: 968, display: "flex", alignItems: "center", gap: 16, opacity: u, transform: `translateX(${(-14 * (1 - u)).toFixed(1)}px)` }}>
      <div style={{ width: 28 * u, height: 2, background: ACC }} />
      <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 17, letterSpacing: "0.32em", color: "rgba(255,244,232,0.82)", textShadow: "0 2px 12px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

// ─────────────── kinetic words: slam in on the beat (scale + blur + tracking collapse), push while held, whip out
export type Word = { s: string; t0: number; t1: number; size: number; y: number; font?: string; track?: number; exit?: "whip" | "cut" | "fade"; color?: string };
export const Slam: React.FC<{ w: Word; t: number }> = ({ w, t }) => {
  if (t < w.t0 || t >= w.t1 + 0.25) return null;
  const exit = w.exit ?? "whip";
  if (exit === "cut" && t >= w.t1) return null;
  const e = ease.expo(ramp(t, w.t0, w.t0 + 0.16));
  const life = ramp(t, w.t0, w.t1);
  let x = 0;
  let o = e;
  let blur = 11 * (1 - e);
  if (exit === "whip") {
    const v = ramp(t, w.t1 - 0.07, w.t1);
    x = -260 * ease.in(v);
    blur += 18 * v;
    o *= 1 - v;
  } else if (exit === "fade") o *= 1 - ramp(t, w.t1, w.t1 + 0.25);
  const sc = (1 + 0.3 * (1 - e)) * (1 + 0.035 * life);
  const tr = (w.track ?? 0.02) + 0.2 * (1 - e);
  return (
    <div
      style={{
        position: "absolute", left: 0, top: w.y - w.size, width: W, height: w.size * 2, display: "flex", alignItems: "center", justifyContent: "center",
        transform: `translateX(${x.toFixed(1)}px) scale(${sc.toFixed(4)})`, opacity: o, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
      }}
    >
      <span style={{ fontFamily: w.font ?? AN, fontSize: w.size, lineHeight: 1, letterSpacing: `${tr.toFixed(3)}em`, paddingLeft: `${tr.toFixed(3)}em`, color: w.color ?? INK, whiteSpace: "nowrap", textShadow: "0 0 34px rgba(255,140,60,0.22), 0 8px 40px rgba(0,0,0,0.6)" }}>{w.s}</span>
    </div>
  );
};

/** a lower-third block (big number + a line of context) */
export const Lower: React.FC<{ t: number; t0: number; t1: number; big: string; small: string }> = ({ t, t0, t1, big, small }) => {
  if (t < t0 || t >= t1 + 0.2) return null;
  const u = ease.expo(ramp(t, t0, t0 + 0.3));
  const v = ease.out(ramp(t, t0 + 0.12, t0 + 0.5));
  const out = 1 - ramp(t, t1, t1 + 0.2);
  return (
    <div style={{ position: "absolute", left: 96, top: 800, opacity: out }}>
      <div style={{ fontFamily: AN, fontSize: 104, lineHeight: 1, color: INK, letterSpacing: "0.03em", opacity: u, transform: `translateY(${(18 * (1 - u)).toFixed(1)}px)`, filter: u < 0.98 ? `blur(${(8 * (1 - u)).toFixed(1)}px)` : undefined, textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>{big}</div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, opacity: v }}>
        <div style={{ width: 36 * v, height: 2, background: ACC }} />
        <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 18, letterSpacing: "0.34em", color: "rgba(255,244,232,0.8)", whiteSpace: "nowrap" }}>{small}</div>
      </div>
    </div>
  );
};

/** a knockout window: the film dim and blurred full-frame, the word cut out of it at full brightness, a lit edge */
export const Window: React.FC<{ t: number; t0: number; t1: number; s: string; n: string; from: number; size: number; y?: number }> = ({ t, t0, t1, s, n, from, size, y = 540 }) => {
  if (t < t0 || t >= t1) return null;
  const e = ease.expo(ramp(t, t0, t0 + 0.16));
  const life = ramp(t, t0, t1);
  const v = ramp(t, t1 - 0.08, t1);
  const sc = (1 + 0.34 * (1 - e)) * (1 + 0.05 * life) * (1 + 0.5 * ease.in(v));
  const blur = 10 * (1 - e) + 14 * v;
  const cid = `win41-${s}`;
  const film = (bright: boolean) => (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${(1.04 + 0.05 * life).toFixed(4)})`, filter: bright ? "brightness(1.18) contrast(1.1)" : "brightness(0.2) contrast(1.05) blur(6px)" }}>
      <Clip n={n} t0={t0} dur={t1 - t0 + 0.04} from={from} />
    </div>
  );
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {film(false)}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <clipPath id={cid} clipPathUnits="userSpaceOnUse">
            <text x={W / 2} y={y} textAnchor="middle" dominantBaseline="central" fontFamily={AN} fontSize={size} letterSpacing={size * 0.01} transform={`translate(${W / 2} ${y}) scale(${sc.toFixed(4)}) translate(${-W / 2} ${-y})`}>
              {s}
            </text>
          </clipPath>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 1.5px rgba(255,246,232,0.95)) drop-shadow(0 0 28px rgba(0,0,0,0.85))" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: `url(#${cid})`, opacity: 1 - v, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined }}>{film(true)}</div>
      </div>
    </AbsoluteFill>
  );
};

/** full-frame footage with a slow push, an RGB-split kick on its first frames and a fade-out tail */
export const Full: React.FC<{ t: number; t0: number; t1: number; n: string; from: number; fadeOut?: number; push?: number }> = ({ t, t0, t1, n, from, fadeOut = 0, push = 0.05 }) => {
  if (t < t0 || t >= t1 + fadeOut) return null;
  const life = ramp(t, t0, t1 + fadeOut);
  const o = fadeOut > 0 ? 1 - ease.io(ramp(t, t1, t1 + fadeOut)) : 1;
  const d = 12 * hit(t, t0, 0.05);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Split d={d}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${(1.02 + push * life + 0.06 * hit(t, t0, 0.08)).toFixed(4)})` }}>
          <Clip n={n} t0={t0} dur={t1 + fadeOut - t0 + 0.04} from={from} />
        </div>
      </Split>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ o?: number }> = ({ o = 0.6 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,${o}) 100%)` }} />
);
export const Grain: React.FC<{ frame: number; o?: number }> = ({ frame, o = 0.05 }) => (
  <div
    style={{
      position: "absolute", inset: 0, opacity: o, mixBlendMode: "overlay", pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='${frame % 11}'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.45'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      backgroundPosition: `${(frame * 37) % 300}px ${(frame * 71) % 300}px`,
    }}
  />
);
