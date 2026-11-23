// Lowpoly Dialogue 3D · the performance machinery every film shares: lip sync (from word times, or from the real
// voice's energy envelope), natural blinks, applying key-track poses to the man and the robot (+ the robot's face and
// core light), and the shot-list camera with depth-of-field focus. A film = data (shots, tracks, moods) + these calls.
import * as THREE from "three";
import { setArm, sitLegs } from "./chars";
import { drawCore, drawFace, type Face } from "./face";
import { K, type Keys } from "./keys";
import { clamp, ease, FPS, lerp, ramp, rnd, wob } from "./theme";
import type { Word } from "./words";
import type { World } from "./world";

export type Who = "H" | "R"; // H = the person, R = the robot
export type Mood = Face["mood"];
export type V3 = [number, number, number];

/** mouth opening 0..1 of `who` at t. Silent drafts: a syllable rhythm from the word times. With the real voice pass
 *  its energy envelope (one value per frame, 0..1: `node tools/audio-env.mjs voice.wav env.json`). */
export const makeVoice = (words: Word[], speakerOf: (si: number) => Who, env?: number[]) => (t: number, who: Who) => {
  const w = words.find((x) => t >= x.s - 0.02 && t <= x.e + 0.05);
  if (!w || speakerOf(w.si) !== who) return 0;
  if (env) {
    const i = t * FPS, i0 = Math.floor(i);
    return clamp(lerp(env[i0] ?? 0, env[i0 + 1] ?? 0, i - i0));
  }
  const d = Math.max(0.08, w.e - w.s);
  const syl = Math.max(1, Math.round(w.w.replace(/[\s.,،؟?!…:؛]/g, "").length / 2.4));
  const ph = clamp((t - w.s) / d) * syl;
  const gate = ramp(t, w.s - 0.02, w.s + 0.05) * (1 - ramp(t, w.e - 0.03, w.e + 0.05));
  return clamp((0.3 + 0.7 * Math.abs(Math.sin(Math.PI * ph))) * gate);
};

/** natural blinks (≈ every 3–4 s, different seed per character) */
export const blinkAt = (t: number, seed: number) => {
  const per = 3.4;
  const n = Math.floor((t + seed) / per);
  const at = n * per + rnd(n * 7 + seed) * 1.6;
  const d = t + seed - at;
  return d >= 0 && d < 0.16 ? Math.sin((d / 0.16) * Math.PI) : 0;
};

// ───────────────────────────── poses: every channel is a key track; missing channels hold the rest value
export type HumanPose = {
  hy: number; hp: number; hr: number; // head yaw (+ = towards the robot), pitch (+ = down), roll
  lean: number; roll: number; twist: number; // torso
  rp: number; ro: number; rb: number; rw: number; // right arm (next to the robot): pitch, out, bend, wrist
  lp: number; lo: number; lb: number; // left arm
  brow: number; worry: number; skep: number; // brows: raise, worried tilt, one-brow doubt
  sleep: number; yawn: number; tremble: number; // eyelids closing, a yawn, shaky hands
};
export const HUMAN_REST: HumanPose = { hy: 0.42, hp: 0, hr: 0, lean: -0.05, roll: 0, twist: 0.1, rp: -0.28, ro: 0.34, rb: 0.12, rw: 0.2, lp: -0.28, lo: 0.34, lb: 0.12, brow: 0, worry: 0, skep: 0, sleep: 0, yawn: 0, tremble: 0 };

export type RobotPose = {
  hy: number; hp: number; hr: number; // head (yaw − = towards the man)
  lean: number; twist: number;
  rp: number; ro: number; rb: number; // right arm (away from the man)
  lp: number; lo: number; lb: number; // left arm (next to the man)
  shake: number; // 0..1 head shake «no»
  lookX: number; lookY: number; // where the face's eyes look (−1..1)
  spin: number; glow: number; // core light: arcs turning (working), extra glow (joy, a reveal)
};
export const ROBOT_REST: RobotPose = { hy: -0.4, hp: 0.03, hr: 0, lean: 0.02, twist: -0.1, rp: 0.62, ro: 0.06, rb: 0.18, lp: 0.62, lo: 0.06, lb: 0.18, shake: 0, lookX: -0.4, lookY: 0, spin: 0, glow: 0 };

export type Tracks<P> = Partial<Record<keyof P, Keys>>;
/** sample every key track at t on top of the rest pose */
export function sample<P extends Record<string, number>>(rest: P, tracks: Tracks<P>, t: number): P {
  const out: Record<string, number> = { ...rest };
  for (const k of Object.keys(tracks)) {
    const tr = tracks[k as keyof P];
    if (tr && tr.length) out[k] = K(t, tr, rest[k as keyof P] as number);
  }
  return out as P;
}

