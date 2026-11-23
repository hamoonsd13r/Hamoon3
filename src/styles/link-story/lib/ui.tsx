// Shared pieces of both films: scene canvases, the link slot, kinetic text, the hush, the CTA, the logo, grain.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { BOX, C, DROP, F, FINAL, STOP, ROLL, BEAT, beat, clamp, ease, fa, hit, kick, lerp, ramp, rnd, win } from "./theme";
import { drawScene } from "./scenes";

// ---------- a live mini-video ----------
export const SceneCanvas: React.FC<{ k: number; t: number; w: number; h: number; res?: number; style?: React.CSSProperties }> = ({ k, t, w, h, res = 1, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) drawScene(c, k, t);
  }, [k, t]);
  return <canvas ref={ref} width={Math.round(w * res)} height={Math.round(h * res)} style={{ width: w, height: h, display: "block", ...style }} />;
};

// ---------- text ----------
/** Latin run inside Persian text */
export const En: React.FC<{ children: React.ReactNode; s?: number; b?: boolean }> = ({ children, s = 0.86, b = true }) => (
  <span style={{ fontFamily: b ? F.enB : F.en, direction: "ltr", unicodeBidi: "isolate", fontSize: `${s}em`, letterSpacing: "0.01em" }}>{children}</span>
);

