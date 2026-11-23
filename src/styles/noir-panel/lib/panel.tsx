// Noir Panel · the window and everything around it. One rounded footage window on near-black (PANEL); in the hook the
// footage fills the frame and settles into the window on line 1. A chapter tag sits top right, a mono brand line top
// left, the source of the footage on the footage, and white subtitles under the window with the key words in the accent.
// No video ships with the kit: each shot names a slot of your MEDIA map; an empty slot shows a quiet, labelled plate.
//   MEDIA["factory-exit"] = { src: "v01/clips/factory-exit.mp4", credit: "LUMIÈRE · 1895 · PUBLIC DOMAIN" };
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FA, FPS, H, MONO, PANEL, SHADOW, SUB_Y, W, accentA, clamp, easeInOut, easeOut, faNum, ramp } from "./theme";
import type { Word } from "./words";

/** a clip (dur > 0, seconds) or a photo (dur 0 / missing) in public/ */
export type Clip = { src: string; dur?: number; credit?: string };
export type Media = Record<string, Clip | undefined>;

export type Shot = {
  t0: number;
  t1: number;
  /** MEDIA key */ slot: string;
  /** what this slot should show (printed on the plate while it is empty) */ hint?: string;
  /** seconds into the source */ from?: number;
  /** focus point 0..1 (kept in frame, the zoom grows around it) */ fx?: number;
  fy?: number;
  /** zoom at the start / end of the shot (a slow push) */ z0?: number;
  z1?: number;
  /** a word that punches the picture (+5%, decays) */ punch?: number;
  bw?: boolean;
  /** drain the colour between these two times */ desat?: [number, number];
  /** darken 0..1 / blur px: the shot becomes a bed under a card */ dim?: number;
  blur?: number;
  /** burned-in subtitles in the source: fade the lower part to black */ mask?: boolean;
  rate?: number;
  /** the source line on the footage, e.g. "ARCHIVE · LYON · 1895" (MEDIA credit wins) */ label?: string;
};

/** the hook → window blend (0 = full frame, 1 = in the window) */
export const panelMix = (t: number, settleAt: number) => easeInOut(ramp(t, settleAt - 0.25, settleAt + 0.35));

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const TINTS = ["#1d1a22", "#1a1f26", "#231d1a", "#1b2220", "#211b20"];

