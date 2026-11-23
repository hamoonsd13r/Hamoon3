// Verdict Noir · the film kit: a camera that films a «world» (a desk, a wall) in 3D, word-by-word captions with red
// key words, kinetic punch words, lift-out numbers, a stopwatch, choice pills, a whip-pan blur, film grain and the
// scene stack (each scene draws itself while a ≤ t < b and handles its own entrance/exit).
import React from "react";
import { C, F, SD, clamp, ease, mix } from "./theme";
import type { Word } from "./words";

// ── camera ────────────────────────────────────────────────────────────────────────────────────────────────────
export type Cam = { x: number; y: number; s: number; rx?: number; ry?: number; rz?: number };
/** a world filmed by the camera: world point (x, y) sits at the frame centre, scaled by s, tilted in 3D */
export const World: React.FC<{ cam: Cam; children: React.ReactNode; persp?: number; style?: React.CSSProperties }> = ({ cam, children, persp = 2600, style }) => (
  <div style={{ position: "absolute", inset: 0, perspective: persp, perspectiveOrigin: "540px 960px", overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transformStyle: "preserve-3d", transform: `translate(540px,960px) rotateX(${cam.rx ?? 0}deg) rotateY(${cam.ry ?? 0}deg) rotateZ(${cam.rz ?? 0}deg) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)` }}>
      {children}
    </div>
  </div>
);
/** cameras through keys [time, cam] (eased; zoom in log space so it feels even) */
export const camKF = (t: number, keys: [number, Cam][], e: (u: number) => number = ease.inOut): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, A] = keys[i - 1], [b, B] = keys[i];
      const u = e(b <= a ? 1 : (t - a) / (b - a));
      return { x: mix(A.x, B.x, u), y: mix(A.y, B.y, u), s: Math.exp(mix(Math.log(A.s), Math.log(B.s), u)), rx: mix(A.rx ?? 0, B.rx ?? 0, u), ry: mix(A.ry ?? 0, B.ry ?? 0, u), rz: mix(A.rz ?? 0, B.rz ?? 0, u) };
    }
  }
  return keys[keys.length - 1][1];
};
/** a slow hand-held drift on any camera (tiny, so paper stays readable) */
export const drift = (cam: Cam, t: number, amt = 1): Cam => ({
  ...cam,
  x: cam.x + amt * 6 * Math.sin(t * 0.53 + 1.1),
  y: cam.y + amt * 5 * Math.sin(t * 0.41 + 2.3),
  rx: (cam.rx ?? 0) + amt * 0.5 * Math.sin(t * 0.37),
  ry: (cam.ry ?? 0) + amt * 0.7 * Math.sin(t * 0.31 + 0.7),
});

