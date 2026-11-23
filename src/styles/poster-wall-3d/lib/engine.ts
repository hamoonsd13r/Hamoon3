// Poster Wall 3D · the wall renderer (vanilla three.js, driven frame by frame). Every card is a quad that samples its poster's
// video frame; depth of field is done inside the card shader (a disc of taps mapped to texture space with the screen
// derivatives, so it is exact for a flat card and blurs its edge into the room); motion blur averages sub-frames of the
// camera over a 180° shutter; a final pass adds a soft bloom, a vignette and grain.
import * as THREE from "three";
import { layout, camAt, CW, CH, SHUTTER, shutterSamples, type Card } from "./wall";

const PAD = 90; // the quad reaches past the card so a blurred edge can spill out
const TAPS = 32;
// a Poisson-ish disc: golden-angle spiral, radius √((i+0.5)/n) — even coverage
const DISC = Array.from({ length: TAPS }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / TAPS), a = i * 2.39996323;
  return `vec2(${(r * Math.cos(a)).toFixed(5)}, ${(r * Math.sin(a)).toFixed(5)})`;
}).join(",");

const CARD_VS = /* glsl */ `
varying vec2 vP;
varying float vZ;
void main(){
  vP = position.xy;
  vec4 vp = viewMatrix * modelMatrix * instanceMatrix * vec4(position.xy, 0.0, 1.0);
  vZ = -vp.z;
  gl_Position = projectionMatrix * vp;
}`;

