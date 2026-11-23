// Explore Wall · a screenshot as proof: a floating card showing the `crop` of a screen at display width `w`, with
//   hide    — rects (screen px) under a frosted, blurred copy of themselves: a page's @username, links, faces
//   patches — a fresh number drawn over the screen's older one (same background, Inter Semibold); pass a rolling
//             text per frame to make the screenshot's own number count up
//   rings   — a rounded highlight that draws itself around a rect (k 0→1), accent or the Instagram gradient
// The screen is YOUR screenshot (`src`, a public path) or any React node drawn at its real size (`children` → the
// demo's code-drawn screens). Everything is placed in screen px × (w / crop.w), so it stays glued to the picture.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, accentA, clamp } from "./theme";

export type Rect = { x: number; y: number; w: number; h: number };
export type Patch = { r: Rect; text: string; px: number; color?: string; weight?: number; bg?: string };
export type Ring = { r: Rect; k: number; pad?: number; color?: string; grad?: boolean; width?: number };
export type ProofP = {
  src?: string; screen?: React.ReactNode; sw: number; sh: number; crop?: Rect; w: number; x?: number; y?: number;
  hide?: Rect[]; patches?: Patch[]; rings?: Ring[]; bg?: string; radius?: number; shadow?: boolean; style?: React.CSSProperties; children?: React.ReactNode;
};
export const ProofShot: React.FC<ProofP> = ({ src, screen, sw, sh, crop, w, x = 0, y = 0, hide = [], patches = [], rings = [], bg = C.ig, radius = 34, shadow = true, style, children }) => {
  const cr = crop ?? { x: 0, y: 0, w: sw, h: sh };
  const s = w / cr.w;
  const h = cr.h * s;
  const P = (r: Rect, pad = 0): React.CSSProperties => ({ position: "absolute", left: (r.x - cr.x - pad) * s, top: (r.y - cr.y - pad) * s, width: (r.w + 2 * pad) * s, height: (r.h + 2 * pad) * s });
  const pic = (extra: React.CSSProperties = {}) =>
    src ? (
      <Img src={staticFile(src)} style={{ position: "absolute", left: -cr.x * s, top: -cr.y * s, width: sw * s, height: sh * s, maxWidth: "none", ...extra }} />
    ) : (
      <div style={{ position: "absolute", left: -cr.x * s, top: -cr.y * s, width: sw, height: sh, transform: `scale(${s})`, transformOrigin: "0 0", ...extra }}>{screen}</div>
    );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: radius, overflow: "hidden", background: bg, boxShadow: shadow ? "0 30px 90px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.45)" : undefined, outline: "1px solid rgba(244,238,230,0.12)", ...style }}>
      {pic()}
      {hide.map((r, i) => (
        <div key={`h${i}`} style={{ ...P(r, 4), overflow: "hidden", borderRadius: 10 * s + 4 }}>
          <div style={{ position: "absolute", inset: 0, background: bg }} />
          <div style={{ position: "absolute", left: -(r.x - cr.x - 4) * s, top: -(r.y - cr.y - 4) * s, width: sw * s, height: sh * s }}>
            {pic({ filter: `blur(${Math.max(5, 9 * s)}px)`, opacity: 0.75 })}
          </div>
        </div>
      ))}
      {patches.map((p, i) => (
        <div key={`p${i}`} style={{ ...P(p.r, 2), background: p.bg ?? bg, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: F.ui, fontWeight: p.weight ?? 650, fontSize: p.px * s, lineHeight: 1, color: p.color ?? "#F5F5F7", direction: "ltr", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", paddingLeft: 2 * s }}>{p.text}</span>
        </div>
      ))}
      {rings.map((g, i) => {
        if (g.k <= 0) return null;
        const pad = g.pad ?? 10;
        const box = P(g.r, pad);
        const bw = box.width as number, bh = box.height as number, rr = Math.min(bh / 2, 18 * s + 8);
        const per = 2 * (bw + bh - 4 * rr) + 2 * Math.PI * rr;
        const id = `ewring-${i}`;
        const k = clamp(g.k);
        return (
          <svg key={`r${i}`} width={bw + 20} height={bh + 20} style={{ position: "absolute", left: (box.left as number) - 10, top: (box.top as number) - 10, overflow: "visible", filter: `drop-shadow(0 0 ${10 * k}px ${g.grad ? "rgba(214,41,118,0.6)" : accentA(0.6)})` }}>
            {g.grad ? (
              <defs>
                <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor={C.ig1} />
                  <stop offset="0.3" stopColor={C.ig2} />
                  <stop offset="0.6" stopColor={C.ig3} />
                  <stop offset="1" stopColor={C.ig4} />
                </linearGradient>
              </defs>
            ) : null}
            <rect x={10} y={10} width={bw} height={bh} rx={rr} ry={rr} fill="none" stroke={g.grad ? `url(#${id})` : g.color ?? C.accent} strokeWidth={g.width ?? 5} strokeDasharray={`${per * k} ${per}`} strokeLinecap="round" />
          </svg>
        );
      })}
      {children}
    </div>
  );
};
/** frame-px rect of a screen rect for a ProofShot placed at (x, y) with width w and crop (for Lift's `from`) */
export const shotToFrame = (r: Rect, p: { x?: number; y?: number; w: number; crop?: Rect; sw: number; sh: number }): Rect => {
  const cr = p.crop ?? { x: 0, y: 0, w: p.sw, h: p.sh };
  const s = p.w / cr.w;
  return { x: (p.x ?? 0) + (r.x - cr.x) * s, y: (p.y ?? 0) + (r.y - cr.y) * s, w: r.w * s, h: r.h * s };
};
