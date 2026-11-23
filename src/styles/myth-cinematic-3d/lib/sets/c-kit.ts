// Helpers for the C sets (palace, stairs): PBR materials, one-sided-rim silhouettes, smoke tubes and smoke puffs.
import * as THREE from "three";
import type { Tex } from "../kit";
import type { Sil } from "../tex";

/** a Poly Haven PBR material (maps already loaded into T) with its own repeat */
export const pbr = (
  T: Tex,
  id: string,
  rx: number,
  ry: number,
  o: { tint?: THREE.ColorRepresentation; rough?: number; nScale?: number; metal?: number; physical?: boolean; sheen?: THREE.ColorRepresentation; sheenRough?: number; side?: THREE.Side } = {},
) => {
  const clone = (k: string) => {
    const t = T[`${id}_${k}`].clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  const map = clone("diff");
  map.colorSpace = THREE.SRGBColorSpace;
  const args = {
    map,
    normalMap: clone("nor_gl"),
    roughnessMap: clone("rough"),
    roughness: o.rough ?? 1,
    metalness: o.metal ?? 0,
    color: o.tint ?? 0xffffff,
    normalScale: new THREE.Vector2(o.nScale ?? 1, o.nScale ?? 1),
    side: o.side ?? THREE.FrontSide,
  };
  if (o.physical || o.sheen !== undefined) {
    const m = new THREE.MeshPhysicalMaterial(args);
    if (o.sheen !== undefined) {
      m.sheen = 1;
      m.sheenColor = new THREE.Color(o.sheen);
      m.sheenRoughness = o.sheenRough ?? 0.45;
    }
    return m;
  }
  return new THREE.MeshStandardMaterial(args);
};

/// ---------------- silhouettes with volume: one-sided rim + pseudo-3D shading from a blurred "height" of the shape ----
const SIL_V = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vR; varying vec3 vUp; varying vec3 vF;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz;
  vR = normalize((modelMatrix*vec4(1.0, 0.0, 0.0, 0.0)).xyz); vUp = normalize((modelMatrix*vec4(0.0, 1.0, 0.0, 0.0)).xyz); vF = normalize(cross(vR, vUp));
  vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const SIL_F = /* glsl */ `
uniform sampler2D uMap; uniform sampler2D uVol; uniform vec2 uTexel; uniform vec2 uRimDir; uniform vec3 uRim; uniform vec3 uBody;
uniform vec3 uGlow; uniform vec2 uGlowAt; uniform float uGlowR;
uniform vec3 uLP[4]; uniform vec3 uLC[4]; uniform vec3 uAlb; uniform float uK; uniform float uFall;
varying vec2 vUv; varying vec3 vW; varying vec3 vR; varying vec3 vUp; varying vec3 vF;
#include <fog_pars_fragment>
void main(){
  float a = texture2D(uMap, vUv).a;
  if (a < 0.4) discard;
  // thin rim on the side of the outline that faces the light
  float o = 0.0;
  o += texture2D(uMap, vUv + uRimDir*uTexel*2.0).a*0.35;
  o += texture2D(uMap, vUv + uRimDir*uTexel*4.5).a*0.3;
  o += texture2D(uMap, vUv + uRimDir*uTexel*8.0).a*0.2;
  o += texture2D(uMap, vUv + uRimDir*uTexel*13.0).a*0.15;
  float rim = pow(clamp(1.0 - o, 0.0, 1.0), 2.0);
  vec3 c = uBody + uRim*rim;
  // volume: a normal from the blurred silhouette, lit by real point lights (front light shades it, back light rims it)
  vec2 e = uTexel*4.0;
  float hx = texture2D(uVol, vUv + vec2(e.x, 0.0)).a - texture2D(uVol, vUv - vec2(e.x, 0.0)).a;
  float hy = texture2D(uVol, vUv + vec2(0.0, e.y)).a - texture2D(uVol, vUv - vec2(0.0, e.y)).a;
  vec3 n = normalize(vec3(-hx*uK, -hy*uK, 1.0));
  for (int i = 0; i < 4; i++){
    vec3 Lw = uLP[i] - vW;
    float d2 = dot(Lw, Lw);
    vec3 L = Lw*inversesqrt(max(d2, 1e-6));
    vec3 Lc = vec3(dot(L, vR), dot(L, vUp), dot(L, vF));
    float fall = 1.0/(1.0 + d2*uFall);
    float diff = max(dot(n, Lc)*0.8 + 0.2, 0.0)*max(Lc.z + 0.35, 0.0);
    float back = pow(clamp(1.0 - n.z, 0.0, 1.0), 1.5)*max(dot(normalize(n.xy + 1e-5), normalize(Lc.xy + 1e-5)), 0.0)*max(-Lc.z + 0.2, 0.0);
    c += uLC[i]*fall*(uAlb*diff + back*1.2);
  }
  vec2 d = (vUv - uGlowAt)/vec2(uGlowR, uGlowR*0.5);
  c += uGlow*exp(-dot(d, d)*2.0);
  gl_FragColor = vec4(c, 1.0);
#include <fog_fragment>
}`;

const volCache = new Map<string, THREE.Texture>();
/** a soft "height" of a silhouette: two blurs of its alpha */
export const volOf = (map: THREE.Texture) => {
  const hit = volCache.get(map.uuid);
  if (hit) return hit;
  const img = map.image as HTMLCanvasElement;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d")!;
  x.globalAlpha = 0.5;
  x.filter = `blur(${Math.round(img.width / 40)}px)`;
  x.drawImage(img, 0, 0);
  x.filter = `blur(${Math.round(img.width / 14)}px)`;
  x.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  volCache.set(map.uuid, t);
  return t;
};

export class SilFig extends THREE.Group {
  body: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  u: Record<string, THREE.IUniform>;
  h: number;
  constructor(s: Sil, height: number, o: { rim?: THREE.ColorRepresentation; body?: THREE.ColorRepresentation; shadow?: boolean; alb?: THREE.ColorRepresentation } = {}) {
    super();
    this.h = height;
    const w = height * s.aspect;
    const img = s.map.image as HTMLCanvasElement;
    this.u = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMap: { value: null },
        uVol: { value: null },
        uTexel: { value: new THREE.Vector2(1 / (img?.width ?? 512), 1 / (img?.height ?? 1024)) },
        uRimDir: { value: new THREE.Vector2(0, 1) },
        uRim: { value: new THREE.Color(o.rim ?? 0x000000) },
        uBody: { value: new THREE.Color(o.body ?? 0x060504) },
        uGlow: { value: new THREE.Color(0x000000) },
        uGlowAt: { value: new THREE.Vector2(0.5, 0.5) },
        uGlowR: { value: 0.2 },
        uLP: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, -1e4, 0)) },
        uLC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
        uAlb: { value: new THREE.Color(o.alb ?? 0x2a2018) },
        uK: { value: 9 },
        uFall: { value: 0.9 },
      },
    ]);
    this.u.uMap.value = s.map;
    this.u.uVol.value = volOf(s.map);
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: SIL_V, fragmentShader: SIL_F, fog: true, side: THREE.DoubleSide });
    this.body = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
    this.body.position.y = height / 2;
    if (o.shadow) {
      this.body.castShadow = true;
      this.body.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: s.map, alphaTest: 0.4, side: THREE.DoubleSide });
      this.body.customDepthMaterial = new THREE.MeshDepthMaterial({ map: s.map, alphaTest: 0.4, side: THREE.DoubleSide });
    }
    this.add(this.body);
  }
  /** swap the silhouette (e.g. a walking pose); shadows follow */
  setSil(s: Sil) {
    if (this.u.uMap.value === s.map) return;
    this.u.uMap.value = s.map;
    this.u.uVol.value = volOf(s.map);
    if (this.body.customDistanceMaterial) (this.body.customDistanceMaterial as THREE.MeshDistanceMaterial).map = s.map;
    if (this.body.customDepthMaterial) (this.body.customDepthMaterial as THREE.MeshDepthMaterial).map = s.map;
  }
  /** up to four world-space point lights (colour already scaled by intensity) for the volume shading */
  lights(ps: THREE.Vector3[], cs: THREE.Color[]) {
    const P = this.u.uLP.value as THREE.Vector3[], C = this.u.uLC.value as THREE.Vector3[];
    for (let i = 0; i < 4; i++) {
      if (i < ps.length) {
        P[i].copy(ps[i]);
        C[i].set(cs[i].r, cs[i].g, cs[i].b);
      } else {
        P[i].set(0, -1e4, 0);
        C[i].set(0, 0, 0);
      }
    }
  }
  /** turn about Y to face the camera */
  face(cam: THREE.Camera) {
    const p = new THREE.Vector3();
    this.getWorldPosition(p);
    this.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
  }
  /** rim from a world-space light: direction in the figure's texture space, strength by angle (backlight) and distance */
  rimFrom(light: THREE.Vector3, cam: THREE.Camera, color: THREE.ColorRepresentation, k: number) {
    const p = new THREE.Vector3();
    this.getWorldPosition(p);
    p.y += this.h * 0.6;
    const toL = light.clone().sub(p);
    const dist = toL.length();
    toL.normalize();
    const toC = cam.position.clone().sub(p).normalize();
    const right = new THREE.Vector3(toC.z, 0, -toC.x).normalize();
    const dir = new THREE.Vector2(toL.dot(right), toL.y);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1);
    dir.normalize();
    this.u.uRimDir.value.copy(dir);
    const back = 0.35 + 0.65 * Math.max(0, -toL.dot(toC));
    (this.u.uRim.value as THREE.Color).set(color).multiplyScalar((k * back) / (1 + dist * dist * 0.08));
  }
}

