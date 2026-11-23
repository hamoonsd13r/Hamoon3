// Talk Page — the compositions of the style (registered by the kit's Root and by src/index-kit-talk-page.ts).
//   Style-TalkPage            the demo: placeholder speaker + the paper page, 30 fps, 1080 × 1920, 40.8 s
//   Style-TalkPage-Look       the same, one frame per entry of props.times
//   Style-TalkPage-Overlay    only the band y ≥ OV_Y, transparent — what you really render for your own video
//   Style-TalkPage-Strips     variant: torn strips with redaction bars (9.6 s)
//   Style-TalkPage-Silver     variant: white stage, heavy italic, silver spheres (9.6 s)
//   Style-TalkPage-Card       variant: a printed card on the table (9.6 s)
// Every one takes {times} for Look stills (calculateMetadata sets the length) and {overlay: true} for the band.
import React from "react";
import { Composition } from "remotion";
import { DEMO_DUR, DEMO_LOOK, TalkPageDemo } from "./demo/Video";
import { CardDemo, SilverDemo, StripsDemo, VAR_DUR } from "./demo/variants";
import type { TalkFilmProps } from "./lib/film";
import { FPS, H, OV_Y, W } from "./lib/theme";

const meta = (dur: number) => ({ props }: { props: TalkFilmProps }) => ({ durationInFrames: props.times?.length ? props.times.length : Math.round(dur * FPS) });
const none = {} as TalkFilmProps;

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-TalkPage" component={TalkPageDemo} durationInFrames={Math.round(DEMO_DUR * FPS)} fps={FPS} width={W} height={H} defaultProps={none} calculateMetadata={meta(DEMO_DUR)} />
    <Composition id="Style-TalkPage-Look" component={TalkPageDemo} durationInFrames={DEMO_LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ times: DEMO_LOOK } as TalkFilmProps} calculateMetadata={meta(DEMO_DUR)} />
    <Composition id="Style-TalkPage-Overlay" component={TalkPageDemo} durationInFrames={Math.round(DEMO_DUR * FPS)} fps={FPS} width={W} height={H - OV_Y} defaultProps={{ overlay: true, ovY: OV_Y } as TalkFilmProps} />
    <Composition id="Style-TalkPage-Strips" component={StripsDemo} durationInFrames={Math.round(VAR_DUR * FPS)} fps={FPS} width={W} height={H} defaultProps={none} calculateMetadata={meta(VAR_DUR)} />
    <Composition id="Style-TalkPage-Silver" component={SilverDemo} durationInFrames={Math.round(VAR_DUR * FPS)} fps={FPS} width={W} height={H} defaultProps={none} calculateMetadata={meta(VAR_DUR)} />
    <Composition id="Style-TalkPage-Card" component={CardDemo} durationInFrames={Math.round(VAR_DUR * FPS)} fps={FPS} width={W} height={H} defaultProps={none} calculateMetadata={meta(VAR_DUR)} />
  </>
);
