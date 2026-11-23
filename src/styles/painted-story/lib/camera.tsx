// Painted Story · the camera on painted pictures. Nothing ever sits frozen: every still/plate drifts hand-held,
// pushes or pans for its whole life, punches in on a word, and jolts on impacts and knocks.
//   Still  — a full-frame 16:9 still (doc look): cam preset + punch + jolt
//   World  — a large plate the camera travels over with keyframes (tale look); cut-outs live inside it in plate px
//   Cut    — a transparent cut-out pinned to an anchor point in plate px
import React from "react";
import { Img, useVideoConfig } from "remotion";
import { clamp, ease, mix, noise1, pulseAt, ramp, sine } from "./time";
import { useTheme } from "./theme";

export type Cam = "in" | "out" | "left" | "right" | "up" | "down" | "still";

/** one 16:9 still filling the frame, moving for its whole life [t0, t1].
 *  in 1.03→1.10 · out 1.11→1.04 · still 1.04→1.06 · pans 3.4% of the frame at zoom 1.1.
 *  punch: a tighter re-frame (×z) from time t on (a word) — the move restarts from there. */
export const Still: React.FC<{
  src: string; t: number; t0: number; t1: number; cam?: Cam; fx?: number; fy?: number;
  punch?: { t: number; z: number }; shake?: boolean; jolt?: number; filter?: string;
}> = ({ src, t, t0, t1, cam = "in", fx = 0.5, fy = 0.5, punch, shake, jolt = 0, filter }) => {
  const { width: W, height: H } = useVideoConfig();
  const punched = !!punch && t >= punch.t;
  const a = punched ? punch!.t : t0, b = punched ? t1 : Math.min(t1, punch?.t ?? t1);
  const u = sine((t - a) / Math.max(0.5, b - a));
  let z = 1.05, tx = 0, ty = 0;
  if (cam === "in") z = mix(1.03, 1.1, u);
  else if (cam === "out") z = mix(1.11, 1.04, u);
  else if (cam === "still") z = mix(1.04, 1.06, u);
  else {
    z = 1.1;
    const d = mix(1, -1, u) * 0.034;
    if (cam === "left") tx = -d * W;
    if (cam === "right") tx = d * W;
    if (cam === "up") ty = -d * H;
    if (cam === "down") ty = d * H;
  }
  if (punched) z *= punch!.z;
  // a jolt on the cut of a "shake" shot, plus any external pulse (knocks)
  const j = (shake ? Math.pow(1 - clamp((t - t0) / 0.6), 2) : 0) + jolt * 0.8;
  const jx = noise1(t * 38, 3) * 9 * j, jy = noise1(t * 41, 7) * 7 * j;
  // a slow hand-held drift so no still is ever frozen
  const hx = noise1(t * 0.31, 11) * 6, hy = noise1(t * 0.27, 17) * 4, rot = noise1(t * 0.22, 23) * 0.22;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      <Img
        src={src}
        style={{
          position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", maxWidth: "none", filter,
          transform: `translate(${tx + jx + hx}px, ${ty + jy + hy}px) rotate(${rot}deg) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`,
        }}
      />
    </div>
  );
};

/** a camera key: [time, zoom, focusX, focusY] — focus in plate fractions; zoom 1 = the plate's height fills the frame */
export type Key = [number, number, number, number];
export const camAt = (keys: Key[], t: number): Key => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = ease.inOut(ramp(t, a[0], b[0]));
      return [t, mix(a[1], b[1], u), mix(a[2], b[2], u), mix(a[3], b[3], u)];
    }
  }
  return keys[keys.length - 1];
};

/** a plate "world" (default 1280×1920 portrait plates for a 9:16 frame: the frame shows the middle 1080).
 *  kicks: impact times (decaying jolts, `kick` px) · hand: hand-held amount · dim/blur: push a plate back behind UI.
 *  Children are positioned in plate px (x 0..pw, y 0..ph) and move with the plate. */
export const World: React.FC<{
  src: string; t: number; keys: Key[]; pw?: number; ph?: number; kicks?: number[]; kick?: number; jolt?: number;
  blur?: number; dim?: number; hand?: number; filter?: string; tilt?: number; children?: React.ReactNode;
}> = ({ src, t, keys, pw = 1280, ph = 1920, kicks = [], kick = 16, jolt = 0, blur = 0, dim = 0, hand = 1, filter, tilt = 0, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const th = useTheme();
  const [, z0, fx, fy] = camAt(keys, t);
  const z = (z0 * H) / ph; // zoom 1 = plate height fills the frame
  let tx = W / 2 - fx * pw * z, ty = H / 2 - fy * ph * z;
  tx = clamp(tx, W - pw * z, 0);
  ty = clamp(ty, H - ph * z, 0);
  const k = Math.max(pulseAt(t, kicks), jolt);
  // hand-held drift (never a frozen frame) + impact jolts
  const hx = noise1(t * 0.33, 11) * 7 * hand + noise1(t * 31, 3) * kick * k;
  const hy = noise1(t * 0.29, 17) * 6 * hand + noise1(t * 37, 7) * kick * 0.8 * k;
  const rot = noise1(t * 0.21, 23) * 0.25 * hand + tilt;
  const pad = 1 + 0.03 * hand + 0.02 * k; // a hair of overscan so the drift never shows an edge
  const f = [blur ? `blur(${blur}px)` : "", filter ?? ""].join(" ").trim();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: th.ink }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${hx}px, ${hy}px) rotate(${rot}deg) scale(${pad})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: pw, height: ph, transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: "0 0" }}>
          <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: pw, height: ph, maxWidth: "none", filter: f || undefined }} />
          {children}
        </div>
      </div>
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: th.ink, opacity: dim }} /> : null}
    </div>
  );
};

/** a transparent cut-out placed by an anchor point: (x, y) in plate px; ax/ay = which point of the cut-out sits there
 *  (0.5, 1 = bottom centre, i.e. feet on the floor). ar = width / height of the image. ox/oy = rotation pivot. */
export const Cut: React.FC<{
  src: string; ar: number; x: number; y: number; h: number; ax?: number; ay?: number; rot?: number; ox?: number; oy?: number;
  flip?: boolean; blur?: number; op?: number; filter?: string; shadow?: boolean; clip?: string;
  /** fade the bottom part (0..1 of the height) into the scene — for a cut-out that ends mid-frame (a head over a blanket) */
  fadeBottom?: number;
}> = ({ src, ar, x, y, h, ax = 0.5, ay = 1, rot = 0, ox = 0.5, oy = 1, flip, blur = 0, op = 1, filter, shadow, clip, fadeBottom = 0 }) => {
  const w = ar * h;
  const f = [blur ? `blur(${blur}px)` : "", filter ?? "", shadow ? "drop-shadow(0 30px 40px rgba(0,0,0,0.45))" : ""].join(" ").trim();
  const mask = fadeBottom > 0 ? `linear-gradient(to bottom, #000 ${((1 - fadeBottom) * 100).toFixed(1)}%, transparent 100%)` : undefined;
  return (
    <div style={{ position: "absolute", left: x - ax * w, top: y - ay * h, width: w, height: h, opacity: op, transform: `rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: `${ox * 100}% ${oy * 100}%`, clipPath: clip, WebkitMaskImage: mask, maskImage: mask }}>
      <Img src={src} style={{ width: "100%", height: "100%", maxWidth: "none", filter: f || undefined }} />
    </div>
  );
};