/** one word that rises in, unblurs and lands with a small overshoot */
export const Rise: React.FC<{ t: number; at: number; children: React.ReactNode; dy?: number; dur?: number; style?: React.CSSProperties }> = ({ t, at, children, dy = 60, dur = 0.32, style }) => {
  const k = ramp(t, at, at + dur);
  const e = ease.back(k);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: ease.out(clamp(k * 2.2)),
        transform: `translateY(${(1 - e) * dy}px) scale(${lerp(0.86, 1, e)})`,
        filter: `blur(${(1 - ease.out(k)) * 14}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** big slam: comes from huge and blurred, lands hard, rings a little */
export const slam = (t: number, at: number, dur = 0.22) => {
  const k = ramp(t, at, at + dur);
  const e = ease.in(1 - k);
  const ring = hit(t, at + dur, 0.18) * Math.sin((t - at - dur) * 40) * 0.035;
  return { opacity: clamp(k * 3), transform: `scale(${1 + e * 1.6 + ring})`, filter: `blur(${e * 22}px)` };
};

export const glowText = (col = C.orange, a = 0.55, r = 34) => `0 0 ${r}px ${hexA(col, a)}, 0 0 ${r * 3}px ${hexA(col, a * 0.35)}`;
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------- the link slot (Instagram link sticker goes on top of it) ----------
const PERIM = 2 * (BOX.w - BOX.h) + Math.PI * BOX.h;
export const LinkBox: React.FC<{ t: number; from?: number; solid?: boolean }> = ({ t, from = beat(2), solid = false }) => {
  const draw = ease.io(ramp(t, from, from + 0.7));
  if (draw <= 0) return null;
  const lit = ease.out(ramp(t, DROP, DROP + 0.25));
  const final = ramp(t, FINAL, FINAL + 0.3);
  const beatP = t >= DROP ? kick(t, DROP, 30, 0.16) : 0;
  const run = (t * 520) % PERIM;
  const x = BOX.cx - BOX.w / 2, y = BOX.cy - BOX.h / 2, r = BOX.h / 2;
  const shake = hit(t, DROP, 0.12) * 10;
  const arrowY = Math.sin(t * Math.PI * 2 / (BEAT * 2)) * 10;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, pointerEvents: "none" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: shake * Math.sin(t * 90) }}>
        <defs>
          <filter id="lb-glow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation={10 + beatP * 8} />
          </filter>
          <linearGradient id="lb-run" x1="0" x2="1">
            <stop offset="0" stopColor={C.hot} stopOpacity="0" />
            <stop offset="1" stopColor={C.hot} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* glass body */}
        <rect x={x} y={y} width={BOX.w} height={BOX.h} rx={r} fill={solid ? `rgba(8,8,11,${0.82 + lit * 0.1})` : `rgba(255,255,255,${0.035 + lit * 0.05})`} opacity={draw} />
        {/* outer glow when lit */}
        {lit > 0 && <rect x={x} y={y} width={BOX.w} height={BOX.h} rx={r} fill="none" stroke={C.orange} strokeWidth={10 + beatP * 10} opacity={lit * (0.55 + beatP * 0.4)} filter="url(#lb-glow)" />}
        {/* base outline, drawn on */}
        <rect x={x} y={y} width={BOX.w} height={BOX.h} rx={r} fill="none" stroke={lit > 0 ? C.orange : "rgba(255,255,255,0.32)"} strokeWidth={lerp(2.5, 5, lit)} strokeDasharray={`${PERIM * draw} ${PERIM}`} pathLength={undefined} />
        {/* dashed inner guide */}
        <rect x={x + 14} y={y + 14} width={BOX.w - 28} height={BOX.h - 28} rx={r - 14} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="10 12" strokeDashoffset={-t * 30} opacity={draw * (1 - lit * 0.5)} />
        {/* running light */}
        {[0, 0.5].map((o, i) => (
          <rect key={i} x={x} y={y} width={BOX.w} height={BOX.h} rx={r} fill="none" stroke={C.hot} strokeWidth={lerp(4, 7, lit)} strokeLinecap="round"
            strokeDasharray={`${lerp(110, 220, lit)} ${PERIM}`} strokeDashoffset={-(run + o * PERIM)} opacity={draw * (i === 0 ? 0.9 : lit * 0.9)} />
        ))}
      </svg>
      {/* label above the slot */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: y - 74, textAlign: "center", direction: "rtl", fontFamily: F.text, fontSize: lerp(30, 38, lit), color: lit > 0 ? C.ink : solid ? C.dim : C.faint, opacity: draw, letterSpacing: 0.5, textShadow: "0 2px 12px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)" }}>
        <span style={{ opacity: 1 - lit }}>لینک ثبت‌نام</span>
      </div>
      {final > 0 && (
        <div style={{ position: "absolute", left: 0, width: 1080, top: y - 92 + arrowY * 0.25, textAlign: "center", direction: "rtl", fontFamily: F.heavy, fontSize: 44, color: C.ink, opacity: ease.out(final), textShadow: glowText(C.orange, 0.5, 18) }}>
          از همین لینک ثبت‌نام کن
        </div>
      )}
      {final > 0 &&
        [-1, 1].map((s) => (
          <svg key={s} width={70} height={90} style={{ position: "absolute", left: BOX.cx + s * (BOX.w / 2 + 62) - 35, top: BOX.cy - 45 + arrowY, opacity: ease.out(final) }}>
            <path d={s < 0 ? "M18 45 L52 18 M18 45 L52 72" : "M52 45 L18 18 M52 45 L18 72"} stroke={C.orange} strokeWidth={9} strokeLinecap="round" fill="none" transform={`translate(${s * -Math.abs(arrowY) * 0.8},0)`} />
          </svg>
        ))}
    </div>
  );
};

// ---------- hush: «ویدئوی وایرال بعدی… می‌تونه کار تو باشه.» with a views counter ----------
const fmtViews = (v: number) => (v >= 1e6 ? `${fa((v / 1e6).toFixed(1)).replace(".", "٫")} میلیون` : v >= 1e3 ? `${fa(Math.floor(v / 1e3))} هزار` : fa(Math.floor(v)));
export const Hush: React.FC<{ t: number; top?: number }> = ({ t, top = 560 }) => {
  if (t < STOP - 0.05 || t > DROP + 0.25) return null;
  const out = 1 - ramp(t, DROP - 0.04, DROP + 0.12);
  const l1 = STOP + 0.1; // 13.46
  const l2 = beat(29); // 14.04
  const roll = ramp(t, ROLL, DROP - 0.05);
  const views = Math.pow(roll, 2.6) * 2.4e6 + ramp(t, l1, ROLL) * 1200;
  const shake = roll * roll * 4;
  const sx = Math.sin(t * 97) * shake, sy = Math.cos(t * 83) * shake;
  return (
    <div style={{ position: "absolute", left: 0, top, width: 1080, direction: "rtl", textAlign: "center", opacity: out, transform: `translate(${sx}px,${sy}px) scale(${1 + roll * 0.06})` }}>
      <div style={{ fontFamily: F.head, fontSize: 104, color: C.ink, lineHeight: 1.25 }}>
        <Rise t={t} at={l1} dy={30} dur={0.4}>ویدئوی</Rise> <Rise t={t} at={l1 + 0.12} dy={30} dur={0.4}>وایرال</Rise> <Rise t={t} at={l1 + 0.24} dy={30} dur={0.4}>بعدی…</Rise>
      </div>
      <div style={{ fontFamily: F.head, fontSize: 104, color: C.ink, lineHeight: 1.25, marginTop: 10 }}>
        <Rise t={t} at={l2} dy={40}>می‌تونه</Rise> <Rise t={t} at={l2 + 0.2} dy={40}>کار</Rise>{" "}
        <Rise t={t} at={l2 + 0.42} dy={40} style={{ color: C.orange, textShadow: glowText(C.orange, 0.6 + roll * 0.4, 30) }}>
          تو
        </Rise>{" "}
        <Rise t={t} at={l2 + 0.58} dy={40}>باشه.</Rise>
      </div>
      {/* views counter */}
      <div style={{ marginTop: 70, display: "inline-flex", alignItems: "center", gap: 22, padding: "18px 36px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `2px solid ${hexA(C.orange, 0.25 + roll * 0.6)}`, opacity: ease.out(ramp(t, l1 + 0.4, l1 + 0.8)), boxShadow: `0 0 ${roll * 60}px ${hexA(C.orange, roll * 0.6)}` }}>
        <svg width={56} height={40} viewBox="0 0 56 40">
          <path d="M3 20 C12 5 44 5 53 20 C44 35 12 35 3 20 Z" fill="none" stroke={C.hot} strokeWidth={4} />
          <circle cx={28} cy={20} r={8} fill={C.hot} />
        </svg>
        <span style={{ fontFamily: F.head, fontSize: 64, color: C.ink, minWidth: 360, textAlign: "center" }}>{fmtViews(views)}</span>
        <span style={{ fontFamily: F.text, fontSize: 34, color: C.dim }}>بازدید</span>
      </div>
      {/* hearts */}
      {Array.from({ length: 18 }, (_, i) => {
        const at = ROLL + rnd(i) * 1.5;
        const k = ramp(t, at, at + 1.1);
        if (k <= 0 || k >= 1) return null;
        const x = 540 + (rnd(i + 3) - 0.5) * 700 + Math.sin(k * 6 + i) * 30;
        return (
          <svg key={i} width={46} height={42} viewBox="0 0 46 42" style={{ position: "absolute", left: x - 23, top: 470 - k * 420, opacity: Math.sin(k * Math.PI), transform: `scale(${0.6 + rnd(i + 8) * 0.8})` }}>
            <path d="M23 40 C-8 18 6 -4 23 10 C40 -4 54 18 23 40 Z" fill={i % 3 ? C.orange : C.hot} />
          </svg>
        );
      })}
    </div>
  );
};

// ---------- CTA after the drop ----------
export const CTA: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP - 0.02) return null;
  const s1 = slam(t, DROP - 0.02, 0.2);
  const s2 = slam(t, DROP + BEAT - 0.02, 0.2);
  const pulse = kick(t, DROP, 30, 0.14);
  const sweep = ((t - DROP) * 0.55) % 1.6;
  const chip = (at: number, children: React.ReactNode, hot = false) => {
    const k = ramp(t, at, at + 0.28);
    const e = ease.back(k);
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "14px 40px", borderRadius: 999, background: hot ? C.orange : "rgba(255,255,255,0.07)", border: hot ? "none" : `2px solid ${hexA(C.orange, 0.7)}`, color: hot ? "#160700" : C.ink, fontFamily: F.head, fontSize: 64, opacity: clamp(k * 3), transform: `translateY(${(1 - e) * 50}px) scale(${lerp(0.7, 1, e)})`, boxShadow: hot ? `0 0 ${40 + pulse * 40}px ${hexA(C.orange, 0.55)}` : "none" }}>
        {children}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", textAlign: "center" }}>
      <div style={{ position: "absolute", top: 520, width: 1080, fontFamily: F.head, fontSize: 230, lineHeight: 1, color: C.ink, ...s1, textShadow: glowText(C.orange, 0.35 + pulse * 0.3, 40) }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          ثبت‌نام
          {/* light sweep through the letters: a hot copy of the word, masked by a moving band */}
          <span style={{ position: "absolute", left: 0, top: 0, color: "#fff4e6", textShadow: "none", WebkitMaskImage: `linear-gradient(100deg, transparent ${(sweep - 0.25) * 100}%, #000 ${sweep * 100}%, transparent ${(sweep + 0.18) * 100}%)` }}>ثبت‌نام</span>
        </span>
      </div>
      <div style={{ position: "absolute", top: 770, width: 1080, fontFamily: F.head, fontSize: 168, lineHeight: 1, color: C.orange, ...s2, textShadow: glowText(C.orange, 0.6 + pulse * 0.4, 30) }}>شروع شد!</div>
      <div style={{ position: "absolute", top: 1000, width: 1080, display: "flex", justifyContent: "center", gap: 22 }}>
        {chip(beat(33), <>۶۰٪ تخفیف جشنواره</>, true)}
      </div>
      <div style={{ position: "absolute", top: 1128, width: 1080, display: "flex", justifyContent: "center" }}>
        {chip(beat(34), <>فقط ۳۶ ساعت فرصت</>)}
      </div>
    </div>
  );
};

