// Phone Assistant · the kit: obsidian cards with a rim light, line icons (24 grid, stroke 1.75, round), capability
// chips, the voice orb (a flat light disc that grows with the voice), the call waveform (media time stays LTR), the
// phone body, chat/SMS bubbles, the switch, the toast, avatars, the tick and the «thinking» aperture.
import React from "react";
import { BODY, C, FA, MONO, clamp, easeOut, kick, ramp, voiceAmp } from "./theme";

export const ease = easeOut;
export const emph = (x: number) => {
  // cubic-bezier(.05,.7,.1,1) — the brand's emphasised entrance, approximated
  const k = clamp(x);
  return 1 - Math.pow(1 - k, 4.2);
};
export const exitE = (x: number) => {
  const k = clamp(x);
  return k * k * k;
};

// ─── card ──────────────────────────────────────────────────────────────────────────────────────────────────
/** obsidian card (e1/e2) with the brand's rim light; k 0→1 lifts it in from 26px lower */
export const Card: React.FC<{ x: number; y: number; w: number; h?: number; k?: number; out?: number; r?: number; hi?: boolean; lit?: boolean; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, k = 1, out = 0, r = 28, hi, lit, style, children }) => {
  const e = ease(k);
  const o = e * (1 - exitE(out));
  if (o <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        background: lit
          ? `radial-gradient(ellipse 80% 70% at 92% 0%, rgba(255,154,74,.14) 0%, rgba(255,154,74,0) 70%), linear-gradient(180deg, ${C.cardHi} 0%, ${C.card} 100%)`
          : `linear-gradient(180deg, ${hi ? "#12121C" : C.cardHi} 0%, ${C.card} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,236,200,.075), 0 0 0 1.5px ${C.line}, 0 30px 80px rgba(0,0,0,.55)`,
        opacity: o,
        transform: `translateY(${(1 - e) * 26 - exitE(out) * 18}px) scale(${0.97 + 0.03 * e})`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── icons ─────────────────────────────────────────────────────────────────────────────────────────────────
export type IcoName = "phone" | "phoneOut" | "phoneDown" | "msg" | "wifi" | "signal" | "check" | "calendar" | "clock" | "user" | "laptop" | "sun" | "globe" | "send" | "spark" | "q" | "image" | "video" | "tag" | "users" | "mic" | "speaker" | "back" | "plus" | "lock";
const P: Record<IcoName, React.ReactNode> = {
  phone: <path d="M6.6 3.5h2.3l1.4 4.1-2 1.3a12.2 12.2 0 0 0 5 5l1.3-2 4.1 1.4v2.3a2 2 0 0 1-2.1 2A15.6 15.6 0 0 1 4.5 5.6a2 2 0 0 1 2.1-2.1z" />,
  phoneOut: (
    <>
      <path d="M6.6 3.5h2.3l1.4 4.1-2 1.3a12.2 12.2 0 0 0 5 5l1.3-2 4.1 1.4v2.3a2 2 0 0 1-2.1 2A15.6 15.6 0 0 1 4.5 5.6a2 2 0 0 1 2.1-2.1z" />
      <path d="M15 3.5h5.5V9M20.5 3.5L14 10" />
    </>
  ),
  phoneDown: <path d="M3 13.6c5-4.3 13-4.3 18 0l-1.9 2.6-3.6-1.4V12a11 11 0 0 0-7 0v2.8l-3.6 1.4z" />,
  msg: <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-6l-4.5 3.4V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z" />,
  wifi: (
    <>
      <path d="M2.5 9.2a14 14 0 0 1 19 0M5.6 12.4a9.6 9.6 0 0 1 12.8 0M8.7 15.6a5.2 5.2 0 0 1 6.6 0" />
      <circle cx={12} cy={19} r={1.1} fill="currentColor" />
    </>
  ),
  signal: (
    <>
      <path d="M4 19v-2.5M9 19v-5.5M14 19v-8.5M19 19V5" />
    </>
  ),
  check: <path d="M5 12.6l4.4 4.4L19 7.4" />,
  calendar: (
    <>
      <rect x={3.5} y={5} width={17} height={15.5} rx={3} />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx={12} cy={8.5} r={3.8} />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  users: (
    <>
      <circle cx={9} cy={8.5} r={3.4} />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0M15.5 5.6a3.2 3.2 0 0 1 0 6.1M17.8 13.8a6 6 0 0 1 3.4 5.7" />
    </>
  ),
  laptop: (
    <>
      <rect x={4.5} y={5} width={15} height={10.5} rx={1.8} />
      <path d="M2.5 19h19" />
    </>
  ),
  sun: (
    <>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  globe: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17" />
    </>
  ),
  send: <path d="M20.5 3.5L10 14M20.5 3.5l-6.6 17-3.9-6.5-6.5-3.9z" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.4 2.4M15.6 15.6L18 18M6 18l2.4-2.4M15.6 8.4L18 6" />,
  q: (
    <>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-6l-4.5 3.4V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z" />
      <path d="M10 9.6a2.1 2.1 0 1 1 3.1 1.8c-.7.4-1.1.9-1.1 1.6" />
      <circle cx={12} cy={15} r={0.9} fill="currentColor" />
    </>
  ),
  image: (
    <>
      <rect x={3.5} y={4.5} width={17} height={15} rx={3} />
      <circle cx={9} cy={10} r={1.8} />
      <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
    </>
  ),
  video: (
    <>
      <rect x={3} y={6} width={13} height={12} rx={2.6} />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.4V4.8a1.3 1.3 0 0 1 1.3-1.3h7.6l8.1 8.1a1.6 1.6 0 0 1 0 2.3l-6.5 6.5a1.6 1.6 0 0 1-2.3 0z" />
      <circle cx={8.2} cy={8.2} r={1.4} />
    </>
  ),
  mic: (
    <>
      <rect x={9} y={3.5} width={6} height={11} rx={3} />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />
    </>
  ),
  back: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  lock: (
    <>
      <rect x={5} y={10.5} width={14} height={10} rx={2.4} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
};
export const Ico: React.FC<{ n: IcoName; size?: number; color?: string; sw?: number; slash?: number; style?: React.CSSProperties }> = ({ n, size = 32, color = C.accent, sw = 1.75, slash = 0, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ color, flexShrink: 0, overflow: "visible", ...style }}>
    {P[n]}
    {slash > 0 && (
      <>
        <path d="M3.5 3.5L20.5 20.5" stroke={C.ink} strokeWidth={sw + 2.6} strokeDasharray={24.1} strokeDashoffset={24.1 * (1 - clamp(slash))} />
        <path d="M3.5 3.5L20.5 20.5" strokeDasharray={24.1} strokeDashoffset={24.1 * (1 - clamp(slash))} />
      </>
    )}
  </svg>
);

// ─── chip ──────────────────────────────────────────────────────────────────────────────────────────────────
/** a capability chip: gold line icon + label on obsidian; `on` lights it (gold rim + warm fill), `done` draws a tick */
export const Chip: React.FC<{ icon: IcoName; label: string; k?: number; on?: number; done?: number; size?: number; style?: React.CSSProperties }> = ({ icon, label, k = 1, on = 0, done = 0, size = 34, style }) => {
  const e = emph(k);
  if (e <= 0.001) return null;
  const lit = ease(on);
  return (
    <div
      dir="rtl"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.42,
        padding: `${size * 0.42}px ${size * 0.72}px ${size * 0.42}px ${size * 0.62}px`,
        borderRadius: 999,
        background: `linear-gradient(180deg, ${C.cardHi}, ${C.card})`,
        boxShadow: `inset 0 1px 0 rgba(255,236,200,.08), 0 0 0 ${1.5 + lit}px rgba(255,154,74,${0.14 + 0.5 * lit}), 0 14px 40px rgba(0,0,0,.45), 0 0 ${30 * lit}px rgba(255,154,74,${0.2 * lit})`,
        opacity: e,
        transform: `translateY(${(1 - e) * 22}px) scale(${0.9 + 0.1 * e + 0.05 * kick(on, 0.02, 0.4)})`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", width: size * 1.05, height: size * 1.05, alignItems: "center", justifyContent: "center" }}>
        <Ico n={icon} size={size * 1.05} color={lit > 0.5 ? C.accentHi : C.accent} />
      </span>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: size, color: C.fg, letterSpacing: 0 }}>{label}</span>
      {done > 0 && (
        <span style={{ display: "inline-flex", width: size * 0.95, height: size * 0.95, borderRadius: 99, background: C.accent, alignItems: "center", justifyContent: "center", transform: `scale(${0.6 + 0.4 * ease(done) + 0.25 * kick(done, 0.0, 0.5)})`, opacity: clamp(done * 3), boxShadow: `0 0 18px rgba(255,154,74,.45)` }}>
          <Ico n="check" size={size * 0.7} color={C.onAccent} sw={3} />
        </span>
      )}
    </div>
  );
};

// ─── the voice orb ────────────────────────────────────────────────────────────────────────────────────────
/** flat disc of light (hot core → gold → clear), no gloss; scale 1 + amp × 0.18, plus a slow breath (1.8 s) */
export const Orb: React.FC<{ size: number; t: number; amp?: number; k?: number; style?: React.CSSProperties }> = ({ size, t, amp, k = 1, style }) => {
  const a = amp ?? voiceAmp(t);
  const breath = 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 1.8);
  const s = (1 + a * 0.18 + 0.025 * breath) * (0.4 + 0.6 * ease(k));
  return (
    <div style={{ position: "relative", width: size, height: size, opacity: ease(k), ...style }}>
      <div style={{ position: "absolute", inset: -size * 0.55, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,154,74,${0.16 + 0.22 * a}) 0%, rgba(255,154,74,0) 62%)`, transform: `scale(${s})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, #FFFFFF 0%, ${C.accentHot} 9%, ${C.accent} 24%, rgba(255,154,74,.55) 44%, rgba(255,154,74,0) 70%)`, transform: `scale(${s})` }} />
    </div>
  );
};

