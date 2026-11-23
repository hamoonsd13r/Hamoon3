// Light Ladder · type and UI: the light dot, mono labels, pills, dark cards, corner brackets, the level heading
// (big mono name + Persian line + English mono), A?I tiles whose middle letter spins and lands, a labelled meter, an
// intelligence ruler, a «you are here» marker, a poll card, and phrase captions (the spoken word in the light colour).
import React from "react";
import { C, FA, LATIN, MONO, back, clamp, easeOut, faNum, lightA, ramp } from "./theme";
import type { Word } from "./words";

/** the small light point used as a bullet */
export const Dot: React.FC<{ size?: number; glow?: number }> = ({ size = 12, glow = 1 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: 999, background: `radial-gradient(circle at 50% 40%, #fff 0%, ${C.lightHot} 40%, ${C.light} 100%)`, boxShadow: `0 0 ${size * 1.2 * glow}px ${lightA(0.8)}`, flex: "none" }} />
);

export const MonoLbl: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size = 18, color = C.light300, children, style }) => (
  <span style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.22em", color, direction: "ltr", unicodeBidi: "isolate", whiteSpace: "nowrap", ...style }}>{children}</span>
);

/** a dark pill with the dot, a Persian word and/or a mono label (positioned by `style`) */
export const Pill: React.FC<{ k: number; fa?: string; mono?: string; size?: number; style?: React.CSSProperties }> = ({ k, fa, mono, size = 30, style }) => {
  const e = easeOut(k);
  if (e <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", display: "flex", alignItems: "center", gap: 12, padding: "9px 20px 10px", borderRadius: 99, background: "rgba(8,8,13,.86)", boxShadow: `inset 0 0 0 1.5px ${C.line2}, 0 10px 30px rgba(0,0,0,.45)`, opacity: e, transform: `translateY(${(1 - e) * -12}px)`, whiteSpace: "nowrap", ...style }}>
      <Dot size={size * 0.34} />
      {fa && <span style={{ fontFamily: FA, fontWeight: 800, fontSize: size, color: C.fg }}>{fa}</span>}
      {mono && <MonoLbl size={size * 0.62}>{mono}</MonoLbl>}
    </div>
  );
};

