// Painted Story · story graphics of the 9:16 tale look. Thin, quiet, one accent; Persian right-to-left, numbers Latin.
// Never letter-by-letter on Persian (it breaks the joining) — words blur in, lines wipe in from the right.
//   LogDayCard · Hud · Panel · Checklist · FormField · RuleSheet · FloorPlan · KnockCode · Tally · Measure ·
//   PlateNum · FingerTrail · DoorShadows · TallEndCard
import React from "react";
import { useVideoConfig } from "remotion";
import { F } from "./fonts";
import { useTheme } from "./theme";
import { clamp, ease, fade, hash, mix, ramp } from "./time";
import { Mixed } from "./doc-cards";

/** «روزِ 9» title: a small log label, the word and the serif number blurring in, an accent rule, a clock that flips */
export const LogDayCard: React.FC<{ t: number; t0: number; t1: number; day: string; label?: string; time?: [string, string, number?]; top?: number }> = ({ t, t0, t1, day, label = "", time, top = 300 }) => {
  const th = useTheme();
  if (t < t0 - 0.1 || t > t1) return null;
  const out = 1 - ease.in(ramp(t, t1 - 0.5, t1));
  const rule = ease.inOut(ramp(t, t0 + 0.2, t0 + 0.9));
  const w1 = ease.out(ramp(t, t0 + 0.05, t0 + 0.5)), w2 = ease.out(ramp(t, t0 + 0.2, t0 + 0.65));
  const clock = time ? (t < (time[2] ?? t0 + 0.8) ? time[0] : time[1]) : null;
  const word = (u: number): React.CSSProperties => ({ opacity: u, filter: u < 1 ? `blur(${(1 - u) * 10}px)` : undefined, transform: `translateY(${(1 - u) * 18}px)`, display: "inline-block", textShadow: th.sd });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: out, filter: out < 1 ? `blur(${(1 - out) * 8}px)` : undefined, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -100, right: -100, top: -140, height: 460, background: "radial-gradient(closest-side, rgba(4,10,8,0.55), rgba(4,10,8,0))" }} />
      {label ? <span style={{ position: "relative", fontFamily: F.faB, fontSize: 30, color: th.textDim, opacity: ease.out(ramp(t, t0, t0 + 0.5)), textShadow: th.sd }}>{label}</span> : null}
      <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 26, direction: "rtl" }}>
        <span style={{ fontFamily: F.head, fontSize: 118, color: th.text, ...word(w1) }}>روزِ</span>
        <span style={{ fontFamily: F.serif, fontSize: 132, color: th.text, direction: "ltr", ...word(w2) }}>{day}</span>
      </div>
      <div style={{ position: "relative", width: 260 * rule, height: 4, background: th.accent, borderRadius: 2 }} />
      {clock ? <span style={{ position: "relative", fontFamily: F.num, fontSize: 46, letterSpacing: 4, color: th.text, opacity: ease.out(ramp(t, t0 + 0.5, t0 + 1)), textShadow: th.sd, direction: "ltr" }}>{clock}</span> : null}
    </div>
  );
};

/** the small persistent log chip (top-right for RTL, below the app's top bar: y ≥ 236). `a` = opacity (hide it while
 *  a day card, a top panel or the end card holds the top) */
export const Hud: React.FC<{ text: string; a: number; top?: number }> = ({ text, a, top = 236 }) => {
  const th = useTheme();
  return a <= 0 ? null : (
    <div style={{ position: "absolute", right: 56, top, display: "flex", alignItems: "center", gap: 12, direction: "rtl", opacity: a, padding: "10px 20px", borderRadius: 10, background: "rgba(6,16,13,0.5)", border: `1px solid ${th.panelLine}` }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: th.accent }} />
      <Mixed s={text} size={28} color={th.textDim} />
    </div>
  );
};
/** fade windows → opacity: 0 inside any [a, b] (0.3 s edges) */
export const hideIn = (t: number, windows: [number, number][]) => {
  let a = 1;
  for (const [x, y] of windows) a = Math.min(a, 1 - clamp(Math.min(t - (x - 0.3), y + 0.3 - t) / 0.3));
  return a;
};

/** a dark glass panel (frame px) */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; a?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, a = 1, children, style }) => {
  const th = useTheme();
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: a, borderRadius: 18, background: th.panel, border: `1px solid ${th.panelLine}`, boxShadow: "0 20px 60px rgba(0,0,0,0.45)", direction: "rtl", ...style }}>{children}</div>;
};

