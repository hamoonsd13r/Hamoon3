// Screen Showcase · the camera over a screen. The screen is either YOUR screen recording (`clip`) or any React node
// drawn at its real size (`children`, e.g. a page built in code). Keys are [time, x, y, width] in SOURCE pixels (the
// height follows the box), so you aim the camera by reading coordinates straight off a frame of the recording.
// `marks` = accent frames with a label that stay locked on a UI element while the camera moves; `ripples` = click
// rings; `hold` freezes the recording from that time on while the camera keeps moving.
import React from "react";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import { C, FA, FPS, accentA, eio, eo, lerp, ramp, useT } from "./theme";

/** a clip that starts at film time t0 (right in the full render and in Look stills, where frame ≠ time) */
export const Vid: React.FC<{ src: string; t: number; t0: number; from?: number; rate?: number; style?: React.CSSProperties }> = ({ src, t, t0, from = 0, rate = 1, style }) => {
  const { frame } = useT();
  const off = Math.round((t - t0) * FPS);
  return (
    <Sequence from={frame - off} layout="none">
      <OffthreadVideo src={src.startsWith("http") ? src : staticFile(src)} muted trimBefore={Math.round(from * FPS)} playbackRate={rate} style={style} />
    </Sequence>
  );
};

export type Key = [t: number, x: number, y: number, w: number];
export type Mark = { t0: number; t1: number; x: number; y: number; w: number; h: number; label?: string; below?: boolean };
export type Ripple = { t: number; x: number; y: number };
export const camAt = (keys: Key[], t: number): Key => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 0; i + 1 < keys.length; i++) {
    if (t < keys[i + 1][0]) {
      const k = eio(ramp(t, keys[i][0], keys[i + 1][0]));
      return [t, lerp(keys[i][1], keys[i + 1][1], k), lerp(keys[i][2], keys[i + 1][2], k), lerp(keys[i][3], keys[i + 1][3], k)];
    }
  }
  return keys[keys.length - 1];
};

export type Clip = { src: string; t0: number; from?: number; rate?: number; hold?: number };
export const CamView: React.FC<{
  t: number; keys: Key[];
  /** the box on screen (frame px) */ bw: number; bh: number;
  /** the source size (px of the recording / of the coded screen) */ sw: number; sh: number;
  clip?: Clip; children?: React.ReactNode; marks?: Mark[]; ripples?: Ripple[]; filter?: string; bg?: string;
}> = ({ t, keys, bw, bh, sw, sh, clip, children, marks = [], ripples = [], filter, bg = "#000" }) => {
  const [, cx, cy, cw] = camAt(keys, t);
  const s = bw / cw;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: bw, height: bh, overflow: "hidden", background: bg }}>
      <div style={{ position: "absolute", left: -cx * s, top: -cy * s, width: sw * s, height: sh * s, filter }}>
        {clip ? (
          <Vid src={clip.src} t={Math.min(t, clip.hold ?? 1e9)} t0={clip.t0} from={clip.from} rate={clip.rate} style={{ width: "100%", height: "100%", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", left: 0, top: 0, width: sw, height: sh, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div>
        )}
      </div>
      {ripples.map((r, i) => {
        const p = ramp(t, r.t, r.t + 0.55);
        if (p <= 0 || p >= 1) return null;
        const d = 30 + 150 * eo(p);
        return <div key={`r${i}`} style={{ position: "absolute", left: (r.x - cx) * s - d / 2, top: (r.y - cy) * s - d / 2, width: d, height: d, borderRadius: d / 2, border: `4px solid ${C.accent}`, opacity: 1 - p }} />;
      })}
      {marks.map((m, i) => {
        const k = eo(ramp(t, m.t0, m.t0 + 0.25)) * (1 - ramp(t, m.t1 - 0.15, m.t1));
        if (k <= 0) return null;
        const pad = 6;
        return (
          <div key={i} style={{ position: "absolute", left: (m.x - cx) * s - pad, top: (m.y - cy) * s - pad, width: m.w * s + 2 * pad, height: m.h * s + 2 * pad, borderRadius: 14, border: `3px solid ${C.accent}`, boxShadow: `0 0 0 6px ${accentA(0.12 * k)}, 0 0 30px ${accentA(0.35 * k)}`, opacity: k, transform: `scale(${1.06 - 0.06 * k})` }}>
            {m.label ? (
              <div style={{ position: "absolute", right: -3, ...(m.below ? { top: "calc(100% + 10px)" } : { bottom: "calc(100% + 10px)" }), padding: "6px 16px", borderRadius: 10, background: C.accent, color: "#160A02", fontFamily: FA, fontWeight: 700, fontSize: 26, whiteSpace: "nowrap", direction: "rtl" }}>{m.label}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
