// Archive Doc — archival documentaries (YouTube long-form, 16:9) in warm black-and-white: archival clips and photos
// cut on the narration with pushes and dissolves, film texture, captions typed like a report, name supers, title and
// chapter cards, report sketches on aged paper (tokens, trails, typed labels), spec sheets that compare, dossier cards.
export { C, F, W, H, FPS, GRADE, setPalette, clamp, ramp, mix, ease, hash, noise1, fa, TimeCtx, useT } from "./lib/theme";
export { archiveFonts } from "./lib/fonts";
export { Grain, Dust, weave, flicker, FrameVignette } from "./lib/fx";
export { Picture, Slot, type Shot, type Media, type SceneFn } from "./lib/picture";
export { Caption, NameSuper, Chapter, Title, EndCard, Typed, PLATE, SD, fade } from "./lib/ui";
export { ReportSheet, Lbl, Grass, Dune, Token, Trail, INK, INK2, RED, BRASS, type Pt } from "./lib/report";
export { SpecSheet, Dossier, type SpecSide, type SpecRow } from "./lib/spec";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { ArchiveDocDemo, MEDIA, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SHOTS, TYPE, SC, LOOK, FRAMES, DUR, END_A } from "./demo/script";
export { Compositions } from "./Compositions";
