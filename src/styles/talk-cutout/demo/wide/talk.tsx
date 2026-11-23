// Talk Cutout · landscape: everything beside her (in the two columns, BEHIND her cut-out) and the end card.
//   hook: ONE value card in the left column whose label and number change on «هر روز / هر هفته / هر ماه» (never two
//   cards in a column), «3 قدم» slams into the right column on «سه تا قدم» with a small tape split.
//   between the full-screen windows: «قدم 3» right, her idea as a card left («ایده‌ی خودت»).
//   CTA: the AI row with the blurred one («کدوم؟») left → the checklist right → the comment right → the DM left.
import React from "react";
import { C, F, accentA } from "../../lib/theme";
import { clamp, ease, mix, pop, punch } from "../../lib/time";
import { Big, Glass, LX, Osd, RX, Stamp, enter } from "../../lib/wide";
import { Icon, MysteryMark, YouTubeMark } from "../../lib/icons";
import { AiLogo } from "../../lib/ai-logos";
import { type Pose } from "../../lib/talk";
import { B, COMMENT_WORD, DM_AT, GUIDE, HOOK_ROWS, IDEA, K, T } from "../script";
import { END_CARD, FSW } from "./cues";

/** the placeholder subject (centred, a little lower than in the vertical frame) */
export const poseWide = (t: number): Pose => ({ x: 960, y: 430, s: 0.94, tilt: 1 + 1.2 * Math.sin(t * 0.4), hand: null, talk: K.speaking(t) });

const Card: React.FC<{ t: number; a: number; b: number; side: -1 | 1; y: number; w: number; h: number; hot?: number; children: React.ReactNode }> = ({ t, a, b, side, y, w, h, hot = 0, children }) => {
  const e = enter(t, a, b, side);
  if (e.on <= 0) return null;
  const x = side < 0 ? LX - w / 2 : RX - w / 2;
  return (
    <div style={{ position: "absolute", left: side < 0 ? x : undefined, right: side > 0 ? 1920 - (x + w) : undefined, top: y, ...e.style }}>
      <Glass w={w} h={h} hot={hot}>
        {children}
      </Glass>
    </div>
  );
};

