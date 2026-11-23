// Talk Cutout · film texture: a light grain (overlay, 24 fps) and the soft vignette over the whole frame.
import React, { useMemo } from "react";
import { hash } from "./time";

/** full-frame grain, overlay-blended (keep a ≤ 0.03: grain inflates the file size fast) */
export const Grain: React.FC<{ t: number; a?: number; size?: number }> = ({ t, a = 0.03, size = 256 }) => {
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
  const f = Math.floor(t * 24);
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

/** a soft frame vignette (draw above everything but the captions) */
export const Vignette: React.FC<{ a?: number }> = ({ a = 0.42 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at 50% 48%, transparent 58%, rgba(0,0,0,${a}) 100%)`, pointerEvents: "none" }} />
);
