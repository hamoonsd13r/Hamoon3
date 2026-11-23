// Noir Panel · demo film. Copy this file + script.ts + media.ts to src/vNN/, change the imports to
// ../styles/noir-panel/lib/…, then swap the lines, the shots (one slot per phrase), the overlays and the end card.
// Layout: one footage window on black; the hook is full frame and settles into the window on line 1.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useNoirFonts } from "../lib/fonts";
import { BigWord, Clock, DayGrid, Dissolve, EndCard, LineChart, Progress, Split, SwapList, YearLine } from "../lib/overlays";
import { Backdrop, Chrome, Footage, Grad, HookTitle, Mark, ShotView, SourceLabel, Subtitle, Window, panelMix, type Media } from "../lib/panel";
import { C, FPS, TimeCtx, easeInOut, ramp } from "../lib/theme";
import { MEDIA } from "./media";
import { BRAND, CHUNKS, K, SHOTS, TAGS, TL } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;
const SPLIT = { t0: S(5), t1: S(6) };
const END = S(7) - 0.1;

export const NoirPanelAt: React.FC<{ t: number; media?: Media }> = ({ t, media = MEDIA }) => {
  const m = panelMix(t, S(1));
  const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1);
  const tag = [...TAGS].reverse().find(([a]) => t >= a)?.[1] ?? "";
  const label = shot ? (media[shot.slot]?.credit ?? shot.label) : undefined;
  const ui = ramp(t, S(1), S(1) + 0.5);
  const learnP = easeInOut(ramp(t, K.learners + 0.2, E(5) + 0.2));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      <Window m={m}>
        {shot && <ShotView key={`${shot.slot}@${shot.t0}`} shot={shot} media={media} t={t} />}
        {shot && <Grad top={0.25} bottom={t < S(1) ? 0.7 : 0.55} />}
        {/* 1 · 200 years: the archive years on a line, then the picture breaks up as the counter runs to today */}
        <Dissolve t={t} at={K.took} until={S(2)} />
        <YearLine t={t} show={[S(1), S(2)]} steps={[[S(1), 1895], [K.machines, 1913]]} run={[K.took, K.took + 0.75, 2026]} range={[1826, 2026]} marks={[1895, 1913, 2026]} />
        {/* 2 · thirty days fill up to payday */}
        <DayGrid t={t} show={[K.every, S(3)]} fill={[K.every, K.pay]} />
        {/* 3 · one big word per job */}
        <BigWord t={t} items={[[K.write, K.design, "WRITING"], [K.design, K.acc, "DESIGN"], [K.acc, S(4), "ACCOUNTING"]]} />
        {/* 4 · old jobs struck out, new ones light up */}
        <SwapList t={t} show={[S(4), S(5)]} title="شغلی که رفت، شغلی که اومد" rows={[["تلفنچی", "پشتیبان آنلاین"], ["تایپیست", "برنامه‌نویس"], ["چراغ‌روشن‌کن خیابون", "برق‌کار"]]} strikeAt={K.went} newAt={K.fresh} top={290} />
        {/* 5 · two kinds of people (the first named sits on the right) */}
        {t >= SPLIT.t0 && t < SPLIT.t1 && (
          <Split
            t={t}
            t0={SPLIT.t0}
            t1={SPLIT.t1}
            rightAt={K.waiters}
            leftAt={K.learners}
            right={{ view: <Footage media={media} slot="waiting" hint="کسی که بی‌حوصله منتظره" t={t} t0={SPLIT.t0} fx={0.45} />, label: "منتظر می‌مونن", extra: <Clock t={t} size={92} /> }}
            left={{ view: <Footage media={media} slot="learning" hint="کسی که با لپ‌تاپ یاد می‌گیره" t={t} t0={SPLIT.t0} fx={0.4} />, label: "یاد می‌گیرن", extra: <Progress p={0.15 + 0.85 * learnP} label="یادگیری" /> }}
          />
        )}
        {/* 6 · a skill that grows month by month */}
        <LineChart t={t} t0={S(6)} t1={END} title="مهارت تو، ماه به ماه" values={[0.08, 0.13, 0.22, 0.38, 0.6, 0.92]} labels={["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"]} badge="رو به رشد ↑" badgeAt={K.freshSkill} note="ILLUSTRATIVE" top={300} />
        {/* 7 · end card */}
        {t >= END && <EndCard t={t} t0={END} mark={(p, g) => <Mark size={190} p={p} glow={g} />} name="آینده‌ی کار" sub={BRAND} button="+ دنبال کن" done="دنبال می‌کنی ✓" pressAt={K.follow} />}
        <SourceLabel text={label} m={m} />
      </Window>
      <HookTitle t={t} out={S(1)} eyebrow="آینده‌ی کار" pre="تا" accent="۵ سال" post="دیگه" tail="کار خیلی‌ها عوض می‌شه" punchAt={K.five} />
      <Chrome tag={tag} brand={BRAND} k={ui * (1 - ramp(t, END, END + 0.3))} />
      <Subtitle t={t} chunks={CHUNKS} from={S(1)} />
    </AbsoluteFill>
  );
};

export const NoirPanelDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useNoirFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <NoirPanelAt t={t} />
    </TimeCtx.Provider>
  );
};
