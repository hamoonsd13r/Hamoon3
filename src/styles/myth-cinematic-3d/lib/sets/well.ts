// Set: desert at dusk, the well, the shaft and the hidden door. Shots 1–5 (0 – 14.05 s).
// Parts: well-desert.ts (sky, dunes, sand, the well head, the friends), well-shaft.ts (shaft, room, door, ropes, jar,
// peeks, the boy), well-env.ts (sun + haze, material patches, ropes), well-tex.ts (silhouettes, rope).
import { ease, lerp, noise1, ramp } from "../lib";
import { V, type Ctx, type SetMod, type Shot } from "./common";
import { CAM_A, CAM_B, buildDesert } from "./well-desert";
import { CAM3, FLOOR, Z_F, buildShaft } from "./well-shaft";

/** review stills for this set (seconds) */
export const LOOK_WELL = [0.9, 2.7, 3.9, 5.2, 6.6, 7.9, 9.0, 9.7, 10.3, 11.4, 12.4, 13.4];

export const buildWell = (c: Ctx): SetMod => {
  const D = buildDesert(c);
  const S = buildShaft(c, c.T);
  const L = V;
  const lookY = 2.1;
  let focus2 = 2.7, focus1 = 30, focus3 = 12.6;

  const shots: Shot[] = [
    // 1 · dusk: slow push toward the well, the friends and the sun on the dune line
    {
      a: 0, b: 3.3, set: ["sky", "desert", "sun", "wellTop", "friends"], range: 44, fog: null,
      cam: (k, t) => {
        const e = ease.sine(k);
        focus1 = CAM_A.clone().lerp(CAM_B, e).length();
        return { p: CAM_A.clone().lerp(CAM_B, e).add(L(0, 0.02 * Math.sin(t * 1.3), 0)), l: L(0.3 - 0.4 * e, lookY - 0.1 * e, 0), fov: lerp(31, 28.5, e) };
      },
    },
    // 2 · leaning over the rim: down the shaft to the boy far below (dolly-zoom, slow roll)
    {
      a: 3.3, b: 6.95, set: ["sun", "wellTop", "rimGround", "friends", "trickle", "shaft", "room"], range: 5, fog: null,
      cam: (k) => {
        const e = ease.io(k);
        // rack focus from the rim down to the boy
        focus2 = lerp(2.9, 13.5, ease.io(ramp(k, 0.25, 0.65)));
        return { p: L(lerp(0.5, 0.1, e), lerp(3.6, 0.55, e), lerp(0.85, 0.16, e)), l: L(lerp(-0.3, 0, e), FLOOR, lerp(-0.6, 0, e)), fov: lerp(46, 66, e), roll: lerp(0.0, 0.6, k) };
      },
    },
    // 3 · from the bottom, up the shaft: the honey rises, the rope is cut and falls
    {
      a: 6.95, b: 10.65, set: ["sky", "sun", "wellTop", "trickle", "shaft", "room"], focus: 12.6, range: 14, fog: null,
      cam: (k, t) => {
        const tl = S.tLand;
        if (t >= tl - 0.04) {
          // insert, low on the floor: the rope slaps down into a coil, a puff of dust
          const k2 = ramp(t, tl - 0.04, 10.65);
          const sh = 0.025 * Math.exp(-Math.max(0, t - tl) * 9) * (noise1(t * 40, 1) - 0.5);
          focus3 = 1.15;
          return { p: L(S.PILE.x - 0.78 + 0.06 * k2, FLOOR + 0.3 + sh, S.PILE.z + 0.82 - 0.08 * k2), l: L(S.PILE.x + 0.02, FLOOR + 0.1 + sh, S.PILE.z), fov: 38 - 3 * k2, roll: 0.03 };
        }
        focus3 = 12.6;
        // a slow push (lens) and roll while the honey rises
        const push = ease.sine(ramp(t, 6.95, 9.45));
        return { p: L(CAM3.x + 0.015 * Math.sin(t * 0.9), CAM3.y + 0.12 * push, CAM3.z), l: L(0.05, 2, -0.05), fov: lerp(23, 18.5, push), roll: 0.2 + 0.18 * push };
      },
    },
    // 4 · the room: the boy at the far wall with his lamp; on «door» the seams light up
    {
      a: 10.65, b: 13.0, set: ["shaft", "room"], focus: 6.2, range: 5, fog: null,
      cam: (k, t) => {
        const e = ease.sine(k);
        return { p: L(lerp(2.05, 1.75, e), FLOOR + lerp(1.38, 1.3, e) + 0.01 * Math.sin(t * 1.1), lerp(2.65, 1.95, e)), l: L(-0.35 + 0.03 * Math.sin(t * 0.5), FLOOR + 0.95, Z_F), fov: lerp(57, 53, e) };
      },
    },
    // 5 · the door opens, light floods in, the camera pushes through
    {
      a: 13.0, b: 14.05, set: ["shaft", "room"], focus: 4.8, range: 5, fog: null,
      cam: (k) => {
        const e = ease.in(k);
        // swing round behind him as he steps in front of the door, so he stands black against the light
        const e2 = ease.sine(k);
        return { p: L(lerp(1.75, 0.12, e2), FLOOR + lerp(1.3, 1.18, e), lerp(1.95, -0.6, e)), l: L(lerp(-0.35, -0.04, e2), FLOOR + lerp(0.95, 1.1, e), Z_F), fov: lerp(53, 40, e) };
      },
    },
  ];

  // shot 2 racks focus: world.ts reads sh.focus after calling sh.cam(), so a getter sees this frame's value
  Object.defineProperty(shots[0], "focus", { get: () => focus1 });
  Object.defineProperty(shots[1], "focus", { get: () => focus2 });
  Object.defineProperty(shots[2], "focus", { get: () => focus3 });
  Object.defineProperty(shots[2], "range", { get: () => (focus3 < 3 ? 1.2 : 14) });
  Object.defineProperty(shots[1], "range", { get: () => lerp(2.6, 14, ramp(focus2, 2.9, 13.5)) });
  const update = (t: number, sh: Shot) => {
    D.update(t, sh.set);
    S.update(t, sh.set);
    // the sky seen from the bottom of the well, darkening once the friends are gone
    D.skyU.uWell.value = sh.set.includes("desert") ? 0 : 1;
    D.skyU.uDim.value = t < 9.85 ? 1 : lerp(1, 0.22, ease.io(ramp(t, 9.85, 10.6)));
    D.skyU.uCloudDim.value = 1;
  };
  const bloom = (t: number) => (t > 11.4 && t < 13.0 ? 0.35 * ramp(t, 11.4, 11.9) : t >= 13.0 && t < 14.3 ? 0.35 + 1.3 * ease.in(ramp(t, 13.0, 13.9)) : 0);
  return { shots, update, bloom };
};