/** an empty slot: a slow dark plate with drifting light, the slot's name and what to put there */
export const Slot: React.FC<{ name: string; hint?: string; t: number; label?: boolean }> = ({ name, hint, t, label = true }) => {
  const s = hash(name);
  const tint = TINTS[Math.floor(s * TINTS.length)];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(ellipse 90% 70% at 50% 42%, ${tint} 0%, ${C.panel} 80%)` }}>
      {[0, 1, 2].map((i) => {
        const a = s * 6.28 + i * 2.1 + t * (0.14 + 0.05 * i);
        const r = 300 + 110 * i;
        return <div key={i} style={{ position: "absolute", left: `${50 + 30 * Math.cos(a)}%`, top: `${44 + 26 * Math.sin(a * 1.3)}%`, width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", background: `radial-gradient(circle, rgba(242,241,245,${0.06 - i * 0.015}) 0%, transparent 70%)` }} />;
      })}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(242,241,245,.02) 0 2px, transparent 2px 26px)", backgroundPosition: `${(t * 18) % 26}px 0` }} />
      {label && (
        <div style={{ position: "absolute", left: 40, right: 40, top: 92, display: "flex", flexDirection: "column", gap: 10, opacity: 0.78 }}>
          <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3, color: C.dim }}>{`▶ FOOTAGE · ${name}`}</span>
          {hint && <span dir="rtl" style={{ fontFamily: FA, fontWeight: 600, fontSize: 26, color: C.dim, textAlign: "left" }}>{`جای فوتیج: ${hint}`}</span>}
        </div>
      )}
    </div>
  );
};

/** a clip that starts at film time t0 — plays right in a render and in a Look still (frame i = any time) */
export const Vid: React.FC<{ clip: Clip; t: number; t0: number; from?: number; rate?: number; style?: React.CSSProperties }> = ({ clip, t, t0, from = 0, rate = 1, style }) => {
  const frame = useCurrentFrame();
  if (!clip.dur) return <Img src={staticFile(clip.src)} style={{ ...style, maxWidth: "none" }} />;
  const off = Math.round((t - t0) * FPS);
  return (
    <Sequence from={frame - off} layout="none">
      <OffthreadVideo src={staticFile(clip.src)} muted trimBefore={Math.round(from * FPS)} playbackRate={rate} style={{ ...style, maxWidth: "none" }} />
    </Sequence>
  );
};

/** footage (or its empty slot) filling the parent box: cover-fit around the focus point */
export const Footage: React.FC<{ media: Media; slot: string; hint?: string; t: number; t0: number; from?: number; rate?: number; fx?: number; fy?: number; zoom?: number; filter?: string; label?: boolean }> = ({ media, slot, hint, t, t0, from, rate, fx = 0.5, fy = 0.5, zoom = 1, filter, label = true }) => {
  const clip = media[slot];
  const box: React.CSSProperties = { position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${fx * 100}% ${fy * 100}%`, filter };
  if (!clip)
    return (
      <div style={box}>
        <Slot name={slot} hint={hint} t={t - t0} label={label} />
      </div>
    );
  return <Vid clip={clip} t={t} t0={t0} from={from} rate={rate} style={{ ...box, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx * 100}% ${fy * 100}%` }} />;
};

/** one shot: settle-in zoom, a slow push, an optional punch on a word, black-and-white / draining colour / dim+blur */
export const ShotView: React.FC<{ shot: Shot; media: Media; t: number }> = ({ shot, media, t }) => {
  const p = clamp((t - shot.t0) / Math.max(0.01, shot.t1 - shot.t0));
  const settle = 1 + 0.045 * (1 - easeOut(ramp(t, shot.t0, shot.t0 + 0.45)));
  const punch = shot.punch !== undefined && t >= shot.punch ? 1 + 0.05 * Math.exp(-(t - shot.punch) * 5) : 1;
  const z = ((shot.z0 ?? 1.02) + ((shot.z1 ?? 1.08) - (shot.z0 ?? 1.02)) * easeInOut(p)) * settle * punch;
  const grey = shot.bw ? 1 : shot.desat ? easeInOut(ramp(t, shot.desat[0], shot.desat[1])) * 0.9 : 0;
  const bright = (shot.bw ? 1.04 : 1) * (1 - (shot.dim ?? 0)) * (1 - 0.25 * (shot.desat ? grey : 0));
  const filter = `grayscale(${grey}) contrast(${shot.bw ? 1.1 : 1.05}) brightness(${bright}) saturate(${shot.bw ? 1 : 0.92})${shot.blur ? ` blur(${shot.blur}px)` : ""}`;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Footage media={media} slot={shot.slot} hint={shot.hint} t={t} t0={shot.t0} from={shot.from} rate={shot.rate} fx={shot.fx} fy={shot.fy} zoom={z} filter={filter} label={!shot.dim} />
      {shot.mask && <SubMask />}
    </div>
  );
};

/** burned-in subtitles in a source clip (~70% height): fade the lower part to black */
export const SubMask: React.FC = () => <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(5,5,7,0) 58%, rgba(5,5,7,.94) 69%, ${C.bg} 73%)` }} />;

