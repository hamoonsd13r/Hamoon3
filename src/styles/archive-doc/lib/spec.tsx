// Archive Doc · the spec sheet: one or two subjects side by side (a machine, a ship, a city then and now), each with
// its period photo and a slow push, and rows that arrive with the narration — a label in brass, each subject's value
// under its own photo, optional bars that grow to compare. Values must come from records (cite them in the film).
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, GRADE, W, ease, mix, ramp } from "./theme";
import type { Media } from "./picture";

export type SpecSide = { img: string; name: string; sub: string; crop?: string; hint?: string };
export type SpecRow = { at: number; label: string; values: string[]; bar?: number[] };

const Panel: React.FC<{ side: SpecSide; media: Media; x: number; w: number; t: number; a: number; b: number; u: number }> = ({ side, media, x, w, t, a, b, u }) => {
  const z = mix(1.02, 1.1, ramp(t, a, b));
  const m = media[side.img];
  return (
    <div style={{ position: "absolute", left: x, top: 96, width: w, height: 470, opacity: u, transform: `translateY(${(1 - u) * 20}px)` }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.55)", background: "#1a1713" }}>
        {m ? (
          <Img src={staticFile(m.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: side.crop ?? "50% 40%", filter: GRADE, transform: `scale(${z})`, maxWidth: "none" }} />
        ) : (
          <div style={{ position: "absolute", left: 30, top: 26, fontFamily: F.ui, fontWeight: 600, fontSize: 22, color: C.creamFaint, direction: "rtl" }}>{`جای عکس: ${side.hint ?? side.img}`}</div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(8,7,5,0.85) 100%)" }} />
      </div>
      <div style={{ position: "absolute", right: 26, bottom: 18, direction: "rtl", textAlign: "right" }}>
        <div style={{ fontFamily: F.title, fontSize: 52, color: C.cream, lineHeight: 1.2, textShadow: "0 3px 14px rgba(0,0,0,0.8)" }}>{side.name}</div>
        <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 26, color: C.brass }}>{side.sub}</div>
      </div>
    </div>
  );
};

/** sides[0] sits on the right (it is introduced first, RTL), sides[1] on the left */
export const SpecSheet: React.FC<{ t: number; a: number; b: number; sides: SpecSide[]; rows: SpecRow[]; media: Media; barColors?: string[] }> = ({ t, a, b, sides, rows, media, barColors = [C.brass, C.red] }) => {
  const v = ease.out(ramp(t, a, a + 0.6)) * (1 - ease.in(ramp(t, b - 0.5, b)));
  if (v <= 0) return null;
  const two = sides.length > 1;
  const pw = two ? 820 : 1200;
  const xs = two ? [W - 80 - pw, 80] : [(W - pw) / 2];
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 80% at 50% 40%, #1c1914 0%, ${C.ink} 75%)`, opacity: v }}>
      {sides.map((s, i) => (
        <Panel key={i} side={s} media={media} x={xs[i]} w={pw} t={t} a={a} b={b} u={ease.out(ramp(t, a + 0.1 + i * 0.4, a + 0.8 + i * 0.4))} />
      ))}
      {rows.map((r, j) => {
        const u = ease.out(ramp(t, r.at, r.at + 0.7));
        if (u <= 0) return null;
        const y = 598 + j * 110;
        const bu = ease.inOut(ramp(t, r.at + 0.2, r.at + 1.4));
        const max = r.bar ? Math.max(...r.bar) : 1;
        return (
          <div key={j} style={{ position: "absolute", left: 0, right: 0, top: y, height: 100, opacity: u, transform: `translateY(${(1 - u) * 14}px)` }}>
            {two ? <div style={{ position: "absolute", left: W / 2 - 300, width: 600, top: 0, textAlign: "center", fontFamily: F.ui, fontWeight: 700, fontSize: 28, color: C.brass, direction: "rtl", letterSpacing: 0.5 }}>{r.label}</div> : null}
            {!two ? (
              <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: 22, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 26 }}>
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 30, color: C.brass }}>{r.label}</span>
                <span style={{ fontFamily: F.fa, fontSize: 44, color: C.cream, whiteSpace: "nowrap" }}>{r.values[0]}</span>
              </div>
            ) : null}
            {two && r.values.map((val, i) => (
              <div key={i} style={{ position: "absolute", left: xs[i] + pw / 2 - 410, width: 820, top: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: F.fa, fontSize: 40, color: C.cream, whiteSpace: "nowrap", direction: "rtl", lineHeight: 1.15 }}>{val}</span>
                {r.bar ? <div style={{ height: 10, width: ((560 * r.bar[i]) / max) * bu, background: barColors[i % barColors.length], opacity: 0.9 }} /> : null}
              </div>
            ))}
            {two ? <div style={{ position: "absolute", left: W / 2 - 1, top: 40, width: 2, height: 50, background: "rgba(239,230,210,0.22)" }} /> : null}
          </div>
        );
      })}
    </div>
  );
};

/** a dossier card for a person (or thing) we have no photograph of: typed lines on paper with a round stamp */
export const Dossier: React.FC<{ t: number; a: number; b: number; head: string; lines: string[]; stamp?: string }> = ({ t, a, b, head, lines, stamp }) => {
  if (t < a || t > b) return null;
  const v = ease.out(ramp(t, a, a + 0.5)) * (1 - ease.in(ramp(t, b - 0.4, b)));
  return (
    <div style={{ position: "absolute", right: 110, top: 150, width: 640, padding: "30px 36px", background: C.paper, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", transform: `rotate(-1.2deg) translateY(${(1 - v) * 24}px)`, opacity: v, direction: "rtl" }}>
      <div style={{ fontFamily: F.mono, fontSize: 22, color: "#7a1f14", letterSpacing: 1, marginBottom: 14 }}>{head}</div>
      {lines.map((l, i) => {
        const u = ramp(t, a + 0.4 + i * 0.5, a + 0.4 + i * 0.5 + l.length * 0.03);
        return (
          <div key={i} style={{ fontFamily: i === 0 ? F.fa : F.mono, fontSize: i === 0 ? 46 : 27, color: C.inkLine, lineHeight: 1.45, whiteSpace: "nowrap", overflow: "hidden" }}>
            {[...l].slice(0, Math.round(u * [...l].length)).join("")}
          </div>
        );
      })}
      {stamp ? (
        <div style={{ position: "absolute", left: 24, bottom: 18, width: 110, height: 110, borderRadius: "50%", border: "4px solid rgba(122,31,20,0.55)", transform: "rotate(-14deg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 18, color: "rgba(122,31,20,0.7)" }}>{stamp}</div>
      ) : null}
    </div>
  );
};