/** live call waveform: bars from the recent voice loudness, newest at the right (media time stays LTR) */
export const Wave: React.FC<{ t: number; n?: number; w: number; h: number; on?: number; color?: string; active?: boolean }> = ({ t, n = 30, w, h, on = 1, color = C.accent, active = true }) => {
  const bw = (w / n) * 0.52;
  return (
    <svg width={w} height={h} style={{ direction: "ltr", overflow: "visible", opacity: on }}>
      {Array.from({ length: n }, (_, i) => {
        const tt = t - (n - 1 - i) * 0.05;
        const a = active ? voiceAmp(Math.max(0, tt)) : 0;
        const wob = 0.5 + 0.5 * Math.sin(i * 1.7 + tt * 9);
        const bh = Math.max(bw, h * (0.08 + 0.85 * a * (0.55 + 0.45 * wob)));
        const x = (i + 0.5) * (w / n) - bw / 2;
        const recent = 0.35 + 0.65 * (i / (n - 1));
        return <rect key={i} x={x} y={(h - bh) / 2} width={bw} height={bh} rx={bw / 2} fill={color} opacity={recent} />;
      })}
    </svg>
  );
};

// ─── phone ─────────────────────────────────────────────────────────────────────────────────────────────────
export const PH = { w: 393, h: 852, bez: 13, r: 58 };
export type PhoneP = { x: number; y: number; s?: number; rx?: number; ry?: number; rz?: number; o?: number; glow?: number; children?: React.ReactNode; style?: React.CSSProperties };
/** a titanium-black phone at true UI size (393×852 pt screen), centred on (x, y), scaled and tilted */
export const Phone: React.FC<PhoneP> = ({ x, y, s = 1, rx = 0, ry = 0, rz = 0, o = 1, glow = 0.6, children, style }) => {
  const W = PH.w + PH.bez * 2, Hh = PH.h + PH.bez * 2;
  if (o <= 0.001) return null;
  const gx = 50 + ry * 2.2;
  return (
    <div style={{ position: "absolute", left: x - W / 2, top: y - Hh / 2, width: W, height: Hh, opacity: o, transform: `perspective(2400px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`, ...style }}>
      {/* the warm pool the screen throws under the phone */}
      {glow > 0 && <div style={{ position: "absolute", left: -W * 0.3, top: Hh * 0.82, width: W * 1.6, height: W * 0.5, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,154,74,.16), rgba(255,154,74,0))", opacity: glow, filter: "blur(24px)" }} />}
      <div style={{ position: "absolute", inset: 0, borderRadius: PH.r + PH.bez, background: `linear-gradient(${115 + ry}deg, #3a3a40 0%, #141418 ${gx - 30}%, #0a0a0d ${gx}%, #1b1b20 ${gx + 28}%, #46464d 100%)`, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.09) inset, 0 50px 90px rgba(0,0,0,0.7), 0 18px 34px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", inset: 2.5, borderRadius: PH.r + PH.bez - 2.5, background: "#050506" }} />
      <div style={{ position: "absolute", left: PH.bez, top: PH.bez, width: PH.w, height: PH.h, borderRadius: PH.r, overflow: "hidden", background: C.ink, isolation: "isolate" }}>
        {children}
        <div style={{ position: "absolute", left: PH.w / 2 - 63, top: 11, width: 126, height: 37, borderRadius: 19, background: "#000", zIndex: 50 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", background: `linear-gradient(${120 + ry * 0.6}deg, rgba(255,255,255,0) ${30 + ry}%, rgba(255,255,255,0.06) ${44 + ry}%, rgba(255,255,255,0) ${58 + ry}%)` }} />
      </div>
    </div>
  );
};

/** status bar: time, signal, wifi / data, battery. offline: wifi and data slashed, the signal bars stay (SMS works) */
export const StatusBar: React.FC<{ offline?: number; sigLit?: number; color?: string; clock?: string }> = ({ offline = 0, sigLit = 0, color = C.fg, clock = "9:41" }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: PH.w, height: 54, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px 0 44px", boxSizing: "border-box", direction: "ltr" }}>
    <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 16, color }}>{clock}</span>
    <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
      <svg width={18} height={12} viewBox="0 0 18 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.8} y={9 - i * 3} width={3.2} height={3 + i * 3} rx={0.8} fill={sigLit > 0 ? C.accent : color} opacity={sigLit > 0 ? 0.6 + 0.4 * sigLit : 1} />
        ))}
      </svg>
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4, opacity: 1 - 0.55 * offline }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, color }}>4G</span>
        <Ico n="wifi" size={16} color={color} sw={2.2} slash={offline} />
      </span>
      <span style={{ display: "inline-block", width: 25, height: 12, borderRadius: 3.5, border: `1.3px solid ${color}`, opacity: 0.95, position: "relative", boxSizing: "border-box" }}>
        <span style={{ position: "absolute", left: 1.5, top: 1.5, width: 16, height: 6.5, borderRadius: 1.5, background: color }} />
      </span>
    </span>
  </div>
);