/** a dark glass card (lit = light border) */
export const CardBox: React.FC<{ x: number; y: number; w: number; h: number; k?: number; lit?: boolean; r?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, k = 1, lit, r = 34, style, children }) => {
  const e = easeOut(k);
  if (e <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: r, background: C.card, boxShadow: `inset 0 0 0 1.5px ${lit ? lightA(0.55) : C.line2}, 0 30px 80px rgba(0,0,0,.6)${lit ? `, 0 0 50px ${lightA(0.18)}` : ""}`, opacity: e, transform: `translateY(${(1 - e) * 40}px) scale(${0.97 + 0.03 * e})`, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
};

/** four light corner brackets around a box (footage frames, targets) */
export const Corners: React.FC<{ x: number; y: number; w: number; h: number; k: number; len?: number; color?: string }> = ({ x, y, w, h, k, len = 46, color = C.light }) => {
  if (k <= 0) return null;
  const L = len * easeOut(k);
  const c = (cx: number, cy: number, sx: number, sy: number) => `M${cx} ${cy + sy * L} V${cy} H${cx + sx * L}`;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={[c(x, y, 1, 1), c(x + w, y, -1, 1), c(x, y + h, 1, -1), c(x + w, y + h, -1, -1)].join(" ")} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${lightA(0.6)})` }} opacity={clamp(k * 2)} />
    </svg>
  );
};

/** the level heading: big mono name (ANI), a Persian line under it, the English in small mono */
export const LevelHead: React.FC<{ k: number; name: string; fa: string; en?: string; y?: number; size?: number; out?: number }> = ({ k, name, fa, en, y = 200, size = 150, out = 0 }) => {
  const e = easeOut(k) * (1 - out);
  if (e <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", opacity: e, transform: `translateY(${(1 - easeOut(k)) * 30 - out * 30}px)` }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: "0.06em", color: C.fg, textShadow: `0 0 40px ${lightA(0.25)}` }}>{name}</div>
      <div dir="rtl" style={{ marginTop: 18, fontFamily: FA, fontWeight: 900, fontSize: size * 0.4, color: C.fg }}>{fa}</div>
      {en && (
        <MonoLbl size={size * 0.13} style={{ marginTop: 10 }}>
          {en}
        </MonoLbl>
      )}
    </div>
  );
};

/** three tiles «A?I»: the middle letter spins and lands on its word (times[i]); a Persian label slides in under it.
 *  RTL: tile 0 sits on the right. */
export const Tiles: React.FC<{ t: number; k: number; letters: string[]; times: number[]; labels: string[]; nums?: string[]; y?: number; hot?: number }> = ({ t, k, letters, times, labels, nums = ["01", "02", "03"], y = 600, hot = -1 }) => {
  const e = easeOut(k);
  if (e <= 0) return null;
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tw = 270, gap = 36, x0 = (1080 - (3 * tw + 2 * gap)) / 2;
  return (
    <>
      {letters.map((L, i) => {
        const x = x0 + (2 - i) * (tw + gap); // RTL
        const land = t >= times[i];
        const spin = land ? L : AZ[Math.floor(t * 18 + i * 7) % 26];
        const pk = land ? back(ramp(t, times[i], times[i] + 0.3)) : 0;
        const lit = land && (hot < 0 || hot === i);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: tw, opacity: e, transform: `translateY(${(1 - e) * 40}px)` }}>
            <div style={{ height: 230, borderRadius: 26, background: C.card, boxShadow: `inset 0 0 0 1.5px ${lit ? lightA(0.6) : C.line2}, 0 24px 60px rgba(0,0,0,.6)${lit ? `, 0 0 40px ${lightA(0.2)}` : ""}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <MonoLbl size={16}>{nums[i]}</MonoLbl>
              <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 96, lineHeight: 1, color: C.fg, direction: "ltr" }}>
                A<span style={{ display: "inline-block", width: 70, textAlign: "center", color: land ? C.lightHot : C.fgDim, transform: `scale(${1 + 0.25 * (1 - pk)})`, textShadow: land ? `0 0 24px ${lightA(0.7)}` : "none" }}>{spin}</span>I
              </div>
            </div>
            <div dir="rtl" style={{ marginTop: 22, textAlign: "center", fontFamily: FA, fontWeight: 900, fontSize: 44, color: lit ? C.fg : C.fgDim, opacity: easeOut(ramp(t, times[i], times[i] + 0.35)), transform: `translateY(${(1 - easeOut(ramp(t, times[i], times[i] + 0.35))) * 14}px)` }}>{labels[i]}</div>
          </div>
        );
      })}
    </>
  );
};

/** a labelled bar that fills (e.g. «هوش عمومی انسان» 0 → 100%), with end labels; the value never shows a bare 0 */
/** RTL: the fill starts at the right end (`start` label) and grows to the left end (`end` label) */
export const Meter: React.FC<{ k: number; p: number; label: string; start?: string; end?: string; x?: number; y?: number; w?: number }> = ({ k, p, label, start, end, x = 90, y = 300, w = 900 }) => {
  const e = easeOut(k);
  if (e <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: e }}>
      <div dir="rtl" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 40, color: C.fg }}>{label}</span>
        <MonoLbl size={22}>{p > 0.02 ? `${Math.round(p * 100)}%` : ""}</MonoLbl>
      </div>
      <div style={{ marginTop: 16, height: 14, borderRadius: 7, background: "rgba(242,241,245,.1)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${clamp(p) * 100}%`, borderRadius: 7, background: `linear-gradient(270deg, ${C.light}, ${C.lightHot})`, boxShadow: `0 0 20px ${lightA(0.6)}` }} />
      </div>
      {(start || end) && (
        <div dir="rtl" style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontFamily: FA, fontWeight: 700, fontSize: 26, color: C.fgDim }}>
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
    </div>
  );
};

