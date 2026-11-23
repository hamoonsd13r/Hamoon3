// Snow Castle 3D · the compositions. Render with --gl=angle --concurrency=1 --timeout=300000 (one WebGL world per page).
import React from "react";
import { Composition } from "remotion";
import { SnowCastleVideo, type FilmProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/film";

const lookMeta = ({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(props.times?.length ?? 1, props.cams?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    {/* the demo = the accepted film (40 s, silent; the score comes from pipeline/make-music.cjs) */}
    <Composition id="Style-SnowCastle3D" component={SnowCastleVideo} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as FilmProps} />
    {/* one frame per entry of `times` (film seconds) or `cams` (free cameras) */}
    <Composition id="Style-SnowCastle3D-Look" component={SnowCastleVideo} durationInFrames={LOOK.length} fps={FPS} width={1920} height={1080} defaultProps={{ times: LOOK } as FilmProps} calculateMetadata={lookMeta} />
    {/* 4K master: supersampled 1.5× inside (5760×3240); needs a GPU with ≥ 8 GB. Weaker card: --props='{"ss":1}' */}
    <Composition id="Style-SnowCastle3D-4K" component={SnowCastleVideo} durationInFrames={FRAMES} fps={FPS} width={3840} height={2160} defaultProps={{ ss: 1.5 } as FilmProps} />
  </>
);