/** pose the man (v = his voice level 0..1) */
export function applyHuman(w: World, t: number, p: HumanPose, v: number) {
  const Hm = w.human;
  const breath = Math.sin(t * 1.7) * (1 - p.sleep * 0.5);
  const swing = 0.16 * (1 - p.sleep * 0.8);
  sitLegs(Hm.legL, swing * Math.sin(t * 1.25), 0.09, -1);
  sitLegs(Hm.legR, swing * Math.sin(t * 1.25 + 1.9), 0.09, 1);
  Hm.torso.rotation.set(p.lean + breath * 0.012 + v * 0.02, p.twist, -p.roll);
  const tr = p.tremble * 0.06;
  const gest = (k: number) => k + v * 0.12 * Math.sin(t * 7.3);
  setArm(Hm.armR, 1, gest(p.rp) + tr * Math.sin(t * 31), p.ro, p.rb + tr * Math.sin(t * 27 + 1), 0, p.rw);
  setArm(Hm.armL, -1, p.lp + tr * Math.sin(t * 29 + 2), p.lo, p.lb + tr * Math.sin(t * 33 + 3), 0, 0.2);
  Hm.head.rotation.set(
    p.hp + wob(t, 1, 0.5) * 0.025 + v * 0.05 * Math.sin(t * 9.1),
    p.hy + wob(t, 2, 0.35) * 0.04,
    -p.hr + wob(t, 3, 0.3) * 0.02,
  );
  const blink = Math.max(blinkAt(t, 0.7), p.sleep);
  for (const [i, e] of Hm.eyes.entries()) {
    e.scale.set(1, 1.35 * Math.max(0.07, 1 - blink), 0.5);
    e.position.x = (i === 0 ? -1 : 1) * 0.072;
  }
  Hm.brows[0].position.y = 0.255 + p.brow * 0.018 - p.sleep * 0.008;
  Hm.brows[1].position.y = 0.255 + p.brow * 0.018 + p.skep * 0.022 - p.sleep * 0.008;
  Hm.brows[0].rotation.z = p.worry * 0.35 - p.skep * 0.1;
  Hm.brows[1].rotation.z = -p.worry * 0.35 + p.skep * 0.25;
  Hm.mouth.scale.set(1 - v * 0.15 + p.yawn * 0.1, 1 + v * 3.6 + p.yawn * 4.5, 1);
  Hm.mouth.position.y = 0.088 - v * 0.012 - p.yawn * 0.014;
}

export const moodAt = (moods: [number, Mood][], t: number) => {
  let i = 0;
  while (i + 1 < moods.length && t >= moods[i + 1][0]) i++;
  return { m: moods[i][1], since: t - moods[i][0] };
};

/** pose the robot, draw its face (mood, blink, lip sync) and its core light (v = its voice level 0..1) */
export function applyRobot(w: World, t: number, p: RobotPose, v: number, mood: { m: Mood; since: number }, label = "12:00") {
  const Rb = w.robot;
  const rb = Math.sin(t * 1.5 + 1) * 0.5;
  sitLegs(Rb.legL, 0.13 * Math.sin(t * 1.55 + 0.4), 0.05, -1);
  sitLegs(Rb.legR, 0.13 * Math.sin(t * 1.55 + 2.3), 0.05, 1);
  Rb.torso.rotation.set(p.lean + rb * 0.01 + v * 0.02, p.twist, 0);
  const gest = (k: number) => k + v * 0.1 * Math.sin(t * 6.1);
  setArm(Rb.armR, 1, gest(p.rp), p.ro, p.rb, 0, 0.15);
  setArm(Rb.armL, -1, p.lp, p.lo, p.lb, 0, 0.15);
  const shake = 0.12 * Math.sin(t * 14) * p.shake;
  Rb.head.rotation.set(
    p.hp + wob(t, 5, 0.45) * 0.02 + v * 0.04 * Math.sin(t * 8.3),
    p.hy + wob(t, 6, 0.3) * 0.03 + shake,
    -p.hr + wob(t, 7, 0.25) * 0.015,
  );
  Rb.antenna.rotation.set(Math.sin(t * 3.1) * 0.04 + v * 0.06 * Math.sin(t * 11), 0, Math.sin(t * 2.3) * 0.05);
  const bulbK = mood.m === "search" ? 0.5 + 0.5 * Math.sin(t * 14) : 0.75 + 0.25 * Math.sin(t * 1.3) + v * 0.4;
  (Rb.bulb.material as THREE.MeshBasicMaterial).color.setRGB(1.9 * bulbK, 1.5 * bulbK, 1.15 * bulbK);
  const bp = new THREE.Vector3();
  Rb.bulb.getWorldPosition(bp);
  w.bulbLight.position.copy(bp);
  w.bulbLight.intensity = 0.02 * bulbK;
  const blink = mood.since < 0.12 ? Math.sin((mood.since / 0.12) * Math.PI) * 0.9 : blinkAt(t, 2.3);
  drawFace(w.face.ctx, { mood: mood.m, k: ease.out(clamp(mood.since / 0.25)), blink, lookX: p.lookX, lookY: p.lookY, talk: v, t, label });
  w.face.tex.needsUpdate = true;
  const pulse = clamp(0.35 + 0.15 * Math.sin(t * 1.6) + v * 0.35 + p.glow * 1.4, 0, 2);
  drawCore(w.chest.ctx, t, Math.min(1, pulse), p.spin);
  w.chest.tex.needsUpdate = true;
  Rb.chestMat.color.setScalar(1.8 + pulse * 0.9);
  const cp = new THREE.Vector3(0, 0.26, 0.42);
  Rb.torso.localToWorld(cp);
  w.chestLight.position.copy(cp);
  w.chestLight.intensity = 0.09 + 0.08 * pulse + 0.7 * p.glow;
}

