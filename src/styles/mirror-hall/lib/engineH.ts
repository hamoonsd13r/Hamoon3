// Mirror Hall · the mirror hall's renderer. Per frame:
//   1. her picture (her light figure from the front, for the mirror pieces to reflect)
//   2. the floor's planar reflection (the hall + the light, from a camera mirrored under the floor)
//   3. the hall → colour + depth (supersampled by `ss`)
//   4. depth of field for the hall (half-res bokeh gather, then composited by circle of confusion; depth is
//      written again so the light that follows is still hidden behind walls)
//   5. the light (particles: the figures, dust, sparks) on top, depth-tested
//   6. bloom → ACES → grade (chromatic aberration, vignette, grain)
// Everything is a pure function of the state the director sets for the frame.
import * as THREE from "three";
import { BloomEffect, BlendFunction, Effect, EffectComposer, EffectPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { G } from "./base/shapes89";
import { buildHall } from "./archH";
import { makeFloorMaterial, makeHallMaterial, makeHallUniforms, NI, NL, type HallUniforms } from "./hallMat";
import { makeCandlestick, makeFlames, type Candlestick } from "./propsH";
import type { Mirror } from "./mirrorH";

export type CamState = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll?: number; focus: number; aper: number };
export type LightDef = { p: THREE.Vector3; dif: [number, number, number]; rad: [number, number, number]; r: number };

