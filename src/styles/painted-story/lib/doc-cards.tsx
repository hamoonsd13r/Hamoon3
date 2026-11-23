// Painted Story · on-screen text and UI props of the 16:9 doc look. Persian words in Vazirmatn / Lalezar, every number
// in Latin digits (Chakra Petch). Sizes are the approved ones (25% under the first try: «the text is a bit big»).
//   DayCard · TopChip · TimeChip · Quote (radio / whisper / write) · RulesList · Tank · TickList · EndCard · PartTitle
import React from "react";
import { useVideoConfig } from "remotion";
import { F } from "./fonts";
import { useTheme } from "./theme";
import { clamp, ease, fade, hash, mix, ramp } from "./time";

/** Latin digits in Chakra Petch, isolated so a «+» or «:» never jumps inside a Persian sentence */
export const Digits: React.FC<{ s: string; size: number; color?: string; shadow?: boolean }> = ({ s, size, color, shadow = true }) => {
  const th = useTheme();
  return <span style={{ fontFamily: F.num, fontSize: size, color: color ?? th.text, direction: "ltr", unicodeBidi: "isolate", letterSpacing: 1, textShadow: shadow ? th.sd : undefined }}>{s}</span>;
};
/** Persian text with its Latin digit runs in Chakra Petch («4 لیتر × 3 روز») */
export const Mixed: React.FC<{ s: string; size: number; family?: string; color?: string; shadow?: boolean }> = ({ s, size, family = F.faB, color, shadow = true }) => {
  const th = useTheme();
  // one inline box, so a flex parent (gap / space-between) never pulls the runs apart
  return (
    <span style={{ direction: "rtl", unicodeBidi: "isolate", whiteSpace: "pre" }}>
      {s.split(/(\d[\d:.,×÷≈/°]*)/).map((p, i) =>
        /^\d/.test(p) ? <Digits key={i} s={p} size={size * 1.02} color={color} shadow={shadow} /> : <span key={i} style={{ fontFamily: family, fontSize: size, color: color ?? th.text, textShadow: shadow ? th.sd : undefined, whiteSpace: "pre" }}>{p}</span>,
      )}
    </span>
  );
};

/** «روزِ N» across the top band (darkened), an accent rule drawing out, an optional clock */
export const DayCard: React.FC<{ t: number; t0: number; day: number; time?: string; hold?: number; word?: string }> = ({ t, t0, day, time, hold = 3.6, word = "روزِ" }) => {
  const th = useTheme();
  const t1 = t0 + hold;
  if (t < t0 || t > t1) return null;
  const u = fade(t, t0, t1, 0.55, 0.6);
  const rule = ease.inOut(ramp(t, t0 + 0.15, t0 + 0.9));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 270, opacity: u, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(4,6,10,0.62), rgba(4,6,10,0))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, direction: "rtl", filter: u < 1 ? `blur(${(1 - u) * 6}px)` : undefined, transform: `translateY(${(1 - u) * -12}px)` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: F.fa, fontSize: 72, color: th.text, textShadow: th.sd }}>{word}</span>
          <Digits s={String(day)} size={78} />
        </div>
        <div style={{ width: 170 * rule, height: 3, background: th.accent, borderRadius: 2, opacity: 0.9 }} />
        {time ? <Digits s={time} size={35} color={th.textDim} /> : null}
      </div>
    </div>
  );
};

