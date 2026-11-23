// Paper UI · the pieces: paper backdrop, scenes that rise in and fall away, cards, light app windows, chips, a
// marker that sweeps behind a word (right → left), line icons, stamps, toggles, a clock, a small landscape picture,
// and the white-pill captions (chunks of ≤ 5 words, each word lighting up as it is said).
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FA, MONO, SUB_Y, accentA, bob, clamp, eio, eo, faNum, pop, ramp } from "./theme";
import type { Word } from "./words";

/** a scene window [a, b]: rises in with a short blur, falls away and slightly grows at the end */
export const Scene: React.FC<{ t: number; win: readonly [number, number]; children: React.ReactNode }> = ({ t, win: [a, b], children }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const i = a <= 0 ? 1 : eo(ramp(t, a - 0.02, a + 0.42));
  const o = eio(ramp(t, b - 0.3, b + 0.02));
  return <AbsoluteFill style={{ opacity: clamp(i * 1.4) * (1 - o), transform: `translateY(${(1 - i) * 110}px) scale(${0.94 + 0.06 * i + o * 0.08})`, filter: i < 1 || o > 0 ? `blur(${(1 - i) * 12 + o * 12}px)` : undefined }}>{children}</AbsoluteFill>;
};
/** pop an element in at t0 (absolute, positioned by style) */
export const In: React.FC<{ t: number; t0: number; d?: number; dy?: number; dx?: number; s0?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, t0, d = 0.5, dy = 60, dx = 0, s0 = 0.85, style, children }) => {
  const k = pop(t, t0, d);
  if (k <= 0) return null;
  return <div style={{ position: "absolute", opacity: clamp(k * 1.8), transform: `translate(${(1 - k) * dx}px, ${(1 - k) * dy}px) scale(${s0 + (1 - s0) * k})`, ...style }}>{children}</div>;
};

export const Card: React.FC<{ style?: React.CSSProperties; dark?: boolean; children?: React.ReactNode }> = ({ style, dark, children }) => (
  <div style={{ position: "absolute", borderRadius: 34, background: dark ? C.dark : C.card, boxShadow: dark ? "0 40px 90px rgba(17,17,22,.35)" : "0 30px 80px rgba(60,48,20,.16), 0 2px 0 rgba(255,255,255,.9) inset", border: dark ? "1px solid rgba(255,255,255,.08)" : `1px solid ${C.line}`, overflow: "hidden", ...style }}>{children}</div>
);
export const Fa: React.FC<{ size: number; w?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ size, w = 700, color = C.ink, style, children }) => (
  <div style={{ fontFamily: FA, fontWeight: w, fontSize: size, color, direction: "rtl", lineHeight: 1.15, ...style }}>{children}</div>
);
export const Chip: React.FC<{ k: number; children: React.ReactNode; accent?: boolean; dark?: boolean; style?: React.CSSProperties; size?: number }> = ({ k, children, accent, dark, style, size = 30 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 999, whiteSpace: "nowrap", fontFamily: FA, fontWeight: 700, fontSize: size, direction: "rtl", background: accent ? C.accent : dark ? C.dark : "#fff", color: accent ? "#1a0d05" : dark ? "#fff" : C.ink, border: accent || dark ? "none" : `1px solid ${C.line}`, boxShadow: "0 10px 30px rgba(60,48,20,.12)", opacity: clamp(k * 1.6), transform: `translateY(${(1 - k) * 30}px) scale(${0.7 + 0.3 * k})`, ...style }}>{children}</div>
);
/** a marker sweeping behind a word, right → left (Persian reading order) */
export const Mark: React.FC<{ t: number; t0: number; children: React.ReactNode; color?: string }> = ({ t, t0, children, color = C.accent }) => {
  const p = eo(ramp(t, t0, t0 + 0.35));
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ position: "absolute", right: -10, left: -10, bottom: "8%", height: "38%", background: color, borderRadius: 8, transformOrigin: "100% 50%", transform: `scaleX(${p})`, zIndex: 0 }} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};

