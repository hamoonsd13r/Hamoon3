// Painted Story · atmosphere drawn by code over the painted pictures (no video, no AI motion):
// fog, drips, glows (plate px, inside a World) · rain, shower streaks, steam, static, TV lines, peephole, night,
// lamp-off, radio wave, CCTV HUD, grain, vignette (frame px). All pure functions of t.
import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { F } from "./fonts";
import { clamp, ease, hash, mix, noise1, pulseAt, ramp } from "./time";
import { useTheme } from "./theme";

// ── inside a World (plate px) ─────────────────────────────────────────────────────────────────────────────────
/** condensation on a visor / window: soft white blooms that thicken with `a` and breathe */
export const Fog: React.FC<{ t: number; x: number; y: number; r: number; a: number; seed?: number }> = ({ t, x, y, r, a, seed = 1 }) => {
  if (a <= 0) return null;
  const blobs: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const ang = hash(i * 3.1 + seed) * Math.PI * 2, d = Math.sqrt(hash(i * 7.3 + seed)) * r * 0.62;
    const br = r * (0.35 + hash(i * 1.7 + seed) * 0.35) * (1 + 0.06 * noise1(t * 0.7 + i, seed));
    const bx = x + Math.cos(ang) * d + noise1(t * 0.25 + i * 3, seed + 5) * r * 0.05, by = y + Math.sin(ang) * d;
    blobs.push(<div key={i} style={{ position: "absolute", left: bx - br, top: by - br, width: br * 2, height: br * 2, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,242,238,0.5) 0%, rgba(236,242,238,0.22) 45%, rgba(236,242,238,0) 70%)" }} />);
  }
  return <div style={{ position: "absolute", inset: 0, opacity: clamp(a) * 0.8, filter: "blur(14px)", mixBlendMode: "screen" }}>{blobs}</div>;
};
/** a water drop running down glass, leaving a thin clear trail */
export const Drip: React.FC<{ t: number; t0: number; x: number; y: number; len: number; dur?: number }> = ({ t, t0, x, y, len, dur = 1.6 }) => {
  const u = ease.in(ramp(t, t0, t0 + dur)) * 0.55 + ramp(t, t0, t0 + dur) * 0.45;
  if (u <= 0) return null;
  const yy = y + len * u, wob = Math.sin(u * 9) * 3;
  return (
    <svg width={4} height={4} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M ${x} ${y} Q ${x + 4} ${(y + yy) / 2} ${x + wob} ${yy}`} stroke="rgba(255,255,255,0.35)" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={x + wob} cy={yy} r={7} fill="rgba(255,255,255,0.75)" />
      <circle cx={x + wob - 2} cy={yy - 2} r={2.5} fill="rgba(255,255,255,0.95)" />
    </svg>
  );
};
/** a soft coloured light (screen blend): a speaker that glows while someone talks, a vent, a lamp */
export const Glow: React.FC<{ x: number; y: number; r: number; a: number; color?: string; sx?: number }> = ({ x, y, r, a, color, sx = 1 }) => {
  const th = useTheme();
  const c = color ?? th.accent;
  return a <= 0 ? null : (
    <div style={{ position: "absolute", left: x - r * sx, top: y - r, width: r * 2 * sx, height: r * 2, borderRadius: "50%", background: `radial-gradient(closest-side, ${c} 0%, ${c}88 35%, transparent 100%)`, opacity: clamp(a), mixBlendMode: "screen" }} />
  );
};

// ── frame px ──────────────────────────────────────────────────────────────────────────────────────────────────
/** slanted rain over the whole frame */
export const Rain: React.FC<{ t: number; a?: number; n?: number }> = ({ t, a = 0.8, n = 140 }) => {
  const { width: W, height: H } = useVideoConfig();
  const drops: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const sp = 1.1 + hash(i * 3.1) * 0.9; // screens per second
    const y = ((hash(i * 7.7) + t * sp) % 1.2) - 0.1;
    const x = hash(i * 1.3) * 1.1 - 0.05 + y * 0.08;
    const len = 30 + hash(i * 5.9) * 50;
    drops.push(<line key={i} x1={x * W} y1={y * H} x2={x * W - len * 0.18} y2={y * H + len} stroke="rgba(220,232,240,0.35)" strokeWidth={1.2 + hash(i) * 1.2} strokeLinecap="round" />);
  }
  return <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: a, pointerEvents: "none" }}>{drops}</svg>;
};
/** falling shower water, near-vertical and thicker */
export const Streaks: React.FC<{ t: number; a: number; n?: number }> = ({ t, a, n = 90 }) => {
  const { width: W, height: H } = useVideoConfig();
  if (a <= 0) return null;
  const ls: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const sp = 1.6 + hash(i * 3.1) * 1.2;
    const y = ((hash(i * 7.7) + t * sp) % 1.3) - 0.15;
    const x = hash(i * 1.3) * 1.1 - 0.05;
    const len = 60 + hash(i * 5.9) * 120;
    ls.push(<line key={i} x1={x * W} y1={y * H} x2={x * W + 6} y2={y * H + len} stroke={`rgba(235,244,240,${0.18 + hash(i * 2.2) * 0.25})`} strokeWidth={1.5 + hash(i) * 2.5} strokeLinecap="round" />);
  }
  return <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: a, filter: "blur(0.6px)", pointerEvents: "none" }}>{ls}</svg>;
};
/** steam / mist: big soft drifting clouds */
export const Steam: React.FC<{ t: number; a: number; seed?: number; tint?: string; y0?: number; y1?: number }> = ({ t, a, seed = 1, tint = "230,238,234", y0 = 0, y1 = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  if (a <= 0) return null;
  const bs: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const r = (260 + hash(i * 4.1 + seed) * 320) * (W / 1080);
    const x = ((hash(i * 2.7 + seed) + t * (0.012 + hash(i + seed) * 0.02)) % 1.4 - 0.2) * W;
    const y = (y0 + (y1 - y0) * hash(i * 6.3 + seed)) * H - t * 6 * (0.5 + hash(i * 9 + seed));
    bs.push(<div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(${tint},0.5), rgba(${tint},0))` }} />);
  }
  return <div style={{ position: "absolute", inset: 0, opacity: clamp(a), pointerEvents: "none" }}>{bs}</div>;
};
/** emergency-light flicker: 1 = steady, dips on a broken 24 fps rhythm. Use as `dim={1 - flicker(t)}` */
export const flicker = (t: number, seed = 3) => {
  const f = Math.floor(t * 24);
  const n = hash(f * 1.37 + seed);
  const slow = 0.92 + 0.08 * noise1(t * 1.3, seed);
  return n > 0.93 ? 0.55 : n > 0.88 ? 0.8 : slow;
};
/** radio / TV static: grain + a few bright horizontal bands, re-rolled 24× a second */
export const Static: React.FC<{ t: number; a?: number }> = ({ t, a = 0.7 }) => {
  const { width: W, height: H } = useVideoConfig();
  const f = Math.floor(t * 24);
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const y = hash(f * 3 + i) * H, h = 2 + hash(f * 5 + i) * 6;
    bands.push(<rect key={i} x={0} y={y} width={W} height={h} fill={`rgba(255,255,255,${0.04 + hash(f + i) * 0.05})`} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, pointerEvents: "none" }}>
      <Grain t={t} a={0.07} size={200} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{bands}</svg>
    </div>
  );
};
/** TV scan lines (a news clip on a screen) */
export const TV: React.FC = () => <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 5px)", mixBlendMode: "multiply", pointerEvents: "none" }} />;
/** through a door peephole */
export const Peep: React.FC = () => <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, transparent 38%, rgba(0,0,0,0.35) 52%, rgba(0,0,0,0.85) 70%)", pointerEvents: "none" }} />;
/** night: a dark blue vignette over a day still */
export const Night: React.FC = () => {
  const th = useTheme();
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 100% at 50% 50%, transparent 40%, ${th.night} 100%)`, pointerEvents: "none" }} />;
};
/** the room drops into blue dark at time `at` (a word: «تاریکی») */
export const LampOff: React.FC<{ t: number; at: number; dur?: number }> = ({ t, at, dur = 0.5 }) => {
  const u = ease.inOut(ramp(t, at, at + dur));
  return <div style={{ position: "absolute", inset: 0, background: "rgba(8,14,40,0.62)", opacity: u, mixBlendMode: "multiply", pointerEvents: "none" }} />;
};
/** a live radio waveform across the bottom (below a quote at y 850); spikes on the knocks */
export const RadioWave: React.FC<{ t: number; knocks?: number[]; y?: number; w?: number }> = ({ t, knocks = [], y, w = 980 }) => {
  const { width: W, height: H } = useVideoConfig();
  const N = 96, x0 = (W - w) / 2;
  y = y ?? H - 92;
  const kn = pulseAt(t, knocks);
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const env = Math.sin(Math.PI * u);
    const a = (14 + 26 * Math.abs(noise1(t * 3.1, 5))) * (1 + kn * 2.4);
    pts.push(`${(x0 + u * w).toFixed(1)},${(y + env * a * noise1(i * 0.42 + t * 9.5, 13)).toFixed(1)}`);
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <polyline points={pts.join(" ")} fill="none" stroke="rgba(255,236,210,0.8)" strokeWidth={2.2} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(255,200,140,0.7))" }} />
    </svg>
  );
};
/** security-camera HUD: camera name, blinking REC, a running clock from `clock0` (seconds of day) at t0 */
export const CCTV: React.FC<{ t: number; t0: number; cam?: string; tag?: string; clock0?: number }> = ({ t, t0, cam = "CAM 04 · CORRIDOR", tag = "DAY 02", clock0 = 3 * 3600 + 17 * 60 + 40 }) => {
  const sec = clock0 + Math.floor(Math.max(0, t - t0));
  const p = (n: number) => String(n).padStart(2, "0");
  const lab: React.CSSProperties = { position: "absolute", fontFamily: F.num, fontSize: 34, letterSpacing: 2, color: "rgba(225,255,225,0.9)", textShadow: "0 0 6px rgba(120,255,140,0.6)", direction: "ltr" };
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 4px)" }} />
      <div style={{ ...lab, left: 70, top: 56 }}>{cam}</div>
      <div style={{ ...lab, right: 70, top: 56, color: "#ff5a4f", textShadow: "0 0 6px rgba(255,80,60,0.6)", opacity: Math.floor(t * 1.6) % 2 ? 0.25 : 1 }}>● REC</div>
      <div style={{ ...lab, left: 70, bottom: 56 }}>{tag}</div>
      <div style={{ ...lab, right: 70, bottom: 56 }}>{p(Math.floor(sec / 3600) % 24)}:{p(Math.floor(sec / 60) % 60)}:{p(sec % 60)}</div>
    </>
  );
};

/** full-frame grain, overlay-blended, re-rolled at 24 fps */
export const Grain: React.FC<{ t: number; a?: number; size?: number }> = ({ t, a = 0.05, size = 256 }) => {
  const url = useMemo(() => {
    if (typeof document === "undefined") return "";
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d")!;
    const im = x.createImageData(size, size);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(hash(i * 0.37 + 1) * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL();
  }, [size]);
  const f = Math.floor(t * 24);
  return (
    <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${url})`, backgroundSize: `${size * 1.6}px`, backgroundPosition: `${Math.floor(hash(f) * 400)}px ${Math.floor(hash(f + 9) * 400)}px`, opacity: a, mixBlendMode: "overlay", pointerEvents: "none" }} />
  );
};
/** soft edge darkening */
export const Vignette: React.FC<{ a?: number; color?: string; shape?: string }> = ({ a = 0.42, color = "0,0,0", shape = "125% 100% at 50% 50%" }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(${shape}, transparent 56%, rgba(${color},${a}) 100%)`, pointerEvents: "none" }} />
);
/** a breathing light level (0.6..1): use for lights that "breathe" with a voice or in the dark */
export const breathe = (t: number, rate = 2.3, lo = 0.6) => mix(lo, 1, 0.5 + 0.5 * Math.sin(t * rate));
