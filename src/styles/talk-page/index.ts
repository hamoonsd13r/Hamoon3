// Talk Page — a printed paper page in the lower third of YOUR OWN vertical to-camera video: running header, one-line
// English (or Persian) headline with timed pen marks, a content zone (figures = your clips printed on paper, pen charts,
// checklists, maps, a call card…). Only the band is rendered (transparent ProRes) and laid on the original video with
// ffmpeg; the voice stays untouched, the music sits at one steady level.
// Card: styles/talk-page.md · demo: Style-TalkPage · stills: Style-TalkPage-Look · the band: Style-TalkPage-Overlay
export * from "./lib/theme";
export * from "./lib/time";
export { useTalkPageFonts } from "./lib/fonts";
export { Chip, Figure, FIBERS, GRAIN, Head, Page, paperBg, Running, Slot, useGeo, Zone } from "./lib/page";
export type { Cam, Geo, Shot, Wd } from "./lib/page";
export { Arrow, bez, Count, DashPoly, In, Note, Ring, Stamp, Stroke, Svg, Tag, Tick, Typed } from "./lib/pen";
export {
  BarChart,
  CallCard,
  CARD,
  Checklist,
  CommentSheet,
  DotMap,
  envLevel,
  Flow,
  LineChart,
  Meter,
  PenClock,
  Person,
  PhoneRing,
  Player,
  Quote,
  Row,
  Search,
  Steps,
  Verdict,
  VoiceWave,
} from "./lib/elements";
export type { Bar, CallLine, CheckItem, FlowNode, Site } from "./lib/elements";
export { Guides, PHONE, PlaceholderSubject, TalkVideo } from "./lib/subject";
export { TalkFilm } from "./lib/film";
export type { TalkFilmProps } from "./lib/film";
export { DEMO_DUR, DEMO_LOOK, TalkPageDemo } from "./demo/Video";
export { Compositions } from "./Compositions";
