// Talk Cutout · word-by-word captions. A chunk (a short phrase, cut by hand on the phrases) shows from a to b; each of
// its words appears ON its spoken word (at[i]) and the whole phrase's place is reserved from the start, so nothing
// jumps. Key words turn accent. Generated from words.json by pipeline/captions.mjs.
// Vertical: y 1478 everywhere (a soft plate over her, a solid plate over the motion, so a caption never reads over an
// app's own text); only while the comment sheet covers the bottom does it ride on her collar (y ≈ 985). Decide the
// position per chunk (by its start), so a phrase never jumps at a cut.
// Landscape: bottom centre (y ≈ 968) over her chest, a soft dark ellipse behind the line; a solid plate on full-screen
// sections and the end card.
import React from "react";
import { C, F, SD } from "./theme";
import { clamp, ease } from "./time";

export type Cap = { a: number; b: number; text: string; key?: string[]; hide?: boolean; at: number[] };
/** the chunk on screen at t */
export const capAt = (caps: Cap[], t: number) => caps.find((c) => t >= c.a - 0.05 && t < c.b);

const Words: React.FC<{ c: Cap; t: number; pending: number; lift: number; latSize: number }> = ({ c, t, pending, lift, latSize }) => (
  <>
    {c.text.split(" ").map((w, i) => {
      const at = c.at[Math.min(i, c.at.length - 1)];
      const u = ease.out(clamp((t - at + 0.04) / 0.2));
      const isKey = c.key?.some((k) => w.includes(k));
      const lat = /[A-Za-z0-9]/.test(w);
      const kick = isKey ? 1 + 0.08 * ease.outBack(clamp((t - at) / 0.3)) - 0.08 * clamp((t - at - 0.3) / 0.4) : 1;
      return (
        <span key={i} style={{ display: "inline-block", marginLeft: lat ? 14 : 16, marginRight: lat ? 14 : 0, unicodeBidi: "isolate", opacity: pending + (1 - pending) * u, transform: `translateY(${(1 - u) * lift}px) scale(${t >= at ? kick : 1})`, filter: u < 1 && pending === 0 ? `blur(${(1 - u) * 6}px)` : undefined, color: isKey && u > 0.2 ? C.accent2 : undefined, fontFamily: lat ? F.ui : undefined, fontWeight: lat ? 800 : undefined, fontSize: lat ? latSize : undefined }}>
          {w}
        </span>
      );
    })}
  </>
);

/** vertical (1080×1920). plate = height of the soft plate; solid = a dark rounded plate (over motion) */
export const Captions: React.FC<{ t: number; caps: Cap[]; y?: number; plate?: number; solid?: boolean }> = ({ t, caps, y = 1478, plate = 300, solid = false }) => {
  const c = capAt(caps, t);
  if (!c || c.hide) return null;
  const fadeOut = 1 - clamp((t - (c.b - 0.1)) / 0.1);
  return (
    <>
      {solid ? null : <div style={{ position: "absolute", left: 0, right: 0, top: y - plate / 2, height: plate, background: "linear-gradient(rgba(4,5,6,0), rgba(4,5,6,0.62) 38%, rgba(4,5,6,0.62) 62%, rgba(4,5,6,0))", opacity: fadeOut, pointerEvents: "none" }} />}
      <div style={{ position: "absolute", left: 90, right: 90, top: y - 70, height: 150, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.head, fontSize: 64, lineHeight: 1.3, color: C.cream, textShadow: SD, opacity: fadeOut, maxWidth: 900, ...(solid ? { background: "rgba(10,11,13,0.93)", padding: "10px 30px 14px", borderRadius: 28, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" } : {}) }}>
          <Words c={c} t={t} pending={0} lift={18} latSize={54} />
        </div>
      </div>
    </>
  );
};

/** landscape (1920×1080): one line, bottom centre; unspoken words wait at 50 % */
export const CapsWide: React.FC<{ t: number; caps: Cap[]; y?: number; solid?: boolean }> = ({ t, caps, y = 968, solid = false }) => {
  const c = capAt(caps, t);
  if (!c || c.hide) return null;
  const vis = Math.min(clamp((t - (c.a - 0.05)) / 0.08), 1 - clamp((t - (c.b - 0.1)) / 0.1));
  return (
    <>
      {solid ? null : (
        <div style={{ position: "absolute", left: 960 - 760, top: y - 105, width: 1520, height: 210, background: "radial-gradient(closest-side, rgba(4,5,6,0.62), rgba(4,5,6,0.42) 55%, rgba(4,5,6,0))", opacity: vis, pointerEvents: "none" }} />
      )}
      <div style={{ position: "absolute", left: 260, right: 260, top: y - 60, height: 120, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.head, fontSize: 58, lineHeight: 1.25, color: C.cream, textShadow: SD, opacity: vis, whiteSpace: "nowrap", ...(solid ? { background: "rgba(10,11,13,0.9)", padding: "8px 30px 12px", borderRadius: 26, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" } : {}) }}>
          <Words c={c} t={t} pending={0.5} lift={10} latSize={52} />
        </div>
      </div>
    </>
  );
};