// ── captions ──────────────────────────────────────────────────────────────────────────────────────────────────
export type Cap = { a: number; b: number; text: string; key?: string[]; hide?: boolean };
/** caption cards from the narration: ≤ max letters, break after punctuation (2+ words); KEY words go red */
export const makeCaps = (words: Word[], key: string[] = [], max = 26): Cap[] => {
  const caps: Cap[] = [];
  const punctEnd = (w: string) => /[،؛.!؟,:]$/.test(w);
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const ws = words.filter((w) => w.si === si);
    let cur: Word[] = [];
    const flush = () => {
      if (cur.length) caps.push({ a: cur[0].s - 0.05, b: 0, text: cur.map((w) => w.w).join(" "), key: key.filter((k) => cur.some((w) => w.w.includes(k))) });
      cur = [];
    };
    for (const w of ws) {
      if (cur.length && cur.map((x) => x.w).join(" ").length + w.w.length + 1 > max) flush();
      cur.push(w);
      if (punctEnd(w.w) && cur.length >= 2) flush();
    }
    flush();
  }
  for (let i = 0; i < caps.length; i++) {
    const next = caps[i + 1];
    const last = words.filter((w) => w.s >= caps[i].a && (!next || w.s < next.a)).at(-1)!;
    caps[i].b = next ? Math.min(next.a, last.e + 0.9) : last.e + 1.2;
  }
  return caps;
};
/** word-by-word captions: each word appears on the narration word it matches; key words red and bumped */
export const Captions: React.FC<{ t: number; caps: Cap[]; words: Word[]; y?: number }> = ({ t, caps, words, y = 1478 }) => {
  const c = caps.find((x) => t >= x.a - 0.05 && t < x.b);
  if (!c || c.hide) return null;
  const spoken = words.filter((w) => w.s >= c.a - 0.08 && w.s < c.b - 0.02);
  const ws = c.text.split(" ");
  const fade = 1 - clamp((t - (c.b - 0.1)) / 0.1);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 150, height: 300, background: "linear-gradient(rgba(4,5,6,0), rgba(4,5,6,0.62) 38%, rgba(4,5,6,0.62) 62%, rgba(4,5,6,0))", opacity: fade }} />
      <div style={{ position: "absolute", left: 90, right: 90, top: y - 70, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.head, fontSize: 64, lineHeight: 1.3, color: C.cream, textShadow: SD, opacity: fade, maxWidth: 900 }}>
          {ws.map((w, i) => {
            const at = spoken.length ? spoken[Math.min(i, spoken.length - 1)].s + (i >= spoken.length ? (i - spoken.length + 1) * 0.12 : 0) : c.a + i * 0.15;
            const u = ease.out(clamp((t - at + 0.04) / 0.2));
            const isKey = c.key?.some((k) => w.includes(k));
            const lat = /[A-Za-z0-9]/.test(w);
            return (
              <span key={i} style={{ display: "inline-block", marginLeft: lat ? 14 : 16, marginRight: lat ? 14 : 0, unicodeBidi: "isolate", opacity: u, transform: `translateY(${(1 - u) * 18}px) scale(${isKey ? 1 + 0.08 * ease.outBack(clamp((t - at) / 0.3)) - 0.08 * clamp((t - at - 0.3) / 0.4) : 1})`, filter: u < 1 ? `blur(${(1 - u) * 6}px)` : undefined, color: isKey ? C.red2 : undefined, fontFamily: lat ? F.ui : undefined, fontWeight: lat ? 800 : undefined, fontSize: lat ? 54 : undefined }}>
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── kinetic words ─────────────────────────────────────────────────────────────────────────────────────────────
/** a big word that slams in (scale + blur), breathes, then leaves; flat type with a deep soft shadow */
export const Punch: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; x?: number; y?: number; size?: number; color?: string; font?: string; rtl?: boolean; from?: "slam" | "rise" | "left" | "right" | "none"; tilt?: number; style?: React.CSSProperties }> = ({ t, a, b, children, x = 540, y = 760, size = 210, color = C.cream, font = F.head, rtl = true, from = "slam", tilt = 0, style }) => {
  if (t < a - 0.02 || t > b + 0.3) return null;
  const u = from === "none" || a <= 0 ? 1 : clamp((t - a) / 0.2), v = clamp((t - b) / 0.22);
  const e = ease.out(u);
  const sc = from === "slam" ? mix(1.45, 1, e) : 1;
  const dx = from === "left" ? (1 - e) * -420 : from === "right" ? (1 - e) * 420 : 0;
  const dy = from === "rise" ? (1 - e) * 140 : 0;
  const life = 1 + 0.035 * clamp((t - a) / Math.max(0.3, b - a));
  return (
    <div style={{ position: "absolute", left: x - 520, top: y - size, width: 1040, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ direction: rtl ? "rtl" : "ltr", fontFamily: font, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap", textShadow: "0 4px 14px rgba(0,0,0,0.45), 0 18px 60px rgba(0,0,0,0.55)", opacity: e * (1 - v), filter: u < 1 || v > 0 ? `blur(${(1 - e) * 14 + v * 10}px)` : undefined, transform: `translate(${dx}px,${dy - v * 40}px) scale(${sc * life * (1 + v * 0.12)}) rotate(${tilt}deg)`, ...style }}>
        {children}
      </div>
    </div>
  );
};

export type Rect = { x: number; y: number; w: number; h: number };
/** a value lifted off a page: starts at `from` (frame px), flies to (tx, ty), grows, rolls its counter; leaves at b */
export const Lift: React.FC<{ t: number; a: number; b: number; from: Rect; tx: number; ty: number; size: number; value: (u: number) => string; roll?: [number, number]; label?: React.ReactNode; color?: string; accent?: string }> = ({ t, a, b, from, tx, ty, size, value, roll = [a, a + 0.9], label, color = C.cream, accent = C.red }) => {
  if (t < a || t > b + 0.35) return null;
  const f = ease.inOut(clamp((t - a) / 0.5));
  const leave = ease.in(clamp((t - b) / 0.3));
  const x = mix(from.x + from.w / 2, tx, f), y = mix(from.y + from.h / 2, ty, f);
  const sc = mix(from.h / (size * 0.8), 1, f) * (1 + 0.03 * Math.sin(clamp((t - a - 0.5) / 2) * Math.PI));
  const r = clamp((t - roll[0]) / (roll[1] - roll[0]));
  return (
    <div style={{ position: "absolute", left: x - 500, top: y - size * 0.6, width: 1000, height: size * 1.6, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - leave, transform: `scale(${sc * (1 - 0.2 * leave)})`, transformOrigin: "50% 37.5%" }}>
      <div style={{ fontFamily: F.ui, fontWeight: 850, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.035, color, direction: "ltr", fontVariantNumeric: "tabular-nums", textShadow: `0 ${4 + 30 * f}px ${10 + 50 * f}px rgba(0,0,0,${0.3 + 0.35 * f})` }}>{value(ease.out(r))}</div>
      {label ? <div style={{ marginTop: size * 0.08, opacity: clamp((t - a - 0.35) / 0.25) }}>{label}</div> : null}
      <div style={{ position: "absolute", top: size * 1.02, width: size * 1.2 * f, height: 5, borderRadius: 3, background: accent, opacity: f * 0.9, left: 500 - size * 0.6 * f }} />
    </div>
  );
};

/** a dark scrim that pulls the eye off a busy page while a lift-out holds */
export const Scrim: React.FC<{ a: number }> = ({ a }) => (a > 0 ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 50% at 50% 45%, rgba(4,5,6,0.55), rgba(4,5,6,0.82))", opacity: a }} /> : null);

/** small glass label (Latin UI words, tags) */
export const Tag: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({ children, style, color = C.cream }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "rgba(20,22,26,0.72)", border: "1px solid rgba(244,238,230,0.14)", fontFamily: F.ui, fontWeight: 700, fontSize: 30, color, letterSpacing: 0.5, ...style }}>{children}</div>
);

/** a stopwatch: a big Anton number that runs from → to between a and a + dur (never shown before it runs), a Persian
 *  unit next to it and a red rule under it. `lead` = a small label above (e.g. «یک وکیل»). */
export const Timer: React.FC<{ t: number; a: number; b: number; from: number; to: number; dur?: number; decimals?: number; unit: string; lead?: string; x?: number; y?: number; size?: number; color?: string }> = ({ t, a, b, from, to, dur = 0.9, decimals = 2, unit, lead, x = 540, y = 820, size = 300, color = C.cream }) => {
  if (t < a || t > b + 0.3) return null;
  const k = ease.out(clamp((t - a) / 0.25)) * (1 - clamp((t - b) / 0.25));
  const v = mix(from, to, ease.out(clamp((t - a) / dur)));
  const done = t >= a + dur;
  return (
    <div style={{ position: "absolute", left: x - 500, top: y - size * 0.7, width: 1000, display: "flex", flexDirection: "column", alignItems: "center", opacity: k, transform: `scale(${1.08 - 0.08 * k})` }}>
      {lead && <div style={{ direction: "rtl", fontFamily: F.head, fontSize: size * 0.2, color: C.dim, textShadow: SD }}>{lead}</div>}
      <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.08, direction: "ltr" }}>
        <span style={{ fontFamily: F.anton, fontSize: size, lineHeight: 1, color: done ? color : C.cream, fontVariantNumeric: "tabular-nums", textShadow: "0 18px 60px rgba(0,0,0,0.6)" }}>{v.toFixed(decimals)}</span>
        <span style={{ fontFamily: F.head, fontSize: size * 0.22, color: C.cream, direction: "rtl" }}>{unit}</span>
      </div>
      <div style={{ width: size * 2.2 * ease.out(clamp((t - a) / 0.5)), height: 8, borderRadius: 4, background: C.red, marginTop: size * 0.06 }} />
    </div>
  );
};

/** choice pills (law books, verdicts): one gets picked on `pickAt` (red outline, the others dim) */
export const Choice: React.FC<{ t: number; a: number; b: number; items: string[]; pick: number; pickAt: number; x?: number; y?: number; w?: number }> = ({ t, a, b, items, pick, pickAt, x = 90, y = 1060, w = 900 }) => {
  if (t < a - 0.05 || t > b + 0.3) return null;
  const k = ease.out(clamp((t - a) / 0.3)) * (1 - clamp((t - b) / 0.25));
  const p = ease.outBack(clamp((t - pickAt) / 0.35));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, display: "flex", gap: 22, direction: "rtl", opacity: k }}>
      {items.map((it, i) => {
        const on = i === pick && t >= pickAt;
        return (
          <div key={i} style={{ flex: 1, padding: "26px 10px", borderRadius: 22, textAlign: "center", fontFamily: F.head, fontSize: 52, color: on ? C.cream : t >= pickAt ? C.faint : C.dim, background: on ? "rgba(90,13,13,.55)" : "rgba(20,20,26,.75)", border: `3px solid ${on ? C.red : "rgba(244,238,230,0.14)"}`, boxShadow: on ? `0 0 ${40 * p}px rgba(229,50,45,.45)` : "none", transform: `scale(${on ? 1 + 0.06 * p - 0.03 * clamp((t - pickAt - 0.35) / 0.3) : 1})`, transition: "none" }}>
            {it}
          </div>
        );
      })}
    </div>
  );
};

