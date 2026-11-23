// Market File · data pieces. Every chart is drawn ON the word that says it, runs left → right like every chart (even
// in a Persian film), shows its source line, and never starts a money/percent counter from 0 (a «$0» or «۰٪» frame
// reads as a claim): numbers appear at their first real value.
import React from "react";
import { C, FA, LATIN, MONO, accentA, clamp, easeOut, faNum, kick, ramp } from "./theme";

// ─── line chart ────────────────────────────────────────────────────────────────────────────────────────────
/**
 * A price line that draws itself from t=a over `len` s. Grid lines at `grid` values (label via gridLabel), an
 * optional dashed `ref` line (a claim / a threshold, in `refColor`), the live end dot when done.
 */
export const LineChart: React.FC<{
  t: number;
  a: number;
  len?: number;
  data: number[];
  lo: number;
  hi: number;
  w: number;
  h: number;
  grid?: number[];
  gridLabel?: (v: number) => string;
  ref?: { v: number; label: string; color?: string };
  color?: string;
  pad?: [number, number, number, number]; // left, top, right, bottom
}> = ({ t, a, len = 0.7, data, lo, hi, w, h, grid = [], gridLabel = (v) => String(v), ref, color = C.accent, pad = [30, 30, 140, 40] }) => {
  const [x0, y0] = [pad[0], pad[1]];
  const x1 = w - pad[2], y1 = h - pad[3];
  const n = data.length;
  const X = (i: number) => x0 + ((x1 - x0) * i) / (n - 1);
  const Y = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
  const draw = easeOut(ramp(t, a, a + len));
  // smooth draw: whole points plus the partial segment to the pen tip
  const pos = draw * (n - 1);
  const m = Math.floor(pos);
  const pts: [number, number][] = data.slice(0, m + 1).map((v, i) => [X(i), Y(v)]);
  if (m < n - 1) {
    const f = pos - m;
    pts.push([X(m) + (X(m + 1) - X(m)) * f, Y(data[m]) + (Y(data[m + 1]) - Y(data[m])) * f]);
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = pts.length > 1 ? `${d}L${pts[pts.length - 1][0].toFixed(1)},${y1}L${x0},${y1}Z` : "";
  const tip = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {grid.map((v) => (
        <g key={v}>
          <line x1={x0} x2={w - 30} y1={Y(v)} y2={Y(v)} stroke={C.line2} strokeWidth={2} />
          <text x={w - 30} y={Y(v) - 10} textAnchor="end" fontFamily={MONO} fontSize={20} fill={C.creamMute}>
            {gridLabel(v)}
          </text>
        </g>
      ))}
      {ref && (
        <g opacity={easeOut(ramp(t, a, a + 0.3))}>
          <line x1={x0} x2={w - 30} y1={Y(ref.v)} y2={Y(ref.v)} stroke={ref.color ?? C.neg} strokeOpacity={0.6} strokeWidth={3} strokeDasharray="10 10" />
          <text x={w - 30} y={Y(ref.v) - 10} textAnchor="end" fontFamily={MONO} fontSize={20} fill={ref.color ?? C.neg}>
            {ref.label}
          </text>
        </g>
      )}
      {area && <path d={area} fill={accentA(0.12)} />}
      {pts.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />}
      {draw > 0 && tip && <circle cx={tip[0]} cy={tip[1]} r={draw >= 1 ? 11 + 4 * kick(t, a + len, 0.4) : 8} fill={color} />}
    </svg>
  );
};

// ─── a share as dots ───────────────────────────────────────────────────────────────────────────────────────
/**
 * n dots (cols per row, RTL: from the right) appear from `a`; `lit` of them turn accent from `litAt`, one by one.
 * «از هر ۱۰۰ تا، ۶۰ تاش…» — the viewer counts with you.
 */
