// Verdict Noir · demo film. Copy this file + script.ts to src/vNN/, change the imports to
// ../styles/verdict-noir/lib/…, then swap the lines, the props on the desk and the beats (all cued on words).
// Each scene is a camera on a desk «world» (World + camKF + drift); scenes whip into each other.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../lib/backdrop";
import { useVerdictFonts } from "../lib/fonts";
import { Captions, Choice, Grain, Punch, Scenes, Scrim, Tag, Timer, World, camKF, drift, useHBlur, type Scene } from "../lib/kit";
import { CaseFolder, Clock, Contract, Gavel, JOBS, JobCard, LegalPad, Nameplate, Pen, Phone, ReqPage, Reticle, Stamp, Wood } from "../lib/props";
import { C, F, FPS, SD, TimeCtx, clamp, ease, faNum, jolt, mix, ramp } from "../lib/theme";
import { BGS, CAPS, CAP_HIDE, DUR, K, SC, TL, WORDS } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;

/** whip pan between scenes: comes in from the left, leaves to the right, with a horizontal blur */
const Whip: React.FC<{ t: number; a: number; b: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ t, a, b, first, last, children }) => {
  const i = first ? 1 : ease.out(clamp((t - a) / 0.25));
  const o = last ? 0 : ease.in(clamp((t - (b - 0.25)) / 0.25));
  const [defs, filter] = useHBlur((1 - i) * 18 + o * 18);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - i) * -1100 + o * 1100}px)`, filter }}>
      {defs}
      {children}
    </div>
  );
};

/** the walnut desk with a warm lamp pool */
const Desk: React.FC<{ seed?: number; lx?: number; ly?: number; w?: number }> = ({ seed = 3, lx = 540, ly = 900, w = 2480 }) => (
  <div style={{ position: "absolute", left: -700, top: -900, width: w, height: 3720 }}>
    <Wood w={w} h={3720} seed={seed} scale={2} />
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1000px 900px at ${lx + 700}px ${ly + 900}px, rgba(255,200,140,.16), rgba(0,0,0,0) 70%), radial-gradient(140% 90% at 50% 40%, transparent 40%, rgba(0,0,0,.55) 100%)` }} />
  </div>
);
const at = (x: number, y: number, rot = 0, extra = ""): React.CSSProperties => ({ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)${extra}` });

// ── 0 · hook: a mountain of case files ────────────────────────────────────────────────────────────────────────
const FILES: { dx: number; dy: number; rot: number; fa: string; t: number }[] = [
  { dx: -30, dy: 40, rot: -7, fa: "دعوای ملکی", t: -1 },
  { dx: 40, dy: 0, rot: 5, fa: "قرارداد اجاره", t: -1 },
  { dx: -10, dy: -30, rot: -3, fa: "چک برگشتی", t: K.morning },
  { dx: 25, dy: -60, rot: 8, fa: "سهام شرکت", t: K.lawyer },
  { dx: -20, dy: -90, rot: -6, fa: "طلاق توافقی", t: K.pile },
  { dx: 10, dy: -120, rot: 3, fa: "پرونده‌ی ۴۱۲", t: K.start },
];
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const hit = FILES.reduce((s, f) => s + (f.t > 0 ? jolt(t, f.t + 0.2, 7) : 0), 0);
  const cam = drift(camKF(t, [[0, { x: 540, y: 960, s: 1.3, rx: 40 }], [S(1), { x: 540, y: 1060, s: 0.95, rx: 32 }]]), t, 0.6);
  return (
    <>
      <World cam={{ ...cam, y: cam.y + hit }}>
        <Desk />
        <div style={at(150, 1190, 24)}>
          <Pen len={380} />
        </div>
        <div style={at(700, 1180, -24)}>
          <Gavel w={380} />
        </div>
        {FILES.map((f, i) => {
          const u = f.t < 0 ? 1 : clamp((t - f.t) / 0.22);
          if (u <= 0) return null;
          const e = ease.in(u);
          return (
            <div key={i} style={{ ...at(340 + f.dx, 790 + f.dy, f.rot, ` scale(${mix(1.7, 1, e)})`), opacity: clamp(u * 3) }}>
              <CaseFolder w={400} fa={f.fa} papers={2 + (i % 2)} />
            </div>
          );
        })}
        <Stamp t={t} at={K.start + 0.25} text="فوری" x={560} y={760} size={84} rot={-10} />
        <div style={{ position: "absolute", left: 540 - 290, top: 1330, transformOrigin: "50% 100%", transform: "rotateX(-82deg)" }}>
          <Nameplate w={580} sheen={ramp(t, K.start, K.start + 0.9)} />
        </div>
      </World>
      <Punch t={t} a={0} b={S(1) - 0.25} y={330} size={150} from="none">
        یه کوه پرونده
      </Punch>
    </>
  );
};

// ── 1 · the day's list ────────────────────────────────────────────────────────────────────────────────────────
const TODO = ["بررسی پرونده‌ها", "تحقیق قوانین", "تنظیم قرارداد", "نوشتن لایحه"];
const Todo: React.FC<{ t: number }> = ({ t }) => {
  const cam = drift(camKF(t, [[S(1), { x: 540, y: 760, s: 1.12, rx: 14 }], [K.t4 + 0.4, { x: 540, y: 1000, s: 1.12, rx: 10 }]]), t, 0.5);
  const show = [K.t1, K.t2, K.t3, K.t4].map((x) => ramp(t, x - 0.05, x + 0.3));
  return (
    <World cam={cam}>
      <Desk seed={7} />
      <div style={at(150, 360, -2)}>
        <LegalPad w={780} h={1060} tasks={TODO} show={show} fs={48} rowH={112} />
      </div>
      <div style={at(840, 1360, -58)}>
        <Pen len={420} />
      </div>
    </World>
  );
};

// ── 2 · hours on one contract ─────────────────────────────────────────────────────────────────────────────────
const Hours: React.FC<{ t: number }> = ({ t }) => {
  const cam = drift(camKF(t, [[S(2), { x: 540, y: 900, s: 1.0, rx: 28 }], [K.hours, { x: 760, y: 640, s: 1.3, rx: 24 }]]), t, 0.6);
  const hrs = 3.4 * ease.inOut(ramp(t, K.read, E(2) + 0.3));
  return (
    <>
      <World cam={cam}>
        <Desk seed={11} lx={700} ly={600} />
        <div style={at(120, 470, 4)}>
          <Contract w={600} />
        </div>
        <div style={{ ...at(640, 360, -6), filter: "drop-shadow(0 30px 40px rgba(0,0,0,.6))" }}>
          <Clock r={210} h={270 + 30 * hrs} m={360 * hrs} s={(t * 900) % 360} />
        </div>
      </World>
      <Punch t={t} a={K.hours} b={E(2) + 0.15} y={300} size={230} color={C.red2}>
        ساعت‌ها
      </Punch>
    </>
  );
};

// ── 3 · an assistant reads it in seconds ──────────────────────────────────────────────────────────────────────
const Secs: React.FC<{ t: number }> = ({ t }) => {
  const cam = drift(camKF(t, [[S(3), { x: 820, y: 1260, s: 1.35, rx: 20 }], [K.same, { x: 560, y: 840, s: 1.05, rx: 22 }], [S(4), { x: 560, y: 860, s: 1.12, rx: 22 }]]), t, 0.5);
  const scan = ease.inOut(ramp(t, K.same + 0.1, K.reads + 0.3));
  const scanOn = t > K.same + 0.05 && t < K.reads + 0.45;
  const tk = ramp(t, K.secs - 0.25, K.secs) * (1 - ramp(t, S(4) - 0.3, S(4) - 0.05));
  const cw = 640, ch = cw * 1.32;
  return (
    <>
      <World cam={cam}>
        <Desk seed={5} lx={560} ly={800} />
        <div style={at(240, 420, -2)}>
          <div style={{ position: "relative" }}>
            <Contract w={cw} />
            {scanOn && (
              <>
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: ch * scan, background: "linear-gradient(180deg, rgba(229,50,45,0), rgba(229,50,45,.10))" }} />
                <div style={{ position: "absolute", left: -30, right: -30, top: ch * scan - 2, height: 4, background: C.red, boxShadow: `0 0 18px ${C.red}, 0 0 50px rgba(229,50,45,.6)` }} />
              </>
            )}
          </div>
        </div>
        <div style={at(760, 1070, -8)}>
          <Phone w={260} wake={ramp(t, K.ai - 0.1, K.ai + 0.3)} note={ramp(t, K.reads + 0.2, K.reads + 0.6)} line1="قرارداد خونده شد" line2="۳ بند مشکل‌دار پیدا شد" />
        </div>
      </World>
      <Scrim a={tk * 0.85} />
      <Timer t={t} a={K.secs - 0.2} b={S(4) - 0.3} from={0.4} to={4.2} dur={0.9} decimals={1} unit="ثانیه" lead="دستیار" y={860} size={280} color={C.red2} />
      {tk > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", justifyContent: "center", opacity: tk }}>
          <Tag style={{ fontSize: 22, letterSpacing: 3 }}>ILLUSTRATIVE</Tag>
        </div>
      )}
    </>
  );
};

// ── 4 · flags the bad clauses, drafts the brief ───────────────────────────────────────────────────────────────
const FLAG_LINES = [3, 4, 8];
const Flags: React.FC<{ t: number }> = ({ t }) => {
  const cam = drift(camKF(t, [[S(4), { x: 560, y: 760, s: 1.12, rx: 16 }], [K.draft - 0.05, { x: 560, y: 760, s: 1.16, rx: 16 }], [K.draft + 0.45, { x: 1580, y: 760, s: 1.02, rx: 16 }], [S(5), { x: 1580, y: 800, s: 1.08, rx: 16 }]]), t, 0.5);
  const cw = 700;
  return (
    <World cam={cam}>
      <Desk seed={9} lx={1000} ly={800} w={3400} />
      <div style={at(210, 300, 2)}>
        <div style={{ position: "relative" }}>
          <Contract w={cw} />
          {FLAG_LINES.map((li, i) => {
            const p = ease.out(ramp(t, K.flags + i * 0.12, K.flags + 0.3 + i * 0.12));
            const top = cw * 0.26 + li * cw * 0.07;
            return (
              <React.Fragment key={li}>
                <div style={{ position: "absolute", left: cw * 0.08, width: cw * 0.84, top: top - 13, height: 28, background: "rgba(229,50,45,.3)", transform: `scaleX(${p})`, transformOrigin: "100% 50%", borderRadius: 4 }} />
                <div style={{ position: "absolute", left: cw * 0.93, top: top - 16, width: 34, height: 34, borderRadius: 17, background: C.red, color: "#fff", fontFamily: F.ui, fontWeight: 900, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ease.outBack(clamp(p * 1.2))})` }}>!</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <Stamp t={t} at={K.mark} text="مشکل‌دار" x={560} y={560} size={96} rot={-9} />
      <div style={{ ...at(1260, 300, -2), boxShadow: "0 30px 60px rgba(0,0,0,.55)" }}>
        <ReqPage w={640} title="لایحه دفاعیه" no={7} titleW={ramp(t, K.draft, K.draft + 0.45)} wr={ease.inOut(ramp(t, K.draft + 0.25, E(4) + 0.5))} ai={ramp(t, E(4), E(4) + 0.3)} />
      </div>
    </World>
  );
};

