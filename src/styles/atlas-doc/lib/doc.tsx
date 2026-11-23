// Atlas Doc · type and furniture: the brand bug, source tags, plates, the right-to-left wipe, headlines with a key
// word, big numbers, chapter cards, quotes, name supers, captions, grain + vignette, the end card. Each piece is a
// function of film time t with its own in/out times (a, b). Text always sits on a dark plate or a dark scene.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, H, W, clamp, ease, fa, ramp } from "./theme";

type P = React.CSSProperties;
export const SD = "0 2px 14px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.8)";
export const PLATE: P = { background: "linear-gradient(270deg, rgba(5,6,8,0.86) 0%, rgba(5,6,8,0.72) 100%)", boxShadow: "0 14px 44px rgba(0,0,0,0.5)", borderRadius: 4 };
/** in/out envelope: 0 → 1 over inD after a, 1 → 0 over outD before b */
export const env = (t: number, a: number, b: number, inD = 0.45, outD = 0.35) => ease.out(ramp(t, a, a + inD)) * (1 - ease.in(ramp(t, b - outD, b)));
/** a right-to-left wipe (Persian reading direction) as a CSS mask; u 0 → hidden, 1 → shown */
export const wipeRTL = (u: number, soft = 10): P => {
  const p = -soft + (100 + 2 * soft) * clamp(u);
  const m = `linear-gradient(270deg, #000 ${p - soft}%, transparent ${p}%)`;
  return { WebkitMaskImage: m, maskImage: m };
};
export const wipeLTR = (u: number, soft = 10): P => {
  const p = -soft + (100 + 2 * soft) * clamp(u);
  const m = `linear-gradient(90deg, #000 ${p - soft}%, transparent ${p}%)`;
  return { WebkitMaskImage: m, maskImage: m };
};

/** your mark: a logo file (public/…) or a neutral geometric glyph */
export const Mark: React.FC<{ size: number; logo?: string; color?: string }> = ({ size, logo, color = C.bone }) =>
  logo ? (
    <Img src={staticFile(logo)} style={{ width: size, height: size, objectFit: "contain" }} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke={color} strokeWidth="4" transform="rotate(45 24 24)" />
      <circle cx="24" cy="24" r="5" fill={C.mark} />
    </svg>
  );

/** always-on corner bug, top-left (Persian titles live on the right): your mark + name + a second line */
export const BrandBug: React.FC<{ t: number; v?: number; name?: string; sub?: string; logo?: string }> = ({ t, v = 1, name = "YOUR BRAND", sub = "DOCUMENTARY", logo }) => {
  const u = ease.out(ramp(t, 0.2, 1.2)) * v;
  if (u <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 46, top: 40, display: "flex", alignItems: "center", gap: 14, opacity: 0.9 * u, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.85))" }}>
      <Mark size={42} logo={logo} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontFamily: F.lat, fontWeight: 700, fontSize: 23, letterSpacing: "0.26em", color: C.bone, lineHeight: 1 }}>{name}</div>
        <div style={{ fontFamily: F.lat, fontWeight: 600, fontSize: 15, letterSpacing: "0.28em", color: C.boneDim, lineHeight: 1 }}>{sub}</div>
      </div>
    </div>
  );
};

