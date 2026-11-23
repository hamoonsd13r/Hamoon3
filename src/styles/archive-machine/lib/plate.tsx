// Archive Machine · Plate: an archive shot cover-fitted into the 1920×1080 frame as a positioned box, so overlays (the
// orange core tint, HUD traces) can be placed in the source's own coordinates (u, v in 0..1) and ride the push.
import React from "react";
import { Img, staticFile } from "remotion";
import { Vid } from "./hud";
import { clamp, ease, mix, useT } from "./theme";

/** a video clip of yours: public/styles/archive-machine/clips/<name>.mp4 */
export const clip = (name: string) => staticFile(`styles/archive-machine/clips/${name}.mp4`);
/** a still: public/styles/archive-machine/stills/<name>.jpg (the demo ships stills; a still plays with the same push) */
export const still = (name: string) => staticFile(`styles/archive-machine/stills/${name}.jpg`);

export type PlateProps = {
  src: string;
  /** film time at which the plate starts, and its end (for the push) */
  a: number;
  b: number;
  /** source time (s) at film time a */
  from?: number;
  rate?: number;
  aspect?: number;
  grade?: string;
  push?: [number, number];
  /** point of the source (0..100 %) the frame centres on and pushes toward */
  focus?: [number, number];
  /** drift of the focus over the shot, in % of the source */
  drift?: [number, number];
  still?: boolean;
  exposure?: number;
  /** fit the whole source inside the frame (small sources: less enlargement) */
  contain?: boolean;
  children?: React.ReactNode;
};

/** box geometry of a cover-fitted source (exported for overlays that need pixels) */
export const coverBox = (aspect: number, focus: [number, number], contain = false) => {
  if (contain) {
    const bh = aspect >= 16 / 9 ? 1920 / aspect : 1080, bw = bh * aspect;
    return { bw, bh, ox: (1920 - bw) / 2, oy: (1080 - bh) / 2 };
  }
  const bw = aspect >= 16 / 9 ? 1080 * aspect : 1920;
  const bh = aspect >= 16 / 9 ? 1080 : 1920 / aspect;
  return { bw, bh, ox: (1920 - bw) * (focus[0] / 100), oy: (1080 - bh) * (focus[1] / 100) };
};

export const Plate: React.FC<PlateProps> = ({ src, a, b, from = 0, rate = 1, aspect = 4 / 3, grade = "none", push = [1.03, 1.1], focus = [50, 50], drift = [0, 0], still, exposure = 1, contain, children }) => {
  const { t } = useT();
  const u = ease.inOut(clamp((t - a) / Math.max(0.01, b - a)));
  const f: [number, number] = [focus[0] + drift[0] * u, focus[1] + drift[1] * u];
  const { bw, bh, ox, oy } = coverBox(aspect, f, contain);
  const s = mix(push[0], push[1], u);
  const fx = bw * (f[0] / 100), fy = bh * (f[1] / 100);
  const media: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: bw, height: bh, maxWidth: "none", objectFit: "fill", filter: `${grade} brightness(${exposure})` };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", left: ox, top: oy, width: bw, height: bh, transformOrigin: `${fx}px ${fy}px`, transform: `scale(${s})` }}>
        {still ? <Img src={src} style={media} /> : <Vid src={src} t0={a} from={from} rate={rate} style={media} />}
        {children}
      </div>
    </div>
  );
};

/** the program's orange core showing through the source around (u, v): an orange-graded copy, radially masked */
export const CoreTint: React.FC<{ src: string; a: number; from?: number; rate?: number; u: number; v: number; r: number; amt: number; bw: number; bh: number; still?: boolean }> = ({ src, a, from = 0, rate = 1, u, v, r, amt, bw, bh, still }) => {
  if (amt <= 0.01) return null;
  const mask = `radial-gradient(circle ${r * bw}px at ${u * 100}% ${v * 100}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)`;
  const st: React.CSSProperties = {
    position: "absolute", left: 0, top: 0, width: bw, height: bh, maxWidth: "none", objectFit: "fill",
    filter: `grayscale(1) contrast(1.9) brightness(0.62) sepia(1) saturate(5.5) hue-rotate(-31deg) brightness(${1.25 + 0.5 * amt})`,
    opacity: clamp(amt), WebkitMaskImage: mask, maskImage: mask,
  };
  return still ? <Img src={src} style={st} /> : <Vid src={src} t0={a} from={from} rate={rate} style={st} />;
};

export const staticPhoto = (name: string) => staticFile(`styles/archive-machine/photos/${name}`);
