// Talk Cutout · the things that sit BEHIND the speaker (drawn between her picture and her cut-out). All dark glass
// (her wall is usually light: cream type would vanish on it). Place them only where her silhouette leaves room —
// measure it per take (pipeline/qc-silhouette.py): the band above her head, the wall beside her face, the space her
// raised hand has just left. Never on her face. Every element: a pop-in, a living idle (bob/glow), a clean exit.
import React from "react";
import { C, F, GLASS, accentA } from "./theme";
import { clamp, ease, mix, pop, punch } from "./time";

// ── a stack of value cards (the hook: «هر روز / هر هفته / هر ماه …») ───────────────────────────────────────────
export type ValueRow = {
  label: string; // Persian label, e.g. «هر روز»
  from: number; to: number; // the value rolls from ~93 % of `to` (never from zero: a «0» on a number reads as «nothing»)
  dec: number; // decimals
  prefix?: string; suffix?: string; // around the Latin number («+», «K»)
  unit?: string; // Persian unit after the number («بازدید»)
  share?: number; // 0..1 the thin bar under the row (a day of a month = 1/28)
  at: number; // film time the card lands (on its word; −0.04 s)
};
const rolled = (r: ValueRow, t: number) => {
  const v = mix(r.from, r.to, ease.out(clamp((t - r.at) / 0.3)));
  return `${r.prefix ?? ""}${r.dec ? v.toFixed(r.dec) : Math.round(v)}${r.suffix ?? ""}`;
};
const RowFace: React.FC<{ r: ValueRow; t: number; size: number; bar: number }> = ({ r, t, size, bar }) => {
  const k = ease.out(clamp((t - r.at) / 0.3));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 12 * size, padding: `0 ${22 * size}px`, direction: "rtl", boxSizing: "border-box" }}>
      <span style={{ fontFamily: F.head, fontSize: 52 * size, lineHeight: 1, color: C.cream, whiteSpace: "nowrap" }}>{r.label}</span>
      <div style={{ flex: 1 }} />
      <span style={{ direction: "ltr", unicodeBidi: "isolate", fontFamily: F.ui, fontWeight: 900, fontSize: 72 * size, lineHeight: 1, letterSpacing: -2 * size, color: C.accent, whiteSpace: "nowrap" }}>{rolled(r, t)}</span>
      {r.unit ? <span style={{ fontFamily: F.head, fontSize: 31 * size, lineHeight: 1, color: C.dim, whiteSpace: "nowrap" }}>{r.unit}</span> : null}
      {bar > 0 && r.share !== undefined ? (
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 11, height: 5, borderRadius: 3, background: "rgba(244,238,230,0.10)", opacity: bar }}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${r.share * 100 * k}%`, borderRadius: 3, background: C.accent, boxShadow: `0 0 10px ${accentA(0.6)}` }} />
        </div>
      ) : null}
    </div>
  );
};

export type StackP = {
  t: number;
  rows: ValueRow[]; // 2–3 rows, landing one per word
  x: number; w: number; h: number; ys: number[]; // card geometry (frame px, before her punch-in)
  source?: React.ReactNode; // a pill over the stack: whose numbers («آمار نمونه · …»)
  sourceY?: number;
  fold?: number; // film time the earlier rows fold into the last one (on a jump cut / her own light leak)
  fly?: [number, number]; // … and the last one flies up into the band above her head
  pill?: { x: number; w: number; h: number; y: number }; // the band pill it becomes
  out: number; // everything leaves (blur) from here
};
export const ValueStack: React.FC<StackP> = ({ t, rows, x, w, h, ys, source, sourceY = 244, fold = 1e9, fly, pill, out }) => {
  if (t < rows[0].at - 0.05 || t > out + 0.3) return null;
  const bob = Math.sin(t * 2.4) * 4;
  const fd = ease.inOut(clamp((t - fold) / 0.2));
  const fl = fly ? ease.inOut(clamp((t - fly[0]) / (fly[1] - fly[0]))) : 0;
  const gone = ease.in(clamp((t - out) / 0.25));
  const head = ease.out(clamp((t - (rows[0].at + 0.05)) / 0.3)) * (1 - fd);
  const last = rows.length - 1;
  const P = pill ?? { x, w, h, y: ys[last] };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone, filter: gone > 0 ? `blur(${10 * gone}px)` : undefined }}>
      {source && head > 0 ? (
        <div style={{ position: "absolute", left: x, top: sourceY + bob, height: 54, padding: "0 24px", borderRadius: 27, display: "flex", alignItems: "center", gap: 12, ...GLASS, direction: "rtl", opacity: head, transform: `translateX(${(1 - head) * -24}px)` }}>
          {source}
        </div>
      ) : null}
      {rows.map((r, i) => {
        const a = r.at - 0.05;
        if (t < a) return null;
        const u = pop(t, a, 0.42);
        const hot = clamp(1 - (t - a - 0.15) / 0.7);
        if (i < last) {
          if (fd >= 1) return null;
          const dy = (ys[last] - ys[i]) * fd;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: ys[i] + bob + dy, width: w, height: h, borderRadius: 30, ...GLASS, border: `1.5px solid ${accentA(0.18 + 0.6 * hot)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${36 * hot}px ${accentA(0.4 * hot)}`, opacity: clamp(u * 3) * (1 - fd), transform: `translateX(${(1 - clamp(u)) * -24}px) scale(${mix(1.08, 1, clamp(u)) * (1 - 0.1 * fd)})`, transformOrigin: "0% 50%", filter: u < 0.6 ? `blur(${(0.6 - u) * 14}px)` : undefined }}>
              <RowFace r={r} t={t} size={1} bar={1} />
            </div>
          );
        }
        const X = mix(x, P.x, fl), Y = mix(ys[last] + bob, P.y, fl), Wd = mix(w, P.w, fl), Hd = mix(h, P.h, fl);
        const merge = clamp((t - fold) / 0.2) * (1 - clamp((t - (fold + 0.25)) / 0.3));
        const glow = Math.max(hot, merge, 0.35 * fl);
        return (
          <div key={i} style={{ position: "absolute", left: X, top: Y, width: Wd, height: Hd, borderRadius: mix(30, Hd / 2, fl), ...GLASS, border: `${mix(1.5, 2, fl)}px solid ${accentA(0.18 + 0.6 * glow)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${44 * glow}px ${accentA(0.45 * glow)}`, opacity: clamp(u * 3), transform: `translateX(${(1 - clamp(u)) * -24}px) scale(${mix(1.08, 1, clamp(u)) * (1 + 0.05 * merge)})`, transformOrigin: "50% 50%", filter: u < 0.6 ? `blur(${(0.6 - u) * 14}px)` : undefined }}>
            <RowFace r={r} t={t} size={mix(1, 0.92, fl)} bar={1 - fl} />
          </div>
        );
      })}
    </div>
  );
};

// ── a tile with a big number and its word («3 قدم») ────────────────────────────────────────────────────────────
export const StepTile: React.FC<{ t: number; a: number; wordAt: number; out: number; x: number; y: number; w: number; h: number; big: string; word: string }> = ({ t, a, wordAt, out, x, y, w, h, big, word }) => {
  if (t < a || t > out + 0.3) return null;
  const u = pop(t, a, 0.42);
  const wd = ease.out(clamp((t - wordAt) / 0.3));
  const o = ease.in(clamp((t - out) / 0.22));
  const bob = Math.sin(t * 2.6) * 6;
  const glow = clamp((t - wordAt) / 0.25);
  return (
    <div style={{ position: "absolute", left: x, top: y + bob, width: w, height: h, borderRadius: 40, ...GLASS, border: `2px solid ${accentA(0.25 + 0.5 * glow)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${40 * glow}px ${accentA(0.35 * glow)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: clamp(u * 3) * (1 - o), transform: `scale(${u * (1 + 0.1 * o)}) rotate(${(1 - clamp(u)) * 8}deg)`, filter: o > 0 ? `blur(${10 * o}px)` : undefined }}>
      <div style={{ fontFamily: F.ui, fontWeight: 900, fontSize: w, lineHeight: 0.9, letterSpacing: -8, color: C.accent, direction: "ltr", textShadow: `0 14px 44px ${accentA(0.25)}` }}>{big}</div>
      <div style={{ fontFamily: F.head, fontSize: w * 0.35, lineHeight: 1.1, color: C.cream, direction: "rtl", opacity: wd, transform: `translateY(${(1 - wd) * 26}px)` }}>{word}</div>
    </div>
  );
};

