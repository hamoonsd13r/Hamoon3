// Explore Wall · shared pieces (same as Noir Studio): the camera, the word-by-word captions, the kinetic punch words, the "lift-out"
// numbers that rise off a screen toward the lens, and time-anchored video.
import React from "react";
import { OffthreadVideo, Sequence } from "remotion";
import { C, F, FPS, SD, clamp, ease, mix, useT } from "./theme";

// ── camera ────────────────────────────────────────────────────────────────────────────────────────────────────
export type Cam = { x: number; y: number; s: number; rx?: number; ry?: number; rz?: number };
/** a world filmed by the camera: (x, y) of the world sits at the frame centre, scaled by s, tilted in 3D */
export const World: React.FC<{ cam: Cam; children: React.ReactNode; persp?: number; style?: React.CSSProperties }> = ({ cam, children, persp = 2600, style }) => (
  <div style={{ position: "absolute", inset: 0, perspective: persp, perspectiveOrigin: "540px 960px", overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transformStyle: "preserve-3d", transform: `translate(540px,960px) rotateX(${cam.rx ?? 0}deg) rotateY(${cam.ry ?? 0}deg) rotateZ(${cam.rz ?? 0}deg) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)` }}>
      {children}
    </div>
  </div>
);
/** interpolate cameras through keys [time, cam] (eased) */
export const camKF = (t: number, keys: [number, Cam][], e: (u: number) => number = ease.inOut): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, A] = keys[i - 1], [b, B] = keys[i];
      const u = e(b <= a ? 1 : (t - a) / (b - a));
      // scale interpolates in log space so zooms feel even
      return { x: mix(A.x, B.x, u), y: mix(A.y, B.y, u), s: Math.exp(mix(Math.log(A.s), Math.log(B.s), u)), rx: mix(A.rx ?? 0, B.rx ?? 0, u), ry: mix(A.ry ?? 0, B.ry ?? 0, u), rz: mix(A.rz ?? 0, B.rz ?? 0, u) };
    }
  }
  return keys[keys.length - 1][1];
};
/** slow hand-held drift added to any camera (tiny, so screens stay readable) */
export const drift = (cam: Cam, t: number, amt = 1): Cam => ({
  ...cam,
  x: cam.x + amt * 6 * Math.sin(t * 0.53 + 1.1),
  y: cam.y + amt * 5 * Math.sin(t * 0.41 + 2.3),
  rx: (cam.rx ?? 0) + amt * 0.5 * Math.sin(t * 0.37),
  ry: (cam.ry ?? 0) + amt * 0.7 * Math.sin(t * 0.31 + 0.7),
});

