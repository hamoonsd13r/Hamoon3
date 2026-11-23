// Film B world: a tunnel lined with portrait reels (8 per ring, 48 rings), every card playing one of the code-drawn
// mini-videos from a live atlas. The camera sits at the origin looking down −z; rings stream towards it.
// Speed, roll, lights and borders all follow the music (pure functions of t).
import * as THREE from "three";
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, BlendFunction, RenderPass, VignetteEffect } from "postprocessing";
import { BEAT, DROP, FINAL, ROLL, SEND, STOP, STYLES, beat, clamp, ease, hit, kick, lerp, ramp, rnd } from "./theme";
import { drawScene } from "./scenes";

const SLOTS = 8;
const RINGS = 48;
const R = 3.1;
const S = 1.45;
const L = RINGS * S;
const CW = 1.15;
const CH = CW * (16 / 9);
const CELL_W = 256;
const CELL_H = 455;

/** camera speed (units/s) — the whole edit is in here */
export const speed = (t: number) => {
  let v: number;
  if (t < beat(5)) v = 13 + 16 * kick(t, 0, beat(5), 0.16);
  else if (t < beat(8)) v = lerp(13, 0.9, ease.out(ramp(t, beat(5), beat(5) + 0.18)));
  else if (t < SEND) v = 1.4;
  else if (t < beat(16)) v = 7 + 38 * hit(t, SEND, 0.22);
  else if (t < beat(20)) v = 2.6 + 6 * kick(t, beat(16), beat(20), 0.12);
  else if (t < STOP) v = 9 + 20 * [0, 1, 2, 3].reduce((s, i) => s + hit(t, beat(20 + i * 2), 0.18), 0);
  else if (t < ROLL) v = lerp(9, 0.25, ease.out(ramp(t, STOP, STOP + 0.25)));
  else if (t < DROP) v = 0.25 + 30 * ramp(t, ROLL, DROP) ** 2.4;
  else if (t < FINAL) v = 14 + 50 * hit(t, DROP, 0.35);
  else v = lerp(14, 1.6, ease.out(ramp(t, FINAL, FINAL + 1.2)));
  return v;
};
/** distance travelled up to t (numeric integral, deterministic) */
const travel = (t: number) => {
  const dt = 1 / 240;
  let s = 0;
  for (let x = 0; x < t; x += dt) s += speed(Math.min(x + dt / 2, t)) * Math.min(dt, t - x);
  return s;
};
/** camera roll (radians) */
const roll = (t: number) => {
  let r = Math.sin(t * 0.7) * 0.04;
  r += 0.12 * ease.out(ramp(t, beat(5), beat(5) + 0.2)) - 0.12 * ease.io(ramp(t, beat(7), beat(8)));
  for (let i = 0; i < 4; i++) r += (Math.PI / 4) * ease.io(ramp(t, STYLES[i].at - 0.02, STYLES[i].at + 0.28));
  r += (Math.PI / 2) * ease.out(ramp(t, DROP, DROP + 0.9));
  return r;
};

const VERT = /* glsl */ `
attribute float aCell;
attribute float aBright;
attribute float aEdge;
varying vec2 vUv;
varying float vCell;
varying float vBright;
varying float vEdge;
varying float vDepth;
void main() {
  vUv = uv;
  vCell = aCell;
  vBright = aBright;
  vEdge = aEdge;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uEdgeCol;
uniform float uFog;
varying vec2 vUv;
varying float vCell;
varying float vBright;
varying float vEdge;
varying float vDepth;
void main() {
  // card in its own units (portrait: height along local y)
  vec2 p = (vUv - 0.5) * vec2(${CW.toFixed(3)}, ${CH.toFixed(3)});
  vec2 hs = vec2(${(CW / 2).toFixed(3)}, ${(CH / 2).toFixed(3)});
  float rr = 0.09;
  vec2 q = abs(p) - (hs - rr);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rr;
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  if (alpha < 0.01) discard;
  float col = mod(vCell, 4.0);
  float row = floor(vCell / 4.0);
  vec2 auv = vec2((col + vUv.x) / 4.0, 1.0 - (row + (1.0 - vUv.y)) / 2.0);
  vec3 c = texture2D(uAtlas, auv).rgb * vBright;
  float edge = 1.0 - smoothstep(0.0, 0.03, abs(d + 0.02));
  c += uEdgeCol * edge * vEdge;
  float fog = exp(-max(vDepth - 6.0, 0.0) / uFog);
  gl_FragColor = vec4(c * fog, alpha);
}`;