/** a vertical ruler (intelligence scale): marks [frac 0..1 from the bottom, Persian label], the top mark dashed */
export const Ruler: React.FC<{ k: number; marks: [number, string][]; x?: number; top?: number; bottom?: number; dashTop?: boolean }> = ({ k, marks, x = 120, top = 300, bottom = 1300, dashTop = true }) => {
  const e = easeOut(k);
  if (e <= 0) return null;
  const Y = (f: number) => bottom - f * (bottom - top);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: e }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x} y1={bottom} x2={x} y2={bottom - (bottom - top) * e} stroke={C.line2} strokeWidth={3} />
        {Array.from({ length: 21 }, (_, i) => (
          <line key={i} x1={x - (i % 5 === 0 ? 18 : 10)} x2={x} y1={Y(i / 20)} y2={Y(i / 20)} stroke={C.line2} strokeWidth={2} opacity={e} />
        ))}
        {marks.map(([f, _], i) => (
          <line key={`m${i}`} x1={x} x2={1000} y1={Y(f)} y2={Y(f)} stroke={i === marks.length - 1 && dashTop ? C.light : C.line2} strokeWidth={2} strokeDasharray={i === marks.length - 1 && dashTop ? "10 10" : "4 10"} opacity={0.8} />
        ))}
      </svg>
      {marks.map(([f, label], i) => (
        <div key={i} dir="rtl" style={{ position: "absolute", right: 70, top: Y(f) - 52, fontFamily: FA, fontWeight: 800, fontSize: 32, color: i === marks.length - 1 ? C.lightHot : C.fgDim }}>{label}</div>
      ))}
    </div>
  );
};

/** «ما اینجاییم» — a pin above a point with a label pill */
export const Marker: React.FC<{ k: number; x: number; y: number; label: string }> = ({ k, x, y, label }) => {
  const e = back(k);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${0.6 + 0.4 * e})`, transformOrigin: "50% 100%", opacity: clamp(k * 2), display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div dir="rtl" style={{ padding: "10px 22px 12px", borderRadius: 99, background: C.lightHot, color: "#0A0D12", fontFamily: FA, fontWeight: 900, fontSize: 34, whiteSpace: "nowrap", boxShadow: `0 0 40px ${lightA(0.5)}` }}>{label}</div>
      <div style={{ width: 3, height: 70, background: `linear-gradient(180deg, ${C.lightHot}, ${lightA(0)})` }} />
    </div>
  );
};

/** a poll card: a question and options; `pick` gets chosen at `pickAt` with a filling bar */
export const Poll: React.FC<{ t: number; k: number; q: string; options: string[]; pick: number; pickAt: number; x?: number; y?: number; w?: number }> = ({ t, k, q, options, pick, pickAt, x = 90, y = 520, w = 900 }) => {
  const rowH = 118;
  return (
    <CardBox x={x} y={y} w={w} h={150 + options.length * rowH} k={k} lit>
      <div dir="rtl" style={{ position: "absolute", right: 46, top: 40, fontFamily: FA, fontWeight: 900, fontSize: 48, color: C.fg }}>{q}</div>
      {options.map((o, i) => {
        const on = i === pick && t >= pickAt;
        const f = on ? easeOut(ramp(t, pickAt, pickAt + 0.6)) : 0;
        return (
          <div key={i} dir="rtl" style={{ position: "absolute", left: 40, right: 40, top: 130 + i * rowH, height: rowH - 22, borderRadius: 22, background: "rgba(242,241,245,.05)", boxShadow: `inset 0 0 0 1.5px ${on ? lightA(0.7) : C.line2}`, overflow: "hidden", display: "flex", alignItems: "center", padding: "0 30px", transform: `scale(${on ? 1 + 0.04 * back(ramp(t, pickAt, pickAt + 0.3)) - 0.04 * ramp(t, pickAt + 0.3, pickAt + 0.6) : 1})` }}>
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${f * 100}%`, background: lightA(0.22) }} />
            <span style={{ position: "relative", fontFamily: FA, fontWeight: 800, fontSize: 40, color: on ? C.lightHot : C.fg }}>{faNum(o)}</span>
            {on && (
              <span style={{ position: "relative", marginRight: "auto" }}>
                <Dot size={18} />
              </span>
            )}
          </div>
        );
      })}
    </CardBox>
  );
};

