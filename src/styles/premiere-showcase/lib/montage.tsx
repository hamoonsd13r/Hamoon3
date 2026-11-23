// Premiere Showcase · the montage: every film on its own glass screen (with an ambilight of itself behind), cut on
// the beat — slow and elegant before the drop, one film per beat after it. A fixed caption row under the screen
// (genre right, running-time chip left) swaps on the cut, and a counter «07/19» with ticks fills right → left.
// No full-frame flashes: the cuts only kick the screen itself.
import React from "react";
import { FilmView, type Film } from "./film";
import { C, F, GRID, accentA, clamp, ease, hash, ramp, runtime } from "./theme";

export type Tr = "land" | "slam" | "rise" | "leak" | "strip" | "whip" | "zoom" | "pushL" | "pushR" | "dip" | "drop" | "punch" | "glitch" | "cut";
export type Shot = { film: string; t0: number; t1: number; i: number; tr: Tr };
/** how long each kind of cut takes (the incoming shot) and whether the outgoing shot stays on screen meanwhile */
export const TR_D: Record<Tr, number> = { land: 0.42, slam: 0.24, rise: 0.7, leak: 0.4, strip: 0.45, whip: 0.3, zoom: 0.45, pushL: 0.22, pushR: 0.22, dip: 0.3, drop: 0.27, punch: 0.2, glitch: 0.13, cut: 0 };
export const KEEP_OLD: Record<Tr, boolean> = { land: false, slam: false, rise: false, leak: true, strip: true, whip: true, zoom: true, pushL: true, pushR: true, dip: true, drop: false, punch: false, glitch: true, cut: false };
/** cuts [film id, start time, transition] → shots (each ends where the next starts; the last ends at `end`) */
export const makeShots = (cuts: [string, number, Tr][], end: number): Shot[] => cuts.map(([film, t0, tr], i) => ({ film, tr, i, t0, t1: i + 1 < cuts.length ? cuts[i + 1][1] : end }));

// the screen a film is shown on; type sits on a fixed grid (x 204 … 876, the portrait card's edges)
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export const COL = { l: 204, r: 876 };
export const CARD_CY = 922, CARD_W = 672;
export const rectOf = (f: Film): Rect =>
  f.h > f.w * 1.3 ? { x: 204, y: CARD_CY - 598, w: 672, h: 1195, r: 25 } : f.w > f.h * 1.3 ? { x: 64, y: CARD_CY - 268, w: 952, h: 536, r: 18 } : { x: 140, y: CARD_CY - 427, w: 800, h: 854, r: 22 };

