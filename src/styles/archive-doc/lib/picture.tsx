// Archive Doc · the picture track: archival clips, photos and full-frame scenes cut on the narration, each with a slow
// push, optional dissolves centred on the cut, gate weave and exposure flicker (film shots only). No video ships with
// the kit: give each clip/photo name a file in your MEDIA map; an unmapped name plays a quiet labelled slot.
//   MEDIA["dunes"] = { src: "v01/clips/dunes.mp4", dur: 14, ar: 4 / 3 };  MEDIA["portrait"] = { src: "v01/img/p.jpg", dur: 0, ar: 0.8 }
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { flicker, weave } from "./fx";
import { C, F, FPS, GRADE, H, W, clamp, ease, mix, ramp, useT } from "./theme";

type P = React.CSSProperties;
export type Media = Record<string, { src: string; dur: number; ar?: number } | undefined>;

/** one shot: a clip (`clip`), a photo (`img`) or a scene (`scene`, drawn by your scene map) starting at `at` */
export type Shot = {
  at: number;
  clip?: string;
  img?: string;
  scene?: string;
  hint?: string; // what goes in this slot (shown while the file is missing)
  cin?: number; // clip time shown at `at`
  cmax?: number; // never past this clip time (holds the frame)
  rate?: number;
  fit?: "cover" | "contain"; // contain: 4:3 archive or a vertical photo over its own blurred copy
  fx?: number;
  fy?: number; // focus 0..1
  z0?: number;
  z1?: number; // push from z0 to z1 over the shot
  mix?: number; // dissolve length centred on this cut (s)
  grade?: string;
  flip?: boolean;
};

/** where a file of yours goes */
export const Slot: React.FC<{ name: string; hint?: string; t: number }> = ({ name, hint, t }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(ellipse 80% 70% at ${50 + 8 * Math.sin(t * 0.3)}% 45%, #24201a 0%, ${C.ink} 75%)` }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(239,230,210,.025) 0 2px, transparent 2px 30px)", backgroundPosition: `${(t * 16) % 30}px 0` }} />
    <div style={{ position: "absolute", left: 84, top: 84, display: "flex", flexDirection: "column", gap: 8, opacity: 0.8 }}>
      <div style={{ fontFamily: F.lat, fontSize: 18, letterSpacing: 3, color: C.creamFaint }}>{`▶ ARCHIVE · ${name}`}</div>
      {hint ? <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 24, color: C.creamFaint, direction: "rtl", textAlign: "left" }}>{`جای فیلم یا عکس: ${hint}`}</div> : null}
    </div>
  </div>
);

const ShotClip: React.FC<{ sh: Shot; zoom: number; media: Media }> = ({ sh, zoom, media }) => {
  const { t, frame } = useT();
  const m = media[sh.clip!];
  if (!m) return <Slot name={sh.clip!} hint={sh.hint} t={t - sh.at} />;
  const rate = sh.rate ?? 1;
  const ct = clamp((sh.cin ?? 0) + (t - sh.at) * rate, 0, Math.min(m.dur - 0.1, sh.cmax ?? Infinity));
  const ar = m.ar ?? 4 / 3;
  const contain = sh.fit === "contain";
  let cw = W * zoom, ch = cw / ar;
  if (contain) {
    ch = H * zoom;
    cw = ch * ar;
  } else if (ch < H * zoom) {
    ch = H * zoom;
    cw = ch * ar;
  }
  const left = (W - cw) * (sh.fx ?? 0.5), top = (H - ch) * (sh.fy ?? 0.5);
  const from = frame - Math.round((ct / rate) * FPS);
  const video = (style: P) => (
    <Sequence from={from} layout="none">
      <OffthreadVideo src={staticFile(m.src)} muted playbackRate={rate} style={{ position: "absolute", maxWidth: "none", display: "block", filter: sh.grade ?? GRADE, ...style }} />
    </Sequence>
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      {contain ? video({ left: -60, top: -60, width: W + 120, height: H + 120, objectFit: "cover", filter: `${GRADE} blur(28px) brightness(0.45)` }) : null}
      {video({ left, top, width: cw, height: ch, transform: sh.flip ? "scaleX(-1)" : undefined })}
    </div>
  );
};

const ShotStill: React.FC<{ sh: Shot; zoom: number; media: Media }> = ({ sh, zoom, media }) => {
  const { t } = useT();
  const m = media[sh.img!];
  if (!m) return <Slot name={sh.img!} hint={sh.hint} t={t - sh.at} />;
  const src = staticFile(m.src);
  const contain = sh.fit === "contain";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      {contain ? <Img src={src} style={{ position: "absolute", left: -60, top: -60, width: W + 120, height: H + 120, objectFit: "cover", filter: `${GRADE} blur(30px) brightness(0.4)`, maxWidth: "none" }} /> : null}
      <Img src={src} style={{ position: "absolute", inset: 0, width: W, height: H, objectFit: contain ? "contain" : "cover", objectPosition: `${(sh.fx ?? 0.5) * 100}% ${(sh.fy ?? 0.5) * 100}%`, filter: sh.grade ?? GRADE, transform: `scale(${zoom})`, transformOrigin: `${(sh.fx ?? 0.5) * 100}% ${(sh.fy ?? 0.5) * 100}%`, maxWidth: "none" }} />
    </div>
  );
};

/** shot k's visibility at t (dissolve centred on the cut) and its push */
const state = (shots: Shot[], dur: number, k: number, t: number) => {
  const sh = shots[k], next = shots[k + 1];
  const mIn = sh.mix ?? 0, mOut = next?.mix ?? 0;
  const a0 = sh.at - mIn / 2, a1 = next ? next.at + mOut / 2 : dur + 1;
  if (t < a0 || t >= a1) return null;
  const end = next ? next.at : dur;
  const z0 = sh.z0 ?? 1.03, z1 = sh.z1 ?? z0 + 0.05;
  const zoom = mix(z0, z1, clamp((t - a0) / (end + mOut / 2 - a0)));
  const op = mIn > 0 ? ease.inOut(ramp(t, sh.at - mIn / 2, sh.at + mIn / 2)) : 1;
  return { sh, zoom, op, end };
};

/** a full-frame scene: (t, a = its start, b = its end) → element */
export type SceneFn = (t: number, a: number, b: number) => React.ReactNode;

/** the picture: every shot alive at t (two during a dissolve), film shots with weave and flicker */
export const Picture: React.FC<{ t: number; shots: Shot[]; dur: number; media: Media; scenes?: Record<string, SceneFn> }> = ({ t, shots, dur, media, scenes = {} }) => {
  const live: React.ReactNode[] = [];
  for (let k = 0; k < shots.length; k++) {
    const s = state(shots, dur, k, t);
    if (!s) continue;
    const { sh, zoom, op, end } = s;
    const isScene = !!sh.scene;
    const w = isScene ? { x: 0, y: 0 } : weave(t, 0.8);
    const fl = isScene ? 1 : flicker(t, 0.7);
    live.push(
      <div key={k} style={{ position: "absolute", inset: 0, opacity: op, transform: `translate(${w.x}px, ${w.y}px)`, filter: fl !== 1 ? `brightness(${fl})` : undefined }}>
        {sh.scene ? (scenes[sh.scene]?.(t, sh.at - (sh.mix ?? 0) / 2, end + 0.6) ?? <AbsoluteFill style={{ background: C.ink }} />) : sh.img ? <ShotStill sh={sh} zoom={zoom} media={media} /> : <ShotClip sh={sh} zoom={zoom} media={media} />}
      </div>,
    );
  }
  return <>{live}</>;
};