// ---------------- smoke ----------------
const N3 = /* glsl */ `
float h31(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/** a soft, see-through smoke tube rebuilt every frame along a path; lit by up to three warm points */
export class SmokeTube {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  N: number;
  M: number;
  pos: Float32Array;
  nor: Float32Array;
  u: Record<string, THREE.IUniform>;
  private pts: THREE.Vector3[];
  constructor(N = 140, M = 16, color: THREE.ColorRepresentation = 0xffc890) {
    this.N = N;
    this.M = M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3);
    this.nor = new Float32Array(N * M * 3);
    const as = new Float32Array(N * M), at = new Float32Array(N * M);
    const idx: number[] = [];
    for (let i = 0; i < N; i++)
      for (let j = 0; j < M; j++) {
        as[i * M + j] = i / (N - 1);
        at[i * M + j] = j / M;
        if (i < N - 1) {
          const a = i * M + j, b = i * M + ((j + 1) % M), c = (i + 1) * M + j, d = (i + 1) * M + ((j + 1) % M);
          idx.push(a, c, b, b, c, d);
        }
      }
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute("aS", new THREE.BufferAttribute(as, 1));
    g.setAttribute("aT", new THREE.BufferAttribute(at, 1));
    g.setIndex(idx);
    this.u = {
      uT: { value: 0 },
      uOp: { value: 1 },
      uCol: { value: new THREE.Color(color) },
      uL: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      uLI: { value: new THREE.Vector3(1, 0, 0) },
      uLen: { value: 2 },
      uFlow: { value: 0.6 },
      uEdge: { value: 1.3 },
      uS0: { value: 0 },
      uS1: { value: 1 },
      uFadeA: { value: 0.05 },
      uFadeB: { value: 0.12 },
      uHead: { value: 0 },
      uBreak: { value: 0.2 },
      uHeadL: { value: 0.1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `attribute float aS; attribute float aT; varying float vS; varying float vT; varying vec3 vN; varying vec3 vVP; varying vec3 vW;
        void main(){ vS = aS; vT = aT; vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vVP = mv.xyz; vN = normalize(mat3(viewMatrix)*mat3(modelMatrix)*normal); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uT, uOp, uLen, uFlow, uEdge, uS0, uS1, uFadeA, uFadeB, uHead, uHeadL, uBreak; uniform vec3 uCol; uniform vec3 uL[3]; uniform vec3 uLI;
        varying float vS; varying float vT; varying vec3 vN; varying vec3 vVP; varying vec3 vW;
        ${N3}
        void main(){
          float f = abs(dot(normalize(vN), normalize(-vVP)));
          float dens = pow(clamp(f, 0.0, 1.0), uEdge);
          float s = mix(uS0, uS1, vS);
          vec3 q = vec3(s*uLen*2.2 - uT*uFlow, cos(vT*6.2831853)*0.8, sin(vT*6.2831853)*0.8);
          // streaky density: long gaps along the tube, finer curls drifting upward in world space
          float g = n3(vec3(s*uLen*0.9 - uT*uFlow*0.5, 3.7, 1.3));
          float w = n3(q*1.6 + vW*0.8)*0.5 + n3(q*4.0 + vW*2.5 + vec3(0.0, -uT*0.5, 0.0))*0.3 + n3(vW*9.0 - vec3(0.0, uT*0.8, 0.0))*0.2;
          float a = dens*smoothstep(uBreak, uBreak + 0.45, w*0.75 + g*0.45);
          a *= smoothstep(0.0, uFadeA, vS)*(1.0 - smoothstep(1.0 - uFadeB, 1.0, vS));
          a *= 1.0 + uHead*smoothstep(1.0 - uHeadL, 1.0 - uHeadL*0.4, vS);
          vec3 l = vec3(0.0);
          for (int i = 0; i < 3; i++){ vec3 d = vW - uL[i]; l += vec3(uLI[i]/(1.0 + dot(d, d)*0.9)); }
          vec3 c = uCol*(0.18 + l.x);
          gl_FragColor = vec4(c*a*uOp, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.pts = Array.from({ length: N }, () => new THREE.Vector3());
  }
  /** rebuild along path(s) for s in [s0, s1] (local coords of the mesh's parent) with radius(s) */
  set(path: (s: number) => THREE.Vector3, radius: (s: number) => number, s0 = 0, s1 = 1, flat?: (s: number) => number) {
    const { N, M, pos, nor, pts } = this;
    for (let i = 0; i < N; i++) pts[i].copy(path(s0 + ((s1 - s0) * i) / (N - 1)));
    const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      T.copy(pts[Math.min(N - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]);
      if (T.lengthSq() < 1e-10) T.set(0, 1, 0);
      T.normalize();
      if (i === 0) {
        Nn.set(0, 0, 1);
        if (Math.abs(T.z) > 0.9) Nn.set(1, 0, 0);
      }
      Nn.addScaledVector(T, -Nn.dot(T)).normalize();
      B.crossVectors(T, Nn);
      const sv = s0 + ((s1 - s0) * i) / (N - 1);
      const r = radius(sv);
      const fy = flat ? flat(sv) : 1;
      for (let j = 0; j < M; j++) {
        const th = (j / M) * Math.PI * 2;
        o.copy(Nn).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
        const k = (i * M + j) * 3;
        pos[k] = pts[i].x + o.x * r;
        pos[k + 1] = pts[i].y + o.y * r * fy;
        pos[k + 2] = pts[i].z + o.z * r;
        nor[k] = o.x;
        nor[k + 1] = o.y;
        nor[k + 2] = o.z;
      }
    }
    this.u.uS0.value = s0;
    this.u.uS1.value = s1;
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
  }
  lights(ls: THREE.Vector3[], k: number[]) {
    ls.forEach((l, i) => (this.u.uL.value as THREE.Vector3[])[i].copy(l));
    (this.u.uLI.value as THREE.Vector3).set(k[0] ?? 0, k[1] ?? 0, k[2] ?? 0);
  }
}

/** soft smoke puffs as points: per-puff position, size (world m), opacity and spin; lit warm by three points */
export class Puffs {
  pts: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  n: number;
  pos: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  rot: Float32Array;
  u: Record<string, THREE.IUniform>;
  constructor(T: Tex, n: number, pxH: number, color: THREE.ColorRepresentation = 0xd8c0a0, additive = false) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.rot = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute("aRot", new THREE.BufferAttribute(this.rot, 1));
    this.u = {
      uMap: { value: T.smoke },
      uPx: { value: pxH },
      uCol: { value: new THREE.Color(color) },
      uL: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      uLI: { value: new THREE.Vector3(1, 0, 0) },
      uAmb: { value: 0.12 },
      uProjY: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aRot; uniform float uPx; uniform float uProjY; uniform vec3 uL[3]; uniform vec3 uLI; uniform float uAmb;
        varying float vA; varying float vR; varying float vL;
        void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vec4 mv = viewMatrix*w;
          float l = uAmb; for (int i = 0; i < 3; i++){ vec3 d = w.xyz - uL[i]; l += uLI[i]/(1.0 + dot(d, d)*0.9); }
          vL = l; vA = aAlpha; vR = aRot;
          gl_PointSize = min(aSize*uPx*uProjY*0.5/max(-mv.z, 0.05), 900.0);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; varying float vA; varying float vR; varying float vL;
        void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
          float m = texture2D(uMap, p + 0.5).a*smoothstep(0.5, 0.25, length(p));
          float a = m*vA;
          ${additive ? "gl_FragColor = vec4(uCol*vL*a, 1.0);" : "gl_FragColor = vec4(uCol*vL, a);"} }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pts = new THREE.Points(g, mat);
    this.pts.frustumCulled = false;
  }
  set(i: number, p: THREE.Vector3, size: number, alpha: number, rot = 0) {
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.size[i] = size;
    this.alpha[i] = alpha;
    this.rot[i] = rot;
  }
  commit(cam: THREE.PerspectiveCamera) {
    this.u.uProjY.value = 1 / Math.tan((cam.fov * Math.PI) / 360);
    const a = this.pts.geometry.attributes;
    a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = a.aRot.needsUpdate = true;
  }
  lights(ls: THREE.Vector3[], k: number[]) {
    ls.forEach((l, i) => (this.u.uL.value as THREE.Vector3[])[i].copy(l));
    (this.u.uLI.value as THREE.Vector3).set(k[0] ?? 0, k[1] ?? 0, k[2] ?? 0);
  }
}