export const buildTunnel = (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, W: number, H: number) => {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;
  gl.setClearColor(0x020203, 1);
  scene.clear();
  camera.fov = 78;
  camera.near = 0.05;
  camera.far = 120;
  camera.position.set(0, 0, 0);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();

  // ---- live atlas of the eight mini-videos ----
  const atlas = document.createElement("canvas");
  atlas.width = CELL_W * 4;
  atlas.height = CELL_H * 2;
  const actx = atlas.getContext("2d")!;
  const cells = Array.from({ length: 8 }, () => {
    const c = document.createElement("canvas");
    c.width = CELL_W;
    c.height = CELL_H;
    return c.getContext("2d")!;
  });
  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;

  // ---- cards ----
  const N = SLOTS * RINGS;
  const geo = new THREE.PlaneGeometry(CW, CH);
  const aCell = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  const aBright = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  const aEdge = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  geo.setAttribute("aCell", aCell);
  geo.setAttribute("aBright", aBright);
  geo.setAttribute("aEdge", aEdge);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uAtlas: { value: tex }, uEdgeCol: { value: new THREE.Color("#ff7a3d") }, uFog: { value: 30 } },
    side: THREE.DoubleSide,
    transparent: true,
    extensions: { derivatives: true } as never,
  });
  const cards = new THREE.InstancedMesh(geo, mat, N);
  cards.frustumCulled = false;
  scene.add(cards);

  // ---- speed streaks ----
  const NS = 420;
  const sPos = new Float32Array(NS * 6);
  const sCol = new Float32Array(NS * 6);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
  const sMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(sGeo, sMat);
  streaks.frustumCulled = false;
  scene.add(streaks);

  // ---- glow at the vanishing point (for the drop) ----
  const gc = document.createElement("canvas");
  gc.width = gc.height = 256;
  const gx = gc.getContext("2d")!;
  const gg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0, "rgba(255,200,150,1)");
  gg.addColorStop(0.25, "rgba(255,122,61,0.55)");
  gg.addColorStop(1, "rgba(0,0,0,0)");
  gx.fillStyle = gg;
  gx.fillRect(0, 0, 256, 256);
  const gTex = new THREE.CanvasTexture(gc);
  const glowMat = new THREE.MeshBasicMaterial({ map: gTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
  glow.position.set(0, 0, -45);
  scene.add(glow);

  // ---- post ----
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.55, luminanceSmoothing: 0.3, intensity: 1.0, radius: 0.75 });
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.2 });
  const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.75 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.12;
  composer.addPass(new EffectPass(camera, bloom, vignette));
  composer.addPass(new EffectPass(camera, ca, noise));
  composer.setSize(W, H);

  const m = new THREE.Matrix4();
  const basis = new THREE.Matrix4();

  const update = (t: number) => {
    // atlas
    for (let k = 0; k < 8; k++) {
      drawScene(cells[k], k, t + k * 1.7);
      actx.drawImage(cells[k].canvas, (k % 4) * CELL_W, Math.floor(k / 4) * CELL_H);
    }
    tex.needsUpdate = true;

    const v = speed(t);
    const tr = travel(t);
    // one style on every wall during the break
    const brk = t >= beat(16) - 0.02 && t < beat(20) - 0.05;
    const st = brk ? STYLES[clamp(Math.floor((t - beat(16) + 0.02) / BEAT), 0, 3)] : null;
    const stFlash = st ? hit(t, st.at, 0.09) : 0;
    const pulse = t < STOP ? kick(t, 0, STOP, 0.12) : t >= DROP ? kick(t, DROP, FINAL + 0.1, 0.18) : 0;
    const dark = t >= STOP && t < DROP;
    const rollK = ramp(t, ROLL, DROP);
    const dropK = hit(t, DROP, 0.6);
    for (let i = 0; i < RINGS; i++) {
      const raw = i * S - tr;
      const wrap = Math.floor(raw / L);
      const d = raw - wrap * L; // 0..L ahead of camera
      const z = -d + 1.5;
      const ringId = i - wrap * RINGS;
      for (let j = 0; j < SLOTS; j++) {
        const id = i * SLOTS + j;
        const th = (j / SLOTS) * Math.PI * 2 + ringId * 0.11;
        const s = Math.sin(th), c = Math.cos(th);
        basis.set(0, -s, -c, R * c, 0, c, -s, R * s, 1, 0, 0, z, 0, 0, 0, 1);
        m.copy(basis);
        cards.setMatrixAt(id, m);
        const cell = st ? st.scene : Math.floor(rnd(ringId * 13.7 + j * 3.1) * 8) % 8;
        aCell.setX(id, cell);
        let b = 1.18 + 0.12 * rnd(id);
        let e = 0.18 + pulse * 0.9 + stFlash * 1.5;
        if (dark) {
          // lights out at the stop, then ring by ring back on (far → near) with the snare roll
          const lit = d > L * (1 - rollK * 1.15) ? 1 : 0;
          const flick = rnd(Math.floor(t * 30) + id) > 0.25 ? 1 : 0.4;
          b = lerp(0.035, 0.85 * flick, lit * rollK ** 0.6);
          e = lit * rollK * 1.2;
        }
        if (t >= DROP) {
          b *= 1 + dropK * 0.8;
          e = 0.5 + pulse * 1.2 + dropK * 2;
        }
        if (st) b *= 1 + stFlash * 0.9;
        aBright.setX(id, b);
        aEdge.setX(id, e);
      }
    }
    cards.instanceMatrix.needsUpdate = true;
    aCell.needsUpdate = true;
    aBright.needsUpdate = true;
    aEdge.needsUpdate = true;

    // streaks: length grows with speed
    const len = clamp(v * 0.07, 0.02, 7);
    const sa = clamp((v - 4) / 18) * (dark ? rollK : 1);
    for (let k = 0; k < NS; k++) {
      const a = rnd(k) * Math.PI * 2;
      const r = 0.8 + rnd(k + 7) * 2.1;
      const span = 60;
      const d = ((rnd(k + 3) * span - tr * (0.9 + rnd(k + 11) * 0.5)) % span + span) % span;
      const z0 = -d + 1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      sPos.set([x, y, z0, x, y, z0 - len], k * 6);
      const hot = rnd(k + 5) > 0.5;
      const cc = sa * (0.5 + 0.5 * rnd(k + 9)) * (t >= DROP ? 1.6 : 1);
      const col = hot ? [1.0 * cc, 0.48 * cc, 0.24 * cc] : [cc, cc * 0.95, cc * 0.9];
      sCol.set([...col, 0, 0, 0], k * 6);
    }
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;

    // vanishing-point glow: only around the drop and the final hold
    const gA = t >= DROP - 0.3 ? clamp(ramp(t, DROP - 0.3, DROP) * 0.6 + dropK * 1.2) * (1 - 0.5 * ramp(t, FINAL, FINAL + 1)) : dark ? rollK ** 3 * 0.5 : 0;
    glowMat.opacity = gA;
    const gs = 30 + dropK * 50;
    glow.scale.set(gs, gs, 1);

    // camera
    camera.rotation.set(0, 0, roll(t));
    camera.position.set(Math.sin(t * 1.3) * 0.12, Math.cos(t * 1.1) * 0.1, 0);
    const shake = hit(t, beat(5), 0.08) * 0.08 + hit(t, DROP, 0.15) * 0.2;
    camera.position.x += Math.sin(t * 91) * shake;
    camera.position.y += Math.cos(t * 77) * shake;
    camera.fov = 78 + clamp(v / 50) * 14;
    camera.updateProjectionMatrix();
    const caK = clamp(v / 60) * 0.004 + hit(t, DROP, 0.2) * 0.012;
    ca.offset.set(caK, caK * 0.6);
    bloom.intensity = 0.9 + dropK * 1.2 + pulse * 0.25;
  };

  const render = () => composer.render();
  return { update, render };
};
