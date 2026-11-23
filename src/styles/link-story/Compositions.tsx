// Link Story · the compositions this style registers (the tunnel uses three.js → --gl=angle --concurrency=1).
//   Style-LinkStory              9:16, 20 s: a sentence typed → an editor assembles itself → features → hush → «ثبت‌نام شروع شد!»
//   Style-LinkStory-Tunnel       the same story flying through a 3D tunnel of reels
//   …-Look                       props { times: number[] } → one frame per entry
// The Instagram link sticker sits on BOX (centre 540,1500 · 780×176) the whole time; nothing else goes below 1365.
import React from "react";
import { Composition } from "remotion";
import { FilmA } from "./demo/FilmA";
import { FilmB } from "./demo/FilmB";
import { FPS, FRAMES, H, W } from "./lib/theme";

export const LOOK = [0.3, 2.2, 3.6, 5.0, 6.3, 7.9, 9.4, 11.0, 12.9, 14.9, 16.2, 19.6];
type P = { times?: number[]; audio?: string };
const meta = ({ props }: { props: P }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-LinkStory" component={FilmA} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as P} />
    <Composition id="Style-LinkStory-Look" component={FilmA} durationInFrames={LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ times: LOOK } as P} calculateMetadata={meta} />
    <Composition id="Style-LinkStory-Tunnel" component={FilmB} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as P} />
    <Composition id="Style-LinkStory-Tunnel-Look" component={FilmB} durationInFrames={LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ times: LOOK } as P} calculateMetadata={meta} />
  </>
);