// ── marks that arch over and beside her head («کدوم هوش مصنوعی؟»: one of them stays a secret) ─────────────────
export type ArchMark = { node: React.ReactNode; x: number; y: number; delay?: number; hot?: boolean };
/** soloAt: the plain marks step back (sink + fade) and only the hot one stays — frees the frame for the next beat */
export const MarkArch: React.FC<{ t: number; a: number; b: number; marks: ArchMark[]; hotAt?: number; askAt?: number; soloAt?: number; size?: number }> = ({ t, a, b, marks, hotAt = 1e9, askAt = 1e9, soloAt = 1e9, size = 104 }) => {
  if (t < a - 0.1 || t > b + 0.45) return null;
  const o = ease.in(clamp((t - b) / 0.35));
  const solo = ease.in(clamp((t - soloAt) / 0.3));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      {marks.map((m, i) => {
        const u = pop(t, a + (m.delay ?? 0) * 0.12, 0.4);
        const bob = Math.sin((t - a) * 2.2 + i * 1.3) * 7;
        const hot = m.hot ? ease.out(clamp((t - (hotAt - 0.06)) / 0.3)) : 0;
        const q = m.hot ? pop(t, askAt, 0.4) : 0;
        const gone = m.hot ? 0 : solo;
        if (gone >= 1) return null;
        return (
          <div key={i} style={{ position: "absolute", left: m.x - size / 2, top: m.y - size / 2 + bob + (1 - clamp(u)) * 60 - o * 40 + 40 * gone, width: size, height: size, borderRadius: size * 0.29, ...GLASS, border: `${1.5 + hot}px solid ${accentA(0.16 + 0.7 * hot)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${40 * hot}px ${accentA(0.45 * hot)}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${u * (1 + 0.16 * hot + 0.06 * punch(t, askAt, 6)) * (1 - 0.25 * gone)})`, opacity: clamp(u * 3) * (1 - gone) }}>
            {m.node}
            {q > 0 ? (
              <div style={{ position: "absolute", right: -18, top: -18, width: 46, height: 46, borderRadius: 23, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 30, color: C.accentInk, transform: `scale(${q})`, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>?</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

// ── a word in the band above her head («کلمه‌ی قدم») ─────────────────────────────────────────────────────────────
export const HeadPill: React.FC<{ t: number; a: number; b: number; y?: number; icon?: React.ReactNode; children: React.ReactNode; size?: number }> = ({ t, a, b, y = 238, icon, children, size = 76 }) => {
  if (t < a || t > b + 0.35) return null;
  const u = pop(t, a, 0.42), v = ease.in(clamp((t - b) / 0.28));
  const h = size * 1.26;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, height: h, display: "flex", justifyContent: "center", opacity: clamp(u * 3) * (1 - v), transform: `translateY(${(1 - clamp(u)) * 40 - v * 26}px) scale(${u})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: `0 ${size * 0.6}px`, height: h, borderRadius: h / 2, ...GLASS, border: `2px solid ${C.accent}`, direction: "rtl" }}>
        {icon}
        <span style={{ fontFamily: F.head, fontSize: size, lineHeight: 1, color: C.accent }}>{children}</span>
      </div>
    </div>
  );
};

// ── a glass tile (a logo above her fingertip, an app icon beside her face) ─────────────────────────────────────
export const Tile: React.FC<{ t: number; a: number; b: number; x: number; y: number; size: number; hot?: number; children: React.ReactNode }> = ({ t, a, b, x, y, size, hot = 0, children }) => {
  if (t < a || t > b + 0.35) return null;
  const u = pop(t, a, 0.42), v = ease.in(clamp((t - b) / 0.3));
  const bob = Math.sin((t - a) * 2.4) * 6;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2 + bob, width: size, height: size, borderRadius: size * 0.27, ...GLASS, border: `${1.5 + hot}px solid ${accentA(0.16 + 0.7 * hot)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${40 * hot}px ${accentA(0.45 * hot)}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: clamp(u * 3) * (1 - v), transform: `scale(${u * (1 - 0.1 * v)})`, filter: v > 0 ? `blur(${8 * v}px)` : undefined }}>
      {children}
    </div>
  );
};

/** a huge word or number BEHIND her (between her picture and her cut-out): her head and shoulders cut into it */
export const BigBehind: React.FC<{ t: number; a: number; b: number; y: number; size: number; children: React.ReactNode; color?: string }> = ({ t, a, b, y, size, children, color = C.cream }) => {
  if (t < a || t > b + 0.35) return null;
  const u = ease.out(clamp((t - a) / 0.3)), v = ease.in(clamp((t - b) / 0.3));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - size * 0.6, height: size * 1.2, display: "flex", alignItems: "center", justifyContent: "center", opacity: u * (1 - v), transform: `scale(${mix(1.25, 1, u) * (1 + 0.03 * clamp((t - a) / 2))})`, filter: u < 1 || v > 0 ? `blur(${(1 - u) * 14 + v * 10}px)` : undefined }}>
      <div style={{ fontFamily: F.ui, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: "-0.04em", color, whiteSpace: "nowrap", direction: "ltr", textShadow: "0 18px 60px rgba(0,0,0,0.35)" }}>{children}</div>
    </div>
  );
};
