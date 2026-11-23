// Style Index — twenty graphic-design styles as 6-second motion posters (Minimalism … Handwritten), each a component of
// its own time, plus the reel that lists them with each poster in a card, the wall of all twenty and a comment CTA.
export * from "./lib/theme";
export { useFonts, fontsReady } from "./lib/fonts";
export { Frame, Abs, Grain, Paper, Halftone, Cut, Sub, Letters, wipe, jitter, Vignette, img, ar, type PosterProps } from "./lib/kit";
export { ThreeLayer, loadFont, gradientEnv, SNOISE, type Built, type BuildArgs } from "./lib/three";
export { STYLES, type StyleDef } from "./lib/registry";
export { StyleIndexReel, FRAMES, type FilmProps } from "./demo/Video";
export { Compositions, PosterComp, PosterSheet } from "./Compositions";
