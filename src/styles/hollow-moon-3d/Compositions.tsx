// Hollow Moon 3D · the compositions. Render with --gl=angle --concurrency=1 --timeout=300000 (one WebGL world per page).
// First run: node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs && npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts
import React from "react";
import { Composition } from "remotion";
import { HollowMoonVideo, type FilmProps } from "./demo/Video";
import { LogoCard, type LogoCardProps } from "./demo/LogoCard";
import { FPS, FRAMES, LOOK } from "./demo/film";

const lookMeta = ({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(props.times?.length ?? 1, props.cams?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    {/* the demo = the accepted film (35 s, silent; your song + the storm come from pipeline/build-audio.cjs) */}
    <Composition id="Style-HollowMoon3D" component={HollowMoonVideo} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as FilmProps} />
    {/* one frame per entry of `times` (film seconds) or `cams` (free cameras) */}
    <Composition id="Style-HollowMoon3D-Look" component={HollowMoonVideo} durationInFrames={LOOK.length} fps={FPS} width={1920} height={1080} defaultProps={{ times: LOOK } as FilmProps} calculateMetadata={lookMeta} />
    {/* 4K master (internal 3840×2160): GPU with ≥ 8 GB */}
    <Composition id="Style-HollowMoon3D-4K" component={HollowMoonVideo} durationInFrames={FRAMES} fps={FPS} width={3840} height={2160} defaultProps={{ ss: 1 } as FilmProps} />
    {/* a text logo on a transparent card → PNG → tools/logo-trace.mjs (for a brand with no logo file) */}
    <Composition id="Style-HollowMoon3D-LogoCard" component={LogoCard} durationInFrames={1} fps={FPS} width={2000} height={670} defaultProps={{ main: "YOUR BRAND", sub: "STUDIO", accent: "#FF5A1F" } as LogoCardProps} />
  </>
);
