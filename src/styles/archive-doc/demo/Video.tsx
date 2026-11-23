// Archive Doc · demo film «اولین پرواز» (16:9, ~55 s excerpt, silent: estimated narration timing). The picture track
// (archival clips and photos — labelled slots until you map your files), two report sketches on paper (the first
// flight, then all four), a spec sheet, and the type on top: captions typed like a report, a name super, the title,
// two chapter cards, the end card. Film texture (weave, flicker, dust, grain) over everything.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Dust, Grain } from "../lib/fx";
import { archiveFonts } from "../lib/fonts";
import { Picture, type Media, type SceneFn } from "../lib/picture";
import { Dune, Grass, INK, INK2, Lbl, RED, ReportSheet, Token, Trail, type Pt } from "../lib/report";
import { SpecSheet } from "../lib/spec";
import { C, FPS, H, TimeCtx, W, ease, ramp } from "../lib/theme";
import { Caption, Chapter, EndCard, NameSuper, Title } from "../lib/ui";
import { DUR, END_A, SC, SHOTS, TYPE } from "./script";

/** your files (public/…): clips { src, dur, ar }, photos { src, dur: 0, ar } — empty = labelled slots */
export const MEDIA: Media = {};

// ── the report sketch: the field at Kill Devil Hills, north up; 1 m ≈ 3 px (the scale bar says 100 m = 300 px) ──
const RAIL: Pt[] = [[960, 990], [960, 935]];
const FLIGHTS: { pts: Pt[]; label: string; a: number; len: number; lx: number; ly: number; anchor: "start" | "end" }[] = [
  { pts: [[960, 935], [962, 880], [958, 824]], label: "۱ · ۱۲ ثانیه · ۳۷ متر", a: SC.m37 - 0.4, len: 1.0, lx: 905, ly: 832, anchor: "start" },
  { pts: [[984, 935], [990, 860], [986, 776]], label: "۲ · ۵۳ متر", a: SC.four + 0.2, len: 0.7, lx: 1045, ly: 784, anchor: "end" },
  { pts: [[936, 935], [928, 850], [934, 752]], label: "۳ · ۶۱ متر", a: SC.four + 0.7, len: 0.7, lx: 880, ly: 742, anchor: "start" },
  { pts: [[1008, 935], [1030, 700], [1010, 420], [1040, 155]], label: "۴ · ۵۹ ثانیه · ۲۶۰ متر", a: SC.m260 - 0.9, len: 1.6, lx: 1100, ly: 166, anchor: "end" },
];
const Field: React.FC<{ t: number; a: number; upTo: number }> = ({ t, a, upTo }) => (
  <>
    <Dune cx={560} cy={560} rx={260} ry={190} n={5} seed={2} />
    <Dune cx={1460} cy={360} rx={200} ry={140} n={4} seed={5} o={0.7} />
    <Grass x0={1180} y0={820} x1={1600} y1={1040} n={120} seed={3} o={0.7} />
    <Grass x0={300} y0={820} x1={760} y1={1040} n={110} seed={9} o={0.7} />
    <path d="M200,1060 C600,1040 1300,1070 1760,1050" fill="none" stroke={INK2} strokeWidth={3} strokeDasharray="14 9" />
    {/* the launching rail */}
    <path d={`M${RAIL[0][0]},${RAIL[0][1]} L${RAIL[1][0]},${RAIL[1][1]}`} stroke={INK} strokeWidth={6} />
    {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={950} x2={970} y1={990 - i * 11} y2={990 - i * 11} stroke={INK} strokeWidth={2} />)}
    <Token kind="house" x={1330} y={1000} s={1.2} />
    <Token kind="house" x={1410} y={990} s={0.9} />
    {/* wind from the north */}
    {[0, 1, 2].map((i) => <Trail key={i} pts={[[1640 + i * 50, 120], [1640 + i * 50, 300]]} u={ease.out(ramp(t, a + 0.4 + i * 0.15, a + 1.4 + i * 0.15))} color={INK2} width={2.4} dash="12 8" />)}
    <Lbl x={1690} y={340} s="بادِ سردِ شمالی" u={ramp(t, a + 1.0, a + 2.0)} size={24} color={INK2} />
    <Lbl x={560} y={560} s="تپه‌ی کیل دویل" u={ramp(t, a + 0.6, a + 1.6)} size={26} color={INK2} />
    <Lbl x={1370} y={1060} s="اردوگاه" u={ramp(t, a + 0.8, a + 1.6)} size={24} color={INK2} />
    <Lbl x={935} y={1000} s="ریلِ پرتاب · ۱۸ متر" u={ramp(t, a + 0.3, a + 1.2)} size={24} color={INK} anchor="start" />
    {FLIGHTS.slice(0, upTo).map((f, i) => {
      const u = ease.inOut(ramp(t, f.a, f.a + f.len));
      const last = f.pts[f.pts.length - 1];
      return (
        <g key={i}>
          <Trail pts={f.pts} u={u} color={i === 3 ? RED : INK} width={i === 3 ? 4 : 3} dash={i === 3 ? undefined : "10 7"} />
          {u >= 1 ? <Token kind="plane" x={last[0]} y={last[1] - 26} s={0.55} side={i === 3 ? "them" : "us"} /> : null}
          <Lbl x={f.lx} y={f.ly} s={f.label} u={ramp(t, f.a + f.len * 0.6, f.a + f.len * 0.6 + 0.8)} size={i === 3 ? 30 : 24} color={i === 3 ? RED : INK} anchor={f.anchor} />
        </g>
      );
    })}
  </>
);