export const DotGrid: React.FC<{ t: number; a: number; lit: number; litAt: number; n?: number; cols?: number; cell?: number; x: number; y: number; r?: number; litStagger?: number }> = ({ t, a, lit, litAt, n = 100, cols = 10, cell = 54, x, y, r = 7, litStagger = 0.012 }) => {
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const cx = x + (cols - 1 - col) * cell + cell / 2;
    const cy = y + row * cell + cell / 2;
    const show = easeOut(clamp((t - (a + i * 0.008)) / 0.14));
    if (show <= 0) continue;
    const on = i < lit ? ramp(t, litAt + i * litStagger, litAt + i * litStagger + 0.16) : 0;
    const pop = i < lit ? kick(t, litAt + i * litStagger, 0.35) : 0;
    const shimmer = t > a + 1 ? 0.08 * Math.sin(2 * Math.PI * (t * 0.7 - (row + col) / 14)) : 0;
    dots.push(<circle key={i} cx={cx} cy={cy} r={r * (1 + 0.5 * on + 0.5 * pop)} fill={on > 0.02 ? C.accent : C.cream} fillOpacity={on > 0.02 ? 0.4 + 0.6 * on : (0.3 + shimmer) * show} />);
  }
  return (
    <svg width={x + cols * cell + 20} height={y + Math.ceil(n / cols) * cell + 20} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {dots}
    </svg>
  );
};

// ─── phases with a running bar ─────────────────────────────────────────────────────────────────────────────
/** one phase card; hot = the phase the line is about (accent fill, ink text, a slow breath) */
export const PhaseCard: React.FC<{ x: number; y: number; w: number; h?: number; top: string; big: string; note?: string; k: number; hot: number; t: number }> = ({ x, y, w, h = 300, top, big, note, k, hot, t }) => {
  const e = easeOut(clamp(k));
  const breathe = hot > 0.5 ? 1 + 0.025 * Math.sin(t * 5) : 1;
  const H = hot > 0.5;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: e, transform: `translateY(${(1 - e) * 30}px) scale(${breathe})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: H ? C.accent : "rgba(11,11,12,.82)", border: `3px solid ${H ? C.accent : C.line2}`, boxShadow: hot > 0 ? `0 0 ${70 * hot}px ${accentA(0.25 * hot)}` : undefined }} />
      <div dir="rtl" style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontFamily: FA, fontWeight: 700, fontSize: 28, color: H ? "rgba(11,11,12,.74)" : C.creamDim }}>{top}</span>
        <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 66, lineHeight: 1.05, color: H ? C.ink : C.cream, whiteSpace: "nowrap" }}>{big}</span>
        {note && <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 30, color: H ? C.ink : C.accent, marginTop: 4 }}>{note}</span>}
      </div>
    </div>
  );
};

/** the running bar under the phases: segments [x, w, from, to] fill right → left (RTL: phase 1 on the right) */
export const PhaseBar: React.FC<{ t: number; y: number; segs: [number, number, number, number][] }> = ({ t, y, segs }) => (
  <>
    {segs.map(([x, w, a, b], i) => {
      const k = ramp(t, a, b);
      return (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: 12, borderRadius: 6, background: "rgba(242,239,232,.14)", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${k * 100}%`, background: C.accent, borderRadius: 6 }} />
        </div>
      );
    })}
  </>
);

// ─── a schematic curve (scenario, not data) ────────────────────────────────────────────────────────────────
/**
 * A curve f(x), x 0→1 left → right, drawn to k. Ticks under the axis ([x, Persian label]); yLabel top-left;
 * endLabel by the pen tip when done. Default f = a fall to a floor (an effect fading, a price settling).
 */
