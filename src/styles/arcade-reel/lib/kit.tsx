// Arcade Reel · the kit: footage in a box with a camera (`Foot`, `xf`, `boxOf` map a source rectangle to the
// screen so a callout stays on a detail while the shot pushes), entrances (`enterFx`), a camera that shakes on hits
// and kicks on beats (`camera`), callouts, pills, phrase captions, a speedometer, a sound chip, a scrolling code wall,
// cards and a lock. Pure functions of t.
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FA, LATIN, MONO, accentA, clamp, easeOut, kick, ramp, rng } from "./theme";

export const BA_FPS = 30;

/** the accent dot used as a bullet */
export const Dot: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: 99, flex: "none", background: `radial-gradient(circle at 50% 40%, #fff 0%, ${C.accentHot} 40%, ${C.accent} 100%)`, boxShadow: `0 0 ${size}px ${accentA(0.8)}` }} />
);
export const MonoLbl: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size = 18, color = C.accent300, children, style }) => (
  <span style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.2em", color, direction: "ltr", unicodeBidi: "isolate", whiteSpace: "nowrap", ...style }}>{children}</span>
);

// ─── footage ───────────────────────────────────────────────────────────────────────────────────────────────
/** a clip in the public dir: path, source size, usable length (s) */
export type ClipInfo = { src: string; w: number; h: number; len: number };
export type Frame = { w: number; h: number; focus?: [number, number]; zoom?: number; push?: number; fit?: "cover" | "width" };
/** where a clip sits in a w×h box at time t (shown since t0): scale, offset, and a source→box point map (for callouts) */
export const xf = (c: ClipInfo, fr: Frame, t: number, t0: number) => {
  const base = fr.fit === "width" ? fr.w / c.w : Math.max(fr.w / c.w, fr.h / c.h);
  const sc = base * (fr.zoom ?? 1) * (1 + (fr.push ?? 0.025) * Math.max(0, t - t0));
  const vw = c.w * sc, vh = c.h * sc;
  const fc = fr.focus ?? [c.w / 2, c.h / 2];
  let left = fr.w / 2 - fc[0] * sc, top = fr.h / 2 - fc[1] * sc;
  left = vw >= fr.w ? Math.min(0, Math.max(fr.w - vw, left)) : (fr.w - vw) / 2;
  top = vh >= fr.h ? Math.min(0, Math.max(fr.h - vh, top)) : (fr.h - vh) / 2;
  return { sc, left, top, vw, vh, map: (sx: number, sy: number): [number, number] => [left + sx * sc, top + sy * sc] };
};
/** a source rectangle [x, y, w, h] of a clip → box px (for Callout) */
export const boxOf = (c: ClipInfo, fr: Frame, t: number, t0: number, [sx, sy, sw, sh]: number[]) => {
  const X = xf(c, fr, t, t0);
  const [x, y] = X.map(sx, sy);
  return { x, y, w: sw * X.sc, h: sh * X.sc };
};

/** footage in a w×h box from t0 (playing from `ss` s into the clip); `width` fit puts a dark blurred copy behind */
/** where your gameplay goes while the slot is empty: a dark animated plate with the slot name and a hint */
export const Slot: React.FC<{ name: string; hint?: string; t: number; w?: number; h?: number }> = ({ name, hint, t, w = 1080, h = 1920 }) => (
  <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", background: `radial-gradient(ellipse 90% 70% at 50% 45%, #1c1620 0%, ${C.ink} 80%)` }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(242,241,245,.025) 0 2px, transparent 2px 26px)", backgroundPosition: `${(t * 18) % 26}px 0` }} />
    <div style={{ position: "absolute", left: 60, top: h * 0.42, display: "flex", flexDirection: "column", gap: 10 }}>
      <MonoLbl size={20} color={C.fgDim}>{`▶ GAMEPLAY · ${name}`}</MonoLbl>
      {hint && <span dir="rtl" style={{ fontFamily: FA, fontWeight: 700, fontSize: 28, color: C.fgDim, textAlign: "left" }}>{`جای فوتیج: ${hint}`}</span>}
    </div>
  </div>
);

