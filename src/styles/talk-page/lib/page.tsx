// Talk Page — the printed page and what lives on it: running header, one-line headline with timed pen marks,
// a content zone that hands over to the next one without an empty page, and the "moving figure" (your own footage or
// a code-drawn screen, printed on the paper). Absolute frame = 1080 × 1920; page pieces use page coordinates.
import React, { createContext, useContext } from "react";
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, PAGE, SAFE, ZONE } from "./theme";
import { clamp, eInOut, eOut, eOut5, mix, ramp, useT, wob } from "./time";

export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http%3A//www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.10 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
export const FIBERS =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http%3A//www.w3.org/2000/svg' width='600' height='400'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.06' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.33  0 0 0 0 0.24  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>\")";
/** the paper surface (fibres + grain + light falloff) — reuse it for any extra sheet (the call card) */
export const paperBg = `${FIBERS}, ${GRAIN}, linear-gradient(176deg, #F8F3E9 0%, ${C.paper} 38%, ${C.paper2} 100%)`;

// ---------- geometry of the current page (read by Head, Zone, Figure, Running) ----------
export type Geo = { x: number; y: number; w: number; h: number; zone: { x: number; y: number; w: number; h: number }; safeW: number; safeH: number; rtl: boolean };
const geoOf = (x: number, y: number, w: number, h: number, rtl: boolean): Geo => {
  const zw = w - ZONE.x * 2;
  return {
    x,
    y,
    w,
    h,
    zone: { x: ZONE.x, y: ZONE.y, w: zw, h: ZONE.h },
    safeW: Math.min(zw, SAFE.right - (x + ZONE.x)),
    safeH: Math.max(240, SAFE.bottom - (y + ZONE.y)),
    rtl,
  };
};
const GeoCtx = createContext<Geo>(geoOf(PAGE.x, PAGE.low, PAGE.w, PAGE.bottom - PAGE.low, false));
export const useGeo = () => useContext(GeoCtx);

// ---------- the page ----------
/**
 * The sheet. In place on frame 0 (thumbnail), a small settle on every section change (`bumps`), a slow breath.
 * Animate `y` from the beats to stand it tall (PAGE.tall) for a big figure, or to slide it down out of the way.
 * `lang="fa"` sets right-to-left headlines and running header.
 */
export const Page: React.FC<{ bumps?: number[]; x?: number; y?: number; w?: number; h?: number; lang?: "en" | "fa"; shade?: boolean; children: React.ReactNode }> = ({
  bumps = [],
  x = PAGE.x,
  y = PAGE.low,
  w = PAGE.w,
  h,
  lang = "en",
  shade = true,
  children,
}) => {
  const t = useT();
  const hh = h ?? PAGE.bottom - y;
  const pin = eOut5(ramp(t, 0, 0.35));
  let bump = 0;
  for (const b of bumps) if (t >= b && t < b + 0.5) bump += Math.sin(ramp(t, b, b + 0.5) * Math.PI) * 5;
  const dy = (1 - pin) * 28 + bump + Math.sin(t * 0.7) * 1.6;
  const rot = -0.35 - (1 - pin) * 0.5 + Math.sin(t * 0.45 + 1) * 0.07;
  return (
    <GeoCtx.Provider value={geoOf(x, y, w, hh, lang === "fa")}>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: hh, transform: `translateY(${dy}px) rotate(${rot}deg)`, transformOrigin: "50% 100%" }}>
        {/* soft shadow of the sheet on the speaker */}
        <div style={{ position: "absolute", left: 10, right: 10, top: -6, height: 90, background: "rgba(0,0,0,0.5)", filter: "blur(26px)", borderRadius: 30 }} />
        <div style={{ position: "absolute", inset: 0, background: paperBg, borderRadius: "4px 4px 0 0", boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(60,48,30,0.12)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,250,240,0.2) 0%, rgba(255,250,240,0) 30%, rgba(60,40,20,0.12) 100%)" }} />
          {children}
          {/* the sheet falls into shade at the bottom, where Instagram prints the white username and caption */}
          {shade ? <div style={{ position: "absolute", left: 0, right: 0, top: hh - 280, bottom: 0, background: "linear-gradient(180deg, rgba(26,20,12,0) 0%, rgba(26,20,12,0.32) 45%, rgba(26,20,12,0.55) 100%)", pointerEvents: "none" }} /> : null}
        </div>
      </div>
    </GeoCtx.Provider>
  );
};

