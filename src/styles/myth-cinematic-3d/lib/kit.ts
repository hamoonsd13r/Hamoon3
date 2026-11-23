// Small 3D building blocks for «Shahmaran»: billboards, flames, silhouettes, stone materials, dust.
import * as THREE from "three";
import { flicker, rnd } from "./lib";
import type { Sil } from "./tex";

export type Tex = Record<string, THREE.Texture>;

/** textured stone (Poly Haven maps already loaded into T) */
export const stone = (T: Tex, id: string, rx: number, ry: number, tint = 0xffffff, rough = 1) => {
  const clone = (k: string) => {
    const t = T[`${id}_${k}`].clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  };
  const map = clone("diff");
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, normalMap: clone("nor_gl"), roughnessMap: clone("rough"), roughness: rough, color: tint, normalScale: new THREE.Vector2(1.2, 1.2) });
};

/** camera-facing quad */
export class Board extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  constructor(map: THREE.Texture, color: THREE.ColorRepresentation, w: number, h: number, additive = true, opacity = 1) {
    super(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive }));
  }
  face(cam: THREE.Camera) {
    this.quaternion.copy(cam.quaternion);
  }
}

/** a candle / lamp / torch flame: flame sprite + glow (+ optional real light) */
export class Flame extends THREE.Group {
  flame: Board;
  glow: Board;
  light?: THREE.PointLight;
  seed: number;
  size: number;
  power = 1;
  constructor(T: Tex, size: number, seed: number, light = 0, color = 0xffa055) {
    super();
    this.seed = seed;
    this.size = size;
    this.flame = new Board(T.flame, 0xffffff, size * 0.5, size);
    this.flame.position.y = size * 0.38;
    this.glow = new Board(T.glow, color, size * 7, size * 7, true, 0.55);
    this.glow.position.y = size * 0.3;
    this.add(this.glow, this.flame);
    if (light > 0) {
      this.light = new THREE.PointLight(color, light, 0, 2);
      this.light.position.y = size * 0.5;
      this.add(this.light);
    }
  }
  tick(t: number, cam: THREE.Camera) {
    const f = flicker(t, this.seed) * this.power;
    this.visible = this.power > 0.002;
    this.flame.face(cam);
    this.glow.face(cam);
    this.flame.scale.set(0.9 + 0.15 * f, f, 1);
    this.flame.material.opacity = Math.min(1, this.power * 1.2);
    this.glow.material.opacity = 0.5 * f;
    if (this.light) this.light.intensity = (this.light.userData.base ?? (this.light.userData.base = this.light.intensity)) * f;
  }
}

/** silhouette cut-out with a warm halo behind it (rim light); turns about Y to face the camera */
export class Figure extends THREE.Group {
  body: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  halo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  constructor(s: Sil, height: number, haloColor: THREE.ColorRepresentation = 0xffa860, haloOpacity = 0.5, body = 0x050403) {
    super();
    const w = height * s.aspect;
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.02, height * 1.015), new THREE.MeshBasicMaterial({ map: s.halo, color: haloColor, transparent: true, opacity: haloOpacity * 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.body = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshBasicMaterial({ map: s.map, color: body, transparent: true, alphaTest: 0.35 }));
    this.halo.position.set(0, height / 2, -0.02);
    this.body.position.set(0, height / 2, 0);
    this.add(this.halo, this.body);
  }
  face(cam: THREE.Camera) {
    const p = new THREE.Vector3();
    this.getWorldPosition(p);
    this.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
  }
}

/** floating dust: soft points drifting in a box */
export const dust = (T: Tex, n: number, box: [number, number, number], center: THREE.Vector3, color: THREE.ColorRepresentation, size = 0.05, opacity = 0.6) => {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = center.x + (rnd(i) - 0.5) * box[0];
    pos[i * 3 + 1] = center.y + (rnd(i + 7) - 0.5) * box[1];
    pos[i * 3 + 2] = center.z + (rnd(i + 13) - 0.5) * box[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const base = pos.slice();
  const m = new THREE.PointsMaterial({ map: T.dot, color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  const tick = (t: number, wind: [number, number, number] = [0.05, 0.02, 0]) => {
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const wx = (((base[k] - center.x + t * wind[0] * (0.5 + rnd(i))) % box[0]) + box[0] * 1.5) % box[0] - box[0] / 2;
      pos[k] = center.x + wx + Math.sin(t * 0.7 + i) * 0.04;
      pos[k + 1] = base[k + 1] + Math.sin(t * 0.5 + i * 1.3) * 0.08 + t * wind[1] * (rnd(i + 3) - 0.3);
      pos[k + 2] = base[k + 2] + Math.cos(t * 0.6 + i) * 0.05 + t * wind[2];
    }
    g.attributes.position.needsUpdate = true;
  };
  return { pts, tick };
};

/** additive cone of light (god ray) with soft edges and moving dust noise */
export const shaft = (len: number, r0: number, r1: number, color: THREE.ColorRepresentation, opacity: number) => {
  const geo = new THREE.CylinderGeometry(r0, r1, len, 48, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: opacity }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0); vP = position; vY = -position.y/${len.toFixed(2)}; vN = normalize(normalMatrix*normal); vec4 mv = viewMatrix*w; vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; uniform float uT; varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float edge = pow(abs(dot(vN, vV)), 2.2); float fall = smoothstep(0.0, 0.08, vY) * (1.0 - smoothstep(0.55, 1.0, vY));
        float a = atan(vP.z, vP.x); float streak = 0.6 + 0.4*n(vec2(a*6.0, vY*3.0 - uT*0.15));
        gl_FragColor = vec4(uColor * edge * fall * streak * uOp, 1.0); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
};
