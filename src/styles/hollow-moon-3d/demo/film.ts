// Hollow Moon 3D · the demo film (the accepted 35 s intro), its clock and its brand. Every cut sits on a downbeat of
// the music: four bars of storm sea (the lightning strikes on the first hit, bar 3), two along the great ring, two over
// the crust, the plunge through the opening that passes the rim on the climax (bar 11), the armillary, the cage, the
// core and the logo, sealed on the third hit (bar 19), then the music rings out.
// To make your own film: copy this folder to src/vNN/, set MUSIC to your song (tools/beat-map.mjs), move the cuts and
// keys, put your logo in logo-paths.json (tools/logo-trace.mjs) and your words in BRAND.inscription.
//   camera keys without renders: npx tsx src/styles/hollow-moon-3d/pipeline/pt.mts "sf(80,35,145) | sf(58,15,100) | 38"
import type { Brand, LogoPaths } from "../lib/brand";
import { H, type FilmSpec, type Shot } from "../lib/cam";
import type { LogoTimes } from "../lib/logo";
import { clamp, ease } from "../lib/util";
import LOGO_PATHS from "./logo-paths.json";

export const FPS = 30;
export const DUR = 35.0; // seconds
export const FRAMES = Math.round(DUR * FPS);

/** the music grid: film second 0 is second `off` of the song (two bars before its first big hit); 130 BPM.
 *  Your song: node tools/beat-map.mjs song.mp3 beats.json, then put its first hit on bar 3 (off = hit − 2 bars). */
export const MUSIC = { off: 11.093, beat: 60 / 130 };
/** film second of the downbeat of bar n (1-based: bar 1 starts with the picture), plus a number of beats */
export const bar = (n: number, beats = 0) => ((n - 1) * 4 + beats) * MUSIC.beat;

/** BOLT = the first hit (lightning) · DROP = the climax (the lens passes the rim) · END = the third hit (the logo is
 *  sealed; the music rings out after it) · F = the lens enters the core */
export const CUT = { BOLT: bar(3), B: bar(5), C: bar(7), CD: bar(9), DROP: bar(11), D2: bar(13), E: bar(15), F: bar(17), END: bar(19) };
const X = 0; // hard cuts on the beat (a 4-frame mix read as ghosting)
const { m, lc, rg, ax, sf } = H;

