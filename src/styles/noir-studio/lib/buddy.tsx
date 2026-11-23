// Noir Studio · the buddies: small voxel robots that watch the video with the viewer and act out a light line
// («وایرال!» → a spin, «یک میلیون» → they faint, a prompt → they type). A head with a dark visor and two glowing
// dot eyes, an antenna, a small body, three-block arms, two legs. three.js in ONE transparent full-frame layer
// (orthographic, 1 world unit = 1 frame px), kept mounted for the whole film; every pose is a pure function of t.
// Rules (from the films): few appearances, only on light lines, never on a key claim, never across a caption.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { C, F, MUSIC, beatPulse, clamp, ease, hash, mix } from "./theme";

export type ActKind = "hop" | "cheer" | "wave" | "think" | "surprise" | "type" | "nod" | "stress" | "point" | "happy" | "walk" | "spin" | "peek" | "faint" | "shock" | "dance" | "clap" | "hold" | "wipe";
/** one action: [kind, start s, end s (default start + 0.6)] — put it on the word it acts out */
export type Act = [kind: ActKind, a: number, b?: number];
/** one appearance of one buddy */
export type Cue = {
  a: number; b: number;
  /** feet position in frame px and the size of one voxel in px (≈ 10–14) */
  x: number; y: number; s: number;
  yaw?: number;
  /** rise in place from the floor instead of walking in from the nearer frame edge */
  pop?: boolean;
  /** walk between marks: [time, x, y, s] */
  path?: [number, number, number, number][];
  /** turn to look: [time, yaw degrees] */
  look?: [number, number][];
  acts: Act[];
  /** a speech bubble above the head: [from, to, text] (one or two words) */
  say?: [number, number, string][];
};
export type BuddyLook = { body: string; glow: string; acc?: "scarf" | "headset" | "none" };
export const BUDDY_LOOKS: BuddyLook[] = [
  { body: "#D8D3CB", glow: "#FFB070", acc: "none" },
  { body: "#C9CDD4", glow: "#7FD6FF", acc: "headset" },
  { body: "#D9C8B4", glow: "#FFD36E", acc: "scarf" },
];

// ── the model (in voxels; feet at y = 0) ─────────────────────────────────────────────────────────────────────
type Rig = { root: THREE.Group; head: THREE.Group; eyes: THREE.Group[]; tip: THREE.Mesh; armL: THREE.Group; armR: THREE.Group; legs: THREE.Group[]; shadow: THREE.Mesh };
const HEAD_Y = 6.6; // centre of the head's bottom row
const TOP = 14.2; // top of the antenna tip (for bubbles)

let GEO: THREE.BufferGeometry | null = null;
const geo = () => (GEO ??= new RoundedBoxGeometry(0.975, 0.975, 0.975, 2, 0.12));
let SPH: THREE.BufferGeometry | null = null;
const sph = () => (SPH ??= new THREE.SphereGeometry(0.5, 20, 14));