type St = { tx: number; ty: number; sc: number; op: number; bx: number; by: number; br: number; jit: number };
const I = (): St => ({ tx: 0, ty: 0, sc: 1, op: 1, bx: 0, by: 0, br: 1, jit: 0 });
const PUSH = 1100;
const inOf = (tr: Tr, u: number): St => {
  const s = I();
  if (u >= 1) return s;
  const bell = Math.sin(Math.PI * u);
  switch (tr) {
    case "land": { const e = ease.expo(u); s.sc = 0.22 + 0.78 * e; s.op = clamp(u * 5); s.bx = s.by = 14 * (1 - e); break; }
    case "slam": s.sc = 1.05 - 0.05 * ease.expo(u); s.br = u < 0.28 ? 1.7 : 1; break;
    case "rise": { const e = ease.out(u); s.ty = 220 * (1 - e); s.sc = 0.94 + 0.06 * e; s.op = e; s.bx = s.by = 14 * (1 - e); break; }
    case "leak": { const e = ease.inOut(u); s.op = e; s.sc = 1.05 - 0.05 * e; s.br = 1 + 0.7 * (1 - e); break; }
    case "strip": s.ty = 1500 * (1 - ease.inOut(u)); s.by = 24 * bell; break;
    case "whip": s.tx = -1150 * (1 - ease.inOut(u)); s.bx = 52 * bell; break;
    case "zoom": { const e = ease.out(u); s.sc = 0.55 + 0.45 * e; s.op = clamp(u * 2.2); s.bx = s.by = 12 * (1 - e); break; }
    case "pushL": s.tx = -PUSH * (1 - ease.inOut(u)); s.bx = 26 * bell; break;
    case "pushR": s.tx = PUSH * (1 - ease.inOut(u)); s.bx = 26 * bell; break;
    case "dip": s.op = ease.out(clamp((u - 0.45) / 0.55)); break;
    case "drop": s.sc = 1.08 - 0.08 * ease.out(u); s.br = u < 0.25 ? 1.8 : 1 + 0.2 * (1 - ramp(u, 0.25, 1)); break;
    case "punch": s.sc = 1.06 - 0.06 * ease.out(u); s.br = 1 + 0.15 * (1 - ramp(u, 0, 0.35)); break;
    case "glitch": s.jit = 1 - u * 0.6; s.br = 1.15; break;
  }
  return s;
};
const outOf = (tr: Tr, u: number): St => {
  const s = I();
  const bell = Math.sin(Math.PI * u);
  switch (tr) {
    case "leak": s.br = 1 + 0.5 * u; break;
    case "strip": s.ty = -1500 * ease.inOut(u); s.by = 24 * bell; break;
    case "whip": s.tx = 1150 * ease.inOut(u); s.bx = 52 * bell; break;
    case "zoom": { const e = ease.in(u); s.sc = 1 + 0.9 * e; s.op = 1 - u; s.bx = s.by = 18 * u; break; }
    case "pushL": s.tx = PUSH * ease.inOut(u); s.bx = 26 * bell; break;
    case "pushR": s.tx = -PUSH * ease.inOut(u); s.bx = 26 * bell; break;
    case "dip": s.op = 1 - ease.in(clamp(u / 0.45)); break;
    case "glitch": s.jit = 1; s.op = u < 0.4 ? 1 : 0; break;
  }
  return s;
};
/** the screens breathe with the music: a small kick on every beat, a bigger one on every bar */
const pulseAt = (t: number) => {
  const x = (t - GRID.offset) / GRID.beat;
  if (x < 0) return 0;
  const i = Math.floor(x), f = (x - i) * GRID.beat;
  return (i % 4 === 0 ? 0.03 : 0.014) * Math.exp(-f / 0.09);
};