// ── captions ──────────────────────────────────────────────────────────────────────────────────────────────────
export type Chunk = [si: number, a: number, b: number];
/** phrase chunks: ≤ maxWords words / ≤ maxLen letters, break after punctuation */
export const makeChunks = (words: Word[], maxWords = 4, maxLen = 22): Chunk[] => {
  const out: Chunk[] = [];
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const ws = words.filter((w) => w.si === si);
    let a = 0;
    for (let i = 0; i < ws.length; i++) {
      const len = ws.slice(a, i + 1).map((w) => w.w).join(" ").length;
      const last = i === ws.length - 1;
      if (last || /[،,.!؟?؛:]$/.test(ws[i].w) || i - a + 1 >= maxWords || len >= maxLen) {
        out.push([si, a, i]);
        a = i + 1;
      }
    }
  }
  return out;
};
const LATIN_RE = /^([A-Za-z0-9]+(?:.[A-Za-z0-9]+)*)([،,.!؟?؛:]*)$/;
/** one phrase at a time on a soft dark plate; the word being said lights up in the light colour */
export const Caps: React.FC<{ t: number; words: Word[]; chunks: Chunk[]; y?: number; hide?: [number, number][]; size?: number; show?: Record<string, string> }> = ({ t, words, chunks, y = 1480, hide = [], size = 56, show = {} }) => {
  if (hide.some(([a, b]) => t >= a && t < b)) return null;
  const cs = chunks.map(([si, a, b]) => {
    const ws = words.filter((x) => x.si === si).slice(a, b + 1);
    return { ws, s: ws[0].s - 0.06, e: ws[ws.length - 1].e };
  });
  let i = -1;
  for (let k = 0; k < cs.length; k++) if (t >= cs[k].s) i = k;
  if (i < 0) return null;
  const ch = cs[i], next = cs[i + 1];
  const endAt = next ? Math.min(next.s, ch.e + 0.7) : ch.e + 0.6;
  if (t >= endAt) return null;
  const k = easeOut(ramp(t, ch.s, ch.s + 0.16));
  const out = ramp(t, endAt - 0.08, endAt);
  return (
    <div dir="rtl" style={{ position: "absolute", left: 70, width: 940, top: y, textAlign: "center", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 18}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined }}>
      <span style={{ fontFamily: FA, fontWeight: 800, fontSize: size, lineHeight: 1.35, padding: "4px 26px 8px", borderRadius: 24, background: "rgba(5,5,7,.56)", boxShadow: "0 0 34px 18px rgba(5,5,7,.4)", WebkitBoxDecorationBreak: "clone" }}>
        {ch.ws.map((w, j) => {
          const shown = show[w.w] ?? w.w;
          const now = t >= w.s - 0.02 && t < w.e + 0.08;
          const m = shown.match(LATIN_RE);
          const latin = !!m;
          const style: React.CSSProperties = { color: now ? C.lightHot : C.fg, opacity: t >= w.s ? 1 : 0.86, textShadow: now ? `0 0 26px ${lightA(0.5)}, 0 3px 14px rgba(0,0,0,.85)` : "0 3px 14px rgba(0,0,0,.9)", fontFamily: latin ? `${LATIN}, ${FA}` : FA, fontWeight: latin ? 700 : 800, display: "inline-block" };
          return (
            <React.Fragment key={j}>
              {m ? (
                <>
                  <span style={{ ...style, unicodeBidi: "isolate", direction: "ltr" }}>{m[1]}</span>
                  {m[2] ? <span style={{ ...style, fontFamily: FA }}>{m[2]}</span> : null}
                </>
              ) : (
                <span style={style}>{shown}</span>
              )}
              {j < ch.ws.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};
