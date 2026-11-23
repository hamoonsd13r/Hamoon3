// Archive Doc · the report sketch: a top-down ink drawing on aged paper, like an after-action report or a field
// diary — typed labels, a header line, a north arrow and a scale bar, and the pieces you place on it: tokens (a vehicle,
// a unit, a building, an aircraft), paths that draw themselves, dashed arrows with heads, grass and dune hatching,
// crosses and flashes. One continuous state driven by narration times, so every cut back to it shows the story moved on.
import React, { useMemo } from "react";
import { C, F, H, W, clamp, ease, hash, mix, ramp } from "./theme";

export type Pt = [number, number];
export const INK = "#2a241b";
export const INK2 = "rgba(42,36,27,0.55)";
export const RED = "#a3311f";
export const BRASS = "#8a6416";

/** typed label (reveals letter by letter as u goes 0→1). RTL anchors: "start" = right edge on x (text runs left),
 *  "end" = left edge on x (text runs right), "middle" = centred */
export const Lbl: React.FC<{ x: number; y: number; s: string; u: number; size?: number; color?: string; anchor?: "start" | "middle" | "end" }> = ({ x, y, s, u, size = 26, color = INK, anchor = "middle" }) => {
  if (u <= 0) return null;
  const n = Math.round(clamp(u) * [...s].length);
  return (
    <text x={x} y={y} fontFamily={F.mono} fontSize={size} fill={color} textAnchor={anchor} direction="rtl" style={{ unicodeBidi: "plaintext" }}>
      {[...s].slice(0, n).join("")}
    </text>
  );
};

/** grass tufts (deterministic) in a box */
export const Grass: React.FC<{ x0: number; y0: number; x1: number; y1: number; n: number; seed: number; o?: number }> = ({ x0, y0, x1, y1, n, seed, o = 1 }) => (
  <g stroke={INK2} strokeWidth={1.9} strokeLinecap="round" opacity={o}>
    {Array.from({ length: n }, (_, i) => {
      const x = mix(x0, x1, hash(seed + i * 1.7)), y = mix(y0, y1, hash(seed + i * 3.1));
      return <path key={i} d={`M${x - 5},${y} l2,-10 M${x},${y} l0,-13 M${x + 5},${y} l-2,-10`} fill="none" />;
    })}
  </g>
);

/** dune / hill contours: n nested wavy ellipses around (cx, cy) */
export const Dune: React.FC<{ cx: number; cy: number; rx: number; ry: number; n?: number; seed?: number; o?: number }> = ({ cx, cy, rx, ry, n = 4, seed = 1, o = 1 }) => (
  <g fill="none" stroke={INK2} strokeWidth={1.8} opacity={o}>
    {Array.from({ length: n }, (_, k) => {
      const s = 1 - k / (n + 0.5);
      const pts = Array.from({ length: 33 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const wob = 1 + 0.06 * Math.sin(a * 3 + seed + k) + 0.04 * Math.sin(a * 5 + seed * 2);
        return `${i ? "L" : "M"}${(cx + Math.cos(a) * rx * s * wob).toFixed(1)},${(cy + Math.sin(a) * ry * s * wob).toFixed(1)}`;
      });
      return <path key={k} d={pts.join("") + "Z"} />;
    })}
  </g>
);

/** a token seen from above: "box" (vehicle/unit), "house", "plane"; side colours the outline (us = ink, them = red) */
export const Token: React.FC<{ x: number; y: number; a?: number; kind?: "box" | "house" | "plane"; side?: "us" | "them"; o?: number; flash?: number; dead?: boolean; s?: number }> = ({ x, y, a = 0, kind = "box", side = "us", o = 1, flash = 0, dead, s = 1 }) => {
  if (o <= 0) return null;
  const stroke = side === "us" ? INK : RED, fill = side === "us" ? "#e9d9a8" : "#e7c2b3";
  return (
    <g transform={`translate(${x},${y}) rotate(${a}) scale(${s})`} opacity={o}>
      {kind === "box" ? <rect x={-13} y={-22} width={26} height={44} rx={3} fill={fill} stroke={stroke} strokeWidth={2.4} /> : null}
      {kind === "house" ? (
        <g>
          <rect x={-24} y={-16} width={48} height={32} fill={fill} stroke={stroke} strokeWidth={2.4} />
          <line x1={-24} y1={0} x2={24} y2={0} stroke={stroke} strokeWidth={1.6} />
        </g>
      ) : null}
      {kind === "plane" ? (
        <g stroke={stroke} strokeWidth={2.4} fill={fill} strokeLinejoin="round">
          <rect x={-62} y={-9} width={124} height={18} rx={3} />
          <line x1={0} y1={-9} x2={0} y2={-30} />
          <rect x={-14} y={-44} width={28} height={12} rx={2} />
          <rect x={-10} y={14} width={20} height={26} rx={2} fill="none" />
        </g>
      ) : null}
      {flash > 0 ? <path d="M0,-36 l-9,-16 l9,6 l9,-6 z" fill="#c8892a" opacity={flash} /> : null}
      {dead ? (
        <g stroke={RED} strokeWidth={3.5}>
          <line x1={-16} y1={-16} x2={16} y2={16} />
          <line x1={16} y1={-16} x2={-16} y2={16} />
        </g>
      ) : null}
    </g>
  );
};