const ShotView: React.FC<{ s: Shot; shots: Shot[]; films: Record<string, Film>; end: number; t: number }> = ({ s, shots, films, end, t }) => {
  const last = s.i === shots.length - 1;
  const next = shots[s.i + 1];
  const until = last ? end : next && KEEP_OLD[next.tr] ? s.t1 + TR_D[next.tr] : s.t1;
  if (t < s.t0 || t >= until) return null;
  const film = films[s.film];
  const R = rectOf(film);
  const st = t < s.t1 || !next ? inOf(s.tr, TR_D[s.tr] > 0 ? ramp(t, s.t0, s.t0 + TR_D[s.tr]) : 1) : outOf(next.tr, ramp(t, s.t1, s.t1 + TR_D[next.tr]));
  if (st.op <= 0.001) return null;
  let sc = st.sc, ty = st.ty, tx = st.tx, br = st.br;
  if (!last) {
    sc *= 1 + 0.03 * ramp(t, s.t0, s.t1); // a slow push
    ty += Math.sin(t * 1.4 + s.i) * 5; // a slight float
  }
  if (t < s.t1) sc *= 1 + pulseAt(t);
  if (s.tr === "cut" && t < s.t0 + 0.07) br *= 1.15; // two frames of extra exposure on the screen only
  if (st.jit > 0) {
    const f = Math.floor(t * 30);
    tx += (hash(f * 1.7 + s.i) - 0.5) * 60 * st.jit;
    ty += (hash(f * 2.9 + s.i) - 0.5) * 14 * st.jit;
  }
  const amb = (s.i === 0 ? ramp(t, s.t0, s.t0 + 0.7) : last ? 1 - ramp(t, s.t0, s.t1) : 1) * (film.w > film.h ? 1 : 0.55);
  const blurId = `pmb-${s.i}`;
  const blur = st.bx > 0.4 || st.by > 0.4;
  const filt = [blur ? `url(#${blurId})` : "", br !== 1 ? `brightness(${br.toFixed(3)})` : ""].join(" ").trim() || undefined;
  return (
    <>
      {blur ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={`${st.bx.toFixed(1)} ${st.by.toFixed(1)}`} />
          </filter>
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: R.x, top: R.y, width: R.w, height: R.h, opacity: st.op, filter: filt, transform: `translate(${tx}px, ${ty}px) scale(${sc})` }}>
        {/* ambilight: the film itself, huge and blurred, behind the screen */}
        <div style={{ position: "absolute", left: -120, top: -120, right: -120, bottom: -120, opacity: amb, filter: "blur(64px) saturate(1.6) brightness(0.8)" }}>
          <FilmView film={film} t0={s.t0} />
        </div>
        <div style={{ position: "absolute", inset: 0, borderRadius: R.r, overflow: "hidden", background: "#000", boxShadow: "0 40px 110px rgba(0,0,0,0.75)" }}>
          <FilmView film={film} t0={s.t0} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(118deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 28%)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: R.r, boxShadow: "inset 0 0 0 1.5px rgba(255,236,210,0.14)" }} />
          {st.jit > 0 ? <GlitchBars t={t} k={st.jit} seed={s.i} h={R.h} /> : null}
        </div>
      </div>
    </>
  );
};
const GlitchBars: React.FC<{ t: number; k: number; seed: number; h: number }> = ({ t, k, seed, h }) => {
  const f = Math.floor(t * 30);
  return (
    <>
      {[0, 1, 2].map((j) => (
        <div key={j} style={{ position: "absolute", left: 0, right: 0, top: hash(f * 3.1 + j * 7 + seed) * h, height: 6 + hash(f * 5.3 + j) * 40, background: j % 2 ? "rgba(255,236,205,0.34)" : accentA(0.3), mixBlendMode: "screen", opacity: k, transform: `translateX(${(hash(f + j * 11) - 0.5) * 70}px)` }} />
      ))}
    </>
  );
};

export const Montage: React.FC<{ t: number; shots: Shot[]; films: Record<string, Film>; end: number }> = ({ t, shots, films, end }) => {
  if (t < shots[0].t0 || t >= end) return null;
  return (
    <>
      {shots.map((s) => (
        <ShotView key={s.i} s={s} shots={shots} films={films} end={end} t={t} />
      ))}
    </>
  );
};