// ─── messages ──────────────────────────────────────────────────────────────────────────────────────────────
/** reveal Persian text word by word (the brand's unit of motion is the word): p 0→1 over the words */
export const words = (text: string, p: number) => {
  const ws = text.split(" ");
  const n = Math.max(1, Math.ceil(clamp(p) * ws.length)); // never an empty bubble: the first word comes with it
  return { shown: ws.slice(0, n).join(" "), rest: ws.slice(n).join(" "), n, all: ws.length };
};

/** a chat / SMS bubble. me: molten gold with dark ink (sent); them: obsidian. Text can type in word by word. */
export const Bubble: React.FC<{ me?: boolean; text: string; k?: number; type?: number; size?: number; maxW?: number; label?: string; tick?: number; style?: React.CSSProperties }> = ({ me, text, k = 1, type = 1, size = 19, maxW = 290, label, tick = 0, style }) => {
  const e = emph(k);
  if (e <= 0.001) return null;
  const w = words(text, type);
  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-start" : "flex-end", opacity: e, transform: `translateY(${(1 - e) * 16}px) scale(${0.94 + 0.06 * e})`, transformOrigin: me ? "left bottom" : "right bottom", ...style }}>
      {label && <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: size * 0.68, color: C.fgCap, margin: "0 6px 5px" }}>{label}</span>}
      <div
        style={{
          maxWidth: maxW,
          padding: `${size * 0.5}px ${size * 0.8}px`,
          borderRadius: size * 1.05,
          borderBottomLeftRadius: me ? size * 0.3 : size * 1.05,
          borderBottomRightRadius: me ? size * 1.05 : size * 0.3,
          background: me ? `linear-gradient(180deg, ${C.accentHi} 0%, ${C.accent} 55%, ${C.accent500} 100%)` : `linear-gradient(180deg, ${C.badge}, ${C.cardHi})`,
          boxShadow: me ? "0 8px 24px rgba(255,154,74,.22), inset 0 1px 0 rgba(255,255,255,.45)" : `inset 0 1px 0 rgba(255,236,200,.07), 0 0 0 1.2px ${C.line2}`,
          fontFamily: BODY,
          fontWeight: me ? 600 : 500,
          fontSize: size,
          lineHeight: 1.55,
          color: me ? C.onAccent : C.fg,
          letterSpacing: 0,
        }}
      >
        {w.shown}
        {w.rest && <span style={{ opacity: 0 }}>{" " + w.rest}</span>}
      </div>
      {tick > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, margin: "5px 6px 0", opacity: ease(tick), fontFamily: BODY, fontWeight: 600, fontSize: size * 0.62, color: C.fgCap }}>
          <Ico n="check" size={size * 0.72} color={C.accent} sw={2.4} />
          ارسال شد
        </span>
      )}
    </div>
  );
};

