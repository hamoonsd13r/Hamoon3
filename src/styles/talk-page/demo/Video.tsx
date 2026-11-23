// Talk Page demo — the film components. One layer (DemoBeats) seen three ways (see lib/film.tsx):
//   TalkPageDemo with no props        → full frame: placeholder (or your talk proxy) + the page
//   TalkPageDemo { times: [...] }     → Look stills
//   TalkPageDemo { overlay: true }    → the transparent band you render as ProRes 4444 and lay on the original
import React from "react";
import { TalkFilm, TalkFilmProps } from "../lib/film";
import { DEMO_DUR, DemoBeats } from "./beats";
import { MEDIA } from "./media";

export { DEMO_DUR };
/** key moments (hook, every section, the call, the end) — one Look still each */
export const DEMO_LOOK = [0.0, 1.2, 2.7, 3.95, 5.6, 7.3, 8.4, 10.5, 12.9, 15.0, 17.8, 20.4, 22.2, 23.6, 24.6, 25.4, 27.2, 29.0, 31.0, 33.0, 34.8, 36.2, 37.6, 38.9, 40.2];

export const TalkPageDemo: React.FC<TalkFilmProps> = (p) => (
  <TalkFilm talk={MEDIA.talk} phoneLit={[24.8, 25.95]} {...p}>
    <DemoBeats />
  </TalkFilm>
);