/** a horizontal motion-blur filter (SVG) for whip pans; returns [defs, cssFilter] */
let hb = 0;
export const useHBlur = (amt: number): [React.ReactNode, string | undefined] => {
  const id = React.useMemo(() => `vnhb${hb++}`, []);
  const a = Math.max(0, amt);
  if (a < 0.5) return [null, undefined];
  return [
    <svg key="hb" width={0} height={0} style={{ position: "absolute" }}>
      <filter id={id} x="-30%" y="-5%" width="160%" height="110%">
        <feGaussianBlur stdDeviation={`${a.toFixed(1)} 0`} />
      </filter>
    </svg>,
    `url(#${id})`,
  ];
};

/** film grain, 12 fps */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='256' height='256' filter='url(#g)'/></svg>")}")`;
export const Grain: React.FC<{ t: number; a?: number }> = ({ t, a = 0.04 }) => {
  const f = Math.floor(t * 12);
  return <div style={{ position: "absolute", inset: -256, backgroundImage: GRAIN, opacity: a, mixBlendMode: "overlay", transform: `translate(${(f * 73) % 256}px, ${(f * 131) % 256}px)` }} />;
};

// ── scenes ────────────────────────────────────────────────────────────────────────────────────────────────────
/** a scene draws itself while a ≤ t < b (scenes may overlap; z orders them) */
export type Scene = { a: number; b: number; el: (t: number) => React.ReactNode; z?: number };
export const Scenes: React.FC<{ t: number; scenes: Scene[] }> = ({ t, scenes }) => (
  <>
    {scenes
      .filter((s) => t >= s.a && t < s.b)
      .sort((x, y) => (x.z ?? 0) - (y.z ?? 0))
      .map((s, i) => (
        <React.Fragment key={`${s.a}-${i}`}>{s.el(t)}</React.Fragment>
      ))}
  </>
);
