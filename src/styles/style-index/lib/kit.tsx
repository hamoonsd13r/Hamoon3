// Style Index · pieces every style poster shares: the 720×1280 frame, film grain, halftone screens, paper, letter-by-letter
// type and a few motion helpers. A poster is a component of its own time: ({ t }) => JSX.
import React from "react";
import { Img, staticFile } from "remotion";
import { PH, PW, clamp, ease, hash, ramp } from "./theme";
import SIZES from "./imgs.json";

export type PosterProps = { t: number };

export const img = (id: string) => staticFile(`styles/style-index/img/${id}.webp`);
/** an image's own height / width (cut-outs are trimmed to their subject) */
export const ar = (id: string) => {
  const s = (SIZES as Record<string, number[]>)[id];
  return s ? s[1] / s[0] : 1.5;
};

/** the poster frame: everything is laid out in 720×1280 */
export const Frame: React.FC<{ bg?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ bg = "#000", children, style }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, overflow: "hidden", background: bg, ...style }}>{children}</div>
);

export const Abs: React.FC<{ x?: number; y?: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x = 0, y = 0, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>
);

/** live film grain (a new seed every 2 frames) */
export const Grain: React.FC<{ t: number; amt?: number; blend?: React.CSSProperties["mixBlendMode"]; freq?: number; id?: string }> = ({ t, amt = 0.12, blend = "overlay", freq = 0.85, id = "g" }) => {
  const seed = Math.floor(t * 15) % 97;
  return (
    <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: blend, opacity: amt, pointerEvents: "none" }}>
      <filter id={`grain-${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain-${id})`} />
    </svg>
  );
};

/** paper: a warm base with fibres and soft blotches */
export const Paper: React.FC<{ color: string; amt?: number; id?: string }> = ({ color, amt = 0.5, id = "p" }) => (
  <>
    <div style={{ position: "absolute", inset: 0, background: color }} />
    <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: "multiply", opacity: amt }}>
      <filter id={`paper-${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves={4} seed={7} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.36  0 0 0 -1.1 0.9" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#paper-${id})`} />
    </svg>
  </>
);

/** a halftone dot screen (CSS), optionally masked */
export const Halftone: React.FC<{ color: string; size?: number; dot?: number; angle?: number; opacity?: number; mask?: string; style?: React.CSSProperties }> = ({ color, size = 14, dot = 0.32, angle = 45, opacity = 1, mask, style }) => (
  <div
    style={{
      position: "absolute",
      inset: -200,
      opacity,
      backgroundImage: `radial-gradient(circle, ${color} ${dot * 100}%, transparent ${dot * 100 + 2}%)`,
      backgroundSize: `${size}px ${size}px`,
      transform: `rotate(${angle}deg)`,
      WebkitMaskImage: mask,
      maskImage: mask,
      ...style,
    }}
  />
);

/** a cut-out image, positioned by its box */
export const Cut: React.FC<{ id: string; x: number; y: number; w: number; h?: number; style?: React.CSSProperties; imgStyle?: React.CSSProperties }> = ({ id, x, y, w, h, style, imgStyle }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h ?? w * ar(id), ...style }}>
    <Img src={img(id)} style={{ width: "100%", height: "100%", objectFit: "contain", maxWidth: "none", display: "block", ...imgStyle }} />
  </div>
);

/** one piece of a sheet of cut-outs: the source box [sx, sy, sw, sh] (image px) shown `w` wide at (x, y) */
export const Sub: React.FC<{ id: string; box: [number, number, number, number]; x: number; y: number; w: number; style?: React.CSSProperties }> = ({ id, box, x, y, w, style }) => {
  const [sx, sy, sw, sh] = box, k = w / sw;
  const s = (SIZES as Record<string, number[]>)[id] ?? [1024, 1536];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: sh * k, overflow: "hidden", ...style }}>
      <Img src={img(id)} style={{ position: "absolute", left: -sx * k, top: -sy * k, width: s[0] * k, height: s[1] * k, maxWidth: "none" }} />
    </div>
  );
};

/** letters in, one after another: per-letter transform from a function of the letter's own 0→1 */
export const Letters: React.FC<{
  text: string;
  t: number;
  at: number;
  each?: number;
  dur?: number;
  style?: React.CSSProperties;
  letter?: (u: number, i: number) => React.CSSProperties;
}> = ({ text, t, at, each = 0.04, dur = 0.3, style, letter }) => (
  <span style={{ display: "inline-flex", whiteSpace: "pre", ...style }}>
    {Array.from(text).map((ch, i) => {
      const u = ramp(t, at + i * each, at + i * each + dur);
      const s = letter ? letter(u, i) : { opacity: u, transform: `translateY(${(1 - ease.out(u)) * 40}px)` };
      return (
        <span key={i} style={{ display: "inline-block", ...s }}>
          {ch}
        </span>
      );
    })}
  </span>
);

/** a horizontal wipe reveal (left→right, or right→left for rtl) */
export const wipe = (u: number, rtl = false) => {
  const k = clamp(u) * 100;
  return rtl ? `inset(-20% 0 -20% ${100 - k}%)` : `inset(-20% ${100 - k}% -20% 0)`;
};

/** a jittery stop-motion offset (px) that changes every 1/n s */
export const jitter = (t: number, seed: number, amp = 2, n = 12) => {
  const f = Math.floor(t * n);
  return [(hash(f * 3.1 + seed) - 0.5) * 2 * amp, (hash(f * 5.7 + seed * 2.3) - 0.5) * 2 * amp, (hash(f * 7.9 + seed * 4.1) - 0.5) * amp] as const;
};

/** a soft vignette */
export const Vignette: React.FC<{ amt?: number; color?: string }> = ({ amt = 0.5, color = "0,0,0" }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 90% at 50% 45%, rgba(${color},0) 55%, rgba(${color},${amt}) 100%)`, pointerEvents: "none" }} />
);