class GradeH extends Effect {
  constructor() {
    super(
      "GradeH",
      /* glsl */ `
uniform float black, ca, vig, exposure, grain, seed, lift;
float gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * ca * (0.5 + r2 * 2.0);
  vec3 c = vec3(texture2D(inputBuffer, uv - off).r, texture2D(inputBuffer, uv).g, texture2D(inputBuffer, uv + off).b);
  c *= exposure;
  c *= 1.0 - vig * smoothstep(0.08, 0.6, r2 * 1.6);
  c = c * (1.0 - lift) + lift * vec3(0.010, 0.015, 0.032);
  float g = (gh(uv * 1731.0) + gh(uv * 913.0 + 3.1) - 1.0) * grain;
  c += g * (0.25 + 0.75 * sqrt(max(dot(c, vec3(0.333)), 0.0)));
  c *= 1.0 - clamp(black, 0.0, 1.0);
  outputColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
      {
        blendFunction: BlendFunction.SET,
        uniforms: new Map<string, THREE.Uniform>([
          ["black", new THREE.Uniform(0)],
          ["ca", new THREE.Uniform(0.0012)],
          ["vig", new THREE.Uniform(0.5)],
          ["exposure", new THREE.Uniform(1)],
          ["grain", new THREE.Uniform(0.035)],
          ["seed", new THREE.Uniform(0)],
          ["lift", new THREE.Uniform(0.02)],
        ]),
      },
    );
  }
  set(k: string, v: number) {
    this.uniforms.get(k)!.value = v;
  }
}

const FS_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;
function fsPass(mat: THREE.ShaderMaterial) {
  const scene = new THREE.Scene();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false;
  scene.add(m);
  return scene;
}
const DEPTH_FN = /* glsl */ `
uniform float cNear, cFar, focus, aper, maxC;
float viewDist(float d){ return (cNear * cFar) / (cFar - d * (cFar - cNear)); }
float cocOf(float z){ return min(aper * abs(z - focus) / max(z, 1.0), maxC); }
`;

export class HallEngine {
  r!: THREE.WebGLRenderer;
  W = 1920; H = 1080; ss = 1; SW = 1920; SH = 1080;
  cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 4000);
  mcam = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 4000);
  herCam = new THREE.OrthographicCamera(-30, 30, 26, -26, 0.5, 600);
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  hallScene = new THREE.Scene();
  partScene = new THREE.Scene();
  U!: HallUniforms;
  floor!: THREE.Mesh;
  hall!: THREE.Mesh;
  info!: ReturnType<typeof buildHall>["info"];
  sticks: Candlestick[] = [];
  flames!: ReturnType<typeof makeFlames>;
  rtMain!: THREE.WebGLRenderTarget;
  rtHalf!: THREE.WebGLRenderTarget;
  rtBlur!: THREE.WebGLRenderTarget;
  rtRefl!: THREE.WebGLRenderTarget;
  rtHer!: THREE.WebGLRenderTarget;
  rtGlow!: THREE.WebGLRenderTarget;
  rtGlow2!: THREE.WebGLRenderTarget;
  glowBlur!: { scene: THREE.Scene; mat: THREE.ShaderMaterial };
  glowAdd!: { scene: THREE.Scene; mat: THREE.ShaderMaterial };
  glowK = 1.0;
  partMats: THREE.ShaderMaterial[] = [];
  mirror: Mirror | null = null;
  rtMirror: THREE.WebGLRenderTarget | null = null;
  mirCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 4000);
  prep!: { scene: THREE.Scene; mat: THREE.ShaderMaterial };
  gather!: { scene: THREE.Scene; mat: THREE.ShaderMaterial };
  comp!: { scene: THREE.Scene; mat: THREE.ShaderMaterial };
  composer!: EffectComposer;
  bloom!: BloomEffect;
  grade!: GradeH;
  /** particle systems register here: (pass) → set their resolution uniforms for the target they draw into */
  partRes: ((w: number, h: number, px: number) => void)[] = [];
  /** called before/after her picture pass (to mask everything but her) */
  herMask: ((on: boolean) => void)[] = [];

  static create(canvas: HTMLCanvasElement, o: { W: number; H: number; ss: number }) {
    const E = new HallEngine();
    E.W = o.W;
    E.H = o.H;
    E.ss = o.ss;
    E.SW = Math.round(o.W * o.ss);
    E.SH = Math.round(o.H * o.ss);
    E.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: true, depth: true });
    E.r.setPixelRatio(1);
    E.r.setSize(E.SW, E.SH, false);
    E.r.toneMapping = THREE.NoToneMapping;
    E.r.autoClear = false;
    E.cam.aspect = E.mcam.aspect = o.W / o.H;
    E.U = makeHallUniforms();
    const { geo, floor, info } = buildHall();
    E.info = info;
    E.hall = new THREE.Mesh(geo, makeHallMaterial(E.U));
    E.hall.frustumCulled = false;
    E.hallScene.add(E.hall);
    E.floor = new THREE.Mesh(floor, makeFloorMaterial(E.U));
    E.floor.frustumCulled = false;
    E.hallScene.add(E.floor);
    E.flames = makeFlames();
    E.hallScene.add(E.flames.mesh);
    // render targets
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } as const;
    E.rtMain = new THREE.WebGLRenderTarget(E.SW, E.SH, { ...hf, depthBuffer: true });
    E.rtMain.depthTexture = new THREE.DepthTexture(E.SW, E.SH, THREE.FloatType);
    E.rtHalf = new THREE.WebGLRenderTarget(E.SW >> 1, E.SH >> 1, { ...hf, depthBuffer: false });
    E.rtBlur = new THREE.WebGLRenderTarget(E.SW >> 1, E.SH >> 1, { ...hf, depthBuffer: false });
    E.rtRefl = new THREE.WebGLRenderTarget(E.SW >> 1, E.SH >> 1, { ...hf, depthBuffer: true });
    E.rtHer = new THREE.WebGLRenderTarget(512, 448, { ...hf, depthBuffer: false });
    E.U.reflTex.value = E.rtRefl.texture;
    E.U.reflRes.value.set(E.SW >> 1, E.SH >> 1);
    E.U.herRT.value = E.rtHer.texture;
    // the light's own glow: the particles drawn small (quarter res), blurred, added back
    E.rtGlow = new THREE.WebGLRenderTarget(E.SW >> 2, E.SH >> 2, { ...hf, depthBuffer: false });
    E.rtGlow2 = new THREE.WebGLRenderTarget(E.SW >> 2, E.SH >> 2, { ...hf, depthBuffer: false });
    {
      const bm = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null as THREE.Texture | null }, dir: { value: new THREE.Vector2(1, 0) } }, vertexShader: FS_VERT, depthTest: false, depthWrite: false, fragmentShader: `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
 void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.1964;
  c += (texture2D(tSrc, vUv + dir * 1.4118).rgb + texture2D(tSrc, vUv - dir * 1.4118).rgb) * 0.2969;
  c += (texture2D(tSrc, vUv + dir * 3.2941).rgb + texture2D(tSrc, vUv - dir * 3.2941).rgb) * 0.0945;
  c += (texture2D(tSrc, vUv + dir * 5.1765).rgb + texture2D(tSrc, vUv - dir * 5.1765).rgb) * 0.0104;
  gl_FragColor = vec4(c, 1.0); }` });
      E.glowBlur = { scene: fsPass(bm), mat: bm };
      const am = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: E.rtGlow.texture }, k: { value: 1 } }, vertexShader: FS_VERT, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, fragmentShader: `uniform sampler2D tSrc; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * k, 1.0); }` });
      E.glowAdd = { scene: fsPass(am), mat: am };
    }
    // depth of field passes
    const dofU = { tCol: { value: E.rtMain.texture }, tDep: { value: E.rtMain.depthTexture }, tHalf: { value: E.rtHalf.texture }, tBlur: { value: E.rtBlur.texture }, res: { value: new THREE.Vector2(E.SW, E.SH) }, hres: { value: new THREE.Vector2(E.SW >> 1, E.SH >> 1) }, cNear: { value: 0.5 }, cFar: { value: 4000 }, focus: { value: 100 }, aper: { value: 0 }, maxC: { value: 24 } };
    const mk = (frag: string, extra: Partial<THREE.ShaderMaterialParameters> = {}) => {
      const mat = new THREE.ShaderMaterial({ uniforms: dofU, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra });
      return { scene: fsPass(mat), mat };
    };
    // half-res colour (4 taps) + view distance in alpha
    E.prep = mk(/* glsl */ `