export const Foot: React.FC<{ clip: ClipInfo; t: number; t0: number; len: number; ss?: number; fr?: Partial<Frame>; filter?: string; dim?: number; r?: number; fps?: number; style?: React.CSSProperties }> = ({
  clip: c,
  t,
  t0,
  len,
  ss = 0,
  fr = {},
  filter = "saturate(1.06) contrast(1.05)",
  dim = 0,
  r = 0,
  fps = BA_FPS,
  style,
}) => {
  const f = useCurrentFrame();
  const w = fr.w ?? 1080, h = fr.h ?? 1920;
  const X = xf(c, { w, h, ...fr }, t, t0);
  const from = f - Math.round((t - t0) * fps); // right in a render and in a Look (frame i = any time)
  const dur = Math.max(1, Math.round(len * fps) + 1);
  const play = (st: React.CSSProperties, flt: string) => (
    <Sequence from={from} durationInFrames={dur} layout="none">
      <OffthreadVideo src={staticFile(c.src)} muted trimBefore={Math.round(ss * fps)} style={{ position: "absolute", maxWidth: "none", ...st, filter: flt }} />
    </Sequence>
  );
  let back: React.ReactNode = null;
  if (fr.fit === "width") {
    const B = xf(c, { w, h, zoom: 1.12, push: 0 }, t, t0);
    back = play({ left: B.left, top: B.top, width: B.vw, height: B.vh }, "blur(38px) brightness(.42) saturate(1.2)");
  }
  return (
    <div style={{ position: "absolute", width: w, height: h, borderRadius: r, overflow: "hidden", background: "#000", ...style }}>
      {back}
      {play({ left: X.left, top: X.top, width: X.vw, height: X.vh }, filter)}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: dim }} />}
    </div>
  );
};

/** a still frame (png/jpg) in the same box logic */
export const StillImg: React.FC<{ src: string; cw: number; ch: number; t: number; t0: number; fr?: Partial<Frame>; filter?: string; style?: React.CSSProperties }> = ({ src, cw, ch, t, t0, fr = {}, filter, style }) => {
  const w = fr.w ?? 1080, h = fr.h ?? 1920;
  const X = xf({ src, w: cw, h: ch, len: 0 }, { w, h, ...fr }, t, t0);
  return <Img src={staticFile(src)} style={{ position: "absolute", left: X.left, top: X.top, width: X.vw, height: X.vh, maxWidth: "none", filter, ...style }} />;
};

/** how a shot enters: «punch» (scale 1.14 → 1 with a short blur) or «whip» (slides in from the left, motion blur) */
export const enterFx = (kind: "punch" | "whip" | undefined, p: number): React.CSSProperties => {
  if (kind === "punch") {
    const e = easeOut(clamp(p / 0.26));
    return { transform: `scale(${1 + 0.14 * (1 - e)})`, filter: e < 1 ? `blur(${(1 - e) * 6}px)` : undefined };
  }
  if (kind === "whip") {
    const e = easeOut(clamp(p / 0.22));
    return { transform: `translateX(${(1 - e) * -420}px)`, filter: e < 1 ? `blur(${(1 - e) * 22}px)` : undefined };
  }
  return {};
};

/** the footage camera: shake on the big hits, a small kick on every beat while the music is at full energy */
export const camera = (t: number, impacts: number[], energy: [number, number][], beats: number[]) => {
  let x = 0, y = 0, s = 0;
  for (const a of impacts) {
    const k = kick(t, a, 0.5);
    if (k > 0) {
      x += Math.sin((t - a) * 95) * 16 * k;
      y += Math.cos((t - a) * 81) * 12 * k;
      s += 0.03 * k;
    }
  }
  for (const [a, b] of energy) if (t >= a && t < b) for (const bt of beats) if (bt >= a && bt < b) s += 0.012 * kick(t, bt, 0.22);
  return { x, y, s };
};