export type IcoName = "code" | "chat" | "img" | "play" | "web" | "bolt" | "user" | "chart" | "cal" | "send" | "phone" | "bell" | "lock" | "check" | "card" | "scissors" | "clock" | "star";
export const Ico: React.FC<{ k: IcoName; s?: number; c?: string }> = ({ k, s = 44, c = C.ink }) => {
  const st = { fill: "none", stroke: c, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const d: Record<IcoName, React.ReactNode> = {
    code: <><path d="M9 7 4 12l5 5" {...st} /><path d="m15 7 5 5-5 5" {...st} /></>,
    chat: <path d="M4 5h16v10H9l-5 4z" {...st} />,
    img: <><rect x="3" y="5" width="18" height="14" rx="3" {...st} /><circle cx="9" cy="10" r="1.6" {...st} /><path d="m4 17 5-5 4 4 3-3 4 4" {...st} /></>,
    play: <><rect x="3" y="5" width="18" height="14" rx="3" {...st} /><path d="m10 9 5 3-5 3z" {...st} /></>,
    web: <><circle cx="12" cy="12" r="8" {...st} /><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16" {...st} /></>,
    bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z" {...st} />,
    user: <><circle cx="12" cy="8" r="3.5" {...st} /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" {...st} /></>,
    chart: <><path d="M4 19h16" {...st} /><path d="M7 16v-5M12 16V7M17 16v-8" {...st} /></>,
    cal: <><rect x="4" y="5" width="16" height="15" rx="3" {...st} /><path d="M4 10h16M9 3v4M15 3v4" {...st} /></>,
    send: <path d="M4 12 20 4l-6 16-3-7z" {...st} />,
    phone: <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z" {...st} />,
    bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" {...st} /><path d="M10 20a2 2 0 0 0 4 0" {...st} /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2.5" {...st} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...st} /></>,
    check: <path d="m5 12 5 5 9-10" {...st} />,
    card: <><rect x="3" y="6" width="18" height="12" rx="2.5" {...st} /><path d="M3 10h18M7 15h4" {...st} /></>,
    scissors: <><circle cx="7" cy="7" r="2.5" {...st} /><circle cx="7" cy="17" r="2.5" {...st} /><path d="M9 8.5 19 18M9 15.5 19 6" {...st} /></>,
    clock: <><circle cx="12" cy="12" r="8.5" {...st} /><path d="M12 7v5l3 2" {...st} /></>,
    star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" {...st} />,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24">{d[k]}</svg>;
};

/** a light app window: three dots + a title, optional tabs */
export const Win: React.FC<{ x: number; y: number; w: number; h: number; title?: React.ReactNode; tabs?: string[]; tab?: number; style?: React.CSSProperties; children?: React.ReactNode; dark?: boolean }> = ({ x, y, w, h, title, tabs, tab = 0, style, children, dark }) => (
  <Card dark={dark} style={{ left: x, top: y, width: w, height: h, ...style }}>
    <div style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 24px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,.08)" : C.line}`, background: dark ? C.dark2 : "#FBFAF7" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />)}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, direction: "rtl" }}>{title}</div>
    </div>
    {tabs ? (
      <div style={{ height: 70, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", direction: "rtl", borderBottom: `1px solid ${C.line}` }}>
        {tabs.map((tb, i) => (
          <div key={tb} style={{ padding: "10px 26px", borderRadius: 16, fontFamily: /[a-z]/i.test(tb) ? MONO : FA, fontWeight: 700, fontSize: 26, background: i === tab ? C.ink : "transparent", color: i === tab ? "#fff" : C.sub, border: i === tab ? "none" : `1px solid ${C.line}` }}>{tb}</div>
        ))}
      </div>
    ) : null}
    <div style={{ position: "absolute", left: 0, right: 0, top: 64 + (tabs ? 70 : 0), bottom: 0, overflow: "hidden" }}>{children}</div>
  </Card>
);

/** a dark phone (screen 420 × 860) — put a light or dark app screen inside */
export const Phone: React.FC<{ x: number; y: number; s?: number; rot?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, s = 1, rot = 0, style, children }) => (
  <div style={{ position: "absolute", left: x - 240, top: y - 470, width: 480, height: 940, borderRadius: 74, background: "linear-gradient(140deg, #2a2b31, #0d0d11 45%, #23242a)", boxShadow: "0 50px 110px rgba(17,17,22,.38), inset 0 0 0 2px rgba(255,255,255,.08)", transform: `rotate(${rot}deg) scale(${s})`, ...style }}>
    <div style={{ position: "absolute", left: 30, top: 40, width: 420, height: 860, borderRadius: 52, overflow: "hidden", background: "#FBFAF7" }}>
      {children}
      <div style={{ position: "absolute", left: 160, top: 14, width: 100, height: 30, borderRadius: 15, background: "#0d0d11" }} />
    </div>
  </div>
);

/** a rubber stamp that slams in (k = pop) */
export const Stamp: React.FC<{ k: number; text: string; color?: string; size?: number; rot?: number; style?: React.CSSProperties }> = ({ k, text, color = C.red, size = 84, rot = -12, style }) =>
  k > 0 ? (
    <div style={{ position: "absolute", padding: `${size * 0.16}px ${size * 0.5}px`, border: `${size * 0.09}px solid ${color}`, borderRadius: size * 0.26, color, fontFamily: FA, fontWeight: 800, fontSize: size, whiteSpace: "nowrap", opacity: clamp(k * 1.5) * 0.92, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${2.2 - 1.2 * k})`, background: "rgba(255,255,255,.78)", direction: "rtl", ...style }}>{text}</div>
  ) : null;

/** an iOS-style switch; on = 0…1 */
export const Toggle: React.FC<{ on: number; w?: number }> = ({ on, w = 92 }) => (
  <div style={{ position: "relative", width: w, height: w * 0.58, borderRadius: w, background: on > 0.5 ? C.accent : "#D8D3C8", transition: "none" }}>
    <div style={{ position: "absolute", top: w * 0.06, left: w * 0.06 + on * (w - w * 0.58), width: w * 0.46, height: w * 0.46, borderRadius: w, background: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,.2)" }} />
  </div>
);

/** an analogue clock; angles in degrees */
export const Clock: React.FC<{ size: number; hour: number; minute: number }> = ({ size, hour, minute }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100">
    <circle r="46" fill="#FBFAF7" stroke={C.ink} strokeWidth="3" />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-40" x2="0" y2={i % 3 ? -36 : -33} stroke={C.ink} strokeWidth={i % 3 ? 1.5 : 3} transform={`rotate(${i * 30})`} />)}
    <line x1="0" y1="0" x2="0" y2="-24" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${hour})`} />
    <line x1="0" y1="0" x2="0" y2="-36" stroke={C.accentInk} strokeWidth="3" strokeLinecap="round" transform={`rotate(${minute})`} />
    <circle r="3.5" fill={C.ink} />
  </svg>
);

/** a little landscape «photo» for cards (no image needed) */
export const Land: React.FC<{ w: number; h: number; pal: [string, string, string, string]; sun?: number; style?: React.CSSProperties }> = ({ w, h, pal, sun = 0.62, style }) => {
  const id = `pul${pal[0].slice(1)}${pal[2].slice(1)}`;
  return (
    <svg width={w} height={h} viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" style={{ display: "block", ...style }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal[0]} /><stop offset="1" stopColor={pal[1]} /></linearGradient></defs>
      <rect width="100" height="70" fill={`url(#${id})`} />
      <circle cx={100 * sun} cy="30" r="9" fill="#FFF3D6" opacity="0.9" />
      <path d="M0 48 L18 34 L30 42 L46 26 L62 40 L76 30 L100 44 L100 70 L0 70Z" fill={pal[2]} />
      <path d="M0 56 L22 46 L40 54 L58 44 L80 54 L100 48 L100 70 L0 70Z" fill={pal[3]} />
    </svg>
  );
};

/** paper + moving dot grid + two drifting glows (+ an optional red alarm glow) + the section's giant word */
export const Backdrop: React.FC<{ t: number; ghosts: [number, string][]; alarm?: number }> = ({ t, ghosts, alarm = 0 }) => {
  const g = [...ghosts].reverse().find(([a]) => t >= a) ?? ghosts[0];
  const gk = eo(ramp(t, g[0], g[0] + 0.7));
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(17,17,22,.10) 1.6px, transparent 1.8px)", backgroundSize: "38px 38px", backgroundPosition: `${(t * 8) % 38}px ${(t * 18) % 38}px`, opacity: 0.55 }} />
      <div style={{ position: "absolute", width: 950, height: 950, borderRadius: 475, left: 300 + bob(t, 160, 0.33), top: 100 + bob(t, 110, 0.29, 1), background: `radial-gradient(circle, ${accentA(0.2 * (1 - alarm))}, rgba(255,255,255,0) 65%)` }} />
      <div style={{ position: "absolute", width: 850, height: 850, borderRadius: 425, left: -280 + bob(t, 140, 0.31, 2), top: 1000 + bob(t, 90, 0.35), background: "radial-gradient(circle, rgba(255,226,190,.32), rgba(255,226,190,0) 65%)" }} />
      {alarm > 0 ? <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: 550, left: -10, top: 380, background: `radial-gradient(circle, rgba(229,72,77,${0.13 * alarm}), rgba(229,72,77,0) 62%)` }} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: g[1].length > 5 ? 300 : 380, letterSpacing: -10, color: C.ghost, opacity: 0.85 * gk, transform: `translateX(${-(t - g[0]) * 42 + (1 - gk) * 140}px)`, whiteSpace: "nowrap" }}>{g[1]}</div>
    </AbsoluteFill>
  );
};

