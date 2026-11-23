// Talk Cutout · devices for the full-screen flows. A phone (393×852 pt screen) and a portrait tablet (834×1194 pt
// screen) drawn at true UI size (the camera scales them); titanium-black bodies with a thin edge light, glass glare
// and a soft floor glow. Put an app screen inside as children.
import React from "react";
import { C, F } from "./theme";

export const PH = { w: 393, h: 852, bez: 13, r: 58 };
export const TB = { w: 834, h: 1194, bez: 22, r: 44 };

type DevP = {
  x: number; y: number; // world centre
  s?: number; // scale
  rx?: number; ry?: number; rz?: number; // tilt (deg)
  glow?: string; // colour of the light pool the screen throws on the floor
  glowA?: number;
  reflect?: number; // tablet only: opacity of its mirror image on the floor
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

const Body: React.FC<{ w: number; h: number; bez: number; r: number; island?: boolean; ry: number; children?: React.ReactNode }> = ({ w, h, bez, r, island, ry, children }) => {
  const W = w + bez * 2, Hh = h + bez * 2;
  const gx = 50 + ry * 2.2; // the edge light slides with the yaw
  return (
    <div style={{ position: "relative", width: W, height: Hh }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: r + bez, background: `linear-gradient(${115 + ry}deg, #3a3d42 0%, #15171a ${gx - 30}%, #0a0b0d ${gx}%, #1c1e22 ${gx + 28}%, #44474d 100%)`, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 50px 90px rgba(0,0,0,0.65), 0 18px 34px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", inset: 2.5, borderRadius: r + bez - 2.5, background: "#050506" }} />
      <div style={{ position: "absolute", left: bez, top: bez, width: w, height: h, borderRadius: r, overflow: "hidden", background: "#000", isolation: "isolate" }}>
        {children}
        {island ? <div style={{ position: "absolute", left: w / 2 - 63, top: 11, width: 126, height: 37, borderRadius: 19, background: "#000", zIndex: 50 }} /> : null}
        <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", background: `linear-gradient(${120 + ry * 0.6}deg, rgba(255,255,255,0) ${30 + ry}%, rgba(255,255,255,0.07) ${44 + ry}%, rgba(255,255,255,0) ${58 + ry}%)` }} />
      </div>
    </div>
  );
};

const place = (p: DevP, w: number, h: number): React.CSSProperties => ({
  position: "absolute", left: p.x - w / 2, top: p.y - h / 2, width: w, height: h,
  transform: `rotateX(${p.rx ?? 0}deg) rotateY(${p.ry ?? 0}deg) rotateZ(${p.rz ?? 0}deg) scale(${p.s ?? 1})`,
  transformStyle: "preserve-3d", ...p.style,
});

const FloorGlow: React.FC<{ w: number; h: number; s: number; color: string; a: number }> = ({ w, h, s, color, a }) =>
  a > 0 ? (
    <div style={{ position: "absolute", left: w / 2 - w * 0.75, top: h / 2 + (h / 2) * s * 0.92, width: w * 1.5, height: w * 0.42, borderRadius: "50%", background: `radial-gradient(closest-side, ${color}, transparent)`, opacity: a, filter: "blur(30px)", transform: `scale(${s})`, pointerEvents: "none" }} />
  ) : null;

export const Phone: React.FC<DevP> = (p) => {
  const w = PH.w + PH.bez * 2, h = PH.h + PH.bez * 2;
  return (
    <>
      <div style={{ position: "absolute", left: p.x - w / 2, top: p.y - h / 2, width: w, height: h, pointerEvents: "none" }}>
        <FloorGlow w={w} h={h} s={p.s ?? 1} color={p.glow ?? C.accent} a={p.glowA ?? 0} />
      </div>
      <div style={place(p, w, h)}>
        <Body w={PH.w} h={PH.h} bez={PH.bez} r={PH.r} island ry={p.ry ?? 0}>
          {p.children}
        </Body>
      </div>
    </>
  );
};

export const Tablet: React.FC<DevP> = (p) => {
  const w = TB.w + TB.bez * 2, h = TB.h + TB.bez * 2;
  return (
    <>
      <div style={{ position: "absolute", left: p.x - w / 2, top: p.y - h / 2, width: w, height: h, pointerEvents: "none" }}>
        <FloorGlow w={w} h={h} s={p.s ?? 1} color={p.glow ?? C.accent} a={p.glowA ?? 0} />
      </div>
      <div style={place(p, w, h)}>
        <Body w={TB.w} h={TB.h} bez={TB.bez} r={TB.r} ry={p.ry ?? 0}>
          {p.children}
        </Body>
        {p.reflect ? (
          <div style={{ position: "absolute", left: 0, top: h + 8, width: w, height: h, transform: "scaleY(-1)", opacity: p.reflect, filter: "blur(2px)", WebkitMaskImage: "linear-gradient(to bottom, transparent 64%, black 100%)", maskImage: "linear-gradient(to bottom, transparent 64%, black 100%)", pointerEvents: "none" }}>
            <Body w={TB.w} h={TB.h} bez={TB.bez} r={TB.r} ry={p.ry ?? 0}>
              {p.children}
            </Body>
          </div>
        ) : null}
      </div>
    </>
  );
};

/** iOS-style status bar (time, signal, wifi, battery) — the generic one, never a recording of a real phone's */
export const StatusBar: React.FC<{ w?: number; color?: string; time?: string }> = ({ w = PH.w, color = "#fff", time = "9:41" }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 54, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 34px 0 46px", boxSizing: "border-box", fontFamily: F.ui, fontWeight: 600, fontSize: 17, color, direction: "ltr" }}>
    <span>{time}</span>
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <svg width={18} height={12} viewBox="0 0 18 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.8} y={9 - i * 3} width={3.2} height={3 + i * 3} rx={0.8} fill={color} />
        ))}
      </svg>
      <svg width={16} height={12} viewBox="0 0 16 12">
        <path d="M8 11.5l2.4-2.6a3.4 3.4 0 0 0-4.8 0zM3.2 6.4a6.8 6.8 0 0 1 9.6 0l1.5-1.6a9 9 0 0 0-12.6 0zM.4 3.4a10.8 10.8 0 0 1 15.2 0L16 3" fill={color} />
      </svg>
      <span style={{ display: "inline-block", width: 25, height: 12, borderRadius: 3.5, border: `1.3px solid ${color}`, opacity: 0.95, position: "relative", boxSizing: "border-box" }}>
        <span style={{ position: "absolute", left: 1.5, top: 1.5, width: 17, height: 6.5, borderRadius: 1.5, background: color }} />
      </span>
    </span>
  </div>
);

/** a tap ring at screen pt (x, y): u 0 → 1 over ~0.35 s */
export const Tap: React.FC<{ x: number; y: number; u: number }> = ({ x, y, u }) =>
  u > 0 && u < 1 ? <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.35)", transform: `scale(${0.4 + 1.2 * (1 - Math.pow(1 - u, 3))})`, opacity: 1 - u, zIndex: 40 }} /> : null;
