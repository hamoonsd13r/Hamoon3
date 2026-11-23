// The demo's shot list (7 shots, ~26 s): a neutral sample story on the sea world: "in a storm the galley lamp swings
// wildly... but it is the ship that swings, not the lamp". It shows the whole grammar:
//   - every shot = one narration phrase, starts and beats read from the words (W) with a 2-frame lead
//   - continuous camera through a sequence: shots 2-3 share one keyed glide (cook -> porthole), shots 5-7 another
//     (galley -> lamp insert -> two-shot); a dissolve (8 frames) only where the place changes (galley <-> sea)
//   - every hold pushes in; caption-safe presets (closeUp, twoShot, wide) keep faces above the caption band
//   - one physical clock (ROLL) drives the ship's roll outside AND the lamp inside; shots 1-3 ride with the room (the
//     lamp swings), shots 5-7 lock the lens to gravity (the lamp hangs still, the room tilts): the twist is visual
//   - lightning on a word (timing.ts STRIKES), rain and storm light outside, warm lamp-lit galley inside
//   - a character acts in the background of a camera move: during the glide up to the lamp the cook walks off to his
//     soup, so the insert is clean and the two-shot finds him there
// Copy this folder to start a film (pipeline/new-video.mjs) and replace the shots; the world's fields are in
// ../lib/sea/world.ts (FrameDef), the cast in ../lib/sea/cast.ts (WHO, put, lidAt).
import { FPS, TOTAL, W, LINE0, LEAD, clamp01, smooth, smoother, lerp, flashAt, STRIKES } from "./timing";
import type { FrameDef, CamDef, Space, ShipPose, SStage, StageCtx, V3 } from "../lib/sea/world";
import { WHO, put, lidAt, setSun } from "../lib/sea/cast";
import { camRun as kitCamRun, push as kitPush, sway, closeUp, twoShot, wide, aimAt, ndcY, mixV, type CK } from "../lib/kit/camera";
import { GALLEY } from "../lib/sea/props";
import { makeShots, makeCues } from "../lib/kit/timeline";
export { TOTAL, FPS };

// ---------------- named times: cue("name", t) -> plan/plan.json (pipeline/plan.mjs) -> build-audio.cjs ----------------
const CUES = makeCues();
const cue = CUES.cue;
export const CUES_ALL = CUES.all;

// ---------------- the kit's camera grammar bound to this world's spaces and frame rate ----------------
const camRun = (space: Space, keys: CK[], t: number, extra: Partial<CamDef> = {}): CamDef => kitCamRun<Space>(space, keys, t, extra);
const push = (c: CamDef, t: number, t0: number, rate: number, tau = 0): CamDef => kitPush(c, t, t0, rate, tau, FPS);

// ---------------- times (s): each shot starts on its phrase's first word ----------------
export const AT = {
  s1: 0, s2: LINE0(2) - LEAD, s3: W("ولی", 3) - LEAD, s4: LINE0(4) - LEAD, s5: LINE0(5) - LEAD, s6: LINE0(6) - LEAD, s7: LINE0(7) - LEAD,
};
cue("cut2", AT.s2); cue("glide3", AT.s3); cue("toSea", AT.s4); cue("toGalley", AT.s5); cue("toLamp", AT.s6); cue("toPair", AT.s7);
cue("thunder", STRIKES[0]);

// ---------------- one clock for the roll: the hull outside, the lamp inside ----------------
const HEAD = Math.PI / 2;
/** the ship's extra roll (rad): a slow cradle, already leaning at frame 0 so the first still shows the swing */
const ROLL_A = 0.27, ROLL_P = 3.4, ROLL_PH = 0.55;
const ROLL = (t: number) => ROLL_A * Math.sin((2 * Math.PI * (t + ROLL_PH)) / ROLL_P);
cue("rollPeriod", ROLL_P); cue("rollPhase", ROLL_PH);
/** the lamp relative to the room = minus the room's roll (it keeps hanging straight down) */
const LAMP = (t: number) => -ROLL(t);
/** the lens locked to gravity inside the room: it counter-rolls the lamp's swing, so the lamp hangs still on screen
 *  and the room tilts round it (sign checked on stills: the lamp must read vertical) */
const LOCK = (t: number) => -LAMP(t);
const OURS: ShipPose = { x: 0, z: 0, yaw: HEAD, k: 0.85 };
const SUN_GALLEY: V3 = [-0.35, 0.8, -0.5], SUN_STORM: V3 = [-0.4, 0.78, 0.48];

