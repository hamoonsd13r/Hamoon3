// Light Swarm Epic · the compositions this style registers (WebGL: --gl=angle --concurrency=1).
//   Style-LightSwarmEpic        16:9, 60 s demo: a long music film of light — the swarm morphs on the song grid (seed,
//                               galaxy, brain, a page, a painted wave, code, notes, a lighthouse from a prompt, a word,
//                               the logo, a rocket), words slam on the beats, a countdown runs to zero, «WE'RE LIVE»
//   Style-LightSwarmEpic-Look   props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { LOOK, LightSwarmEpic } from "./demo/Video";
import { DUR } from "./demo/score";
import { FPS } from "./lib/theme";

type Props = { times?: number[]; audio?: string; from?: number };
const meta = ({ props }: { props: Props }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-LightSwarmEpic" component={LightSwarmEpic} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{} as Props} />
    <Composition id="Style-LightSwarmEpic-Look" component={LightSwarmEpic} durationInFrames={LOOK.length} fps={FPS} width={1920} height={1080} defaultProps={{ times: LOOK } as Props} calculateMetadata={meta} />
  </>
);
