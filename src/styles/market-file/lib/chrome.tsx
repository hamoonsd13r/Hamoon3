// Market File · the frame around the story: HUD corners with the file label, film grain, the scene eyebrow that
// changes per chapter, your brand tile / mark, the camera shake on slams, and the accent FLOOD (the style's
// signature transition: the frame fills with the accent and the question is set in ink).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FA, INK, LATIN, easeCinema, easeOut, kick, ramp } from "./theme";
import { Eyebrow, MonoLbl, type On } from "./type";

/** thin corner brackets + four mono labels (tl, tr, bl, br) */
export const Hud: React.FC<{ inset?: number; len?: number; color?: string; tl?: string; tr?: string; bl?: string; br?: string; labelColor?: string; w?: number; h?: number }> = ({
  inset = 40,
  len = 34,
  color = C.line2,
  tl,
  tr,
  bl,
  br,
  labelColor = C.creamMute,
  w = 1080,
  h = 1920,
}) => {
  const b = `2px solid ${color}`;
  const corner = (s: React.CSSProperties) => <div style={{ position: "absolute", width: len, height: len, ...s }} />;
  const lbl = (s: React.CSSProperties, txt?: string) =>
    txt ? (
      <div style={{ position: "absolute", ...s }}>
        <MonoLbl size={18} color={labelColor}>
          {txt}
        </MonoLbl>
      </div>
    ) : null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {corner({ top: inset, left: inset, borderTop: b, borderLeft: b })}
      {corner({ top: inset, left: w - inset - len, borderTop: b, borderRight: b })}
      {corner({ top: h - inset - len, left: inset, borderBottom: b, borderLeft: b })}
      {corner({ top: h - inset - len, left: w - inset - len, borderBottom: b, borderRight: b })}
      {lbl({ top: inset + 6, left: inset + len + 18 }, tl)}
      {lbl({ top: inset + 6, right: inset + len + 18 }, tr)}
      {lbl({ bottom: inset + 6, left: inset + len + 18 }, bl)}
      {lbl({ bottom: inset + 6, right: inset + len + 18 }, br)}
    </AbsoluteFill>
  );
};

/** film grain (SVG turbulence, overlay blend); change `seed` ~12×/s for living grain */
export const Grain: React.FC<{ opacity?: number; seed?: number }> = ({ opacity = 0.08, seed = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
    <svg width="100%" height="100%">
      <filter id={`mfgrain${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#mfgrain${seed})`} />
    </svg>
  </AbsoluteFill>
);

/** chapters: [start time, Persian label, MONO label] — the eyebrow under the brand tile slides in on each chapter */
export type BrowItem = [number, string, string];
export const Brow: React.FC<{ t: number; items: BrowItem[]; on?: On; x?: number; y?: number; w?: number }> = ({ t, items, on = "dark", x = 186, y = 244, w = 804 }) => {
  const i = items.reduce((acc, b, k) => (t >= b[0] ? k : acc), 0);
  const [a, fa, mono] = items[i];
  const k = i === 0 ? 1 : easeOut(ramp(t, a, a + 0.4));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
      <Eyebrow n={i + 1} fa={fa} mono={mono} size={20} on={on} />
    </div>
  );
};

/** your brand in the corner: your logo file (public/…) or a neutral tile (ring + accent dot) */
export const BrandTile: React.FC<{ size?: number; logo?: string; on?: On }> = ({ size = 64, logo, on = "dark" }) =>
  logo ? (
    <Img src={staticFile(logo)} style={{ width: size, height: size, objectFit: "contain" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: on === "dark" ? C.ink3 : C.ink, border: `2px solid ${on === "dark" ? C.line2 : INK.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size * 0.34, height: size * 0.34, transform: "rotate(45deg)", border: `${size * 0.06}px solid ${on === "dark" ? C.cream : C.cream}`, borderRadius: size * 0.04, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: size * 0.1, height: size * 0.1, background: C.accent, borderRadius: size * 0.02 }} />
      </div>
    </div>
  );

/** the end card's brand line: your logo, or the name in type with an accent dot */
export const BrandMark: React.FC<{ name?: string; logo?: string; size?: number; color?: string; dot?: string }> = ({ name = "برند شما", logo, size = 110, color = C.ink, dot }) =>
  logo ? (
    <Img src={staticFile(logo)} style={{ height: size, objectFit: "contain" }} />
  ) : (
    <div dir="rtl" style={{ display: "inline-flex", alignItems: "baseline", gap: size * 0.08, fontFamily: /[؀-ۿ]/.test(name) ? FA : LATIN, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: "-0.03em", color }}>
      <span>{name}</span>
      {dot && <span style={{ width: size * 0.2, height: size * 0.2, borderRadius: "50%", background: dot, display: "inline-block" }} />}
    </div>
  );

/** camera shake on the slams: x/y offset that decays in 0.35 s after each hit */
export const makeShake = (hits: number[], amp = 9) => (t: number) => {
  let x = 0, y = 0;
  for (const h of hits) {
    const k = kick(t, h, 0.35);
    if (k > 0) {
      x += Math.sin((t - h) * 92) * amp * k;
      y += Math.cos((t - h) * 71) * amp * 0.78 * k;
    }
  }
  return [x, y] as const;
};

/**
 * The accent flood: a circle that grows from (cx, cy) at `a` (the word), and is cut away from the top at `b`.
 * Children are drawn on the accent (use on="light" for Head: ink type, ink chip with accent text).
 */
export const Flood: React.FC<{ t: number; a: number; b?: number; cx?: number; cy?: number; mode?: "circle" | "rise"; children?: React.ReactNode }> = ({ t, a, b, cx = 540, cy = 964, mode = "circle", children }) => {
  const k = easeCinema(ramp(t, a - 0.16, a + 0.22));
  if (k <= 0) return null;
  const back = b === undefined ? 0 : easeCinema(ramp(t, b - 0.12, b + 0.2));
  if (back >= 1) return null;
  const clip = mode === "circle" ? `circle(${k * 2300}px at ${cx}px ${cy}px)` : `inset(${(1 - k) * 100}% 0 0 0)`;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: clip }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(${back * 100}% 0 0 0)` }}>
        <AbsoluteFill style={{ background: C.accent }} />
        {children}
      </div>
    </div>
  );
};

/** is the accent flood on screen at t (for the chrome colours: HUD and eyebrow switch to ink) */
export const floodOn = (t: number, spans: [number, number][]) => spans.some(([a, b]) => t >= a && t < b);