// ── captions ──────────────────────────────────────────────────────────────────────────────────────────────────
export type Cap = { a: number; b: number; text: string; key?: string[]; hide?: boolean; at?: number[] };
/** word-by-word captions: each shown word appears on the start of the narration word it matches (by order) */
export const Captions: React.FC<{ t: number; caps: Cap[]; words: { s: number }[]; y?: number }> = ({ t, caps, words: WORDS, y = 1478 }) => {
  const c = caps.find((x) => t >= x.a - 0.05 && t < x.b);
  if (!c || c.hide) return null;
  const spoken = WORDS.filter((w) => w.s >= c.a - 0.08 && w.s < c.b - 0.02);
  const words = c.text.split(" ");
  const fadeOut = 1 - clamp((t - (c.b - 0.1)) / 0.1);
  return (
    <>
    <div style={{ position: "absolute", left: 0, right: 0, top: y - 150, height: 300, background: "linear-gradient(rgba(4,5,6,0), rgba(4,5,6,0.62) 38%, rgba(4,5,6,0.62) 62%, rgba(4,5,6,0))", opacity: fadeOut, pointerEvents: "none" }} />
    <div style={{ position: "absolute", left: 90, right: 90, top: y - 70, height: 150, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.head, fontSize: 64, lineHeight: 1.3, color: C.cream, textShadow: SD, opacity: fadeOut, maxWidth: 900 }}>
        {words.map((w, i) => {
          const at = c.at ? c.at[Math.min(i, c.at.length - 1)] : spoken.length ? spoken[Math.min(i, spoken.length - 1)].s + (i >= spoken.length ? (i - spoken.length + 1) * 0.12 : 0) : c.a + i * 0.15;
          const u = ease.out(clamp((t - at + 0.04) / 0.2));
          const isKey = c.key?.some((k) => w.includes(k));
          const lat = /[A-Za-z0-9]/.test(w);
          return (
            <span key={i} style={{ display: "inline-block", marginLeft: lat ? 14 : 16, marginRight: lat ? 14 : 0, unicodeBidi: "isolate", opacity: u, transform: `translateY(${(1 - u) * 18}px) scale(${isKey ? 1 + 0.08 * ease.outBack(clamp((t - at) / 0.3)) - 0.08 * clamp((t - at - 0.3) / 0.4) : 1})`, filter: u < 1 ? `blur(${(1 - u) * 6}px)` : undefined, color: isKey ? C.accentHi : undefined, fontFamily: lat ? F.ui : undefined, fontWeight: lat ? 800 : undefined, fontSize: lat ? 54 : undefined }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
    </>
  );
};

// ── kinetic punch words ───────────────────────────────────────────────────────────────────────────────────────
/** a big word that slams in (scale + blur), breathes, then leaves; flat type with a soft deep shadow */
export const Punch: React.FC<{
  t: number; a: number; b: number; children: React.ReactNode; x?: number; y?: number; size?: number;
  color?: string; depth?: string; font?: string; rtl?: boolean; from?: "slam" | "rise" | "left" | "right"; tilt?: number; style?: React.CSSProperties;
}> = ({ t, a, b, children, x = 540, y = 760, size = 210, color = C.cream, depth = "#7a2a06", font = F.head, rtl = true, from = "slam", tilt = 0, style }) => {
  if (t < a - 0.02 || t > b + 0.3) return null;
  const u = clamp((t - a) / 0.2), v = clamp((t - b) / 0.22);
  const e = ease.out(u);
  const sc = from === "slam" ? mix(1.45, 1, e) : 1;
  const dx = from === "left" ? (1 - e) * -420 : from === "right" ? (1 - e) * 420 : 0;
  const dy = from === "rise" ? (1 - e) * 140 : 0;
  const life = 1 + 0.035 * clamp((t - a) / Math.max(0.3, b - a));
  return (
    <div style={{ position: "absolute", left: x - 520, top: y - size, width: 1040, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ direction: rtl ? "rtl" : "ltr", fontFamily: font, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap", textShadow: "0 4px 14px rgba(0,0,0,0.45), 0 18px 60px rgba(0,0,0,0.55)", opacity: e * (1 - v), filter: u < 1 || v > 0 ? `blur(${(1 - e) * 14 + v * 10}px)` : undefined, transform: `translate(${dx}px,${dy - v * 40}px) scale(${sc * life * (1 + v * 0.12)}) rotate(${tilt}deg)`, ...style }}>
        {children}
      </div>
    </div>
  );
};

// ── lift-out number ───────────────────────────────────────────────────────────────────────────────────────────
export type Rect = { x: number; y: number; w: number; h: number };
/** a value lifted off a screen: starts at `from` (frame px), flies to (tx, ty), grows, casts a deep shadow and
 *  rolls its counter; `label` sits under it. Leaves (sinks back + fades) at `b`. */
export const Lift: React.FC<{
  t: number; a: number; b: number; from: Rect; tx: number; ty: number; size: number;
  value: (u: number) => string; roll?: [number, number]; label?: React.ReactNode; color?: string; accent?: string;
}> = ({ t, a, b, from, tx, ty, size, value, roll = [a, a + 0.9], label, color = C.cream, accent = C.accent }) => {
  if (t < a || t > b + 0.35) return null;
  const f = ease.inOut(clamp((t - a) / 0.5));
  const leave = ease.in(clamp((t - b) / 0.3));
  const x = mix(from.x + from.w / 2, tx, f), y = mix(from.y + from.h / 2, ty, f);
  const s0 = from.h / (size * 0.8);
  const sc = mix(s0, 1, f) * (1 + 0.03 * Math.sin(clamp((t - a - 0.5) / 2) * Math.PI));
  const r = clamp((t - roll[0]) / (roll[1] - roll[0]));
  return (
    <div style={{ position: "absolute", left: x - 500, top: y - size * 0.6, width: 1000, height: size * 1.6, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", opacity: 1 - leave, transform: `scale(${sc * (1 - 0.2 * leave)})`, transformOrigin: "50% 37.5%" }}>
      <div style={{ fontFamily: F.ui, fontWeight: 850, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.035, color, direction: "ltr", fontVariantNumeric: "tabular-nums", textShadow: `0 ${4 + 30 * f}px ${10 + 50 * f}px rgba(0,0,0,${0.3 + 0.35 * f})` }}>
        {value(ease.out(r))}
      </div>
      {label ? <div style={{ marginTop: size * 0.08, opacity: clamp((t - a - 0.35) / 0.25), transform: `translateY(${(1 - ease.out(clamp((t - a - 0.35) / 0.3))) * 16}px)` }}>{label}</div> : null}
      <div style={{ position: "absolute", top: size * 1.02, width: size * 1.2 * f, height: 5, borderRadius: 3, background: accent, opacity: f * 0.9, left: 500 - size * 0.6 * f }} />
    </div>
  );
};

/** a dark scrim that pulls the eye off a busy screen while a lift-out holds */
export const Scrim: React.FC<{ a: number }> = ({ a }) => (a > 0 ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 50% at 50% 45%, rgba(4,5,6,0.55), rgba(4,5,6,0.82))", opacity: a, pointerEvents: "none" }} /> : null);

/** small glass label (English UI words, tags) */
export const Tag: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({ children, style, color = C.cream }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "rgba(20,22,26,0.72)", border: "1px solid rgba(244,238,230,0.14)", backdropFilter: "blur(10px)", fontFamily: F.ui, fontWeight: 700, fontSize: 30, color, letterSpacing: 0.5, ...style }}>
    {children}
  </div>
);

// ── video that starts at film time t0 (works in the render and in Look stills, where frame ≠ time) ──────────
export const Vid: React.FC<{ src: string; t0: number; style?: React.CSSProperties; from?: number }> = ({ src, t0, style, from = 0 }) => {
  const { t, frame } = useT();
  const local = Math.max(0, Math.round((t - t0) * FPS));
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={src} muted startFrom={Math.round(from * FPS)} style={style} />
    </Sequence>
  );
};
