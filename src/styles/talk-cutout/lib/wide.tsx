// Talk Cutout · the landscape look (1920×1080) — «a tape»: smoked-glass cards with camcorder viewfinder corners, OSD
// labels in pixel type (VT323), stamps and kinetic Persian words. She stands in the middle; everything beside her lives
// in two columns (left x 70–610, right x 1310–1850, y 290–900), enters from the OUTER edge with a little blur, and sits
// BEHIND her cut-out. One card per column at a time: the previous one leaves fully (0.2–0.3 s) before the next comes.
// Full-screen sections (the method, the screens) play on «the camcorder filming a screen»: a dark stage, viewfinder
// corners, REC and a tape counter; each cut in or out of them gets a short tape glitch.
import React from "react";
import { C, F, SD, accentA } from "./theme";
import { clamp, ease, mix } from "./time";

export const WW = 1920, WH = 1080;
export const LX = 340; // centre of the left column
export const RX = 1580; // centre of the right column
export const CARD_SCALE = 0.82; // the user asked for smaller boxes beside her

/** slide in/out from the outer edge (side −1 = left column, +1 = right), with blur; returns style + visibility */
export const enter = (t: number, a: number, b: number, side: -1 | 1, dist = 160, di = 0.42, dout = 0.3, sc = CARD_SCALE) => {
  const u = t <= a ? 0 : ease.out(clamp((t - a) / di));
  const v = t <= b ? 0 : ease.in(clamp((t - b) / dout));
  const on = u * (1 - v);
  return {
    on,
    style: {
      opacity: on,
      transformOrigin: side < 0 ? "0% 0%" : "100% 0%",
      transform: `translateX(${side * ((1 - u) * dist + v * dist * 0.6)}px) scale(${sc})`,
      filter: on < 0.999 ? `blur(${(1 - u) * 10 + v * 8}px)` : undefined,
    } as React.CSSProperties,
  };
};

/** viewfinder corner brackets around a box */
export const Corners: React.FC<{ w: number; h: number; len?: number; color?: string; sw?: number; inset?: number; style?: React.CSSProperties }> = ({ w, h, len = 26, color = C.cream, sw = 3, inset = 0, style }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", ...style }}>
    {[
      [inset, inset, 1, 1],
      [w - inset, inset, -1, 1],
      [inset, h - inset, 1, -1],
      [w - inset, h - inset, -1, -1],
    ].map(([x, y, dx, dy], i) => (
      <path key={i} d={`M${x} ${y + dy * len}V${y}H${x + dx * len}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="square" />
    ))}
  </svg>
);

/** smoked-glass card with a thin edge, faint scanlines and viewfinder corners */
export const Glass: React.FC<{ w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties; corners?: boolean; hot?: number; r?: number }> = ({ w, h, children, style, corners = true, hot = 0, r = 26 }) => (
  <div style={{ position: "relative", width: w, height: h, ...style }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: r, background: "rgba(9,12,14,0.82)", border: `1.5px solid ${hot > 0 ? accentA(0.3 + 0.6 * hot) : "rgba(244,238,230,0.16)"}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)${hot > 0 ? `, 0 0 ${40 * hot}px ${accentA(0.35 * hot)}` : ""}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)" }} />
    </div>
    {corners ? <Corners w={w} h={h} len={22} sw={2.5} inset={-8} color="rgba(244,238,230,0.55)" /> : null}
    <div style={{ position: "absolute", inset: 0 }}>{children}</div>
  </div>
);

/** an OSD label in the camcorder's pixel type (Latin only; Persian labels in Lalezar beside it) */
export const Osd: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; glow?: boolean }> = ({ children, size = 34, color = C.cream, style, glow }) => (
  <span style={{ fontFamily: F.osd, fontSize: size, lineHeight: 1, letterSpacing: size * 0.06, color, direction: "ltr", unicodeBidi: "isolate", whiteSpace: "nowrap", textShadow: glow ? `0 0 ${size * 0.35}px ${color}, ${SD}` : SD, ...style }}>
    {children}
  </span>
);

/** a rubber stamp that slams in (scale 1.7 → 1, slight rotation), with an inked double border */
export const Stamp: React.FC<{ t: number; a: number; children: React.ReactNode; color?: string; size?: number; rot?: number; style?: React.CSSProperties }> = ({ t, a, children, color = C.red, size = 46, rot = -8, style }) => {
  if (t < a) return null;
  const u = clamp((t - a) / 0.16);
  const sc = mix(1.7, 1, ease.out(u)) + 0.04 * Math.exp(-(t - a - 0.16) * 14) * (u >= 1 ? 1 : 0);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: `${size * 0.16}px ${size * 0.42}px ${size * 0.2}px`, border: `${Math.max(3, size * 0.08)}px solid ${color}`, borderRadius: size * 0.18, outline: `${Math.max(1.5, size * 0.03)}px solid ${color}`, outlineOffset: size * 0.08, color, fontFamily: F.head, fontSize: size, lineHeight: 1.05, direction: "rtl", whiteSpace: "nowrap", transform: `rotate(${rot}deg) scale(${sc})`, opacity: clamp(u * 3), textShadow: "0 2px 10px rgba(0,0,0,0.35)", ...style }}>
      {children}
    </div>
  );
};