// ── 5 · the decision and the signature stay with the lawyer ───────────────────────────────────────────────────
const SIG = "M6 52 C30 8 44 70 62 30 C74 6 86 60 104 34 C116 18 126 52 142 40 C160 26 172 54 208 22";
const Sign: React.FC<{ t: number }> = ({ t }) => {
  const kick = jolt(t, K.lawyer5 + 0.1, 12);
  const cam = drift(camKF(t, [[S(5), { x: 540, y: 720, s: 1.0, rx: 18 }], [K.sign - 0.15, { x: 720, y: 1020, s: 1.45, rx: 14 }], [K.lawyer5, { x: 640, y: 960, s: 1.2, rx: 16 }]]), t, 0.5);
  const pw = 680, k = pw / 600, ph = Math.round(pw * 1.333);
  const sx = 200 + pw - 52 * k - 225 * k, sy = 240 + ph - 52 * k - 76;
  const p = ease.inOut(ramp(t, K.sign, K.sign + 0.7));
  const pen = ease.inOut(ramp(t, K.sign - 0.5, K.sign));
  return (
    <World cam={{ ...cam, y: cam.y + kick }}>
      <Desk seed={13} lx={600} ly={900} />
      <div style={{ ...at(200, 240, 0), boxShadow: "0 30px 60px rgba(0,0,0,.55)" }}>
        <ReqPage w={pw} title="لایحه دفاعیه" no={7} wr={1} />
      </div>
      <svg width={230} height={90} viewBox="0 0 214 76" style={{ position: "absolute", left: sx, top: sy, overflow: "visible" }}>
        <path d={SIG} fill="none" stroke="#14203A" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={420} strokeDashoffset={420 * (1 - p)} />
      </svg>
      <div style={at(mix(940, sx + 230 * p, pen), mix(1380, sy + 40 - 18 * Math.sin(p * 9), pen), mix(-60, -38, pen))}>
        <Pen len={420} />
      </div>
      <Stamp t={t} at={K.lawyer5 + 0.1} text="تأیید وکیل" x={430} y={1010} size={88} rot={-8} />
    </World>
  );
};