const voxels = (cells: [number, number, number][], color: string, seed: number, opt: { dark?: number; rough?: number; metal?: number; scale?: number } = {}) => {
  const mat = new THREE.MeshStandardMaterial({ roughness: opt.rough ?? 0.55, metalness: opt.metal ?? 0.05 });
  const m = new THREE.InstancedMesh(geo(), mat, cells.length);
  const base = new THREE.Color(color), c = new THREE.Color(), o = new THREE.Object3D();
  cells.forEach(([x, y, z], i) => {
    o.position.set(x, y, z);
    o.scale.setScalar(opt.scale ?? 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    c.copy(base).multiplyScalar(0.96 + 0.06 * hash(seed + i * 7.31) - (opt.dark ?? 0));
    m.setColorAt(i, c);
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
};

let SHADOW: THREE.Texture | null = null;
const shadowTex = () => {
  if (SHADOW) return SHADOW;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const x = cv.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return (SHADOW = new THREE.CanvasTexture(cv));
};

const build = (L: BuddyLook, seed: number): Rig => {
  const root = new THREE.Group();
  // legs: two 2-block legs (feet at 0)
  const legs: THREE.Group[] = [];
  for (const lx of [-1.1, 1.1]) {
    const g = new THREE.Group();
    g.position.set(lx, 2, 0);
    g.add(voxels([[0, -0.5, 0], [0, -1.5, 0.15]], L.body, seed + lx * 5, { dark: 0.16, scale: 0.92 }));
    root.add(g);
    legs.push(g);
  }
  // body: 5 × 3 × 3 shell + a glowing chest light
  const body: [number, number, number][] = [];
  for (let x = -2; x <= 2; x++) for (let y = 0; y < 3; y++) for (let z = -1; z <= 1; z++) if (Math.abs(x) === 2 || y === 0 || y === 2 || Math.abs(z) === 1) body.push([x, 2.5 + y, z]);
  root.add(voxels(body, L.body, seed, { dark: 0.06 }));
  const chest = new THREE.Mesh(sph(), new THREE.MeshStandardMaterial({ color: L.glow, emissive: new THREE.Color(L.glow), emissiveIntensity: 1.4 }));
  chest.scale.setScalar(0.55);
  chest.position.set(0, 3.6, 1.55);
  root.add(chest);
  // head: 7 × 6 × 5 shell with a dark glossy visor on the front
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0);
  const shell: [number, number, number][] = [], visor: [number, number, number][] = [];
  for (let x = -3; x <= 3; x++)
    for (let y = 0; y < 6; y++)
      for (let z = -2; z <= 2; z++) {
        if (!(Math.abs(x) === 3 || y === 0 || y === 5 || Math.abs(z) === 2)) continue;
        if (z === 2 && Math.abs(x) <= 2 && y >= 1 && y <= 4) visor.push([x, y, z]);
        else shell.push([x, y, z]);
      }
  head.add(voxels(shell, L.body, seed + 3));
  head.add(voxels(visor, "#101216", seed + 9, { rough: 0.18, metal: 0.4 }));
  // eyes: two glowing dots on the visor
  const eyes: THREE.Group[] = [];
  for (const ex of [-1.25, 1.25]) {
    const g = new THREE.Group();
    g.position.set(ex, 2.9, 2.56);
    const e = new THREE.Mesh(sph(), new THREE.MeshStandardMaterial({ color: L.glow, emissive: new THREE.Color(L.glow), emissiveIntensity: 2.4, roughness: 0.3 }));
    e.scale.set(0.95, 1.25, 0.4);
    g.add(e);
    head.add(g);
    eyes.push(g);
  }
  // antenna: a thin stem and a glowing tip
  const stem = new THREE.Mesh(geo(), new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.5 }));
  stem.scale.set(0.22, 1.4, 0.22);
  stem.position.set(0, 6.1, 0);
  head.add(stem);
  const tip = new THREE.Mesh(sph(), new THREE.MeshStandardMaterial({ color: L.glow, emissive: new THREE.Color(L.glow), emissiveIntensity: 2.6 }));
  tip.scale.setScalar(0.62);
  tip.position.set(0, 7.0, 0);
  head.add(tip);
  if (L.acc === "headset") {
    head.add(voxels([[-3.6, 2.5, 0], [3.6, 2.5, 0], [-3.6, 3.5, 0], [3.6, 3.5, 0]], "#23262c", seed + 77, { rough: 0.4 }));
    const boom = voxels([[3.3, 1.2, 1.4], [2.6, 0.7, 2.2]], "#23262c", seed + 78, { scale: 0.45 });
    head.add(boom);
  }
  if (L.acc === "scarf") {
    const sc: [number, number, number][] = [];
    for (let x = -2; x <= 2; x++) sc.push([x, 5.7, 1.35], [x, 5.7, -1.35]);
    sc.push([-2.4, 5.7, 0], [2.4, 5.7, 0], [1.6, 4.9, 1.55], [1.7, 4.1, 1.6]);
    root.add(voxels(sc, "#B8432F", seed + 55, { scale: 0.9 }));
  }
  root.add(head);
  // arms: three blocks out of each side, pivoting at the shoulder
  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 2.55, 4.6, 0);
    g.add(voxels([[side * 0.55, 0, 0], [side * 1.45, 0, 0], [side * 2.35, 0, 0]], L.body, seed + side * 3, { dark: 0.04, scale: 0.82 }));
    root.add(g);
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  return { root, head, eyes, tip, armL, armR, legs, shadow };
};

