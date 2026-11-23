// Market File · type. The kinetic headline (lines rise out of blur; the key word gets the accent CHIP on the exact
// spoken word, with a slam), labels, big numbers, the source line, the scene eyebrow, the button.
// Every piece is a pure function of props: pass the film time `t` and the word times in.
import React from "react";
import { C, FA, INK, LATIN, MONO, clamp, easeOut, faNum, kick, ramp } from "./theme";

export type On = "dark" | "light"; // what the piece sits on: ink / footage, or the accent flood / paper
const PERSIAN = /[؀-ۿ]/;

/** mono UPPERCASE label (HUD, sources, tickers); Persian text inside falls back to Vazirmatn, RTL */
export const MonoLbl: React.FC<{ size?: number; color?: string; weight?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size = 22, color = C.creamMute, weight = 500, style, children }) => (
  <span
    style={{
      fontFamily: `${MONO}, ${FA}`,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: ".24em",
      textTransform: "uppercase",
      direction: typeof children === "string" && PERSIAN.test(children) ? "rtl" : "ltr",
      unicodeBidi: "isolate",
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

// ─── the chip ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * The signature chip on a word that is already on screen: the word sits in plain type from the start (no hole in the
 * line while it waits); on its spoken time the chip wipes in from the right (RTL reading start) with the ink text on
 * top, tilted −2.6°. On dark: accent chip + ink text. On light: ink chip + accent text.
 */
export const ChipTok: React.FC<{ p: number; on?: On; plain?: string; children: React.ReactNode }> = ({ p, on = "dark", plain, children }) => {
  const sw = easeOut(ramp(p, 0, 0.8));
  const bg = on === "dark" ? C.accent : C.ink;
  const fg = on === "dark" ? C.ink : C.accent;
  const base = plain ?? (on === "dark" ? C.cream : C.ink);
  return (
    <span style={{ position: "relative", display: "inline-block", transform: `rotate(${-2.6 * sw}deg)` }}>
      <span style={{ position: "absolute", inset: 0, background: bg, borderRadius: ".16em", transformOrigin: "100% 50%", transform: `scaleX(${sw})`, boxShadow: `0 .12em 0 rgba(0,0,0,${on === "dark" ? 0.22 : 0.14})` }} />
      <span style={{ position: "relative", display: "inline-block", padding: ".02em .16em", lineHeight: 1.05, color: base }}>{children}</span>
      {sw > 0 && <span style={{ position: "absolute", left: 0, top: 0, display: "inline-block", padding: ".02em .16em", lineHeight: 1.05, color: fg, clipPath: `inset(-40% 0 -40% ${(1 - sw) * 100}%)` }}>{children}</span>}
    </span>
  );
};

/** the chip as a standalone label (accent, ink text, slight tilt), absolutely placed by `style` */
export const ChipLabel: React.FC<{ k: number; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ k, size = 32, children, style }) => {
  const e = easeOut(clamp(k));
  return (
    <div dir="rtl" style={{ position: "absolute", display: "inline-block", opacity: clamp(k * 3), ...style }}>
      <span style={{ position: "relative", display: "inline-block", transform: `rotate(${-2.6 * e}deg) scale(${0.85 + 0.15 * e})`, transformOrigin: "100% 50%" }}>
        <span style={{ position: "absolute", inset: 0, background: C.accent, borderRadius: ".16em", transformOrigin: "100% 50%", transform: `scaleX(${e})`, boxShadow: "0 .12em 0 rgba(0,0,0,.25)" }} />
        <span style={{ position: "relative", display: "inline-block", padding: ".12em .38em", fontFamily: FA, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: C.ink, whiteSpace: "nowrap", clipPath: `inset(-40% 0 -40% ${(1 - e) * 100}%)` }}>{children}</span>
      </span>
    </div>
  );
};

// ─── the kinetic headline ──────────────────────────────────────────────────────────────────────────────────
/** a token: plain text, or a word with a chip time / a slam time / beat pulses / its own colour or size / a tail («!» «،») */
export type Tok = string | { w: string; chip?: number; slam?: number; pulse?: number[]; color?: string; size?: number; tail?: string };
const pulseK = (t: number, ps?: number[]) => (ps ? ps.reduce((s, p) => s + 0.16 * kick(t, p, 0.36), 0) : 0);
const rise = (t: number, a: number, len = 0.38) => easeOut(ramp(t, a, a + len));

let CTX: CanvasRenderingContext2D | null = null;
/** width of a Persian line in the headline face (canvas measure; the fonts are loaded before the first frame) */
export const measure = (text: string, size: number, weight = 900, family = FA, letterSpacingEm = -0.04) => {
  if (typeof document === "undefined") return text.length * size * 0.5;
  CTX ??= document.createElement("canvas").getContext("2d");
  if (!CTX) return text.length * size * 0.5;
  CTX.font = `${weight} ${size}px ${family}`;
  // Chrome does not apply letter-spacing inside Persian/Arabic words (it would break the joins): only Latin shrinks
  const latin = PERSIAN.test(text) ? text.replace(/[؀-ۿ‌\s]/g, "").length : text.length;
  return CTX.measureText(text).width + letterSpacingEm * size * latin;
};

/** font size for a line so it fits `w` (chips add their padding): a long line never runs off the frame */
const fitSize = (line: Tok[], size: number, w: number) => {
  const text = line.map((tk) => (typeof tk === "string" ? tk : tk.w + (tk.tail ?? ""))).join(" ");
  const chips = line.filter((tk) => typeof tk !== "string" && tk.chip !== undefined).length;
  const need = measure(text, size) + chips * 0.36 * size;
  return need > w * 0.96 ? Math.floor((size * w * 0.96) / need) : size;
};

/**
 * Lines (RTL) that rise out of blur at lineAt[i] (default t0 + i·stagger) and leave upward at t1.
 * A token with `chip` gets the accent chip wiped in at that time (= the spoken word) plus a short scale kick.
 * Sizes: hook 150–200 · scene headline 110–120 (y 340) · two-line question 84–92.
 */
export const Head: React.FC<{
  t: number;
  t0: number;
  t1?: number;
  lines: Tok[][];
  size: number;
  x?: number;
  y: number;
  w?: number;
  lineAt?: number[];
  stagger?: number;
  gap?: number;
  on?: On;
  color?: string;
  align?: "right" | "center";
  style?: React.CSSProperties;
}> = ({ t, t0, t1, lines, size, x = 90, y, w = 900, lineAt, stagger = 0.08, gap = 0.1, on = "dark", color, align = "right", style }) => {
  const fg = color ?? (on === "dark" ? C.cream : C.ink);
  const out = t1 === undefined ? 0 : easeOut(ramp(t, t1, t1 + 0.24));
  if (out >= 1) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, ...style }}>
      {lines.map((line, i) => {
        const a = lineAt?.[i] ?? t0 + i * stagger;
        const k = rise(t, a);
        if (k <= 0) return <div key={i} style={{ height: size * (0.86 + gap) }} />;
        const o = k * (1 - out);
        const ls = fitSize(line, size, w);
        const dy = (1 - k) * size * 0.42 - out * size * 0.5;
        const bl = (1 - k) * 10 + out * 8;
        return (
          <div
            key={i}
            style={{
              fontFamily: FA,
              fontWeight: 900,
              fontSize: ls,
              lineHeight: 0.86,
              letterSpacing: "-0.04em",
              color: fg,
              marginBottom: size * gap + (size - ls) * 0.86,
              opacity: o,
              transform: `translateY(${dy}px)`,
              filter: bl > 0.2 ? `blur(${bl}px)` : undefined,
              whiteSpace: "nowrap",
              textShadow: on === "dark" ? "0 4px 30px rgba(0,0,0,.45)" : undefined,
            }}
          >
            {line.map((tok, j) => {
              const sp = j < line.length - 1 ? " " : "";
              if (typeof tok === "string") return <React.Fragment key={j}>{tok + sp}</React.Fragment>;
              const sl = tok.slam !== undefined ? rise(t, tok.slam, 0.26) : 1;
              const tsz = tok.size ? { fontSize: tok.size } : {};
              const slamT = tok.slam !== undefined && sl < 1 ? `scale(${1 + 0.5 * (1 - sl)})` : "";
              const pk = pulseK(t, tok.pulse);
              if (tok.chip === undefined)
                return (
                  <React.Fragment key={j}>
                    {/* the tail («.» «،» «!») belongs to the word: it appears with it (a slammed word's dot must not wait alone) */}
                    <span style={{ display: "inline-block", opacity: sl, transform: `${slamT} scale(${1 + pk})`, filter: sl < 1 ? `blur(${(1 - sl) * 8}px)` : undefined, color: tok.color, ...tsz }}>
                      {tok.w}
                      {tok.tail}
                    </span>
                    {sp}
                  </React.Fragment>
                );
              const p = ramp(t, tok.chip, tok.chip + 0.22);
              const s = 1 + 0.14 * kick(t, tok.chip + 0.05, 0.32) + pk;
              return (
                <React.Fragment key={j}>
                  <span style={{ display: "inline-block", transform: `scale(${s}) ${slamT}`, opacity: sl, ...tsz }}>
                    <ChipTok on={on} p={p} plain={fg}>
                      {tok.w}
                    </ChipTok>
                  </span>
                  {tok.tail}
                  {sp}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ─── labels ────────────────────────────────────────────────────────────────────────────────────────────────
/** the source line under data: mono Latin + Persian note, dimmed. Every number on screen gets one. */
export const Src: React.FC<{ x?: number; y: number; latin: string; fa?: string; o?: number; on?: On }> = ({ x = 90, y, latin, fa, o = 1, on = "dark" }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 18, alignItems: "center", opacity: o, direction: "ltr" }}>
    <MonoLbl size={21} color={on === "dark" ? C.creamDim : INK.dim}>
      {latin}
    </MonoLbl>
    {fa && <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 24, color: on === "dark" ? C.creamMute : INK.mute, direction: "rtl", unicodeBidi: "isolate" }}>{fa}</span>}
  </div>
);

/** an accent-dot label on footage: [n] Persian line  MONO */
export const Tag: React.FC<{ n?: string; fa: string; mono?: string; k?: number; size?: number; style?: React.CSSProperties }> = ({ n, fa, mono, k = 1, size = 40, style }) => {
  const e = easeOut(clamp(k));
  return (
    <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: size * 0.4, opacity: e, transform: `translateX(${(1 - e) * -24}px)`, ...style }}>
      {n && (
        <span style={{ width: size * 1.5, height: size * 1.5, borderRadius: 99, background: C.accent, color: C.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FA, fontWeight: 900, fontSize: size * 0.82, flexShrink: 0 }}>
          {n}
        </span>
      )}
      <span style={{ fontFamily: FA, fontWeight: 900, fontSize: size, color: C.cream, textShadow: "0 2px 18px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>{fa}</span>
      {mono && (
        <MonoLbl size={Math.max(20, size * 0.42)} color={C.creamDim} style={{ textShadow: "0 2px 10px rgba(0,0,0,.6)" }}>
          {mono}
        </MonoLbl>
      )}
    </div>
  );
};

/** a big Latin number (Inter 700, tight) */
export const BigNum: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = C.cream, style }) => (
  <span style={{ fontFamily: LATIN, fontWeight: 700, fontSize: size, letterSpacing: "-0.04em", lineHeight: 0.86, color, direction: "ltr", unicodeBidi: "isolate", display: "inline-block", ...style }}>{children}</span>
);

/** scene header: [accent number dot][Persian label] ——— [MONO label] */
export const Eyebrow: React.FC<{ n: string | number; fa: string; mono?: string; on?: On; size?: number; style?: React.CSSProperties }> = ({ n, fa, mono, on = "dark", size = 24, style }) => (
  <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: size * 0.7, ...style }}>
    <span style={{ width: size * 3.2, height: size * 3.2, borderRadius: 99, background: on === "dark" ? C.accent : C.ink, color: on === "dark" ? C.ink : C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FA, fontWeight: 900, fontSize: size * 1.2, flexShrink: 0 }}>
      {faNum(String(n).padStart(2, "0"))}
    </span>
    <span style={{ fontFamily: FA, fontWeight: 600, fontSize: size * 1.15, color: on === "dark" ? C.creamDim : INK.dim }}>{fa}</span>
    <span style={{ flex: 1, height: 2, background: on === "dark" ? C.line2 : INK.line, minWidth: size * 2 }} />
    {mono && (
      <MonoLbl size={size * 0.92} color={on === "dark" ? C.creamMute : INK.mute}>
        {mono}
      </MonoLbl>
    )}
  </div>
);