// ── 6 · call to action: the lawyer card gets targeted, then the comment ───────────────────────────────────────
const CW = 290, CH = 250, GAP = 22, GX = (1080 - (3 * CW + 2 * GAP)) / 2, GY = 250;
const cardXY = (i: number) => ({ x: GX + (i % 3) * (CW + GAP), y: GY + Math.floor(i / 3) * (CH + GAP) });
const PATH = [0, 2, 6, 4]; // the reticle hunts over these cards, ends on the lawyer (index 4)
const Cta: React.FC<{ t: number }> = ({ t }) => {
  const a = S(6), lockAt = K.ifLawyer;
  const send = K.word + 0.7;
  const sp = clamp((t - a) / Math.max(0.3, lockAt - a)) * (PATH.length - 1);
  const i0 = Math.floor(Math.min(sp, PATH.length - 1.001)), u = ease.inOut(sp - i0);
  const p0 = cardXY(PATH[i0]), p1 = cardXY(PATH[Math.min(i0 + 1, PATH.length - 1)]);
  const lock = ease.out(ramp(t, lockAt, lockAt + 0.3));
  const gone = ease.inOut(ramp(t, send, send + 0.4));
  const typed = "وکیل".slice(0, Math.round(4 * ramp(t, K.word - 0.1, K.word + 0.35)));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.75 * gone, transform: `translateY(${-60 * gone}px)` }}>
        {JOBS.map((j, i) => {
          const c = cardXY(i);
          const k = ease.out(ramp(t, a + i * 0.04, a + 0.35 + i * 0.04));
          return (
            <div key={j.en} style={{ position: "absolute", left: c.x, top: c.y, opacity: k, transform: `scale(${0.92 + 0.08 * k})` }}>
              <JobCard job={j} w={CW} h={CH} lock={i === 4 ? lock : 0} dim={i === 4 ? 0 : lock * 0.8} scan={i === PATH[i0] ? 1 - u : 0} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: mix(p0.x, p1.x, u), top: mix(p0.y, p1.y, u), width: CW, height: CH }}>
          <Reticle w={CW} h={CH} k={ramp(t, a + 0.2, a + 0.4)} lock={lock} label={lock > 0.5 ? "TARGET · LAWYER" : undefined} />
        </div>
      </div>
      {/* the comment that gets posted */}
      {t >= send + 0.1 && (
        <div style={{ position: "absolute", right: 120, top: 900, display: "flex", alignItems: "center", gap: 18, direction: "rtl", opacity: ease.out(ramp(t, send + 0.1, send + 0.4)), transform: `translateY(${(1 - ease.outBack(ramp(t, send + 0.1, send + 0.5))) * 40}px)` }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: "linear-gradient(135deg, #3a2a2a, #1a1416)", border: `2px solid ${C.line2}` }} />
          <div style={{ padding: "16px 30px", borderRadius: 28, background: "rgba(28,24,26,.92)", border: `1px solid ${C.line2}`, fontFamily: F.head, fontSize: 52, color: C.cream, textShadow: SD }}>وکیل</div>
          <div style={{ fontFamily: F.ui, fontSize: 40, color: C.red2, transform: `scale(${1 + 0.3 * Math.exp(-(t - send - 0.5) * 6) * (t > send + 0.5 ? 1 : 0)})` }}>♥</div>
        </div>
      )}
      {/* the comment bar */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1130, height: 112, borderRadius: 56, background: "rgba(20,20,26,.9)", border: `2px solid ${t >= K.word - 0.1 && t < send ? C.red : C.line2}`, display: "flex", alignItems: "center", direction: "rtl", padding: "0 18px 0 30px", gap: 20, opacity: ease.out(ramp(t, K.ifLawyer + 0.2, K.ifLawyer + 0.5)) }}>
        <div style={{ flex: 1, fontFamily: F.head, fontSize: 50, color: typed ? C.cream : C.faint }}>
          {typed || "یه کامنت بنویس…"}
          {t >= K.word - 0.1 && t < send && Math.floor(t * 3) % 2 === 0 ? <span style={{ color: C.red2 }}>|</span> : null}
        </div>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: typed ? C.red : "rgba(244,238,230,.12)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.12 * (ramp(t, send - 0.08, send) - ramp(t, send, send + 0.15))})` }}>
          <svg width={38} height={38} viewBox="0 0 24 24">
            <path d="M3 12 L21 3 L14 21 L11 13 Z" fill="#fff" />
          </svg>
        </div>
      </div>
    </>
  );
};