const Tick: React.FC<{ u: number; size?: number }> = ({ u, size = 40 }) => {
  const th = useTheme();
  return (
    <div style={{ width: size, height: size, flex: "none", borderRadius: 8, border: `2px solid ${u > 0 ? th.accent : th.textDim}`, background: u > 0.5 ? th.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {u > 0 ? <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 26 26" style={{ transform: `scale(${u})` }}><path d="M5 13.5 L11 19 L21 7" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
    </div>
  );
};

/** a checklist panel near the top; each item ticks on its word */
export const Checklist: React.FC<{ t: number; t0: number; t1: number; title: string; items: [string, number][]; x?: number; y?: number; w?: number }> = ({ t, t0, t1, title, items, x = 90, y = 260, w = 900 }) => {
  const th = useTheme();
  const a = fade(t, t0, t1, 0.35, 0.4);
  if (a <= 0) return null;
  return (
    <Panel x={x} y={y} w={w} h={100 + items.length * 78} a={a}>
      <div style={{ position: "absolute", right: 40, top: 24, display: "flex", alignItems: "baseline", direction: "rtl" }}><Mixed s={title} size={30} color={th.textDim} /></div>
      {items.map(([text, at], i) => {
        const done = t >= at ? ease.outBack(ramp(t, at, at + 0.3)) : 0;
        return (
          <div key={i} style={{ position: "absolute", right: 40, top: 84 + i * 78, display: "flex", alignItems: "center", gap: 22 }}>
            <Tick u={done} />
            <span style={{ fontFamily: F.faS, fontSize: 38, color: done > 0.5 ? th.text : th.textDim }}>{text}</span>
          </div>
        );
      })}
    </Panel>
  );
};

/** a form field that gets typed (Latin value) after `fill`; `blurred` = a private value shown out of focus */
export const FormField: React.FC<{ t: number; t0: number; t1: number; label: string; value: string; fill: number; blurred?: string; y?: number }> = ({ t, t0, t1, label, value, fill, blurred, y = 1010 }) => {
  const th = useTheme();
  const a = fade(t, t0, t1, 0.35, 0.45);
  if (a <= 0) return null;
  const n = Math.floor(ramp(t, fill, fill + 0.55) * value.length);
  const b = ease.out(ramp(t, fill + 0.6, fill + 1.1));
  const caret = Math.floor(t * 2.2) % 2 === 0;
  return (
    <Panel x={90} y={y} w={900} h={250} a={a}>
      <div style={{ position: "absolute", right: 44, top: 28, display: "flex", alignItems: "baseline", direction: "rtl" }}><Mixed s={label} size={30} color={th.textDim} /></div>
      <div style={{ position: "absolute", left: 44, right: 44, top: 168, height: 2, background: th.panelLine }} />
      <div style={{ position: "absolute", left: 44, top: 92, display: "flex", alignItems: "baseline", gap: 22, direction: "ltr" }}>
        <span style={{ fontFamily: F.num, fontSize: 56, letterSpacing: 3, color: th.text }}>{value.slice(0, n)}</span>
        {blurred && t >= fill + 0.6 ? <span style={{ fontFamily: F.faS, fontSize: 50, color: th.warm, opacity: b, filter: "blur(11px)" }}>{blurred}</span> : null}
        {n < value.length && caret ? <span style={{ width: 4, height: 54, background: th.accent }} /> : null}
      </div>
    </Panel>
  );
};

/** the rules, taped to the wall: slapped on, tapes one by one, the title wipes in, lines write in on their words, a stamp */
export const RuleSheet: React.FC<{
  t: number; t0: number; t1: number; head: number; title: string; tag?: string; items: [number, string][]; stamp?: [number, string];
}> = ({ t, t0, t1, head, title, tag, items, stamp }) => {
  const th = useTheme();
  const a = fade(t, t0, t1, 0.25, 0.5);
  if (a <= 0) return null;
  const slap = ease.outBack(ramp(t, t0, t0 + 0.4));
  const settle = ease.out(ramp(t, t0 + 0.2, t0 + 1.4));
  const push = 1 + 0.06 * ease.inOut(ramp(t, t0, t1));
  const hd = ease.inOut(ramp(t, head - 0.2, head + 0.5));
  const st = stamp ? ease.out(ramp(t, stamp[0], stamp[0] + 0.18)) : 0;
  const wipe = (u: number) => `inset(-20% 0 -20% ${(1 - u) * 100}%)`; // reveal from the right edge (RTL)
  return (
    <div style={{ position: "absolute", left: 120, top: 330, width: 840, height: 900, opacity: a, transform: `rotate(${mix(-4, -1.4, settle)}deg) scale(${mix(1.15, 1, slap) * push})`, transformOrigin: "50% 40%", direction: "rtl" }}>
      <div style={{ position: "absolute", inset: 0, background: th.paper, borderRadius: 4, boxShadow: "0 30px 70px rgba(0,0,0,0.45), inset 0 0 80px rgba(120,90,60,0.18)" }} />
      {[[-30, -18, -8, 0.35], [770, -14, 7, 0.75], [-26, 860, 6, 1.1], [774, 856, -5, 1.4]].map(([x, y, r, d], i) => {
        const u = ease.out(ramp(t, t0 + d, t0 + d + 0.25));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 120, height: 44, background: "rgba(220,227,220,0.72)", opacity: u, transform: `rotate(${r}deg) scale(${mix(1.4, 1, u)})`, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />;
      })}
      <div style={{ position: "absolute", left: 60, top: 50, right: 60, display: "flex", justifyContent: "space-between", alignItems: "baseline", clipPath: wipe(hd) }}>
        <span style={{ fontFamily: F.head, fontSize: 76, color: th.accent }}>{title}</span>
        {tag ? <Mixed s={tag} size={26} family={F.faB} color="#5E584C" shadow={false} /> : null}
      </div>
      <div style={{ position: "absolute", right: 60, top: 160, width: 720 * hd, height: 4, background: th.accent }} />
      {items.map(([at, text], i) => {
        const u = ramp(t, at, at + 0.55);
        return (
          <div key={i} style={{ position: "absolute", right: 60, left: 60, top: 220 + i * 140, display: "flex", gap: 26, alignItems: "baseline" }}>
            <span style={{ fontFamily: F.num, fontSize: 46, color: th.accent, opacity: t >= at ? 1 : 0 }}>{i + 1}</span>
            <span style={{ lineHeight: 1.35, clipPath: wipe(ease.out(u)) }}><Mixed s={text} size={52} family={F.fa} color={th.paperInk} shadow={false} /></span>
          </div>
        );
      })}
      {stamp && t >= stamp[0] ? (
        <div style={{ position: "absolute", left: 200, top: 640, transform: `rotate(-7deg) scale(${mix(1.6, 1, st)})`, opacity: st, padding: "4px 34px 14px", border: `6px solid ${th.accent}`, borderRadius: 8 }}>
          <span style={{ fontFamily: F.head, fontSize: 84, color: th.accent, whiteSpace: "nowrap" }}>{stamp[1]}</span>
        </div>
      ) : null}
    </div>
  );
};

/** a floor plan: `rooms` boxes in rows of `perRow` along one corridor; rooms light up one by one, one dot each,
 *  «تو» on your room (zoom toward it), an optional second room and a vent link between two neighbours. */
export const FloorPlan: React.FC<{
  t: number; t0: number; t1: number; rooms: number; perRow: number; you: number; label: string;
  roomsAt: number; hallAt: number; dotsAt: number; youAt: number;
  other?: number; otherAt?: number; vent?: [number, number]; ventAt?: number; night?: boolean;
}> = ({ t, t0, t1, rooms, perRow, you, label, roomsAt, hallAt, dotsAt, youAt, other, otherAt = Infinity, vent, ventAt = Infinity, night }) => {
  const th = useTheme();
  const a = fade(t, t0, t1, 0.45, 0.4);
  if (a <= 0) return null;
  const PW = 820, x0 = (1080 - PW) / 2, y0 = 560, gap = 10, hw = 200, rh = 280;
  const rw = (PW - (perRow - 1) * gap) / perRow;
  const zoomTo = ease.inOut(ramp(t, Math.min(youAt, otherAt) - 0.2, Math.min(youAt, otherAt) + 1.2));
  const drift = ease.inOut(ramp(t, t0, t1)) * 0.02;
  const room = (i: number) => {
    const top = i < perRow, k = top ? i : i - perRow; // room 1 on the right (RTL reading order)
    return { x: x0 + (perRow - 1 - k) * (rw + gap), y: top ? y0 : y0 + rh + hw, n: i + 1 };
  };
  const target = room(you - 1);
  const z = mix(1, 1.1, zoomTo) + drift;
  // push toward your room, but never let the plan (or its label) leave the frame (24 px margin)
  const half = (PW / 2) * z, lim = Math.max(0, 540 - 24 - half);
  const ox = clamp(mix(0, (540 - (target.x + rw / 2)) * 0.5, zoomTo), -lim, lim), oy = mix(0, (960 - (target.y + rh / 2)) * 0.3, zoomTo);
  const pulse = (at: number) => (t >= at ? Math.exp(-(t - at) * 3) : 0);
  const ventU = ease.inOut(ramp(t, ventAt, ventAt + 0.8));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: night ? "rgba(4,10,8,0.45)" : "rgba(6,16,13,0.32)" }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${ox}px, ${oy}px) scale(${z})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: x0, width: PW, top: y0 - 84, textAlign: "right", direction: "rtl" }}><Mixed s={label} size={34} color={th.textDim} /></div>
        {Array.from({ length: rooms }, (_, i) => {
          const r = room(i);
          const on = ease.out(ramp(t, roomsAt + i * 0.085, roomsAt + i * 0.085 + 0.3));
          const dAt = dotsAt + (i % perRow) * 0.07 + (i >= perRow ? 0.25 : 0);
          const dot = t >= dAt ? ease.outBack(ramp(t, dAt, dAt + 0.35)) : 0;
          const isYou = r.n === you && t >= youAt;
          const isOther = r.n === other && t >= otherAt;
          const hot = isYou || isOther;
          const p = r.n === other ? pulse(otherAt) : 0;
          return (
            <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: rw, height: rh, opacity: on, transform: `scale(${mix(0.9, 1, on) * (1 + 0.12 * p)})`, boxShadow: isOther ? `0 0 ${30 * p + 8}px ${th.accent}99` : undefined, borderRadius: 6, border: `2px solid ${hot ? th.accent : "rgba(220,227,220,0.55)"}`, background: hot ? `${th.accent}29` : night ? "rgba(18,51,44,0.35)" : "rgba(143,168,155,0.14)" }}>
              <span style={{ position: "absolute", right: 14, top: 10, fontFamily: F.num, fontSize: 34, color: hot ? th.accent : "rgba(220,227,220,0.85)" }}>{String(r.n).padStart(2, "0")}</span>
              {dot > 0 ? <div style={{ position: "absolute", left: rw / 2 - 16, top: rh / 2 - 16, width: 32, height: 32, borderRadius: 16, background: hot ? th.accent : th.warm, transform: `scale(${dot})`, boxShadow: hot ? `0 0 18px ${th.accent}` : "none" }} /> : null}
              {isYou ? <span style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", fontFamily: F.fa, fontSize: 38, color: th.text, opacity: ease.out(ramp(t, youAt + 0.2, youAt + 0.6)) }}>تو</span> : null}
            </div>
          );
        })}
        <div style={{ position: "absolute", right: x0, top: y0 + rh + hw / 2 - 2, width: PW * ease.inOut(ramp(t, hallAt, hallAt + 0.7)), height: 4, background: "rgba(220,227,220,0.6)" }} />
        <span style={{ position: "absolute", right: x0 + 6, top: y0 + rh + hw / 2 + 12, fontFamily: F.faB, fontSize: 30, color: "rgba(220,227,220,0.8)", opacity: ease.out(ramp(t, hallAt + 0.3, hallAt + 0.8)) }}>راهرو</span>
        {vent && ventU > 0 ? (() => {
          const a1 = room(vent[0] - 1), a2 = room(vent[1] - 1);
          const left = a1.x < a2.x ? a1 : a2;
          const vx = left.x + rw + gap / 2, vy = left.y + rh * 0.62;
          return (
            <>
              <div style={{ position: "absolute", left: vx - 34 * ventU, top: vy - 4, width: 68 * ventU, height: 8, background: th.accent, boxShadow: `0 0 14px ${th.accent}` }} />
              <span style={{ position: "absolute", left: vx - 110, width: 220, textAlign: "center", top: left.y - 54, fontFamily: F.faB, fontSize: 32, color: th.accent, opacity: ventU, textShadow: th.sd }}>دریچه</span>
            </>
          );
        })() : null}
      </div>
    </div>
  );
};

