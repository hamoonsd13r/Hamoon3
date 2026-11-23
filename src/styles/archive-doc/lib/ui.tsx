// Archive Doc · type on top of the footage: the opening title, chapter cards, place/date captions (typed like a
// report), name supers, the end card. All are functions of film time t with their own in/out times.
import React from "react";
import { C, F, clamp, ease, ramp } from "./theme";

type P = React.CSSProperties;
export const SD = "0 2px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)";
/** the dark plate behind small type over footage (light text on a light picture is unreadable) */
export const PLATE: P = { background: "linear-gradient(270deg, rgba(8,7,5,0.84) 0%, rgba(8,7,5,0.66) 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", borderRadius: 3 };
export const fade = (t: number, a: number, b: number, inD = 0.5, outD = 0.35) => ease.out(ramp(t, a, a + inD)) * (1 - ease.in(ramp(t, b - outD, b)));

/** typed text: reveals characters left→right in reading order (RTL handled by the browser), with a caret */
export const Typed: React.FC<{ s: string; u: number; style?: P; caret?: boolean }> = ({ s, u, style, caret = true }) => {
  const n = Math.round(clamp(u) * [...s].length);
  const shown = [...s].slice(0, n).join("");
  return (
    <span style={{ position: "relative", whiteSpace: "pre", ...style }}>
      <span style={{ visibility: "hidden" }}>{s}</span>
      <span style={{ position: "absolute", right: 0, top: 0 }}>{shown}{caret && u < 1 ? <span style={{ opacity: 0.8 }}>▍</span> : null}</span>
    </span>
  );
};

/** place · date, bottom-right, typed (Vazir Code), with a brass rule */
export const Caption: React.FC<{ t: number; a: number; b: number; place: string; when?: string }> = ({ t, a, b, place, when }) => {
  if (t < a || t > b) return null;
  const v = fade(t, a, b, 0.25, 0.4);
  const u1 = ramp(t, a + 0.1, a + 0.1 + place.length * 0.035);
  const u2 = when ? ramp(t, a + 0.25 + place.length * 0.035, a + 0.25 + place.length * 0.035 + when.length * 0.035) : 0;
  return (
    <div style={{ position: "absolute", right: 84, bottom: 76, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, opacity: v, direction: "rtl", padding: "16px 26px 18px", ...PLATE }}>
      <div style={{ width: 64 * ease.out(ramp(t, a, a + 0.5)), height: 3, background: C.brass }} />
      <Typed s={place} u={u1} style={{ fontFamily: F.mono, fontSize: 34, color: C.cream, textShadow: SD, letterSpacing: 0.5 }} />
      {when ? <Typed s={when} u={u2} style={{ fontFamily: F.mono, fontSize: 28, color: C.brass, textShadow: SD }} caret={false} /> : null}
    </div>
  );
};

/** a person: name large, role small, bottom-right with a brass bar on the right */
export const NameSuper: React.FC<{ t: number; a: number; b: number; name: string; role: string }> = ({ t, a, b, name, role }) => {
  if (t < a || t > b) return null;
  const v = fade(t, a, b, 0.5, 0.4);
  const bar = ease.out(ramp(t, a, a + 0.45));
  return (
    <div style={{ position: "absolute", right: 84, bottom: 80, display: "flex", alignItems: "stretch", gap: 22, direction: "rtl", opacity: v, padding: "16px 30px 18px 34px", ...PLATE }}>
      <div style={{ width: 4, background: C.brass, transform: `scaleY(${bar})`, transformOrigin: "bottom" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, transform: `translateX(${(1 - ease.out(ramp(t, a + 0.1, a + 0.7))) * 18}px)` }}>
        <div style={{ fontFamily: F.fa, fontSize: 52, color: C.cream, textShadow: SD, whiteSpace: "nowrap", lineHeight: 1.25 }}>{name}</div>
        <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 28, color: C.creamDim, textShadow: SD, whiteSpace: "nowrap" }}>{role}</div>
      </div>
    </div>
  );
};