/** running header: the topic (opens big in the accent on frame 0, settles at `settleAt`) + section label that types in */
export const Running: React.FC<{ title: string; secs: [number, string][]; kick?: string; settleAt?: number }> = ({ title, secs, kick = C.accent, settleAt = 2.9 }) => {
  const t = useT();
  const g = useGeo();
  let i = 0;
  for (let k = 0; k < secs.length; k++) if (t >= secs[k][0]) i = k;
  const [at, txt] = secs[i] ?? [0, ""];
  const n = Math.floor(ramp(t, at, at + txt.length * 0.018) * txt.length);
  const k = eInOut(ramp(t, settleAt, settleAt + 0.45));
  const rule = eOut(ramp(t, settleAt + 0.25, settleAt + 0.9));
  const hex = (s: string) => [1, 3, 5].map((j) => parseInt(s.slice(j, j + 2), 16));
  const a = hex(kick);
  const b = [106, 99, 86];
  const col = `rgb(${a.map((v, j) => Math.round(mix(v, b[j], k))).join(",")})`;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: g.zone.x,
          width: g.safeW,
          top: mix(2, 18, k),
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: g.rtl ? F.fa : F.mono,
          letterSpacing: g.rtl ? 0 : "0.12em",
          whiteSpace: "pre",
          direction: g.rtl ? "rtl" : "ltr",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: mix(14, 10, k), fontSize: mix(42, 21, k), fontWeight: k < 0.5 ? 700 : 600, color: col }}>
          <span style={{ width: mix(16, 10, k), height: mix(16, 10, k), background: C.accent, flex: "none" }} />
          {title}
        </span>
        <span style={{ fontSize: 21, fontWeight: 500, color: "#6A6356" }}>{txt.slice(0, n)}</span>
      </div>
      <div style={{ position: "absolute", left: g.zone.x, top: 48, height: 1.5, width: g.safeW * rule, background: C.rule, transformOrigin: g.rtl ? "100% 50%" : "0 50%" }} />
    </>
  );
};

// ---------- headline: one line, words ink in on their own times, pen marks on the words ----------
/** a headline word. at = when it inks in · hl = marker · ul = pen underline · strike = pen strike · sheen = turns the
 *  accent with a light sweep · pen = handwritten in the accent · b/it = bold/italic */
export type Wd = { w: string; at?: number; hl?: number; ul?: number; strike?: number; sheen?: number; it?: boolean; b?: boolean; pen?: boolean; size?: number | string; ff?: string; color?: string };
type WIn = string | Wd;
const words = (ws: WIn[]) => {
  const out: Wd[] = [];
  for (const k of ws) {
    if (typeof k === "string") k.split(/\s+/).filter(Boolean).forEach((w) => out.push({ w }));
    else out.push(k);
  }
  return out;
};
// two highlighted neighbours share one band only when they are marked at (nearly) the same time
const near = (k: Wd, o?: Wd) => k.hl !== undefined && o?.hl !== undefined && Math.abs(o.hl - k.hl) < 0.6;