/** a knock code on a dark pill: dots pop on each knock; `onlyNo` = the closing answer alone, bigger and lower */
export const KnockCode: React.FC<{ t: number; t0: number; t1: number; yes: number; no: number; onlyNo?: boolean; yesLabel?: string; noLabel?: string; top?: number }> = ({ t, t0, t1, yes, no, onlyNo, yesLabel = "آره", noLabel = "نه", top }) => {
  const th = useTheme();
  const a = fade(t, t0, t1, 0.3, 0.5);
  if (a <= 0) return null;
  const row = (dots: number, label: string, at: number) => {
    const u = ease.out(ramp(t, at, at + 0.35));
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: u, transform: `translateY(${(1 - u) * 14}px)` }}>
        <div style={{ display: "flex", gap: 12, width: 70, justifyContent: "flex-start" }}>
          {Array.from({ length: dots }, (_, i) => {
            const hit = t > at + i * 0.22 ? Math.max(0, 1 - (t - at - i * 0.22) / 0.2) : 0;
            return <div key={i} style={{ width: 26, height: 26, borderRadius: 13, background: th.accent, transform: `scale(${1 + 0.4 * hit})` }} />;
          })}
        </div>
        <span style={{ fontFamily: F.fa, fontSize: 64, color: th.text }}>{label}</span>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: top ?? (onlyNo ? 760 : 330), display: "flex", justifyContent: "center", opacity: a, pointerEvents: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, direction: "rtl", padding: "22px 34px 26px 54px", borderRadius: 22, background: "rgba(6,16,13,0.72)", border: `1px solid ${th.panelLine}`, transform: onlyNo ? "scale(1.25)" : undefined }}>
        {onlyNo ? null : row(1, yesLabel, yes)}
        {row(2, noLabel, no)}
      </div>
    </div>
  );
};