const CARD_FS = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uHalf;
uniform float uRad, uFocus, uK, uMaxCoc, uFogStart, uFogDen, uTaps, uLift;
uniform vec3 uBg;
varying vec2 vP;
varying float vZ;
const vec2 DISC[${TAPS}] = vec2[${TAPS}](${DISC});
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec3 tap(vec2 p, vec2 gx, vec2 gy){
  vec2 uv = p / (2.0 * uHalf) + 0.5;
  vec2 s = vec2(1.0, -1.0) / (2.0 * uHalf);
  return textureGrad(uTex, vec2(uv.x, 1.0 - uv.y), gx * s, gy * s).rgb;
}
void main(){
  vec2 dx = dFdx(vP), dy = dFdy(vP);
  float upx = max(length(dx), length(dy)); // card units per screen pixel
  float coc = clamp(uK * abs(vZ - uFocus) / vZ, 0.0, uMaxCoc); // blur radius, px
  vec3 acc = vec3(0.0);
  float cov = 0.0;
  if (coc < 0.6) {
    float a = clamp(0.5 - sdRound(vP, uHalf, uRad) / upx, 0.0, 1.0);
    if (a > 0.0) acc = tap(vP, dx, dy) * a;
    cov = a;
  } else {
    int n = int(uTaps);
    float sp = max(1.0, coc * 1.6 / sqrt(uTaps)); // px between taps → pre-filter each tap that wide
    vec2 gx = dx * sp, gy = dy * sp;
    for (int i = 0; i < ${TAPS}; i++) {
      if (i >= n) break;
      vec2 o = DISC[i] * coc;
      vec2 p = vP + dx * o.x + dy * o.y;
      float a = clamp(0.5 - sdRound(p, uHalf, uRad) / (upx * sp), 0.0, 1.0);
      if (a > 0.0) { acc += tap(p, gx, gy) * a; cov += a; }
    }
    acc /= float(n);
    cov /= float(n);
  }
  acc *= uLift;
  float fog = exp(-max(vZ - uFogStart, 0.0) * uFogDen);
  gl_FragColor = vec4(acc * fog + uBg * cov * (1.0 - fog), cov); // premultiplied, over the room
}`;

const QUAD_VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const ADD_FS = /* glsl */ `uniform sampler2D uSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uSrc, vUv).rgb * uW, 1.0); }`;
const BRIGHT_FS = /* glsl */ `uniform sampler2D uSrc; uniform float uThr; varying vec2 vUv;
void main(){ vec3 c = texture2D(uSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThr, uThr * 2.5, l), 1.0); }`;
const BLUR_FS = /* glsl */ `uniform sampler2D uSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(uSrc, vUv).rgb * 0.227027;
  c += texture2D(uSrc, vUv + uDir * 1.3846).rgb * 0.316216; c += texture2D(uSrc, vUv - uDir * 1.3846).rgb * 0.316216;
  c += texture2D(uSrc, vUv + uDir * 3.2308).rgb * 0.070270; c += texture2D(uSrc, vUv - uDir * 3.2308).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0); }`;
const FINAL_FS = /* glsl */ `uniform sampler2D uAcc, uBloom; uniform float uBloomK, uVig, uGrain, uTime; uniform vec2 uRes; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec3 c = texture2D(uAcc, vUv).rgb + texture2D(uBloom, vUv).rgb * uBloomK;
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= mix(1.0, smoothstep(0.95, 0.2, length(q)), uVig);
  vec3 s = srgb(max(c, 0.0));
  float n = (h(floor(vUv * uRes) + floor(uTime * 30.0 + 0.5) * 17.31) - 0.5) + (h(floor(vUv * uRes * 0.5) + floor(uTime * 30.0 + 0.5) * 7.7) - 0.5) * 0.6;
  s += n * uGrain;
  gl_FragColor = vec4(s, 1.0);
}`;

/** a card's source: a clip (mp4/webm: frame at `time(t)`) or a still (jpg/png/webp) */
export type SlotInfo = { src: string; time?: (t: number) => number; fps?: number };
const STILL = /\.(jpe?g|png|webp)(\?|$)/i;
export type EngineOpts = { W: number; H: number; fps: number; bg: [number, number, number]; slot: (slot: string) => SlotInfo; lift?: number };

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export class WallEngine {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(38, 1, 50, 200000);
  private ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private quadScene = new THREE.Scene();
  private rtSub: THREE.WebGLRenderTarget;
  private rtAcc: THREE.WebGLRenderTarget;
  private rtB1: THREE.WebGLRenderTarget;
  private rtB2: THREE.WebGLRenderTarget;
  private U: Record<string, THREE.IUniform>;
  private tex = new Map<string, THREE.Texture>();
  private loaded = new Map<string, number>(); // slot → frame index on its texture
  private boxes: { slot: string; box: THREE.Box3 }[] = [];
  private mats = { add: null as unknown as THREE.ShaderMaterial, bright: null as unknown as THREE.ShaderMaterial, blur: null as unknown as THREE.ShaderMaterial, final: null as unknown as THREE.ShaderMaterial };
  private bgLin: THREE.Color;

  constructor(canvas: HTMLCanvasElement, private o: EngineOpts) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.r.setPixelRatio(1);
    this.r.setSize(o.W, o.H, false);
    this.r.autoClear = false;
    this.r.toneMapping = THREE.NoToneMapping;
    this.cam.aspect = o.W / o.H;
    const rt = (w: number, h: number) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtSub = rt(o.W, o.H);
    this.rtAcc = rt(o.W, o.H);
    this.rtB1 = rt(o.W / 4, o.H / 4);
    this.rtB2 = rt(o.W / 4, o.H / 4);
    this.bgLin = new THREE.Color(srgbToLinear(o.bg[0] / 255), srgbToLinear(o.bg[1] / 255), srgbToLinear(o.bg[2] / 255));
    this.U = {
      uHalf: { value: new THREE.Vector2(CW / 2, CH / 2) },
      uRad: { value: 10 },
      uFocus: { value: 5000 },
      uK: { value: 0 },
      uMaxCoc: { value: 22 },
      uFogStart: { value: 9000 },
      uFogDen: { value: 0.00012 },
      uTaps: { value: TAPS },
      uLift: { value: o.lift ?? 1 },
      uBg: { value: new THREE.Vector3(this.bgLin.r, this.bgLin.g, this.bgLin.b) },
    };
    this.buildCards();
    const m = (fs: string, u: Record<string, THREE.IUniform>, blend?: THREE.Blending) =>
      new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, blending: blend ?? THREE.NoBlending });
    this.mats.add = m(ADD_FS, { uSrc: { value: null }, uW: { value: 1 } }, THREE.AdditiveBlending);
    this.mats.bright = m(BRIGHT_FS, { uSrc: { value: null }, uThr: { value: 0.55 } });
    this.mats.blur = m(BLUR_FS, { uSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mats.final = m(FINAL_FS, { uAcc: { value: null }, uBloom: { value: null }, uBloomK: { value: 0.22 }, uVig: { value: 0.55 }, uGrain: { value: 0.028 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(o.W, o.H) } });
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  private buildCards() {
    const all = layout(this.o.W / this.o.H).cards;
    const bySlot = new Map<string, Card[]>();
    for (const c of all) bySlot.set(c.slot, [...(bySlot.get(c.slot) ?? []), c]);
    const geo = new THREE.PlaneGeometry(CW + 2 * PAD, CH + 2 * PAD);
    const maxAniso = this.r.capabilities.getMaxAnisotropy();
    for (const [slot, list] of bySlot) {
      const tex = new THREE.Texture();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = maxAniso;
      this.tex.set(slot, tex);
      const mat = new THREE.ShaderMaterial({
        vertexShader: CARD_VS,
        fragmentShader: CARD_FS,
        uniforms: { ...this.U, uTex: { value: tex } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const M = new THREE.Matrix4();
      list.forEach((c, i) => {
        M.makeTranslation(c.x, c.y, 0);
        mesh.setMatrixAt(i, M);
        this.boxes.push({ slot, box: new THREE.Box3(new THREE.Vector3(c.x - CW / 2, c.y - CH / 2, -1), new THREE.Vector3(c.x + CW / 2, c.y + CH / 2, 1)) });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }
  }

  private setCam(t: number) {
    const s = camAt(t);
    this.cam.fov = s.fov;
    this.cam.updateProjectionMatrix();
    this.cam.position.set(...s.pos);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(...s.target);
    this.cam.rotateZ(s.roll);
    this.cam.updateMatrixWorld(true);
    this.U.uFocus.value = s.focus;
    // blur strength: a ~f/2 look scaled to the frame; 0 when frontal (everything on one plane anyway)
    this.U.uK.value = 26;
    this.U.uFogStart.value = s.focus * 1.25;
    this.U.uFogDen.value = 0.9 / s.focus;
  }

  private visibleSlots(times: number[]) {
    const out = new Set<string>();
    const fr = new THREE.Frustum(), PM = new THREE.Matrix4();
    for (const t of times) {
      this.setCam(t);
      PM.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
      fr.setFromProjectionMatrix(PM);
      for (const b of this.boxes) if (!out.has(b.slot) && fr.intersectsBox(b.box)) out.add(b.slot);
    }
    return out;
  }

  private set(slot: string, bmp: ImageBitmap, k: number) {
    const tex = this.tex.get(slot)!;
    const old = tex.image as ImageBitmap | undefined;
    tex.image = bmp;
    tex.needsUpdate = true;
    old?.close?.();
    this.loaded.set(slot, k);
  }

  /** a labelled card when a source is missing, so the wall still renders (and shows what to add) */
  private async placeholder(slot: string) {
    const c = document.createElement("canvas");
    c.width = 540;
    c.height = Math.round((540 * CH) / CW);
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, "#1b2030");
    gr.addColorStop(1, "#0b0d14");
    g.fillStyle = gr;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = 4;
    g.strokeRect(14, 14, c.width - 28, c.height - 28);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.font = "600 44px sans-serif";
    g.textAlign = "center";
    g.fillText(slot.split("@")[0], c.width / 2, c.height / 2);
    return createImageBitmap(c);
  }

  private async load(slot: string, t: number) {
    const info = this.o.slot(slot);
    const still = STILL.test(info.src) || !info.time;
    const fps = info.fps ?? this.o.fps;
    const k = still ? -1 : Math.max(0, Math.round(info.time!(t) * fps));
    if (this.loaded.get(slot) === k) return;
    try {
      const abs = new URL(info.src, window.location.origin).href;
      let res: Response;
      if (still) res = await fetch(abs);
      else {
        const port = (window as unknown as { remotion_proxyPort: number }).remotion_proxyPort;
        res = await fetch(`http://localhost:${port}/proxy?src=${encodeURIComponent(abs)}&time=${encodeURIComponent(k / fps)}&transparent=false&toneMapped=true`);
      }
      if (!res.ok) throw new Error(`${res.status}`);
      this.set(slot, await createImageBitmap(await res.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" }), k);
    } catch {
      console.warn(`poster-wall-3d: no source for ${slot} (${info.src}) — placeholder`);
      this.set(slot, await this.placeholder(slot), k);
    }
  }

  async frame(t: number) {
    const { fps, H } = this.o;
    const n = shutterSamples(t, fps, H);
    const sh = SHUTTER / fps; // centred on the frame
    const times = Array.from({ length: n }, (_, i) => t + sh * ((i + 0.5) / n - 0.5));
    const vis = this.visibleSlots(n > 1 ? [times[0], times[n - 1]] : [t]);
    await Promise.all([...vis].map((s) => this.load(s, t)));
    this.U.uTaps.value = n > 6 ? 12 : n > 2 ? 20 : 32;
    const r = this.r;
    r.setRenderTarget(this.rtAcc);
    r.setClearColor(0x000000, 1);
    r.clear();
    for (const ti of times) {
      this.setCam(ti);
      r.setRenderTarget(this.rtSub);
      r.setClearColor(this.bgLin, 1);
      r.clear();
      r.render(this.scene, this.cam);
      this.quad.material = this.mats.add;
      this.mats.add.uniforms.uSrc.value = this.rtSub.texture;
      this.mats.add.uniforms.uW.value = 1 / n;
      r.setRenderTarget(this.rtAcc);
      r.render(this.quadScene, this.ortho);
    }
    // bloom: bright parts, quarter size, blurred twice
    this.quad.material = this.mats.bright;
    this.mats.bright.uniforms.uSrc.value = this.rtAcc.texture;
    r.setRenderTarget(this.rtB1);
    r.render(this.quadScene, this.ortho);
    this.quad.material = this.mats.blur;
    for (let k = 0; k < 2; k++) {
      this.mats.blur.uniforms.uSrc.value = this.rtB1.texture;
      this.mats.blur.uniforms.uDir.value.set((1.5 + k) / this.rtB1.width, 0);
      r.setRenderTarget(this.rtB2);
      r.render(this.quadScene, this.ortho);
      this.mats.blur.uniforms.uSrc.value = this.rtB2.texture;
      this.mats.blur.uniforms.uDir.value.set(0, (1.5 + k) / this.rtB1.height);
      r.setRenderTarget(this.rtB1);
      r.render(this.quadScene, this.ortho);
    }
    this.quad.material = this.mats.final;
    this.mats.final.uniforms.uAcc.value = this.rtAcc.texture;
    this.mats.final.uniforms.uBloom.value = this.rtB1.texture;
    this.mats.final.uniforms.uTime.value = t;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.ortho);
    this.setCam(t);
  }
}
