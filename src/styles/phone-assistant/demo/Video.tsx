// Phone Assistant · demo film. Copy this file + script.ts to src/vNN/, change the imports to
// ../styles/phone-assistant/lib/…, then swap the lines, the call transcript, the SMS, the tasks and the call to action.
// One phone carries the story (the call, the SMS); cards take over when the story leaves the phone.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Headline } from "../lib/caption";
import { usePhoneFonts } from "../lib/fonts";
import { Calendar, CommentBar, PostedComment, Tasks, type Task } from "../lib/props";
import { CallScreen, SmsScreen, type Line } from "../lib/screens";
import { Orb, Phone } from "../lib/ui";
import { C, FPS, MONO, TimeCtx, accentA, clamp, easeOut, kick, ramp } from "../lib/theme";
import { CHUNKS, DUR, SC, TL } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;

/** a scene window: rises in, falls away (no empty frame between scenes) */
const Sc: React.FC<{ t: number; a: number; b: number; children: React.ReactNode }> = ({ t, a, b, children }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const i = a <= 0 ? 1 : easeOut(ramp(t, a - 0.02, a + 0.45));
  const o = ramp(t, b - 0.28, b + 0.02);
  return <AbsoluteFill style={{ opacity: clamp(i * 1.4) * (1 - o), transform: `translateY(${(1 - i) * 90}px) scale(${0.96 + 0.04 * i + o * 0.05})`, filter: i < 1 || o > 0 ? `blur(${(1 - i) * 10 + o * 10}px)` : undefined }}>{children}</AbsoluteFill>;
};

