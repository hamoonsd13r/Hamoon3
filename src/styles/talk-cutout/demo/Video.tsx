// Talk Cutout · the vertical demo film (1080×1920, 30 fps). Her own video (TALK) for the hook and the CTA, with cards
// BEHIND her and the comment/DM IN FRONT; full-screen motion for the steps (YouTube → AI → stats), on a backdrop that
// changes its light per section. Step slams, a soft vignette and the captions sit on top. Rendered silent; the mix is
// muxed afterwards (tools/finalize.mjs; pipeline/README.md step 9). Every frame is a pure function of film time (Look: one frame per `times`).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, SECTION } from "../lib/theme";
import { TimeCtx, clamp, ease, jolt, kf, punch, win } from "../lib/time";
import { useTalkFonts } from "../lib/fonts";
import { MediaCtx } from "../lib/media";
import { TalkStage } from "../lib/talk";
import { Backdrop } from "../lib/backdrop";
import { StepSlams } from "../lib/kinetic";
import { Captions, capAt } from "../lib/captions";
import { Grain, Vignette } from "../lib/fx";
import { B, DM_AT, FPS, T, TAKES } from "./script";
import { CAPS } from "./captions";
import { MEDIA, SRC } from "./media";
import { HookBehind, poseOf } from "./scenes/hook";
import { PhoneFlow } from "./scenes/phone";
import { TabletScene } from "./scenes/tablet";
import { ProofScene } from "./scenes/proof";
import { CtaBehind, CtaFront, DmThread } from "./scenes/cta";

export type FilmProps = { times?: number[]; caps?: boolean };

const fadeIn = (t: number, a: number, d: number) => ease.out(clamp((t - a) / d));
const fadeOut = (t: number, b: number, d: number) => 1 - ease.in(clamp((t - (b - d)) / d));

/** the punch-in camera on her (about her face). Pushes stay ≤ 1.035 while something sits in the band above her head;
 *  every jump cut resets it (a cut is instant: two keys a frame apart). */
const talkScale = (t: number) => {
  const base = kf(t, [
    [0, 1.04], [0.4, 1.0], [TAKES.B - 0.04, 1.025], [TAKES.B, 1.0], [T.steps - 0.2, 1.02],
    [T.talk2, 1.045], [T.talk2 + 0.55, 1.0], [T.kalame - 0.4, 1.02], [T.kalame, 1.0], [DM_AT + 1, 1.0],
  ]);
  return base + 0.01 * punch(t, T.har1, 7) + 0.01 * punch(t, T.har2, 7) + 0.012 * punch(t, T.har3, 7) + 0.012 * punch(t, T.se, 7) + 0.012 * punch(t, T.ghadam5, 7) + 0.012 * punch(t, T.comment, 7);
};
/** the cut-out is decoded only while something sits behind her (the alpha video costs render time) */
const FG: [number, number][] = [[0, T.steps + 0.2], [T.talk2 - 0.3, DM_AT + 0.5]];

const BG = [
  { at: 0, ...SECTION.youtube, word: "YOUTUBE · RESEARCH" },
  { at: T.ide - 0.1, ...SECTION.ai, word: "AI · SCRIPT" },
  { at: T.har4 - 0.1, ...SECTION.publish, word: "PUBLISH · WEEKLY" },
  { at: DM_AT - 0.6, ...SECTION.cta, word: "COMMENT · DIRECT" },
];

export const TalkCutoutFilm: React.FC<FilmProps> = ({ times, caps = true }) => {
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const ready = useTalkFonts();
  // TALK windows and their transitions: a zoom-blur out into the motion after the hook, a zoom back in on her next take
  const talkOn = t < T.steps + 0.18 ? fadeOut(t, T.steps + 0.18, 0.2) : t < T.talk2 - 0.25 ? 0 : fadeIn(t, T.talk2 - 0.25, 0.3);
  const zOut = t < T.talk2 ? clamp((t - (T.steps - 0.06)) / 0.24) : 0;
  const zIn = t >= T.talk2 - 0.3 && t < T.talk2 + 0.35 ? 1 - clamp((t - (T.talk2 - 0.25)) / 0.55) : 0;
  const dim = clamp((t - (DM_AT - 0.05)) / 0.45);
  // captions: y 1478 everywhere (soft plate on her, solid plate on the motion); on her collar while the sheet is up.
  // Decided per chunk (by its start), so a phrase never jumps at a cut.
  const cur = capAt(CAPS, t);
  const herAt = (a: number) => a < T.steps - 0.1 || (a >= T.talk2 - 0.1 && a < DM_AT - 0.1);
  const sheetAt = (a: number) => a >= T.kalame - 0.1 && a < T.directet - 0.3;
  const onHer = cur ? herAt(cur.a) : talkOn >= 0.5 && t < DM_AT - 0.1;
  const high = cur ? sheetAt(cur.a) : sheetAt(t);
  const solid = !onHer && (cur ? cur.a < T.talk2 - 0.1 : talkOn < 0.5);
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <MediaCtx.Provider value={MEDIA}>
        <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
          {ready ? (
            <>
              {talkOn < 1 ? <Backdrop t={t} sections={BG} pulse={B.barPulse(t, 3)} /> : null}
              {win(t, T.steps - 0.12, T.step3 + 0.3) ? (
                <div style={{ position: "absolute", inset: 0, opacity: fadeIn(t, T.steps - 0.12, 0.22) * fadeOut(t, T.step3 + 0.3, 0.25) }}>
                  <PhoneFlow t={t} />
                </div>
              ) : null}
              {win(t, T.ide - 0.08, T.har4 + 0.1) ? (
                <div style={{ position: "absolute", inset: 0, opacity: fadeIn(t, T.ide - 0.08, 0.2) * fadeOut(t, T.har4 + 0.1, 0.22) }}>
                  <TabletScene t={t} />
                </div>
              ) : null}
              {win(t, T.har4 - 0.12, T.talk2 + 0.1) ? (
                <div style={{ position: "absolute", inset: 0, opacity: fadeIn(t, T.har4 - 0.12, 0.25) * fadeOut(t, T.talk2 + 0.1, 0.3) }}>
                  <ProofScene t={t} />
                </div>
              ) : null}
              <TalkStage
                on={talkOn}
                scale={talkScale(t) * (1 + 0.5 * zOut) * (1 + 0.22 * zIn)}
                origin="540px 600px"
                shake={jolt(t, T.se, 5, 30, 9) + jolt(t, T.har3, 4, 30, 9)}
                blur={zOut * 14 + zIn * 10}
                dim={dim}
                fg={FG.some(([a, b]) => t >= a && t < b)}
                src={SRC}
                pose={poseOf(t)}
                behind={
                  <>
                    <HookBehind t={t} />
                    <CtaBehind t={t} />
                  </>
                }
                front={
                  <>
                    <CtaFront t={t} />
                    <DmThread t={t} />
                  </>
                }
              />
              {/* no «قدم N/3» corner badge here: the phone and the tablet fill the frame and an app header would sit under it */}
              <StepSlams t={t} at={[T.steps, T.step2, T.step3]} end={T.har4 - 0.1} badge={null} />
              <Vignette a={0.42} />
              {caps ? <Captions t={t} caps={CAPS} y={high ? 985 : 1478} plate={high ? 150 : 300} solid={solid} /> : null}
            </>
          ) : null}
          <Grain t={t} a={0.03} />
        </AbsoluteFill>
      </MediaCtx.Provider>
    </TimeCtx.Provider>
  );
};