/** chapter card: Persian ordinal number + brass rule + name, centred, over a soft shade */
export const Chapter: React.FC<{ t: number; a: number; b: number; n: string; name: string }> = ({ t, a, b, n, name }) => {
  if (t < a - 0.1 || t > b + 0.1) return null;
  const u = ease.out(ramp(t, a, a + 0.8)), o = ease.inOut(ramp(t, b - 0.6, b));
  const v = u * (1 - o);
  if (v <= 0) return null;
  const rule = ease.inOut(ramp(t, a + 0.15, a + 1.0));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(62% 50% at 50% 52%, rgba(6,5,4,0.8) 0%, rgba(6,5,4,0.5) 55%, rgba(6,5,4,0.2) 85%)", opacity: v }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: v, filter: v < 1 ? `blur(${(1 - v) * 8}px)` : undefined, transform: `translateY(${(1 - u) * 18 - o * 10}px) scale(${1.04 - 0.04 * u})` }}>
        <div style={{ fontFamily: F.title, fontSize: 64, color: C.brass, textShadow: SD, lineHeight: 1 }}>{n}</div>
        <div style={{ width: 220 * rule, height: 2, background: C.brass, opacity: 0.9 }} />
        <div style={{ fontFamily: F.title, fontSize: 124, color: C.cream, direction: "rtl", textShadow: "0 8px 36px rgba(0,0,0,0.8)", lineHeight: 1.25, whiteSpace: "nowrap" }}>{name}</div>
      </div>
    </div>
  );
};

/** the film title after the cold open */
export const Title: React.FC<{ t: number; a: number; b: number; title: string; sub: string }> = ({ t, a, b, title, sub }) => {
  if (t < a - 0.1 || t > b + 0.1) return null;
  const u = ease.out(ramp(t, a, a + 1.1)), o = ease.inOut(ramp(t, b - 0.8, b));
  const s = ease.out(ramp(t, a + 0.9, a + 1.8));
  const v = 1 - o;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 55% at 50% 50%, rgba(6,5,4,0.76) 0%, rgba(6,5,4,0.45) 60%, rgba(6,5,4,0.15) 90%)", opacity: v }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, direction: "rtl", opacity: v }}>
        <div style={{ fontFamily: F.title, fontSize: 210, color: C.cream, lineHeight: 1.2, textShadow: "0 10px 44px rgba(0,0,0,0.8)", opacity: u, filter: u < 1 ? `blur(${(1 - u) * 14}px)` : undefined, transform: `scale(${1.08 - 0.08 * u})`, letterSpacing: -1 }}>{title}</div>
        <div style={{ width: 420 * s, height: 3, background: C.brass }} />
        <div style={{ fontFamily: F.faS, fontSize: 40, color: C.creamDim, textShadow: SD, opacity: s, transform: `translateY(${(1 - s) * 10}px)` }}>{sub}</div>
      </div>
    </div>
  );
};

/** end card: sources + who made it */
export const EndCard: React.FC<{ t: number; a: number; title: string; lines: string[]; credit: string }> = ({ t, a, title, lines, credit }) => {
  if (t < a) return null;
  const st = (d: number) => ease.out(ramp(t, a + d, a + d + 0.9));
  return (
    <div style={{ position: "absolute", inset: 0, background: C.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, direction: "rtl", opacity: ease.out(ramp(t, a, a + 0.8)) }}>
      <div style={{ fontFamily: F.title, fontSize: 96, color: C.cream, opacity: st(0.3) }}>{title}</div>
      <div style={{ width: 300 * st(0.6), height: 2, background: C.brass }} />
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F.ui, fontWeight: 400, fontSize: 30, color: C.creamDim, opacity: st(0.9 + i * 0.25), whiteSpace: "nowrap" }}>{l}</div>
      ))}
      <div style={{ marginTop: 26, fontFamily: F.lat, fontSize: 28, color: C.brass, letterSpacing: 4, direction: "ltr", opacity: st(1.2 + lines.length * 0.25) }}>{credit}</div>
    </div>
  );
};