/** a big kinetic word in a column: slams (scale + blur) or rises; a red/cyan tape split on the hit when `glitch` */
export const Big: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; x: number; y: number; size?: number; color?: string; from?: "slam" | "rise"; glitch?: boolean; width?: number }> = ({ t, a, b, children, x, y, size = 150, color = C.cream, from = "slam", glitch, width = 900 }) => {
  if (t < a - 0.02 || t > b + 0.35) return null;
  const u = clamp((t - a) / 0.22), v = clamp((t - b) / 0.25);
  const e = ease.out(u);
  const sc = from === "slam" ? mix(1.5, 1, e) : 1;
  const dy = from === "rise" ? (1 - e) * 90 : 0;
  const life = 1 + 0.03 * clamp((t - a) / Math.max(0.4, b - a));
  const g = glitch ? Math.exp(-(t - a) * 7) * (0.6 + 0.4 * Math.sin((t - a) * 90)) : 0;
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: y - size, width, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ position: "relative", direction: "rtl", fontFamily: F.head, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap", textShadow: SD, opacity: e * (1 - v), filter: u < 1 || v > 0 ? `blur(${(1 - e) * 12 + v * 10}px)` : undefined, transform: `translate(0px,${dy - v * 30}px) scale(${sc * life * (1 + v * 0.1)})` }}>
        {g > 0.02 ? (
          <>
            <span style={{ position: "absolute", left: -10 * g, top: 0, color: "rgba(255,40,60,0.75)", mixBlendMode: "screen", textShadow: "none" }}>{children}</span>
            <span style={{ position: "absolute", left: 10 * g, top: 0, color: "rgba(40,230,255,0.6)", mixBlendMode: "screen", textShadow: "none" }}>{children}</span>
          </>
        ) : null}
        <span style={{ position: "relative" }}>{children}</span>
      </div>
    </div>
  );
};

