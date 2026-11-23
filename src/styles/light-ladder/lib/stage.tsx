// Light Ladder · the stage: Backdrop (a glow of the light colour + a faint giant word + slow contour rings + a
// perspective floor), Orb (the light point), Stairs (oblique obsidian blocks with lit edges, a glossy reflection,
// ghost / unconfirmed states), DotHead (a human head of light dots: islands = narrow skills, a full sweep = human
// level), Medallion (a portrait — or a monogram — on a scale), small plots, a stamp and line icons for fields.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, FA, LATIN, MONO, clamp, easeOut, lerp, lightA, rgb, rng } from "./theme";

/** "r,g,b" of the light colour / its hot core (read at render time, so setPalette works) */
const L = () => rgb(C.light).join(",");
const LH = () => rgb(C.lightHot).join(",");

// ─── backdrop ──────────────────────────────────────────────────────────────────────────────────────────────
const ring = (cx: number, cy: number, R: number, t: number, i: number) => {
  let d = "";
  for (let a = 0; a <= Math.PI * 2 + 0.001; a += 0.07) {
    const r = R * (1 + 0.05 * Math.sin(3 * a + 0.25 * t + i) + 0.035 * Math.sin(5 * a - 0.18 * t + 2 * i));
    d += `${a === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + 1.12 * r * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
};
/** the stage behind the concept scenes: never a plain black studio */
export const Backdrop: React.FC<{ t: number; word?: string; k?: number; glow?: number; gy?: number; horizon?: number; floor?: number }> = ({ t, word, k = 1, glow = 1, gy = 860, horizon = 1240, floor = 1 }) => {
  if (k <= 0) return null;
  const rows: number[] = [];
  const sc = (t * 0.55) % 1;
  for (let j = 0; j < 16; j++) rows.push(horizon + 900 / (1.15 + j + 1 - sc));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: k, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 42% at 50% ${(gy / 1920) * 100}%, rgba(${L()},${0.15 * glow}) 0%, rgba(${L()},${0.05 * glow}) 45%, rgba(5,5,7,0) 75%), linear-gradient(180deg, #07070B 0%, #050507 60%, #08070A 100%)` }} />
      {word && (
        <div style={{ position: "absolute", left: 0, top: gy - 230, width: 1080, display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 290, letterSpacing: "0.04em", color: "rgba(242,241,245,.035)", whiteSpace: "nowrap", transform: `translateX(${Math.sin(t * 0.12) * 40}px)` }}>{word}</span>
        </div>
      )}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="bdFloor" x1="0" y1={horizon} x2="0" y2={1920} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.light} stopOpacity={0} />
            <stop offset="0.35" stopColor={C.light} stopOpacity={0.15 * floor} />
            <stop offset="1" stopColor={C.light} stopOpacity={0.26 * floor} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={ring(540, gy, 210 + i * 125, t, i)} fill="none" stroke={`rgba(${L()},${0.14 - i * 0.016})`} strokeWidth={1.8} />
        ))}
        {floor > 0 && (
          <g stroke="url(#bdFloor)" strokeWidth={1.4}>
            {rows.filter((y) => y < 1920).map((y, j) => (
              <line key={`h${j}`} x1={0} x2={1080} y1={y} y2={y} />
            ))}
            {Array.from({ length: 17 }, (_, i) => i - 8).map((X) => (
              <line key={`v${X}`} x1={540 + X * 520} y1={horizon + 780} x2={540 + X * 3} y2={horizon} />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

// ─── the light point ───────────────────────────────────────────────────────────────────────────────────────
export const Orb: React.FC<{ x: number; y: number; r: number; k?: number; pulse?: number }> = ({ x, y, r, k = 1, pulse = 0 }) => {
  if (k <= 0) return null;
  const R = r * (1 + 0.3 * pulse);
  return (
    <div style={{ position: "absolute", left: x - R * 4, top: y - R * 4, width: R * 8, height: R * 8, opacity: k, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: `radial-gradient(circle, rgba(${L()},${0.42 + 0.25 * pulse}) 0%, rgba(${L()},.12) 30%, rgba(${L()},0) 62%)` }} />
      <div style={{ position: "absolute", left: R * 3, top: R * 3, width: R * 2, height: R * 2, borderRadius: 999, background: `radial-gradient(circle at 50% 42%, #FFFFFF 0%, ${C.lightHot} 36%, ${C.light} 100%)`, boxShadow: `0 0 ${R * 1.4}px rgba(${LH()},.9)` }} />
    </div>
  );
};

// ─── the stairs ────────────────────────────────────────────────────────────────────────────────────────────
export type Step = { h: number; lit: number; ghost?: number; doubt?: number; name: string; num: string; fa: string; show?: number };
export type StairGeo = { floorY: number; x: number[]; w: number; d: [number, number] };
/** top-face centre of step i (screen px) */
export const stepTop = (g: StairGeo, s: Step[], i: number) => ({ x: g.x[i] + g.w / 2 + g.d[0] / 2, y: g.floorY - s[i].h + g.d[1] / 2 });
const P = (pts: [number, number][]) => pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
export const Stairs: React.FC<{ g: StairGeo; steps: Step[]; t: number; reflect?: number }> = ({ g, steps, t, reflect = 1 }) => {
  const LT = rgb(C.light), LH = rgb(C.lightHot);
  const order = steps.map((_, i) => i).sort((a, b) => g.x[a] - g.x[b]); // left first: the right ones overlap
  const block = (i: number, mirror = false) => {
    const s = steps[i];
    if (s.h <= 0.5) return null;
    const x0 = g.x[i], x1 = x0 + g.w, yT = g.floorY - s.h, yF = g.floorY, [dx, dy] = g.d;
    const ghost = s.ghost ?? 0, doubt = s.doubt ?? 0;
    const solid = 1 - ghost;
    const lit = s.lit;
    const edge = lightA(0.38 + 0.55 * lit, lit > 0.5 ? C.lightHi : C.light);
    const dash = ghost > 0.5 || doubt > 0.5 ? "14 10" : undefined;
    return (
      <g key={`${i}${mirror ? "m" : ""}`}>
        {/* side */}
        <polygon points={P([[x1, yT], [x1 + dx, yT + dy], [x1 + dx, yF + dy], [x1, yF]])} fill={`rgba(9,9,14,${0.96 * solid})`} stroke={edge} strokeWidth={2} strokeDasharray={dash} />
        {/* front */}
        <polygon points={P([[x0, yT], [x1, yT], [x1, yF], [x0, yF]])} fill={`url(#stFront${i})`} fillOpacity={solid} stroke={edge} strokeWidth={2.4} strokeDasharray={dash} />
        {/* top */}
        <polygon points={P([[x0, yT], [x1, yT], [x1 + dx, yT + dy], [x0 + dx, yT + dy]])} fill={`url(#stTop${i})`} fillOpacity={Math.max(solid, 0.25 * lit)} stroke={edge} strokeWidth={2.6} strokeDasharray={dash} />
        {!mirror && lit > 0.02 && <line x1={x0} y1={yT} x2={x1} y2={yT} stroke={C.lightHi} strokeWidth={3} strokeOpacity={lit} style={{ filter: `drop-shadow(0 0 8px rgba(${L()},.9))` }} />}
      </g>
    );
  };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <linearGradient id={`stFront${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.lit > 0 ? `rgb(${lerp(20, LT[0] * 0.24, s.lit)},${lerp(20, LT[1] * 0.24, s.lit)},${lerp(30, LT[2] * 0.24, s.lit)})` : "#14141E"} />
              <stop offset="0.5" stopColor="#0B0B12" />
              <stop offset="1" stopColor="#060609" />
            </linearGradient>
            <radialGradient id={`stTop${i}`} cx="0.5" cy="0.5" r="0.75">
              <stop offset="0" stopColor={`rgb(${lerp(34, LH[0], s.lit)},${lerp(34, LH[1], s.lit)},${lerp(48, LH[2], s.lit)})`} />
              <stop offset="1" stopColor={`rgb(${lerp(22, LT[0] * 0.6, s.lit)},${lerp(22, LT[1] * 0.6, s.lit)},${lerp(32, LT[2] * 0.6, s.lit)})`} />
            </radialGradient>
          </React.Fragment>
        ))}
        <linearGradient id="stRefl" x1="0" y1={g.floorY} x2="0" y2={g.floorY + 380} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={0.22 * reflect} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="stReflM" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={4000}>
          <rect x={0} y={g.floorY} width={1080} height={420} fill="url(#stRefl)" />
        </mask>
      </defs>
      {reflect > 0 && <g mask="url(#stReflM)">
        <g transform={`translate(0 ${2 * g.floorY}) scale(1 -1)`}>{order.map((i) => block(i, true))}</g>
      </g>}
      {order.map((i) => block(i))}
      {/* front labels */}
      {steps.map((s, i) => {
        if (s.h < 70 || (s.show ?? 1) <= 0) return null;
        const x0 = g.x[i], yT = g.floorY - s.h;
        const k = s.show ?? 1;
        const nameSize = Math.min(78, g.w * 0.3);
        return (
          <g key={`l${i}`} opacity={k * (1 - 0.5 * (s.ghost ?? 0))}>
            <text x={x0 + g.w / 2} y={yT + 46} textAnchor="middle" fontFamily={MONO} fontSize={19} letterSpacing="0.3em" fill={C.light300} fillOpacity={0.75 + 0.25 * s.lit}>{s.num}</text>
            <text x={x0 + g.w / 2} y={yT + 46 + nameSize * 0.95} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={nameSize} fill={s.lit > 0.5 ? C.lightHi : C.fg}>{s.name}</text>
            {s.h > 200 && (
              <text x={x0 + g.w / 2} y={yT + 46 + nameSize * 0.95 + 50} textAnchor="middle" direction="rtl" fontFamily={FA} fontWeight={800} fontSize={34} fill={C.fgDim}>{s.fa}</text>
            )}
            {(s.doubt ?? 0) > 0.02 && (
              <text x={x0 + g.w / 2} y={yT - 26} textAnchor="middle" fontFamily={FA} fontWeight={900} fontSize={72} fill={C.light} fillOpacity={s.doubt} style={{ filter: `drop-shadow(0 0 12px rgba(${L()},.6))` }}>؟</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── a human head of light dots ────────────────────────────────────────────────────────────────────────────
// head in profile, facing right (nose to the right), in a 640 × 780 box
const HEAD: [number, number][] = [
  [200, 780], [205, 650], [150, 596], [92, 524], [56, 432], [46, 330], [66, 230], [116, 142], [192, 82], [292, 46], [392, 48],
  [472, 86], [528, 152], [552, 226], [556, 282], [578, 322], [606, 372], [600, 394], [572, 402], [578, 430], [562, 446],
  [570, 470], [556, 492], [560, 522], [540, 552], [500, 568], [458, 578], [434, 612], [424, 690], [420, 780],
];
const inPoly = (x: number, y: number, p: [number, number][]) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const GRID = 21;
const DOTS: { x: number; y: number; ph: number }[] = (() => {
  const r = rng(84);
  const out: { x: number; y: number; ph: number }[] = [];
  for (let row = 0; row * GRID * 0.866 < 780; row++) {
    const y = 10 + row * GRID * 0.866;
    for (let x = 10 + (row % 2) * (GRID / 2); x < 640; x += GRID) if (inPoly(x, y, HEAD)) out.push({ x, y, ph: r() * Math.PI * 2 });
  }
  return out;
})();
const smooth = (p: [number, number][]) => {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};
const HEAD_D = smooth(HEAD);
export type Island = { x: number; y: number; r: number; k: number };
/** islands (narrow skills) light patches; fill sweeps from the face to the back (human-level); spill pushes dots out */
export const DotHead: React.FC<{ t: number; x: number; y: number; s: number; k: number; islands?: Island[]; fill?: number; dim?: number; outline?: number }> = ({ t, x, y, s, k, islands = [], fill = 0, dim = 1, outline = 1 }) => {
  if (k <= 0) return null;
  const lv = DOTS.map((d) => {
    let v = 0.07;
    for (const is of islands) {
      if (is.k <= 0) continue;
      const dd = Math.hypot(d.x - is.x, d.y - is.y);
      v = Math.max(v, is.k * clamp(1 - (dd - is.r * 0.55) / (is.r * 0.45)));
    }
    if (fill > 0) {
      const front = 1 - d.x / 640; // 0 at the face, 1 at the back
      v = Math.max(v, clamp((fill * 1.25 - front) / 0.25));
    }
    return v * (0.82 + 0.18 * Math.sin(t * 3.1 + d.ph)) * dim;
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 640, height: 780, transform: `scale(${s})`, transformOrigin: "0 0", opacity: easeOut(clamp(k)) }}>
      <svg width={640} height={780} style={{ overflow: "visible" }}>
        <path d={HEAD_D} fill={`rgba(${L()},.025)`} stroke={C.light} strokeOpacity={0.55 * outline} strokeWidth={2.4} style={{ filter: `drop-shadow(0 0 10px rgba(${L()},.45))` }} />
        <g fill={C.lightHi}>
          {DOTS.map((d, i) => (lv[i] > 0.3 ? <circle key={`g${i}`} cx={d.x} cy={d.y} r={9} fillOpacity={0.12 * lv[i]} /> : null))}
        </g>
        <g fill={C.light}>
          {DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={3.6 + 1.2 * lv[i]} fillOpacity={0.12 + 0.88 * lv[i]} />
          ))}
        </g>
      </svg>
    </div>
  );
};
export const HEAD_BOX = { w: 640, h: 780 };

// ─── portraits on the intelligence scale ───────────────────────────────────────────────────────────────────
export const Medallion: React.FC<{ src?: string; initials?: string; x: number; y: number; size: number; k: number; fa: string; en: string; pos?: string; side?: "left" | "right" }> = ({ src, initials, x, y, size, k, fa, en, pos = "50% 30%", side = "right" }) => {
  if (k <= 0) return null;
  const e = easeOut(clamp(k));
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", boxShadow: `0 0 0 3px ${C.light300}, 0 0 40px rgba(${L()},.35), 0 24px 60px rgba(0,0,0,.6)` }}>
        {src ? (
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: "grayscale(1) contrast(1.12) brightness(1.04) sepia(.18)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 40% 35%, #2A2A33, #0B0B10 75%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: LATIN, fontWeight: 300, fontSize: size * 0.36, letterSpacing: size * 0.02, color: C.fg }}>{initials ?? en.split(" ").map((w) => w[0]).join("")}</div>
        )}
      </div>
      <div dir="rtl" style={{ position: "absolute", top: size / 2 - 44, [side === "right" ? "left" : "right"]: size + 26, display: "flex", flexDirection: "column", alignItems: side === "right" ? "flex-start" : "flex-end", gap: 4, whiteSpace: "nowrap" } as React.CSSProperties}>
        <span style={{ fontFamily: FA, fontWeight: 850, fontSize: 46, color: C.fg, textShadow: "0 3px 16px rgba(0,0,0,.8)" }}>{fa}</span>
        <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: ".22em", color: C.light300 }}>{en}</span>
      </div>
    </div>
  );
};

// ─── small plots for the unsolved problems ─────────────────────────────────────────────────────────────────
// the first ten non-trivial zeros of ζ on the critical line Re(s) = 1/2 (imaginary parts)
const ZEROS = [14.135, 21.022, 25.011, 30.425, 32.935, 37.586, 40.919, 43.327, 48.005, 49.774];
export const ZetaPlot: React.FC<{ w: number; h: number; k: number }> = ({ w, h, k }) => {
  const n = Math.round(ZEROS.length * clamp(k));
  const X = (re: number) => w * 0.18 + re * w * 0.64, Y = (im: number) => h - 14 - (im / 52) * (h - 28);
  return (
    <svg width={w} height={h}>
      <line x1={X(0)} y1={8} x2={X(0)} y2={h - 8} stroke={C.line2} strokeWidth={1.5} />
      <line x1={X(1)} y1={8} x2={X(1)} y2={h - 8} stroke={C.line2} strokeWidth={1.5} />
      <line x1={X(0.5)} y1={8} x2={X(0.5)} y2={h - 8} stroke={C.light} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="6 6" />
      {ZEROS.slice(0, n).map((z, i) => (
        <circle key={i} cx={X(0.5)} cy={Y(z)} r={5} fill={C.lightHi} />
      ))}
      <text x={X(0.5) + 10} y={20} fontFamily={MONO} fontSize={15} fill={C.light300}>Re(s) = ½</text>
    </svg>
  );
};
export const VennPlot: React.FC<{ w: number; h: number; k: number; t: number }> = ({ w, h, k, t }) => {
  const e = easeOut(clamp(k));
  const cx = w / 2, cy = h / 2;
  return (
    <svg width={w} height={h}>
      <ellipse cx={cx} cy={cy} rx={w * 0.42} ry={h * 0.42} fill={`rgba(${L()},.05)`} stroke={C.light300} strokeWidth={2} strokeOpacity={e} />
      <ellipse cx={cx - w * 0.12 + Math.sin(t * 1.4) * 4} cy={cy + 6} rx={w * 0.2 * e} ry={h * 0.24 * e} fill={`rgba(${L()},.12)`} stroke={C.light} strokeWidth={2} />
      <text x={cx - w * 0.12} y={cy + 14} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={30} fill={C.fg} opacity={e}>P</text>
      <text x={cx + w * 0.22} y={cy - h * 0.18} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={26} fill={C.light300} opacity={e}>NP</text>
      <text x={cx + w * 0.14} y={cy + 30} textAnchor="middle" fontFamily={FA} fontWeight={900} fontSize={38} fill={C.light} opacity={e * (0.6 + 0.4 * Math.sin(t * 4) ** 2)}>؟</text>
    </svg>
  );
};
export const FlowPlot: React.FC<{ w: number; h: number; k: number; t: number }> = ({ w, h, k, t }) => {
  const n = 7;
  const lines = Array.from({ length: n }, (_, i) => {
    const y0 = 16 + (i * (h - 32)) / (n - 1);
    let d = "";
    for (let x = 0; x <= w; x += 8) {
      const bump = Math.exp(-Math.pow((x - w * 0.5) / (w * 0.16), 2)) * (h * 0.22) * Math.sign(y0 - h / 2);
      const y = y0 + bump * 0.9 + Math.sin(x * 0.045 - t * 3 + i) * 4;
      d += `${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`;
    }
    return d;
  });
  return (
    <svg width={w} height={h}>
      <circle cx={w / 2} cy={h / 2} r={h * 0.15} fill={`rgba(${L()},.12)`} stroke={C.light300} strokeWidth={2} />
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={C.light} strokeOpacity={0.25 + 0.5 * clamp(k * n - i)} strokeWidth={2} />
      ))}
    </svg>
  );
};

/** a rubber stamp that slams onto a card */
export const Stamp: React.FC<{ k: number; fa: string; en?: string; rot?: number; size?: number; color?: string }> = ({ k, fa, en, rot = -8, size = 34, color = C.light }) => {
  if (k <= 0) return null;
  const e = clamp(k);
  const sc = e < 1 ? lerp(1.8, 1, easeOut(e)) : 1;
  return (
    <div dir="rtl" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 16px 8px", borderRadius: 10, border: `3px solid ${color}`, color, transform: `rotate(${rot}deg) scale(${sc})`, opacity: Math.min(1, e * 2), background: "rgba(5,5,7,.55)", whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: FA, fontWeight: 900, fontSize: size }}>{fa}</span>
      {en && <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: size * 0.5, letterSpacing: ".18em" }}>{en}</span>}
    </div>
  );
};

/** a tiny line icon set for the fields grid (24-unit viewBox) */
export const FieldIcon: React.FC<{ n: string; size: number; color?: string }> = ({ n, size, color = C.light300 }) => {
  const p: Record<string, React.ReactNode> = {
    math: <path d="M5 6h14M8 6v12M16 6c0 6 0 8 2 12M4 18h6" />,
    code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
    med: <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />,
    phys: <g><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.6" /></g>,
    chem: <path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 001.3 2h13.4a1.5 1.5 0 001.3-2L14 9V3M7 15h10" />,
    bio: <path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12M8 7h8M8 17h8" />,
    law: <path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z" />,
    econ: <path d="M3 20h18M5 16l5-5 4 3 6-7M15 7h5v5" />,
    art: <path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 004-4c0-4.5-4-8-9-8zM7.5 11h.01M10 7h.01M14.5 7h.01" />,
    music: <path d="M9 18V5l11-2v13M9 18a3 3 0 11-3-3 3 3 0 013 3zM20 16a3 3 0 11-3-3 3 3 0 013 3z" />,
    lang: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
    eng: <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {p[n]}
    </svg>
  );
};

export const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
export const hop = (a: { x: number; y: number }, b: { x: number; y: number }, k: number, hgt: number) => {
  const p = lerpPt(a, b, k);
  return { x: p.x, y: p.y - Math.sin(Math.PI * clamp(k)) * hgt };
};
