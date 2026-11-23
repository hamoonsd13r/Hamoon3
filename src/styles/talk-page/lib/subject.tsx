// Talk Page — what sits under the page in previews: your own talk video (proxy in public/), or, until you map it, a
// neutral placeholder subject (a person-shaped silhouette at a table with a phone). Plus optional Instagram guides.
import React from "react";
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, H, SAFE, W } from "./theme";
import { useT } from "./time";

/** your own video under the page, at time t (works in play and in Look stills). `src` = a file in public/. */
export const TalkVideo: React.FC<{ src: string; offset?: number }> = ({ src, offset = 0 }) => {
  const t = useT();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, Math.round((t + offset) * fps));
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={staticFile(src)} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
    </Sequence>
  );
};

/** where the placeholder's phone lies on the table (absolute px) — pen marks in the demo point at it */
export const PHONE = { x: 760, y: 1548, w: 170, h: 300, rot: -9 };

/** a neutral stand-in for the speaker: dim room, a silhouette that breathes and nods, a table, hands, a phone */
export const PlaceholderSubject: React.FC<{ phoneLit?: [number, number] }> = ({ phoneLit }) => {
  const t = useT();
  const breathe = 1 + 0.006 * Math.sin(t * 1.7);
  const nod = Math.sin(t * 2.3) * 0.9 + Math.sin(t * 5.1) * 0.35;
  const lit = phoneLit && t >= phoneLit[0] && t < phoneLit[1] ? 0.55 + 0.45 * Math.abs(Math.sin(t * 6)) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #6B6158 0%, #5E554D 45%, #4C443D 100%)" }}>
      {/* window light from the left, a lamp glow on the right */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 42% at 14% 28%, rgba(255,240,222,0.28), rgba(255,240,222,0) 70%), radial-gradient(ellipse 28% 20% at 86% 36%, rgba(255,200,140,0.22), rgba(255,200,140,0) 70%)" }} />
      {/* back shelf */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 520, height: 10, background: "rgba(0,0,0,0.18)" }} />
      {[90, 150, 196, 840, 892, 948].map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x, top: 420 + (i % 3) * 14, width: 34 + (i % 2) * 16, height: 100 - (i % 3) * 14, background: `rgba(${150 + i * 8},${128 + i * 6},${108 + i * 4},0.35)`, borderRadius: 3 }} />
      ))}
      {/* the silhouette: a solid shape against the lit wall reads as "the speaker goes here" */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="tpBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2A2420" />
            <stop offset="0.55" stopColor="#211C19" />
            <stop offset="1" stopColor="#1A1613" />
          </linearGradient>
        </defs>
        <g transform={`translate(540 1180) scale(1 ${breathe}) translate(-540 -1180)`}>
          <path d="M150 1200 C 170 1010, 300 930, 430 905 L 650 905 C 780 930, 910 1010, 930 1200 Z" fill="url(#tpBody)" />
          <path d="M470 840 L 610 840 L 600 920 L 480 920 Z" fill="#221D1A" />
        </g>
        <g transform={`rotate(${nod} 540 860)`}>
          <ellipse cx={540} cy={690} rx={150} ry={188} fill="url(#tpBody)" />
        </g>
      </svg>
      {/* the table */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, bottom: 0, background: "linear-gradient(180deg, #7A5A3E 0%, #634831 40%, #48352A 100%)" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(178deg, rgba(0,0,0,0) 0 22px, rgba(0,0,0,0.07) 22px 24px), radial-gradient(ellipse 70% 50% at 30% 0%, rgba(255,230,200,0.18), rgba(255,230,200,0) 70%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: "rgba(255,230,200,0.2)" }} />
      </div>
      {/* the phone */}
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, borderRadius: 26, background: "#131210", transform: `rotate(${PHONE.rot}deg)`, boxShadow: "0 14px 24px rgba(0,0,0,0.5)", padding: 8, boxSizing: "border-box" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 20, background: lit > 0 ? `rgba(255,240,222,${0.25 + 0.6 * lit})` : "#1E1C19" }} />
      </div>
      {/* says what this is */}
      <div style={{ position: "absolute", left: 40, top: 40, fontFamily: F.mono, fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(237,228,210,0.55)" }}>YOUR VIDEO · 9:16 · PLACEHOLDER</div>
    </div>
  );
};

/** Instagram Reels UI zones (preview only): top bar, the button column, the caption — and the overlay band top */
export const Guides: React.FC<{ ovY: number }> = ({ ovY }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 220, background: "rgba(255,40,40,0.10)" }} />
    <div style={{ position: "absolute", left: SAFE.buttons, right: 0, top: 1100, height: 640, background: "rgba(255,40,40,0.16)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE.bottom, bottom: 0, background: "rgba(255,40,40,0.12)" }} />
    <div style={{ position: "absolute", left: SAFE.right, top: 0, bottom: 0, width: 2, background: "rgba(255,40,40,0.5)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: ovY, height: 2, background: "rgba(40,160,255,0.8)" }} />
    <div style={{ position: "absolute", left: 12, top: ovY + 6, fontFamily: F.mono, fontSize: 20, color: "rgba(120,200,255,0.95)" }}>OVERLAY BAND y ≥ {ovY}</div>
    <div style={{ position: "absolute", left: 12, top: SAFE.bottom + 6, fontFamily: F.mono, fontSize: 20, color: C.cream }}>CAPTION · USERNAME</div>
  </div>
);
