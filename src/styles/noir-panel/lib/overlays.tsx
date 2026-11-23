// Noir Panel · the overlays and code-drawn scenes that live inside the window. Each one is a pure function of t and
// takes its times from the narration's words. Only the accent is coloured; everything else is white, grey and black.
import React from "react";
import { C, FA, MONO, PANEL, SHADOW, accentA, back, clamp, easeInOut, easeOut, faNum, ramp, rnd } from "./theme";

/** dark glass card for the code-drawn scenes */
export const card: React.CSSProperties = { background: "rgba(14,14,20,.9)", border: `1px solid ${C.line}`, borderRadius: 30, boxShadow: "0 40px 100px rgba(0,0,0,.65)", direction: "rtl" };
const money = (s: string) => faNum(s).replace(/,/g, "٬");
const vis = (t: number, a: number, b: number, fade = 0.2) => easeOut(ramp(t, a - 0.3, a + 0.2)) * (1 - ramp(t, b - fade, b));

/** a year counter over a timeline: each archive shot shows its year; `run` sweeps the counter to the present */
export const YearLine: React.FC<{ t: number; show: [number, number]; steps: [number, number][]; run?: [number, number, number]; range: [number, number]; marks: number[]; bottom?: number }> = ({ t, show, steps, run, range, marks, bottom = 70 }) => {
  const k = easeOut(ramp(t, show[0], show[0] + 0.5)) * (1 - ramp(t, show[1] - 0.2, show[1]));
  if (k <= 0) return null;
  const cur = [...steps].reverse().find(([at]) => t >= at) ?? steps[0];
  const up = run ? easeInOut(ramp(t, run[0], run[1])) : 0;
  const year = Math.round(cur[1] + ((run ? run[2] : cur[1]) - cur[1]) * up);
  const p = clamp((year - range[0]) / (range[1] - range[0]));
  const pop = ramp(t, cur[0], cur[0] + 0.25);
  const done = run && up >= 1;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom, opacity: k, direction: "ltr" }}>
      <div style={{ fontFamily: MONO, fontSize: 96, fontWeight: 600, color: done ? C.accent : C.text, textAlign: "center", letterSpacing: 4, textShadow: SHADOW, transform: `scale(${1.12 - 0.12 * easeOut(pop)})` }}>{year}</div>
      <div style={{ position: "relative", height: 2, background: "rgba(255,255,255,.2)", marginTop: 18 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${p * 100}%`, background: C.accent }} />
        {marks.map((m) => (
          <div key={m} style={{ position: "absolute", left: `${((m - range[0]) / (range[1] - range[0])) * 100}%`, top: -6, width: 14, height: 14, marginLeft: -7, borderRadius: 7, background: year >= m ? C.accent : "#2A2A33", boxShadow: year >= m ? `0 0 14px ${C.accent}` : "none" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: MONO, fontSize: 24, color: C.dim, textShadow: SHADOW }}>
        <span>{range[0]}</span>
        <span>{range[1]}</span>
      </div>
    </div>
  );
};

/** «… is disappearing»: the picture breaks up into dark tiles (put it right after the footage in the window) */
export const Dissolve: React.FC<{ t: number; at: number; until: number; cols?: number; rows?: number; spread?: number }> = ({ t, at, until, cols = 9, rows = 10, spread = 0.7 }) => {
  if (t < at || t >= until) return null;
  const w = PANEL.w / cols, h = PANEL.h / rows;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const s = at + 0.05 + rnd(i) * spread;
        const o = easeOut(ramp(t, s, s + 0.16));
        return o <= 0 ? null : <div key={i} style={{ position: "absolute", left: (i % cols) * w - 0.5, top: Math.floor(i / cols) * h - 0.5, width: w + 1, height: h + 1, background: C.panel, opacity: o }} />;
      })}
    </div>
  );
};

/** a month of days filling one by one (fill[0] → fill[1]); the last day is the accent (payday, a deadline…) */
export const DayGrid: React.FC<{ t: number; show: [number, number]; fill: [number, number]; days?: number; cols?: number; bottom?: number }> = ({ t, show, fill, days = 30, cols = 10, bottom = 64 }) => {
  const k = vis(t, show[0], show[1], 0.15);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom, opacity: k, direction: "rtl" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {Array.from({ length: days }, (_, i) => {
          const on = t >= fill[0] + (fill[1] - fill[0]) * (i / (days - 1));
          const last = i === days - 1;
          return (
            <div key={i} style={{ height: 54, borderRadius: 10, border: `1px solid ${on ? (last ? C.accent : "rgba(255,255,255,.4)") : "rgba(255,255,255,.14)"}`, background: on ? (last ? C.accent : "rgba(20,20,26,.7)") : "rgba(5,5,7,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FA, fontWeight: 600, fontSize: 24, color: on && last ? "#140C06" : on ? C.text : C.dim, boxShadow: on && last ? `0 0 24px ${C.accent}` : "none" }}>
              {faNum(i + 1)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** one big mono word per beat (BETTER · FASTER · 24/7): [from, to, text] */
export const BigWord: React.FC<{ t: number; items: [number, number, string][]; bottom?: number; size?: number }> = ({ t, items, bottom = 70, size = 120 }) => {
  const it = items.find(([a, b]) => t >= a && t < b);
  if (!it) return null;
  const k = easeOut(ramp(t, it[0], it[0] + 0.2));
  const fit = Math.min(size, (PANEL.w - 120) / (it[2].length * 0.62));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: fit, color: C.text, letterSpacing: 8, opacity: k, transform: `scale(${1.25 - 0.25 * k})`, textShadow: "0 6px 40px rgba(0,0,0,.7)" }}>{it[2]}</div>
    </div>
  );
};

/** a value that runs down (or up) while it is said: «ارزش یک ساعت کار …  100% → 0%» */
export const Meter: React.FC<{ t: number; show: [number, number]; run: [number, number]; label: string; from?: number; to?: number; unit?: string; bottom?: number }> = ({ t, show, run, label, from = 100, to = 0, unit = "%", bottom = 72 }) => {
  if (t < show[0] || t >= show[1]) return null;
  const k = easeOut(ramp(t, show[0], show[0] + 0.35)) * (1 - ramp(t, show[1] - 0.12, show[1]));
  const p = easeInOut(ramp(t, run[0], run[1]));
  const v = Math.round(from + (to - from) * p);
  const frac = clamp(v / Math.max(from, to));
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom, opacity: k, direction: "rtl", transform: `translateY(${(1 - k) * 20}px)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 42, color: C.text, textShadow: SHADOW }}>{label}</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 68, lineHeight: 1, color: p >= 0.8 ? C.accent : C.text, textShadow: SHADOW, direction: "ltr" }}>{`${v}${unit}`}</div>
      </div>
      <div style={{ marginTop: 20, height: 12, borderRadius: 6, background: "rgba(255,255,255,.16)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${frac * 100}%`, background: C.accent, borderRadius: 6 }} />
      </div>
    </div>
  );
};