// ── poses ───────────────────────────────────────────────────────────────────────────────────────────────────
export type Pose = {
  vis: number; x: number; y: number; s: number; yaw: number;
  hop: number; squash: number; lean: number; shake: number; tilt: number;
  armL: number; armR: number; armFwd: number;
  eyeH: number; eyeLook: number; legKick: number; dx: number; glow: number;
};
const win = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) => Math.min(clamp((t - a) / fi), 1 - clamp((t - b) / fo));
const hopAt = (t: number, at: number, h = 2.4, d = 0.42) => {
  const u = (t - at) / d;
  if (u <= -0.25 || u >= 1.25) return { y: 0, sq: 0 };
  if (u < 0) return { y: 0, sq: 0.16 * Math.sin((-u / 0.25) * Math.PI) };
  if (u > 1) return { y: 0, sq: 0.12 * Math.sin(((u - 1) / 0.25) * Math.PI) };
  return { y: h * 4 * u * (1 - u), sq: -0.1 * Math.sin(u * Math.PI) };
};

export const poseOf = (t: number, cue: Cue, seed: number): Pose => {
  const inU = ease.outBack(clamp((t - cue.a) / 0.45));
  const outU = ease.in(clamp((t - (cue.b - 0.3)) / 0.3));
  let x = cue.x, y = cue.y, s = cue.s;
  if (cue.path) {
    const P = cue.path;
    [, x, y, s] = P[0];
    for (let i = 1; i < P.length; i++) {
      if (t < P[i][0]) {
        const u = ease.inOut(clamp((t - P[i - 1][0]) / (P[i][0] - P[i - 1][0])));
        x = mix(P[i - 1][1], P[i][1], u); y = mix(P[i - 1][2], P[i][2], u); s = mix(P[i - 1][3], P[i][3], u);
        break;
      }
      [, x, y, s] = P[i];
    }
  }
  let yaw = cue.yaw ?? 0;
  if (cue.look) {
    let prev = cue.look[0][1];
    yaw = prev;
    for (const [at, v] of cue.look) {
      if (t < at) break;
      yaw = mix(prev, v, ease.inOut(clamp((t - at) / 0.35)));
      prev = v;
    }
  }
  const side = cue.pop ? 0 : x < 400 ? -1 : x > 680 ? 1 : 0;
  const walkIn = side ? clamp((t - cue.a) / 0.7) : 1, walkOut = side ? clamp((t - (cue.b - 0.6)) / 0.6) : 0;
  const edge = side > 0 ? 1080 + 6 * s : -6 * s;
  if (side) {
    x = mix(edge, x, ease.out(walkIn));
    x = mix(x, edge, ease.in(walkOut));
    const facing = side > 0 ? -80 : 80;
    yaw = mix(facing, yaw, ease.inOut(clamp((t - cue.a - 0.45) / 0.35)));
    if (walkOut > 0) yaw = mix(yaw, -facing, ease.inOut(clamp(walkOut * 3)));
  }
  const p: Pose = {
    vis: side ? 1 : clamp(inU) * (1 - outU), x, y: side ? y : y + ((1 - clamp(inU)) + outU) * (cue.pop ? 46 : 260), s, yaw,
    hop: 0, squash: 0, lean: 0, shake: 0, tilt: 0, armL: 0.12, armR: 0.12, armFwd: 0, eyeH: 1, eyeLook: 0, legKick: 0, dx: 0, glow: 0.3 * beatPulse(t, 7),
  };
  p.squash += 0.02 * Math.sin(t * 3.1 + seed) + 0.025 * beatPulse(t, 8);
  p.yaw += 4 * Math.sin(t * 0.7 + seed);
  p.tilt += 0.05 * Math.sin(t * 0.9 + seed * 2);
  const bl = (t * 0.37 + hash(seed) * 3) % 3;
  if (bl < 0.12) p.eyeH = 0.12;
  const walking = side ? Math.max(walkIn < 1 ? 1 - walkIn * walkIn : 0, walkOut > 0 && walkOut < 1 ? 1 : 0) : 0;
  if (walking > 0) {
    p.legKick = Math.max(p.legKick, walking);
    p.hop += walking * 0.4 * Math.abs(Math.sin(t * 11 + seed));
    p.armL += walking * 0.35 * Math.sin(t * 11 + seed);
    p.armR -= walking * 0.35 * Math.sin(t * 11 + seed);
  }
  for (const act of cue.acts) applyAct(t, act, p, seed);
  return p;
};

