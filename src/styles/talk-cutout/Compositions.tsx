// Talk Cutout · compositions. Style-TalkCutout = the vertical demo (silent; a neutral sample script on a placeholder
// subject — map your own takes in demo/media.ts). Style-TalkCutout-Wide = the landscape variant. -Look = one frame per
// entry of `times` (film seconds): --props='{"times":[1.2,5.4]}' or a props file; without props: the key moments.
import React from "react";
import { Composition } from "remotion";
import { TalkCutoutFilm, type FilmProps } from "./demo/Video";
import { FPS, FRAMES, LOOK_TIMES } from "./demo/script";
import { TalkCutoutWide } from "./demo/VideoWide";
import { WIDE_FRAMES, WIDE_LOOK } from "./demo/wide/cues";

const lookMeta = ({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-TalkCutout" component={TalkCutoutFilm} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as FilmProps} />
    <Composition id="Style-TalkCutout-Look" component={TalkCutoutFilm} durationInFrames={LOOK_TIMES.length} fps={FPS} width={1080} height={1920} defaultProps={{ times: LOOK_TIMES } as FilmProps} calculateMetadata={lookMeta} />
    <Composition id="Style-TalkCutout-Wide" component={TalkCutoutWide} durationInFrames={WIDE_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as FilmProps} />
    <Composition id="Style-TalkCutout-Wide-Look" component={TalkCutoutWide} durationInFrames={WIDE_LOOK.length} fps={FPS} width={1920} height={1080} defaultProps={{ times: WIDE_LOOK } as FilmProps} calculateMetadata={lookMeta} />
  </>
);
