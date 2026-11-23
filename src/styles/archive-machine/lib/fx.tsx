// Archive Machine · film texture: grain (24 fps), dust specks and hairs, the odd vertical scratch, gate weave and
// exposure flicker. Everything is a pure function of time (hash of the 24 fps film frame), so stills = render.
import React, { useMemo } from "react";
import { hash, noise1 } from "./time";

const ff = (t: number) => Math.floor(t * 24); // film frame (the archive was shot at 16–24 fps)

/** full-frame grain, overlay-blended */
export const Grain: React.FC<{ t: number; a?: number; size?: number }> = ({ t, a = 0.07, size = 256 }) => {
  const url = useMemo(() => {
    if (typeof document === "undefined") return "";
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d")!;
    const im = x.createImageData(size, size);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(hash(i * 0.37 + 1) * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL();
  }, [size]);
  const f = ff(t);
  return (
    <div
      style={{
        position: "absolute", inset: 0, backgroundImage: `url(${url})`, backgroundSize: `${size * 1.6}px`,
        backgroundPosition: `${Math.floor(hash(f) * 400)}px ${Math.floor(hash(f + 9) * 400)}px`,
        opacity: a, mixBlendMode: "overlay", pointerEvents: "none",
      }}
    />
  );
};

/** dust, hairs and a rare scratch inside a w×h frame (absolutely positioned by the parent) */
export const Dust: React.FC<{ t: number; w: number; h: number; amount?: number; seed?: number }> = ({ t, w, h, amount = 1, seed = 0 }) => {
  const f = ff(t) + seed * 1000;
  const items: React.ReactNode[] = [];
  // 0–3 specks per film frame
  const n = Math.floor(hash(f * 1.3) * 3.6 * amount);
  for (let i = 0; i < n; i++) {
    const r = 1.2 + hash(f * 7 + i) * 3.4;
    const light = hash(f * 3 + i * 11) > 0.55; // most dust is dark on a print, a few are clear (white)
    items.push(
      <circle key={"d" + i} cx={hash(f * 5 + i * 3) * w} cy={hash(f * 9 + i * 5) * h} r={r} fill={light ? "rgba(245,238,220,0.55)" : "rgba(10,8,6,0.6)"} />,
    );
  }
  // a hair every ~1.5 s, for 2–3 frames
  const hc = Math.floor(f / 36);
  if (hash(hc * 4.1 + seed) > 0.45 * (2 - amount) && f % 36 < 3) {
    const x0 = hash(hc * 2.3) * w, y0 = hash(hc * 3.7) * h, L = 40 + hash(hc) * 90, a = hash(hc * 5.5) * Math.PI * 2;
    const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
    items.push(<path key="hair" d={`M${x0},${y0} Q${(x0 + x1) / 2 + 18},${(y0 + y1) / 2 - 14} ${x1},${y1}`} stroke="rgba(12,10,8,0.55)" strokeWidth={1.3} fill="none" />);
  }
  // a thin vertical scratch that wanders, now and then
  const sc = Math.floor(f / 60);
  if (hash(sc * 8.7 + seed) > 0.62) {
    const sx = (hash(sc * 1.9) * 0.8 + 0.1) * w + noise1(f * 0.2, sc) * 6;
    items.push(<rect key="scr" x={sx} y={0} width={1.4} height={h} fill="rgba(240,232,210,0.22)" />);
  }
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {items}
    </svg>
  );
};

/** gate weave (px) and exposure flicker (multiplier) for time t */
export const weave = (t: number, k = 1) => {
  const f = ff(t);
  return { x: noise1(f * 0.35, 1) * 1.1 * k, y: noise1(f * 0.3, 2) * 1.6 * k };
};
export const flicker = (t: number, k = 1) => 1 + (hash(ff(t) * 2.7) - 0.5) * 0.05 * k;

/** inner vignette of a projected frame */
export const FrameVignette: React.FC<{ a?: number }> = ({ a = 0.55 }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(115% 100% at 50% 48%, transparent 55%, rgba(0,0,0,${a}) 100%)` }} />
);