/** a running-time chip (accent from one minute up) */
export const Chip: React.FC<{ text: string; x: number; y: number; k: number; size?: number; hot?: boolean }> = ({ text, x, y, k, size = 44, hot }) => (
  <div style={{ position: "absolute", left: x, top: y, height: size * 1.36, padding: `0 ${size * 0.42}px`, borderRadius: size * 0.3, display: "flex", alignItems: "center", gap: size * 0.25, background: hot ? C.accent : "rgba(10,10,14,0.72)", border: `1.5px solid ${hot ? C.accent : "rgba(241,233,219,0.16)"}`, color: hot ? "#140f08" : C.cream, fontFamily: F.num, fontSize: size, direction: "ltr", opacity: k, transform: `translateX(${-24 * (1 - k)}px)` }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill={hot ? "#140f08" : C.cream} /></svg>
    {text}
  </div>
);

const fast = (s: Shot) => s.t1 - s.t0 < 0.8;
export const Captions: React.FC<{ t: number; shots: Shot[]; films: Record<string, Film>; end: number }> = ({ t, shots, films, end }) => {
  if (t < shots[0].t0 || t >= end) return null;
  return (
    <>
      {shots.map((s) => {
        if (t < s.t0 || t >= s.t1 + 0.2) return null;
        const film = films[s.film];
        const R = rectOf(film);
        const next = shots[s.i + 1];
        const start = fast(s) ? s.t0 : s.t0 + Math.min(0.32, TR_D[s.tr] * 0.6);
        const k = ease.out(ramp(t, start, start + (fast(s) ? 0.1 : 0.4)));
        const outEnd = next && !fast(next) ? s.t1 + 0.12 : s.t1;
        const a = k * (t < s.t1 ? 1 : 1 - ramp(t, s.t1, outEnd + 1e-3));
        if (a <= 0.001) return null;
        const y = R.y + R.h + 28;
        return (
          <div key={s.i} style={{ position: "absolute", inset: 0, opacity: a }}>
            <div style={{ position: "absolute", right: 1080 - COL.r, top: y, display: "flex", alignItems: "center", gap: 16, direction: "rtl", transform: `translateX(${24 * (1 - k)}px)` }}>
              <div style={{ width: 6, height: 42, borderRadius: 3, background: C.accent, boxShadow: `0 0 14px ${accentA(0.6)}` }} />
              <span style={{ fontFamily: F.faBold, fontSize: 50, lineHeight: "60px", color: C.cream, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{film.label}</span>
            </div>
            <Chip text={runtime(film.dur)} x={COL.l} y={y - 2} k={k} hot={film.dur >= 60} />
          </div>
        );
      })}
    </>
  );
};

/** the film counter «07/19» and its ticks, right-aligned with the screen */
export const Counter: React.FC<{ t: number; shots: Shot[]; end: number }> = ({ t, shots, end }) => {
  const a = ramp(t, shots[0].t0 - 0.1, shots[0].t0 + 0.4) * (1 - ramp(t, end + 0.05, end + 0.4));
  if (a <= 0) return null;
  let cur = -1;
  for (const s of shots) if (t >= s.t0) cur = s.i;
  const k = cur >= 0 ? ease.out(ramp(t, shots[cur].t0, shots[cur].t0 + 0.14)) : 1;
  const num = (n: number) => String(Math.max(0, n)).padStart(2, "0");
  const N = shots.length, Y = 272;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 330, opacity: a }}>
      {Array.from({ length: N }, (_, j) => {
        const x = COL.r - 128 - (j + 1) * 22 - j * 8;
        const hot = j === cur ? 1 - ramp(t, shots[j].t0, shots[j].t0 + 0.45) : 0;
        return <div key={j} style={{ position: "absolute", left: x, top: Y - 2.5, width: 22, height: 5, borderRadius: 2.5, background: j <= cur ? (hot > 0 ? C.accentHi : accentA(0.85)) : "rgba(241,233,219,0.14)", boxShadow: hot > 0 ? `0 0 ${14 * hot}px rgba(255,220,160,${0.9 * hot})` : undefined, transform: `scaleY(${1 + 1.2 * hot})` }} />;
      })}
      <div style={{ position: "absolute", right: 1080 - COL.r, top: Y - 34, height: 64, display: "flex", alignItems: "baseline", gap: 6, direction: "ltr", fontFamily: F.num }}>
        <div style={{ position: "relative", width: 64, height: 64, overflow: "hidden" }}>
          {cur >= 1 && k < 1 ? <span style={{ position: "absolute", right: 0, top: 0, fontSize: 54, lineHeight: "64px", color: C.accent, transform: `translateY(${-46 * k}px)`, opacity: 1 - k }}>{num(cur)}</span> : null}
          <span style={{ position: "absolute", right: 0, top: 0, fontSize: 54, lineHeight: "64px", color: C.accent, transform: `translateY(${46 * (1 - k)}px)`, opacity: k }}>{num(cur + 1)}</span>
        </div>
        <span style={{ fontSize: 32, color: C.dim }}>/{N}</span>
      </div>
    </div>
  );
};