const applyAct = (t: number, [kind, a, b = a + 0.6]: Act, p: Pose, seed: number) => {
  const w = win(t, a, b);
  switch (kind) {
    case "hop": {
      const h = hopAt(t, a);
      p.hop += h.y;
      p.squash += h.sq;
      p.armL += 0.6 * Math.max(0, h.y / 2.4);
      p.armR += 0.6 * Math.max(0, h.y / 2.4);
      break;
    }
    case "cheer": {
      if (w <= 0) break;
      p.armL = mix(p.armL, 2.5 + 0.25 * Math.sin(t * 14 + seed), w);
      p.armR = mix(p.armR, 2.5 + 0.25 * Math.sin(t * 14 + seed + 1.3), w);
      p.eyeH = Math.min(p.eyeH, mix(1, 0.35, w));
      p.glow += w;
      const k = Math.floor((t - a) / 0.32), f = ((t - a) % 0.32) / 0.32;
      if (t > a && t < b) p.hop += w * 1.3 * 4 * f * (1 - f) * (k < 6 ? 1 : 0);
      break;
    }
    case "wave":
      if (w <= 0) break;
      p.armR = mix(p.armR, 2.2, w);
      p.armFwd += w * 0.6 * Math.sin((t - a) * 12);
      p.tilt += w * 0.12;
      break;
    case "think":
      if (w <= 0) break;
      p.armR = mix(p.armR, 1.6, w);
      p.armFwd += w * 0.9;
      p.tilt += w * 0.22 * Math.sin((t - a) * 1.6);
      p.eyeLook += w * 0.8 * Math.sin((t - a) * 1.3);
      break;
    case "surprise": {
      const u = clamp((t - a) / 0.15) * (1 - clamp((t - a - 0.7) / 0.3));
      p.eyeH = Math.max(p.eyeH, 1 + 0.6 * u);
      p.glow += u;
      const h = hopAt(t, a, 1.2, 0.3);
      p.hop += h.y;
      p.lean -= 0.18 * u;
      p.armL = mix(p.armL, 1.2, u);
      p.armR = mix(p.armR, 1.2, u);
      break;
    }
    case "type":
      if (w <= 0) break;
      p.armFwd += w * 1.2;
      p.armL = mix(p.armL, 0.45 + 0.35 * Math.max(0, Math.sin(t * 22 + seed)), w);
      p.armR = mix(p.armR, 0.45 + 0.35 * Math.max(0, Math.sin(t * 22 + seed + 2)), w);
      p.lean += w * 0.12;
      break;
    case "nod":
      if (w <= 0) break;
      p.lean += w * 0.1 * beatPulse(t, 6);
      p.squash += w * 0.05 * beatPulse(t, 6);
      break;
    case "stress":
      if (w <= 0) break;
      p.shake += w * 5 * Math.sin(t * 47 + seed);
      p.eyeH = Math.min(p.eyeH, mix(1, 0.3, w));
      p.squash += w * 0.1;
      p.armL = mix(p.armL, 1.9, w);
      p.armR = mix(p.armR, 1.9, w);
      break;
    case "point": {
      if (w <= 0) break;
      const jab = 0.12 * Math.max(0, Math.sin((t - a) * 9));
      if (p.x > 540) p.armL = mix(p.armL, 1.35 + jab, w);
      else p.armR = mix(p.armR, 1.35 + jab, w);
      p.armFwd += w * 0.25;
      p.lean += w * 0.08;
      break;
    }
    case "spin": {
      const u = clamp((t - a) / 0.62);
      const h = hopAt(t, a, 3.4, 0.62);
      p.hop += h.y;
      p.squash += h.sq;
      p.yaw += 360 * ease.inOut(u);
      p.armL = mix(p.armL, 2.6, Math.sin(Math.PI * u));
      p.armR = mix(p.armR, 2.6, Math.sin(Math.PI * u));
      break;
    }
    case "peek":
      if (w <= 0) break;
      p.lean += w * 0.3;
      p.eyeH = Math.min(p.eyeH, mix(1, 0.5, w));
      p.eyeLook += w * 0.4 * Math.sin((t - a) * 2.2);
      break;
    case "faint": {
      const pop = clamp((t - a) / 0.12) * (1 - clamp((t - a - 0.3) / 0.15));
      p.eyeH = Math.max(p.eyeH, 1 + 0.8 * pop);
      const fall = ease.in(clamp((t - a - 0.25) / 0.3)) * (1 - ease.outBack(clamp((t - (b - 0.45)) / 0.45)));
      p.lean -= 1.3 * fall;
      p.armL = mix(p.armL, 2.2, fall);
      p.armR = mix(p.armR, 2.2, fall);
      p.legKick = Math.max(p.legKick, fall);
      break;
    }
    case "shock":
      if (w <= 0) break;
      p.armL = mix(p.armL, 2.75, w);
      p.armR = mix(p.armR, 2.75, w);
      p.armFwd += w * 0.8;
      p.eyeH = Math.max(p.eyeH, mix(1, 1.5, w));
      p.shake += w * 2.5 * Math.sin(t * 40 + seed);
      break;
    case "dance": {
      if (w <= 0) break;
      const ph = (t + MUSIC.offset) / MUSIC.beat;
      p.dx += w * 1.1 * Math.sin(ph * Math.PI);
      p.yaw += w * 22 * Math.sin(ph * Math.PI);
      p.tilt += w * 0.15 * Math.sin(ph * Math.PI);
      p.armL = mix(p.armL, 1.2 + 1.1 * Math.max(0, Math.sin(ph * Math.PI)), w);
      p.armR = mix(p.armR, 1.2 + 1.1 * Math.max(0, -Math.sin(ph * Math.PI)), w);
      p.hop += w * 0.9 * Math.abs(Math.sin(ph * Math.PI));
      p.eyeH = Math.min(p.eyeH, mix(1, 0.35, w));
      p.glow += w * beatPulse(t, 6);
      break;
    }
    case "clap":
      if (w <= 0) break;
      p.armFwd += w * 1.25;
      p.armL = mix(p.armL, 0.55 + 0.4 * Math.abs(Math.sin(t * 13 + seed)), w);
      p.armR = mix(p.armR, 0.55 + 0.4 * Math.abs(Math.sin(t * 13 + seed)), w);
      p.eyeH = Math.min(p.eyeH, mix(1, 0.4, w));
      p.hop += w * 0.4 * Math.abs(Math.sin(t * 6.5));
      break;
    case "hold":
      if (w <= 0) break;
      p.armL = mix(p.armL, 2.95, w);
      p.armR = mix(p.armR, 2.95, w);
      p.squash += w * (0.08 + 0.16 * clamp((t - a) / Math.max(0.1, b - a)));
      p.shake += w * (1.5 + 5 * clamp((t - a) / Math.max(0.1, b - a))) * Math.sin(t * 45 + seed);
      p.eyeH = Math.min(p.eyeH, mix(1, 0.3, w));
      break;
    case "wipe":
      if (w <= 0) break;
      p.armR = mix(p.armR, 2.3, w);
      p.armFwd += w * (1.2 + 0.35 * Math.sin((t - a) * 9));
      p.eyeH = Math.min(p.eyeH, mix(1, 0.3, w));
      break;
    case "happy":
      if (w <= 0) break;
      p.eyeH = Math.min(p.eyeH, mix(1, 0.32, w));
      p.glow += 0.5 * w;
      break;
    case "walk":
      if (w <= 0) break;
      p.legKick = w;
      p.hop += w * 0.35 * Math.abs(Math.sin(t * 9 + seed));
      break;
  }
};