/** pointed (Persian) arch outline: width w, springing height h, apex rise = w * rise */
export const archPath = (s: THREE.Path | THREE.Shape, cx: number, w: number, h: number, rise = 0.62, base = 0) => {
  s.moveTo(cx - w / 2, base);
  s.lineTo(cx - w / 2, h);
  s.bezierCurveTo(cx - w / 2, h + w * rise * 0.55, cx - w * 0.14, h + w * rise * 0.85, cx, h + w * rise);
  s.bezierCurveTo(cx + w * 0.14, h + w * rise * 0.85, cx + w / 2, h + w * rise * 0.55, cx + w / 2, h);
  s.lineTo(cx + w / 2, base);
  return s;
};

/** a volumetric light shaft as an axial billboard: a soft card along the beam axis that turns about the axis to face
 *  the camera; gaussian across, fading in and out along, with slow drifting dust streaks */
export class BeamCard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  a: THREE.Vector3;
  b: THREE.Vector3;
  u: Record<string, THREE.IUniform>;
  constructor(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, color: THREE.ColorRepresentation, opacity: number) {
    this.a = a.clone();
    this.b = b.clone();
    this.u = { uCol: { value: new THREE.Color(color) }, uOp: { value: opacity }, uT: { value: 0 }, uR0: { value: r0 }, uR1: { value: r1 } };
    const g = new THREE.PlaneGeometry(1, 1, 1, 24);
    this.mesh = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.u,
        vertexShader: `uniform float uR0, uR1; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; float w = mix(uR1, uR0, uv.y); p.x *= w*2.6; gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uOp, uT; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          void main(){
            float x = (vUv.x - 0.5)*2.6;
            float across = exp(-x*x*2.2);
            float along = smoothstep(1.0, 0.85, vUv.y)*smoothstep(0.0, 0.35, vUv.y);
            float st = 0.65 + 0.35*n(vec2(vUv.x*9.0 + uT*0.05, vUv.y*2.0 - uT*0.08)) + 0.15*n(vec2(vUv.x*31.0, vUv.y*6.0 + uT*0.1));
            gl_FragColor = vec4(uCol*across*along*st*uOp, 1.0);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    this.mesh.frustumCulled = false;
  }
  /** orient toward the camera (camera position in the mesh parent's local space) */
  face(camLocal: THREE.Vector3, t: number) {
    this.u.uT.value = t;
    const ax = this.b.clone().sub(this.a);
    const len = ax.length();
    ax.normalize();
    const mid = this.a.clone().add(this.b).multiplyScalar(0.5);
    const toC = camLocal.clone().sub(mid);
    const side = ax.clone().cross(toC).normalize();
    const nrm = side.clone().cross(ax).normalize();
    const m = new THREE.Matrix4().makeBasis(side.clone().negate(), ax.clone().negate(), nrm);
    this.mesh.quaternion.setFromRotationMatrix(m);
    this.mesh.position.copy(mid);
    this.mesh.scale.set(1, len, 1);
  }
}