const Stage: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 40% at 88% 0%, ${accentA(0.12)}, rgba(0,0,0,0) 70%), radial-gradient(ellipse 70% 30% at 50% 96%, ${accentA(0.08)}, rgba(0,0,0,0) 70%), ${C.ink}` }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(242,241,245,.05) 1.4px, transparent 1.6px)", backgroundSize: "42px 42px", backgroundPosition: `0 ${(-t * 10) % 42}px` }} />
  </AbsoluteFill>
);

// ── 1–2 · the 2 a.m. call, answered by the assistant ─────────────────────────────────────────────────────────
const LINES: Line[] = [
  { at: SC.answer + 0.1, text: "سلام! کلینیک لبخند، چطور کمکتون کنم؟" },
  { at: SC.understand - 0.2, me: true, text: "دندونم خیلی درد می‌کنه…" },
  { at: SC.book - 0.1, text: "فردا ساعت ۹:۳۰ وقت خالی داریم. رزرو کنم؟" },
  { at: SC.book + 1.0, me: true, text: "آره، ممنون." },
];
const Call: React.FC<{ t: number }> = ({ t }) => {
  const night = 1 - ramp(t, SC.answer - 0.2, SC.answer + 0.2);
  return (
    <>
      <Headline k={ramp(t, -0.2, 0.3)} out={1 - night} y={120} size={86} sub="کلینیک بسته‌ست">
        <span style={{ fontFamily: MONO, direction: "ltr", display: "inline-block" }}>02:04</span> بامداد
      </Headline>
      <Headline k={ramp(t, SC.answer - 0.1, SC.answer + 0.4)} y={150} size={64}>دستیار جواب می‌ده</Headline>
      <Phone x={540} y={880} s={1.25} rz={Math.sin(t * 0.7) * 0.6} glow={0.8}>
        <CallScreen t={t} ringAt={SC.ring} connectAt={SC.answer} name="کلینیک لبخند" sub="دستیار هوشمند" who="ai" lines={LINES} keep={3} endAt={S(2) - 0.05} clock="2:04" />
      </Phone>
    </>
  );
};

// ── 3 · the confirmation SMS ──────────────────────────────────────────────────────────────────────────────────
const Sms: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Headline k={ramp(t, SC.sms, SC.sms + 0.4)} y={150} size={64}>تأیید با پیامک</Headline>
    <Phone x={540} y={880} s={1.25} rz={Math.sin(t * 0.7) * 0.6} glow={0.8}>
      <SmsScreen t={t} offline={0} typeFrom={SC.sms + 0.15} typeTo={SC.sms + 0.9} ask="نوبتم ثبت شد؟" sendAt={SC.sms + 1.0} dotsAt={SC.sms + 1.15} replyAt={SC.smsW + 0.25} reply="بله! پنجشنبه ساعت ۹:۳۰ منتظرتون هستیم." name="کلینیک لبخند" card={{ icon: "globe", title: "کلینیک لبخند", sub: "خیابان بهار، پلاک ۱۲" }} clock="2:06" />
    </Phone>
  </>
);

// ── 4 · the morning: everything sorted ────────────────────────────────────────────────────────────────────────
const Morning: React.FC<{ t: number }> = ({ t }) => {
  const a = SC.morning;
  const tasks: Task[] = [
    { text: "تماس ۰۲:۰۴ · دندون‌درد", icon: "phone", at: a + 0.3, done: SC.calls + 0.1, sub: "جواب داده شد" },
    { text: "نوبت پنجشنبه ۹:۳۰", icon: "calendar", at: a + 0.5, done: SC.calls + 0.35, sub: "ثبت شد" },
    { text: "پیامک تأیید", icon: "msg", at: a + 0.7, done: SC.calls + 0.6, sub: "فرستاده شد" },
    { text: "۳ تماس دیگه", icon: "phone", at: a + 0.9, done: SC.list - 0.1, sub: "همه جواب گرفتن" },
  ];
  return (
    <>
      <Tasks t={t} tasks={tasks} x={90} y={290} w={900} k={ramp(t, a, a + 0.5)} rowH={110} size={34} title="امروز صبح" />
      <Calendar t={t} k={ramp(t, a + 0.6, a + 1.1)} lockAt={SC.list} x={130} y={900} day="پنجشنبه" pending="نوبت تازه" locked="نوبت · دندون‌درد" time="۹:۳۰" events={[[0, "جرم‌گیری · خانم رضایی"], [3, "عصب‌کشی · آقای کریمی"]]} />
    </>
  );
};

// ── 5 · never tired ───────────────────────────────────────────────────────────────────────────────────────────
const Never: React.FC<{ t: number }> = ({ t }) => (
  <>
    <div style={{ position: "absolute", left: 540 - 210, top: 520, width: 420, height: 420 }}>
      <Orb size={420} t={t} k={ramp(t, SC.never - 0.1, SC.never + 0.5)} />
    </div>
    <Headline k={ramp(t, SC.never + 0.2, SC.never + 0.7)} y={1080} size={92} sub="۲۴ ساعته · ۷ روز هفته">
      هیچ‌وقت خسته نمی‌شه
    </Headline>
    <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", gap: 18, opacity: easeOut(ramp(t, SC.tired - 0.1, SC.tired + 0.3)) }}>
      {["24", "7"].map((n, i) => (
        <div key={n} style={{ padding: "14px 34px", borderRadius: 999, background: C.card, boxShadow: `inset 0 0 0 1.5px ${C.line2}, 0 0 ${30 * kick(t, SC.tired, 0.6)}px ${accentA(0.5)}`, fontFamily: MONO, fontWeight: 700, fontSize: 56, color: i ? C.fg : C.accent, direction: "ltr" }}>{n}{i ? " days" : " h"}</div>
      ))}
    </div>
  </>
);

// ── 6 · the comment call ──────────────────────────────────────────────────────────────────────────────────────
const Cta: React.FC<{ t: number }> = ({ t }) => {
  const send = SC.comment + 0.25;
  return (
    <>
      <Headline k={ramp(t, SC.cta, SC.cta + 0.4)} y={300} size={80} sub="تا دستیار برات توضیح بده">
        کامنت کن: «منشی»
      </Headline>
      <PostedComment t={t} x={130} y={760} at={send + 0.1} text="منشی" />
      <CommentBar t={t} x={90} y={900} w={900} k={ramp(t, SC.cta + 0.2, SC.cta + 0.6)} typeAt={SC.word} sendAt={send} text="منشی" />
    </>
  );
};

export const PhoneAssistantAt: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
    <Stage t={t} />
    <Sc t={t} a={0} b={SC.sms}><Call t={t} /></Sc>
    <Sc t={t} a={SC.sms} b={SC.morning}><Sms t={t} /></Sc>
    <Sc t={t} a={SC.morning} b={SC.never}><Morning t={t} /></Sc>
    <Sc t={t} a={SC.never} b={SC.cta}><Never t={t} /></Sc>
    <Sc t={t} a={SC.cta} b={DUR + 1}><Cta t={t} /></Sc>
    <Caption t={t} chunks={CHUNKS} />
  </AbsoluteFill>
);

export const PhoneAssistantDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = usePhoneFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.ink }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <PhoneAssistantAt t={t} />
    </TimeCtx.Provider>
  );
};
void E;