// ── captions: white pills, chunks of ≤ 5 words ────────────────────────────────────────────────────────────────
export type Chunk = { s: number; e: number; ws: { w: string; s: number; key: boolean }[] };
export const makeChunks = (words: Word[], key: RegExp): Chunk[] => {
  const out: Chunk[] = [];
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const ws = words.filter((w) => w.si === si);
    let cur: Chunk | null = null;
    ws.forEach((w, i) => {
      if (!cur) cur = { s: w.s, e: w.e, ws: [] };
      const cl = w.w.replace(/[:،,.؟?؛!«»]/g, "");
      cur.ws.push({ w: cl, s: w.s, key: key.test(cl) });
      cur.e = w.e;
      const len = cur.ws.map((x) => x.w).join(" ").length;
      if (/[،,.؟?؛!:]$/.test(w.w) || cur.ws.length >= 5 || len > 24 || i === ws.length - 1) {
        out.push(cur);
        cur = null;
      }
    });
  }
  for (let i = 0; i < out.length; i++) out[i].e = i + 1 < out.length ? Math.min(out[i + 1].s, out[i].e + 1) : out[i].e + 1;
  for (let i = out.length - 1; i > 0; i--) {
    const c = out[i], p = out[i - 1];
    if (c.ws.length === 1 && c.s - p.e < 0.5 && [...p.ws, ...c.ws].map((x) => x.w).join(" ").length <= 30) {
      p.ws.push(...c.ws);
      p.e = c.e;
      out.splice(i, 1);
    }
  }
  return out;
};
export const Subtitle: React.FC<{ t: number; chunks: Chunk[]; from?: number; until?: number }> = ({ t, chunks, from = -1, until = 1e9 }) => {
  if (t < from || t > until) return null;
  const ch = chunks.find((c) => t >= c.s - 0.02 && t < c.e);
  if (!ch) return null;
  const k = eo(ramp(t, ch.s - 0.02, ch.s + 0.2));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: SUB_Y - 56, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 940, padding: "16px 34px", borderRadius: 28, background: "rgba(255,255,255,.92)", boxShadow: "0 16px 40px rgba(60,48,20,.14)", border: `1px solid ${C.line}`, direction: "rtl", fontFamily: FA, fontWeight: 700, fontSize: 52, lineHeight: 1.35, textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 22}px) scale(${0.94 + 0.06 * k})` }}>
        {ch.ws.map((w, i) => (
          <span key={i} style={{ color: t >= w.s - 0.03 ? (w.key ? C.accentInk : C.ink) : "rgba(17,17,22,.25)" }}>
            {faNum(w.w)}
            {i < ch.ws.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