export const Curve: React.FC<{ k: number; w: number; h: number; ticks?: [number, string][]; yLabel?: string; endLabel?: string; f?: (x: number) => number }> = ({
  k,
  w,
  h,
  ticks = [],
  yLabel,
  endLabel,
  f = (x) => 0.1 + 0.9 * Math.exp(-x * 4.6),
}) => {
  const x0 = 70, x1 = w - 70, y0 = 110, y1 = h - 110;
  const N = 60;
  const m = Math.max(2, Math.round(N * clamp(k)));
  const X = (x: number) => x0 + (x1 - x0) * x;
  const P = Array.from({ length: m }, (_, i) => {
    const x = i / (N - 1);
    return [X(x), y1 - (y1 - y0) * f(x)] as [number, number];
  });
  const d = P.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${d}L${P[P.length - 1][0].toFixed(1)},${y1}L${x0},${y1}Z`;
  const last = P[P.length - 1];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={C.line2} strokeWidth={3} />
      {ticks.map(([x, lbl]) => (
        <g key={x}>
          <line x1={X(x)} x2={X(x)} y1={y1 - 10} y2={y1 + 10} stroke={C.creamMute} strokeWidth={3} />
          <text x={X(x)} y={y1 + 52} textAnchor="middle" direction="rtl" fontFamily={FA} fontWeight={800} fontSize={30} fill={C.creamDim}>
            {lbl}
          </text>
        </g>
      ))}
      <path d={area} fill={accentA(0.14)} />
      <path d={d} fill="none" stroke={C.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={12} fill={C.accent} />
      {yLabel && (
        <text x={x0} y={y0 - 40} textAnchor="end" direction="rtl" fontFamily={FA} fontWeight={800} fontSize={30} fill={C.cream}>
          {yLabel}
        </text>
      )}
      {endLabel && k > 0.95 && (
        <text x={x1} y={last[1] - 26} textAnchor="start" direction="rtl" fontFamily={FA} fontWeight={900} fontSize={32} fill={C.accent}>
          {endLabel}
        </text>
      )}
    </svg>
  );
};

/** a giant Persian number that lands on its word: «بیش از / ۶۰٪ / …» (counts up from `from`, never from 0) */
export const HeroNumber: React.FC<{ t: number; a: number; hit: number; from: number; to: number; suffix?: string; pre?: string; post?: string; size?: number; y: number; litAt?: number }> = ({ t, a, hit, from, to, suffix = "٪", pre, post, size = 300, y, litAt }) => {
  const n = Math.round(from + (to - from) * easeOut(ramp(t, a, hit + 0.1)));
  const k = easeOut(ramp(t, a - 0.1, a + 0.2));
  return (
    <div dir="rtl" style={{ position: "absolute", left: 0, width: 1080, top: y, textAlign: "center", opacity: k }}>
      {pre && <div style={{ fontFamily: FA, fontWeight: 900, fontSize: size * 0.19, color: C.creamDim, marginBottom: 2, textShadow: "0 3px 22px rgba(0,0,0,.6)" }}>{pre}</div>}
      <div style={{ display: "inline-block", fontFamily: FA, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.03em", color: t >= (litAt ?? hit) ? C.accent : C.cream, transform: `scale(${1 + 0.08 * kick(t, hit, 0.4)})`, textShadow: "0 6px 40px rgba(0,0,0,.55)" }}>
        {faNum(n)}
        {suffix}
      </div>
      {post && <div style={{ fontFamily: FA, fontWeight: 900, fontSize: size * 0.21, color: C.cream, marginTop: 10, textShadow: "0 3px 22px rgba(0,0,0,.6)" }}>{post}</div>}
    </div>
  );
};

/** a Latin multiplier badge («×3») that slams on its word */
export const Multiplier: React.FC<{ t: number; at: number; text: string; size?: number; style?: React.CSSProperties }> = ({ t, at, text, size = 150, style }) => {
  const k = easeOut(ramp(t, at - 0.05, at + 0.25));
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", opacity: k, transform: `scale(${1 + 0.6 * (1 - k) + 0.1 * kick(t, at + 0.2, 0.4)}) rotate(${-4 * k}deg)`, ...style }}>
      <span style={{ display: "inline-block", padding: `${size * 0.04}px ${size * 0.2}px`, background: C.accent, color: C.ink, borderRadius: size * 0.12, fontFamily: LATIN, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.04em", boxShadow: "0 .1em 0 rgba(0,0,0,.3)" }}>{text}</span>
    </div>
  );
};
