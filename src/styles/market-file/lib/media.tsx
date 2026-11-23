// Market File · the footage track. A news reel lives on ONE full-frame footage bed cut on the narration's words (one
// clip per phrase, never the same clip twice); headlines, chips and data sit on top. No video ships with the kit:
// give each slot a file in your MEDIA map; an empty slot shows a quiet, labelled placeholder so the film still plays.
//   MEDIA["port-night"] = { src: "v01/clips/port-night.mp4", w: 1920, h: 1080, dur: 14, credit: "NASA · PUBLIC DOMAIN" };
// Soft / 720p news footage goes in a 16:9 `panel` (sharp at its own size over a blurred copy) instead of full frame.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FA, clamp, easeOut, ramp } from "./theme";
import { MonoLbl } from "./type";

/** a clip or a photo (dur 0) in public/; focus = the point (source px) that must stay in frame */
export type Clip = { src: string; w: number; h: number; dur: number; credit?: string; focus?: [number, number] };

/** grades: keep footage close to the palette so the one accent stays the only colour */
export const GRADE = {
  base: "saturate(.75) contrast(1.06) brightness(.95)",
  desat: "saturate(.6) contrast(1.06) brightness(.92)",
  mute: "saturate(.32) contrast(1.08) brightness(.9)", // loud reds/greens/oranges in the footage → near ink/cream
  cool: "saturate(.5) contrast(1.08) brightness(.92)",
  mapbg: "saturate(.35) brightness(.78) blur(5px)", // under a map or a chart: texture only
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const TINTS = ["#2b2019", "#22231b", "#1b2027", "#2a1d1d", "#1f2421"];

/** where a clip of yours goes: a slow dark plate with drifting light, the slot's name and what to film */
export const Slot: React.FC<{ name: string; hint?: string; t: number; w: number; h: number; r?: number; label?: boolean }> = ({ name, hint, t, w, h, r = 0, label = true }) => {
  const s = hash(name);
  const tint = TINTS[Math.floor(s * TINTS.length)];
  const blobs = [0, 1, 2].map((i) => {
    const a = s * 6.28 + i * 2.1 + t * (0.12 + 0.05 * i);
    return { x: w * (0.5 + 0.32 * Math.cos(a)), y: h * (0.45 + 0.28 * Math.sin(a * 1.3)), r: Math.min(w, h) * (0.32 + 0.1 * i) };
  });
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: r, overflow: "hidden", background: `radial-gradient(ellipse 90% 70% at 50% 45%, ${tint} 0%, ${C.ink} 78%)` }}>
      {blobs.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: "50%", background: `radial-gradient(circle, rgba(242,239,232,${0.05 - i * 0.012}) 0%, transparent 70%)` }} />
      ))}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(242,239,232,.022) 0 2px, transparent 2px 26px)", backgroundPosition: `${(t * 18) % 26}px 0` }} />
      {label && (
        <div style={{ position: "absolute", left: 90, top: Math.min(150, h * 0.22), display: "flex", flexDirection: "column", gap: 8, opacity: 0.8 }}>
          <MonoLbl size={18} color={C.creamMute}>
            {`▶ FOOTAGE · ${name}`}
          </MonoLbl>
          {hint && <span dir="rtl" style={{ fontFamily: FA, fontWeight: 600, fontSize: 24, color: C.creamMute, textAlign: "left" }}>{`جای فوتیج: ${hint}`}</span>}
        </div>
      )}
    </div>
  );
};

export const Credit: React.FC<{ text: string; left?: number; bottom?: number }> = ({ text, left = 24, bottom = 18 }) => (
  <div style={{ position: "absolute", left, bottom }}>
    <MonoLbl size={15} color="rgba(242,239,232,.62)" style={{ letterSpacing: ".14em" }}>
      {text}
    </MonoLbl>
  </div>
);

/** footage in a w×h frame: cover-fit, the focus point kept in view, a slow push. t0 = when this shot starts. */
export const Vid: React.FC<{
  clip?: Clip;
  name?: string;
  hint?: string;
  t: number;
  t0: number;
  len: number;
  w: number;
  h: number;
  focus?: [number, number];
  zoom?: number;
  push?: number;
  trim?: number;
  rate?: number;
  r?: number;
  grade?: string;
  dim?: number;
  credit?: boolean;
  frame?: boolean;
  slotLabel?: boolean;
  style?: React.CSSProperties;
}> = ({ clip, name = "clip", hint, t, t0, len, w, h, focus, zoom = 1, push = 0.02, trim = 0, rate = 1, r = 34, grade = GRADE.base, dim = 0, credit = true, frame = true, slotLabel = true, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!clip)
    return (
      <div style={{ position: "relative", width: w, height: h, ...style }}>
        <Slot name={name} hint={hint} t={t - t0} w={w} h={h} r={r} label={slotLabel && w >= 900} />
      </div>
    );
  const fc = focus ?? clip.focus ?? [clip.w / 2, clip.h / 2];
  const sc = Math.max(w / clip.w, h / clip.h) * zoom * (1 + push * Math.max(0, t - t0));
  const vw = clip.w * sc, vh = clip.h * sc;
  const left = Math.min(0, Math.max(w - vw, w / 2 - fc[0] * sc));
  const top = Math.min(0, Math.max(h - vh, h / 2 - fc[1] * sc));
  const pic: React.CSSProperties = { position: "absolute", left, top, width: vw, height: vh, maxWidth: "none", filter: grade };
  // `from` keeps the clip's own clock right both in a render and in a Look still (frame i = any film time)
  const from = f - Math.round((t - t0) * fps);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: r, overflow: "hidden", background: "#000", ...style }}>
      {clip.dur ? (
        <Sequence from={from} durationInFrames={Math.max(1, Math.round(len * fps))} layout="none">
          <OffthreadVideo src={staticFile(clip.src)} muted playbackRate={rate} trimBefore={Math.round(trim * fps)} style={pic} />
        </Sequence>
      ) : (
        <Img src={staticFile(clip.src)} style={pic} />
      )}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: dim }} />}
      {frame && <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2px rgba(242,239,232,.12), inset 0 -140px 160px -70px rgba(0,0,0,.7)", borderRadius: r }} />}
      {credit && clip.credit && <Credit text={clip.credit} />}
    </div>
  );
};