/** N went, K came back: N bars appear, all but `keep` fall away at `lost` */
export const Tally: React.FC<{ t: number; t0: number; t1: number; n: number; keep: number[]; lost: number; labelAll: string; labelKept: string; top?: number }> = ({ t, t0, t1, n, keep, lost, labelAll, labelKept, top = 300 }) => {
  const th = useTheme();
  const { width: W } = useVideoConfig();
  const a = fade(t, t0, t1, 0.35, 0.5);
  if (a <= 0) return null;
  const K = new Set(keep);
  const per = 15, cw = per * 12 + (per - 1) * 28;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: 330, opacity: a, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: (W - cw) / 2, width: cw, top: 0, display: "flex", flexWrap: "wrap", gap: "22px 28px", direction: "rtl" }}>
        {Array.from({ length: n }, (_, i) => {
          const on = ease.out(ramp(t, t0 + i * 0.035, t0 + i * 0.035 + 0.25));
          const gone = K.has(i) ? 0 : ease.in(ramp(t, lost + hash(i) * 0.5, lost + hash(i) * 0.5 + 0.5));
          return <div key={i} style={{ width: 12, height: 74, borderRadius: 6, background: K.has(i) && t > lost ? th.warm : th.textDim, opacity: on * (1 - gone * 0.85), transform: `translateY(${gone * 40}px)` }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center", gap: 40, direction: "rtl" }}>
        <Mixed s={labelAll} size={40} />
        <span style={{ opacity: ease.out(ramp(t, lost, lost + 0.4)) }}><Mixed s={labelKept} size={40} color={th.accent} /></span>
      </div>
    </div>
  );
};

/** a dimension bracket (plate px): «10 سانت» across a gap */
export const Measure: React.FC<{ t: number; t0: number; x0: number; x1: number; y: number; label: string }> = ({ t, t0, x0, x1, y, label }) => {
  const th = useTheme();
  const u = ease.inOut(ramp(t, t0, t0 + 0.6));
  if (u <= 0) return null;
  const xm = (x0 + x1) / 2, half = ((x1 - x0) / 2) * u;
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <div style={{ position: "absolute", left: xm - half, top: y - 2, width: half * 2, height: 4, background: th.accent }} />
      <div style={{ position: "absolute", left: xm - half - 2, top: y - 20, width: 4, height: 40, background: th.accent }} />
      <div style={{ position: "absolute", left: xm + half - 2, top: y - 20, width: 4, height: 40, background: th.accent }} />
      <div style={{ position: "absolute", left: xm - 200, width: 400, top: y + 28, display: "flex", justifyContent: "center", direction: "rtl", opacity: ease.out(ramp(t, t0 + 0.4, t0 + 0.8)) }}><Mixed s={label} size={46} /></div>
    </div>
  );
};

/** a number on a door plate (plate px), embossed, blurring in */
export const PlateNum: React.FC<{ t: number; t0: number; x: number; y: number; n: string }> = ({ t, t0, x, y, n }) => {
  const u = ease.out(ramp(t, t0, t0 + 0.5));
  if (u <= 0) return null;
  return <span style={{ position: "absolute", left: x - 100, top: y - 34, width: 200, textAlign: "center", fontFamily: F.num, fontSize: 60, lineHeight: "68px", color: "#2e3a35", opacity: u * 0.92, textShadow: "0 1px 0 rgba(255,255,255,0.45), 0 -1px 0 rgba(0,0,0,0.35)", filter: u < 1 ? `blur(${(1 - u) * 5}px)` : undefined }}>{n}</span>;
};

/** a finger writing on fogged glass (plate px): the cleared trail so far + where the fingertip is */
export const FingerTrail = (t: number, t0: number, t1: number, x: number, y: number, s: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const px = x + (0.5 - u) * 300 * s + Math.sin(u * Math.PI * 7) * 18 * s; // right → left, like Persian handwriting
    const py = y + Math.cos(u * Math.PI * 7) * 26 * s * (0.6 + 0.4 * Math.sin(u * 3)) - u * 10 * s;
    pts.push([px, py]);
  }
  const n = Math.max(1, Math.floor(ramp(t, t0, t1) * pts.length));
  return { d: "M " + pts.slice(0, n).map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L "), tip: pts[n - 1] };
};

/** footsteps arriving under a door: two shadows slide along the light strip and stop at t1 (plate px) */
export const DoorShadows: React.FC<{ t: number; t0: number; t1: number; xs: [number, number]; y: number; h: number }> = ({ t, t0, t1, xs, y, h }) => {
  const u = ease.out(ramp(t, t0, t1));
  const step = Math.sin(ramp(t, t0, t1) * Math.PI * 4) * (1 - u) * 40;
  const off = (1 - u) * -520;
  return (
    <>
      {xs.map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x + off + (i ? -step : step) - 60, top: y, width: 120, height: h, background: "radial-gradient(closest-side, rgba(5,8,7,0.95), rgba(5,8,7,0.6) 60%, rgba(5,8,7,0))", opacity: clamp(ramp(t, t0, t0 + 0.3)) }} />
      ))}
    </>
  );
};