/** top/bottom shade so overlays read on any footage */
export const Grad: React.FC<{ top?: number; bottom?: number }> = ({ top = 0.3, bottom = 0.55 }) => (
  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(5,5,7,${top}) 0%, rgba(5,5,7,0) 22%, rgba(5,5,7,0) 62%, rgba(5,5,7,${bottom}) 100%)` }} />
);

/** the window: full frame at m = 0, the rounded PANEL at m = 1. Children are laid out in the window's box. */
export const Window: React.FC<{ m: number; children: React.ReactNode }> = ({ m, children }) => {
  const rect = { x: PANEL.x * m, y: PANEL.y * m, w: W + (PANEL.w - W) * m, h: H + (PANEL.h - H) * m, r: PANEL.r * m };
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, overflow: "hidden", background: C.panel, boxShadow: `0 0 0 1px rgba(255,255,255,${0.08 * m}), 0 30px 90px rgba(0,0,0,.6)` }}>
      {children}
    </div>
  );
};

/** soft light behind the window */
export const Backdrop: React.FC = () => <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 40% at 50% 42%, rgba(255,255,255,.035), rgba(5,5,7,0) 70%)" }} />;

/** the source line on the footage (top left of the window) */
export const SourceLabel: React.FC<{ text?: string; m: number }> = ({ text, m }) =>
  text ? (
    <div style={{ position: "absolute", left: 34 + 22 * (1 - m), top: 30 + 230 * (1 - m), fontFamily: MONO, fontSize: 24 + 6 * (1 - m), letterSpacing: 3, color: "rgba(242,241,245,.85)", textShadow: "0 1px 8px rgba(0,0,0,.8)" }}>{text}</div>
  ) : null;

/** chapter tag (RTL, top right) and the mono brand line (top left), above the window */
export const Chrome: React.FC<{ tag?: string; brand?: string; k: number }> = ({ tag, brand, k }) => (
  <>
    {tag && (
      <div style={{ position: "absolute", right: 56, top: 236, display: "flex", alignItems: "center", gap: 14, direction: "rtl", opacity: k }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: C.accent, boxShadow: `0 0 14px ${C.accent}` }} />
        <div style={{ fontFamily: FA, fontWeight: 500, fontSize: 30, color: C.text }}>{faNum(tag)}</div>
      </div>
    )}
    {brand && <div style={{ position: "absolute", left: 56, top: 240, fontFamily: MONO, fontSize: 24, color: C.dim, letterSpacing: 4, opacity: k }}>{brand}</div>}
  </>
);

/** the hook's headline in the dark band under the full-frame footage: complete from frame 0, the accent part
 *  punches on its word, the whole block leaves as the footage settles into the window */
export const HookTitle: React.FC<{ t: number; out: number; eyebrow?: string; pre?: string; accent: string; post?: string; tail?: string; punchAt?: number; y?: number; size?: number }> = ({ t, out, eyebrow, pre, accent, post, tail, punchAt, y = 1300, size = 150 }) => {
  const o = 1 - ramp(t, out - 0.2, out + 0.05);
  if (o <= 0) return null;
  const pk = punchAt === undefined ? 0 : t >= punchAt ? Math.exp(-(t - punchAt) * 4) : 0;
  const settle = 1 - easeOut(ramp(t, 0, 0.5));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", direction: "rtl", opacity: o, transform: `translateY(${settle * 14}px)` }}>
      {eyebrow && <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 50, color: C.accent, textShadow: SHADOW }}>{eyebrow}</div>}
      <div style={{ marginTop: 6, fontFamily: FA, fontWeight: 800, fontSize: size, lineHeight: 1.15, color: C.text, textShadow: "0 6px 40px rgba(0,0,0,.7)" }}>
        {pre ? `${faNum(pre)} ` : ""}
        <span style={{ display: "inline-block", color: C.accent, transform: `scale(${1 + 0.16 * pk})` }}>{faNum(accent)}</span>
        {post ? ` ${faNum(post)}` : ""}
      </div>
      {tail && <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 56, color: C.text, textShadow: SHADOW }}>{faNum(tail)}</div>}
    </div>
  );
};

// ───────────────────────── subtitles ─────────────────────────
export type Chunk = { si: number; s: number; e: number; ws: { w: string; s: number; key: boolean }[]; /** the punctuation it ended on */ end?: string };
export type ChunkOpts = {
  /** key words get the accent */ key?: RegExp;
  /** display spellings, e.g. { "ویدئو": "ویدیو" } */ display?: Record<string, string>;
  /** suffixes joined to the word before with a half-space */ suffix?: string[];
  /** a card never ends on these */ glueAfter?: string[];
  /** a card never starts with these */ glueBefore?: string[];
  maxWords?: number;
  maxLen?: number;
};
const strip = (w: string) => w.replace(/[:،,.؟?!«»]/g, "");

/** cut the words into short subtitle cards: break on punctuation, ≤ 5 words / 24 letters, never a lone word */
export const makeChunks = (words: Word[], o: ChunkOpts = {}): Chunk[] => {
  const { key = /^$/, display = {}, suffix = ["ها", "های", "هایی", "تر"], glueAfter = ["و", "در", "با", "از", "به", "که", "یا", "برای", "تا", "اون", "یه"], glueBefore = [], maxWords = 5, maxLen = 24 } = o;
  const SUF = new Set(suffix), GA = new Set(glueAfter), GB = new Set(glueBefore);
  const out: Chunk[] = [];
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const toks: { w: string; raw: string; s: number; e: number }[] = [];
    for (const w of words.filter((x) => x.si === si)) {
      const c = strip(w.w);
      if (SUF.has(c) && toks.length) {
        const p = toks[toks.length - 1];
        p.w += "‌" + c;
        p.raw = p.raw.replace(/[:،,.؟?!]$/, "") + "‌" + w.w;
        p.e = w.e;
      } else toks.push({ w: c, raw: w.w, s: w.s, e: w.e });
    }
    let cur: Chunk | null = null;
    toks.forEach((tk, i) => {
      if (!cur) cur = { si, s: tk.s, e: tk.e, ws: [] };
      cur.ws.push({ w: faNum(display[tk.w] ?? tk.w), s: tk.s, key: key.test(tk.w) });
      cur.e = tk.e;
      const last = i === toks.length - 1;
      const punct = /[:،,.؟?!]$/.test(tk.raw);
      const len = cur.ws.map((x) => x.w).join(" ").length;
      const glued = GA.has(tk.w) || (!last && GB.has(toks[i + 1].w));
      if (last || punct || ((cur.ws.length >= maxWords || len > maxLen) && !glued)) {
        cur.end = punct ? tk.raw.slice(-1) : undefined;
        out.push(cur);
        cur = null;
      }
    });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const c = out[i], p = out[i - 1];
    // a lone word joins the card before it — but never across «:» or «،» (list items stay one per card)
    if (c.ws.length === 1 && p.si === c.si && !/[:،,]/.test(p.end ?? "") && [...p.ws, ...c.ws].map((x) => x.w).join(" ").length <= 32) {
      p.ws.push(...c.ws);
      p.e = c.e;
      out.splice(i, 1);
    }
  }
  for (let i = 0; i < out.length; i++) out[i].e = i + 1 < out.length ? Math.min(out[i + 1].s, out[i].e + 1.2) : out[i].e + 1.2;
  return out;
};

/** white subtitles under the window; a word lights up when it is said, key words in the accent */
export const Subtitle: React.FC<{ t: number; chunks: Chunk[]; from?: number; y?: number; size?: number }> = ({ t, chunks, from = 0, y = SUB_Y, size = 60 }) => {
  const ch = chunks.find((c) => t >= c.s - 0.02 && t < c.e);
  if (!ch || t < from - 0.05) return null;
  const k = easeOut(ramp(t, ch.s - 0.02, ch.s + 0.22));
  const out = 1 - ramp(t, ch.e - 0.1, ch.e);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y - 60, height: 120, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ fontFamily: FA, fontWeight: 600, fontSize: size, lineHeight: 1.25, textAlign: "center", opacity: k * out, transform: `translateY(${(1 - k) * 18}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined, textShadow: "0 2px 18px rgba(0,0,0,.85)" }}>
        {ch.ws.map((w, i) => (
          <span key={i} style={{ color: t >= w.s - 0.03 ? (w.key ? C.accent : C.text) : "rgba(242,241,245,0.32)" }}>
            {w.w}
            {i < ch.ws.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

/** a glowing dot in a ring — the default mark on the end card (swap in your own logo) */
export const Mark: React.FC<{ size: number; p: number; glow: number }> = ({ size, p, glow }) => {
  const ring = 2 * Math.PI * 40;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 0 ${18 * glow}px ${accentA(0.55 * glow)})` }}>
      <circle cx={50} cy={50} r={40} fill="none" stroke={C.accent} strokeWidth={7} strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - p)} transform="rotate(-90 50 50)" />
      <circle cx={50} cy={50} r={14 * clamp(p * 1.4 - 0.3)} fill={C.accentHi} />
    </svg>
  );
};