/** three dots that breathe (the assistant is answering) */
export const Dots: React.FC<{ t: number; k?: number; size?: number; style?: React.CSSProperties }> = ({ t, k = 1, size = 9, style }) => (
  <div style={{ display: "inline-flex", gap: size * 0.7, padding: `${size * 1.2}px ${size * 1.6}px`, borderRadius: 99, background: `linear-gradient(180deg, ${C.badge}, ${C.cardHi})`, boxShadow: `0 0 0 1.2px ${C.line2}`, opacity: ease(k), ...style }}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{ width: size, height: size, borderRadius: 99, background: C.accent, opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 7 - i * 0.9)) }} />
    ))}
  </div>
);

/** iOS-like switch: off = obsidian, on = gold with a short glint */
export const Toggle: React.FC<{ on: number; w?: number }> = ({ on, w = 64 }) => {
  const k = ease(on);
  const h = w * 0.6;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 99, background: k > 0 ? `linear-gradient(90deg, ${C.accent500}, ${C.accent})` : C.line2, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,${0.06 + 0.1 * (1 - k)}), 0 0 ${24 * k}px rgba(255,154,74,${0.45 * k})`, direction: "ltr", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 99, background: C.line2, opacity: 1 - k }} />
      <div style={{ position: "absolute", top: h * 0.09, left: h * 0.09 + k * (w - h), width: h * 0.82, height: h * 0.82, borderRadius: 99, background: "#FFFDF6", boxShadow: "0 3px 8px rgba(0,0,0,.35)" }} />
    </div>
  );
};

/** a toast (kept above content; never on a field) */
export const Toast: React.FC<{ icon?: IcoName; text: string; k: number; out?: number; size?: number; style?: React.CSSProperties }> = ({ icon = "check", text, k, out = 0, size = 30, style }) => {
  const e = emph(k) * (1 - exitE(out));
  if (e <= 0.001) return null;
  return (
    <div dir="rtl" style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45, padding: `${size * 0.45}px ${size * 0.8}px ${size * 0.45}px ${size * 0.6}px`, borderRadius: 999, background: "rgba(5,5,7,.86)", boxShadow: `inset 0 1px 0 rgba(255,236,200,.07), 0 0 0 1.5px ${C.line2}, 0 16px 40px rgba(0,0,0,.5)`, opacity: e, transform: `translateY(${(1 - e) * -22}px)`, whiteSpace: "nowrap", ...style }}>
      <span style={{ display: "inline-flex", width: size * 1.1, height: size * 1.1, borderRadius: 99, background: C.accent, alignItems: "center", justifyContent: "center" }}>
        <Ico n={icon} size={size * 0.75} color={C.onAccent} sw={2.6} />
      </span>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: size, color: C.fg }}>{text}</span>
    </div>
  );
};

/** a person: initial on a warm disc (no faces); ai: the assistant's light orb on void */
export const Avatar: React.FC<{ size: number; letter?: string; ai?: boolean; t?: number }> = ({ size, letter = "س", ai, t = 0 }) =>
  ai ? (
    <div style={{ width: size, height: size, borderRadius: 99, background: `radial-gradient(circle at 50% 42%, #17171F, ${C.ink})`, boxShadow: `inset 0 0 0 1.5px rgba(255,154,74,.32)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Orb size={size * 0.62} t={t} amp={0} />
    </div>
  ) : (
    <div style={{ width: size, height: size, borderRadius: 99, background: `linear-gradient(160deg, #3B2A1C, #20160F)`, boxShadow: `inset 0 0 0 1.5px rgba(255,214,150,.28)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FA, fontWeight: 800, fontSize: size * 0.46, color: C.accentHi, flexShrink: 0 }}>{letter}</div>
  );

/** gold check in a circle that pops in */
export const Tick: React.FC<{ k: number; size?: number }> = ({ k, size = 40 }) => {
  const e = ease(k);
  if (k <= 0) return <span style={{ display: "inline-block", width: size, height: size, borderRadius: 99, boxShadow: `inset 0 0 0 2px ${C.line2}`, flexShrink: 0 }} />;
  return (
    <span style={{ display: "inline-flex", width: size, height: size, borderRadius: 99, background: C.accent, alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${0.6 + 0.4 * e + 0.22 * kick(k, 0, 0.6)})`, boxShadow: `0 0 ${16 + 20 * kick(k, 0, 0.6)}px rgba(255,154,74,.45)` }}>
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none" stroke={C.onAccent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.6l4.4 4.4L19 7.4" strokeDasharray={22} strokeDashoffset={22 * (1 - clamp(k * 1.6))} />
      </svg>
    </span>
  );
};

/** the brand's «thinking» aperture: a small ring with a breathing core and one gold arc that turns (0.9 s floor) */
export const Aperture: React.FC<{ t: number; size?: number; k?: number }> = ({ t, size = 28, k = 1 }) => {
  const rot = (t * 360) / 1.4;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ opacity: ease(k), flexShrink: 0 }}>
      <circle cx={14} cy={14} r={11} fill="none" stroke={C.line2} strokeWidth={2.4} />
      <circle cx={14} cy={14} r={11} fill="none" stroke={C.accent} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="18 52" transform={`rotate(${rot} 14 14)`} />
      <circle cx={14} cy={14} r={3.4 + 0.8 * Math.sin(t * 3.5)} fill={C.accentHot} />
    </svg>
  );
};

export const ramp2 = ramp;
