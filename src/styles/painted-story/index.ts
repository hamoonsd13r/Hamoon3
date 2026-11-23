// Painted Story — narrated stories / docs built from AI-painted plates (one per beat, one consistent character),
// moved by code. Public API: the film engine, the camera, atmosphere, the two card families, captions, the clock.
export { StoryFilm, partFrames, type Shot, type StillFx, type StoryProps, type StorySpec } from "./lib/film";
export { Still, World, Cut, camAt, type Cam, type Key } from "./lib/camera";
export { Fog, Drip, Glow, Rain, Streaks, Steam, Static, TV, Peep, Night, LampOff, RadioWave, CCTV, Grain, Vignette, flicker, breathe } from "./lib/atmos";
export { Digits, Mixed, DayCard, TopChip, TimeChip, rollTime, Quote, RulesList, Tank, TickList, EndCard, PartTitle } from "./lib/doc-cards";
export { LogDayCard, Hud, hideIn, Panel, Checklist, FormField, RuleSheet, FloorPlan, KnockCode, Tally, Measure, PlateNum, FingerTrail, DoorShadows, TallEndCard } from "./lib/tale-cards";
export { Captions, makeChunks, type CapChunk } from "./lib/captions";
export { makeClock, bare, type Clock, type VoJson, type VoWord, type VoSeg } from "./lib/clock";
export { MEDIA, ARCH_INFO, ArchClip, Slot } from "./lib/media";
export { NIGHT_DOC, FOREST_WARD, WARD_PALETTE, SAFE, ThemeCtx, useTheme, type Theme } from "./lib/theme";
export { F, fontsReady, useStoryFonts } from "./lib/fonts";
export { clamp, ramp, mix, ease, sine, fade, hash, noise1, pulseAt, TimeCtx, useT } from "./lib/time";
export { DocDemo, DOC_SPEC } from "./demo/doc/Video";
export { TaleDemo, TALE_SPEC } from "./demo/tale/Video";
export { Compositions } from "./Compositions";