const SCENES: Record<string, SceneFn> = {
  // the chapter pause: a dark frame so the chapter card never sits on another drawing
  dark: () => <div style={{ position: "absolute", inset: 0, background: C.ink }} />,
  report1: (t, a, b) => (
    <ReportSheet t={t} a={a} b={b} header="گزارشِ روز · کیل دویل هیلز · ۱۷ دسامبر ۱۹۰۳" scalePx={300} view={[960, 880, 1.55]}>
      <Field t={t} a={a} upTo={1} />
    </ReportSheet>
  ),
  report2: (t, a, b) => {
    const z = 1.55 - 0.6 * ease.inOut(ramp(t, a + 0.2, SC.last));
    const cy = 880 - 330 * ease.inOut(ramp(t, a + 0.2, SC.last));
    return (
      <ReportSheet t={t} a={a} b={b} header="گزارشِ روز · چهار پرواز · ۱۷ دسامبر ۱۹۰۳" scalePx={300} view={[980, cy, z]}>
        <Field t={t} a={a - 3} upTo={4} />
      </ReportSheet>
    );
  },
  spec: (t, a, b) => (
    <SpecSheet
      t={t}
      a={a}
      b={b}
      media={MEDIA}
      sides={[{ img: "flyer-photo", name: "رایت فلایر", sub: "۱۹۰۳ · چوب صنوبر و پارچه", hint: "عکس هواپیمای ۱۹۰۳ (حوزه‌ی عمومی)" }]}
      rows={[
        { at: SC.engine + 0.2, label: "موتور", values: ["۱۲ اسب بخار · بدنه‌ی آلومینیومی"] },
        { at: SC.wing + 0.2, label: "پهنای بال", values: ["۱۲٫۳ متر"] },
        { at: SC.weight, label: "وزن", values: ["حدود ۲۷۰ کیلو"] },
      ]}
    />
  ),
};

export type DemoProps = { times?: number[] };
export const ArchiveDocDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("archive-doc fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    archiveFonts().then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  const t = times ? (times[Math.min(frame, times.length - 1)] ?? 0) : frame / FPS;
  if (!ready) return <AbsoluteFill style={{ background: C.ink }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: C.ink }}>
        <Picture t={t} shots={SHOTS} dur={DUR} media={MEDIA} scenes={SCENES} />
        <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(120% 100% at 50% 48%, transparent 58%, rgba(0,0,0,0.5) 100%)" }} />
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Dust t={t} w={W} h={H} amount={0.55} />
        </svg>
        <Grain t={t} a={0.06} />
        {TYPE.map((x, i) => {
          if (x.kind === "cap") return <Caption key={i} t={t} a={x.a} b={x.b} place={x.s} when={x.s2} />;
          if (x.kind === "name") return <NameSuper key={i} t={t} a={x.a} b={x.b} name={x.s} role={x.s2 ?? ""} />;
          if (x.kind === "chapter") return <Chapter key={i} t={t} a={x.a} b={x.b} n={x.s2 ?? ""} name={x.s} />;
          return <Title key={i} t={t} a={x.a} b={x.b} title={x.s} sub={x.s2 ?? ""} />;
        })}
        <EndCard t={t} a={END_A} title="اولین پرواز" lines={["فیلم‌ها و عکس‌های آرشیوی: کتابخانه‌ی کنگره و اسمیتسونین (حوزه‌ی عمومی)", "عددها: پرونده‌های رسمیِ هواپیمای رایت، ۱۹۰۳"]} credit="YOUR BRAND" />
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};