const SCENES: Scene[] = [
  { a: SC.hook[0], b: SC.hook[1], el: (t) => <Whip t={t} a={SC.hook[0]} b={SC.hook[1]} first><Hook t={t} /></Whip> },
  { a: SC.todo[0], b: SC.todo[1], el: (t) => <Whip t={t} a={SC.todo[0]} b={SC.todo[1]}><Todo t={t} /></Whip> },
  { a: SC.hours[0], b: SC.hours[1], el: (t) => <Whip t={t} a={SC.hours[0]} b={SC.hours[1]}><Hours t={t} /></Whip> },
  { a: SC.secs[0], b: SC.secs[1], el: (t) => <Whip t={t} a={SC.secs[0]} b={SC.secs[1]}><Secs t={t} /></Whip> },
  { a: SC.flags[0], b: SC.flags[1], el: (t) => <Whip t={t} a={SC.flags[0]} b={SC.flags[1]}><Flags t={t} /></Whip> },
  { a: SC.sign[0], b: SC.sign[1], el: (t) => <Whip t={t} a={SC.sign[0]} b={SC.sign[1]}><Sign t={t} /></Whip> },
  { a: SC.cta[0], b: SC.cta[1], el: (t) => <Whip t={t} a={SC.cta[0]} b={SC.cta[1]} last><Cta t={t} /></Whip> },
];

export const VerdictNoirAt: React.FC<{ t: number }> = ({ t }) => {
  const capsOn = !CAP_HIDE.some(([a, b]) => t >= a && t < b);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Backdrop t={t} bgs={BGS} />
      <Scenes t={t} scenes={SCENES} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 48%, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />
      {capsOn ? <Captions t={t} caps={CAPS} words={WORDS} /> : null}
      <Grain t={t} />
    </AbsoluteFill>
  );
};

export const VerdictNoirDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useVerdictFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.ink }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <VerdictNoirAt t={t} />
    </TimeCtx.Provider>
  );
};
void Choice;
void faNum;
void DUR;
