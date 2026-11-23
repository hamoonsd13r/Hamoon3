// Archive Machine · the data world (three.js): an endless city of teal data towers, the program's orange core (nested
// lattice cubes), the archive thumbnails that stream past in the dive, and the post chain.
// update(t) poses everything for film time t; render() draws one frame. No state carries between frames.
import { BlendFunction, BloomEffect, ChromaticAberrationEffect, Effect, EffectAttribute, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import * as THREE from "three";
import { CORE, camAt } from "./cam";
import ENV_SCORE from "./data/env-score.json";
import ENV_VOICE from "./data/env-voice.json";
import { ease, hash, mix, ramp } from "./theme";

const envAt = (e: number[], t: number) => e[Math.max(0, Math.min(e.length - 1, Math.round(t * 24)))] ?? 0;
const hit = (t: number, at: number, d = 0.25) => (t < at ? 0 : Math.exp(-(t - at) / d));

/** the city wakes: radius of the ignition front around the core */
export const IGNITE = 1.4;
const igR = (t: number) => {
  const d = t - IGNITE;
  return d <= 0 ? -60 : 260 * d + 380 * d * d;
};
const GLITCH = [1.46, 2.83, 3.16, 3.63, 4.91];
export const WARP_A = 10.72, WARP_GO = 10.94, MATCH = 11.95, DATA_END = 12.26;

// ── shaders ─────────────────────────────────────────────────────────────────────────────────────────────────────
const HASH = /* glsl */ `
float h2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;

const TOWER_VS = /* glsl */ `
attribute vec3 aS; attribute float aSeed;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vS; varying float vSeed;
void main(){
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normal; vL = position; vS = aS; vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const TOWER_FS = /* glsl */ `
uniform float uT, uIg, uFog, uCore, uBright, uWarm, uTop, uLock;
uniform vec3 uCoreP, uBg, uCam, uLockP;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vS; varying float vSeed;
${HASH}
void main(){
  vec3 n = vN;
  if (n.y < -0.5) discard;
  bool top = n.y > 0.5;
  vec2 fc; float ed;
  if (top) { fc = vW.xz; ed = min((0.5 - abs(vL.x)) * vS.x, (0.5 - abs(vL.z)) * vS.z); }
  else if (abs(n.x) > 0.5) { fc = vec2(vW.z, vW.y); ed = min((0.5 - abs(vL.z)) * vS.z, min(vL.y, 1.0 - vL.y) * vS.y); }
  else { fc = vec2(vW.x, vW.y); ed = min((0.5 - abs(vL.x)) * vS.x, min(vL.y, 1.0 - vL.y) * vS.y); }
  vec2 cs = top ? vec2(1.1, 1.1) : vec2(0.72, 0.4);
  vec2 g = fc / cs;
  vec2 id = floor(g), f = fract(g);
  float box = step(0.13, f.x) * step(f.x, 0.87) * step(0.2, f.y) * step(f.y, 0.8);
  float r = h2(id + vSeed * 31.7);
  float mood = fract(vSeed * 0.61803);
  float floorR = h2(vec2(floor(id.y / (2.0 + floor(mood * 4.0))), vSeed * 13.1));
  float thr = mood < 0.32 ? 0.965 : (mood > 0.82 ? 0.42 : 0.62 + 0.3 * step(0.55, floorR));
  float lit = step(thr, r);
  float rate = 0.5 + 3.0 * h2(id * 1.3 + 7.7);
  float bl = mix(1.0, step(0.4, h2(id + floor(uT * rate))), step(0.86, h2(id * 2.1)));
  float colR = h2(vec2(id.x * 0.71, vSeed * 5.3));
  float ph = fract(id.y * 0.035 - uT * (0.3 + 0.9 * colR) + colR * 9.0);
  float run = step(0.8, colR) * smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.35, ph));
  float level = (0.22 + 0.78 * h2(id * 0.7 + 3.3)) * lit * bl + run * 1.4;
  float dist = length(vW.xz - uCoreP.xz);
  float ign = smoothstep(uIg + 14.0, uIg - 14.0, dist + 26.0 * h2(vec2(vSeed, 1.0)));
  // the front itself: a thin hot band as it passes
  float front = smoothstep(uIg - 45.0, uIg, dist) * smoothstep(uIg + 10.0, uIg - 2.0, dist) * step(0.0, uIg) * step(uIg, 3000.0);
  vec3 teal = vec3(0.16, 0.78, 0.92);
  vec3 hot = vec3(0.75, 1.0, 1.0);
  vec3 cellC = mix(teal, hot, step(0.95, h2(id * 3.1 + 1.0)));
  vec3 warm = vec3(1.0, 0.4, 0.1);
  vec3 col = vec3(0.006, 0.016, 0.02);
  col += teal * 0.5 * (1.0 - smoothstep(0.0, 0.1, ed)) * ign * (top ? 1.4 : 0.6);
  col += cellC * box * level * ign * (top ? 0.4 + uTop : 1.0) * uBright * 2.3;
  col += mix(teal, hot, 0.35) * box * lit * front * 2.2;
  col += teal * front * (1.0 - smoothstep(0.0, 0.16, ed)) * 1.8;
  // dormant warm cells before the city wakes
  col += warm * box * step(0.988, r) * (1.0 - ign) * uWarm * 1.6;
  // the core's light on its neighbours
  vec3 toC = uCoreP - vW; float dc = length(toC);
  float cl = uCore * max(0.0, dot(n, toC / dc)) * 120.0 / (dc * dc + 260.0);
  col += vec3(1.0, 0.42, 0.12) * cl * (0.35 + 1.6 * box * lit);
  // the matched record (top-down), a district that burns white
  float dl = length(vW.xz - uLockP.xz);
  col += hot * box * lit * uLock * (top ? 2.2 : 0.4) * smoothstep(60.0, 8.0, dl);
  col *= mix(0.3, 1.0, smoothstep(0.0, 34.0, vW.y));
  float dcam = length(vW - uCam);
  float fog = 1.0 - exp(-pow(dcam * uFog, 1.5));
  gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
}`;

const CORE_VS = /* glsl */ `
uniform float uGl, uSeed;
varying vec3 vL; varying vec3 vN; varying vec3 vW;
${HASH}
void main(){
  vec3 p = position;
  float band = floor((p.y + 10.0) * 2.2);
  p.x += (h2(vec2(band, uSeed)) - 0.5) * 2.0 * uGl * step(0.55, h2(vec2(band * 1.7, uSeed + 3.0)));
  vec4 w = modelMatrix * vec4(p, 1.0);
  vL = position; vN = normal; vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const CORE_FS = /* glsl */ `
uniform float uT, uI, uSize, uLit, uHot;
uniform vec3 uCam, uBg; uniform float uFog;
varying vec3 vL; varying vec3 vN; varying vec3 vW;
${HASH}
void main(){
  vec2 fc = abs(vN.x) > 0.5 ? vL.zy : (abs(vN.y) > 0.5 ? vL.xz : vL.xy);
  vec2 g = fc / vec2(0.55, 0.34);
  vec2 id = floor(g), f = fract(g);
  float box = step(0.12, f.x) * step(f.x, 0.88) * step(0.16, f.y) * step(f.y, 0.84);
  float r = h2(id + uSize * 7.0);
  float bl = step(0.3, h2(id + floor(uT * (1.0 + 5.0 * h2(id * 1.9)))));
  float lit = step(1.0 - uLit, r);
  if (box * lit < 0.5) discard;
  vec3 orange = vec3(1.0, 0.36, 0.07);
  vec3 c = mix(orange, vec3(1.0, 0.7, 0.4), uHot * step(0.86, h2(id * 2.7))) * uI * (0.55 + 0.45 * bl) * (0.6 + 0.8 * h2(id * 0.3));
  float dcam = length(vW - uCam);
  float fog = 1.0 - exp(-pow(dcam * uFog, 1.5));
  gl_FragColor = vec4(mix(c, uBg, fog * 0.6), 1.0);
}`;

const THUMB_VS = /* glsl */ `
attribute vec4 aTile; // atlas col, row, seed, unused
varying vec2 vUv; varying vec4 vTile; varying vec3 vW;
void main(){
  vUv = uv; vTile = aTile;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const THUMB_FS = /* glsl */ `
uniform sampler2D uAtlas; uniform vec2 uGrid; uniform float uOn, uFog, uT; uniform vec3 uCam, uBg;
varying vec2 vUv; varying vec4 vTile; varying vec3 vW;
void main(){
  vec2 uv = (vec2(vTile.x, vTile.y) + vUv) / uGrid;
  uv.y = 1.0 - uv.y;
  vec3 s = texture2D(uAtlas, uv).rgb;
  float l = dot(s, vec3(0.3, 0.55, 0.15));
  vec3 c = mix(vec3(0.01, 0.05, 0.06), vec3(0.45, 0.95, 1.0), l) * (0.9 + 0.6 * l);
  float edge = 1.0 - smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  c += vec3(0.3, 0.9, 1.0) * edge * 1.5;
  c *= 0.85 + 0.15 * step(0.5, fract(vUv.y * 90.0));
  float dcam = length(vW - uCam);
  float fog = 1.0 - exp(-pow(dcam * uFog, 1.5));
  gl_FragColor = vec4(mix(c * uOn, uBg, fog), 1.0);
}`;

class ZoomBlur extends Effect {
  constructor() {
    super(
      "ZoomBlur45",
      /* glsl */ `uniform float strength; uniform vec2 center;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        if (strength < 0.002) { outputColor = inputColor; return; }
        vec2 d = uv - center; vec4 acc = vec4(0.0); float tot = 0.0;
        for (int i = 0; i < 28; i++) { float f = float(i) / 27.0; float w = 1.0 - 0.65 * f;
          acc += texture2D(inputBuffer, center + d * (1.0 - strength * 0.26 * f)) * w; tot += w; }
        outputColor = acc / tot;
      }`,
      { blendFunction: BlendFunction.SET, attributes: EffectAttribute.CONVOLUTION, uniforms: new Map<string, THREE.Uniform>([["strength", new THREE.Uniform(0)], ["center", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))]]) },
    );
  }
}
class Sanitize extends Effect {
  constructor() {
    super("Sanitize45", `void mainImage(const in vec4 c, const in vec2 uv, out vec4 o){ vec3 x = c.rgb; bool bad = any(isnan(x)) || any(isinf(x)); o = vec4(bad ? vec3(0.0) : min(x, vec3(30.0)), 1.0); }`, { blendFunction: BlendFunction.SET });
  }
}

// ── the world ──────────────────────────────────────────────────────────────────────────────────────────────────
export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, W: number, H: number, atlas: THREE.Texture | null, grid: [number, number]) {
  scene.clear();
  const BG = new THREE.Color("#020607");
  scene.background = BG;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;

  // towers
  const P = 7;
  const list: number[][] = [];
  for (let gx = -52; gx <= 52; gx++)
    for (let gz = -140; gz <= 46; gz++) {
      const x = gx * P, z = gz * P;
      if (Math.abs(x) < 10) continue; // the avenue (the dive runs down it)
      if (gx % 7 === 0 || gz % 6 === 0) continue; // cross streets
      const s = gx * 131.7 + gz * 71.3;
      const w = 2.6 + 3.4 * hash(s + 1), d = 2.6 + 3.4 * hash(s + 2);
      const near = Math.exp(-Math.hypot(x, z) / 140);
      let h = 5 + (30 + 40 * near) * Math.pow(hash(s + 3), 2.0);
      if (hash(s + 4) > 0.92) h += 30 + 70 * hash(s + 5) * (0.5 + near);
      if (Math.abs(x) < 26 && Math.abs(z) < 30) h = Math.min(h, 44); // a clearing under the core
      if (z > 40 && Math.abs(x) < 48) h = Math.min(h, 38 + 0.12 * Math.abs(x)); // the fly-in passes over these
      list.push([x + (hash(s + 6) - 0.5) * 1.2, z + (hash(s + 7) - 0.5) * 1.2, w, d, h, hash(s + 8) * 100]);
    }
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const tMat = new THREE.ShaderMaterial({
    vertexShader: TOWER_VS,
    fragmentShader: TOWER_FS,
    uniforms: {
      uT: { value: 0 }, uIg: { value: -60 }, uFog: { value: 0.0052 }, uCore: { value: 1 }, uBright: { value: 1 }, uWarm: { value: 1 }, uTop: { value: 0 }, uLock: { value: 0 },
      uCoreP: { value: CORE.clone() }, uBg: { value: new THREE.Vector3(BG.r, BG.g, BG.b) }, uCam: { value: new THREE.Vector3() }, uLockP: { value: new THREE.Vector3(0, 0, -430) },
    },
  });
  const towers = new THREE.InstancedMesh(box, tMat, list.length);
  const aS = new Float32Array(list.length * 3), aSeed = new Float32Array(list.length);
  const m4 = new THREE.Matrix4();
  list.forEach(([x, z, w, d, h, sd], i) => {
    m4.makeScale(w, h, d).setPosition(x, 0, z);
    towers.setMatrixAt(i, m4);
    aS.set([w, h, d], i * 3);
    aSeed[i] = sd;
  });
  box.setAttribute("aS", new THREE.InstancedBufferAttribute(aS, 3));
  box.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  towers.frustumCulled = false;
  scene.add(towers);

  // the core: three nested lattice cubes and a hot nucleus
  const core = new THREE.Group();
  core.position.copy(CORE);
  scene.add(core);
  const coreMats: THREE.ShaderMaterial[] = [];
  const layer = (size: number, lit: number, rotY: number, inten: number) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: CORE_VS,
      fragmentShader: CORE_FS,
      side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uI: { value: inten }, uSize: { value: size }, uLit: { value: lit }, uHot: { value: 1 }, uGl: { value: 0 }, uSeed: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBg: { value: new THREE.Vector3(BG.r, BG.g, BG.b) }, uFog: { value: 0.0042 } },
    });
    m.userData.base = inten;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), m);
    mesh.rotation.y = rotY;
    core.add(mesh);
    coreMats.push(m);
    return mesh;
  };
  const L1 = layer(7.2, 0.5, 0, 1.5), L2 = layer(5.0, 0.55, Math.PI / 4, 1.8), L3 = layer(3.0, 0.7, Math.PI / 8, 2.4);
  const nucleus = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.3, 0.35) }));
  core.add(nucleus);

  // archive thumbnails along the avenue walls (the dive)
  const thumbs: { m: THREE.InstancedMesh; mat: THREE.ShaderMaterial } | null = (() => {
    if (!atlas) return null;
    const pos: number[][] = [];
    for (let z = 280; z > -320; z -= 6.5) {
      for (const side of [-1, 1]) {
        const s = z * 13.1 + side * 7.7;
        if (hash(s) < 0.28) continue;
        const h = 5 + 6 * hash(s + 1), w = h * (4 / 3);
        const y = 6 + 34 * hash(s + 2);
        pos.push([side * (9.2 - 0.6 * hash(s + 3)), y, z + (hash(s + 4) - 0.5) * 3, w, h, side, Math.floor(hash(s + 5) * grid[0] * grid[1])]);
      }
    }
    const geo = new THREE.PlaneGeometry(1, 1);
    const aTile = new Float32Array(pos.length * 4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: THUMB_VS,
      fragmentShader: THUMB_FS,
      side: THREE.DoubleSide,
      uniforms: { uAtlas: { value: atlas }, uGrid: { value: new THREE.Vector2(grid[0], grid[1]) }, uOn: { value: 0 }, uFog: { value: 0.004 }, uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBg: { value: new THREE.Vector3(BG.r, BG.g, BG.b) } },
    });
    const m = new THREE.InstancedMesh(geo, mat, pos.length);
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    pos.forEach(([x, y, z, w, h, side, tile], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (side as number) < 0 ? Math.PI / 2 : -Math.PI / 2);
      m.setMatrixAt(i, m4.compose(p.set(x, y, z), q, sc.set(w, h, 1)));
      aTile.set([tile % grid[0], Math.floor(tile / grid[0]), hash(i), 0], i * 4);
    });
    geo.setAttribute("aTile", new THREE.InstancedBufferAttribute(aTile, 4));
    m.frustumCulled = false;
    m.visible = false;
    scene.add(m);
    return { m, mat };
  })();

  // post
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, new Sanitize()));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.35, intensity: 1.15, radius: 0.72 });
  composer.addPass(new EffectPass(camera, bloom));
  const zoom = new ZoomBlur();
  composer.addPass(new EffectPass(camera, zoom));
  const vignette = new VignetteEffect({ darkness: 0.6, offset: 0.3 });
  composer.addPass(new EffectPass(camera, vignette, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0006, 0.0003), radialModulation: true, modulationOffset: 0.2 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.16;
  composer.addPass(new EffectPass(camera, ca, noise));
  composer.setSize(W, H);

  const update = (t: number) => {
    const k = camAt(t);
    // a small hand-held drift, a jolt on the glitch hits
    let jx = 0, jy = 0;
    for (const g of GLITCH) {
      const a = hit(t, g, 0.12);
      jx += a * Math.sin((t - g) * 90) * 0.35;
      jy += a * Math.cos((t - g) * 70) * 0.25;
    }
    const warp = t >= WARP_GO && t < MATCH ? 1 : 0;
    const shake = warp * 0.25;
    jx += (hash(Math.floor(t * 24) * 1.7) - 0.5) * shake;
    jy += (hash(Math.floor(t * 24) * 3.1) - 0.5) * shake;
    camera.position.copy(k.pos).add(new THREE.Vector3(jx, jy, 0));
    camera.up.copy(k.up);
    camera.fov = k.fov;
    camera.aspect = W / H;
    camera.near = 0.5;
    camera.far = 4000;
    camera.updateProjectionMatrix();
    camera.lookAt(k.target);

    const u = tMat.uniforms;
    u.uT.value = t;
    u.uIg.value = t >= WARP_A ? 5000 : igR(t);
    u.uCam.value.copy(camera.position);
    u.uWarm.value = 1 - ramp(t, IGNITE, IGNITE + 1.2);
    const voice = envAt(ENV_VOICE as number[], t);
    const score = envAt(ENV_SCORE as number[], t);
    let gl = 0;
    for (const g of GLITCH) gl = Math.max(gl, hit(t, g, 0.09));
    const coreI = (0.55 + 0.75 * voice + 0.25 * score + 1.2 * gl) * (t < 0.15 ? ramp(t, 0, 0.15) : 1);
    u.uCore.value = coreI * (t < WARP_A ? 1 : 0);
    u.uBright.value = 1;
    u.uFog.value = t < WARP_A ? 0.0052 : t < MATCH ? 0.004 : 0.0021;
    u.uTop.value = t >= MATCH ? 0.9 : 0;
    u.uLock.value = t >= MATCH ? ease.out(ramp(t, MATCH + 0.03, MATCH + 0.2)) : 0;

    core.visible = t < WARP_A;
    core.rotation.set(0.32 + 0.05 * Math.sin(t * 0.7), 0.6 + t * 0.32, 0.08);
    const sc = 1 + 0.06 * voice + 0.12 * gl;
    core.scale.setScalar(sc);
    coreMats.forEach((m, i) => {
      m.uniforms.uT.value = t;
      m.uniforms.uI.value = m.userData.base * coreI;
      m.uniforms.uGl.value = gl * (1.2 + i * 0.3);
      m.uniforms.uSeed.value = Math.floor(t * 24) % 7;
      m.uniforms.uCam.value.copy(camera.position);
      m.uniforms.uFog.value = u.uFog.value;
    });
    (nucleus.material as THREE.MeshBasicMaterial).color.setRGB(3.2 * coreI, 1.3 * coreI, 0.35 * coreI);
    L1.rotation.x = t * 0.1;
    L2.rotation.z = -t * 0.18;
    L3.rotation.x = t * 0.25;

    if (thumbs) {
      thumbs.m.visible = t >= WARP_A && t < MATCH;
      thumbs.mat.uniforms.uOn.value = ease.out(ramp(t, WARP_A, WARP_GO + 0.1));
      thumbs.mat.uniforms.uCam.value.copy(camera.position);
      thumbs.mat.uniforms.uT.value = t;
    }
    // the dive's zoom blur, toward the vanishing point
    zoom.uniforms.get("strength")!.value = warp ? mix(0.1, 0.55, ease.inOut(ramp(t, WARP_GO, WARP_GO + 0.45))) * (1 - 0.3 * ramp(t, MATCH - 0.2, MATCH)) : t >= MATCH ? 0.35 * (1 - ease.out(ramp(t, MATCH, MATCH + 0.25))) : 0;
    bloom.intensity = 1.15 + 0.5 * gl + (t >= MATCH ? 0.3 : 0);
  };

  return { update, render: () => composer.render(), dispose: () => composer.dispose() };
}

