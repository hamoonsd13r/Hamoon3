// Shader Transitions · the compositions this style registers.
//   Style-ShaderTransitions        9:16, 20 s: twelve GLSL transitions between seven photos, each one named on screen
//   Style-ShaderTransitions-Look   props { times: number[] } → one frame per entry (default: mid-transition stills)
import React from "react";
import { Composition } from "remotion";
import { DUR, FPS, LOOK, TransitionReel } from "./demo/Video";

type Props = { times?: number[] };
const meta = ({ props }: { props: Props }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-ShaderTransitions" component={TransitionReel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{} as Props} />
    <Composition id="Style-ShaderTransitions-Look" component={TransitionReel} durationInFrames={LOOK.length} fps={FPS} width={1080} height={1920} defaultProps={{ times: LOOK } as Props} calculateMetadata={meta} />
  </>
);