/** a path that draws itself (u 0→1), solid or dashed, with an optional arrow head at the pen */
export const Trail: React.FC<{ pts: Pt[]; u: number; color?: string; width?: number; dash?: string; head?: boolean }> = ({ pts, u, color = INK, width = 3, dash, head = true }) => {
  if (u <= 0 || pts.length < 2) return null;
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const L = segs.reduce((s, x) => s + x, 0);
  let left = L * clamp(u), j = 0;
  const out: Pt[] = [pts[0]];
  while (j < segs.length && left > segs[j]) { left -= segs[j]; out.push(pts[j + 1]); j++; }
  if (j < segs.length) { const a = pts[j], b = pts[j + 1], f = left / segs[j]; out.push([mix(a[0], b[0], f), mix(a[1], b[1], f)]); }
  const d = out.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [ex, ey] = out[out.length - 1], [px, py] = out[Math.max(0, out.length - 2)];
  const ang = (Math.atan2(ey - py, ex - px) * 180) / Math.PI;
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />
      {head && u < 1.0001 ? <path d="M2,0 L-14,-7 L-10,0 L-14,7 Z" fill={color} transform={`translate(${ex} ${ey}) rotate(${ang})`} /> : null}
    </g>
  );
};

/** the aged-paper sheet with a typed header, a north arrow and a scale bar; children are drawn in sheet space,
 *  moved by `view` = [centre x, centre y, zoom] */
export const ReportSheet: React.FC<{ t: number; a: number; b: number; header: string; scale?: string; scalePx?: number; view?: [number, number, number]; children: React.ReactNode }> = ({ t, a, b, header, scale = "۱۰۰ متر", scalePx = 110, view = [960, 560, 1], children }) => {
  const v = ease.out(ramp(t, a, a + 0.5)) * (1 - ease.in(ramp(t, b - 0.4, b)));
  const tex = useMemo(() => Array.from({ length: 160 }, (_, i) => [hash(i * 2.3) * W, hash(i * 5.1) * H, 0.5 + hash(i * 7.7) * 2.5]), []);
  if (v <= 0) return null;
  const [vx, vy, vz] = view;
  const cam = `translate(${W / 2 - vx * vz},${H / 2 - vy * vz}) scale(${vz})`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, background: C.paper, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="arbr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={BRASS} />
          </marker>
          <filter id="arpaperf" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.33  0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0.13 0" />
          </filter>
          <filter id="arpaperc" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="3" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.18  0 0 0 0.16 0" />
          </filter>
        </defs>
        <rect width={W} height={H} filter="url(#arpaperc)" />
        <rect width={W} height={H} filter="url(#arpaperf)" />
        {tex.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="rgba(90,70,40,0.07)" />
        ))}
        <line x1={0} y1={H * 0.52} x2={W} y2={H * 0.5} stroke="rgba(90,70,40,0.1)" strokeWidth={2} />
        <g transform={cam}>{children}</g>
        <text x={W - 70} y={70} fontFamily={F.mono} fontSize={28} fill={INK} textAnchor="start" direction="rtl" style={{ unicodeBidi: "plaintext" }}>
          {header}
        </text>
        <line x1={W - 70} y1={88} x2={W - 720} y2={88} stroke={INK} strokeWidth={2} />
        <g transform="translate(110,120)">
          <line x1={0} y1={40} x2={0} y2={-30} stroke={INK} strokeWidth={3} markerEnd="url(#arbr)" />
          <text x={0} y={70} fontFamily={F.mono} fontSize={26} fill={INK} textAnchor="middle">
            شمال
          </text>
        </g>
        <g transform={`translate(110,${H - 80})`}>
          <line x1={0} y1={0} x2={scalePx * vz} y2={0} stroke={INK} strokeWidth={4} />
          <text x={(scalePx / 2) * vz} y={-14} fontFamily={F.mono} fontSize={22} fill={INK} textAnchor="middle">
            {scale}
          </text>
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(95% 85% at 50% 45%, transparent 60%, rgba(60,45,25,0.32) 100%)" }} />
    </div>
  );
};
