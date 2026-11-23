// 09 · Glassmorphism — a neon-lit marble bust among glass shapes, pushing in slowly; frosted glass cards float up over
// it and blur what is behind them; saturated light drifts under the glass.
import React from "react";
import { Img } from "remotion";
import { F, PW, ease, mix, ramp, tween } from "../theme";
import { Frame, Grain, img, type PosterProps } from "../kit";

const ORBS: { c: string; r: number; x: number; y: number; ax: number; ay: number; ph: number }[] = [
  { c: "#FF3D8B", r: 210, x: 560, y: 900, ax: 90, ay: 60, ph: 0 },
  { c: "#3D6BFF", r: 230, x: 150, y: 1080, ax: 90, ay: 50, ph: 3.1 },
  { c: "#7C4DFF", r: 170, x: 600, y: 300, ax: 60, ay: 70, ph: 1.7 },
];

const glass = (r: number): React.CSSProperties => ({
  position: "absolute",
  borderRadius: r,
  background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
  backdropFilter: "blur(26px) saturate(150%)",
  WebkitBackdropFilter: "blur(26px) saturate(150%)",
  border: "1.5px solid rgba(255,255,255,0.38)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.45)",
  overflow: "hidden",
});


/** a card that floats in from depth, then bobs */
const float = (t: number, at: number, ph: number, dy = 120): React.CSSProperties => {
  const u = tween(t, at, at + 0.4, (x) => ease.outBack(x, 1.2));
  return { transform: `perspective(1200px) translateY(${(1 - u) * dy + Math.sin(t * 2 + ph) * 6}px) rotateX(${(1 - u) * 28}deg) scale(${mix(0.86, 1, u)})`, opacity: ramp(t, at, at + 0.15) };
};

export const Glass: React.FC<PosterProps> = ({ t }) => {
  const prog = 0.18 + 0.6 * tween(t, 0.3, 2.6, (u) => u);
  const on = tween(t, 0.62, 0.8, ease.out);
  const push = mix(1.12, 1.02, ease.out(ramp(t, 0, 3.2)));
  return (
    <Frame bg="#07060C">
      <Img src={img("GLS-01")} style={{ position: "absolute", left: 0, top: -5, width: PW, height: 1290, maxWidth: "none", transform: `scale(${push}) translateY(${Math.sin(t * 1.1) * 4}px)`, transformOrigin: "40% 32%" }} />
      {ORBS.map((o, i) => (
        <div key={i} style={{ position: "absolute", left: o.x + Math.sin(t * 1.3 + o.ph) * o.ax - o.r, top: o.y + Math.cos(t * 1.1 + o.ph) * o.ay - o.r, width: o.r * 2, height: o.r * 2, borderRadius: "50%", background: o.c, filter: "blur(50px)", opacity: 0.55, mixBlendMode: "screen" }} />
      ))}
      {/* status chip */}
      <div style={{ ...glass(32), left: 40, top: 60, width: 300, height: 64, ...float(t, 0.1, 0.5, 60) }}>
        <div style={{ position: "absolute", left: 24, top: 23, width: 18, height: 18, borderRadius: 9, background: "#FF8A2E", boxShadow: "0 0 14px #FF8A2E" }} />
        <div style={{ position: "absolute", left: 56, top: 16, fontFamily: F.inter, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.92)" }}>Frosted layer 0{1 + (Math.floor(t * 1.2) % 3)}</div>
      </div>
      <div style={{ ...glass(30), left: 520, top: 60, width: 160, height: 64, ...float(t, 0.16, 1.4, 60) }}>
        <div style={{ position: "absolute", left: 0, top: 18, width: 160, textAlign: "center", fontFamily: F.inter, fontWeight: 600, fontSize: 20, letterSpacing: "0.2em", color: "rgba(255,255,255,0.88)" }}>BLUR 26</div>
      </div>
      {/* main card, over the bust: everything behind it frosts */}
      <div style={{ ...glass(46), left: 60, top: 720, width: 600, height: 300, ...float(t, 0, 0) }}>
        <div style={{ position: "absolute", left: 44, top: 40, fontFamily: F.syne, fontWeight: 800, fontSize: 116, lineHeight: 0.9, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)" }}>Glass</div>
        <div style={{ position: "absolute", left: 50, top: 168, fontFamily: F.instrumentI, fontSize: 82, lineHeight: 1, color: "rgba(255,255,255,0.86)" }}>morphism</div>
        <div style={{ position: "absolute", right: 40, top: 44, width: 64, height: 64, borderRadius: 32, border: "1.5px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.85)", transform: `scale(${0.8 + 0.2 * Math.sin(t * 6)})` }} />
        </div>
      </div>
      {/* player row */}
      <div style={{ ...glass(36), left: 60, top: 1046, width: 400, height: 120, ...float(t, 0.16, 1.2) }}>
        <div style={{ position: "absolute", left: 20, top: 20, width: 80, height: 80, borderRadius: 22, background: "linear-gradient(140deg, #FF3D8B, #7C4DFF 60%, #3D6BFF)" }} />
        <div style={{ position: "absolute", left: 118, top: 22, fontFamily: F.inter, fontWeight: 700, fontSize: 24, color: "#fff" }}>Frosted Light</div>
        <div style={{ position: "absolute", left: 118, top: 54, fontFamily: F.inter, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.7)" }}>Aurora Haze · 3:42</div>
        <div style={{ position: "absolute", left: 118, top: 88, width: 250, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)" }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 3, background: "#fff" }} />
        </div>
      </div>
      {/* toggle */}
      <div style={{ ...glass(42), left: 492, top: 1064, width: 168, height: 84, ...float(t, 0.24, 2.1) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 42, background: `rgba(255,61,139,${0.55 * on})` }} />
        <div style={{ position: "absolute", top: 10, left: mix(10, 94, on), width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.95)", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 1200, width: PW, textAlign: "center", fontFamily: F.inter, fontWeight: 600, fontSize: 17, letterSpacing: "0.6em", color: "rgba(255,255,255,0.6)", opacity: tween(t, 0.4, 0.8) }}>
        GLASSMORPHISM
      </div>
      <Grain t={t} amt={0.07} />
    </Frame>
  );
};
