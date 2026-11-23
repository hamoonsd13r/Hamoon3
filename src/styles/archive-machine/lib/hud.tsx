// Archive Machine · the machine's eye: thin cyan HUD (brackets, face locks, typed labels, casualty counters, scan bars,
// data columns), the archive clip with its grade, glitch slices, and time-anchored video. Pure functions of t.
import React from "react";
import { Img, OffthreadVideo, Sequence } from "remotion";
import { C, F, FPS, clamp, ease, hash, mix, useT } from "./theme";

// ── video that starts at film time t0 (render and Look stills alike) ────────────────────────────────────────────
export const Vid: React.FC<{ src: string; t0: number; from?: number; rate?: number; style?: React.CSSProperties }> = ({ src, t0, from = 0, rate = 1, style }) => {
  if (/\.(jpe?g|png|webp)$/i.test(src)) return <Img src={src} style={style} />; // a still plays as an image
  const { t, frame } = useT();
  const local = Math.max(0, Math.round((t - t0) * FPS));
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={src} muted startFrom={Math.round(from * FPS)} playbackRate={rate} style={style} />
    </Sequence>
  );
};

/** grades: archive B&W as the machine sees it (cold, lifted), colour archive bleached toward teal, the body warm */
export const GRADE = {
  data: "grayscale(1) sepia(0.55) hue-rotate(150deg) saturate(1.6) brightness(0.95) contrast(1.18)",
  cold: "grayscale(1) sepia(0.35) hue-rotate(160deg) saturate(1.1) contrast(1.25) brightness(0.9)",
  bleach: "saturate(0.55) contrast(1.2) brightness(1.02) sepia(0.15) hue-rotate(-8deg)",
  war: "saturate(0.7) contrast(1.28) brightness(0.92) sepia(0.25)",
  body: "grayscale(1) sepia(0.45) hue-rotate(-12deg) saturate(1.3) contrast(1.3) brightness(0.85)",
  warm: "grayscale(1) sepia(0.8) saturate(1.6) hue-rotate(-14deg) contrast(1.25) brightness(0.92)",
};

/** a full-frame archive shot: cover-fit, slow push, grade, optional horizontal crop window for 4:3 sources */
export const Shot: React.FC<{
  src: string; t0: number; a: number; b: number; from?: number; rate?: number; grade?: string;
  push?: [number, number]; pan?: [number, number, number, number]; focus?: [number, number]; still?: boolean; style?: React.CSSProperties;
}> = ({ src, t0, a, b, from = 0, rate = 1, grade = GRADE.bleach, push = [1.04, 1.12], pan = [0, 0, 0, 0], focus = [50, 50], still, style }) => {
  const { t } = useT();
  const u = clamp((t - a) / Math.max(0.01, b - a));
  const s = mix(push[0], push[1], ease.inOut(u));
  const x = mix(pan[0], pan[2], ease.inOut(u)), y = mix(pan[1], pan[3], ease.inOut(u));
  const box: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focus[0]}% ${focus[1]}%`, filter: grade, transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: `${focus[0]}% ${focus[1]}%`, ...style };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      {still ? <Img src={src} style={box} /> : <Vid src={src} t0={t0} from={from} rate={rate} style={box} />}
    </div>
  );
};

// ── HUD primitives ──────────────────────────────────────────────────────────────────────────────────────────────
/** corner brackets around a rect, drawing in over 0.25 s */
export const Brackets: React.FC<{ x: number; y: number; w: number; h: number; a: number; color?: string; len?: number; sw?: number }> = ({ x, y, w, h, a, color = C.cyan, len = 34, sw = 2 }) => {
  const { t } = useT();
  const u = ease.out(clamp((t - a) / 0.25));
  if (u <= 0) return null;
  const L = len * u;
  const d = `M${x} ${y + L}V${y}H${x + L} M${x + w - L} ${y}H${x + w}V${y + L} M${x + w} ${y + h - L}V${y + h}H${x + w - L} M${x + L} ${y + h}H${x}V${y + h - L}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={sw} opacity={0.9} />
    </svg>
  );
};

/** typed label: characters appear over `d` seconds, a block cursor while typing */
export const Label: React.FC<{ x: number; y: number; text: string; a: number; d?: number; size?: number; color?: string; bold?: boolean; align?: "left" | "right"; box?: boolean; out?: number }> = ({ x, y, text, a, d = 0.45, size = 20, color = C.cyan, bold, align = "left", box, out }) => {
  const { t } = useT();
  if (t < a || (out !== undefined && t > out)) return null;
  const n = Math.ceil(text.length * clamp((t - a) / d));
  const typing = n < text.length;
  const fade = out !== undefined ? 1 - clamp((t - (out - 0.12)) / 0.12) : 1;
  return (
    <div style={{ position: "absolute", left: align === "left" ? x : undefined, right: align === "right" ? 1920 - x : undefined, top: y, fontFamily: bold ? F.hudB : F.hud, fontSize: size, letterSpacing: size * 0.12, color, whiteSpace: "pre", opacity: fade, textShadow: `0 0 12px ${color}66`, padding: box ? "4px 10px" : undefined, background: box ? "rgba(2,10,12,0.55)" : undefined, border: box ? `1px solid ${C.cyanFaint}` : undefined }}>
      {text.slice(0, n)}
      {typing ? <span style={{ display: "inline-block", width: size * 0.55, height: size * 0.9, background: color, marginLeft: 2, verticalAlign: -2 }} /> : null}
    </div>
  );
};