// ─── callouts and labels ───────────────────────────────────────────────────────────────────────────────────
/** a thin accent frame around a box (screen px) that draws on with k, with a label chip above or below it */
export const Callout: React.FC<{ x: number; y: number; w: number; h: number; k: number; label: string; mono?: string; below?: boolean; alignLeft?: boolean }> = ({ x, y, w, h, k, label, mono, below, alignLeft }) => {
  if (k <= 0) return null;
  const e = easeOut(clamp(k / 0.5));
  const per = 2 * (w + h);
  const lk = easeOut(clamp((k - 0.15) / 0.4));
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <rect x={x} y={y} width={w} height={h} rx={12} fill={accentA(0.06)} stroke={C.accent} strokeWidth={3.2} strokeDasharray={per} strokeDashoffset={per * (1 - e)} style={{ filter: `drop-shadow(0 0 10px ${accentA(.55)})` }} />
      </svg>
      <div
        dir="rtl"
        style={{
          position: "absolute",
          left: alignLeft ? x : undefined,
          right: alignLeft ? undefined : 1080 - (x + w),
          top: below ? y + h + 14 : y - 64,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px 9px",
          borderRadius: 99,
          background: "rgba(8,8,13,.88)",
          boxShadow: `inset 0 0 0 1.5px ${accentA(.5)}, 0 8px 30px rgba(0,0,0,.5)`,
          opacity: lk,
          transform: `translateY(${(1 - lk) * (below ? -10 : 10)}px)`,
          whiteSpace: "nowrap",
        }}
      >
        <Dot size={10} />
        <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 32, color: C.fg }}>{label}</span>
        {mono && (
          <MonoLbl size={18} color={C.accent300}>
            {mono}
          </MonoLbl>
        )}
      </div>
    </>
  );
};

/** small Persian/mono tag with a light point, on a dark pill (labels on footage, top chrome) */
export const Pill: React.FC<{ k: number; fa?: string; mono?: string; size?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ k, fa, mono, size = 30, style, children }) => {
  const e = easeOut(clamp(k));
  if (e <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", display: "flex", alignItems: "center", gap: 12, padding: "9px 20px 10px", borderRadius: 99, background: "rgba(8,8,13,.84)", boxShadow: `inset 0 0 0 1.5px ${C.line2}, 0 10px 30px rgba(0,0,0,.45)`, opacity: e, transform: `translateY(${(1 - e) * -12}px)`, whiteSpace: "nowrap", ...style }}>
      <Dot size={size * 0.34} />
      {fa && <span style={{ fontFamily: FA, fontWeight: 800, fontSize: size, color: C.fg }}>{fa}</span>}
      {mono && (
        <MonoLbl size={size * 0.62} color={C.accent300}>
          {mono}
        </MonoLbl>
      )}
      {children}
    </div>
  );
};

// ─── captions ──────────────────────────────────────────────────────────────────────────────────────────────
export type CapWord = { si: number; wi: number; w: string; s: number; e: number };
const LATIN_RE = /^[A-Za-z0-9.]+[،,.!؟?؛]*$/;
/**
 * Phrase captions (RTL): one phrase at a time rises in on a soft dark plate; the spoken word is accent, the words still
 * to come at 72 %. chunks = [sentence, first word, last word]; show maps TTS spellings to display ones («دو» → «۲»).
 */
