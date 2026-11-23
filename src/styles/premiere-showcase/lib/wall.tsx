// Premiere Showcase · the wall: all films in a hexagon of portrait tiles (rows like 3-4-5-4-3). The montage's last
// screen becomes the centre tile and the camera pulls straight back while the others fade in outwards; the running
// times are added up (each tile flashes as it is counted) into «26 دقیقه و 31 ثانیه»; the wall racks out of focus
// behind the words.
import React from "react";
import { FilmView, type Film } from "./film";
import { KText, type KLine } from "./kinetic";
import { CARD_CY, CARD_W, type Shot } from "./montage";
import { C, F, accentA, ease, lerp, ramp, runtime } from "./theme";

export const TILE = { w: 170, h: 302, gap: 16, r: 7 };
export type WallTimes = { wallT: number; pullEnd: number; sum0: number; sum1: number; msg: number; end: number };

const layout = (rows: string[][]) => {
  const PX = TILE.w + TILE.gap, PY = TILE.h + TILE.gap;
  const top = 960 - (rows.length * PY - TILE.gap) / 2;
  return rows.flatMap((row, r) => row.map((id, i) => ({ id, x: 540 - (row.length * PX - TILE.gap) / 2 + i * PX, y: top + r * PY })));
};
const zoom = (u: number, s0: number, s1: number, c0: { x: number; y: number }, c1: { x: number; y: number }) => {
  const s = s0 * Math.pow(s1 / s0, u);
  const w = (1 / s - 1 / s0) / (1 / s1 - 1 / s0);
  return { s, x: lerp(c0.x, c1.x, w), y: lerp(c0.y, c1.y, w) };
};

