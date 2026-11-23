// The demo film on the style's film component (lib/kit/film.tsx): the sea world, the shot list (story.ts), the post
// chain (render -> ink -> lens blur -> bloom + Neutral tone + grade + grain), dissolves as two canvases (one world
// each), Persian captions above the phone UI, Look stills, framing QA and the plan pass for the pipeline tools.
//   DemoFilm      the whole film (silent: sound is mixed apart, then tools/finalize.mjs muxes it)
//   DemoFilmLook  stills: frame i renders the film at times[i] (props {"times":[...]}; {"qa":true} prints QA lines)
import { makeFilm } from "../lib/kit/film";
import { SeaWorld, type FrameDef } from "../lib/sea/world";
import { GRADES, mixGrade } from "../lib/sea/lights";
import { TOTAL, FPS, frameDef, layersAt, CUES_ALL } from "./story";
import { cardAt } from "./timing";
import { CAPTION, CAPTION_FONT, accentWords } from "../lib/theme";

type Grade = (typeof GRADES)[keyof typeof GRADES];
const F = makeFilm<FrameDef, Grade>({
  name: "toon3d-demo",
  world: () => new SeaWorld(),
  frameDef, layersAt, total: TOTAL, fps: FPS,
  grade: (def) => (def.light2 ? mixGrade(GRADES[def.light], GRADES[def.light2], def.lightK ?? 0) : GRADES[def.light]),
  gradeInit: GRADES.galley,
  cardAt,
  cues: CUES_ALL,
  // OFL caption font (public/fonts; the canvas labels in the world use the same family); the twist words in the accent
  fonts: [CAPTION_FONT],
  caption: { ...CAPTION, node: accentWords(["کشتیه", "سوپشه"]) },
});
export const DemoFilm = F.Film;
export const DemoFilmLook = F.FilmLook;
export const DEMO_FRAMES = F.FRAMES;
export const DEMO_FPS = FPS;
export const demoLookMetadata = F.lookMetadata;
/** the key moments the Look composition renders by default (= the preview sheet: hook, swing, shock, porthole, dissolve,
 *  sea + lightning, roll, the twist, the walk-off, the lamp insert, the punchline) */
export const DEMO_LOOK = [0.3, 1.9, 6.0, 7.9, 8.72, 9.6, 11.2, 15.9, 16.6, 19.0, 23.0, 25.3];