const Wrd: React.FC<{ k: Wd; at: number; i: number; t: number; rtl: boolean; joinPrev?: boolean; joinNext?: boolean }> = ({ k, at, i, t, rtl, joinPrev, joinNext }) => {
  const p = k.pen ? eInOut(ramp(t, at, at + 0.5)) : eOut(ramp(t, at, at + 0.38));
  const hl = k.hl !== undefined ? eOut(ramp(t, k.hl, k.hl + 0.3)) : 0;
  const ul = k.ul !== undefined ? eOut(ramp(t, k.ul, k.ul + 0.36)) : 0;
  const st = k.strike !== undefined ? eOut(ramp(t, k.strike, k.strike + 0.28)) : 0;
  const hitAt = k.hl ?? k.sheen;
  const hit = hitAt !== undefined ? ramp(t, hitAt, hitAt + 0.1) * (1 - ramp(t, hitAt + 0.1, hitAt + 0.45)) : 0;
  const sheen = k.sheen !== undefined ? ramp(t, k.sheen, k.sheen + 0.9) : 0;
  // in a right-to-left line the previous word sits on the right
  const joinL = rtl ? joinNext : joinPrev;
  const joinR = rtl ? joinPrev : joinNext;
  const gap = "0.24em";
  // marks are drawn from the side the line is read from
  const from = rtl ? "100% 50%" : "0 50%";
  const clipOpen = (q: number) => (rtl ? `inset(-60% -2% -60% ${(1 - q) * 100}%)` : `inset(-60% ${(1 - q) * 100}% -60% -2%)`);
  const base: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    zIndex: 0,
    marginRight: rtl ? 0 : gap,
    marginLeft: rtl ? gap : 0,
    fontWeight: k.b || k.sheen !== undefined ? (rtl ? 800 : 650) : undefined,
    fontStyle: k.it ? "italic" : undefined,
    fontSize: k.size,
    fontFamily: k.ff,
    color: k.color ?? (k.sheen !== undefined && t >= k.sheen ? C.accent : k.pen ? C.accent : undefined),
  };
  if (k.pen) {
    return (
      <span
        style={{
          ...base,
          fontFamily: k.ff ?? (rtl ? F.fa : F.pen),
          fontWeight: 700,
          fontSize: k.size ?? (rtl ? "0.96em" : "1.12em"),
          lineHeight: 1,
          clipPath: rtl ? `inset(-30% -4% -30% ${(1 - p) * 100}%)` : `inset(-30% ${(1 - p) * 100}% -30% -4%)`,
          transform: "rotate(-2deg) translateY(0.04em)",
        }}
      >
        {k.w}
      </span>
    );
  }
  return (
    <span style={{ ...base, opacity: p, transform: `translateY(${(1 - p) * 0.42}em) scale(${1 + hit * 0.07})`, filter: p < 1 ? `blur(${(1 - p) * 7}px)` : undefined }}>
      {k.hl !== undefined ? (
        <span
          style={{
            position: "absolute",
            left: joinL ? (rtl ? `-${gap}` : 0) : "-0.06em",
            right: joinR ? (rtl ? 0 : `-${gap}`) : "-0.06em",
            top: rtl ? "0.22em" : "0.12em",
            bottom: rtl ? "0.08em" : "0.02em",
            background: C.mark,
            mixBlendMode: "multiply",
            borderRadius: `${joinL ? 0 : "0.1em"} ${joinR ? 0 : "0.18em"} ${joinR ? 0 : "0.12em"} ${joinL ? 0 : "0.2em"}`,
            transform: `scaleX(${hl}) skewX(${joinL || joinR ? 0 : -4}deg) rotate(${joinL || joinR ? 0 : wob(i, 1) * 1.2}deg)`,
            transformOrigin: from,
            zIndex: -1,
          }}
        />
      ) : null}
      {k.w}
      {k.sheen !== undefined && sheen > 0 && sheen < 1 ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            color: "#FFF1E2",
            WebkitMaskImage: `linear-gradient(105deg, transparent ${sheen * 160 - 40}%, #000 ${sheen * 160 - 20}%, transparent ${sheen * 160}%)`,
            maskImage: `linear-gradient(105deg, transparent ${sheen * 160 - 40}%, #000 ${sheen * 160 - 20}%, transparent ${sheen * 160}%)`,
            opacity: 0.85,
          }}
        >
          {k.w}
        </span>
      ) : null}
      {k.ul !== undefined && ul > 0 ? (
        <svg style={{ position: "absolute", left: "-4%", width: "108%", top: rtl ? "92%" : "86%", height: "0.3em", overflow: "visible", clipPath: clipOpen(ul) }} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d={`M0 ${5 + wob(i, 2) * 3} C 30 ${2 + wob(i, 3) * 3}, 65 ${8 + wob(i, 4) * 2}, 100 ${4 + wob(i, 5) * 3}`} fill="none" stroke={C.accent} strokeWidth={3.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      {k.strike !== undefined && st > 0 ? (
        <svg style={{ position: "absolute", left: "-4%", width: "108%", top: "46%", height: "0.2em", overflow: "visible", clipPath: clipOpen(st) }} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d={`M0 6 L100 ${3 + wob(i, 6) * 3}`} fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
    </span>
  );
};

/**
 * The headline row (one line). Visible from a to b; it lifts away over the last 0.18 s while the next one inks in, so
 * the slot is never empty. Words without `at` ink in at a + i·stagger. `right` = an element on the far side (pen tag…).
 */
export const Head: React.FC<{ a: number; b: number; ws: WIn[]; size?: number; stagger?: number; italic?: boolean; right?: React.ReactNode }> = ({ a, b, ws, size, stagger = 0.06, italic, right }) => {
  const t = useT();
  const g = useGeo();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const out = eInOut(ramp(t, b - 0.18, b));
  const list = words(ws);
  const fs = size ?? (g.rtl ? 46 : 50);
  return (
    <div
      style={{
        position: "absolute",
        left: g.zone.x,
        width: g.safeW,
        top: 56,
        height: 60,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        direction: g.rtl ? "rtl" : "ltr",
        opacity: 1 - out,
        transform: `translateY(${-out * 12}px)`,
        filter: out > 0 ? `blur(${out * 6}px)` : undefined,
      }}
    >
      <div style={{ fontFamily: g.rtl ? F.fa : F.serif, fontSize: fs, fontWeight: g.rtl ? 700 : 500, fontStyle: italic ? "italic" : undefined, color: C.ink, lineHeight: 1.1, whiteSpace: "nowrap", letterSpacing: g.rtl ? 0 : "-0.005em" }}>
        {list.map((k, i) => (
          <Wrd key={i} k={k} at={k.at ?? a + i * stagger} i={i} t={t} rtl={g.rtl} joinPrev={near(k, list[i - 1])} joinNext={near(k, list[i + 1])} />
        ))}
      </div>
      {right ?? null}
    </div>
  );
};

// ---------- content zone ----------
/**
 * One section's content. A slow 1.8 % push across its whole life; it hands over with an overlap (out over the last
 * 0.14 s while the next one is already fading in), so the page is never empty between sections.
 */
export const Zone: React.FC<{ a: number; b: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ a, b, children, style }) => {
  const t = useT();
  const g = useGeo();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const p = eOut(ramp(t, a, a + 0.32));
  const out = eInOut(ramp(t, b - 0.14, b));
  const push = 1 + 0.018 * eInOut(ramp(t, a, b));
  return (
    <div
      style={{
        position: "absolute",
        left: g.zone.x,
        top: g.zone.y,
        width: g.zone.w,
        height: g.zone.h,
        opacity: p * (1 - out),
        transform: `translateY(${(1 - p) * 16 - out * 10}px) scale(${push})`,
        transformOrigin: `${g.safeW / 2}px ${g.safeH / 2}px`,
        filter: out > 0 ? `blur(${out * 6}px)` : p < 1 ? `blur(${(1 - p) * 4}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---------- the moving figure: footage (or a code-drawn screen) printed on the page ----------
/** a camera inside the shot: point (cx, cy) of the figure is put at the figure centre, scaled by s */
export type Cam = { cx: number; cy: number; s: number };
/**
 * One cut of the figure, a ≤ t < b. `src` = a file in public/ (your clip — leave it out and a labelled slot shows),
 * `draw` = a code-drawn picture instead (receives t). z = slow push [from, to], o = push origin, cam = moving camera.
 * `from` = the clip time that plays at a (default 0).
 */
export type Shot = { id: string; a: number; b: number; src?: string; from?: number; draw?: (t: number) => React.ReactNode; z?: [number, number]; o?: string; cam?: (t: number) => Cam };

/** placeholder for a clip you have not mapped yet: a dark plate that says which file goes here */
export const Slot: React.FC<{ id: string; t: number; w: number; h: number }> = ({ id, t, w, h }) => {
  const sx = 0.5 + 0.32 * Math.sin(t * 0.6);
  const sy = 0.45 + 0.25 * Math.cos(t * 0.45);
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 80% at ${sx * 100}% ${sy * 100}%, #5A5247 0%, #2C2823 60%, #1C1915 100%)`, overflow: "hidden" }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
        {Array.from({ length: Math.ceil(w / 46) + 1 }, (_, i) => (
          <line key={i} x1={i * 46 - ((t * 18) % 46)} y1={0} x2={i * 46 - ((t * 18) % 46) - h * 0.35} y2={h} stroke="#EDE4D2" strokeWidth={1} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", textAlign: "center", fontFamily: F.mono, color: "rgba(237,228,210,0.85)" }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "0.08em" }}>▶ {id}</div>
        <div style={{ marginTop: 10, fontSize: 21, fontWeight: 500, letterSpacing: "0.12em", opacity: 0.8 }}>YOUR CLIP GOES HERE</div>
      </div>
    </div>
  );
};

const Foot: React.FC<{ s: Shot; w: number; h: number }> = ({ s, w, h }) => {
  const t = useT();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (t < s.a || t >= s.b) return null;
  const local = Math.max(0, Math.round((t - s.a + (s.from ?? 0)) * fps));
  const [z0, z1] = s.z ?? [1.0, 1.05];
  const k = mix(z0, z1, eInOut(clamp((t - s.a) / (s.b - s.a))));
  const cam = s.cam ? s.cam(t) : null;
  // a slightly cooler, less saturated print so the picture sits on the cream page
  const grade = "saturate(0.8) sepia(0.1) contrast(1.03)";
  const inner = s.draw ? (
    <div style={{ position: "absolute", inset: 0, filter: grade, transform: cam ? undefined : `scale(${k})`, transformOrigin: s.o ?? "50% 50%" }}>{s.draw(t)}</div>
  ) : s.src ? (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={staticFile(s.src)} muted style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover", filter: grade, transform: cam ? undefined : `scale(${k})`, transformOrigin: s.o ?? "50% 50%" }} />
    </Sequence>
  ) : (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${k})`, transformOrigin: s.o ?? "50% 50%" }}>
      <Slot id={s.id} t={t} w={w} h={h} />
    </div>
  );
  if (!cam) return inner;
  return <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `translate(${w / 2}px, ${h / 2}px) scale(${cam.s}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>{inner}</div>;
};

/**
 * The printed figure. It rolls down onto the page at `a` (an ink line is the roller), rolls up at `b` — or, with
 * `aside`, is swept off to the left at that time (the tall-page hook hands the page back this way).
 * tags: [from, text, until?] — a cream chip types in on the top-left corner. credit: source line, bottom-right.
 */
export const Figure: React.FC<{ a: number; b: number; shots: Shot[]; tags?: [number, string, number?][]; tagBottom?: boolean; credit?: string; w?: number; h?: number; aside?: number; children?: React.ReactNode }> = ({
  a,
  b,
  shots,
  tags,
  tagBottom,
  credit,
  w,
  h,
  aside,
  children,
}) => {
  const t = useT();
  const g = useGeo();
  const fw = w ?? g.zone.w;
  const fh = h ?? g.zone.h;
  if (t < a - 0.01 || t > b + 0.27) return null;
  const rev = eOut5(ramp(t, a, a + 0.42));
  const sw = aside !== undefined ? eInOut(ramp(t, aside, aside + 0.75)) : 0;
  if (sw >= 1) return null;
  const out = aside !== undefined ? 0 : eInOut(ramp(t, b - 0.04, b + 0.26));
  const cut = Math.max(1 - rev, out);
  let tag: [number, string, number?] | null = null;
  for (const x of tags ?? []) if (t >= x[0]) tag = x;
  if (tag && tag[2] !== undefined && t > tag[2] + 0.25) tag = null;
  return (
    <div style={{ position: "absolute", left: g.zone.x, top: g.zone.y, width: fw, height: fh, clipPath: sw > 0 ? undefined : `inset(0 0 ${cut * 100}% 0)`, transform: sw > 0 ? `translateX(${-sw * 1150}px) rotate(${-7 * sw}deg)` : undefined, transformOrigin: "0% 100%" }}>
      <div style={{ position: "absolute", inset: 0, background: "#0C0B0A", overflow: "hidden", boxShadow: sw > 0 ? "0 12px 28px rgba(0,0,0,0.35)" : undefined }}>
        {shots.map((s, i) => (
          <Foot key={i} s={s} w={fw} h={fh} />
        ))}
        {/* printed on paper: warm grain + soft vignette + ink frame */}
        <div style={{ position: "absolute", inset: 0, background: GRAIN, mixBlendMode: "multiply", opacity: 0.9 }} />
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 70px rgba(0,0,0,0.45), inset 0 0 0 1.5px rgba(28,26,23,0.55)" }} />
        {credit ? <div style={{ position: "absolute", right: 12, bottom: 10, fontFamily: F.mono, fontSize: 18, fontWeight: 500, letterSpacing: "0.06em", color: "rgba(243,235,221,0.75)" }}>{credit}</div> : null}
        {cut > 0 && sw <= 0 ? <div style={{ position: "absolute", left: 0, right: 0, top: `${(1 - cut) * 100}%`, height: 2, marginTop: -2, background: "rgba(28,26,23,0.6)" }} /> : null}
      </div>
      {tag ? <Chip at={tag[0]} text={tag[1]} until={tag[2]} y={tagBottom ? fh - 58 : 16} /> : null}
      {children}
    </div>
  );
};

/** cream label chip pasted on a figure's top-left corner; types in, leaves at `until` */
export const Chip: React.FC<{ at: number; text: string; until?: number; x?: number; y?: number }> = ({ at, text, until, x = 16, y = 16 }) => {
  const t = useT();
  const n = Math.floor(ramp(t, at + 0.05, at + 0.05 + text.length * 0.016) * text.length);
  const p = eOut(ramp(t, at, at + 0.25)) * (until !== undefined ? 1 - eInOut(ramp(t, until, until + 0.25)) : 1);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, padding: "7px 12px 6px", background: "rgba(242,236,224,0.95)", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", fontFamily: F.mono, fontWeight: 600, fontSize: 22, letterSpacing: "0.1em", color: C.ink, whiteSpace: "pre", opacity: p, transform: `translateY(${(1 - p) * -8}px)` }}>
      {text.slice(0, n)}
      <span style={{ opacity: n < text.length ? 1 : 0 }}>▍</span>
    </div>
  );
};