/** footage / map credit, bottom-left, Latin small caps on a plate */
export const SourceTag: React.FC<{ t: number; a: number; b: number; text: string }> = ({ t, a, b, text }) => {
  const v = env(t, a + 0.3, b, 0.4, 0.3);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 46, bottom: 38, opacity: v * 0.92, padding: "6px 12px 6px", ...PLATE, background: "rgba(5,6,8,0.66)", fontFamily: F.lat, fontWeight: 500, fontSize: 15, letterSpacing: "0.16em", color: "rgba(238,232,220,0.78)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

/** a Latin kicker line (chapter numbers, units, dates in English) */
export const Kicker: React.FC<{ text: string; color?: string; size?: number; style?: P }> = ({ text, color = C.boneDim, size = 20, style }) => (
  <div style={{ fontFamily: F.lat, fontWeight: 600, fontSize: size, letterSpacing: "0.28em", color, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{text}</div>
);

/** Persian headline that wipes in right-to-left with a small rise and de-blur; exits with a blur fade */
export const Headline: React.FC<{ t: number; a: number; b: number; text: React.ReactNode; size?: number; color?: string; font?: string; style?: P; plate?: boolean; dur?: number }> = ({ t, a, b, text, size = 72, color = C.bone, font = F.faB, style, plate, dur = 0.6 }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const u = ease.out(ramp(t, a, a + dur));
  const o = ease.in(ramp(t, b - 0.3, b));
  return (
    <div style={{ position: "absolute", direction: "rtl", opacity: 1 - o, filter: `blur(${(1 - u) * 6 + o * 8}px)`, transform: `translateY(${(1 - u) * 14}px)`, ...style }}>
      <div style={{ ...(plate ? { ...PLATE, padding: "10px 28px 16px" } : {}), ...wipeRTL(u) }}>
        <div style={{ fontFamily: font, fontSize: size, color, lineHeight: 1.35, whiteSpace: "nowrap", textShadow: plate ? undefined : SD }}>{text}</div>
      </div>
    </div>
  );
};

/** a key word inside a headline: colour + a bar that draws under it, on the spoken word (at) */
export const Key: React.FC<{ t: number; at: number; children: React.ReactNode; color?: string }> = ({ t, at: a, children, color = C.mark }) => {
  const u = ease.out(ramp(t, a, a + 0.4));
  const pop = 1 + 0.06 * Math.sin(Math.PI * clamp((t - a) / 0.35));
  return (
    <span style={{ position: "relative", display: "inline-block", color: u > 0 ? color : undefined, transform: `scale(${t > a ? pop : 1})` }}>
      {children}
      <span style={{ position: "absolute", right: 0, bottom: "0.06em", height: "0.08em", width: `${u * 100}%`, background: color, borderRadius: 2 }} />
    </span>
  );
};

/** counts a number up to `value` between a and a+dur (from 62 % of it — never from 0); Persian digits */
export const countUp = (t: number, a: number, value: number, dur = 1.3, decimals = 0, from = value * 0.62) => {
  const u = 1 - Math.pow(1 - clamp((t - a) / dur), 4);
  const x = from + (value - from) * u;
  return fa(x.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
};

/** a big statistic: number (Vazirmatn Black), unit, a label line and its source */
export const BigStat: React.FC<{ t: number; a: number; b: number; value: number; decimals?: number; prefix?: string; suffix?: string; label?: string; source?: string; color?: string; size?: number; x?: number; y?: number; align?: "center" | "right" | "left"; from?: number; dur?: number; plain?: string }> = (p) => {
  const { t, a, b } = p;
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.4, 0.35);
  const num = p.plain ?? countUp(t, a, p.value, p.dur ?? 1.3, p.decimals ?? 0, p.from ?? p.value * 0.62);
  const size = p.size ?? 210;
  const al = p.align ?? "center";
  return (
    <div style={{ position: "absolute", left: p.x ?? 0, right: p.x == null ? 0 : undefined, top: p.y ?? 330, display: "flex", flexDirection: "column", alignItems: al === "center" ? "center" : al === "right" ? "flex-end" : "flex-start", opacity: v, transform: `translateY(${(1 - ease.out(ramp(t, a, a + 0.5))) * 16}px)` }}>
      <div style={{ direction: "rtl", display: "flex", alignItems: "baseline", gap: 18, fontFamily: F.title, fontSize: size, color: p.color ?? C.bone, lineHeight: 1.05, textShadow: SD }}>
        {p.prefix ? <span style={{ fontSize: size * 0.42, fontFamily: F.faB }}>{p.prefix}</span> : null}
        <span>{num}</span>
        {p.suffix ? <span style={{ fontSize: size * 0.38, fontFamily: F.faB, color: C.boneDim }}>{p.suffix}</span> : null}
      </div>
      {p.label ? <div style={{ ...wipeRTL(ease.out(ramp(t, a + 0.35, a + 1.0))), direction: "rtl", fontFamily: F.faS, fontSize: Math.max(34, size * 0.2), color: C.boneDim, marginTop: 6, whiteSpace: "nowrap", textShadow: SD }}>{p.label}</div> : null}
      {p.source ? <Kicker text={p.source} size={16} color={C.boneFaint} style={{ marginTop: 14, opacity: ease.out(ramp(t, a + 0.8, a + 1.3)) }} /> : null}
    </div>
  );
};

/** full-frame chapter card: Persian number between two rules, the title, an English kicker, over the dimmed picture */
export const ChapterCard: React.FC<{ t: number; a: number; b: number; n: number; title: string; en: string; color?: string }> = ({ t, a, b, n, title, en, color = C.zone }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.5, 0.45);
  const rule = ease.inOut(ramp(t, a + 0.15, a + 0.95));
  const u = ease.out(ramp(t, a + 0.2, a + 1.0));
  const drift = (t - a) * 6;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,6,8,0.86)", opacity: v }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: v, transform: `translateY(${-drift}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 120 * rule, height: 2, background: color }} />
          <div style={{ fontFamily: F.faL, fontSize: 48, color, lineHeight: 1 }}>{fa(String(n))}</div>
          <div style={{ width: 120 * rule, height: 2, background: color }} />
        </div>
        <div style={{ ...wipeRTL(u, 12), fontFamily: F.title, fontSize: 132, color: C.bone, direction: "rtl", lineHeight: 1.3, whiteSpace: "nowrap", textShadow: "0 10px 40px rgba(0,0,0,0.8)" }}>{title}</div>
        <Kicker text={`${String(n).padStart(2, "0")} · ${en}`} size={24} color={C.boneDim} style={{ opacity: ease.out(ramp(t, a + 0.7, a + 1.3)) }} />
      </div>
    </div>
  );
};

