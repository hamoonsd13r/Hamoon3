// The set: a laptop on a desk by a big window at night — city below, warm string lights across the window, dust in
// the air. The characters sit on the laptop's top edge (= world origin). Post: depth of field (big bokeh), bloom,
// ACES, vignette, a whisper of chromatic aberration and grain.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { BlendFunction, BloomEffect, ChromaticAberrationEffect, DepthOfFieldEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { buildHuman, buildRobot } from "./chars";
import { CHEST, FACE_H, FACE_W } from "./face";
import { rnd } from "./theme";
import { SCREEN_H, SCREEN_W } from "./screen";

export const LID_TILT = 0.1; // the lid leans back
export const LID_H = 2.72;
export const LID_W = 4.3;
export const HUMAN_X = -0.37;
export const ROBOT_X = 0.37;

const at = <T extends THREE.Object3D>(o: T, p: number[], r?: number[]) => {
  o.position.set(p[0], p[1], p[2]);
  if (r) o.rotation.set(r[0], r[1], r[2]);
  return o;
};
const canvasTex = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { c, ctx: c.getContext("2d")!, tex };
};

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, W: number, H: number) {
  gl.toneMapping = THREE.NoToneMapping;
  gl.shadowMap.enabled = false;
  scene.background = new THREE.Color("#04050d");
  camera.near = 0.02;
  camera.far = 900;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  RectAreaLightUniformsLib.init();

  // ─── textures drawn every frame
  const screen = canvasTex(SCREEN_W, SCREEN_H);
  const face = canvasTex(FACE_W, FACE_H);
  const chest = canvasTex(CHEST, CHEST);

  // ─── laptop (the lid's top edge sits at the origin)
  const R = new THREE.Matrix4().makeRotationX(-LID_TILT);
  const hinge = new THREE.Vector3(0, -LID_H, 0).applyMatrix4(R).add(new THREE.Vector3(0, 0, 0.035)); // top edge → origin
  const ALU = new THREE.MeshStandardMaterial({ color: "#2E3140", roughness: 0.38, metalness: 0.65 });
  const ALU_D = new THREE.MeshStandardMaterial({ color: "#1C1E28", roughness: 0.5, metalness: 0.5 });
  const BEZEL = new THREE.MeshStandardMaterial({ color: "#060609", roughness: 0.25, metalness: 0.2 });
  const lid = new THREE.Group();
  lid.position.copy(hinge);
  lid.rotation.x = -LID_TILT;
  scene.add(lid);
  lid.add(at(new THREE.Mesh(new RoundedBoxGeometry(LID_W, LID_H, 0.06, 3, 0.03), ALU), [0, LID_H / 2, -0.065]));
  lid.add(at(new THREE.Mesh(new THREE.PlaneGeometry(LID_W - 0.02, LID_H - 0.02), BEZEL), [0, LID_H / 2, -0.034]));
  const SW = 4.04, SH = SW * (SCREEN_H / SCREEN_W);
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.36) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
  const SCR_Y = LID_H - 0.09 - SH / 2;
  scr.position.set(0, SCR_Y, -0.032);
  lid.add(scr);
  // camera notch dot
  lid.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: "#1b1d26" })), [0, LID_H - 0.045, -0.033]));
  // the light the screen throws forward
  const scrLight = new THREE.RectAreaLight("#C9D3FF", 3.5, SW, SH);
  scrLight.position.set(0, SCR_Y, 0.0);
  scrLight.rotation.y = 0; // RectAreaLight faces −z by default → turn it to face +z
  scrLight.lookAt(new THREE.Vector3(0, SCR_Y, 5));
  lid.add(scrLight);
  // base + keyboard + trackpad
  const base = new THREE.Group();
  base.position.copy(hinge);
  scene.add(base);
  const BASE_D = 2.95;
  base.add(at(new THREE.Mesh(new RoundedBoxGeometry(LID_W, 0.1, BASE_D, 3, 0.04), ALU), [0, -0.05, BASE_D / 2]));
  const keyG = new RoundedBoxGeometry(0.235, 0.03, 0.215, 2, 0.02);
  const KEY = new THREE.MeshStandardMaterial({ color: "#0d0e14", roughness: 0.55, metalness: 0.1 });
  const COLS = 14, ROWS = 6;
  const keys = new THREE.InstancedMesh(keyG, KEY, COLS * ROWS);
  const m4 = new THREE.Matrix4();
  let ki = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const wide = r === 5 && c >= 4 && c <= 9;
      if (r === 5 && c > 4 && c <= 9) { m4.makeScale(0, 0, 0); keys.setMatrixAt(ki++, m4); continue; }
      m4.compose(new THREE.Vector3((c - (COLS - 1) / 2) * 0.27 + (wide ? 0.27 * 2.5 : 0), 0.012, 0.3 + r * 0.25), new THREE.Quaternion(), new THREE.Vector3(wide ? 6.1 : 1, 1, 1));
      keys.setMatrixAt(ki++, m4);
    }
  base.add(keys);
  base.add(at(new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.005, 0.85, 2, 0.003), ALU_D), [0, 0.001, 2.25]));

  // ─── desk + mug (a little life on the desk for the pull-back)
  const deskY = hinge.y - 0.1;
  const woodC = canvasTex(512, 512);
  {
    const g = woodC.ctx;
    g.fillStyle = "#3a2a20";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 220; i++) {
      g.strokeStyle = `rgba(${20 + rnd(i) * 30},${12 + rnd(i + 1) * 18},${8 + rnd(i + 2) * 10},${0.15 + rnd(i + 3) * 0.25})`;
      g.lineWidth = 1 + rnd(i + 4) * 3;
      g.beginPath();
      const y = rnd(i + 5) * 512;
      g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
      g.stroke();
    }
    woodC.tex.wrapS = woodC.tex.wrapT = THREE.RepeatWrapping;
    woodC.tex.repeat.set(4, 4);
  }
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), new THREE.MeshStandardMaterial({ map: woodC.tex, roughness: 0.55, metalness: 0.05, color: "#9a8478" }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(0, deskY, 4);
  scene.add(desk);
  const mug = new THREE.Group();
  const MUG = new THREE.MeshStandardMaterial({ color: "#E8E2DA", roughness: 0.4, flatShading: true });
  mug.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.95, 10, 1, true), MUG), [0, 0.475, 0]));
  mug.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), new THREE.MeshStandardMaterial({ color: "#2a160c", roughness: 0.2 })), [0, 0.82, 0], [-Math.PI / 2, 0, 0]));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 6, 10, Math.PI), MUG);
  handle.position.set(0.42, 0.5, 0);
  handle.rotation.z = -Math.PI / 2;
  mug.add(handle);
  mug.position.set(3.6, deskY, 1.6);
  mug.rotation.y = -0.6;
  scene.add(mug);
  // a small plant pot on the other side
  const plant = new THREE.Group();
  plant.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.6, 7), new THREE.MeshStandardMaterial({ color: "#3b3f52", roughness: 0.7, flatShading: true })), [0, 0.3, 0]));
  const LEAF = new THREE.MeshStandardMaterial({ color: "#2f3a2a", roughness: 0.7, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const lg = new THREE.ConeGeometry(0.12, 1.0 + rnd(i) * 0.6, 4);
    lg.translate(0, 0.5, 0);
    const l = new THREE.Mesh(lg, LEAF);
    l.position.set(0, 0.55, 0);
    l.rotation.set((rnd(i + 3) - 0.5) * 1.2, i * 0.7, (rnd(i + 7) - 0.5) * 1.2);
    plant.add(l);
  }
  plant.position.set(-3.9, deskY, 0.6);
  scene.add(plant);

  // ─── the window: wall + mullions (the dark cross behind the heads)
  const WALL_Z = -5.2;
  const FRAME = new THREE.MeshStandardMaterial({ color: "#0B0F26", roughness: 0.7, metalness: 0.1 });
  const bars: [number, number, number, number][] = [
    // x, y, w, h
    [-3.0, 3, 0.16, 16],
    [3.0, 3, 0.16, 16],
    [0, 1.55, 22, 0.14],
    [-9.2, 3, 0.4, 16],
    [9.2, 3, 0.4, 16],
    [0, deskY + 0.6, 22, 0.5],
  ];
  for (const [x, y, w, h] of bars) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), FRAME);
    b.position.set(x, y, WALL_Z);
    scene.add(b);
  }
  // window sill
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(22, 0.12, 1.2), FRAME), [0, deskY + 0.86, WALL_Z + 0.5]));
  // faint glass reflection (very subtle, additive)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec2 vU; void main(){ float s = smoothstep(0.0, 0.02, abs(fract(vU.x * 1.6 + vU.y * 0.9) - 0.5) - 0.42); gl_FragColor = vec4(vec3(0.05,0.06,0.12) * (1.0 - s) * 0.5, 1.0); }",
  }));
  glass.position.set(0, 3, WALL_Z + 0.02);
  scene.add(glass);

  // ─── sky (gradient dome) + stars
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec3 vD; void main(){
      float y = vD.y;
      vec3 top = vec3(0.004, 0.007, 0.024);
      vec3 mid = vec3(0.018, 0.028, 0.09);
      vec3 hor = vec3(0.042, 0.056, 0.14);
      vec3 c = mix(hor, mid, smoothstep(-0.05, 0.12, y));
      c = mix(c, top, smoothstep(0.12, 0.6, y));
      c += vec3(0.25, 0.12, 0.06) * exp(-abs(y + 0.02) * 22.0) * 0.35; // warm city haze at the horizon
      gl_FragColor = vec4(c, 1.0); }`,
  }));
  scene.add(sky);
  {
    const N = 900, p = new Float32Array(N * 3), s = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = rnd(i * 1.7) * Math.PI * 2, y = 0.08 + rnd(i * 2.3) * 0.9;
      const r = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * r * 500, y * 500, Math.sin(a) * r * 500 - 100], i * 3);
      s[i] = rnd(i * 3.1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(s, 1));
    const stars = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPx: { value: H / 1920 } },
      vertexShader: "uniform float uT, uPx; attribute float seed; varying float vA; void main(){ vA = (0.25 + 0.75 * seed) * (0.6 + 0.4 * sin(uT * (1.0 + seed * 3.0) + seed * 50.0)); gl_PointSize = (1.2 + 2.2 * seed * seed) * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(0.85,0.88,1.0) * a * vA, 1.0); }",
    }));
    scene.add(stars);
    (scene.userData as { stars?: THREE.Points }).stars = stars;
  }

  // ─── the city: instanced towers with procedural lit windows
  const NB = 420;
  const bG = new THREE.BoxGeometry(1, 1, 1);
  bG.translate(0, 0.5, 0);
  const aSize = new Float32Array(NB * 3), aSeed = new Float32Array(NB);
  const city = new THREE.InstancedMesh(bG, new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uLit: { value: 1 } },
    vertexShader: `attribute vec3 aSize; attribute float aSeed; varying vec3 vL; varying vec3 vN; varying float vS; varying float vZ;
      void main(){ vL = position * aSize; vN = normal; vS = aSeed; vec4 wp = instanceMatrix * vec4(position,1.0); vec4 mv = modelViewMatrix * wp; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT, uLit; varying vec3 vL; varying vec3 vN; varying float vS; varying float vZ;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 base = mix(vec3(0.018,0.022,0.06), vec3(0.03,0.035,0.09), vS);
        if (vN.y > 0.5) { gl_FragColor = vec4(base * 0.6, 1.0); return; }
        vec2 uv = abs(vN.z) > 0.5 ? vec2(vL.x, vL.y) : vec2(vL.z, vL.y);
        vec2 cell = vec2(1.0, 1.3);
        vec2 id = floor(uv / cell);
        vec2 f = fract(uv / cell);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
        float r = h(id + vS * 91.0 + (vN.x + vN.z * 3.0) * 7.0);
        float on = step(0.945, r);
        // a few windows switch on/off slowly
        float fl = step(0.985, h(id * 1.7 + vS * 13.0));
        on = mix(on, step(0.5, fract(uT * 0.07 + r * 3.0)), fl);
        vec3 wc = mix(vec3(1.0, 0.66, 0.34), vec3(1.0, 0.82, 0.58), h(id + 3.1));
        wc = mix(wc, vec3(0.75, 0.82, 1.0), step(0.93, h(id + 5.3)));
        float fade = exp(-vZ * 0.0028);
        vec3 c = base + wc * win * on * (0.55 + 0.6 * h(id + 9.0)) * uLit * fade;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), NB);
  const redTops: THREE.Vector3[] = [];
  for (let i = 0; i < NB; i++) {
    const ring = rnd(i * 1.1);
    const z = -60 - ring * 220;
    const x = (rnd(i * 2.9) - 0.5) * (120 + ring * 420);
    const w = 3 + rnd(i * 3.3) * 7, d = 3 + rnd(i * 4.4) * 7;
    const top = -16 - rnd(i * 5.5) * 30 + (rnd(i * 6.6) > 0.9 ? 16 : 0) + ring * 22;
    const y0 = -70;
    const hgt = top - y0;
    m4.compose(new THREE.Vector3(x, y0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rnd(i * 7.7) - 0.5) * 0.3, 0)), new THREE.Vector3(w, hgt, d));
    city.setMatrixAt(i, m4);
    aSize.set([w, hgt, d], i * 3);
    aSeed[i] = rnd(i * 8.8);
    if (rnd(i * 9.9) > 0.86) redTops.push(new THREE.Vector3(x, top + 0.6, z));
  }
  bG.setAttribute("aSize", new THREE.InstancedBufferAttribute(aSize, 3));
  bG.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  city.frustumCulled = false;
  scene.add(city);
  // red aviation lights (small spheres so the DOF turns them into red bokeh, like the reference)
  const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.35, 0.3), toneMapped: false });
  const reds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), redMat, redTops.length);
  redTops.forEach((p, i) => reds.setMatrixAt(i, m4.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))));
  reds.frustumCulled = false;
  scene.add(reds);

  // ─── string lights: two sagging strands inside the window
  const bulbs: THREE.Mesh[] = [];
  const BULB = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 2.6, 1.0), toneMapped: false });
  const WIRE = new THREE.MeshBasicMaterial({ color: "#07080f" });
  const strand = (a: THREE.Vector3, b: THREE.Vector3, sag: number, n: number, seed: number, amt = 1) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const k = i / 40;
      pts.push(new THREE.Vector3().lerpVectors(a, b, k).add(new THREE.Vector3(0, -sag * 4 * k * (1 - k), 0)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.01, 4), WIRE));
    for (let i = 0; i < n; i++) {
      const p = curve.getPoint((i + 0.5) / n);
      const bm = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), BULB.clone());
      bm.position.copy(p).add(new THREE.Vector3(0, -0.07, 0));
      bm.userData.seed = seed + i;
      bm.userData.amt = amt;
      bm.scale.setScalar(amt < 1 ? 0.8 : 1.15);
      scene.add(bm);
      bulbs.push(bm);
    }
  };
  strand(new THREE.Vector3(-6.5, 2.75, -2.6), new THREE.Vector3(6.5, 2.45, -2.6), 0.55, 14, 0);
  strand(new THREE.Vector3(-8.5, 3.6, -4.0), new THREE.Vector3(8.5, 3.3, -4.0), 0.7, 18, 100, 0.25);

  // ─── dust specks floating in the room (meshes, so the depth of field blurs them)
  const ND = 90;
  const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.6), toneMapped: false, transparent: true, opacity: 0.25 }), ND);
  dust.frustumCulled = false;
  scene.add(dust);
  const dustBase = Array.from({ length: ND }, (_, i) => new THREE.Vector3((rnd(i * 1.3) - 0.5) * 7, -1.8 + rnd(i * 2.1) * 4.8, -2.4 + rnd(i * 3.7) * 6));

  // ─── characters
  const human = buildHuman();
  human.root.position.set(HUMAN_X, 0, -0.03);
  scene.add(human.root);
  const robot = buildRobot(face.tex, chest.tex);
  robot.root.position.set(ROBOT_X, 0, -0.03);
  scene.add(robot.root);

  // ─── lights
  const hemi = new THREE.HemisphereLight("#4E5CB8", "#0C0A14", 0.32);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight("#9FB2FF", 1.1);
  moon.position.set(-3, 5, -8);
  scene.add(moon);
  const fill = new THREE.DirectionalLight("#8E9DE6", 0.36);
  fill.position.set(1.2, 1.6, 6);
  scene.add(fill);
  const key = new THREE.DirectionalLight("#FFC896", 0.85);
  key.position.set(3.2, 1.2, 1.5);
  scene.add(key);
  const chestLight = new THREE.PointLight("#FFB066", 0.32, 0, 2);
  scene.add(chestLight);
  const warm = new THREE.PointLight("#FFC27A", 0.45, 0, 2);
  warm.position.set(0, 2.5, -2.3);
  scene.add(warm);
  const bulbLight = new THREE.PointLight("#FFE2C2", 0, 0, 2); // the antenna bulb
  scene.add(bulbLight);

  // ─── post
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
  composer.addPass(new RenderPass(scene, camera));
  const dof = new DepthOfFieldEffect(camera, { focusDistance: 3, focusRange: 0.6, bokehScale: 5, resolutionScale: 0.6 });
  dof.target = new THREE.Vector3();
  composer.addPass(new EffectPass(camera, dof));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.6, luminanceSmoothing: 0.3, intensity: 0.85, radius: 0.75 });
  const vignette = new VignetteEffect({ darkness: 0.85, offset: 0.2 });
  composer.addPass(new EffectPass(camera, bloom, vignette, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0005, 0.0003), radialModulation: true, modulationOffset: 0.3 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.18;
  composer.addPass(new EffectPass(camera, ca, noise));
  composer.setSize(W, H);

  /** a point on the screen (canvas px) in world space, and the screen normal */
  lid.updateMatrixWorld(true);
  const screenPt = (px: number, py: number) => new THREE.Vector3((px / SCREEN_W - 0.5) * SW, SCR_Y + (0.5 - py / SCREEN_H) * SH, -0.03).applyMatrix4(lid.matrixWorld);
  const screenN = new THREE.Vector3(0, 0, 1).applyQuaternion(lid.quaternion).normalize();

  /** ambient life that doesn't depend on the story */
  const ambient = (t: number, cam?: THREE.Vector3) => {
    const stars = (scene.userData as { stars?: THREE.Points }).stars;
    if (stars) ((stars.material as THREE.ShaderMaterial).uniforms.uT.value = t);
    (city.material as THREE.ShaderMaterial).uniforms.uT.value = t;
    for (const b of bulbs) {
      const s = b.userData.seed as number;
      const k = (0.82 + 0.18 * Math.sin(t * (0.6 + rnd(s) * 0.8) + s * 4.0)) * (b.userData.amt as number);
      (b.material as THREE.MeshBasicMaterial).color.setRGB(5.0 * k, 2.6 * k, 1.0 * k);
    }
    const blink = Math.sin(t * 2.4) > 0.55 ? 1 : 0.12;
    redMat.color.setRGB(4 * blink, 0.35 * blink, 0.3 * blink);
    const q = new THREE.Quaternion();
    for (let i = 0; i < ND; i++) {
      const b = dustBase[i];
      const p = new THREE.Vector3(
        b.x + Math.sin(t * 0.21 + i) * 0.35,
        ((b.y + 1.8 + t * (0.03 + rnd(i * 5.1) * 0.05)) % 4.8) - 1.8,
        b.z + Math.cos(t * 0.17 + i * 1.3) * 0.3,
      );
      const s = (0.6 + rnd(i * 6.3) * 1.4) * (cam && p.distanceTo(cam) < 0.8 ? 0 : 1);
      m4.compose(p, q, new THREE.Vector3(s, s, s));
      dust.setMatrixAt(i, m4);
    }
    dust.instanceMatrix.needsUpdate = true;
  };

  return {
    composer, dof, dust, bloom, ca, vignette, noise,
    screen, face, chest, screenMat, scrLight, lid,
    human, robot, chestLight, bulbLight, screenPt, screenN, warm, moon, fill, hemi, city, bulbs,
    ambient,
    render: () => composer.render(),
  };
}
export type World = ReturnType<typeof buildWorld>;