/** face lock: a square that snaps from wide to the face, ticks, a jittering crosshair */
export const Lock: React.FC<{ cx: number; cy: number; r: number; a: number; out?: number; color?: string; label?: string; sub?: string }> = ({ cx, cy, r, a, out, color = C.cyan, label, sub }) => {
  const { t } = useT();
  if (t < a || (out !== undefined && t > out)) return null;
  const u = ease.out(clamp((t - a) / 0.3));
  const rr = mix(r * 2.4, r, u);
  const jx = 3 * Math.sin(t * 23 + cx), jy = 3 * Math.cos(t * 19 + cy);
  const blink = Math.floor((t - a) * 8) % 2 === 0 || u >= 1;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <g transform={`translate(${cx + jx} ${cy + jy})`} stroke={color} fill="none" strokeWidth={2} opacity={blink ? 0.95 : 0.4}>
          <rect x={-rr} y={-rr} width={rr * 2} height={rr * 2} strokeDasharray={`${rr * 0.5} ${rr * 1}`} />
          <path d={`M${-rr - 14} 0H${-rr + 10} M${rr - 10} 0H${rr + 14} M0 ${-rr - 14}V${-rr + 10} M0 ${rr - 10}V${rr + 14}`} />
          <circle r={6} />
        </g>
      </svg>
      {label ? <Label x={cx + r + 22} y={cy - r} text={label} a={a + 0.2} size={20} color={color} bold /> : null}
      {sub ? <Label x={cx + r + 22} y={cy - r + 30} text={sub} a={a + 0.4} size={16} color={C.cyanDim} /> : null}
    </>
  );
};

/** rolling counter («58,348,410 CASUALTIES») */
export const Counter: React.FC<{ x: number; y: number; to: number; a: number; d?: number; label: string; color?: string; size?: number; out?: number }> = ({ x, y, to, a, d = 0.8, label, color = C.white, size = 64, out }) => {
  const { t } = useT();
  if (t < a || (out !== undefined && t > out)) return null;
  const u = ease.out(clamp((t - a) / d));
  const v = Math.round(to * u + (u < 1 ? hash(Math.floor(t * 30)) * to * 0.02 : 0));
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: F.hudB, color, textShadow: "0 0 18px rgba(127,233,244,0.35)" }}>
      <div style={{ fontSize: size, letterSpacing: 4, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v.toLocaleString("en-US")}</div>
      <div style={{ fontFamily: F.hud, fontSize: size * 0.3, letterSpacing: size * 0.08, color: C.cyan, marginTop: 6 }}>{label}</div>
    </div>
  );
};

/** a scan bar sweeping down a rect */
export const Scan: React.FC<{ x: number; y: number; w: number; h: number; a: number; d?: number }> = ({ x, y, w, h, a, d = 0.7 }) => {
  const { t } = useT();
  const u = (t - a) / d;
  if (u < 0 || u > 1) return null;
  return <div style={{ position: "absolute", left: x, top: y + h * u - 2, width: w, height: 3, background: C.cyan, boxShadow: `0 0 20px ${C.cyan}`, opacity: 0.85 }} />;
};

/** columns of hex digits streaming down the frame edges */
export const DataRain: React.FC<{ a: number; b: number; cols?: number[]; color?: string; op?: number }> = ({ a, b, cols = [40, 90, 1790, 1850], color = C.cyan, op = 0.35 }) => {
  const { t } = useT();
  if (t < a || t > b) return null;
  const fade = Math.min(clamp((t - a) / 0.2), 1 - clamp((t - (b - 0.2)) / 0.2));
  return (
    <>
      {cols.map((cx, k) => {
        const rows = Array.from({ length: 30 }, (_, i) => {
          const n = Math.floor(hash(k * 97 + i * 13 + Math.floor(t * 12 + k)) * 65535);
          return n.toString(16).toUpperCase().padStart(4, "0");
        });
        return (
          <div key={k} style={{ position: "absolute", left: cx, top: -((t * 140 + k * 60) % 40), fontFamily: F.hud, fontSize: 15, lineHeight: "36px", color, opacity: op * fade, whiteSpace: "pre" }}>
            {rows.join("\n")}
          </div>
        );
      })}
    </>
  );
};

/** fine grid + scanlines that read as "a screen the machine looks through" */
export const ScreenTex: React.FC<{ op?: number }> = ({ op = 1 }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: op, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px), linear-gradient(90deg, rgba(127,233,244,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(127,233,244,0.05) 1px, transparent 1px)", backgroundSize: "auto, 64px 64px, 64px 64px" }} />
);

/** glitch: horizontal slices shifted + an RGB-split copy; amount 0..1 */
export const Glitch: React.FC<{ amt: number; seed: number; children: React.ReactNode }> = ({ amt, seed, children }) => {
  if (amt <= 0.01) return <>{children}</>;
  const slices = Array.from({ length: 7 }, (_, i) => {
    const y0 = hash(seed * 3.1 + i) * 1080, h = 18 + hash(seed + i * 7) * 90;
    return { y0, h, dx: (hash(seed * 1.7 + i * 5) - 0.5) * 160 * amt };
  });
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-8 * amt}px)`, filter: "drop-shadow(6px 0 0 rgba(255,40,80,0.55)) drop-shadow(-6px 0 0 rgba(40,220,255,0.55))" }}>{children}</div>
      {slices.map((s, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${s.y0}px 0 ${Math.max(0, 1080 - s.y0 - s.h)}px 0)`, transform: `translateX(${s.dx}px)` }}>{children}</div>
      ))}
    </div>
  );
};
