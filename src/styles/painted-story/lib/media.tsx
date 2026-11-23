// Painted Story · archival inserts. A shot with img "arch:<name>" plays a public-domain clip (civil-defence films,
// government archives — see FOOTAGE.md) in a 4:3 window over a blurred copy of itself, aged a little, with its source
// line. No video ships with the kit: map your own files here; an unmapped name shows a quiet labelled slot instead.
//   MEDIA["radio"] = "v01/arch/radio.mp4";   ARCH_INFO["radio"] = { film: "A Day Called X", year: 1955 };
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { F } from "./fonts";
import { hash, mix, sine } from "./time";

export const MEDIA: Record<string, string> = {};
export const ARCH_INFO: Record<string, { film: string; year: number }> = {};

/** where a clip of yours goes: a slow dark gradient with the slot's name and a running timecode */
export const Slot: React.FC<{ name: string; t: number }> = ({ name, t }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `linear-gradient(${135 + 20 * Math.sin(t * 0.7)}deg, #202226, #34373d 55%, #18191c)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.035) 0 14px, transparent 14px 28px)", backgroundPosition: `${(t * 30) % 40}px 0` }} />
    <div style={{ position: "relative", textAlign: "center", color: "rgba(255,255,255,.72)", fontFamily: F.num, fontSize: 26, letterSpacing: 2, lineHeight: 1.5, direction: "ltr" }}>
      <div style={{ fontSize: 44, lineHeight: 1 }}>▶</div>
      <div>ARCHIVE · {name}</div>
      <div style={{ opacity: 0.6 }}>{t.toFixed(1)} s</div>
    </div>
  </div>
);

/** a 4:3 archival clip on a blurred copy of itself; t0 = the shot's start (the clip plays from its own 0 there) */
export const ArchClip: React.FC<{ name: string; t: number; t0: number }> = ({ name, t, t0 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const w43 = Math.round((H * 4) / 3);
  const file = MEDIA[name];
  const info = ARCH_INFO[name];
  // `from` keeps the clip's own clock right both in a render and in a Look still (frame i = any film time)
  const from = frame - Math.round((t - t0) * fps);
  const z = mix(1.0, 1.06, sine((t - t0) / 4));
  const flick = 1 - hash(Math.floor(t * 24) * 1.37) * 0.07;
  return (
    <AbsoluteFill style={{ background: "#0b0b0c", overflow: "hidden" }}>
      {file ? (
        <Sequence from={from} layout="none">
          <OffthreadVideo src={staticFile(file)} muted style={{ position: "absolute", left: -40, top: -40, width: W + 80, height: H + 80, objectFit: "cover", filter: "grayscale(1) blur(26px) brightness(0.38)" }} />
          <div style={{ position: "absolute", left: (W - w43) / 2, top: 0, width: w43, height: H, overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}>
            <OffthreadVideo src={staticFile(file)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z})`, filter: `grayscale(1) sepia(0.22) contrast(1.1) brightness(${0.96 * flick})` }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
          </div>
        </Sequence>
      ) : (
        <div style={{ position: "absolute", left: (W - w43) / 2, top: 0, width: w43, height: H }}>
          <Slot name={name} t={t - t0} />
        </div>
      )}
      {info ? (
        <div style={{ position: "absolute", left: (W - w43) / 2 + 28, bottom: 30, direction: "ltr", opacity: 0.72, fontFamily: F.num, fontSize: 22, letterSpacing: 2, color: "#f1ebe0" }}>
          ARCHIVE · {info.film.toUpperCase()} · {info.year}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
