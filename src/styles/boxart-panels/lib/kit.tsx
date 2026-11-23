// Box-Art Panels · the pieces of the look: time-anchored footage and stills, the cover-art panel engine (slanted ink
// gutters), kinetic type, numbers that lift off the page, game-HUD atoms (rating stars, chips, target lock) and
// word-by-word captions.
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { C, F, FPS, SD, SDP, clamp, ease, mix, useT } from "./theme";

// ── footage ───────────────────────────────────────────────────────────────────────────────────────────────────
/** a clip whose local time is anchored to film time: it starts at `t0` from `from` seconds into the file, plays at
 *  `rate`, and holds its last frame (or loops). `src` = a path in public/, `len` = the file's length in seconds.
 *  Works in the render and in Look stills (frame ≠ time). */
export const Vid: React.FC<{ src: string; len: number; t0: number; from?: number; to?: number; rate?: number; loop?: boolean; style?: React.CSSProperties }> = ({ src, len, t0, from = 0, to, rate = 1, loop, style }) => {
  const { t, frame } = useT();
  const span = Math.max(0.03, (Math.min(len - 2 / FPS, to ?? len) - from) / rate);
  let sec = Math.max(0, t - t0);
  sec = loop ? sec % span : Math.min(sec, span);
  const local = Math.round(sec * FPS);
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(from * FPS)} playbackRate={rate} style={style} />
    </Sequence>
  );
};
/** a clip that covers its parent box */
export const Clip: React.FC<{ src: string; len: number; t0: number; from?: number; to?: number; rate?: number; loop?: boolean; pos?: string; scale?: number; x?: number; y?: number; filter?: string; origin?: string }> = ({ src, len, t0, from, to, rate, loop, pos = "50% 50%", scale = 1, x = 0, y = 0, filter, origin }) => (
  <Vid src={src} len={len} t0={t0} from={from} to={to} rate={rate} loop={loop} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", objectPosition: pos, transform: `translate(${x}px,${y}px) scale(${scale})`, transformOrigin: origin, filter }} />
);
/** a still that covers (or sits inside) its parent box */
export const Pic: React.FC<{ src: string; pos?: string; scale?: number; x?: number; y?: number; filter?: string; fit?: "cover" | "contain"; origin?: string; style?: React.CSSProperties }> = ({ src, pos = "50% 50%", scale = 1, x = 0, y = 0, filter, fit = "cover", origin = "50% 50%", style }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: fit, objectPosition: pos, transform: `translate(${x}px,${y}px) scale(${scale})`, transformOrigin: origin, filter, ...style }} />
);

