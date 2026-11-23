// Atlas Doc — long-form map documentaries for YouTube (16:9): a satellite / vector Atlas with a real camera, Natural
// Earth borders, rivers and lakes, highlighted areas, routes that draw themselves, Persian labels; archive and modern
// footage in one cinematic grade; headlines with a key word, big numbers, chapter cards, quotes, name supers.
export { C, F, W, H, FPS, GRADE, setPalette, clamp, ramp, mix, ease, hash, fa, TimeCtx, useT } from "./lib/theme";
export { docFonts } from "./lib/fonts";
export { Atlas, camAt, toScreen, useTiles, M, Minv, ringsD, lineD, type LL, type Ring, type GeoData, type TileSet, type Cam, type CamKey, type Label, type Route, type Arc, type Marker, type Area, type AtlasProps } from "./lib/atlas";
export { SD, PLATE, env, wipeRTL, wipeLTR, Mark, BrandBug, SourceTag, Kicker, Headline, Key, countUp, BigStat, ChapterCard, QuoteCard, NameSuper, Caption, Grain, EndCard } from "./lib/doc";
export { Clip, Photo, Slot, CineTint, CINE_BLOOM, shotAlpha, type Media, type ClipProps } from "./lib/footage";
export { makeFilm, type Section, type Card, type Brand, type FilmProps } from "./lib/film";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { AtlasDocDemo, MEDIA, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, CARDS, END, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
