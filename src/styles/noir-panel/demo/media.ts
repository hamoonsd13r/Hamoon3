// Noir Panel · your footage. No video ships with the kit: give each slot of SHOTS (and the split's two sides) a file
// under public/. An empty slot plays as a quiet labelled plate, so the film always renders.
// Find free footage per line with: node tools/footage.mjs plan … (see FOOTAGE.md); put the credit in `credit`.
//   "factory-exit": { src: "v01/clips/factory-exit.mp4", dur: 12, credit: "LUMIÈRE · 1895 · PUBLIC DOMAIN" },
//   "payday":       { src: "v01/photos/payday.jpg" },                       // a photo: no dur
// Slots in the demo: city-rush, factory-exit, assembly-line, commute, office-day, payday, ai-screen, typing,
// designer, spreadsheet, old-jobs, waiting, learning, night-study.
import type { Media } from "../lib/panel";

export const MEDIA: Media = {};