export const Caps: React.FC<{ t: number; y: number; words: CapWord[]; chunks: [number, number, number][]; show?: Record<string, string>; hide?: [number, number][]; size?: number }> = ({
  t,
  y,
  words,
  chunks,
  show = {},
  hide = [],
  size = 56,
}) => {
  if (hide.some(([a, b]) => t >= a && t < b)) return null;
  const cs = chunks.map(([si, a, b]) => {
    const ws = words.filter((x) => x.si === si).slice(a, b + 1);
    return { ws, s: ws[0].s - 0.06, e: ws[ws.length - 1].e };
  });
  let i = -1;
  for (let k = 0; k < cs.length; k++) if (t >= cs[k].s) i = k;
  if (i < 0) return null;
  const ch = cs[i];
  const next = cs[i + 1];
  const endAt = next ? Math.min(next.s, ch.e + 0.7) : ch.e + 0.6;
  if (t >= endAt) return null;
  const k = easeOut(ramp(t, ch.s, ch.s + 0.16));
  const out = ramp(t, endAt - 0.08, endAt);
  return (
    <div dir="rtl" style={{ position: "absolute", left: 70, width: 940, top: y, textAlign: "center", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 18}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined }}>
      <span style={{ fontFamily: FA, fontWeight: 800, fontSize: size, lineHeight: 1.35, letterSpacing: 0, padding: "4px 26px 8px", borderRadius: 24, background: "rgba(5,5,7,.56)", boxShadow: "0 0 34px 18px rgba(5,5,7,.4)", WebkitBoxDecorationBreak: "clone" }}>
        {ch.ws.map((w, j) => {
          const shown = show[w.w] ?? w.w;
          const said = t >= w.s;
          const now = t >= w.s - 0.02 && t < w.e + 0.08;
          const latin = LATIN_RE.test(shown);
          return (
            <React.Fragment key={j}>
              <span
                style={{
                  color: now ? C.accent : C.fg,
                  opacity: said ? 1 : 0.86,
                  textShadow: now ? `0 0 26px ${accentA(0.45)}, 0 3px 14px rgba(0,0,0,.85)` : "0 3px 14px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.6)",
                  fontFamily: latin ? `${LATIN}, ${FA}` : FA,
                  fontWeight: latin ? 700 : 800,
                  unicodeBidi: latin ? "isolate" : undefined,
                  direction: latin ? "ltr" : undefined,
                  display: "inline-block",
                }}
              >
                {shown}
              </span>
              {j < ch.ws.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

// ─── widgets ───────────────────────────────────────────────────────────────────────────────────────────────
/** a speedometer: arc + needle + km/h (v 0..1 of 140) */
export const Speedo: React.FC<{ x: number; y: number; size: number; v: number; k: number }> = ({ x, y, size, v, k }) => {
  const e = easeOut(clamp(k));
  if (e <= 0) return null;
  const a0 = 135, span = 270, R = 92;
  const ang = a0 + span * clamp(v);
  const pt = (deg: number, r: number) => [110 + r * Math.cos((deg * Math.PI) / 180), 110 + r * Math.sin((deg * Math.PI) / 180)];
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(ang, R - 22);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, opacity: e, transform: `scale(${0.85 + 0.15 * e})`, transformOrigin: "50% 50%" }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        <circle cx={110} cy={110} r={106} fill="rgba(8,8,13,.78)" stroke={C.line2} strokeWidth={2} />
        <path d={arc(a0, a0 + span, R)} stroke="rgba(242,241,245,.14)" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={arc(a0, Math.max(a0 + 0.1, ang), R)} stroke={C.accent} strokeWidth={10} fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${accentA(.7)})` }} />
        {Array.from({ length: 10 }, (_, i) => {
          const d = a0 + (span * i) / 9;
          const [a1, b1] = pt(d, R - 16), [a2, b2] = pt(d, R - 26);
          return <line key={i} x1={a1} y1={b1} x2={a2} y2={b2} stroke="rgba(242,241,245,.35)" strokeWidth={3} strokeLinecap="round" />;
        })}
        <line x1={110} y1={110} x2={nx} y2={ny} stroke={C.accentHot} strokeWidth={5} strokeLinecap="round" />
        <circle cx={110} cy={110} r={9} fill={C.accent} />
        <text x={110} y={160} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={40} fill={C.fg}>
          {Math.round(clamp(v) * 140)}
        </text>
        <text x={110} y={186} textAnchor="middle" fontFamily={MONO} fontWeight={500} fontSize={15} letterSpacing={3} fill={C.accent300}>
          KM/H
        </text>
      </svg>
    </div>
  );
};

/** sound chip: speaker + label + bars that jump on `hits` (the footage's own sound) */
export const SoundChip: React.FC<{ t: number; k: number; hits: number[]; label?: string; style?: React.CSSProperties }> = ({ t, k, hits, label = "صداگذاری", style }) => {
  const e = easeOut(clamp(k));
  if (e <= 0) return null;
  const r = rng(7);
  const ph = Array.from({ length: 22 }, () => r() * 6.28);
  const amp = 0.25 + hits.reduce((s, a) => s + 0.75 * kick(t, a, 0.22), 0);
  return (
    <div dir="rtl" style={{ position: "absolute", display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", borderRadius: 99, background: "rgba(8,8,13,.86)", boxShadow: `inset 0 0 0 1.5px ${accentA(.45)}, 0 10px 30px rgba(0,0,0,.5)`, opacity: e, transform: `scale(${0.9 + 0.1 * e})`, ...style }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill={C.accent} />
        <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />
      </svg>
      <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 34, color: C.fg }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5, height: 44, direction: "ltr" }}>
        {ph.map((p, i) => {
          const hgt = 6 + 38 * clamp(amp * (0.45 + 0.55 * Math.abs(Math.sin(t * 13 + p + i * 0.4))));
          return <span key={i} style={{ width: 5, height: hgt, borderRadius: 3, background: i % 3 ? C.accent : C.accentHi }} />;
        })}
      </div>
    </div>
  );
};

/** scrolling code (keywords in the accent, mask-faded top and bottom) — «the AI wrote the code» */
const KW = /\b(const|function|return|if|new|await)\b/g;
const codeLine = (s: string, key: number) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(KW)) {
    if (m.index! > last) parts.push(s.slice(last, m.index));
    parts.push(
      <span key={m.index} style={{ color: C.accent }}>
        {m[0]}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(s.slice(last));
  return <div key={key}>{parts}</div>;
};
export const CodeWall: React.FC<{ t: number; t0: number; k: number; code: string[]; speed?: number; style?: React.CSSProperties }> = ({ t, t0, k, code, speed = 260, style }) => {
  if (k <= 0) return null;
  const lh = 34;
  const total = code.length * lh;
  const y = -((t - t0) * speed) % total;
  return (
    <div style={{ position: "absolute", left: 60, top: 300, width: 960, height: 1000, overflow: "hidden", opacity: k, direction: "ltr", WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 14%, #000 82%, transparent 100%)", ...style }}>
      <div style={{ position: "absolute", left: 0, top: y, fontFamily: MONO, fontSize: 25, lineHeight: `${lh}px`, color: "rgba(242,241,245,.82)", whiteSpace: "pre" }}>{[...code, ...code, ...code].map((l, i) => codeLine(l, i))}</div>
    </div>
  );
};

/** obsidian card with the rim light (lit = accent rim) */
export const CardBox: React.FC<{ x: number; y: number; w: number; h: number; k?: number; lit?: boolean; r?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, k = 1, lit, r = 34, style, children }) => {
  const e = easeOut(clamp(k));
  if (e <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        background: `linear-gradient(180deg, ${C.cardHi} 0%, ${C.card} 100%)`,
        boxShadow: lit ? `inset 0 0 0 2px ${accentA(.55)}, 0 0 60px ${accentA(.18)}, 0 30px 80px rgba(0,0,0,.6)` : `inset 0 1px 0 rgba(255,236,220,.08), inset 0 0 0 1.5px ${C.line2}, 0 30px 80px rgba(0,0,0,.6)`,
        opacity: e,
        transform: `translateY(${(1 - e) * 40}px) scale(${0.96 + 0.04 * e})`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** a lock; open 0→1 swings the shackle up (the CTA «comment to unlock») */
export const Lock: React.FC<{ size: number; open: number; glow?: number }> = ({ size, open, glow = 0 }) => {
  const o = easeOut(clamp(open));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible", filter: `drop-shadow(0 0 ${8 + 20 * glow}px ${accentA(0.4 + 0.4 * glow)})` }}>
      <g transform={`translate(0 ${-7 * o}) rotate(${-34 * o} 46 30)`}>
        <path d="M18 30 V21 a14 14 0 0 1 28 0 V30" fill="none" stroke={C.accent} strokeWidth={6} strokeLinecap="round" />
      </g>
      <rect x={10} y={28} width={44} height={30} rx={8} fill={C.accent} />
      <circle cx={32} cy={41} r={4.5} fill={C.onAccent} />
      <rect x={30} y={42} width={4} height={8} rx={2} fill={C.onAccent} />
    </svg>
  );
};

/** a commenter's default avatar (no face) */
export const Avatar: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: 99, background: `linear-gradient(135deg, #3A3850, #1B1A25)`, boxShadow: `inset 0 0 0 2px ${C.line2}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="rgba(242,241,245,.55)">
      <circle cx={12} cy={8} r={4.2} />
      <path d="M4 21c0-4.4 3.6-7.4 8-7.4s8 3 8 7.4z" />
    </svg>
  </div>
);
