// Noir Studio · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/noir-studio/lib/…,
// then swap the lines, the app data (channel, profile, prompt, reply, comments) and the beats in SC.
// Layers, back to front: backdrop (one colour of light per section) → the section (device + app + lifts) →
// buddies (one 3D layer, whole film) → captions.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../lib/backdrop";
import { Buddies } from "../lib/buddy";
import { PH, Phone, StatusBar, TB, Tablet } from "../lib/device";
import { AiChat, CommentSheet, IgProfile, Thumb, YT_ROW_Y, YtChannel, type YtVideo } from "../lib/apps";
import { Captions, Lift, Scrim, Tag } from "../lib/kit";
import { Icon } from "../lib/logos";
import { useStudioFonts } from "../lib/fonts";
import { C, F, FPS, SD, TimeCtx, clamp, ease, fmtK, kf, mix, pop, ramp } from "../lib/theme";
import { CAPS, CAST, DUR, PLATES, SC, SEC, WORDS } from "./script";

export type DemoProps = { times?: number[] };

/** a section of the film: enters from below with a short blur (except the very first), leaves upward */
const Sec: React.FC<{ t: number; a: number; b: number; children: React.ReactNode }> = ({ t, a, b, children }) => {
  if (t < a - 0.01 || t > b + 0.01) return null;
  const i = a <= 0.01 ? 1 : ease.out(clamp((t - a) / 0.32));
  const o = b >= DUR ? 0 : ease.in(clamp((t - (b - 0.26)) / 0.26));
  const blur = (1 - i) * 12 + o * 12;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, i * 1.6) * (1 - o), transform: `translateY(${(1 - i) * 160 - o * 140}px)`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/** the screen under a lifted number: blurred and darker, so the number never sits on readable UI */
const Under: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => (
  <AbsoluteFill style={{ filter: k > 0.01 ? `blur(${7 * k}px) brightness(${1 - 0.35 * k})` : undefined }}>{children}</AbsoluteFill>
);

/** where a point (px, py) of a phone screen lands in the frame (phone centre cx, cy, scale s) */
const onPhone = (cx: number, cy: number, s: number, px: number, py: number) => ({ x: cx + (px - PH.w / 2) * s, y: cy + (py - PH.h / 2) * s });

// ── 1 · hook: the channel page, «12 videos», the views lift off ─────────────────────────────────────────────
const VIDEOS: YtVideo[] = [
  { title: "پاستا در ۶۰ ثانیه", views: 38200, age: "2 weeks ago", hue: 14, dur: "0:58" },
  { title: "صبحونه‌ی پنج دقیقه‌ای", views: 24600, age: "3 weeks ago", hue: 38, dur: "0:47" },
  { title: "سس سیر بدون همزن", views: 17900, age: "1 month ago", hue: 352, dur: "0:55" },
  { title: "کیک لیوانی", views: 12400, age: "1 month ago", hue: 205, dur: "0:39" },
];
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const cx = 540, cy = 820, s = 1.34 * (1 + 0.05 * (1 - ease.out(clamp(t / 0.8))));
  const scroll = kf(t, [[SC.twelve - 0.2, 0], [SC.views - 0.35, 120]]);
  const row = onPhone(cx, cy, 1.34, 70, YT_ROW_Y(0) + 241 - 120);
  const chip = pop(t, SC.twelve - 0.05);
  return (
    <>
      <Under k={ramp(t, SC.views + 0.1, SC.views + 0.5) * (1 - ramp(t, SEC.plan - 0.35, SEC.plan - 0.1))}>
        <Phone x={cx} y={cy} s={s} glow={C.yt} glowA={0.35}>
          <YtChannel name="Your Channel" handle="@yourchannel" subs={3400} count={12} videos={VIDEOS} scroll={scroll} hi={0} hiA={ramp(t, SC.views - 0.3, SC.views)} />
          <StatusBar />
        </Phone>
      </Under>
      {chip > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 118, display: "flex", justifyContent: "center", transform: `scale(${chip})`, transformOrigin: "50% 50%", opacity: clamp(chip) * (1 - ramp(t, SC.views - 0.2, SC.views + 0.1)) }}>
          <Tag style={{ fontSize: 34 }}>
            <Icon n="film" size={30} color={C.accent2} /> 12 videos
          </Tag>
        </div>
      ) : null}
      <Scrim a={ramp(t, SC.views, SC.views + 0.4) * (1 - ramp(t, SEC.plan - 0.35, SEC.plan - 0.1))} />
      <Lift t={t} a={SC.views} b={SEC.plan - 0.35} from={{ x: row.x - 70, y: row.y - 12, w: 140, h: 24 }} tx={540} ty={640} size={240} value={(u) => fmtK(mix(38200, 100000, u))} label={<span style={{ fontFamily: F.faB, fontSize: 46, color: C.dim, direction: "rtl" }}>بازدید · جمع ۱۲ ویدیو</span>} />
    </>
  );
};