export const Wall: React.FC<{ t: number; rows: string[][]; films: Record<string, Film>; shots: Shot[]; T: WallTimes; lines?: KLine[]; sumLabel?: string }> = ({ t, rows, films, shots, T, lines = [], sumLabel }) => {
  if (t < T.wallT || t >= T.end) return null;
  const tiles = layout(rows);
  const last = shots[shots.length - 1];
  const KL = tiles.findIndex((x) => x.id === last.film);
  const cOf = (k: number) => ({ x: tiles[k].x + TILE.w / 2, y: tiles[k].y + TILE.h / 2 });
  // the camera: the last montage card (portrait, 672 wide at y CARD_CY) is exactly its tile at the start
  const s0 = CARD_W / TILE.w, c0 = cOf(KL);
  const k0 = { s: s0, x: c0.x - 0 / s0, y: c0.y - (CARD_CY - 960) / s0 };
  const cam = t < T.pullEnd ? zoom(ease.inOut(ramp(t, T.wallT, T.pullEnd)), k0.s, 1, k0, { x: 540, y: 960 }) : { s: 1 + 0.03 * ease.inOut(ramp(t, T.pullEnd, T.end)), x: 540, y: 960 };
  const dist = (k: number) => Math.hypot(cOf(k).x - c0.x, cOf(k).y - c0.y);
  const appear = (k: number) => (k === KL ? -1 : T.wallT + 0.02 + dist(k) / 2600);
  // the sum: films are added in the order they were shown, slow at first, then a flurry
  const order = shots.map((s) => tiles.findIndex((x) => x.id === s.film));
  const addAt = tiles.map((_, k) => {
    const j = order.indexOf(k);
    return j < 0 ? Infinity : T.sum0 + (T.sum1 - T.sum0) * Math.pow(j / Math.max(1, order.length - 1), 0.62);
  });
  const sum = tiles.reduce((a, x, k) => (t >= addAt[k] ? a + Math.floor(films[x.id].dur) : a), 0);
  const focus = T.sum0 - 0.08;
  const blur = 3.5 * ease.inOut(ramp(t, focus, focus + 0.35)) + 4 * ease.inOut(ramp(t, T.msg - 0.1, T.msg + 0.3));
  const dim = 1 - 0.48 * ease.inOut(ramp(t, focus, focus + 0.35)) - 0.12 * ease.inOut(ramp(t, T.msg - 0.1, T.msg + 0.3));
  // the sum block
  const sumOut = ease.in(ramp(t, T.msg - 0.12, T.msg + 0.04));
  const u = ramp(t, T.sum0 - 0.08, T.sum0 + 0.16), e = ease.expo(u);
  const fin = t >= T.sum1 ? Math.exp(-(((t - T.sum1) / 0.22) ** 2)) : 0;
  const sec = ease.out(ramp(t, T.sum0 + 0.05, T.sum0 + 0.4));
  const D = 330;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px) brightness(${dim.toFixed(3)})` : undefined }}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${540 - cam.x * cam.s}px, ${960 - cam.y * cam.s}px) scale(${cam.s})` }}>
          {tiles.map((p, k) => {
            const ee = k === KL ? 1 : ease.out(ramp(t, appear(k), appear(k) + 0.32));
            if (ee <= 0) return null;
            const add = t >= addAt[k] ? Math.exp(-(((t - addAt[k]) / 0.16) ** 2)) : 0;
            const from = k === KL ? T.wallT : appear(k);
            const badge = ease.out(ramp(t, from + 0.25, from + 0.5));
            return (
              <div key={k} style={{ position: "absolute", left: p.x, top: p.y, width: TILE.w, height: TILE.h, borderRadius: TILE.r, overflow: "hidden", background: "#0b0b10", opacity: ee, transform: ee < 1 ? `scale(${0.94 + 0.06 * ee})` : undefined, boxShadow: `0 14px 34px rgba(0,0,0,0.55)${add > 0.01 ? `, 0 0 ${26 * add}px ${accentA(0.7 * add)}` : ""}` }}>
                <div style={{ position: "absolute", inset: 0, filter: add > 0.01 || ee < 1 ? `brightness(${(1 + 0.25 * (1 - ee) + 0.6 * add).toFixed(3)})` : undefined }}>
                  <FilmView film={films[p.id]} t0={k === KL ? last.t0 : T.wallT} />
                </div>
                <div style={{ position: "absolute", inset: 0, borderRadius: TILE.r, boxShadow: `inset 0 0 0 ${1 + 1.5 * add}px ${add > 0.01 ? accentA(0.1 + 0.8 * add) : "rgba(255,240,220,0.1)"}` }} />
                {badge > 0 ? (
                  <div style={{ position: "absolute", left: 7, bottom: 7, padding: "2px 6px 1px", borderRadius: 4, opacity: badge, background: add > 0.3 ? C.accent : "rgba(0,0,0,0.72)", color: add > 0.3 ? "#140f08" : "#f5efe6", fontFamily: F.num, fontSize: 19, lineHeight: "22px", direction: "ltr" }}>{runtime(films[p.id].dur)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: ease.inOut(ramp(t, focus, focus + 0.4)), background: "radial-gradient(62% 26% at 50% 49%, rgba(4,4,8,0.62), rgba(4,4,8,0) 100%)" }} />
      {t >= T.sum0 - 0.14 && sumOut < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - sumOut, transform: `translateY(${-40 * sumOut}px)`, filter: sumOut > 0 ? `blur(${8 * sumOut}px)` : undefined }}>
          {sumLabel ? <div style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center", direction: "rtl", fontFamily: F.faBold, fontSize: 52, color: "rgba(241,233,219,0.9)", opacity: ease.out(ramp(t, T.sum0 - 0.12, T.sum0 + 0.28)) }}>{sumLabel}</div> : null}
          <div style={{ position: "absolute", left: 0, right: 0, top: 715, height: 380, display: "flex", justifyContent: "center", alignItems: "center", direction: "rtl", columnGap: 30, transform: `scale(${(1 + 0.7 * (1 - e)) * (1 + 0.04 * fin)})`, opacity: Math.min(1, u * 6), filter: e < 0.98 ? `blur(${(12 * (1 - e)).toFixed(1)}px)` : undefined }}>
            <div style={{ display: "flex", direction: "ltr", fontFamily: F.anton, fontSize: D, lineHeight: "380px", color: C.accentHi, textShadow: `0 0 ${30 + 40 * fin}px ${accentA(0.45 + 0.4 * fin)}` }}>
              {String(Math.floor(sum / 60)).padEnd(2, " ").split("").map((ch, i) => (
                <span key={i} style={{ display: "inline-block", width: D * 0.5, textAlign: "center" }}>{ch}</span>
              ))}
            </div>
            <div style={{ fontFamily: F.head, fontSize: 150, lineHeight: "380px", color: C.cream }}>دقیقه</div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1060, height: 120, display: "flex", justifyContent: "center", alignItems: "center", direction: "rtl", columnGap: 18, opacity: sec, transform: `translateY(${22 * (1 - sec)}px)`, lineHeight: "120px" }}>
            <span style={{ fontFamily: F.head, fontSize: 84, color: "rgba(241,233,219,0.9)" }}>و</span>
            <span style={{ fontFamily: F.anton, fontSize: 100, color: C.accent, display: "inline-block", minWidth: 110, textAlign: "center", direction: "ltr" }}>{sum % 60}</span>
            <span style={{ fontFamily: F.head, fontSize: 84, color: "rgba(241,233,219,0.9)" }}>ثانیه</span>
          </div>
        </div>
      ) : null}
      {lines.map((l) => (
        <KText key={l.id} l={l} t={t} />
      ))}
    </>
  );
};