/** a slip (payslip, bill, receipt): rows come in, the total gets struck out on `strikeAt`, a big «؟» on `askAt` */
export const Slip: React.FC<{ t: number; t0: number; title: string; sub?: string; rows: [string, string][]; total: [string, string]; unit?: string; strikeAt?: number; askAt?: number; top?: number }> = ({ t, t0, title, sub, rows, total, unit = "تومان", strikeAt, askAt, top = 200 }) => {
  const k = easeOut(ramp(t, t0, t0 + 0.35));
  const strike = strikeAt === undefined ? 0 : easeInOut(ramp(t, strikeAt, strikeAt + 0.3));
  const q = askAt === undefined ? 0 : back(ramp(t, askAt, askAt + 0.35));
  return (
    <>
      <div style={{ ...card, position: "absolute", left: 92, right: 92, top, padding: "40px 48px", opacity: k, transform: `perspective(1400px) translateY(${(1 - k) * 50}px) rotateX(${(1 - k) * 16}deg)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 46, color: C.text }}>{title}</div>
          {sub && <div style={{ fontFamily: FA, fontWeight: 500, fontSize: 28, color: C.dim }}>{faNum(sub)}</div>}
        </div>
        <div style={{ height: 1, background: C.line, margin: "26px 0 10px" }} />
        {rows.map(([l, v], i) => {
          const r = easeOut(ramp(t, t0 + 0.12 + i * 0.08, t0 + 0.42 + i * 0.08));
          return (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", opacity: r, transform: `translateX(${(1 - r) * -20}px)` }}>
              <div style={{ fontFamily: FA, fontWeight: 500, fontSize: 34, color: C.dim }}>{l}</div>
              <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 36, color: C.text }}>{money(v)}</div>
            </div>
          );
        })}
        <div style={{ height: 1, background: C.line, margin: "14px 0 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: easeOut(ramp(t, t0 + 0.36, t0 + 0.66)) }}>
          <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 36, color: C.text }}>{total[0]}</div>
          <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 52, color: C.accent, display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ position: "relative" }}>
              {money(total[1])}
              <span style={{ position: "absolute", left: -8, right: -8, top: "34%", height: 4, borderRadius: 2, background: C.text, transform: `scaleX(${strike})`, transformOrigin: "100% 50%" }} />
            </span>
            <span style={{ fontSize: 28, fontWeight: 500 }}>{unit}</span>
          </div>
        </div>
      </div>
      {q > 0 && <div style={{ position: "absolute", left: 0, right: 0, top: top + 490, textAlign: "center", fontFamily: FA, fontWeight: 700, fontSize: 250, lineHeight: 1, color: C.accent, opacity: clamp(q * 1.5), transform: `scale(${0.6 + 0.4 * q})`, textShadow: "0 10px 50px rgba(0,0,0,.7)" }}>؟</div>}
    </>
  );
};

/** an analogue clock that keeps running (waiting) */
export const Clock: React.FC<{ t: number; size: number }> = ({ t, size }) => {
  const a = (t * 220) % 360, b = (t * 18) % 360;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: "block" }}>
      <circle r={44} fill="rgba(5,5,7,.55)" stroke={C.text} strokeWidth={4} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={0} y1={-36} x2={0} y2={i % 3 === 0 ? -29 : -32} stroke={C.text} strokeWidth={i % 3 === 0 ? 4 : 2} transform={`rotate(${i * 30})`} />
      ))}
      <line x1={0} y1={6} x2={0} y2={-22} stroke={C.text} strokeWidth={5} strokeLinecap="round" transform={`rotate(${b})`} />
      <line x1={0} y1={8} x2={0} y2={-33} stroke={C.accent} strokeWidth={3} strokeLinecap="round" transform={`rotate(${a})`} />
      <circle r={4} fill={C.accent} />
    </svg>
  );
};

/** a progress bar (learning, building…) with its label and %, for the bottom of a split side */
export const Progress: React.FC<{ p: number; label: string; w?: number }> = ({ p, label, w = 300 }) => (
  <div style={{ width: w, direction: "rtl" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FA, fontWeight: 600, fontSize: 26, color: C.text, textShadow: SHADOW }}>
      <span>{label}</span>
      <span style={{ fontFamily: MONO, direction: "ltr" }}>{`${Math.round(p * 100)}%`}</span>
    </div>
    <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: "rgba(255,255,255,.18)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: C.accent }} />
    </div>
  </div>
);

export type Side = { view: React.ReactNode; label: string; extra?: React.ReactNode };
/** two kinds of people / before-after: the window splits, the side being named lights up and grows.
 *  RTL: the first side named sits on the RIGHT. */
export const Split: React.FC<{ t: number; t0: number; t1: number; right: Side; left: Side; rightAt: number; leftAt: number }> = ({ t, t0, t1, right, left, rightAt, leftAt }) => {
  const k = easeOut(ramp(t, t0, t0 + 0.5));
  const a = easeInOut(ramp(t, rightAt - 0.1, rightAt + 0.3));
  const b = easeInOut(ramp(t, leftAt - 0.1, leftAt + 0.3));
  const litR = 0.8 + 0.2 * a - 0.6 * b, litL = 0.8 - 0.4 * a + 0.6 * b;
  const half = PANEL.w * (0.5 + 0.12 * a - 0.24 * b);
  const push = 1.06 + 0.06 * ramp(t, t0, t1);
  const side = (isRight: boolean, s: Side, lit: number) => (
    <div style={{ position: "absolute", top: 0, bottom: 0, width: (isRight ? half : PANEL.w - half) - 5, [isRight ? "right" : "left"]: 0, overflow: "hidden", borderRadius: 18, transform: `translateY(${(1 - k) * (isRight ? -50 : 50)}px)`, opacity: k }}>
      <div style={{ position: "absolute", inset: 0, filter: `brightness(${lit}) saturate(${0.5 + 0.45 * lit})`, transform: `scale(${push})` }}>{s.view}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 380, background: "linear-gradient(0deg, rgba(5,5,7,.92), rgba(5,5,7,0))" }} />
      {s.extra && <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center", opacity: 0.4 + 0.6 * lit }}>{s.extra}</div>}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, textAlign: "center", direction: "rtl", fontFamily: FA, fontWeight: 700, fontSize: 52, color: lit > 0.95 ? C.accent : C.text, opacity: 0.45 + 0.55 * lit, textShadow: SHADOW }}>{s.label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg }}>
      {side(true, right, litR)}
      {side(false, left, litL)}
      <div style={{ position: "absolute", left: PANEL.w - half - 1, top: 60 + (1 - k) * 400, bottom: 60 + (1 - k) * 400, width: 2, background: `linear-gradient(180deg, transparent, ${C.accent}, transparent)`, opacity: 0.8 }} />
    </div>
  );
};

/** a line that draws up over time (income, skill, views): values 0..1, labels under the points, a badge on its word */
export const LineChart: React.FC<{ t: number; t0: number; t1: number; title: string; values: number[]; labels: string[]; badge?: string; badgeAt?: number; note?: string; top?: number }> = ({ t, t0, t1, title, values, labels, badge, badgeAt, note, top = 230 }) => {
  const k = easeOut(ramp(t, t0, t0 + 0.3)) * (1 - ramp(t, t1 - 0.1, t1));
  if (k <= 0) return null;
  const p = easeInOut(ramp(t, t0 + 0.1, t0 + 1.0));
  const bk = badgeAt === undefined ? 0 : back(ramp(t, badgeAt, badgeAt + 0.35));
  const cw = 740, ch = 330;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * cw, ch - v * ch] as [number, number]);
  const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = segs.reduce((s, x) => s + x, 0);
  let left = p * total, tip = pts[0];
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i]) {
      const u = left / segs[i];
      tip = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
      break;
    }
    left -= segs[i];
    tip = pts[i + 1];
  }
  const line = pts.map((q) => q.join(",")).join(" ");
  const id = `lc${Math.round(t0 * 100)}`;
  return (
    <div style={{ ...card, position: "absolute", left: 72, right: 72, top, padding: "40px 50px 34px", opacity: k, transform: `perspective(1400px) translateY(${(1 - k) * 40}px) rotateX(${(1 - k) * 12}deg)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 44, color: C.text }}>{title}</div>
        {badge && <div style={{ opacity: clamp(bk * 1.4), transform: `scale(${0.7 + 0.3 * bk})`, padding: "8px 22px", borderRadius: 999, background: C.accent, color: "#140C06", fontFamily: FA, fontWeight: 700, fontSize: 28 }}>{badge}</div>}
      </div>
      <svg width={cw} height={ch + 70} viewBox={`-10 -20 ${cw + 20} ${ch + 90}`} style={{ display: "block", marginTop: 26, overflow: "visible", direction: "ltr" }}>
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.accent} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.accent} stopOpacity={0} />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <rect x={-10} y={-20} width={tip[0] + 10} height={ch + 40} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={0} x2={cw} y1={ch - g * ch} y2={ch - g * ch} stroke="rgba(255,255,255,.07)" strokeWidth={2} />
        ))}
        <polygon points={`0,${ch} ${line} ${cw},${ch}`} fill={`url(#${id}f)`} clipPath={`url(#${id}c)`} />
        <polyline points={line} fill="none" stroke={C.accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={total} strokeDashoffset={total * (1 - p)} />
        <circle cx={tip[0]} cy={tip[1]} r={11} fill={C.accent} style={{ filter: `drop-shadow(0 0 10px ${C.accent})` }} />
        {labels.map((m, i) => (
          <text key={i} x={pts[i][0]} y={ch + 54} textAnchor="middle" fontFamily={FA} fontSize={24} fontWeight={500} fill={C.dim}>
            {faNum(m)}
          </text>
        ))}
      </svg>
      {note && <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: C.dim, direction: "ltr", textAlign: "left" }}>{note}</div>}
    </div>
  );
};