uniform sampler2D tCol, tDep; uniform vec2 res;
${DEPTH_FN}
varying vec2 vUv;
void main(){
  vec2 p = 0.5 / res;
  vec3 c = texture2D(tCol, vUv + vec2(-p.x, -p.y)).rgb + texture2D(tCol, vUv + vec2(p.x, -p.y)).rgb + texture2D(tCol, vUv + vec2(-p.x, p.y)).rgb + texture2D(tCol, vUv + vec2(p.x, p.y)).rgb;
  float d = min(min(texture2D(tDep, vUv + vec2(-p.x, -p.y)).r, texture2D(tDep, vUv + vec2(p.x, -p.y)).r), min(texture2D(tDep, vUv + vec2(-p.x, p.y)).r, texture2D(tDep, vUv + vec2(p.x, p.y)).r));
  gl_FragColor = vec4(c * 0.25, viewDist(d));
}`);
    // bokeh gather (Dennis Gustafsson's single-pass scatter-as-gather on a golden-angle spiral), half res
    E.gather = mk(/* glsl */ `
uniform sampler2D tHalf; uniform vec2 hres;
${DEPTH_FN}
varying vec2 vUv;
void main(){
  vec4 c0 = texture2D(tHalf, vUv);
  float z0 = c0.a;
  float s0 = cocOf(z0) * 0.5;
  vec3 col = c0.rgb; float tot = 1.0;
  float R = maxC * 0.5;
  float rad = 0.6;
  for (float ang = 0.0; ang < 2000.0; ang += 2.39996323) {
    if (rad >= R) break;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) / hres * rad;
    vec4 s = texture2D(tHalf, tc);
    float ss = cocOf(s.a) * 0.5;
    if (s.a > z0) ss = clamp(ss, 0.0, s0 * 2.0);
    float m = smoothstep(rad - 0.5, rad + 0.5, ss);
    // brighter samples weigh more: highlights become discs (bokeh)
    float hl = 1.0 + 1.5 * clamp(dot(s.rgb, vec3(0.3, 0.6, 0.1)) - 0.8, 0.0, 6.0);
    col += mix(col / tot, s.rgb, m) * hl;
    tot += hl;
    rad += 0.75 / rad;
  }
  gl_FragColor = vec4(col / tot, z0);
}`);
    // composite (full res): sharp where in focus, the bokeh gather elsewhere; write the hall's depth again
    E.comp = mk(
      /* glsl */ `
