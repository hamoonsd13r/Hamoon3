// Talk Cutout · the camera for the motion sections: a world (phone, tablet, a stats page …) filmed by a camera that
// can push in, travel and tilt. Screens are drawn at true UI size and scaled by the camera, so text stays sharp.
import React from "react";
import { ease, mix } from "./time";

export type Cam = { x: number; y: number; s: number; rx?: number; ry?: number; rz?: number };

/** a world filmed by the camera: (x, y) of the world sits at the frame centre, scaled by s, tilted in 3D.
 *  w × h = the frame (1080×1920 vertical, 1920×1080 landscape). */
export const World: React.FC<{ cam: Cam; children: React.ReactNode; w?: number; h?: number; persp?: number; style?: React.CSSProperties }> = ({ cam, children, w = 1080, h = 1920, persp = 2600, style }) => (
  <div style={{ position: "absolute", inset: 0, perspective: persp, perspectiveOrigin: `${w / 2}px ${h / 2}px`, overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transformStyle: "preserve-3d", transform: `translate(${w / 2}px,${h / 2}px) rotateX(${cam.rx ?? 0}deg) rotateY(${cam.ry ?? 0}deg) rotateZ(${cam.rz ?? 0}deg) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)` }}>
      {children}
    </div>
  </div>
);

/** interpolate cameras through keys [time, cam] (eased; scale in log space so zooms feel even) */
export const camKF = (t: number, keys: [number, Cam][], e: (u: number) => number = ease.inOut): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, A] = keys[i - 1], [b, B] = keys[i];
      const u = e(b <= a ? 1 : (t - a) / (b - a));
      return { x: mix(A.x, B.x, u), y: mix(A.y, B.y, u), s: Math.exp(mix(Math.log(A.s), Math.log(B.s), u)), rx: mix(A.rx ?? 0, B.rx ?? 0, u), ry: mix(A.ry ?? 0, B.ry ?? 0, u), rz: mix(A.rz ?? 0, B.rz ?? 0, u) };
    }
  }
  return keys[keys.length - 1][1];
};

/** slow hand-held drift added to any camera (tiny, so screens stay readable) */
export const drift = (cam: Cam, t: number, amt = 1): Cam => ({
  ...cam,
  x: cam.x + amt * 6 * Math.sin(t * 0.53 + 1.1),
  y: cam.y + amt * 5 * Math.sin(t * 0.41 + 2.3),
  rx: (cam.rx ?? 0) + amt * 0.5 * Math.sin(t * 0.37),
  ry: (cam.ry ?? 0) + amt * 0.7 * Math.sin(t * 0.31 + 0.7),
});

/** keep a page of width pw (world x from x0) under the whole frame once it is wider than the frame
 *  (a stats page that pushes in must never show a black edge) */
export const clampToPage = (c: Cam, x0: number, pw: number, frameW = 1080): Cam => {
  if (pw * c.s <= frameW) return c;
  const lo = x0 + frameW / 2 / c.s, hi = x0 + pw - frameW / 2 / c.s;
  return { ...c, x: Math.max(lo, Math.min(hi, c.x)) };
};

/** world → frame px for a camera without tilt (where a number sits on screen, so a lift starts there) */
export const toScreen = (c: Cam, p: { x: number; y: number }, w = 1080, h = 1920) => ({ x: w / 2 + c.s * (p.x - c.x), y: h / 2 + c.s * (p.y - c.y) });