// ---------------- the galley set (galley space: origin = floor centre, the counter along x at z 0, the back wall at
// z 1.6; a lens looking +z sees +x on its LEFT) ----------------
/** the lamp's pivot (props.ts GALLEY.lamp, under a ceiling beam) and the centre of its glowing glass (lampLen below) */
const PIVOT: V3 = [GALLEY.lamp.x, GALLEY.lamp.y, GALLEY.lamp.z], LL = GALLEY.lampLen;
const lampGlass = (t: number): V3 => { const a = LAMP(t); return [PIVOT[0] + LL * Math.sin(a), PIVOT[1] - LL * Math.cos(a), PIVOT[2]]; };
/** the cook stands beside the lamp (x0), then walks to his soup at the counter's other end (x1) during the lamp insert */
const COOK_X0 = -0.3, COOK_X1 = 0.62, CAP_X = 1.4, BACK_Z = 0.62;
const WALK0 = LINE0(6) - 0.35, WALK1 = WALK0 + 1.1;
const cookX = (t: number) => lerp(COOK_X0, COOK_X1, smoother((t - WALK0) / (WALK1 - WALK0)));
cue("walk", WALK0);
/** an adult's face is ~1.44 m over the feet (QA reads the exact head from each card); the stout captain's a little lower */
const FACE_COOK0: V3 = [COOK_X0, 1.46, BACK_Z], FACE_COOK1: V3 = [COOK_X1, 1.46, BACK_Z], FACE_CAP: V3 = [CAP_X, 1.38, BACK_Z];
const galley = (t: number, o: Partial<FrameDef>): FrameDef => ({ t, light: "galley", state: 1, sun: SUN_GALLEY, set: "galley", ours: OURS, pirate: null,
  lamp: LAMP(t), cam: { space: "galley", pos: [0, 1.6, -2.6], look: [0, 1.4, 0.6], fov: 40 }, ...o });
const storm = (t: number, o: Partial<FrameDef>): FrameDef => ({ t, light: "storm", state: 0.9, sun: SUN_STORM, ours: { ...OURS, heel: ROLL(t) }, pirate: null,
  rain: 1, flash: flashAt(t), front: 1, cam: { space: "world", pos: [0, 6, 30], look: [0, 4, 0], fov: 44 }, ...o });

/** the cook behind the counter (and, in shot 7, the captain beside him) */
const cookStage = (t: number, mood: "fear" | "aha" | "soup") => (c: StageCtx): SStage => {
  setSun(c);
  const out: SStage = { places: [], fx: [] };
  if (mood === "fear") {
    // eyes up on the lamp, fists braced on the counter; the shock on "بیفته" (2 frames early), a blink across the swap
    const hit = W("بیفته", 2) - LEAD, shocked = t > hit && t < hit + 1.1;
    put(c, out, WHO.cook, "galley", COOK_X0, 0, BACK_Z, { mode: "stand", expr: shocked ? "shock" : "nervous", lookY: -1, look: -0.55, facing: 0,
      blink: shocked ? 0 : lidAt(t, 2, [hit, hit + 1.1]), tilt: Math.round(2 * Math.sin(t * 1.9)), hands: [[190, 610], [410, 610]], items: ["fist", "fist"] });
  } else if (mood === "aha") {
    // the penny drops on "کشتیه"; then (line 6) he strolls off to his soup, out of the lamp insert
    const aha = W("کشتیه", 5) - LEAD, x = cookX(t), walking = t > WALK0 && t < WALK1;
    put(c, out, WHO.cook, "galley", x, 0, BACK_Z, walking
      ? { mode: "stroll", phase: (t - WALK0) * 2.6, expr: "relief", facing: -1, blink: 0 }
      : { mode: "stand", expr: t > aha ? "relief_open" : "neutral", lookY: -1, look: -0.5, facing: 0, blink: lidAt(t, 2, [aha]), hands: [[190, 610], [410, 610]], items: ["fist", "fist"] });
  } else {
    // the punchline: the cook clutches his soup (eyes down on it), the captain grins over his mug
    const worry = W("سوپشه", 7) - LEAD;
    put(c, out, WHO.cook, "galley", COOK_X1, 0, BACK_Z, { mode: "stand", expr: t > worry ? "nervous" : "neutral", lookY: 0.9, look: 0.1, facing: 0,
      blink: lidAt(t, 2, [worry]), hands: [[255, 440], [345, 440]], items: [null, "bowl"] });
    put(c, out, WHO.captain, "galley", CAP_X, 0, BACK_Z, { mode: "stand", expr: "grin", facing: -1, look: -0.6, blink: lidAt(t, 3),
      hands: [null, [430, 430 + 6 * Math.sin(t * 3)]], items: [null, "mug"] });
  }
  return out;
};

// ---------------- shots ----------------
const SH = makeShots<FrameDef>(FPS, TOTAL);
const shot = SH.shot;

// 1. HOOK (frame 0 = the subject): the lamp swinging beside the cook, who looks up at it. The lens sits ABOVE the lamp
//    (2.5 m) and looks down ~20 deg: the near lamp drops toward the far face, so both fit over the caption band (face at
//    ~50 % of the height and left of centre, the lamp at ~28 %, its whole swing inside the frame). It rides with the room
//    (no roll, so the lamp swings) and creeps in (0.15 %/frame: the push spreads them apart, keep it slow)
const HOOK_POS: V3 = [-0.72, 2.5, -2.15];
shot(1, AT.s1, (t) => galley(t, {
  cam: push(camRun("galley", [{ t: 0, pos: HOOK_POS, look: aimAt(HOOK_POS, FACE_COOK0, 46, -0.5, ndcY(0.5)), fov: 46 }], t), t, 0, 0.0015),
  dof: { cInf: 6, focus: [-0.5, 1.8, 0.3], space: "galley" }, stage: cookStage(t, "fear") }));