uniform sampler2D tCol, tDep, tBlur; uniform vec2 res;
${DEPTH_FN}
varying vec2 vUv;
void main(){
  float d = texture2D(tDep, vUv).r;
  float z = viewDist(d);
  float c = cocOf(z);
  vec3 sharp = texture2D(tCol, vUv).rgb;
  vec3 blur = texture2D(tBlur, vUv).rgb;
  float k = smoothstep(0.6, 2.6, c);
  gl_FragColor = vec4(mix(sharp, blur, k), 1.0);
  gl_FragDepth = d;
}`,
      { depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth },
    );
    // post
    E.composer = new EffectComposer(E.r, { frameBufferType: THREE.HalfFloatType, multisampling: 0, depthBuffer: true });
    E.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.55, luminanceSmoothing: 0.35, intensity: 1.1, radius: 0.72, levels: 9 });
    E.composer.addPass(new EffectPass(E.postCam, E.bloom, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
    E.grade = new GradeH();
    E.composer.addPass(new EffectPass(E.postCam, E.grade));
    E.composer.setSize(E.SW, E.SH, false);
    (E as unknown as { dofU: typeof dofU }).dofU = dofU;
    return E;
  }

  addMirror(M: Mirror) {
    this.mirror = M;
    this.hallScene.add(M.root);
    M.shards.forEach((s) => this.hallScene.add(s.m));
    this.rtMirror = new THREE.WebGLRenderTarget(this.SW >> 1, this.SH >> 1, { type: THREE.HalfFloatType, depthBuffer: true });
    M.gU.reflTexM.value = this.rtMirror.texture;
    M.gU.reflResM.value.set(this.SW >> 1, this.SH >> 1);
  }
  /** the mother's mirror: its true reflection (a camera mirrored in the glass plane, oblique near plane) */
  private renderMirror() {
    const M = this.mirror!, r = this.r, glass = M.glass;
    M.root.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(glass.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const p0 = glass.getWorldPosition(new THREE.Vector3());
    const cp = this.cam.position.clone();
    if (cp.clone().sub(p0).dot(n) <= 0.01) return;
    const view = p0.clone().sub(cp).reflect(n).negate().add(p0);
    const rot = new THREE.Matrix4().extractRotation(this.cam.matrixWorld);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cp);
    const target = p0.clone().sub(look).reflect(n).negate().add(p0);
    const mc = this.mirCam;
    mc.position.copy(view);
    mc.up.set(0, 1, 0).applyMatrix4(rot).reflect(n);
    mc.lookAt(target);
    mc.far = this.cam.far;
    mc.near = this.cam.near;
    mc.updateMatrixWorld(true);
    mc.projectionMatrix.copy(this.cam.projectionMatrix);
    mc.matrixWorldInverse.copy(mc.matrixWorld).invert();
    const T = M.gU.reflMatM.value as THREE.Matrix4;
    T.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    T.multiply(mc.projectionMatrix);
    T.multiply(mc.matrixWorldInverse);
    // oblique near plane: nothing behind the glass is drawn
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p0).applyMatrix4(mc.matrixWorldInverse);
    const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = mc.projectionMatrix.elements;
    const q = new THREE.Vector4((Math.sign(clip.x) + pm[8]) / pm[0], (Math.sign(clip.y) + pm[9]) / pm[5], -1, (1 + pm[10]) / pm[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    pm[2] = clip.x;
    pm[6] = clip.y;
    pm[10] = clip.z + 1 - 0.003;
    pm[14] = clip.w;
    glass.visible = false;
    const rk = this.U.reflK.value;
    this.U.reflK.value = 0;
    r.setRenderTarget(this.rtMirror);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.hallScene, mc);
    this.partRes.forEach((f) => f(this.SW >> 1, this.SH >> 1, (this.SH >> 1) / 1080));
    r.render(this.partScene, mc);
    this.U.reflK.value = rk;
    glass.visible = true;
  }

  addCandlestick(at: THREE.Vector3, scale = 1, tulip = true) {
    const c = makeCandlestick(this.U, tulip);
    c.group.position.copy(at);
    c.group.scale.setScalar(scale);
    c.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.side = THREE.DoubleSide;
      o.frustumCulled = false;
    });
    this.hallScene.add(c.group);
    this.sticks.push(c);
    return c;
  }

  setLights(L: LightDef[]) {
    const U = this.U;
    const n = Math.min(NL, L.length);
    for (let i = 0; i < NL; i++) {
      const l = L[i];
      if (i < n && l) {
        U.lP.value[i].copy(l.p);
        U.lC.value[i].set(...l.dif);
        U.lE.value[i].set(...l.rad);
        U.lR.value[i] = l.r;
      } else {
        U.lC.value[i].set(0, 0, 0);
        U.lE.value[i].set(0, 0, 0);
      }
    }
    U.nL.value = n;
  }
  setImpacts(list: { p: THREE.Vector3; t: number }[]) {
    for (let i = 0; i < NI; i++) {
      const e = list[i];
      if (e) {
        this.U.iP.value[i].copy(e.p);
        this.U.iT.value[i] = e.t;
      } else {
        this.U.iP.value[i].set(0, -9999, 0);
        this.U.iT.value[i] = 9999;
      }
    }
  }

  private placeCam(c: CamState) {
    const cam = this.cam;
    cam.position.copy(c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.look);
    if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.5;
    cam.far = 4000;
    cam.aspect = this.W / this.H;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    // the mirror camera under the floor plane y = G
    const m = this.mcam;
    m.position.set(c.pos.x, 2 * G - c.pos.y, c.pos.z);
    const lk = new THREE.Vector3(c.look.x, 2 * G - c.look.y, c.look.z);
    m.up.set(0, -1, 0);
    m.lookAt(lk);
    if (c.roll) m.rotateZ(-c.roll);
    m.fov = c.fov;
    m.near = 0.5;
    m.far = 4000;
    m.aspect = cam.aspect;
    m.updateProjectionMatrix();
    m.updateMatrixWorld(true);
    m.matrixWorldInverse.copy(m.matrixWorld).invert();
    const T = this.U.reflMat.value;
    T.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    T.multiply(m.projectionMatrix);
    T.multiply(m.matrixWorldInverse);
  }

  /** render one frame. `her` = her centre/facing for the mirror pieces (null = she is not in the hall) */
  render(t: number, c: CamState, o: { her?: { c: THREE.Vector3; fwd: THREE.Vector3; half: [number, number]; amt: number } | null; bokehMax?: number } = {}) {
    const r = this.r, U = this.U;
    U.uTime.value = t;
    this.flames.U.uTime.value = t;
    this.placeCam(c);
    U.pxAng.value = (2 * Math.tan((c.fov * Math.PI) / 360)) / this.SH;
    const dofU = (this as unknown as { dofU: Record<string, { value: unknown }> }).dofU;
    // 1 · her picture
    U.herAmt.value = 0;
    if (o.her && o.her.amt > 0 && this.herMask.length) {
      const hc = this.herCam;
      const [hw, hh] = o.her.half;
      hc.left = -hw;
      hc.right = hw;
      hc.top = hh;
      hc.bottom = -hh;
      hc.position.copy(o.her.c).addScaledVector(o.her.fwd, 200);
      hc.up.set(0, 1, 0);
      hc.lookAt(o.her.c);
      hc.updateProjectionMatrix();
      hc.updateMatrixWorld(true);
      this.herMask.forEach((f) => f(true));
      this.partRes.forEach((f) => f(512, 448, 448 / 1080 * 1.6));
      r.setRenderTarget(this.rtHer);
      r.setClearColor(0x000000, 1);
      r.clear(true, true, true);
      r.render(this.partScene, hc);
      this.herMask.forEach((f) => f(false));
      U.herC.value.copy(o.her.c);
      U.herHalf.value.set(hw, hh);
      U.herAmt.value = o.her.amt;
    }
    // 1b · the mirror (before the floor, so the floor reflects a fresh mirror)
    if (this.mirror && this.mirror.glass.visible && this.mirror.root.visible) this.renderMirror();
    // 2 · the floor's reflection
    this.floor.visible = false;
    r.setRenderTarget(this.rtRefl);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.hallScene, this.mcam);
    this.partRes.forEach((f) => f(this.SW >> 1, this.SH >> 1, ((this.SH >> 1) / 1080)));
    r.render(this.partScene, this.mcam);
    this.floor.visible = true;
    // 3 · the hall
    r.setRenderTarget(this.rtMain);
    r.clear(true, true, true);
    r.render(this.hallScene, this.cam);
    // 4 · depth of field
    dofU.cNear.value = this.cam.near;
    dofU.cFar.value = this.cam.far;
    dofU.focus.value = c.focus;
    dofU.aper.value = c.aper * (this.SH / 1080);
    dofU.maxC.value = (o.bokehMax ?? 30) * (this.SH / 1080);
    r.setRenderTarget(this.rtHalf);
    r.render(this.prep.scene, this.postCam);
    r.setRenderTarget(this.rtBlur);
    r.render(this.gather.scene, this.postCam);
    const inBuf = this.composer.inputBuffer;
    r.setRenderTarget(inBuf);
    r.clear(true, true, true);
    r.render(this.comp.scene, this.postCam);
    // 5 · the light, and its glow (drawn wider at quarter res, blurred twice, added back)
    this.partRes.forEach((f) => f(this.SW, this.SH, this.SH / 1080));
    r.render(this.partScene, this.cam);
    if (this.glowK > 0) {
      const gw = this.SW >> 2, gh = this.SH >> 2;
      this.partRes.forEach((f) => f(gw, gh, 1.0));
      this.partMats.forEach((m) => (m.depthTest = false));
      r.setRenderTarget(this.rtGlow);
      r.setClearColor(0x000000, 1);
      r.clear(true, false, false);
      r.render(this.partScene, this.cam);
      this.partMats.forEach((m) => (m.depthTest = true));
      const bu = this.glowBlur.mat.uniforms;
      for (let it = 0; it < 2; it++) {
        bu.tSrc.value = this.rtGlow.texture;
        bu.dir.value.set((1 + it) / gw, 0);
        r.setRenderTarget(this.rtGlow2);
        r.render(this.glowBlur.scene, this.postCam);
        bu.tSrc.value = this.rtGlow2.texture;
        bu.dir.value.set(0, (1 + it) / gh);
        r.setRenderTarget(this.rtGlow);
        r.render(this.glowBlur.scene, this.postCam);
      }
      this.glowAdd.mat.uniforms.k.value = this.glowK;
      r.setRenderTarget(inBuf);
      r.render(this.glowAdd.scene, this.postCam);
    }
    // 6 · post
    r.setRenderTarget(null);
    this.grade.set("seed", (t * 37.13) % 100);
    this.composer.render();
    r.getContext().finish();
  }
}