/** a small dark chip centred at the top (times, numbers, short facts) */
export const TopChip: React.FC<{ t: number; t0: number; hold?: number; top?: number; children: React.ReactNode }> = ({ t, t0, hold = 3, top = 50, children }) => {
  const th = useTheme();
  const t1 = t0 + hold;
  if (t < t0 || t > t1) return null;
  const u = fade(t, t0, t1, 0.35, 0.4);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: u, transform: `translateY(${(1 - u) * -10}px)`, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 11, direction: "rtl", padding: "9px 24px", borderRadius: 12, background: th.panel, border: `1px solid ${th.panelLine}` }}>{children}</div>
    </div>
  );
};
/** "HH:MM" rolling from `from` to `to` (u 0..1) */
export const rollTime = (from: string, to: string, u: number) => {
  const m = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
  const v = Math.round(mix(m(from), m(to), clamp(u)));
  return `${String(Math.floor(v / 60) % 24).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
/** «ساعت 20:00» chip; with `from` the clock rolls there in 1.4 s */
export const TimeChip: React.FC<{ t: number; t0: number; time: string; from?: string; hold?: number; label?: string }> = ({ t, t0, time, from, hold = 2.8, label = "ساعت" }) => {
  const th = useTheme();
  return (
    <TopChip t={t} t0={t0} hold={hold}>
      <span style={{ fontFamily: F.faB, fontSize: 26, color: th.textDim, textShadow: th.sd }}>{label}</span>
      <Digits s={from ? rollTime(from, time, ease.inOut(ramp(t, t0 + 0.2, t0 + 1.6))) : time} size={36} />
    </TopChip>
  );
};

/** a voice the narration quotes, centred low: radio (flicker, colour split), whisper (smaller), write (pen reveal right→left) */
export const Quote: React.FC<{ t: number; t0: number; hold?: number; text: string; voice?: "radio" | "whisper" | "write"; y?: number }> = ({ t, t0, hold = 2.6, text, voice, y = 850 }) => {
  const th = useTheme();
  const t1 = t0 + hold;
  if (t < t0 || t > t1) return null;
  const u = fade(t, t0, t1, voice === "write" ? 0.7 : 0.25, 0.5);
  const f = Math.floor(t * 24);
  const jit = voice === "radio" ? (hash(f * 1.7) > 0.86 ? 0.45 : 1) : 1;
  const dx = voice === "radio" ? (hash(f * 2.3) - 0.5) * 6 : 0;
  const clip = voice === "write" ? `inset(-20% 0 -20% ${(1 - ease.inOut(ramp(t, t0, t0 + 1.1))) * 100}%)` : undefined;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: u * jit, pointerEvents: "none" }}>
      <div style={{ direction: "rtl", clipPath: clip, transform: `translateX(${dx}px)`, padding: "8px 26px", borderRadius: 13, background: "rgba(6,8,12,0.45)" }}>
        <span style={{ fontFamily: voice === "write" ? F.head : F.fa, fontSize: voice === "whisper" ? 54 : 60, color: voice === "radio" ? "#f2efe6" : th.text, textShadow: voice === "radio" ? `${th.sd}, 3px 0 0 rgba(255,60,60,0.25), -3px 0 0 rgba(60,200,255,0.25)` : th.sd, opacity: voice === "whisper" ? 0.92 : 1 }}>{text}</span>
      </div>
    </div>
  );
};

/** numbered rules stacking on the right, each on its own word; all leave together at `until` */
export const RulesList: React.FC<{ t: number; rules: { at: number; text: string }[]; until: number; top?: number }> = ({ t, rules, until, top = 110 }) => {
  const th = useTheme();
  if (!rules.length || t < rules[0].at || t > until + 0.5) return null;
  const out = 1 - ease.in(ramp(t, until - 0.2, until + 0.4));
  return (
    <div style={{ position: "absolute", right: 80, top, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, direction: "rtl", opacity: out, pointerEvents: "none" }}>
      {rules.map((r, i) => {
        const u = ease.out(ramp(t, r.at, r.at + 0.5));
        if (t < r.at) return null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: u, transform: `translateX(${(1 - u) * 30}px)`, padding: "9px 20px", borderRadius: 12, background: th.panel, borderRight: `4px solid ${th.accent}` }}>
            <Digits s={String(i + 1)} size={38} color={th.accent} />
            <span style={{ fontFamily: F.faB, fontSize: 34, color: th.text, textShadow: th.sd }}>{r.text}</span>
          </div>
        );
      })}
    </div>
  );
};

/** a tank that fills to `max` (rising on the words), then optionally drains to `low` in red; litres count live */
export const Tank: React.FC<{
  t: number; t0: number; t1: number; max: number; fillEnd: number; unit?: string; label?: string; sub?: string; subAt?: number;
  drainAt?: number; low?: number; lowLabel?: string; x?: number; y?: number;
}> = ({ t, t0, t1, max, fillEnd, unit = "لیتر", label = "", sub, subAt, drainAt, low = 0.1, lowLabel = "موجودی", x = 80, y = 150 }) => {
  const th = useTheme();
  const { height: H } = useVideoConfig();
  if (t < t0 || t > t1) return null;
  const vis = fade(t, t0, t1, 0.45, 0.5);
  const fill = ease.inOut(ramp(t, t0 + 0.4, fillEnd));
  const drop = drainAt !== undefined ? ease.inOut(ramp(t, drainAt, drainAt + 0.9)) : 0;
  const level = mix(fill, low, drop);
  const red = drop > 0.5;
  const value = Math.round(level * max);
  const tw = 190, th_ = 470, tx = x + 70, ty = y + 70;
  const surf = ty + th_ - level * th_;
  const wave: string[] = [];
  for (let i = 0; i <= 24; i++) { const px = tx + (i / 24) * tw; wave.push(`${px},${surf + Math.sin(i * 0.9 + t * 5) * 5}`); }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: vis, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x, top: y, width: 560, height: 640, borderRadius: 20, background: th.panel, border: `1px solid ${th.panelLine}` }} />
      <svg width={x + 600} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><clipPath id="ps-tank"><rect x={tx} y={ty} width={tw} height={th_} rx={22} /></clipPath></defs>
        <g clipPath="url(#ps-tank)"><polygon points={`${tx},${ty + th_} ${wave.join(" ")} ${tx + tw},${ty + th_}`} fill={red ? "rgba(224,72,60,0.85)" : th.water} /></g>
        <rect x={tx} y={ty} width={tw} height={th_} rx={22} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={3} />
        {[0.25, 0.5, 0.75].map((q) => <line key={q} x1={tx + tw} y1={ty + th_ - q * th_} x2={tx + tw + 14} y2={ty + th_ - q * th_} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />)}
      </svg>
      <div style={{ position: "absolute", left: x + 290, top: y + 150, width: 250, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, direction: "rtl", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}><Mixed s={red ? lowLabel : label} size={32} color={th.textDim} /></div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <Digits s={String(value)} size={96} color={red ? th.danger : th.text} />
          <span style={{ fontFamily: F.faB, fontSize: 34, color: th.textDim, textShadow: th.sd }}>{unit}</span>
        </div>
        {sub ? <div style={{ display: "flex", alignItems: "baseline", opacity: ease.out(ramp(t, subAt ?? t0, (subAt ?? t0) + 0.4)) }}><Mixed s={sub} size={28} color={th.textDim} /></div> : null}
      </div>
    </div>
  );
};

/** a checklist on the right whose items tick on their words (dim until said) */
export const TickList: React.FC<{ t: number; t0: number; t1: number; items: { label: string; at: number }[]; right?: number; top?: number }> = ({ t, t0, t1, items, right = 90, top = 120 }) => {
  const th = useTheme();
  if (t < t0 - 0.3 || t > t1) return null;
  const vis = fade(t, t0 - 0.3, t1, 0.35, 0.5);
  return (
    <div style={{ position: "absolute", right, top, width: 470, padding: "22px 30px", borderRadius: 18, background: th.panel, border: `1px solid ${th.panelLine}`, direction: "rtl", opacity: vis, pointerEvents: "none" }}>
      {items.map((it, i) => {
        const u = ease.out(ramp(t, it.at - 0.05, it.at + 0.35));
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 50, opacity: 0.25 + 0.75 * u, transform: `translateX(${(1 - u) * -16}px)` }}>
            <span style={{ width: 26, height: 26, borderRadius: 6, border: "2px solid rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", background: u > 0.5 ? th.accent : "transparent" }}>
              {u > 0.5 ? <svg width={18} height={18} viewBox="0 0 26 26"><path d="M5 13.5 L11 19 L21 7" stroke="#fff" strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
            </span>
            <Mixed s={it.label} size={32} />
          </div>
        );
      })}
    </div>
  );
};

/** end of a part: the last shot darkens, «ادامه دارد…» blurs in, then the next part's line */
export const EndCard: React.FC<{ t: number; card: number; title?: string; next?: string }> = ({ t, card, title = "ادامه دارد...", next }) => {
  const th = useTheme();
  const { height: H } = useVideoConfig();
  if (t < card) return null;
  const dark = ease.inOut(ramp(t, card, card + 0.9));
  const u = ease.out(ramp(t, card + 0.5, card + 1.4));
  const v = ease.out(ramp(t, card + 1.1, card + 2.0));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: th.ink, opacity: dark * 0.86 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.39, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, direction: "rtl" }}>
        <span style={{ fontFamily: F.head, fontSize: 108, color: th.text, opacity: u, filter: u < 1 ? `blur(${(1 - u) * 8}px)` : undefined, transform: `translateY(${(1 - u) * 14}px)`, textShadow: th.sd }}>{title}</span>
        {next ? <div style={{ display: "flex", alignItems: "baseline", gap: 12, opacity: v * 0.85 }}><Mixed s={next} size={36} color={th.textDim} /></div> : null}
      </div>
    </div>
  );
};

/** the title of part N over the darkened first frame (`local` = seconds since the part's first frame) */
export const PartTitle: React.FC<{ local: number; pre: number; part: number; series?: string }> = ({ local, pre, part, series }) => {
  const th = useTheme();
  const { height: H } = useVideoConfig();
  const out = 1 - ease.in(ramp(local, pre - 0.5, pre + 0.3));
  if (out <= 0) return null;
  const u = ease.out(ramp(local, 0.2, 1.0)), v = ease.out(ramp(local, 0.6, 1.4));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: out }}>
      <div style={{ position: "absolute", inset: 0, background: th.ink, opacity: 0.8 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.35, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, direction: "rtl" }}>
        {series ? <span style={{ fontFamily: F.faB, fontSize: 38, color: th.textDim, opacity: v, textShadow: th.sd }}>{series}</span> : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: u, filter: u < 1 ? `blur(${(1 - u) * 8}px)` : undefined, transform: `translateY(${(1 - u) * 14}px)` }}>
          <span style={{ fontFamily: F.head, fontSize: 120, color: th.text, textShadow: th.sd }}>قسمت</span>
          <Digits s={String(part)} size={128} />
        </div>
        <div style={{ width: 200 * v, height: 3, background: th.accent, borderRadius: 2, opacity: 0.9 }} />
      </div>
    </div>
  );
};
