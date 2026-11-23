// Style Index · the reel: a black title pill, the numbered list (English, like the
// reference) filling in as each style is named, the style's own motion poster in the card on the right, one card per
// name on the beat; then the wall of all twenty, the comment CTA built word by word on the voice, and the send.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useFonts } from "../lib/fonts";
import { C, CTA_AT, DUR, F, FPS, H, HIT, PH, POSTER_SEC, PW, STEP, W, clamp, ease, hash, mix, tween } from "../lib/theme";
import { STYLES, type StyleDef } from "../lib/registry";

export const FRAMES = Math.round(DUR * FPS);
export type FilmProps = { times?: number[] };

type Word = { i?: number; w: string; t0: number; t1: number; cta?: boolean };
// with a voice: fill WORDS from the alignment ({ i, w, t0, t1 } per style name, cta: true for the comment line)
const WORDS: Word[] = [];
const NAME_AT = STYLES.map((_, i) => WORDS.find((w) => !w.cta && w.i === i)?.t0 ?? i * STEP + 0.03);
const CTA_WORDS = WORDS.filter((w) => w.cta);
const cw = (k: number) => CTA_WORDS[k]?.t0 ?? CTA_AT + k * 0.35; // CTA word k: 0 اِی 1 آر 2 تی 3 رو 4 کامنت 5 کن 6 تا 7 استایل‌های 8 بیشتری 9 برات 10 بفرستم

// layout (the reference: list on the left, the card on the right, the bottom third left to Instagram)
const CARD = { x: 458, y: 412, w: 506, h: Math.round((506 * PH) / PW) };
const ROW0 = 424, ROWH = 54, NUM_R = 124, NAME_L = 138;
const GRID = { x: 60, y: 300, cols: 5, tw: 180, th: 320, gap: 12 };
const P_ROW = GRID.th + GRID.gap;
const colOf = (i: number) => GRID.cols - 1 - (i % GRID.cols); // right-to-left: style 1 sits top-right
const cell = (i: number) => ({ x: GRID.x + colOf(i) * (GRID.tw + GRID.gap), y: GRID.y + Math.floor(i / GRID.cols) * P_ROW });

// the wall opens a little before the voice, so the comment lands on a formed wall
const XA = CTA_AT - 0.14;
const FLY = cw(10) + 0.22; // just after «بفرستم» starts: the wall flies into the inbox
const LINE3_OUT = cw(10) + 0.6; // line 3 holds until the word has been said
const DM = { x: W / 2, y: 1420 };

/** a style poster rendered live at its own time `at` (0 … POSTER_SEC) */
const Live: React.FC<{ s: StyleDef; at: number }> = ({ s, at }) => (
  <div style={{ position: "relative", width: PW, height: PH, overflow: "hidden" }}>
    <s.C t={clamp(at, 0, POSTER_SEC - 0.05)} />
  </div>
);

const Paper: React.FC<{ t: number }> = ({ t }) => (
  <>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 60% at 50% 30%, #FBF6F0 0%, ${C.paper} 55%, #EFE5DA 100%)` }} />
    {/* a faint hexagon tiling, drifting (the reference has a still one) */}
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: 0.6 }}>
      <defs>
        <pattern id="reel-hex" width={90} height={52} patternUnits="userSpaceOnUse" patternTransform={`translate(${-t * 9}, ${t * 4})`}>
          <path d="M0,26 L15,0 L45,0 L60,26 L45,52 L15,52 Z M60,26 L90,26" fill="none" stroke="#E6D6C8" strokeWidth={1.6} />
        </pattern>
        <radialGradient id="reel-hexfade" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.25} />
        </radialGradient>
        <mask id="reel-hexm">
          <rect width={W} height={H} fill="url(#reel-hexfade)" />
        </mask>
      </defs>
      <rect width={W} height={H} fill="url(#reel-hex)" mask="url(#reel-hexm)" />
    </svg>
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: 0.05, mixBlendMode: "multiply" }}>
      <filter id="reel-grain">
        <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={Math.floor(t * 12) % 50} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#reel-grain)" />
    </svg>
  </>
);

