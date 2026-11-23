// Atlas Doc · footage and photos on the film clock. No video ships with the kit: name your clips in a MEDIA map
// (name → public path, its length in seconds); an unmapped name shows a quiet labelled slot so the film still plays.
// Every shot moves (a slow push z0 → z1 over its span) and gets the film's grade, a bloom from its highlights and the
// cinematic tint, so archive, modern clips and photos live in one world. Pure function of film time.
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { C, F, FPS, GRADE, H, W, clamp, ease, mix, ramp, useT } from "./theme";

type P = React.CSSProperties;
/** clips: name → { src (in public/), dur (s) }; photos: name → { src, dur: 0 } */
export type Media = Record<string, { src: string; dur: number; credit?: string } | undefined>;

/** cinematic glow from the highlights: darken + crush, then blur, screened back on top */
export const CINE_BLOOM = "brightness(0.52) contrast(3.6) saturate(1.3) sepia(0.32) blur(28px)";
/** cold shadows, warm highlights, and a soft vignette on top of every clip/photo */
export const CineTint: React.FC = () => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(26,38,58,0.7) 0%, rgba(14,20,30,0.62) 100%)", mixBlendMode: "soft-light" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 60% at 50% 42%, rgba(255,196,140,0.10) 0%, rgba(0,0,0,0) 70%)", mixBlendMode: "soft-light" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(115% 100% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)" }} />
  </>
);

/** where your clip goes: a slow dark plate with the slot's name and what to film or find */
export const Slot: React.FC<{ name: string; hint?: string; t: number }> = ({ name, hint, t }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(ellipse 80% 70% at ${50 + 8 * Math.sin(t * 0.3)}% 45%, #1d222b 0%, ${C.ink0} 75%)` }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(238,232,220,.025) 0 2px, transparent 2px 30px)", backgroundPosition: `${(t * 16) % 30}px 0` }} />
    <div style={{ position: "absolute", left: 46, top: 130, display: "flex", flexDirection: "column", gap: 8, opacity: 0.8 }}>
      <div style={{ fontFamily: F.lat, fontWeight: 600, fontSize: 16, letterSpacing: "0.22em", color: C.boneFaint, textTransform: "uppercase" }}>{`▶ FOOTAGE · ${name}`}</div>
      {hint ? <div style={{ fontFamily: F.faS, fontSize: 24, color: C.boneFaint, direction: "rtl", textAlign: "left" }}>{`جای فوتیج: ${hint}`}</div> : null}
    </div>
  </div>
);

export type ClipProps = {
  t: number; // film time
  a: number; // film time when the shot starts
  b: number; // film time when it ends (for the push)
  name: string; // key in the media map
  media: Media;
  hint?: string; // what goes here (shown on the empty slot)
  from?: number; // clip time (s) shown at film time a
  rate?: number; // playback speed (0.5–1.5)
  fit?: "cover" | "contain"; // contain: over its own blurred copy (4:3 archive, vertical phone video)
  z0?: number;
  z1?: number; // push-in (1 = fills the frame)
  fx?: number;
  fy?: number; // focus 0..1 (where the push heads, and which part survives the crop)
  grade?: string;
  bloom?: number; // highlight glow (default 0.55; 0 = off)
  style?: P;
};

/** a footage shot: clip time = from + (t − a)·rate, held on its last frame past the end */
export const Clip: React.FC<ClipProps> = (p) => {
  const { frame } = useT();
  const m = p.media[p.name];
  const z = mix(p.z0 ?? 1.0, p.z1 ?? 1.06, ease.inOut(ramp(p.t, p.a, p.b)));
  const fx = p.fx ?? 0.5, fy = p.fy ?? 0.5;
  if (!m) return <Slot name={p.name} hint={p.hint} t={p.t - p.a} />;
  if (!m.dur) return <Photo {...p} />;
  const rate = p.rate ?? 1;
  const ct = Math.min(m.dur - 2 / FPS, Math.max(0, (p.from ?? 0) + (p.t - p.a) * rate));
  const seqFrom = frame - Math.round((ct / rate) * FPS);
  const src = staticFile(m.src);
  const v = (style: P) => (
    <Sequence from={seqFrom} layout="none">
      <OffthreadVideo src={src} muted playbackRate={rate} style={{ position: "absolute", maxWidth: "none", display: "block", ...style }} />
    </Sequence>
  );
  const contain = p.fit === "contain";
  const main: P = { left: 0, top: 0, width: W, height: H, objectFit: contain ? "contain" : "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%` };
  const bloom = p.bloom ?? 0.55;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000", ...p.style }}>
      {contain ? v({ left: -80, top: -80, width: W + 160, height: H + 160, objectFit: "cover", filter: `${p.grade ?? GRADE} blur(30px) brightness(0.42)` }) : null}
      {v({ ...main, filter: p.grade ?? GRADE })}
      {bloom > 0 ? v({ ...main, filter: CINE_BLOOM, mixBlendMode: "screen", opacity: bloom }) : null}
      <CineTint />
    </div>
  );
};

/** a still photo with a slow push (dur 0 in the media map) */
export const Photo: React.FC<ClipProps & { dx?: number; dy?: number }> = (p) => {
  const m = p.media[p.name];
  if (!m) return <Slot name={p.name} hint={p.hint} t={p.t - p.a} />;
  const u = ease.inOut(ramp(p.t, p.a, p.b));
  const z = mix(p.z0 ?? 1.02, p.z1 ?? 1.1, u);
  const fx = p.fx ?? 0.5, fy = p.fy ?? 0.5;
  const src = staticFile(m.src);
  const contain = p.fit === "contain";
  const tx = (p.dx ?? 0) * (u - 0.5), ty = (p.dy ?? 0) * (u - 0.5);
  const pic: P = { position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: contain ? "contain" : "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`, maxWidth: "none" };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000", ...p.style }}>
      {contain ? <Img src={src} style={{ position: "absolute", left: -80, top: -80, width: W + 160, height: H + 160, objectFit: "cover", filter: `${p.grade ?? GRADE} blur(30px) brightness(0.4)`, maxWidth: "none" }} /> : null}
      <Img src={src} style={{ ...pic, filter: p.grade ?? GRADE }} />
      {(p.bloom ?? 0.36) > 0 ? <Img src={src} style={{ ...pic, filter: CINE_BLOOM, mixBlendMode: "screen", opacity: p.bloom ?? 0.36 }} /> : null}
      <CineTint />
    </div>
  );
};

/** cross-dissolve helper: opacity of a shot that fades in over `mixIn` s at a (and out over `out` s before b) */
export const shotAlpha = (t: number, a: number, b: number, mixIn = 0, out = 0) =>
  (mixIn > 0 ? clamp((t - a) / mixIn) : t >= a ? 1 : 0) * (out > 0 ? 1 - clamp((t - (b - out)) / out) : t < b ? 1 : 0);