// 2-3. one keyed glide: a close-up on the cook (preset: face at 44 % of the height) -> on "بیرون" round to the brass
//      porthole and into it (the storm outside), the dissolve to the sea lands on line 4
const CU2 = closeUp<Space>("galley", FACE_COOK0, [0.25, -1], { fov: 36, at: 0.44, frac: 0.3 });
const GLIDE: CK[] = [
  { t: AT.s2, pos: CU2.pos, look: CU2.look, fov: CU2.fov },
  { t: W("بیرون", 3) - 0.32, pos: [-1.08, 1.96, 0.22], look: [-1.25, 1.95, 1.56], fov: 42, dur: 0.75, ease: (u) => smoother(u) },
];
shot(2, AT.s2, (t) => galley(t, { cam: push(camRun("galley", GLIDE, t), t, AT.s2, 0.003), dof: { cInf: 12, focus: FACE_COOK0, space: "galley" }, stage: cookStage(t, "fear") }));
shot(3, AT.s3, (t) => {
  // after the glide: push toward the porthole (0.4 %/frame, its brass ring stays a frame) until the dissolve
  const c = camRun("galley", GLIDE, t);
  return galley(t, { cam: push(c, t, W("ببین", 3) - 0.2, 0.004), dof: { cInf: 10, focus: [-1.25, 1.95, 1.56], space: "galley" }, stage: cookStage(t, "fear") });
});
cue("porthole", W("بیرون", 3) - 0.32);

// 4. THE SEA (dissolve in, 8 frames): from astern and a little to port, so the roll reads as a side-to-side rock; a
//    wide preset with a slow push and a gentle hand-held roll; lightning on "کشتی"
const W4 = wide<Space>("world", [0, 6.5, -2], 24, 8, 56, { fov: 44, at: 0.5 });
shot(4, AT.s4, (t) => storm(t, { cam: { ...push(W4, t, AT.s4, 0.0018), roll: sway(t, 0.02, 6.5) }, dof: { cInf: 0 } }), 8);

// 5-7. back inside (dissolve, 8 frames), the lens now LOCKED TO GRAVITY (roll = minus the lamp's swing): the lamp
//      hangs straight, the room tilts round it. One glide: the galley -> on line 6 up to the lamp (an insert, shallow
//      focus; the cook has walked off) -> on line 7 across to the cook and the captain at the soup (two-shot preset)
const PAIR = twoShot<Space>("galley", FACE_COOK1, FACE_CAP, [0.2, -1], { fov: 40, at: 0.43 });
const INSERT_POS: V3 = [-0.72, 1.95, -1.7];
const LOCKED: CK[] = [
  { t: AT.s5, pos: [-0.55, 1.45, -2.75], look: [-0.45, 1.5, 0.45], fov: 46 },
  { t: AT.s6 - 0.25, pos: INSERT_POS, look: aimAt(INSERT_POS, lampGlass(AT.s6), 36, 0, ndcY(0.4)), fov: 36, dur: 0.9 },
  { t: AT.s7 - 0.3, pos: PAIR.pos, look: PAIR.look, fov: PAIR.fov, dur: 0.9 },
];
shot(5, AT.s5, (t) => galley(t, { cam: { ...push(camRun("galley", LOCKED, t), t, AT.s5, 0.0022), roll: LOCK(t) },
  dof: { cInf: 6, focus: FACE_COOK0, space: "galley" }, stage: cookStage(t, "aha") }), 8);
shot(6, AT.s6, (t) => {
  // the insert follows the glass (kept at 40 % of the height) so only the room swings behind it
  const c = camRun("galley", LOCKED, t), k = smooth((t - AT.s6) / 0.6), g = lampGlass(t);
  const look = mixV(c.look, aimAt(c.pos, g, c.fov, 0, ndcY(0.4)), k * clamp01((AT.s7 - 0.3 - t) / 0.3 + 1));
  return galley(t, { cam: { ...push({ ...c, look }, t, AT.s6 + 0.6, 0.0015), roll: LOCK(t) }, dof: { cInf: 14, focus: g, space: "galley" }, stage: cookStage(t, "aha") });
});
shot(7, AT.s7, (t) => galley(t, { cam: { ...push(camRun("galley", LOCKED, t), t, AT.s7 + 0.6, 0.0016), roll: LOCK(t) * lerp(1, 0.85, smooth((t - AT.s7) / 2)) },
  dof: { cInf: 10, focus: mixV(FACE_COOK1, FACE_CAP, 0.35), space: "galley" }, stage: cookStage(t, "soup") }));

// ---------------- the timeline (read by Video.tsx / the kit's film component) ----------------
export const SHOTS = SH.list();
export const shotAt = SH.shotAt;
export const frameDef = SH.frameDef;
export const layersAt = SH.layersAt;