/** a thin OSD progress bar [■■■■□□□] with a percentage */
export const OsdBar: React.FC<{ u: number; w: number; color?: string; label?: string; h?: number }> = ({ u, w, color = C.accent, label, h = 16 }) => (
  <div style={{ width: w }}>
    {label ? (
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <Osd size={28} color={C.dim}>{label}</Osd>
        <Osd size={28} color={color}>{`${Math.round(clamp(u) * 100)}%`}</Osd>
      </div>
    ) : null}
    <div style={{ position: "relative", width: w, height: h, borderRadius: 3, border: "1.5px solid rgba(244,238,230,0.28)", background: "rgba(0,0,0,0.35)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${clamp(u) * 100}%`, background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 10px, transparent 10px, transparent 13px)`, boxShadow: `0 0 12px ${color}` }} />
    </div>
  </div>
);

const DOT = ["..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."];
/** the camcorder REC (pixel dot + REC). If the speaker's own footage carries a REC, MEASURE its place, size and colour on
 *  a source frame and pass them here (it must sit exactly on hers where her picture cross-fades into the black parts),
 *  and give it the same push-in scale as her picture. */
export const Rec: React.FC<{ t: number; x?: number; y?: number; size?: number; color?: string; scale?: number; origin?: string }> = ({ t, x = 74, y = 172, size = 139, color = "rgb(188,55,47)", scale = 1, origin = "980px 430px" }) => {
  const b = 0.5 + 0.5 * Math.cos((2 * Math.PI * t) / 0.75); // a smooth pulse, 0.75 s period
  const px = size * 0.0536;
  const dot = (fill: string, k: string) => DOT.flatMap((row, j) => [...row].map((c, i) => (c === "#" ? <rect key={`${k}${i}-${j}`} x={i * px} y={j * px} width={px + 0.4} height={px + 0.4} fill={fill} /> : null)));
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: origin, transform: `scale(${scale})`, pointerEvents: "none" }}>
      <svg width={7 * px} height={7 * px} viewBox={`0 0 ${7 * px} ${7 * px}`} style={{ position: "absolute", left: x, top: y + size * 0.27 }}>
        {dot("rgb(96,84,80)", "g")}
        <g opacity={b}>{dot(color, "r")}</g>
      </svg>
      <span style={{ position: "absolute", left: x + 7 * px + size * 0.33, top: y, fontFamily: F.osd, fontSize: size * 0.62, lineHeight: 1.45, color, whiteSpace: "nowrap" }}>REC</span>
    </div>
  );
};

/** the tape counter «SP ▶ 0:00:12» (bottom-left of the stage) */
export const TapeCounter: React.FC<{ t: number; x?: number; y?: number }> = ({ t, x = 104, y = WH - 150 }) => {
  const mm = String(Math.floor(t / 60)).padStart(2, "0"), ss = String(Math.floor(t % 60)).padStart(2, "0");
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <Osd size={36} color={C.faint}>{`SP ▶ 0:${mm}:${ss}`}</Osd>
    </div>
  );
};

/** the full-screen stage: the camcorder now films a screen */
export const Stage: React.FC<{ t: number; rec?: React.ReactNode }> = ({ t, rec }) => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 75% at 50% 48%, #17110d 0%, #0b0807 62%, #050403 100%)" }} />
    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px)" }} />
    <Corners w={WW - 128} h={WH - 128} len={60} sw={3} color="rgba(244,238,230,0.3)" style={{ left: 64, top: 64 }} />
    {rec ?? <Rec t={t} />}
    <TapeCounter t={t} />
  </>
);

/** a short tape glitch on each cut in or out of a full-screen window: dark tracking bands and bright lines (0.16 s) */
export const TapeCut: React.FC<{ t: number; cuts: number[] }> = ({ t, cuts }) => {
  const c = cuts.find((x) => t >= x && t < x + 0.16);
  if (c === undefined) return null;
  const k = 1 - (t - c) / 0.16;
  const bands: [number, number][] = [[0.18, 26], [0.47, 44], [0.71, 18], [0.86, 30]];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: k }}>
      {bands.map(([y, h], i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${(y * 100 + ((t - c) * 900 + i * 37) % 9).toFixed(1)}%`, height: h, background: i % 2 ? "rgba(0,0,0,0.55)" : "rgba(10,6,4,0.7)", borderTop: "2px solid rgba(244,238,230,0.35)" }} />
      ))}
    </div>
  );
};

/** a sub-scene [a, b] inside a full-screen window: scales in from 0.94 with blur, leaves with blur */
export const sub = (t: number, a: number, b: number, di = 0.32, dout = 0.22) => {
  const u = t <= a ? 0 : ease.out(clamp((t - a) / di));
  const v = t <= b ? 0 : ease.in(clamp((t - b) / dout));
  const on = u * (1 - v);
  return { on, style: { opacity: on, transform: `scale(${mix(0.94, 1, u) * (1 + 0.04 * v)})`, filter: on < 0.999 ? `blur(${(1 - u) * 10 + v * 8}px)` : undefined } as React.CSSProperties };
};