/** the hook's value card: one card, its label and number change per word (rolling from ~93 %, never from zero) */
const ValueCard: React.FC<{ t: number }> = ({ t }) => {
  const a = -0.5, b = T.steps - 0.3;
  let k = 0;
  for (let i = 0; i < HOOK_ROWS.length; i++) if (t >= HOOK_ROWS[i].at) k = i;
  const r = HOOK_ROWS[k];
  const roll = ease.out(clamp((t - r.at) / 0.3));
  const v = mix(r.from, r.to, roll);
  const swap = k > 0 ? clamp((t - r.at) / 0.18) : 1;
  const hot = k > 0 ? clamp(1 - (t - r.at - 0.1) / 0.6) : 0;
  return (
    <Card t={t} a={a} b={b} side={-1} y={300} w={560} h={300} hot={hot}>
      <div style={{ position: "absolute", left: 28, right: 28, top: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Osd size={32} color={C.dim}>VIEWS · SAMPLE</Osd>
        <YouTubeMark size={40} />
      </div>
      <div style={{ position: "absolute", right: 34, top: 78, fontFamily: F.head, fontSize: 66, lineHeight: 1, color: C.cream, direction: "rtl", opacity: swap, transform: `translateY(${(1 - swap) * 14}px)` }}>{r.label}</div>
      <div style={{ position: "absolute", left: 30, right: 34, top: 160, display: "flex", alignItems: "baseline", gap: 16, direction: "rtl" }}>
        <span style={{ direction: "ltr", unicodeBidi: "isolate", fontFamily: F.ui, fontWeight: 900, fontSize: 96, lineHeight: 1, letterSpacing: -3, color: C.accent, transform: `scale(${1 + 0.08 * punch(t, r.at + 0.05, 6)})`, display: "inline-block" }}>{`${r.prefix}${r.dec ? v.toFixed(r.dec) : Math.round(v)}${r.suffix}`}</span>
        <span style={{ fontFamily: F.head, fontSize: 40, color: C.dim }}>{r.unit}</span>
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 22, height: 6, borderRadius: 3, background: "rgba(244,238,230,0.1)" }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${(r.share ?? 0) * 100 * roll}%`, borderRadius: 3, background: C.accent, boxShadow: `0 0 10px ${accentA(0.6)}` }} />
      </div>
    </Card>
  );
};

/** her idea, between the full-screen windows («ایده‌ی خودت رو») */
const IdeaCard: React.FC<{ t: number }> = ({ t }) => (
  <Card t={t} a={T.ide - 0.06} b={FSW[1][0] - 0.3} side={-1} y={360} w={540} h={200}>
    <div style={{ position: "absolute", left: 28, top: 24 }}>
      <Osd size={30} color={C.dim}>IDEA · 001</Osd>
    </div>
    <div style={{ position: "absolute", right: 30, top: 84, display: "flex", alignItems: "center", gap: 18, direction: "rtl" }}>
      <Icon n="bulb" size={56} color={C.accent} sw={2.2} />
      <span style={{ fontFamily: F.head, fontSize: 52, color: C.cream, whiteSpace: "nowrap" }}>{IDEA}</span>
    </div>
  </Card>
);

/** the AI row: four marks and the one she means, blurred, asking «؟» */
const AiRow: React.FC<{ t: number }> = ({ t }) => {
  const q = pop(t, T.hoosh5 + 0.04, 0.4);
  const hot = ease.out(clamp((t - (T.in5 - 0.06)) / 0.3));
  const marks: React.ReactNode[] = [<AiLogo key="a" n="chatgpt" size={54} />, <AiLogo key="b" n="gemini" size={54} />, <MysteryMark key="c" size={58} hidden />, <AiLogo key="d" n="deepseek" size={54} />];
  return (
    <Card t={t} a={T.esm - 0.06} b={T.checklist0 - 0.25} side={-1} y={330} w={560} h={240} hot={hot}>
      <div style={{ position: "absolute", left: 28, right: 28, top: 22, display: "flex", justifyContent: "space-between" }}>
        <Osd size={30} color={C.dim}>WHICH AI?</Osd>
        <span style={{ fontFamily: F.head, fontSize: 36, color: C.cream, direction: "rtl" }}>کدوم؟</span>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 96, display: "flex", justifyContent: "space-between", direction: "ltr" }}>
        {marks.map((m, i) => (
          <div key={i} style={{ position: "relative", width: 104, height: 104, borderRadius: 28, background: "rgba(255,255,255,0.05)", border: `1.5px solid ${i === 2 ? accentA(0.2 + 0.7 * hot) : "rgba(244,238,230,0.14)"}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(t, T.esm + i * 0.08, 0.4) * (i === 2 ? 1 + 0.12 * hot : 1)})` }}>
            {m}
            {i === 2 && q > 0 ? <div style={{ position: "absolute", right: -14, top: -14, width: 42, height: 42, borderRadius: 21, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 28, color: C.accentInk, transform: `scale(${q})` }}>?</div> : null}
          </div>
        ))}
      </div>
    </Card>
  );
};

/** the checklist she promises («چک‌لیست کامل») */
const Checklist: React.FC<{ t: number }> = ({ t }) => (
  <Card t={t} a={T.checklist0 - 0.06} b={T.kalame - 0.3} side={1} y={300} w={560} h={300}>
    <div style={{ position: "absolute", left: 28, right: 28, top: 22, display: "flex", justifyContent: "space-between" }}>
      <Osd size={30} color={C.dim}>CHECKLIST</Osd>
      <span style={{ fontFamily: F.head, fontSize: 36, color: C.cream, direction: "rtl" }}>{GUIDE.title}</span>
    </div>
    {GUIDE.items.map((s, i) => {
      const k = ease.out(clamp((t - (T.checklist0 + 0.1 + i * 0.16)) / 0.3));
      return (
        <div key={i} style={{ position: "absolute", right: 26, left: 26, top: 92 + i * 66, display: "flex", alignItems: "center", gap: 14, direction: "rtl", opacity: k, transform: `translateX(${(1 - k) * 24}px)` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 22, color: C.accentInk, flex: "none" }}>{i + 1}</div>
          <span style={{ fontFamily: F.vzB, fontSize: 25, color: C.cream, whiteSpace: "nowrap" }}>{s}</span>
        </div>
      );
    })}
  </Card>
);

/** the comment («قدم» types, posts, gets a like) */
const CommentCard: React.FC<{ t: number }> = ({ t }) => {
  const typed = t >= T.ghadam5 ? COMMENT_WORD.slice(0, Math.max(1, Math.min(COMMENT_WORD.length, Math.floor((t - T.ghadam5) / 0.11) + 1))) : "";
  const sent = t >= T.comment;
  const heart = clamp((t - (T.comment + 0.3)) / 0.25);
  return (
    <Card t={t} a={T.kalame - 0.06} b={T.directet - 0.2} side={1} y={340} w={560} h={220} hot={sent ? clamp(1 - (t - T.comment - 0.1) / 0.6) : 0}>
      <div style={{ position: "absolute", left: 28, top: 22 }}>
        <Osd size={30} color={C.dim}>COMMENT</Osd>
      </div>
      <div style={{ position: "absolute", left: 26, right: 26, top: 86, height: 96, borderRadius: 48, background: "rgba(255,255,255,0.06)", border: `1.5px solid ${sent ? "rgba(244,238,230,0.14)" : accentA(0.7)}`, display: "flex", alignItems: "center", gap: 18, padding: "0 16px", direction: "ltr", boxSizing: "border-box" }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #a33a0c)`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon n="user" size={34} color="#fff" sw={2.2} />
        </div>
        <span style={{ flex: 1, fontFamily: F.head, fontSize: 52, color: C.cream, direction: "rtl", textAlign: "left" }}>{typed}</span>
        {sent ? (
          <svg width={44} height={44} viewBox="0 0 24 24" style={{ transform: `scale(${1 + 0.4 * Math.sin(Math.PI * heart)})` }}>
            <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill={heart > 0.5 ? "#ff3040" : "none"} stroke={heart > 0.5 ? "#ff3040" : C.dim} strokeWidth={2} />
          </svg>
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.igBlue, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.18 * Math.sin(Math.PI * clamp((t - (T.comment - 0.12)) / 0.2))})` }}>
            <Icon n="up" size={30} color="#fff" sw={2.6} />
          </div>
        )}
      </div>
    </Card>
  );
};

/** the DM («دایرکتت رو چک کن») */
const DmCard: React.FC<{ t: number }> = ({ t }) => (
  <Card t={t} a={T.directet - 0.04} b={END_CARD - 0.2} side={-1} y={320} w={560} h={300}>
    <div style={{ position: "absolute", left: 28, right: 28, top: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Osd size={30} color={C.dim}>DIRECT · NEW</Osd>
      <div style={{ width: 16, height: 16, borderRadius: 8, background: C.accent, boxShadow: `0 0 14px ${C.accent}`, opacity: 0.5 + 0.5 * Math.sin(t * 8) }} />
    </div>
    {[
      { at: T.directet + 0.15, text: "سلام 👋 خوش اومدی!" },
      { at: DM_AT + 0.1, text: "اینم چک‌لیست کامل 👇" },
    ].map((m, i) => {
      const u = t < m.at ? 0 : ease.outBack(clamp((t - m.at) / 0.4));
      return (
        <div key={i} style={{ position: "absolute", right: 26, top: 92 + i * 92, maxWidth: 480, padding: "14px 24px", borderRadius: 28, background: "#262a2f", fontFamily: F.vz, fontSize: 30, color: "#f5f5f5", direction: "rtl", whiteSpace: "nowrap", opacity: clamp(u * 2), transform: `translateY(${(1 - clamp(u)) * 20}px) scale(${mix(0.9, 1, clamp(u))})`, transformOrigin: "100% 100%" }}>{m.text}</div>
      );
    })}
  </Card>
);

export const WideBehind: React.FC<{ t: number }> = ({ t }) => (
  <>
    <ValueCard t={t} />
    <Big t={t} a={T.se - 0.04} b={T.steps - 0.25} x={RX} y={480} size={190} color={C.cream} glitch>
      <span style={{ fontFamily: F.ui, fontWeight: 900, color: C.accent }}>3</span> قدم
    </Big>
    <Big t={t} a={T.step3 - 0.02} b={FSW[1][0] - 0.3} x={RX} y={470} size={170} glitch>
      قدم <span style={{ fontFamily: F.ui, fontWeight: 900, color: C.accent }}>3</span>
    </Big>
    <IdeaCard t={t} />
    <AiRow t={t} />
    <Checklist t={t} />
    <CommentCard t={t} />
    <DmCard t={t} />
  </>
);

/** the end card (on the downbeat after her last word): the ask, a cursor that presses it, «typing…» — never static */
export const EndCardWide: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_CARD) return null;
  const u = pop(t, END_CARD, 0.45);
  const press = clamp((t - (END_CARD + 0.9)) / 0.25);
  const cx = mix(1500, 1180, ease.inOut(clamp((t - END_CARD - 0.3) / 0.6))), cy = mix(900, 640, ease.inOut(clamp((t - END_CARD - 0.3) / 0.6)));
  const glow = 0.5 + 0.5 * Math.max(Math.exp(-Math.max(0, t - END_CARD) * 2.5), 0.6 * B.beatPulse(t, 5));
  const zoom = 1 + 0.03 * ease.inOut(clamp((t - END_CARD) / 2));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})` }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,4,3,0.55)", opacity: clamp(u * 2) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", transform: `scale(${u * (1 - 0.05 * Math.sin(Math.PI * press))})`, opacity: clamp(u * 2) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 54px", borderRadius: 999, background: C.accent, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 ${70 * glow}px ${accentA(0.55 * glow)}`, direction: "rtl" }}>
          <Icon n="chat" size={58} color={C.accentInk} sw={2.6} />
          <span style={{ fontFamily: F.head, fontSize: 68, color: C.accentInk, whiteSpace: "nowrap" }}>کلمه‌ی «{COMMENT_WORD}» رو کامنت کن</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", opacity: clamp((t - END_CARD - 0.5) / 0.3) }}>
        <Stamp t={t} a={END_CARD + 0.5} size={44} rot={-4} color={C.cream}>
          چک‌لیست در دایرکت
        </Stamp>
      </div>
      {/* the pointer that presses the ask */}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: cx, top: cy, opacity: clamp((t - END_CARD - 0.2) / 0.2), transform: `scale(${1 - 0.15 * Math.sin(Math.PI * press)})` }}>
        <path d="M5 3l14 8-6 1.6 3.6 6.2-2.4 1.4-3.6-6.2L6 18z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