// ── the layer ───────────────────────────────────────────────────────────────────────────────────────────────
const activeCue = (t: number, cues: Cue[]) => cues.find((c) => t >= c.a - 0.05 && t <= c.b + 0.05) ?? null;

const Stage: React.FC<{ t: number; cast: Record<string, Cue[]>; looks: Record<string, BuddyLook> }> = ({ t, cast, looks }) => {
  const { scene, camera, gl } = useThree();
  const names = Object.keys(cast);
  const key = names.join("|") + JSON.stringify(looks);
  const rigs = useMemo(() => {
    scene.clear();
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    scene.add(new THREE.HemisphereLight("#f4f0ea", "#2a2622", 1.2));
    const keyL = new THREE.DirectionalLight("#fff0e2", 2.3);
    keyL.position.set(-0.6, 1, 1.2);
    scene.add(keyL);
    const rim = new THREE.DirectionalLight(C.accent2, 1.5);
    rim.position.set(0.9, 0.5, -1);
    scene.add(rim);
    const out: Record<string, Rig> = {};
    names.forEach((n, i) => {
      out[n] = build(looks[n] ?? BUDDY_LOOKS[i % BUDDY_LOOKS.length], 11 + i * 37);
      scene.add(out[n].shadow);
      scene.add(out[n].root);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, gl, key]);
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.left = -540; cam.right = 540; cam.top = 960; cam.bottom = -960;
    cam.near = 1; cam.far = 6000;
    cam.position.set(540, -960, 3000);
    cam.lookAt(540, -960, 0);
    cam.updateProjectionMatrix();
    names.forEach((n, i) => {
      const r = rigs[n];
      const cue = activeCue(t, cast[n]);
      if (!r || !cue) {
        if (r) r.root.visible = r.shadow.visible = false;
        return;
      }
      const p = poseOf(t, cue, 3 + i * 1.7);
      const vis = p.vis > 0.01;
      r.root.visible = r.shadow.visible = vis;
      const s = p.s * Math.max(0.001, p.vis);
      r.root.position.set(p.x + p.shake + p.dx * p.s, -(p.y - p.hop * p.s), 0);
      r.root.scale.set(s * (1 + p.squash * 0.6), s * (1 - p.squash), s * (1 + p.squash * 0.6));
      r.root.rotation.set(0.2 + p.lean, THREE.MathUtils.degToRad(p.yaw), 0, "XYZ");
      r.head.rotation.set(0, 0, p.tilt);
      r.armL.rotation.set(0, p.armFwd, -p.armL);
      r.armR.rotation.set(0, -p.armFwd, p.armR);
      for (const [k, e] of r.eyes.entries()) {
        e.scale.set(1, Math.max(0.08, p.eyeH), 1);
        e.position.x = (k ? 1.25 : -1.25) + p.eyeLook * 0.5;
      }
      (r.tip.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + 2.5 * clamp(p.glow);
      r.legs.forEach((g, k) => (g.position.y = 2 + p.legKick * 0.35 * Math.max(0, Math.sin(t * 9 + k * Math.PI))));
      const sh = s * 9 * (1 - Math.min(0.6, p.hop / 6));
      r.shadow.position.set(p.x, -p.y - s * 0.3, -200);
      r.shadow.scale.set(sh, sh * 0.3, 1);
      (r.shadow.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - Math.min(0.7, p.hop / 4));
    });
  }, [t, rigs, camera, cast, names]);
  return null;
};

/** a small speech bubble above a buddy: cream card, soft shadow, no cartoon outline */
const Bubbles: React.FC<{ t: number; cast: Record<string, Cue[]> }> = ({ t, cast }) => (
  <>
    {Object.keys(cast).map((n, i) => {
      const cue = activeCue(t, cast[n]);
      if (!cue) return null;
      const p = poseOf(t, cue, 3 + i * 1.7);
      return (cue.say ?? []).map(([a, b, text], j) => {
        if (t < a || t > b + 0.2) return null;
        const u = ease.outBack(clamp((t - a) / 0.3)), v = clamp((t - b) / 0.2);
        const top = p.y - p.hop * p.s - p.s * (TOP + 1.2);
        const fa = /[؀-ۿ]/.test(text);
        return (
          <div key={`${n}${j}`} style={{ position: "absolute", left: p.x - 160, top: top - 80, width: 320, height: 90, display: "flex", justifyContent: "center", alignItems: "flex-end", opacity: clamp(u) * (1 - v) * p.vis, transform: `scale(${0.5 + 0.5 * u})`, transformOrigin: "50% 100%" }}>
            <div style={{ position: "relative", padding: "8px 22px 10px", background: C.cream, color: "#15161a", fontFamily: fa ? F.faB : F.ui, fontWeight: 900, fontSize: fa ? 34 : 40, lineHeight: 1.15, borderRadius: 18, boxShadow: "0 14px 30px rgba(0,0,0,0.45)", direction: "rtl", whiteSpace: "nowrap" }}>
              {text}
              <div style={{ position: "absolute", left: "50%", bottom: -9, width: 18, height: 18, marginLeft: -9, background: C.cream, transform: "rotate(45deg)", borderRadius: 3 }} />
            </div>
          </div>
        );
      });
    })}
  </>
);

/** all buddies of the film in one transparent layer (mount it once, for the whole film; pass t as a prop —
 *  React context does not cross into the 3D canvas) */
export const Buddies: React.FC<{ t: number; cast: Record<string, Cue[]>; looks?: Record<string, BuddyLook> }> = ({ t, cast, looks = {} }) => (
  <>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <ThreeCanvas width={1080} height={1920} orthographic gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} style={{ background: "transparent" }}>
        <Stage t={t} cast={cast} looks={looks} />
      </ThreeCanvas>
    </div>
    <Bubbles t={t} cast={cast} />
  </>
);
/** height of a buddy from feet to antenna tip, in voxels (× cue.s = px) */
export const BUDDY_H = TOP;