/** quote: big Persian quote mark, lines that wipe in one by one, the speaker + date under a rule */
export const QuoteCard: React.FC<{ t: number; a: number; b: number; lines: string[]; who: string; when: string }> = ({ t, a, b, lines, who, when }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.5, 0.4);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(270deg, rgba(5,6,8,0.92) 0%, rgba(5,6,8,0.78) 55%, rgba(5,6,8,0.35) 100%)" }} />
      <div style={{ position: "absolute", right: 150, top: 250, width: 1150, direction: "rtl", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: F.title, fontSize: 150, color: C.mark, lineHeight: 0.6, height: 70 }}>«</div>
        {lines.map((s, i) => (
          <div key={i} style={{ ...wipeRTL(ease.out(ramp(t, a + 0.3 + i * 0.9, a + 1.3 + i * 0.9))), fontFamily: F.faB, fontSize: 70, color: C.bone, lineHeight: 1.45, whiteSpace: "nowrap" }}>
            {s}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26, opacity: ease.out(ramp(t, a + 1.2, a + 1.8)) }}>
          <div style={{ width: 56, height: 3, background: C.zone }} />
          <div style={{ fontFamily: F.faS, fontSize: 34, color: C.boneDim }}>{who}</div>
          <div style={{ fontFamily: F.lat, fontWeight: 500, fontSize: 18, letterSpacing: "0.2em", color: C.boneFaint }}>{when}</div>
        </div>
      </div>
    </div>
  );
};

/** name super: name large, role small, bottom-right with a colour bar */
export const NameSuper: React.FC<{ t: number; a: number; b: number; name: string; role: string; color?: string }> = ({ t, a, b, name, role, color = C.zone }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.45, 0.35);
  const bar = ease.out(ramp(t, a, a + 0.4));
  return (
    <div style={{ position: "absolute", right: 90, bottom: 96, display: "flex", alignItems: "stretch", gap: 22, direction: "rtl", opacity: v, padding: "16px 30px 18px 34px", ...PLATE }}>
      <div style={{ width: 4, background: color, transform: `scaleY(${bar})`, transformOrigin: "bottom" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, ...wipeRTL(ease.out(ramp(t, a + 0.08, a + 0.65))) }}>
        <div style={{ fontFamily: F.faB, fontSize: 50, color: C.bone, whiteSpace: "nowrap", lineHeight: 1.3 }}>{name}</div>
        <div style={{ fontFamily: F.faS, fontSize: 28, color: C.boneDim, whiteSpace: "nowrap" }}>{role}</div>
      </div>
    </div>
  );
};

/** small caption plate: place · date (bottom-right) */
export const Caption: React.FC<{ t: number; a: number; b: number; text: string; sub?: string }> = ({ t, a, b, text, sub }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.4, 0.3);
  return (
    <div style={{ position: "absolute", right: 90, bottom: 96, direction: "rtl", opacity: v, padding: "12px 26px 14px", ...PLATE, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <div style={{ ...wipeRTL(ease.out(ramp(t, a, a + 0.55))), fontFamily: F.faB, fontSize: 38, color: C.bone, whiteSpace: "nowrap", lineHeight: 1.35 }}>{text}</div>
      {sub ? <div style={{ fontFamily: F.lat, fontWeight: 500, fontSize: 17, letterSpacing: "0.2em", color: C.boneFaint, direction: "ltr" }}>{sub}</div> : null}
    </div>
  );
};

/** film grain (12 fps) + vignette on top of everything */
export const Grain: React.FC<{ frame: number; amount?: number; w?: number; h?: number }> = ({ frame, amount = 0.07, w = W, h = H }) => {
  const seed = Math.floor(frame / 2.5) % 97;
  return (
    <>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, opacity: amount, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <filter id={`adgrain${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={w} height={h} filter={`url(#adgrain${seed})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 95% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    </>
  );
};

/** the end card: your mark, name, a line, and «sources in the description» */
export const EndCard: React.FC<{ t: number; a: number; b: number; name?: string; sub?: string; logo?: string; note?: string }> = ({ t, a, b, name = "YOUR BRAND", sub = "DOCUMENTARY", logo, note = "منابع و اعتبار تصاویر در توضیحات ویدیو" }) => {
  if (t < a) return null;
  const v = env(t, a, b + 1, 0.8, 0.6);
  const u = ease.out(ramp(t, a + 0.4, a + 1.6));
  return (
    <div style={{ position: "absolute", inset: 0, background: C.ink0, opacity: v, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
      <div style={{ transform: `scale(${0.92 + 0.08 * u})`, opacity: u }}>
        <Mark size={120} logo={logo} />
      </div>
      <div style={{ fontFamily: F.lat, fontWeight: 700, fontSize: 64, letterSpacing: "0.36em", color: C.bone, opacity: u, marginRight: "-0.36em" }}>{name}</div>
      <Kicker text={sub} size={30} color={C.boneDim} style={{ opacity: ease.out(ramp(t, a + 1.0, a + 2.0)), marginRight: "-0.28em" }} />
      <div style={{ fontFamily: F.faS, fontSize: 32, color: C.boneDim, direction: "rtl", marginTop: 40, opacity: ease.out(ramp(t, a + 1.6, a + 2.6)) }}>{note}</div>
    </div>
  );
};