/** old → new pairs: rows come in, the old ones get struck out on `strikeAt`, the new ones light up on `newAt` */
export const SwapList: React.FC<{ t: number; show: [number, number]; title: string; rows: [string, string][]; strikeAt: number; newAt: number; top?: number }> = ({ t, show, title, rows, strikeAt, newAt, top = 210 }) => {
  const k = vis(t, show[0], show[1], 0.15);
  if (k <= 0) return null;
  return (
    <div style={{ ...card, position: "absolute", left: 72, right: 72, top, padding: "40px 46px 30px", opacity: k, transform: `perspective(1400px) translateY(${(1 - k) * 40}px) rotateX(${(1 - k) * 12}deg)` }}>
      <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 46, color: C.text }}>{title}</div>
      <div style={{ height: 1, background: C.line, margin: "24px 0 8px" }} />
      {rows.map(([o, n], i) => {
        const r = easeOut(ramp(t, show[0] + 0.1 + i * 0.12, show[0] + 0.45 + i * 0.12));
        const st = easeInOut(ramp(t, strikeAt + i * 0.1, strikeAt + 0.3 + i * 0.1));
        const nw = easeOut(ramp(t, newAt + i * 0.14, newAt + 0.35 + i * 0.14));
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : undefined, opacity: r, transform: `translateX(${(1 - r) * 24}px)` }}>
            <div style={{ flex: 1, position: "relative", fontFamily: FA, fontWeight: 600, fontSize: 40, color: st > 0.5 ? C.dim : C.text }}>
              <span style={{ position: "relative" }}>
                {o}
                <span style={{ position: "absolute", left: -6, right: -6, top: "52%", height: 3, borderRadius: 2, background: C.dim, transform: `scaleX(${st})`, transformOrigin: "100% 50%" }} />
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 30, color: nw > 0 ? C.accent : C.dim, opacity: 0.4 + 0.6 * nw }}>←</div>
            <div style={{ flex: 1, fontFamily: FA, fontWeight: 700, fontSize: 42, color: C.accent, opacity: nw, transform: `translateX(${(1 - nw) * -16}px)` }}>{n}</div>
          </div>
        );
      })}
    </div>
  );
};