/** composed from frame 0 (it is also the cover); leaves upward when the wall opens */
const Title: React.FC<{ t: number }> = ({ t }) => {
  const out = tween(t, XA, XA + 0.2, ease.in);
  if (out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 246 - 60 * out, width: W, display: "flex", justifyContent: "center", opacity: 1 - out }}>
      <div dir="rtl" style={{ background: C.ink, color: C.paper, borderRadius: 60, padding: "16px 46px 22px", fontFamily: F.fa, fontSize: 50, lineHeight: 1.25, boxShadow: "0 18px 40px rgba(40,25,15,0.22)", whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: F.inter, fontWeight: 800, color: C.orange, letterSpacing: "0.02em" }}>20</span> استایل موشن‌دیزاین
      </div>
    </div>
  );
};

const List: React.FC<{ t: number; active: number }> = ({ t, active }) => {
  const out = tween(t, XA, XA + 0.12, ease.in);
  if (out >= 1) return null;
  const prev = Math.max(0, active - 1);
  const k = tween(t, active * STEP, active * STEP + 0.14, ease.out);
  const py = mix(ROW0 + prev * ROWH, ROW0 + active * ROWH, active === 0 ? 1 : k);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateX(${-120 * out}px)` }}>
      {STYLES.map((s, i) => {
        const at = NAME_AT[i];
        const u = tween(t, at - 0.02, at + 0.2, ease.out);
        const on = i === active && t < XA;
        const pop = on ? 1 + 0.2 * (1 - tween(t, i * STEP, i * STEP + 0.22, ease.out)) : 1;
        const y = ROW0 + i * ROWH;
        return (
          <React.Fragment key={s.id}>
            <div style={{ position: "absolute", left: NUM_R - 70, top: y - 6, width: 70, textAlign: "right", fontFamily: F.inter, fontWeight: 700, fontSize: 38, lineHeight: 1.15, color: on ? C.orange : u > 0 ? C.ink : "#C9BFB4", transform: `scale(${pop})`, transformOrigin: "100% 50%" }}>
              {i + 1}.
            </div>
            <div style={{ position: "absolute", left: NAME_L, top: y - 6, paddingRight: "0.35em", whiteSpace: "nowrap", fontFamily: F.inter, fontWeight: 700, fontStyle: "italic", fontSize: 38, lineHeight: 1.15, letterSpacing: "-0.01em", color: C.ink, clipPath: `inset(-20% ${100 - 100 * u}% -20% 0)`, transform: `translateX(${(1 - u) * 14}px)`, filter: u < 1 ? `blur(${(1 - u) * 4}px)` : undefined }}>
              {s.name}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 30, top: py - 1, width: 6, height: 38, borderRadius: 3, background: C.orange }} />
    </div>
  );
};

const Card: React.FC<{ t: number; active: number }> = ({ t, active }) => {
  if (t >= XA + 0.5) return null;
  const s = STYLES[active];
  const t0 = active * STEP;
  const punch = 1 - tween(t, t0, t0 + 0.2, ease.out);
  const drift = Math.sin((t - t0) * 2.2) * 3;
  // into the wall: the card flies to its own cell as the wall opens
  const g = tween(t, XA, XA + 0.36, ease.inOut);
  const dst = cell(STYLES.length - 1);
  const x = mix(CARD.x, dst.x, g), y = mix(CARD.y + drift, dst.y, g), w = mix(CARD.w, GRID.tw, g), h = mix(CARD.h, GRID.th, g);
  const k = w / PW;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: mix(30, 14, g), overflow: "hidden", background: "#111", boxShadow: "0 30px 60px rgba(60,40,20,0.26), 0 8px 18px rgba(0,0,0,0.16)", transform: `scale(${1 + 0.04 * punch * (1 - g)})` }}>
        {/* the poster, scaled to the card and centred in it (the punch grows it from the card's centre) */}
        <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `translate(${w / 2}px, ${h / 2}px) scale(${k * (1 + 0.05 * punch * (1 - g))}) translate(${-PW / 2}px, ${-PH / 2}px)`, transformOrigin: "0 0" }}>
          <Live s={s} at={(s.from ?? 0) + (t - t0)} />
        </div>
      </div>
      {/* tag + progress under the card */}
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y + CARD.h + 24, width: CARD.w, opacity: 1 - tween(t, XA, XA + 0.12) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: F.inter }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.26em", color: C.inkSoft, transform: `translateY(${punch * 8}px)`, opacity: 1 - punch * 0.6 }}>{s.tag}</div>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.08em", color: C.inkSoft }}>
            <span style={{ color: C.orange }}>{String(active + 1).padStart(2, "0")}</span> / 20
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
          {STYLES.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < active ? C.inkSoft : i === active ? C.orange : C.faint, transform: i === active ? `scaleY(${1 + punch})` : undefined }} />
          ))}
        </div>
      </div>
    </>
  );
};

/** the wall: five columns of live posters marquee in alternate directions, then fly into the inbox on «بفرستم» */
const Wall: React.FC<{ t: number; ghost?: boolean }> = ({ t, ghost = false }) => {
  if (t < XA) return null;
  const last = STYLES.length - 1;
  const lc = cell(last);
  const dim = tween(t, XA + 0.45, XA + 0.75, ease.inOut);
  const tiles: React.ReactNode[] = [];
  for (let c = 0; c < GRID.cols; c++) {
    // the styles of this screen column, top to bottom
    const rows = [0, 1, 2, 3].map((r) => r * GRID.cols + (GRID.cols - 1 - c));
    const dir = c % 2 ? 1 : -1;
    const o = dir * Math.max(0, t - XA - 0.3) * 46;
    const shift = Math.floor(o / P_ROW), frac = o - shift * P_ROW;
    for (let k = -2; k <= 4; k++) {
      const r = (((k - shift) % 4) + 4) % 4;
      const i = rows[r];
      const s = STYLES[i];
      const home = cell(i);
      const x0 = GRID.x + c * (GRID.tw + GRID.gap);
      const y0 = GRID.y + k * P_ROW + frac;
      if (y0 < -P_ROW || y0 > H) continue;
      // pop-in from the flying card's cell outward (a style's wrap copy pops with it)
      const d = Math.hypot(home.x - lc.x, home.y - lc.y) / 1100;
      const pop = ghost ? 1 : i === last ? (t >= XA + 0.36 ? 1 : 0) : tween(t, XA + 0.04 + d * 0.26, XA + 0.26 + d * 0.26, (q) => ease.outBack(q, 1.5));
      if (pop <= 0.001) continue;
      // the fly into the inbox, staggered by distance to it
      const dd = Math.hypot(x0 + GRID.tw / 2 - DM.x, y0 + GRID.th / 2 - DM.y) / 1400;
      const f = ghost ? 0 : tween(t, FLY + dd * 0.25, FLY + 0.3 + dd * 0.25, ease.in);
      if (f >= 1) continue;
      const fx = mix(x0, DM.x - GRID.tw / 2, f), fy = mix(y0, DM.y - GRID.th / 2, f), fs = mix(1, 0.08, f);
      tiles.push(
        <div key={`${c}:${k}`} style={{ position: "absolute", left: fx, top: fy, width: GRID.tw, height: GRID.th, borderRadius: 14, overflow: "hidden", background: "#111", boxShadow: "0 12px 26px rgba(0,0,0,0.35)", transform: `scale(${pop * fs}) rotate(${f * (hash(i) - 0.5) * 40}deg)`, opacity: 1 - f * 0.3, filter: `brightness(${mix(1, 0.5, dim)}) blur(${3 * dim}px)` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `scale(${GRID.tw / PW})`, transformOrigin: "0 0" }}>
            <Live s={s} at={i === last ? (s.from ?? 0) + (XA + 0.36 - last * STEP) + (t - XA - 0.36) : (s.from ?? 0) + 0.35 + hash(i) * 0.3 + (t - XA)} />
          </div>
        </div>,
      );
    }
  }
  return <>{tiles}</>;
};

/** the comment line, built on the voice: A·R·T, «رو کامنت کن», the box types and sends, then «تا … بفرستم» */
const Cta: React.FC<{ t: number }> = ({ t }) => {
  if (t < XA) return null;
  const black = tween(t, XA, XA + 0.07, ease.out);
  const letters = ["A", "R", "T"]; // the comment keyword, one letter per spoken letter
  const line2 = ["رو", "کامنت", "کن"];
  const line3 = ["تا", "استایل‌های", "بیشتری", "برات", "بفرستم"];
  const sent = t >= cw(5);
  const sendK = tween(t, cw(5), cw(5) + 0.3, (x) => ease.outBack(x, 2.2));
  const boxIn = tween(t, XA + 0.26, XA + 0.5, (x) => ease.outBack(x, 1.3));
  const typed = letters.slice(0, letters.filter((_, k) => t >= cw(k)).length).join("");
  const caret = Math.floor(t * 2.4) % 2 === 0;
  const hit = tween(t, HIT, HIT + 0.3, (x) => ease.outBack(x, 2.4));
  const dmIn = tween(t, FLY + 0.1, FLY + 0.4, (x) => ease.outBack(x, 1.8));
  const shake = t >= HIT ? Math.sin((t - HIT) * 60) * 6 * Math.exp(-(t - HIT) * 10) : 0;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: black }} />
      <Wall t={t} />
      {t >= FLY ? <div style={{ position: "absolute", inset: 0, opacity: 0.14 * tween(t, FLY + 0.3, FLY + 0.7) }}><Wall t={t} ghost /></div> : null}
      {/* a dark band behind the type so it reads over the wall */}
      <div style={{ position: "absolute", left: 0, top: 560, width: W, height: 780, background: "linear-gradient(180deg, rgba(20,17,16,0) 0%, rgba(20,17,16,0.72) 18%, rgba(20,17,16,0.72) 82%, rgba(20,17,16,0) 100%)", opacity: tween(t, XA + 0.05, XA + 0.19) }} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${shake}px)` }}>
        {/* N · F · P, one letter per spoken letter */}
        <div style={{ position: "absolute", left: 0, top: 600, width: W, display: "flex", justifyContent: "center", gap: 6, fontFamily: F.inter, fontWeight: 900, fontSize: 220, lineHeight: 1, color: C.orange, letterSpacing: "-0.02em", textShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
          {letters.map((ch, k) => {
            const u = tween(t, cw(k) - 0.02, cw(k) + 0.18, (x) => ease.outBack(x, 2));
            return (
              <span key={k} style={{ display: "inline-block", opacity: t >= cw(k) - 0.02 ? 1 : 0, transform: `scale(${mix(1.6, 1, u)})`, filter: `blur(${(1 - clamp(u)) * 10}px)` }}>
                {ch}
              </span>
            );
          })}
        </div>
        {/* «رو کامنت کن», word by word */}
        <div dir="rtl" style={{ position: "absolute", left: 0, top: 846, width: W, display: "flex", justifyContent: "center", gap: 22, fontFamily: F.faH, fontSize: 96, lineHeight: 1.2, color: C.paper }}>
          {line2.map((w, k) => {
            const u = tween(t, cw(3 + k) - 0.03, cw(3 + k) + 0.2, ease.out);
            return (
              <span key={k} style={{ display: "inline-block", opacity: u, transform: `translateY(${(1 - u) * 34}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
        {/* the comment box: types on the letters, sends on «کن» */}
        <div style={{ position: "absolute", left: 170, top: 1040, width: 740, height: 104, borderRadius: 52, background: "#FFFFFF", boxShadow: "0 20px 44px rgba(0,0,0,0.4)", transform: `translateY(${(1 - boxIn) * 160}px) scale(${mix(0.8, 1, boxIn)})`, opacity: t >= XA + 0.26 ? 1 : 0 }}>
          <div style={{ position: "absolute", left: 14, top: 14, width: 76, height: 76, borderRadius: 38, background: sent ? C.orange : "#EFE7DE", transform: `scale(${1 + 0.22 * Math.sin(Math.PI * clamp(sendK)) * (sent ? 1 : 0)})` }}>
            <svg width={76} height={76} viewBox="0 0 76 76">
              <path d="M52 38 L26 26 L31 38 L26 50 Z" fill={sent ? "#fff" : "#B9AFA5"} transform="rotate(180 38 38)" />
            </svg>
          </div>
          <div style={{ position: "absolute", right: 40, top: 0, height: 104, display: "flex", alignItems: "center", gap: 6 }}>
            {sent ? (
              <>
                <span dir="rtl" style={{ fontFamily: F.fa, fontSize: 34, color: "#B9AFA5" }}>یه کامنت بنویس…</span>
                {caret ? <span style={{ width: 3, height: 42, background: C.ink, display: "inline-block" }} /> : <span style={{ width: 3 }} />}
              </>
            ) : (
              <>
                {caret ? <span style={{ width: 3, height: 46, background: C.ink, display: "inline-block" }} /> : <span style={{ width: 3 }} />}
                <span style={{ fontFamily: F.inter, fontWeight: 800, fontSize: 46, color: C.ink, letterSpacing: "0.04em" }}>{typed}</span>
              </>
            )}
          </div>
        </div>
        {/* posted */}
        {sent ? (
          <div style={{ position: "absolute", left: 0, top: 1166, width: W, display: "flex", justifyContent: "center", transform: `translateY(${(1 - sendK) * -60}px) scale(${mix(0.6, 1, sendK)})`, opacity: clamp(sendK * 2) * (1 - tween(t, FLY, FLY + 0.25)) }}>
            <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 28px 12px 18px", borderRadius: 40, background: "rgba(246,239,232,0.96)" }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg, ${C.orange}, #FFB36B)` }} />
              <span style={{ fontFamily: F.inter, fontWeight: 800, fontSize: 36, color: C.ink }}>ART</span>
              <span style={{ fontSize: 32, color: C.orange }}>♥</span>
            </div>
          </div>
        ) : null}
        {/* «تا استایل‌های بیشتری برات بفرستم» */}
        <div style={{ position: "absolute", left: 120, top: 1254, width: W - 240, height: 100, borderRadius: 50, background: "rgba(20,17,16,0.82)", opacity: tween(t, cw(6) - 0.05, cw(6) + 0.15) * (1 - tween(t, LINE3_OUT, LINE3_OUT + 0.2)) }} />
        <div dir="rtl" style={{ position: "absolute", left: 60, top: 1270, width: W - 120, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14, fontFamily: F.fa, fontSize: 52, lineHeight: 1.3, color: "rgba(246,239,232,0.96)" }}>
          {line3.map((w, k) => {
            const u = tween(t, cw(6 + k) - 0.03, cw(6 + k) + 0.16, ease.out);
            return (
              <span key={k} style={{ display: "inline-block", opacity: u * (1 - tween(t, LINE3_OUT, LINE3_OUT + 0.2)), transform: `translateY(${(1 - u) * 24}px)`, color: k === 4 ? "#FF8A4C" : undefined }}>
                {w}
              </span>
            );
          })}
        </div>
        {/* the inbox: the wall flies in, it pops on the music's last stab */}
        {t >= FLY ? (
          <div style={{ position: "absolute", left: DM.x - 70, top: DM.y - 70, width: 140, height: 140, borderRadius: 70, background: C.orange, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", transform: `scale(${dmIn * (1 + 0.18 * Math.sin(Math.PI * clamp(hit)))})` }}>
            <svg width={140} height={140} viewBox="0 0 140 140">
              <path d="M38 72 L102 44 L84 104 L68 82 Z M68 82 L102 44" fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            {t >= FLY + 0.12 ? (
              <div style={{ position: "absolute", right: -8, top: -8, minWidth: 54, height: 54, borderRadius: 27, background: C.paper, color: C.ink, fontFamily: F.inter, fontWeight: 900, fontSize: 28, lineHeight: "54px", textAlign: "center", transform: `scale(${t >= HIT ? 1 + 0.35 * Math.sin(Math.PI * clamp(hit)) : 0.9})`, boxShadow: "0 6px 14px rgba(0,0,0,0.35)" }}>
                {Math.max(1, Math.min(20, Math.round(mix(1, 20, tween(t, FLY + 0.12, HIT, ease.out)))))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
};

export const StyleIndexReel: React.FC<FilmProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useFonts();
  const t = times ? times[frame] ?? 0 : frame / FPS;
  const active = Math.min(STYLES.length - 1, Math.max(0, Math.floor(t / STEP)));
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {ok ? (
        <>
          <Paper t={t} />
          <Title t={t} />
          <List t={t} active={active} />
          <Cta t={t} />
          <Card t={t} active={active} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
