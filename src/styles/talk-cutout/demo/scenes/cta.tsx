// Talk Cutout demo · the CTA (TALK, take C): «اگه اسم این هوش مصنوعی و چک‌لیست کامل رو می‌خوای، کلمه‌ی «قدم» رو
// کامنت کن و دایرکتت رو چک کن».
//   BEHIND her: five AI marks arch over and beside her head from «اسم»; on «این هوش مصنوعی» the middle one — the one she
//   means, blurred — swells and asks «؟» (the answer is in the DM). «قدم» in the band above her head on «قدم».
//   IN FRONT: the comment sheet rises under her chin on «کلمه‌ی» (its bottom at y 1712, clear of the app's caption zone),
//   «قدم» types and posts on «کامنت»; it leaves before «دایرکتت»; the DM notice drops into the band; the thread grows out
//   of it on «چک» (late: her face stays visible through the sentence); the guide arrives; the end card lands on a
//   downbeat after her last word, and keeps moving (a push, a glow on the beat, «typing…»).
import React from "react";
import { C, F, GLASS, accentA } from "../../lib/theme";
import { clamp, ease, mix, pop, punch } from "../../lib/time";
import { HeadPill, MarkArch } from "../../lib/behind";
import { Icon, MysteryMark } from "../../lib/icons";
import { AiLogo } from "../../lib/ai-logos";
import { PH } from "../../lib/device";
import { Bubble, DmNotice, GuideCard, IgComments, Typing, type IgCm } from "../../lib/apps/instagram";
import { B, COMMENTS, COMMENT_WORD, DM_AT, GUIDE, T } from "../script";

const MINE: IgCm = { user: "you", text: COMMENT_WORD, ago: "now", hue: 20 };

export const CtaBehind: React.FC<{ t: number }> = ({ t }) => (
  <>
    <MarkArch
      t={t} a={T.esm - 0.04} b={T.kalame - 0.32} hotAt={T.in5} askAt={T.hoosh5 + 0.04} soloAt={T.checklist0 - 0.12}
      marks={[
        // the lower two tuck behind her shoulders, the middle one behind the top of her head: they sit BEHIND her
        { node: <AiLogo n="chatgpt" size={60} />, x: 252, y: 736, delay: 2 },
        { node: <AiLogo n="gemini" size={60} />, x: 250, y: 330, delay: 1 },
        { node: <MysteryMark size={64} hidden />, x: 540, y: 314, delay: 0, hot: true },
        { node: <AiLogo n="deepseek" size={60} />, x: 830, y: 330, delay: 1 },
        { node: <AiLogo n="grok" size={60} />, x: 828, y: 736, delay: 2 },
      ]}
    />
    <ChecklistTile t={t} a={T.checklist0 - 0.06} b={T.kalame - 0.32} />
    <HeadPill t={t} a={T.ghadam5 - 0.06} b={T.directet - 0.45} icon={<Icon n="chat" size={46} color={C.accent} sw={2.6} />}>
      {COMMENT_WORD}
    </HeadPill>
  </>
);

/** «… و چک‌لیست کامل رو می‌خوای»: a small checklist beside her face (in the space the plain marks just left) whose three
 *  steps tick one by one — the promise of the DM, shown before it is asked for */
