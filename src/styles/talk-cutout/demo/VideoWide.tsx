// Talk Cutout · the landscape demo film (1920×1080, 30 fps): she stays centred, cards beside her in two columns (behind
// her cut-out), full-screen windows for the method (the camcorder «films a screen»), a tape glitch on every cut in or out
// of them, captions bottom centre. Same script and words as the vertical demo.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../lib/theme";
import { TimeCtx, clamp, kf, punch } from "../lib/time";
import { useTalkFonts } from "../lib/fonts";
import { MediaCtx } from "../lib/media";
import { TalkStage } from "../lib/talk";
import { CapsWide } from "../lib/captions";
import { Rec, TapeCut } from "../lib/wide";
import { Grain } from "../lib/fx";
import { FPS, T, TAKES } from "./script";
import { CAPS } from "./captions";
import { MEDIA, SRC } from "./media";
import { EndCardWide, WideBehind, poseWide } from "./wide/talk";
import { FullScreenWide } from "./wide/fs";
import { END_CARD, FS_CUTS, inFS } from "./wide/cues";
import type { FilmProps } from "./Video";

/** slow push-ins that follow her story (≤ 6 %, about her face); each section breathes back to 1.0 */
const talkScale = (t: number) =>
  kf(t, [[0, 1.05], [0.5, 1.0], [TAKES.B - 0.04, 1.03], [TAKES.B, 1.0], [T.steps, 1.02], [T.talk2, 1.05], [T.talk2 + 0.6, 1.0], [T.kalame - 0.3, 1.03], [T.kalame, 1.0], [END_CARD, 1.04]]) +
  0.016 * punch(t, T.har3, 6) + 0.02 * punch(t, T.se, 7) + 0.012 * punch(t, T.comment, 7);

export const TalkCutoutWide: React.FC<FilmProps> = ({ times, caps = true }) => {
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const ready = useTalkFonts();
  const fs = inFS(t);
  const endCard = t >= END_CARD + 0.2;
  const s = talkScale(t);
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <MediaCtx.Provider value={MEDIA}>
        <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
          {ready ? (
            <>
              <TalkStage
                on={fs ? 0 : 1}
                scale={s}
                origin="960px 430px"
                dim={0.5 * clamp((t - END_CARD) / 0.4)}
                fg
                src={{ ...SRC, w: 1920, h: 1080 }}
                pose={poseWide(t)}
                W={1920}
                H={1080}
                behind={<WideBehind t={t} />}
              />
              {/* the camcorder REC over her picture (it follows her push-ins); the stage draws its own */}
              {!fs ? <Rec t={t} scale={s} /> : null}
              {fs ? <FullScreenWide t={t} /> : null}
              <EndCardWide t={t} />
              <TapeCut t={t} cuts={FS_CUTS} />
              {caps ? <CapsWide t={t} caps={CAPS} solid={fs || endCard} y={endCard ? 990 : 968} /> : null}
            </>
          ) : null}
          <Grain t={t} a={0.022} />
        </AbsoluteFill>
      </MediaCtx.Provider>
    </TimeCtx.Provider>
  );
};
