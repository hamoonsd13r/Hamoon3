// Paper UI · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/paper-ui/lib/…,
// then swap the lines and the scenes' content (your product's screens, numbers, call to action).
// Every element is a pure function of t; each scene lives in its window SC.x = [start, end].
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Card, Chip, Clock, Fa, Ico, In, Mark, Phone, Scene, Stamp, Subtitle, Toggle, Win } from "../lib/kit";
import { usePaperFonts } from "../lib/fonts";
import { C, FA, FPS, MONO, TimeCtx, accentA, bob, clamp, eio, eo, faNum, pop, ramp, wob } from "../lib/theme";
import { CHUNKS, DUR, GHOSTS, K, SC, TL } from "./script";

export type DemoProps = { times?: number[] };
const { S } = TL;

// ── 1 · hook: the line itself as the headline, word by word, with the tools of the trade floating around ───────
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const w = (ts: number) => eo(ramp(t, ts - 0.05, ts + 0.25));
  const word = (txt: string, ts: number, extra?: React.CSSProperties) => {
    const k = w(ts);
    return <span style={{ display: "inline-block", opacity: k, transform: `translateY(${(1 - k) * -60}px) scale(${1.25 - 0.25 * k})`, filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined, margin: "0 12px", ...extra }}>{txt}</span>;
  };
  const icons: [Parameters<typeof Ico>[0]["k"], number, number, number][] = [["phone", 170, 470, -0.3], ["cal", 900, 430, -0.25], ["scissors", 150, 1480, -0.2], ["chat", 920, 1450, -0.15], ["clock", 540, 1560, 0.3]];
  const ring = t >= K.phone ? wob(t, K.phone, 14, 34, 2.2) : 0;
  return (
    <AbsoluteFill>
      {icons.map(([k, x, y, d], i) => {
        const p = pop(t, d, 0.5);
        const r = k === "phone" ? ring : 0;
        return (
          <div key={k} style={{ position: "absolute", left: x - 60, top: y - 60 + bob(t, 14, 1.6, i), width: 120, height: 120, borderRadius: 34, background: k === "phone" && t >= K.phone ? C.ink : "#fff", boxShadow: "0 20px 50px rgba(60,48,20,.16)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${p}) rotate(${(1 - p) * -30 + bob(t, 6, 1.1, i) + r}deg)` }}>
            <Ico k={k} s={56} c={k === "phone" && t >= K.phone ? C.accent : i % 2 ? C.accentInk : C.ink} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 30, right: 30, top: 690, textAlign: "center" }}>
        {/* the whole question is on screen from frame 0; «تلفن» gets its punch and marker when it is said */}
        <Fa size={104}>{word("هنوز", -0.4)}{word("نوبت‌ها", -0.35)}{word("رو", -0.3)}</Fa>
        <Fa size={230} style={{ marginTop: 18 }}>
          <span style={{ display: "inline-block", transform: `scale(${1 + 0.18 * Math.exp(-Math.max(0, t - K.phone) * 6) * (t >= K.phone ? 1 : 0)})` }}>
            با <Mark t={t} t0={K.phone + 0.12}>تلفن</Mark>
          </span>
        </Fa>
        <Fa size={120} style={{ marginTop: 18 }}>{word("می‌گیری؟", -0.25)}</Fa>
      </div>
    </AbsoluteFill>
  );
};

// ── 2 · the problem: missed calls, no-shows ───────────────────────────────────────────────────────────────────
const CALLS = [["مریم", "۹:۴۲"], ["شماره‌ی ناشناس", "۱۰:۱۵"], ["سارا", "۱۱:۰۳"], ["نگار", "۱۲:۳۰"]];
const Problem: React.FC<{ t: number }> = ({ t }) => {
  const stamp = pop(t, K.forget + 0.15, 0.35);
  return (
    <>
      <Win x={70} y={330} w={940} h={520} title={<Fa size={30} w={700}>تماس‌های امروز</Fa>}>
        <div style={{ padding: "22px 36px" }}>
          {CALLS.map(([n, h], i) => {
            const k = pop(t, K.calls + i * 0.18, 0.4);
            if (k <= 0) return null;
            const miss = t >= K.missed - 0.1;
            return (
              <div key={n} style={{ height: 92, display: "flex", alignItems: "center", gap: 20, direction: "rtl", borderBottom: `1px solid ${C.line}`, opacity: clamp(k * 1.6), transform: `translateX(${(1 - k) * 80}px)` }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: miss ? "rgba(229,72,77,.12)" : "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico k="phone" s={32} c={miss ? C.red : C.sub} />
                </div>
                <Fa size={34}>{n}</Fa>
                {miss ? <span style={{ fontFamily: FA, fontWeight: 700, fontSize: 26, color: C.red, padding: "6px 16px", borderRadius: 999, background: "rgba(229,72,77,.1)" }}>بی‌پاسخ</span> : null}
                <span style={{ marginRight: "auto", fontFamily: FA, fontWeight: 600, fontSize: 28, color: C.sub }}>{h}</span>
              </div>
            );
          })}
        </div>
      </Win>
      <In t={t} t0={K.week - 0.1} style={{ left: 70, top: 890, width: 940, height: 420 }}>
        <Card style={{ inset: 0 }}>
          <div style={{ padding: "26px 34px", direction: "rtl" }}>
            <Fa size={32} w={700}>نوبت‌های این هفته</Fa>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {Array.from({ length: 18 }, (_, i) => {
                const no = [3, 8, 14].includes(i) && t >= K.forget - 0.05;
                return (
                  <div key={i} style={{ height: 76, borderRadius: 16, background: no ? "rgba(229,72,77,.1)" : accentA(0.16), border: `2px solid ${no ? C.red : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {no ? <svg width={40} height={40} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke={C.red} strokeWidth={2.6} strokeLinecap="round" /></svg> : <Ico k="user" s={30} c={C.accentInk} />}
                  </div>
                );
              })}
            </div>
          </div>
          <Stamp k={stamp} text="نیومد!" style={{ left: "50%", top: "58%" }} />
        </Card>
      </In>
    </>
  );
};

// ── 3 · online booking on the phone ───────────────────────────────────────────────────────────────────────────
const SERVICES = [["کوتاهی مو", "۴۵ دقیقه"], ["رنگ مو", "۲ ساعت"], ["کاشت ناخن", "۹۰ دقیقه"]];
const SLOTS = ["۱۰:۰۰", "۱۱:۳۰", "۱۳:۰۰", "۱۴:۳۰", "۱۶:۳۰", "۱۸:۰۰"];
const AppHead: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ height: 120, padding: "50px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
    <Fa size={34}>{title}</Fa>
    <div style={{ width: 44, height: 44, borderRadius: 14, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k="cal" s={26} c="#1a0d05" /></div>
  </div>
);
const Book: React.FC<{ t: number }> = ({ t }) => {
  const pickS = t >= K.app + 0.4, pickT = t >= K.online + 0.1;
  const press = ramp(t, K.time, K.time + 0.1) - ramp(t, K.time + 0.1, K.time + 0.28);
  const ok = pop(t, K.time + 0.2, 0.35);
  return (
    <>
      <Phone x={540} y={830} rot={bob(t, 1.2, 0.8)}>
        <AppHead title="اپ نوبت · سالن رز" />
        <div style={{ padding: "0 24px", direction: "rtl" }}>
          <Fa size={24} w={600} color={C.sub}>خدمت</Fa>
          {SERVICES.map(([n, d], i) => (
            <div key={n} style={{ marginTop: 10, height: 74, borderRadius: 18, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: pickS && i === 0 ? C.ink : "#fff", border: `1px solid ${C.line}`, color: pickS && i === 0 ? "#fff" : C.ink }}>
              <Fa size={27} color={pickS && i === 0 ? "#fff" : C.ink}>{n}</Fa>
              <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 22, color: pickS && i === 0 ? "rgba(255,255,255,.7)" : C.sub }}>{d}</span>
            </div>
          ))}
          <Fa size={24} w={600} color={C.sub} style={{ marginTop: 24 }}>پنجشنبه · ساعت</Fa>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {SLOTS.map((s, i) => (
              <div key={s} style={{ height: 62, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FA, fontWeight: 700, fontSize: 26, background: pickT && i === 4 ? C.accent : i === 1 ? "#ECE7DD" : "#fff", color: i === 1 ? "#B5AFA3" : C.ink, border: `1px solid ${C.line}`, textDecoration: i === 1 ? "line-through" : undefined }}>{s}</div>
            ))}
          </div>
          <div style={{ marginTop: 26, height: 84, borderRadius: 22, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.06 * press})` }}>
            <Fa size={32} color="#fff">تأیید نوبت</Fa>
          </div>
        </div>
        <Stamp k={ok} text="رزرو شد ✓" color={C.green} size={64} style={{ left: "50%", top: "50%" }} />
      </Phone>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1335, display: "flex", justifyContent: "center", gap: 16 }}>
        <Chip k={pop(t, K.online - 0.05)} accent>آنلاین · ۲۴ ساعته</Chip>
      </div>
    </>
  );
};

// ── 4 · the reminder SMS + the auto-reminder switch ───────────────────────────────────────────────────────────
const Remind: React.FC<{ t: number }> = ({ t }) => {
  const sms = pop(t, K.sms - 0.1, 0.45);
  const on = eio(ramp(t, K.self, K.self + 0.3));
  return (
    <>
      <Phone x={600} y={800} rot={-3 + bob(t, 1, 0.7)}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #3b2f4a, #0f1220)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", color: "#fff", fontFamily: MONO, fontWeight: 300, fontSize: 110, direction: "ltr" }}>16:12</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 260, textAlign: "center" }}><Fa size={28} w={600} color="rgba(255,255,255,.75)">چهارشنبه</Fa></div>
        {sms > 0 ? (
          <div style={{ position: "absolute", left: 22, right: 22, top: 360, padding: "20px 22px", borderRadius: 26, background: "rgba(255,255,255,.88)", opacity: clamp(sms * 1.6), transform: `translateY(${(1 - sms) * -60}px) scale(${0.9 + 0.1 * sms})`, direction: "rtl" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k="chat" s={22} c="#fff" /></div>
              <Fa size={22} w={700}>پیامک · سالن رز</Fa>
              <span style={{ marginRight: "auto", fontFamily: FA, fontSize: 20, color: C.sub }}>الان</span>
            </div>
            <Fa size={27} w={500} style={{ marginTop: 10, lineHeight: 1.5 }}>یادآوری: فردا ساعت ۱۶:۳۰ نوبت کوتاهی مو داری. اگه نمی‌تونی بیای، یه پیام بده.</Fa>
          </div>
        ) : null}
      </Phone>
      <In t={t} t0={K.day - 0.1} style={{ left: 60, top: 1090, width: 470, height: 190 }}>
        <Card style={{ inset: 0, padding: "0 30px", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
          <div>
            <Fa size={32}>یادآوری خودکار</Fa>
            <Fa size={24} w={500} color={C.sub} style={{ marginTop: 8 }}>۲۴ ساعت قبل از نوبت</Fa>
          </div>
          <Toggle on={on} />
        </Card>
      </In>
      <In t={t} t0={K.sms + 0.3} style={{ left: 560, top: 1090, width: 460, height: 190 }}>
        <Card style={{ inset: 0, padding: "0 26px", display: "flex", alignItems: "center", gap: 22, direction: "rtl" }}>
          <Clock size={140} hour={16 * 30 + 15} minute={180} />
          <div>
            <Fa size={30}>فردا</Fa>
            <Fa size={44} color={C.accentInk} style={{ marginTop: 6 }}>۱۶:۳۰</Fa>
          </div>
        </Card>
      </In>
    </>
  );
};

// ── 5 · the month: empty slots filled ─────────────────────────────────────────────────────────────────────────
const WEEKS = [61, 72, 84, 92];
const Month: React.FC<{ t: number }> = ({ t }) => {
  const g = eo(ramp(t, S(4) + 0.2, K.full + 0.5));
  const pct = Math.round(61 + (92 - 61) * eo(ramp(t, K.full - 0.3, K.full + 0.5)));
  return (
    <>
      <Card style={{ left: 90, top: 380, width: 900, height: 860 }}>
        <div style={{ padding: "34px 40px", direction: "rtl" }}>
          <Fa size={34} w={700}>وقت‌های پرشده · این ماه</Fa>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 170, color: C.ink }}>{faNum(pct)}٪</span>
            {t >= K.full ? <Chip k={pop(t, K.full)} accent size={28}>+{faNum(pct - 61)}٪</Chip> : null}
          </div>
          <div style={{ position: "absolute", left: 60, right: 60, bottom: 70, height: 420, display: "flex", alignItems: "flex-end", justifyContent: "space-around", direction: "rtl" }}>
            {WEEKS.map((v, i) => {
              const h = 380 * (v / 100) * eo(ramp(g, i * 0.12, 0.6 + i * 0.12));
              return (
                <div key={i} style={{ width: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: FA, fontWeight: 700, fontSize: 28, color: i === 3 ? C.accentInk : C.sub, opacity: clamp(h / 60) }}>{faNum(v)}٪</span>
                  <div style={{ width: 130, height: h, borderRadius: "18px 18px 6px 6px", background: i === 3 ? C.accent : "#E9E2D4" }} />
                  <Fa size={24} w={600} color={C.sub}>هفته‌ی {faNum(i + 1)}</Fa>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </>
  );
};

// ── 6 · the call to action ────────────────────────────────────────────────────────────────────────────────────
const Cta: React.FC<{ t: number }> = ({ t }) => {
  const a = pop(t, S(5) - 0.05, 0.5);
  const arrow = pop(t, K.bio - 0.05, 0.45);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", opacity: clamp(a * 1.5), transform: `scale(${0.7 + 0.3 * a})` }}>
        <Fa size={140}><Mark t={t} t0={K.today}>همین امروز</Mark></Fa>
        <Fa size={84} style={{ marginTop: 18 }}>شروعش کن</Fa>
      </div>
      <In t={t} t0={S(5) + 0.4} style={{ left: 240, top: 820, width: 600, height: 300 }}>
        <Card style={{ inset: 0, display: "flex", alignItems: "center", gap: 30, padding: "0 40px", direction: "rtl" }}>
          <div style={{ width: 150, height: 150, borderRadius: 40, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 20px 40px ${accentA(0.3)}` }}><Ico k="cal" s={86} c={C.accent} /></div>
          <div>
            <Fa size={56}>اپ نوبت</Fa>
            <Fa size={28} w={500} color={C.sub} style={{ marginTop: 8 }}>نوبت‌دهی آنلاین برای سالن‌ها</Fa>
          </div>
        </Card>
      </In>
      {arrow > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", justifyContent: "center", opacity: clamp(arrow * 1.5), transform: `translateY(${(1 - arrow) * 40 + bob(t, 8, 4)}px)` }}>
          <Chip k={1} accent size={40}>
            <svg width={34} height={34} viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="#1a0d05" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            لینک توی بیو
          </Chip>
        </div>
      ) : null}
    </>
  );
};

export const PaperUIAt: React.FC<{ t: number }> = ({ t }) => {
  const alarm = clamp(ramp(t, K.missed, K.missed + 0.4) - ramp(t, SC.book[0] - 0.3, SC.book[0] + 0.2));
  const punches = [K.phone, K.missed, K.forget, K.online, K.time, K.sms, K.full, K.today];
  const pk = punches.reduce((m, p) => (t >= p ? Math.max(m, Math.exp(-(t - p) * 7)) : m), 0);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Backdrop t={t} ghosts={GHOSTS} alarm={alarm} />
      <AbsoluteFill style={{ transform: `scale(${1 + 0.02 * Math.sin(t * 0.4) + 0.025 * pk}) rotate(${0.25 * Math.sin(t * 0.33)}deg)`, transformOrigin: "50% 45%" }}>
        <Scene t={t} win={SC.hook}><Hook t={t} /></Scene>
        <Scene t={t} win={SC.problem}><Problem t={t} /></Scene>
        <Scene t={t} win={SC.book}><Book t={t} /></Scene>
        <Scene t={t} win={SC.remind}><Remind t={t} /></Scene>
        <Scene t={t} win={SC.month}><Month t={t} /></Scene>
        <Scene t={t} win={SC.cta}><Cta t={t} /></Scene>
      </AbsoluteFill>
      <Subtitle t={t} chunks={CHUNKS} from={SC.hook[1] - 0.1} until={DUR} />
    </AbsoluteFill>
  );
};

export const PaperUIDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = usePaperFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <PaperUIAt t={t} />
    </TimeCtx.Provider>
  );
};
