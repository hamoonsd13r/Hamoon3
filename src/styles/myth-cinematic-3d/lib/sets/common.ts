// Shared types for the «Shahmaran» sets. Each set module builds its groups and owns its shots (camera + fog).
import * as THREE from "three";
import type { Board, Figure, Flame, Tex } from "../kit";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** sets live far apart so their lights never mix */
export const HALL = V(0, 0, -2000), PAL = V(2000, 0, 0), STAIR = V(-2000, 0, 0), EYE = V(0, 0, 2000);

export type Cam = { p: THREE.Vector3; l: THREE.Vector3; fov: number; roll?: number };
export type Shot = {
  a: number;
  b: number;
  /** names of the groups visible in this shot */
  set: string[];
  cam: (k: number, t: number) => Cam;
  /** depth of field: world focus distance and range (m) */
  focus?: number;
  range?: number;
  /** depth-of-field blur size (default 3) */
  bokeh?: number;
  fog?: THREE.FogExp2 | null;
};
export type Ctx = {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  W: number;
  H: number;
  T: Tex;
  /** serpent scale textures (shared by the hall and the eye) */
  S: { map: THREE.Texture; normal: THREE.Texture };
  /** creates a named group at a position; its visibility is driven by the shot list */
  mk: (name: string, at?: THREE.Vector3) => THREE.Group;
  sets: Record<string, THREE.Group>;
  /** registered objects get their per-frame flicker / face-the-camera for free */
  flames: Flame[];
  figures: Figure[];
  boards: Board[];
};
export type SetMod = {
  shots: Shot[];
  /** called every frame (check visibility yourself); sh = the current shot */
  update: (t: number, sh: Shot) => void;
  /** extra bloom intensity at t (e.g. a flash on a reveal) */
  bloom?: (t: number) => number;
};

export const isVisible = (o: THREE.Object3D) => {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
};