export const SHOTS: Shot[] = [
  {
    // A · the storm sea: the open moon hangs low over the breakers, its light on the waves; the lens rides in over the
    // crests, and on the first hit of the music lightning strikes out of the cloud deck to the left of it
    id: "A", t0: 0, t1: CUT.B + X / 2, sea: true,
    keys: [
      // it opens low over the breakers with the sea filling the foreground, and lifts its eyes to the moon as it rides in
      { at: 0, p: [170, 7.5, 1060], t: m(-8, -112, 0), fov: 29, focus: 800, aper: 0 },
      { at: CUT.BOLT, p: [150, 8.2, 985], t: m(-10, -96, 0), fov: 28.5 },
      { at: CUT.BOLT + 1.4, p: [128, 9.4, 900], t: m(-6, -80, 0), fov: 28 },
      { at: CUT.B + X / 2, p: [66, 13, 650], t: m(6, -52, 0), fov: 27.5 },
    ],
  },
  {
    // B · along the great ring: its lit name passes the lens, the open moon behind it
    id: "B", t0: CUT.B - X / 2, t1: CUT.C + X / 2, sea: true,
    keys: [
      { at: CUT.B - X / 2, p: rg(-10, 199, 10.5), t: rg(-4, 150, 1.6), fov: 36, focus: 51, aper: 420 },
      { at: (CUT.B + CUT.C) / 2, p: rg(-6, 193, 8.2), t: rg(-1.3, 150, 1.2), fov: 36, focus: 45, aper: 420 },
      { at: CUT.C + X / 2, p: rg(-2, 187, 6), t: rg(1.4, 150, 0.9), fov: 36, focus: 39, aper: 420 },
    ],
  },
  {
    // C · over the broken crust, gliding towards the rim of the opening. The lens stands where the key light rakes
    // the ground from the top of the picture (pipeline/lightdir.mts): craters throw shadows and read as bowls
    id: "C", t0: CUT.C - X / 2, t1: CUT.CD + X / 2, sea: true, cone: 0.3,
    keys: [
      { at: CUT.C - X / 2, p: sf(80, 35, 145), t: sf(58, 15, 100), fov: 38, focus: 80, aper: 0 },
      { at: CUT.CD + X / 2, p: sf(68, 22, 128), t: sf(50, 6, 99), fov: 39, focus: 60, aper: 0 },
    ],
  },
  {
    // CD · the plunge: towards the opening, through it on the drop, into the hall
    id: "CD", t0: CUT.CD - X / 2, t1: CUT.D2 + X / 2, sea: true,
    keys: [
      { at: CUT.CD - X / 2, p: ax(345, -40, 30), t: ax(40, 0, 0), fov: 40, focus: 300, aper: 0, exp: 1 },
      { at: CUT.CD + 1.7, p: ax(264, -17, 15), t: ax(30, 0, 0), fov: 41.5, exp: 1 },
      // it hangs before the rim while the music holds its breath …
      { at: CUT.DROP - 0.6, p: ax(188, -6, 7), t: ax(8, 0, 0), fov: 43, exp: 1 },
      { at: CUT.DROP - 0.05, p: ax(176, -4, 5.5), t: ax(2, 0, 0), fov: 43.5, exp: 0.98 },
      // … and lunges through on the hit, the lens opening wide
      { at: CUT.DROP + 0.36, p: ax(114, 1, 2), t: ax(0, 1, 0), fov: 52, exp: 0.93 },
      { at: CUT.DROP + 1.6, p: ax(88, 6, -1), t: ax(0, 2, -1), fov: 49, exp: 0.9 },
      { at: CUT.D2 + X / 2, p: ax(60, 12, -6), t: ax(0, 0, 0), fov: 48, exp: 0.9 },
    ],
  },
  {
    // D2 · close along the hoops of the armillary: the brand's words engraved in them, the caged sun, the arcades beyond
    id: "D2", t0: CUT.D2 - X / 2, t1: CUT.E + X / 2, sea: false,
    keys: [
      { at: CUT.D2 - X / 2, p: lc(44, 19, -46), t: lc(0, 2, 0), fov: 40, focus: 25.5, aper: 300, exp: 0.8 },
      { at: CUT.D2 + 1.3, p: lc(34.2, 16, -49), t: lc(0, 1.5, 0), fov: 40, focus: 21, aper: 300, exp: 0.8 },
      { at: CUT.D2 + 2.6, p: lc(24.3, 13, -52), t: lc(0, 1, 0), fov: 40, focus: 33, aper: 300, exp: 0.8 },
      { at: CUT.E + X / 2, p: lc(14, 10, -55), t: lc(0, 0.5, 0), fov: 40, focus: 46, aper: 300, exp: 0.8 },
    ],
  },
  {
    // E · between the hoops to the cage; its doors part and the lens goes into the light
    id: "E", t0: CUT.E - X / 2, t1: CUT.F, sea: false,
    keys: [
      { at: CUT.E - X / 2, p: ax(62, 12, -6), t: ax(0, 0, 0), fov: 44, focus: 50, aper: 300, exp: 0.8 },
      { at: CUT.E + 1.6, p: ax(40, 6, -3), t: ax(0, 0, 0), fov: 42, focus: 28, aper: 300, exp: 0.72 },
      { at: CUT.F - 1.0, p: ax(22, 1.5, -1), t: ax(0, 0, 0), fov: 40, focus: 12, aper: 300, exp: 0.66 },
      { at: CUT.F, p: ax(7.5, 0, 0), t: ax(0, 0, 0), fov: 38, focus: 6, aper: 300, exp: 0.66 },
    ],
  },
];

/** the reveal inside the core, seconds after CUT.F: the ignition sweep across the name (one beat → three beats), the
 *  accent lands on the next beat, the second line a beat later, and a sheen crosses it all just before the seal */
export const LOGO_T: LogoTimes = { ignite0: 0.46, ignite1: 1.38, accent: 1.846, sub: 2.31, sheen: 3.69 };
/** the film opens on a full picture (no black frame) and fades out over its last second */
export const fadeAt = (t: number) => 1 - ease.sine(clamp((t - (DUR - 1.0)) / 0.9));
/** silent flashes far off in the cloud deck: [film second, compass offset from shot A's line of sight (°), elevation (°), strength] */
export const FAR_FLASHES: [number, number, number, number][] = [
  [1.47, 19, 9.5, 0.26],
  [5.83, -23, 11, 0.3],
  [9.33, 31, 14, 0.4],
  [16.03, -38, 16, 0.45],
];

/** the brand: a neutral sample logo (text card traced with tools/logo-trace.mjs) — put yours here */
export const BRAND: Brand = { logo: LOGO_PATHS as LogoPaths, inscription: ["YOUR BRAND", "STUDIO"], slit: false };

export const FILM: FilmSpec = { dur: DUR, shots: SHOTS, cut: CUT, logoT: LOGO_T, fadeAt, brand: BRAND, farFlashes: FAR_FLASHES };

/** review stills (Style-HollowMoon3D-Look): the open sea, the strike, the ring, the crust, the rim on the drop, the
 *  hall, the armillary, the cage, the ignition, the seal */
export const LOOK = [0.6, 3.7, 5.4, 9.4, 12.6, 18.47, 20.5, 23.5, 27.6, 30.2, 31.6, 33.6];