// ── the cover-art panel engine ──────────────────────────────────────────────────────────────────────────────────
/** a quadrilateral: top-left, top-right, bottom-right, bottom-left (frame px) */
export type Quad = [number, number, number, number, number, number, number, number];
export const rq = (x: number, y: number, w: number, h: number): Quad => [x, y, x + w, y, x + w, y + h, x, y + h];
export const mixQ = (a: Quad, b: Quad, u: number): Quad => a.map((v, i) => mix(v, b[i], u)) as Quad;
/** grow / shrink a quad around its centre */
export const scaleQ = (q: Quad, k: number): Quad => {
  const cx = (q[0] + q[2] + q[4] + q[6]) / 4, cy = (q[1] + q[3] + q[5] + q[7]) / 4;
  return q.map((v, i) => (i % 2 === 0 ? cx + (v - cx) * k : cy + (v - cy) * k)) as Quad;
};
export const FULL: Quad = rq(0, 0, 1080, 1920);
/** a gutter line running left-right: y at x = 540 and its slope (dy/dx) */
export type HL = { y: number; s: number };
/** a gutter line running top-bottom: x at y = 960 and its slope (dx/dy) */
export type VL = { x: number; r: number };
const isect = (h: HL, v: VL): [number, number] => {
  const x = (v.x + v.r * (h.y - 540 * h.s - 960)) / (1 - v.r * h.s);
  return [x, h.y + h.s * (x - 540)];
};
/** the panel between two horizontal and two vertical gutter lines, inset by half the gutter width g */
export const cell = (top: HL, bot: HL, left: VL, right: VL, g = 16): Quad => {
  const T_ = { y: top.y + g / 2, s: top.s }, B = { y: bot.y - g / 2, s: bot.s }, L = { x: left.x + g / 2, r: left.r }, R = { x: right.x - g / 2, r: right.r };
  return [...isect(T_, L), ...isect(T_, R), ...isect(B, R), ...isect(B, L)] as Quad;
};
export const hl = (y: number, s = 0): HL => ({ y, s });
export const vl = (x: number, r = 0): VL => ({ x, r });
/** bounding box of a quad */
export const bbox = (q: Quad) => {
  const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]];
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, cx: (xs[0] + xs[1] + xs[2] + xs[3]) / 4, cy: (ys[0] + ys[1] + ys[2] + ys[3]) / 4 };
};
/** one panel of the cover: children are clipped to the quad and laid out in its bounding box */
export const Panel: React.FC<{ q: Quad; children?: React.ReactNode; bg?: string; style?: React.CSSProperties; dim?: number }> = ({ q, children, bg = "#07030d", style, dim = 0 }) => {
  const b = bbox(q);
  const x0 = Math.floor(b.x), y0 = Math.floor(b.y), w = Math.ceil(b.x + b.w) - x0, h = Math.ceil(b.y + b.h) - y0;
  if (w <= 2 || h <= 2) return null;
  const p = (i: number) => `${(q[i] - x0).toFixed(1)}px ${(q[i + 1] - y0).toFixed(1)}px`;
  return (
    <div style={{ position: "absolute", left: x0, top: y0, width: w, height: h, clipPath: `polygon(${p(0)}, ${p(2)}, ${p(4)}, ${p(6)})`, background: bg, overflow: "hidden", ...style }}>
      {children}
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: dim }} /> : null}
    </div>
  );
};
/** the ink backdrop the gutters are made of (a faint glow keeps it from being flat black) */
export const Ink: React.FC<{ glow?: number }> = ({ glow = 0.5 }) => (
  <div style={{ position: "absolute", inset: 0, background: C.ink }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 60% at 50% 100%, rgba(255,181,71,${0.16 * glow}), transparent 70%), radial-gradient(80% 50% at 50% 0%, rgba(75,107,255,${0.22 * glow}), transparent 70%)` }} />
  </div>
);

// ── kinetic type ────────────────────────────────────────────────────────────────────────────────────────────────
type KinFrom = "slam" | "rise" | "drop" | "left" | "right" | "fade";
/** a big word (or any node) centred on (x, y): slams in at `a`, lives, leaves at `b` */
export const Kin: React.FC<{
  t: number; a: number; b?: number; children: React.ReactNode; x?: number; y: number; size: number; color?: string; font?: string;
  from?: KinFrom; rot?: number; shadow?: string; ltr?: boolean; ls?: number; din?: number; dout?: number; width?: number; lh?: number; style?: React.CSSProperties;
}> = ({ t, a, b, children, x = 540, y, size, color = C.cream, font = F.head, from = "slam", rot = 0, shadow = SDP, ltr, ls, din = 0.2, dout = 0.16, width = 1040, lh = 1.05, style }) => {
  if (t < a || (b !== undefined && t > b + dout)) return null;
  const u = clamp((t - a) / din), e = ease.out(u);
  const v = b === undefined ? 0 : clamp((t - b) / dout);
  const sc = from === "slam" ? mix(1.5, 1, e) : from === "fade" ? mix(0.94, 1, e) : 1;
  const dx = from === "left" ? (1 - e) * -360 : from === "right" ? (1 - e) * 360 : 0;
  const dy = from === "rise" ? (1 - e) * 120 : from === "drop" ? (1 - e) * -120 : 0;
  const life = 1 + 0.03 * clamp((t - a) / 2.5);
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: y - size, width, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ direction: ltr ? "ltr" : "rtl", fontFamily: font, fontSize: size, lineHeight: lh, letterSpacing: ls, color, whiteSpace: "nowrap", textAlign: "center", textShadow: shadow, opacity: Math.min(1, u * 2.2) * (1 - v), filter: u < 1 || v > 0 ? `blur(${(1 - e) * 12 + v * 8}px)` : undefined, transform: `translate(${dx}px,${dy - v * 30}px) scale(${sc * life * (1 + v * 0.08)}) rotate(${rot}deg)`, ...style }}>
        {children}
      </div>
    </div>
  );
};
export type KW = { w: React.ReactNode; at: number; color?: string; k?: number; font?: string };
/** one line of words that come in one by one (right to left), each on its own time; the line is laid out whole
 *  from the start so nothing jumps. `b` = when the line leaves. */
export const KLine: React.FC<{ t: number; words: KW[]; y: number; size: number; b?: number; x?: number; gap?: number; font?: string; shadow?: string; ltr?: boolean; from?: "slam" | "rise"; dout?: number; width?: number }> = ({ t, words, y, size, b, x = 540, gap, font = F.head, shadow = SDP, ltr, from = "slam", dout = 0.16, width = 1060 }) => {
  if (t < words[0].at - 0.02 || (b !== undefined && t > b + dout)) return null;
  const v = b === undefined ? 0 : clamp((t - b) / dout);
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: y - size, width, height: size * 2, display: "flex", alignItems: "center", justifyContent: "center", gap: gap ?? size * 0.24, direction: ltr ? "ltr" : "rtl", pointerEvents: "none", opacity: 1 - v, filter: v > 0 ? `blur(${v * 8}px)` : undefined, transform: `translateY(${-v * 26}px) scale(${1 + v * 0.06})` }}>
      {words.map((w, i) => {
        const u = clamp((t - w.at) / 0.18), e = ease.out(u);
        const k = w.k ?? 1;
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: w.font ?? font, fontSize: size * k, lineHeight: 1.05, color: w.color ?? C.cream, whiteSpace: "nowrap", textShadow: shadow, opacity: Math.min(1, u * 2.4), filter: u < 1 ? `blur(${(1 - e) * 10}px)` : undefined, transform: from === "slam" ? `scale(${mix(1.5, 1, e)})` : `translateY(${(1 - e) * 60}px)`, unicodeBidi: "isolate" }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
/** Latin / number run inside Persian text (bidi-isolated) */
export const L: React.FC<{ children: React.ReactNode; font?: string; style?: React.CSSProperties }> = ({ children, font = F.anton, style }) => (
  <span style={{ direction: "ltr", unicodeBidi: "isolate", display: "inline-block", fontFamily: font, ...style }}>{children}</span>
);

// ── numbers that leave the page ─────────────────────────────────────────────────────────────────────────────────
export type Rect = { x: number; y: number; w: number; h: number };
export type Spot = { x: number; y: number; size: number };
/** a value that lifts off its source (a rect on the page) so that it stands on the hero spot exactly on `a` (it
 *  leaves LIFT seconds earlier and its counter is done by then), holds, and at `dockAt` lets go in place while its
 *  docked copy lands in the rail slot: nothing flies across the page. `text(u)` gets the 0..1 roll. */
export const LIFT = 0.3;
export const FlyNum: React.FC<{
  t: number; a: number; dockAt: number; from: Rect; hero: Spot; dock: Spot; text: (u: number) => string;
  color?: string; dockColor?: string; sub?: React.ReactNode; label?: React.ReactNode; font?: string;
}> = ({ t, a, dockAt, from, hero, dock, text, color = C.cream, dockColor = C.gold, sub, label, font = F.anton }) => {
  const a0 = a - LIFT;
  if (t < a0) return null;
  const f = ease.inOut(clamp((t - a0) / LIFT));
  const leave = clamp((t - dockAt) / 0.14);
  const land = t <= dockAt + 0.05 ? 0 : ease.outBack(clamp((t - dockAt - 0.05) / 0.3));
  const s0 = from.h / (hero.size * 0.78);
  const x = mix(from.x + from.w / 2, hero.x, f), y = mix(from.y + from.h / 2, hero.y, f);
  const sc = mix(s0, 1, f) * (1 - 0.35 * leave);
  const hit = clamp((t - a) / 0.07) * Math.exp(-Math.max(0, t - a - 0.07) * 7);
  const r = ease.out(clamp((t - a0) / (LIFT + 0.04)));
  return (
    <>
      {leave < 1 ? (
        <div style={{ position: "absolute", left: x - 520, top: y - hero.size * 0.6, width: 1040, height: hero.size * 1.2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 1 - leave, transform: `scale(${sc * (1 + 0.07 * hit)})` }}>
          <div style={{ fontFamily: font, fontSize: hero.size, lineHeight: 1, color, direction: "ltr", whiteSpace: "nowrap", textShadow: `0 ${6 + 10 * f}px 0 rgba(8,12,26,0.92), 0 ${10 + 26 * f}px ${20 + 50 * f}px rgba(10,4,20,0.6)` }}>
            {text(r)}
          </div>
          {sub || label ? (
            <div style={{ position: "absolute", top: hero.size * 1.14, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: clamp((t - a - 0.02) / 0.14), transform: `translateY(${(1 - ease.out(clamp((t - a - 0.02) / 0.2))) * 24}px)` }}>
              {label}
              {sub}
            </div>
          ) : null}
        </div>
      ) : null}
      {land > 0 ? (
        <div style={{ position: "absolute", left: dock.x - 200, top: dock.y - dock.size * 0.6, width: 400, height: dock.size * 1.2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", transform: `scale(${land})`, fontFamily: font, fontSize: dock.size, lineHeight: 1, color: dockColor, direction: "ltr", whiteSpace: "nowrap", textShadow: "0 3px 0 rgba(8,12,26,0.9)" }}>
          {text(1)}
        </div>
      ) : null}
    </>
  );
};
/** a dark veil that pulls the eye off a busy page while a number holds */
export const Scrim: React.FC<{ a: number; k?: number; blur?: number }> = ({ a, k = 0.62, blur = 7 }) => (a > 0 ? <div style={{ position: "absolute", inset: 0, background: `radial-gradient(75% 55% at 50% 45%, rgba(8,12,26,${k * 0.9}), rgba(8,12,26,${k}))`, opacity: a, backdropFilter: blur > 0 && a > 0.04 ? `blur(${(blur * a).toFixed(1)}px)` : undefined, pointerEvents: "none" }} /> : null);

// ── game-HUD atoms ───────────────────────────────────────────────────────────────────────────────────────────────────
const STAR = "M12 1.6l3.1 6.7 7.3.9-5.4 5 1.4 7.2L12 17.8 5.6 21.4 7 14.2 1.6 9.2l7.3-.9z";
/** rating stars: `lit` of `n` are on (fractional = the next one fading in); `flash` 0..1 blinks them */
export const Stars: React.FC<{ lit: number; n?: number; size?: number; gap?: number; flash?: number; color?: string }> = ({ lit, n = 5, size = 54, gap = 8, flash = 0, color = C.cream }) => (
  <div style={{ display: "flex", gap, direction: "ltr" }}>
    {Array.from({ length: n }, (_, i) => {
      const on = clamp(lit - i);
      const pop_ = on > 0 && on < 1 ? 1 + 0.5 * Math.sin(Math.PI * on) : 1;
      return (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", transform: `scale(${pop_})`, filter: "drop-shadow(0 3px 0 rgba(8,12,26,0.9))" }}>
          <path d={STAR} fill={on > 0 ? (flash > 0.5 ? C.gold : color) : "rgba(8,12,26,0.5)"} fillOpacity={on > 0 ? Math.max(0.35, on) : 1} stroke={on > 0 ? "none" : "rgba(255,244,230,0.55)"} strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      );
    })}
  </div>
);
/** a small pill label (Latin UI words, counters) */
export const Chip: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; bg?: string; color?: string }> = ({ children, style, bg = "rgba(8,12,26,0.82)", color = C.cream }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 999, background: bg, border: `1.5px solid ${C.line2}`, fontFamily: F.ui, fontWeight: 800, fontSize: 30, color, letterSpacing: 0.4, whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);
/** gold corner brackets around a rect (the target lock) */
export const Lock: React.FC<{ r: Rect; a: number; color?: string; w?: number; len?: number; pad?: number }> = ({ r, a, color = C.gold, w = 6, len = 34, pad = 10 }) => {
  if (a <= 0) return null;
  const k = mix(1.25, 1, ease.out(clamp(a)));
  const x = r.x - pad, y = r.y - pad, ww = r.w + pad * 2, hh = r.h + pad * 2;
  const c = (sx: number, sy: number): React.CSSProperties => ({ position: "absolute", left: sx < 0 ? 0 : undefined, right: sx > 0 ? 0 : undefined, top: sy < 0 ? 0 : undefined, bottom: sy > 0 ? 0 : undefined, width: len, height: len, borderLeft: sx < 0 ? `${w}px solid ${color}` : undefined, borderRight: sx > 0 ? `${w}px solid ${color}` : undefined, borderTop: sy < 0 ? `${w}px solid ${color}` : undefined, borderBottom: sy > 0 ? `${w}px solid ${color}` : undefined });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: ww, height: hh, opacity: clamp(a * 3), transform: `scale(${k})`, pointerEvents: "none", filter: "drop-shadow(0 2px 0 rgba(8,12,26,0.8))" }}>
      <div style={c(-1, -1)} /><div style={c(1, -1)} /><div style={c(1, 1)} /><div style={c(-1, 1)} />
    </div>
  );
};

// ── captions (cream words, the key ones in gold) ─────────────────────────────────────────────────
export type Cap = { a: number; b: number; text: string; key?: string[]; hide?: boolean; at: number[] };
export const Captions: React.FC<{ t: number; caps: Cap[]; y?: number; plate?: number; size?: number }> = ({ t, caps, y = 1408, plate = 250, size: size0 = 68 }) => {
  const c = caps.find((x) => t >= x.a - 0.05 && t < x.b);
  if (!c || c.hide) return null;
  const words = c.text.split(" ");
  const size = c.text.length > 27 ? size0 * 0.86 : size0;
  const fadeOut = 1 - clamp((t - (c.b - 0.1)) / 0.1);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - plate / 2, height: plate, background: "linear-gradient(rgba(8,12,26,0), rgba(8,12,26,0.8) 34%, rgba(8,12,26,0.8) 66%, rgba(8,12,26,0))", opacity: fadeOut, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: y - 75, height: 150, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.head, fontSize: size, lineHeight: 1.3, color: C.cream, textShadow: SD, opacity: fadeOut, whiteSpace: "nowrap" }}>
          {words.map((w, i) => {
            const at0 = c.at[Math.min(i, c.at.length - 1)];
            const u = ease.out(clamp((t - at0 + 0.04) / 0.18));
            const isKey = c.key?.some((k) => w.includes(k));
            const lat = /[A-Za-z]/.test(w);
            return (
              <span key={i} style={{ display: "inline-block", marginLeft: 15, unicodeBidi: "isolate", direction: lat ? "ltr" : "rtl", opacity: 0.56 + 0.44 * u, transform: `translateY(${(1 - u) * 10}px) scale(${isKey ? 1 + 0.07 * ease.outBack(clamp((t - at0) / 0.3)) - 0.07 * clamp((t - at0 - 0.3) / 0.4) : 1})`, color: isKey && u > 0.2 ? C.gold : undefined, fontFamily: lat ? F.anton : undefined, fontSize: lat ? size * 0.86 : undefined, letterSpacing: lat ? 1 : undefined }}>
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