/** a numbered list that builds on its words; the current item is the accent: [time, text] */
export const NumList: React.FC<{ t: number; show: [number, number]; items: [number, string][]; bottom?: number }> = ({ t, show, items, bottom = 56 }) => {
  if (t < show[0] - 0.1 || t >= show[1]) return null;
  const out = 1 - ramp(t, show[1] - 0.15, show[1]);
  return (
    <div style={{ position: "absolute", right: 150, left: 50, bottom, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", direction: "rtl", opacity: out }}>
      {items.map(([ts, label], i) => {
        const k = easeOut(ramp(t, ts - 0.05, ts + 0.3));
        const cur = t >= ts && (i === items.length - 1 || t < items[i + 1][0]);
        return (
          <div key={label} style={{ opacity: k * (cur ? 1 : 0.55), transform: `translateX(${(1 - k) * -30}px)`, display: "flex", alignItems: "center", gap: 18, fontFamily: FA, fontWeight: 600, fontSize: 44, color: cur ? C.accent : C.text, textShadow: SHADOW }}>
            <span style={{ fontFamily: MONO, fontSize: 28, color: C.dim }}>{`0${i + 1}`}</span>
            {label}
          </div>
        );
      })}
    </div>
  );
};

/** the end card inside the window: your mark, the name, a mono line and a button that gets pressed on its word */
export const EndCard: React.FC<{ t: number; t0: number; mark: (p: number, glow: number) => React.ReactNode; name: string; sub?: string; button: string; done?: string; pressAt?: number }> = ({ t, t0, mark, name, sub, button, done, pressAt }) => {
  const k = easeOut(ramp(t, t0, t0 + 0.3));
  const p = easeInOut(ramp(t, t0, t0 + 0.5));
  const glow = easeOut(ramp(t, t0 + 0.3, t0 + 0.8));
  const press = pressAt === undefined ? 0 : ramp(t, pressAt, pressAt + 0.12) - ramp(t, pressAt + 0.12, pressAt + 0.3);
  const isDone = pressAt !== undefined && t >= pressAt + 0.2;
  const bk = easeOut(ramp(t, t0 + 0.15, t0 + 0.55));
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 50% at 50% 40%, rgba(255,255,255,${0.04 * glow}), rgba(5,5,7,0) 70%), ${C.bg}`, opacity: k }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {mark(p, glow * (0.85 + 0.15 * Math.sin(t * 3)))}
        <div style={{ marginTop: 40, fontFamily: FA, fontWeight: 800, fontSize: 66, color: C.text, direction: "rtl", opacity: bk }}>{name}</div>
        {sub && <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 28, letterSpacing: 10, color: C.dim, opacity: bk }}>{sub}</div>}
        <div style={{ marginTop: 70, opacity: bk, transform: `scale(${1 - 0.06 * press})`, direction: "rtl", padding: "22px 70px", borderRadius: 999, fontFamily: FA, fontWeight: 700, fontSize: 44, background: isDone ? "rgba(255,255,255,.06)" : C.accent, color: isDone ? C.text : "#140C06", border: isDone ? `1px solid ${C.line}` : "1px solid transparent", boxShadow: isDone ? "none" : `0 0 ${40 * glow}px ${accentA(0.35)}` }}>
          {isDone ? (done ?? button) : button}
        </div>
      </div>
    </div>
  );
};