// ───────────────────────────── camera: a shot list, each shot a slow move between two camera/target points
export type Shot = {
  a: number; // start time (cut)
  p0: V3; p1: V3; t0: V3; t1: V3; // camera and look-at, from → to over the shot
  fov: [number, number];
  focus: V3 | Who | "core" | [V3, V3]; // a point, a head, the robot's chest, or a two-shot (follows who talks)
  bokeh?: number; range?: number; // depth of field: blur size, in-focus depth
  scr?: [number, number, number, number]; // laptop-screen shot: [canvas x, canvas y, distance from, distance to]
  push?: number; // screen shots: hold, then push in at this time
};
export const shotIndex = (shots: Shot[], t: number) => {
  let i = 0;
  while (i + 1 < shots.length && t >= shots[i + 1].a) i++;
  return i;
};
export const headPt = (w: World, who: Who) => {
  const p = new THREE.Vector3(0, who === "H" ? 0.19 : 0.2, 0.12);
  (who === "H" ? w.human.head : w.robot.head).localToWorld(p);
  return p;
};
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

/** place the camera for time t; returns whether it is a screen shot (subtitles get a plate there) */
export function applyCamera(w: World, camera: THREE.PerspectiveCamera, shots: Shot[], t: number, end: number, o: { talking?: Who | null; jolt?: number } = {}) {
  const si = shotIndex(shots, t), sh = shots[si];
  const b = si + 1 < shots.length ? shots[si + 1].a : end;
  const k = ease.io(ramp(t, sh.a, b));
  let pos: THREE.Vector3, tgt: THREE.Vector3;
  if (sh.scr) {
    const [px, py, d0, d1] = sh.scr;
    const kk = sh.push ? 0.25 * ease.io(ramp(t, sh.a, sh.push)) + 0.75 * ease.io(ramp(t, sh.push - 0.1, sh.push + 1.4)) : k;
    const fpt = w.screenPt(px, py);
    tgt = fpt.clone().add(new THREE.Vector3(0, 0.55, 0));
    pos = tgt.clone().addScaledVector(w.screenN, lerp(d0, d1, kk)).add(new THREE.Vector3(0.1 * (1 - kk), 0.22, 0));
  } else {
    pos = v3(sh.p0).lerp(v3(sh.p1), k);
    tgt = v3(sh.t0).lerp(v3(sh.t1), k);
  }
  const jolt = o.jolt ?? 0; // a small hit on a punch word
  pos.x += wob(t, 11, 0.6) * 0.006 + Math.sin(t * 37) * jolt;
  pos.y += wob(t, 12, 0.5) * 0.005 + Math.cos(t * 41) * jolt;
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt);
  camera.fov = lerp(sh.fov[0], sh.fov[1], k);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  let fp: THREE.Vector3;
  if (sh.scr) fp = w.screenPt(sh.scr[0], sh.scr[1]);
  else if (sh.focus === "H" || sh.focus === "R") fp = headPt(w, sh.focus);
  else if (sh.focus === "core") {
    fp = new THREE.Vector3(0, 0.23, 0.17);
    w.robot.torso.localToWorld(fp);
  } else if (Array.isArray(sh.focus[0])) {
    const [fa, fb] = sh.focus as [V3, V3];
    const human = fa[0] < 0 ? fa : fb, robot = fa[0] < 0 ? fb : fa;
    fp = v3(o.talking === "H" ? human : robot);
  } else fp = v3(sh.focus as V3);
  w.dof.target!.copy(fp);
  w.dust.visible = !sh.scr;
  w.ambient(t, camera.position);
  w.dof.cocMaterial.focusRange = sh.range ?? 0.5;
  w.dof.bokehScale = sh.bokeh ?? 5;
  return { shot: si, screen: !!sh.scr };
}