// ── 2 · no camera, no studio — an idea and a weekly plan ────────────────────────────────────────────────────
const Crossed: React.FC<{ t: number; a: number; b: number; y: number; icon: string; word: string }> = ({ t, a, b, y, icon, word }) => {
  const k = pop(t, a), leave = ease.in(clamp((t - b) / 0.25));
  if (k <= 0) return null;
  const strike = ease.out(clamp((t - a - 0.25) / 0.25));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - 110, height: 220, display: "flex", alignItems: "center", justifyContent: "center", gap: 44, direction: "rtl", opacity: clamp(k) * (1 - leave), transform: `translateY(${-leave * 60}px) scale(${0.85 + 0.15 * k})` }}>
      <span style={{ fontFamily: F.head, fontSize: 150, lineHeight: 1, color: C.cream, textShadow: SD }}>{word}</span>
      <div style={{ position: "relative", width: 190, height: 190, borderRadius: 44, background: "rgba(20,22,26,0.78)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
        <Icon n={icon} size={104} color={C.dim} sw={1.6} />
        <div style={{ position: "absolute", left: 22, top: 92, width: 146 * strike, height: 8, borderRadius: 4, background: C.accent, transform: "rotate(-38deg)", transformOrigin: "100% 50%" }} />
      </div>
    </div>
  );
};
const Plan: React.FC<{ t: number }> = ({ t }) => {
  const out = SC.idea - 0.35;
  const cardA = pop(t, SC.idea - 0.05), cardB = pop(t, SC.plan - 0.05);
  return (
    <>
      <Crossed t={t} a={SC.noCam} b={out} y={560} icon="film" word="نه دوربین" />
      <Crossed t={t} a={SC.noStudio} b={out} y={830} icon="mic" word="نه استودیو" />
      {cardA > 0 ? (
        <div style={{ position: "absolute", left: 150, top: 420, width: 780, height: 210, borderRadius: 36, background: "rgba(18,20,24,0.82)", border: `1px solid ${C.line2}`, boxShadow: "0 40px 80px rgba(0,0,0,0.55)", display: "flex", alignItems: "center", gap: 34, padding: "0 46px", direction: "rtl", transform: `translateY(${(1 - cardA) * 80}px) scale(${0.9 + 0.1 * cardA})`, opacity: clamp(cardA) }}>
          <div style={{ width: 118, height: 118, borderRadius: 30, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${40 + 30 * Math.sin(t * 3)}px rgba(255,106,31,0.35)` }}>
            <Icon n="wand" size={66} color={C.accent2} sw={2} />
          </div>
          <div>
            <div style={{ fontFamily: F.head, fontSize: 86, lineHeight: 1.05, color: C.cream }}>یه ایده‌ی ساده</div>
            <div style={{ fontFamily: F.faS, fontSize: 32, color: C.dim, marginTop: 6 }}>غذای سریع، کمتر از یک دقیقه</div>
          </div>
        </div>
      ) : null}
      {cardB > 0 ? (
        <div style={{ position: "absolute", left: 150, top: 690, width: 780, height: 420, borderRadius: 36, background: "rgba(18,20,24,0.82)", border: `1px solid ${C.line2}`, boxShadow: "0 40px 80px rgba(0,0,0,0.55)", padding: "36px 46px", boxSizing: "border-box", direction: "rtl", transform: `translateY(${(1 - cardB) * 80}px) scale(${0.9 + 0.1 * cardB})`, opacity: clamp(cardB) }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F.head, fontSize: 72, color: C.cream }}>یه برنامه‌ی منظم</span>
            <span style={{ fontFamily: F.faS, fontSize: 30, color: C.dim }}>هر هفته، پنجشنبه</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, marginTop: 30 }}>
            {Array.from({ length: 28 }, (_, i) => {
              const week = Math.floor(i / 7), day = i % 7;
              const on = day === 5 && t >= SC.plan + 0.15 + week * 0.28;
              const k = on ? ease.outBack(clamp((t - (SC.plan + 0.15 + week * 0.28)) / 0.3)) : 0;
              return (
                <div key={i} style={{ height: 44, borderRadius: 10, background: on ? C.accent : "rgba(244,238,230,0.07)", transform: `scale(${on ? 0.8 + 0.2 * k : 1})`, boxShadow: on ? "0 0 24px rgba(255,106,31,0.55)" : undefined, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Icon n="play" size={20} color="#1a0d05" fill="#1a0d05" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
};

// ── 3 · the Instagram profile, the followers lift off ───────────────────────────────────────────────────────
const TILES = [
  { hue: 14, title: "پاستا ۶۰ ثانیه‌ای", views: 182000 },
  { hue: 38, title: "صبحونه‌ی سریع", views: 64000 },
  { hue: 352, title: "سس سیر", views: 41000 },
  { hue: 205, title: "کیک لیوانی", views: 97000 },
  { hue: 120, title: "سالاد ۳ دقیقه", views: 23000 },
  { hue: 28, title: "نون تابه‌ای", views: 55000 },
  { hue: 280, title: "دسر بدون فر", views: 38000 },
  { hue: 8, title: "املت سریع", views: 29000 },
  { hue: 190, title: "لیموناد", views: 17000 },
];
const Ig: React.FC<{ t: number }> = ({ t }) => {
  const cx = 540, cy = 820, s = 1.34;
  const a = SC.followers;
  const f = onPhone(cx, cy, s, 236, 139);
  return (
    <>
      <Under k={ramp(t, a + 0.1, a + 0.5) * (1 - ramp(t, SEC.ai - 0.35, SEC.ai - 0.1))}>
      <Phone x={cx} y={cy} s={s * (1 + 0.03 * ramp(t, SEC.ig, a))} glow={C.ig3} glowA={0.35}>
        <IgProfile handle="your.channel" name="آشپزی سریع" posts={48} followers={12000} following={180} bio={["دستورهای ۶۰ ثانیه‌ای", "هر پنجشنبه یه ویدیوی تازه"]} tiles={TILES} scroll={kf(t, [[SEC.ig + 0.3, 0], [a - 0.4, 40]])} />
        <StatusBar />
      </Phone>
      </Under>
      <Scrim a={ramp(t, a, a + 0.4) * (1 - ramp(t, SEC.ai - 0.35, SEC.ai - 0.1))} />
      <Lift t={t} a={a} b={SEC.ai - 0.35} from={{ x: f.x - 54, y: f.y - 17, w: 108, h: 34 }} tx={540} ty={640} size={240} value={(u) => fmtK(mix(9800, 12000, u))} accent={C.ig3} label={<span style={{ fontFamily: F.faB, fontSize: 46, color: C.dim, direction: "rtl" }}>دنبال‌کننده</span>} />
    </>
  );
};

// ── 4 · the AI chat: the prompt types word by word, the reply streams ──────────────────────────────────────
const REPLY = ["۱. پاستای ده دقیقه‌ای با سه قلم مواد", "۲. صبحونه‌ی سالم برای روزهای شلوغ", "۳. سس سیر، بدون همزن", "۴. یک غذا، سه جور سرو کردن", "۵. اشتباه رایج موقع سرخ کردن تخم‌مرغ"];
const Ai: React.FC<{ t: number }> = ({ t }) => {
  const s = 0.86, cy = 770;
  // push in on the composer while the prompt types (captions are hidden then), back out for the reply
  const z = kf(t, [[SC.ask - 0.2, 1], [SC.promptWords[0], 1.2], [SC.send + 0.05, 1.2], [SC.reply + 0.35, 1]]);
  const oy = cy + (TB.h / 2 - 76) * s;
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `540px ${oy}px` }}>
      <Tablet x={540} y={cy} s={s} ry={kf(t, [[SEC.ai, -8], [SEC.ai + 1.2, 0]])} glow="#3E7BD6" glowA={0.4} reflect={0.16}>
        <AiChat t={t} w={TB.w} h={TB.h} prompt="پنج تا ایده بده برای ویدیوی کوتاه آشپزی" words={SC.promptWords} sendAt={SC.send} reply={REPLY} replyAt={SC.reply} lineDur={0.42} fs={36} />
      </Tablet>
    </AbsoluteFill>
  );
};

// ── 5 · the call to action: a comment typed and sent ────────────────────────────────────────────────────────
const Cta: React.FC<{ t: number }> = ({ t }) => {
  const up = ease.out(clamp((t - SEC.cta - 0.2) / 0.45));
  const end = ease.inOut(clamp((t - (SC.comment + 0.6)) / 0.8));
  const k = pop(t, SC.word - 0.15);
  return (
    <>
      <Phone x={540} y={830 - 10 * end} s={1.3 * (1 + 0.08 * end)} glow={C.accent} glowA={0.35}>
        <Thumb w={PH.w} h={PH.h} hue={14} title="پاستا در ۶۰ ثانیه" r={0} titleTop />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 300 + (1 - up) * 560, bottom: 0, borderRadius: "18px 18px 0 0", overflow: "hidden" }}>
          <CommentSheet t={t} comments={[{ user: "sara.cooks", text: "دستور بعدی کی میاد؟" }, { user: "amir_k", text: "خیلی سریع بود، عالی" }, { user: "mina.home", text: "امتحانش کردم، شد!" }]} mine="ایده" typeAt={SC.word - 0.05} sendAt={SC.comment + 0.15} />
        </div>
        <StatusBar />
      </Phone>
      {k > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center", opacity: clamp(k), transform: `scale(${0.8 + 0.2 * k})` }}>
          <div style={{ direction: "rtl", padding: "16px 40px", borderRadius: 999, background: C.accent, color: "#1a0d05", fontFamily: F.faB, fontSize: 50, boxShadow: "0 20px 50px rgba(255,106,31,0.4)" }}>کامنت کن: «ایده»</div>
        </div>
      ) : null}
    </>
  );
};

export const NoirStudioAt: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop t={t} plates={PLATES} />
    <Sec t={t} a={SEC.hook} b={SEC.plan}>
      <Hook t={t} />
    </Sec>
    <Sec t={t} a={SEC.plan} b={SEC.ig}>
      <Plan t={t} />
    </Sec>
    <Sec t={t} a={SEC.ig} b={SEC.ai}>
      <Ig t={t} />
    </Sec>
    <Sec t={t} a={SEC.ai} b={SEC.cta}>
      <Ai t={t} />
    </Sec>
    <Sec t={t} a={SEC.cta} b={DUR}>
      <Cta t={t} />
    </Sec>
    <Buddies t={t} cast={CAST} />
    <Captions t={t} caps={CAPS} words={WORDS} />
  </AbsoluteFill>
);

export const NoirStudioDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useStudioFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <NoirStudioAt t={t} />
    </TimeCtx.Provider>
  );
};
