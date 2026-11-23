// Snow Castle 3D · the demo film (the accepted 40 s intro): one place, three slow moves joined by dissolves, and the
// light clock that takes the castle from a cold afternoon to dusk with its windows and lanterns lighting one by one.
// To make your own film: copy this folder to src/vNN/, change DUR, SHOTS, the two clocks and LOOK. Nothing else.
//   free cameras for new keys: node src/styles/snow-castle-3d/pipeline/look.mjs <dir> --cams "px,py,pz,tx,ty,tz,fov"
//   ground under a camera:     npx tsx src/styles/snow-castle-3d/pipeline/probe.mts
import type { FilmSpec, Shot } from "../lib/cam";
import { sstep } from "../lib/util";

export const FPS = 30;
export const DUR = 40; // seconds
export const FRAMES = Math.round(DUR * FPS);

/** spruces set by hand for the opening: x, z, height, turn (the castle rock is at x ≈ -30, z ≈ 40; the loch is south, +z) */
export const OPENING_TREES: [number, number, number, number][] = [
  [54.2, 136.0, 24, 0.4], [57.4, 138.6, 17, 2.2], [52.0, 138.8, 13, 4.0], [56.2, 133.9, 19, 1.1],
  [21.0, 146.0, 26, 0.9], [23.8, 148.4, 18, 3.1], [18.9, 148.0, 14, 5.0],
  [30.4, 127.6, 22, 0.2], [27.6, 129.6, 15, 2.7], [32.6, 129.8, 12, 4.4],
];

/** each key: at (film second), p (lens, metres), t (where it looks), fov (vertical degrees), focus (m), aper (blur px·m) */
export const SHOTS: Shot[] = [
  {
    // A · over the frozen loch south of the rock: the lens climbs in a slow arc past the spruces of the skerries
    // and the castle rises above its crag (the reference-photo view: a drone at half the rock's height, 120–160 m off)
    id: "A", t0: 0, t1: 15.4,
    keys: [
      { at: 0, p: [62, 16, 176], t: [-34, 86, 44], fov: 40, focus: 150, aper: 22 },
      { at: 5, p: [50, 24.5, 169], t: [-34, 86.5, 44], fov: 40, focus: 145, aper: 22 },
      { at: 10, p: [37, 34, 160], t: [-34, 87, 44], fov: 40, focus: 135, aper: 22 },
      { at: 15.4, p: [24, 44, 150], t: [-34, 87.5, 44], fov: 40, focus: 125, aper: 22 },
    ],
  },
  {
    // B · the whole place from over the water, drifting in towards the viaduct while the light falls
    id: "B", t0: 14.3, t1: 28.2,
    keys: [
      { at: 13.8, p: [178, 41, 160], t: [58, 58, 41], fov: 41 },
      { at: 18.5, p: [170.5, 44.6, 151], t: [58.5, 59.5, 41], fov: 41 },
      { at: 23.5, p: [162, 48.6, 141], t: [58.5, 61, 41], fov: 40.6 },
      { at: 28.2, p: [153, 52.6, 130], t: [58, 62.6, 41], fov: 40.2 },
    ],
  },
  {
    // C · along the snowy deck of the viaduct between the lanterns, to the lit gate (night)
    id: "C", t0: 27.1, t1: DUR,
    keys: [
      { at: 26.6, p: [160, 65.25, 46.5], t: [40, 70.5, 46], fov: 40, focus: 40, aper: 26 },
      { at: 31, p: [146, 65.3, 46.3], t: [36, 71.6, 46], fov: 40, focus: 60, aper: 26 },
      { at: 35.5, p: [131, 65.35, 46.0], t: [30, 73, 46], fov: 40, focus: 70, aper: 26 },
      { at: DUR, p: [117, 65.4, 45.8], t: [24, 74.4, 46], fov: 40, focus: 70, aper: 26 },
    ],
  },
];

/** 0 = the cold afternoon of the first shot, 1 = dusk at the gate */
export const duskAt = (t: number) => sstep(16, 31, t);
/** the light clock: nothing is lit in daylight, the first rooms around second 15, the viaduct lanterns one by one from 23
 *  (castle.ts gives each window and lamp its own second on this clock; the music's lantern bells use the same mapping) */
export const litAt = (t: number) => (t < 14 ? -8 : t < 20 ? -8 + ((t - 14) / 6) * 10 : 2 + (t - 20) * 1.9);

export const FILM: FilmSpec = { dur: DUR, shots: SHOTS, openingTrees: OPENING_TREES, duskAt, litAt, fade: { in: 1.8, out: [DUR - 2.2, DUR - 0.25] } };

/** review stills (Style-SnowCastle3D-Look): the opening, the climb, the dissolve, dusk over the water, the lanterns, the gate */
export const LOOK = [1.2, 5, 9, 13, 14.9, 18, 22, 25.5, 27.7, 30, 34, 38];