// ---------- logo ----------
/** the brand at the end: a wordmark (your name) with an accent slash that lands — swap for your own SVG logo */
export const Logo: React.FC<{ w: number; t: number; at: number; style?: React.CSSProperties; name?: string; sub?: string }> = ({ w, t, at, style, name = "YOUR BRAND", sub = "STUDIO" }) => {
  const k = ease.out(ramp(t, at, at + 0.5));
  const red = ease.back(ramp(t, at + 0.25, at + 0.55));
  if (k <= 0) return null;
  return (
    <div style={{ width: w, textAlign: "center", opacity: k, filter: `blur(${(1 - k) * 8}px)`, ...style }}>
      <div style={{ position: "relative", display: "inline-block", fontFamily: F.enB, fontSize: w * 0.15, lineHeight: 1.1, color: C.ink, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {name}
        <span style={{ position: "absolute", right: -w * 0.07, top: "6%", width: w * 0.035, height: "88%", background: C.red, transform: `skewX(-18deg) translate(${(1 - red) * 40}px, ${-(1 - red) * 20}px)`, opacity: clamp(red * 2) }} />
      </div>
      {sub ? <div style={{ fontFamily: F.en, fontSize: w * 0.06, color: C.dim, letterSpacing: "0.5em", marginTop: w * 0.02, opacity: ramp(t, at + 0.3, at + 0.55) }}>{sub}</div> : null}
    </div>
  );
};

// ---------- film grain + vignette ----------
export const Grain: React.FC<{ t: number; a?: number }> = ({ t, a = 0.07 }) => {
  const url = useMemo(() => {
    if (typeof document === "undefined") return "";
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    const im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(rnd(i * 0.37 + 1) * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL();
  }, []);
  const f = Math.floor(t * 24);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${url})`, backgroundPosition: `${Math.floor(rnd(f) * 256)}px ${Math.floor(rnd(f + 9) * 256)}px`, opacity: a, mixBlendMode: "overlay", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 45%, transparent 55%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />
    </>
  );
};

export { win };