/** the closing card of a tall episode: series name, «قسمت بعد», «روزِ» with the number flipping from → to */
export const TallEndCard: React.FC<{ t: number; t0: number; series: string; lead?: string; from: string; to: string }> = ({ t, t0, series, lead = "قسمت بعد", from, to }) => {
  const th = useTheme();
  if (t < t0) return null;
  const dark = ease.inOut(ramp(t, t0, t0 + 0.6)) * 0.8;
  const u = ease.out(ramp(t, t0 + 0.5, t0 + 1.3)), v = ease.out(ramp(t, t0 + 1.0, t0 + 1.8));
  const tick = ease.inOut(ramp(t, t0 + 1.7, t0 + 2.2));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: th.ink, opacity: dark }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, direction: "rtl" }}>
        <span style={{ fontFamily: F.faB, fontSize: 36, color: th.textDim, opacity: v }}>{series}</span>
        <span style={{ fontFamily: F.head, fontSize: 92, color: th.text, opacity: u, filter: u < 1 ? `blur(${(1 - u) * 10}px)` : undefined, transform: `translateY(${(1 - u) * 16}px)`, textShadow: th.sd }}>{lead}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 30, opacity: u, transform: `translateY(${(1 - u) * 16}px)` }}>
          <span style={{ fontFamily: F.head, fontSize: 150, color: th.text, textShadow: th.sd }}>روزِ</span>
          <span style={{ position: "relative", display: "inline-block", width: 230, height: 180, overflow: "hidden", direction: "ltr" }}>
            <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: -tick * 180, fontFamily: F.serif, fontSize: 150, lineHeight: "180px", color: "rgba(255,255,255,0.55)" }}>{from}</span>
            <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: (1 - tick) * 180, fontFamily: F.serif, fontSize: 150, lineHeight: "180px", color: th.accent }}>{to}</span>
          </span>
        </div>
        <div style={{ width: 300 * v, height: 5, background: th.accent, borderRadius: 3 }} />
      </div>
    </div>
  );
};