/** full-frame footage */
export const Full: React.FC<Omit<React.ComponentProps<typeof Vid>, "w" | "h">> = (p) => {
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <Vid {...p} w={width} h={height} r={0} frame={false} credit={false} />
    </div>
  );
};

/** soft or 720p news footage: a sharp 16:9 panel at its own size over a blurred, dimmed copy of itself */
export const Panel: React.FC<{ clip?: Clip; name?: string; hint?: string; t: number; t0: number; len: number; dim: number; grade?: string; cy?: number }> = ({ clip, name, hint, t, t0, len, dim, grade, cy = 964 }) => {
  const { width } = useVideoConfig();
  const h = Math.round((width * (clip?.h ?? 9)) / (clip?.w ?? 16));
  const k = easeOut(ramp(t, t0, t0 + 0.3));
  return (
    <>
      <Full clip={clip} name={name} t={t} t0={t0} len={len} dim={0.55} push={0.02} grade="saturate(.45) brightness(.7) blur(26px)" slotLabel={false} />
      <div style={{ position: "absolute", left: 0, top: cy - h / 2, width, height: h, transform: `scale(${1.035 - 0.035 * k})`, boxShadow: "0 30px 90px rgba(0,0,0,.6)" }}>
        <Vid clip={clip} name={name} hint={hint} t={t} t0={t0} len={len} w={width} h={h} r={0} frame={false} credit={false} dim={dim} push={0.03} grade={grade ?? "saturate(.8) contrast(1.06) brightness(.98)"} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: C.line2 }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: C.line2 }} />
      </div>
    </>
  );
};

/** the dark top and bottom of every footage frame: the headline (top) and the source line (bottom) always read */
export const Gradients: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,6,7,.82) 0px, rgba(6,6,7,.62) 380px, rgba(6,6,7,.28) 640px, rgba(6,6,7,0) 820px)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(6,6,7,.82) 0px, rgba(6,6,7,.55) 330px, rgba(6,6,7,.2) 620px, rgba(6,6,7,0) 820px)" }} />
  </>
);

/** one shot of the bed: from a to b, one of `slots` (the first that has a clip, else the first name) */
export type Shot = { a: number; b: number; slots: string[]; hint?: string; dim?: number; rate?: number; push?: number; zoom?: number; trim?: number; grade?: string; focus?: [number, number]; panel?: boolean; none?: boolean };

/** the footage bed: finds the shot at t, picks its clip (no clip used twice), plays it under the overlays */
export const Bed: React.FC<{ t: number; shots: Shot[]; media: Record<string, Clip | undefined>; panelCy?: number; creditY?: number }> = ({ t, shots, media, panelCy = 964, creditY = 1636 }) => {
  const pick = React.useMemo(() => {
    const used = new Set<string>();
    return shots.map((s) => {
      const k = s.slots.find((x) => media[x] && !used.has(x)) ?? s.slots.find((x) => media[x]) ?? s.slots[0];
      if (k) used.add(k);
      return k;
    });
  }, [shots, media]);
  const i = shots.findIndex((x) => t >= x.a && t < x.b);
  if (i < 0) return null;
  const s = shots[i];
  if (s.none) return <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 52%, ${C.ink3} 0%, ${C.ink} 70%)` }} />;
  const name = pick[i];
  const clip = name ? media[name] : undefined;
  const len = s.b - s.a + 0.2;
  return (
    <>
      {s.panel ? (
        <Panel key={s.a} clip={clip} name={name} hint={s.hint} t={t} t0={s.a} len={len} dim={s.dim ?? 0.1} grade={s.grade} cy={panelCy} />
      ) : (
        <Full key={s.a} clip={clip} name={name} hint={s.hint} t={t} t0={s.a} len={len} dim={s.dim ?? 0.4} rate={s.rate} push={s.push ?? 0.04} zoom={s.zoom} trim={s.trim} grade={s.grade ?? GRADE.base} focus={s.focus} />
      )}
      <Gradients />
      {clip?.credit && (
        <div style={{ position: "absolute", left: 90, top: creditY }}>
          <MonoLbl size={20} color="rgba(242,239,232,.68)" style={{ letterSpacing: ".1em" }}>
            {clip.credit}
          </MonoLbl>
        </div>
      )}
    </>
  );
};

/** fade helper for scene blocks: 0 before a, 1 inside, 0 after b */
export const sceneK = (t: number, a: number, b: number, inLen = 0.2, outLen = 0.2) => clamp(Math.min(ramp(t, a, a + inLen), 1 - ramp(t, b - outLen, b)));