const ChecklistTile: React.FC<{ t: number; a: number; b: number }> = ({ t, a, b }) => {
  if (t < a || t > b + 0.4) return null;
  const u = pop(t, a, 0.42);
  const o = ease.in(clamp((t - b) / 0.32));
  return (
    <div style={{ position: "absolute", left: 70, top: 420, width: 318, padding: "20px 24px 22px", borderRadius: 30, ...GLASS, border: `1.5px solid ${accentA(0.35)}`, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", direction: "rtl", boxSizing: "border-box", transformOrigin: "100% 0%", transform: `scale(${u * (1 - 0.15 * o)}) translateY(${-30 * o}px)`, opacity: clamp(u * 3) * (1 - o) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Icon n="list" size={36} color={C.accent} sw={2.6} />
        <span style={{ fontFamily: F.head, fontSize: 42, lineHeight: 1.1, color: C.cream, whiteSpace: "nowrap" }}>چک‌لیست کامل</span>
      </div>
      {[0, 1, 2].map((i) => {
        const k = ease.outBack(clamp((t - (a + 0.3 + i * 0.22)) / 0.3));
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2.5px solid ${k > 0.05 ? C.accent : "rgba(244,238,230,0.35)"}`, background: k > 0.05 ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              {k > 0.05 ? <Icon n="check" size={30} color={C.accentInk} sw={3.4} style={{ transform: `scale(${k})` }} /> : null}
            </div>
            <span style={{ fontFamily: F.vzB, fontSize: 32, color: C.cream, opacity: 0.55 + 0.45 * clamp(k), whiteSpace: "nowrap" }}>قدم {["اول", "دوم", "سوم"][i]}</span>
          </div>
        );
      })}
    </div>
  );
};

/** the comment sheet and the DM notification (in front of her, outside her camera) */
export const CtaFront: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.kalame - 0.3) return null;
  // it leaves right after the post, before the next caption chunk comes back down to y 1478
  const up = ease.out(clamp((t - (T.kalame - 0.05)) / 0.45)) * (1 - ease.in(clamp((t - (T.comment + 0.37)) / 0.25)));
  const typed = t >= T.ghadam5 ? COMMENT_WORD.slice(0, Math.max(1, Math.min(COMMENT_WORD.length, Math.floor((t - T.ghadam5) / 0.11) + 1))) : "";
  const send = clamp((t - (T.comment - 0.05)) / 0.25), posted = clamp((t - (T.comment + 0.12)) / 0.4);
  const heart = clamp((t - (T.comment + 0.18)) / 0.2);
  const dmAt = T.directet + 0.05;
  const dmU = t < dmAt - 0.1 || t >= DM_AT - 0.12 ? 0 : ease.outBack(clamp((t - (dmAt - 0.1)) / 0.45));
  const sc = 1080 / PH.w;
  const SH = 236; // the sheet (pt): bottom at y 1712, top under her chin
  return (
    <>
      {up > 0 ? (
        <div style={{ position: "absolute", left: 0, top: mix(1920, 1712 - SH * sc, up), width: PH.w, height: SH, transform: `scale(${sc})`, transformOrigin: "0 0", filter: "drop-shadow(0 -20px 60px rgba(0,0,0,0.5))" }}>
          <IgComments comments={COMMENTS} typed={send > 0.6 ? "" : typed} caret={t >= T.kalame && send < 0.6 && Math.floor(t * 2.4) % 2 === 0} send={send} posted={posted} mine={MINE} heart={heart} hi={clamp((t - T.kalame) / 0.3) * (1 - send)} h={SH} />
        </div>
      ) : null}
      {dmU > 0 ? (
        <DmNotice style={{ position: "absolute", left: 60, right: 60, top: 250 + (1 - clamp(dmU)) * -260, height: 150, borderRadius: 38, background: "rgba(28,31,36,0.94)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", transform: `scale(${0.9 + 0.1 * dmU})` }} />
      ) : null}
    </>
  );
};

/** the DM thread grows out of the notification's own box into the full panel; the guide arrives */
export const DmThread: React.FC<{ t: number }> = ({ t }) => {
  if (t < DM_AT - 0.12) return null;
  const u = ease.inOut(clamp((t - (DM_AT - 0.12)) / 0.42));
  const inner = clamp((t - (DM_AT + 0.12)) / 0.2);
  const notice = 1 - clamp((t - (DM_AT - 0.04)) / 0.16);
  const glow = clamp((t - (T.endHit - 0.05)) / 0.25) * (1 - 0.5 * clamp((t - T.endHit - 0.5) / 0.8));
  // the thread grows with its messages (never a tall, half-empty panel): 330 → 880 as the bubbles and the guide land
  const fill = ease.inOut(clamp((t - (DM_AT + 0.1)) / 1.2));
  const push = (1 + 0.035 * ease.inOut(clamp((t - DM_AT) / 3.2))) * (1 + 0.02 * punch(t, T.endHit, 5));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "540px 760px" }}>
      <div style={{ position: "absolute", left: mix(60, 40, u), right: mix(60, 40, u), top: mix(250, 290, u), height: mix(150, mix(330, 880, fill), u), borderRadius: mix(38, 46, u), background: "rgba(12,16,20,0.96)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 120px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        {notice > 0 ? <DmNotice style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, opacity: notice }} /> : null}
        <div style={{ opacity: inner }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "28px 36px", borderBottom: "1px solid rgba(255,255,255,0.08)", direction: "ltr" }}>
            <Icon n="back" size={34} color="#f5f5f5" />
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)", padding: 3, boxSizing: "border-box" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#3a2a1e", border: "3px solid #0c1014", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: F.vzB, fontSize: 36, color: "#f5f5f5", direction: "rtl" }}>دایرکت</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "32px 32px" }}>
            <Bubble t={t} at={DM_AT + 0.18}>سلام 👋 خوش اومدی!</Bubble>
            <Bubble t={t} at={DM_AT + 0.42}>اینم چک‌لیست کامل، قدم‌به‌قدم 👇</Bubble>
            <GuideCard t={t} at={DM_AT + 0.7} title={GUIDE.title} items={GUIDE.items} glow={glow} />
            <Typing t={t} at={T.endHit + 0.55} />
          </div>
        </div>
      </div>
      <EndCta t={t} />
    </div>
  );
};

/** the last hit (a downbeat after her last word): the ask once more, under the thread; the glow breathes on the beat */
const EndCta: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.endHit - 0.06) return null;
  const u = pop(t, T.endHit - 0.06, 0.42);
  const glow = 0.5 + 0.5 * Math.max(Math.exp(-Math.max(0, t - T.endHit) * 2.5), 0.6 * B.beatPulse(t, 5));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1230, display: "flex", justifyContent: "center", transform: `scale(${u})`, opacity: clamp(u * 2) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 40px", borderRadius: 999, background: C.accent, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 ${60 * glow}px rgba(255,106,31,${0.55 * glow})`, direction: "rtl" }}>
        <Icon n="chat" size={46} color={C.accentInk} sw={2.6} />
        <span style={{ fontFamily: F.head, fontSize: 54, color: C.accentInk, whiteSpace: "nowrap" }}>کلمه‌ی «{COMMENT_WORD}» رو کامنت کن</span>
      </div>
    </div>
  );
};
