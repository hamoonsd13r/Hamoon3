// Inside App · effect «/glass-stat»: a smoked liquid-glass card rises over the shot with a live number and a graph
// that draws itself. The «shot» here is a code-drawn night plate (bokeh, haze, grain); pass `plate` to put the card
// over your own footage instead. The number starts from a real value (never from 0).
import React from "react";
import { BEAT, F, clamp, ease, hash, mix } from "../lib/theme";
import type { FxProps } from "../lib/types";

export type GlassText = { label: string; tag: string; from: number; to: number; unit?: string; delta?: string };

const Plate: React.FC<{ tau: number }> = ({ tau }) => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0A0D1C 0%, #1B1233 55%, #2C1A2E 100%)", overflow: "hidden" }}>
    {Array.from({ length: 34 }, (_, i) => {
      const r = 40 + 150 * hash(i * 3.3);
      const x = 1080 * hash(i * 7.1) + Math.sin(tau * 0.6 + i) * 18;
      const y = 1920 * (0.15 + 0.7 * hash(i * 5.7)) - tau * 22 * (0.4 + hash(i));
      const warm = hash(i * 9.1) > 0.45;
      return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${warm ? "rgba(255,170,90," : "rgba(120,150,255,"}${0.08 + 0.22 * hash(i * 2.2)}) 0%, transparent 68%)` }} />;
    })}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 3px 3px, rgba(255,255,255,.05) 1px, transparent 1.6px)", backgroundSize: "7px 7px" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 50% 45%, transparent 45%, rgba(0,0,0,.6) 100%)" }} />
  </div>
);

const PTS = [0.32, 0.28, 0.4, 0.36, 0.52, 0.47, 0.63, 0.6, 0.78, 0.92];
export const makeGlassStat = (txt: GlassText, plate?: React.FC<{ tau: number }>): React.FC<FxProps> => ({ tau }) => {
  const P = BEAT.P;
  const rise = ease.out(clamp((tau - 0.15) / 0.4));
  const run = ease.inOut(clamp((tau - 0.35) / (P * 1.1)));
  const v = mix(txt.from, txt.to, run);
  const cw = 760, ch = 220;
  const pts = PTS.map((y, i) => [(i / (PTS.length - 1)) * cw, ch - y * ch] as [number, number]);
  const len = pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
  const Bg = plate ?? Plate;
  const hitK = Math.exp(-Math.max(0, tau - P) * 8) * (tau >= P ? 1 : 0);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1.03 + 0.03 * clamp(tau / 2)})` }}>
        <Bg tau={tau} />
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1060 + (1 - rise) * 260, height: 600, opacity: rise, borderRadius: 56, background: "linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.05))", backdropFilter: "blur(26px) saturate(1.5)", WebkitBackdropFilter: "blur(26px) saturate(1.5)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.45), inset 0 0 0 1.5px rgba(255,255,255,.18), 0 40px 120px rgba(0,0,0,.55)", transform: `scale(${1 + 0.02 * hitK})` }}>
        <div style={{ position: "absolute", left: 56, top: 44, fontFamily: F.mono, fontSize: 24, letterSpacing: 5, color: "rgba(255,255,255,.75)" }}>{txt.tag}</div>
        <div dir="rtl" style={{ position: "absolute", right: 56, top: 36, fontFamily: F.vzB, fontSize: 34, color: "rgba(255,255,255,.85)" }}>{txt.label}</div>
        <div style={{ position: "absolute", left: 50, top: 92, display: "flex", alignItems: "baseline", gap: 10, color: "#fff" }}>
          <span style={{ fontFamily: F.ui, fontWeight: 300, fontSize: 170, lineHeight: 1, letterSpacing: -6, fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</span>
          <span style={{ fontFamily: F.ui, fontWeight: 300, fontSize: 70 }}>{txt.unit ?? "%"}</span>
          {txt.delta && <span style={{ marginLeft: 22, padding: "6px 16px", borderRadius: 999, background: "rgba(120,255,190,.16)", color: "#9CF5C8", fontFamily: F.ui, fontWeight: 700, fontSize: 30, opacity: clamp((run - 0.6) / 0.3) }}>▲ {txt.delta}</span>}
        </div>
        <svg width={cw} height={ch} viewBox={`0 0 ${cw} ${ch}`} style={{ position: "absolute", left: 50, top: 320, overflow: "visible" }}>
          <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - run)} />
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={cw} y1={ch * g} y2={ch * g} stroke="rgba(255,255,255,.08)" strokeWidth={2} />)}
        </svg>
      </div>
    </div>
  );
};