/** pill button: accent = primary; ink = dark with an accent shine sweep (shine 0→1); ghost = outline */
export const Btn: React.FC<{ v?: "accent" | "ink" | "ghost"; on?: On; size?: number; arrow?: boolean; shine?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ v = "accent", on = "dark", size = 34, arrow, shine, style, children }) => {
  const look: React.CSSProperties =
    v === "accent" ? { background: C.accent, color: C.ink } : v === "ink" ? { background: C.ink, color: C.accent } : { background: "transparent", color: on === "dark" ? C.cream : C.ink, border: `${size * 0.09}px solid ${on === "dark" ? C.line2 : C.ink}` };
  return (
    <div dir="rtl" style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: size * 0.4, padding: `${size * 0.62}px ${size * 1.05}px`, borderRadius: 999, fontFamily: FA, fontWeight: 800, fontSize: size, lineHeight: 1, overflow: "hidden", whiteSpace: "nowrap", ...look, ...style }}>
      <span style={{ position: "relative" }}>{children}</span>
      {arrow && <span style={{ position: "relative", fontFamily: LATIN, fontWeight: 700 }}>↗</span>}
      {v === "ink" && shine !== undefined && (
        <span style={{ position: "absolute", top: "-50%", left: `${-30 + clamp(shine) * 160}%`, width: "30%", height: "200%", background: `linear-gradient(120deg, transparent, ${C.accentGlow}, transparent)`, transform: "rotate(28deg)" }} />
      )}
    </div>
  );
};
