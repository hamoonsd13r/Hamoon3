// Snow Castle 3D · things drawn after the atmosphere: falling snow, chimney smoke and lamp halos.
// They test against the scene's depth texture themselves, so they need no depth buffer of their own.
import * as THREE from "three";
import type { Flag, Flame, Lamp, Smoke } from "./castle";
import { rng } from "./util";
import type { Shared } from "./mats";
import type { Theme } from "./theme";

export const NL = 16; // lamps that can tint the snow around them

const quad = () => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  return g;
};

export type FxShared = {
  tDepth: { value: THREE.Texture | null };
  res: { value: THREE.Vector2 };
  px: { value: number }; // projection scale: pixels per metre at 1 m
  nearFar: { value: THREE.Vector2 };
  camVel: { value: THREE.Vector3 };
  lPos: { value: THREE.Vector4[] };
  lCol: { value: THREE.Vector3[] };
  fogK: { value: number };
  focus: { value: THREE.Vector2 }; // focus distance, aperture
  rs: { value: number }; // internal pixels per 1080p pixel
};
export function makeFxShared(): FxShared {
  return {
    tDepth: { value: null },
    res: { value: new THREE.Vector2(1, 1) },
    px: { value: 1000 },
    nearFar: { value: new THREE.Vector2(1, 40000) },
    camVel: { value: new THREE.Vector3() },
    lPos: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, -999, 0, 0)) },
    lCol: { value: Array.from({ length: NL }, () => new THREE.Vector3()) },
    fogK: { value: 0.0006 },
    focus: { value: new THREE.Vector2(200, 0) },
    rs: { value: 2 },
  };
}

const DEPTH_FN = /* glsl */ `
uniform sampler2D tDepth; uniform vec2 uRes; uniform vec2 uNearFar;
float linZ(float d){ return uNearFar.x * uNearFar.y / (uNearFar.y - d * (uNearFar.y - uNearFar.x)); }
`;
const BLEND = { side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } as const;

export function makeSnow(U: Shared, F: FxShared, count: number, box: [number, number, number], size: number, seed: number, minPx = 1.1, bright = 1) {
  const g = quad();
  const r = rng(seed);
  const s = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) s[i] = r();
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(s, 4));
  g.instanceCount = count;
  const m = new THREE.ShaderMaterial({
    ...BLEND,
    uniforms: {
      uTime: U.time, uBox: { value: new THREE.Vector3(...box) }, uWindV: { value: new THREE.Vector3(0.9, 0, 0.45) }, uRes: F.res, uPx: F.px, uNearFar: F.nearFar, uCamVel: F.camVel,
      uShutter: { value: 1 / 55 }, uMinPx: { value: minPx }, uSize: { value: size }, uFocus: F.focus, uAmb: U.amb, uMoonCol: U.moonCol, uMoonDir: U.moonDir,
      uLPos: F.lPos, uLCol: F.lCol, tDepth: F.tDepth, uFogK: F.fogK, uBright: { value: bright }, uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform vec3 uBox; uniform vec3 uWindV; uniform vec2 uRes; uniform float uPx; uniform vec3 uCamVel; uniform float uShutter; uniform float uMinPx; uniform float uSize; uniform vec2 uFocus;
      uniform vec3 uAmb; uniform vec3 uMoonCol; uniform vec3 uMoonDir; uniform vec4 uLPos[${NL}]; uniform vec3 uLCol[${NL}]; uniform float uFogK; uniform float uBright; uniform float uFade;
      varying vec2 vC; varying float vA; varying vec3 vLight; varying float vAsp;
      void main(){
        float fall = mix(0.7, 1.55, aSeed.w);
        vec3 vel = vec3(uWindV.x * (0.55 + 0.9 * fract(aSeed.w * 7.3)), -fall, uWindV.z * (0.55 + 0.9 * fract(aSeed.w * 5.1)));
        vec3 p = aSeed.xyz * uBox + vel * uTime;
        float f1 = uTime * 0.83 + aSeed.w * 43.0; float f2 = uTime * 0.37 + aSeed.x * 31.0;
        p.x += sin(f1) * 0.26 + sin(f2) * 0.5;
        p.z += cos(f1 * 0.9 + 1.3) * 0.26 + cos(f2 * 0.84 + aSeed.z * 29.0) * 0.5;
        vel.x += cos(f1) * 0.22; vel.z -= sin(f1 * 0.9 + 1.3) * 0.21;
        p = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float dist = max(-mv.z, 0.05);
        float rw = uSize * mix(0.55, 1.5, fract(aSeed.w * 13.7));
        float px = rw * uPx / dist;
        float coc = uFocus.y * abs(1.0 / dist - 1.0 / uFocus.x);
        float rpx = max(px + coc, uMinPx);
        float alpha = min(1.0, pow((px * px) / (rpx * rpx), 0.62));
        vec3 vv = (viewMatrix * vec4(vel - uCamVel, 0.0)).xyz;
        vec2 sv = vv.xy * uShutter * uPx / dist;
        float sl = length(sv);
        vec2 dir = sl > 1e-3 ? sv / sl : vec2(0.0, 1.0);
        float halfLen = rpx + sl * 0.5;
        alpha *= pow(rpx / halfLen, 0.8);
        vec2 off = dir * position.y * halfLen + vec2(-dir.y, dir.x) * position.x * rpx;
        vec4 clip = projectionMatrix * mv;
        clip.xy += off / uRes * 2.0 * clip.w;
        gl_Position = clip;
        vAsp = halfLen / rpx;
        vC = vec2(position.x, position.y * vAsp);
        vec3 lp = (p - cameraPosition) / uBox;
        float edge = (1.0 - smoothstep(0.4, 0.5, max(abs(lp.x), max(abs(lp.y), abs(lp.z)))));
        float nearF = smoothstep(0.25, 1.2, dist);
        vec3 L = uAmb * 1.5 + uMoonCol * (0.28 + 0.5 * pow(max(dot(normalize(p - cameraPosition), uMoonDir), 0.0), 6.0));
        for (int i = 0; i < ${NL}; i++) {
          vec3 d = uLPos[i].xyz - p; float d2 = dot(d, d);
          L += uLCol[i] * (uLPos[i].w / (1.0 + d2 * 0.55));
        }
        vLight = L * uBright;
        vA = alpha * edge * nearF * exp(-dist * uFogK * 0.6) * uFade * mix(0.55, 1.0, aSeed.y);
        if (-mv.z < 0.06) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${DEPTH_FN}
      varying vec2 vC; varying float vA; varying vec3 vLight; varying float vAsp;
      void main(){
        float cy = max(abs(vC.y) - (vAsp - 1.0), 0.0);
        float d = length(vec2(vC.x, cy));
        float a = (1.0 - smoothstep(0.3, 1.0, d)) * vA;
        if (a < 0.002) discard;
        float sd = texture2D(tDepth, gl_FragCoord.xy / uRes).r;
        if (gl_FragCoord.z > sd) discard;
        gl_FragColor = vec4(vLight * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

export function makeSmoke(U: Shared, F: FxShared, emitters: Smoke[]) {
  const per = 26;
  const n = emitters.length * per;
  const g = quad();
  const r = rng(909);
  const base = new Float32Array(n * 3), seed = new Float32Array(n * 3);
  emitters.forEach((e, k) => {
    for (let i = 0; i < per; i++) {
      const o = k * per + i;
      base[o * 3] = e.p.x; base[o * 3 + 1] = e.p.y; base[o * 3 + 2] = e.p.z;
      seed[o * 3] = (i + r()) / per; seed[o * 3 + 1] = e.s * (0.8 + r() * 0.5); seed[o * 3 + 2] = r();
    }
  });
  g.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 3));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    ...BLEND,
    uniforms: { uTime: U.time, uWindV: { value: new THREE.Vector3(0.9, 0, 0.45) }, uAmb: U.amb, uMoonCol: U.moonCol, uRes: F.res, uNearFar: F.nearFar, tDepth: F.tDepth, uFogK: F.fogK },
    vertexShader: /* glsl */ `
      attribute vec3 aBase; attribute vec3 aSeed;
      uniform float uTime; uniform vec3 uWindV; uniform vec3 uAmb; uniform vec3 uMoonCol; uniform float uFogK;
      varying vec2 vC; varying float vA; varying vec3 vL; varying float vZ; varying float vS;
      void main(){
        float life = 11.0;
        float age = fract(uTime / life + aSeed.x);
        float a = age * life;
        vec3 p = aBase + vec3(0.0, 1.0, 0.0) * (1.75 * a * exp(-a * 0.055)) + uWindV * (0.085 * a * a + 0.12 * a);
        p.x += sin(a * 0.9 + aSeed.z * 30.0) * 0.1 * a; p.z += cos(a * 0.75 + aSeed.z * 17.0) * 0.1 * a;
        float size = (0.32 + 0.4 * a) * aSeed.y;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += position.xy * size;
        gl_Position = projectionMatrix * mv;
        vC = position.xy; vZ = -mv.z; vS = aSeed.z;
        vA = smoothstep(0.0, 0.07, age) * (1.0 - smoothstep(0.3, 1.0, age)) * 0.3 * exp(-vZ * uFogK * 0.5);
        vL = uAmb * 1.9 + uMoonCol * 0.3 + vec3(1.0, 0.5, 0.2) * 0.25 * exp(-a * 1.2);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${DEPTH_FN}
      varying vec2 vC; varying float vA; varying vec3 vL; varying float vZ; varying float vS;
      float hh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        float rr = length(vC);
        float a = (1.0 - smoothstep(0.15, 1.0, rr)) * vA * (0.55 + 0.75 * vn(vC * 1.7 + vS * 40.0));
        if (a < 0.002) discard;
        float sz = linZ(texture2D(tDepth, gl_FragCoord.xy / uRes).r);
        a *= smoothstep(0.0, 1.5, sz - vZ);
        gl_FragColor = vec4(vL * (0.75 + 0.25 * vC.y) * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

export function makeGlows(U: Shared, F: FxShared, lamps: Lamp[]) {
  const list = lamps.filter((l) => l.glow > 0);
  const g = quad();
  const rr = rng(4711);
  const base = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3), info = new Float32Array(list.length * 3);
  list.forEach((l, i) => {
    base.set([l.p.x, l.p.y, l.p.z], i * 3);
    col.set([l.col[0] * l.i, l.col[1] * l.i, l.col[2] * l.i], i * 3);
    info.set([l.tOn, 0.9 * l.glow, rr()], i * 3);
  });
  g.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
  g.setAttribute("aCol", new THREE.InstancedBufferAttribute(col, 3));
  g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 3));
  g.instanceCount = list.length;
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, uLit: U.lit, uRes: F.res, uPx: F.px, uNearFar: F.nearFar, tDepth: F.tDepth, uFogK: F.fogK, uGain: { value: 1 }, uRs: F.rs },
    vertexShader: /* glsl */ `
      attribute vec3 aBase; attribute vec3 aCol; attribute vec3 aInfo;
      uniform float uTime; uniform float uLit; uniform vec2 uRes; uniform float uPx; uniform float uFogK; uniform float uGain; uniform float uRs;
      varying vec2 vC; varying vec3 vCol; varying float vZ;
      void main(){
        vec4 mv = viewMatrix * vec4(aBase, 1.0);
        float dist = max(-mv.z, 0.1);
        float t = uLit - aInfo.x;
        float on = smoothstep(0.0, 0.5, t) * (1.0 + 0.5 * exp(-max(t, 0.0) * 2.5) * sin(t * 26.0));
        on *= 0.9 + 0.1 * sin(uTime * 9.0 + aBase.x * 3.1 + aBase.z * 1.7) * sin(uTime * 3.7 + aBase.x);
        float rw = aInfo.y * (1.0 + dist * 0.016);
        float px = rw * uPx / dist;
        float rpx = max(px, 1.5 * uRs);
        vec4 clip = projectionMatrix * mv;
        clip.xy += position.xy * rpx / uRes * 2.0 * clip.w;
        gl_Position = clip;
        vC = position.xy; vZ = dist;
        vCol = aCol * on * uGain * min(1.0, (px * px) / (rpx * rpx) * 1.0 + 0.0) * exp(-dist * uFogK * 0.8);
        // every lamp burns a little differently; close to the lens the halo steps back so the lantern itself is seen
        vCol *= (0.82 + 0.36 * aInfo.z) * mix(0.24, 1.0, smoothstep(5.0, 34.0, dist));
        if (-mv.z < 0.2) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${DEPTH_FN}
      varying vec2 vC; varying vec3 vCol; varying float vZ;
      void main(){
        float r2 = dot(vC, vC);
        float I = exp(-r2 * 9.0) * 0.9 + 0.07 * exp(-r2 * 2.2) * (1.0 - smoothstep(0.6, 1.0, sqrt(r2)));
        float sz = linZ(texture2D(tDepth, gl_FragCoord.xy / uRes).r);
        float vis = smoothstep(-0.9, -0.2, sz - vZ);
        gl_FragColor = vec4(vCol * I * vis, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

/** open fire in the baskets by the gate: one upright tongue per fire, licked by rising noise (drawn after the air) */
export function makeFlames(U: Shared, F: FxShared, flames: Flame[]) {
  const g = quad();
  const base = new Float32Array(flames.length * 3), info = new Float32Array(flames.length * 3);
  flames.forEach((fl, i) => {
    base.set([fl.p.x, fl.p.y, fl.p.z], i * 3);
    info.set([fl.tOn, fl.s, (i * 0.618 + 0.21) % 1], i * 3);
  });
  g.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
  g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 3));
  g.instanceCount = flames.length;
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, uLit: U.lit, uRes: F.res, uNearFar: F.nearFar, tDepth: F.tDepth, uFogK: F.fogK },
    vertexShader: /* glsl */ `
      attribute vec3 aBase; attribute vec3 aInfo;
      uniform float uTime; uniform float uLit; uniform float uFogK;
      varying vec2 vC; varying float vOn; varying float vZ; varying float vS;
      void main(){
        float t = uLit - aInfo.x;
        vOn = smoothstep(0.0, 0.9, t) * (1.0 + 0.6 * exp(-max(t, 0.0) * 2.0));
        vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
        vec3 p = aBase + right * (position.x * 0.62 * aInfo.y) + vec3(0.0, (position.y * 0.5 + 0.5) * 1.7 * aInfo.y, 0.0);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vC = vec2(position.x, position.y * 0.5 + 0.5); vZ = -mv.z; vS = aInfo.z;
        vOn *= exp(-vZ * uFogK * 0.5);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${DEPTH_FN}
      uniform float uTime;
      varying vec2 vC; varying float vOn; varying float vZ; varying float vS;
      float hh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        float x = vC.x; float y = vC.y;
        float t = uTime * 2.7 + vS * 20.0;
        float n = vn(vec2(x * 2.2 + vS * 9.0, y * 2.6 - t)) * 0.6 + vn(vec2(x * 5.0 + 3.0, y * 5.5 - t * 1.7)) * 0.4;
        float sway = (vn(vec2(vS * 5.0, t * 0.33)) - 0.5) * 0.55 * y;
        float w = mix(0.6, 0.04, sqrt(clamp(y, 0.0, 1.0))) * (0.7 + 0.7 * n);
        float d = abs(x - sway) / max(w, 1e-3);
        float top = 0.42 + 0.5 * n;
        float body = (1.0 - smoothstep(0.5, 1.0, d)) * (1.0 - smoothstep(top * 0.7, top, y)) * smoothstep(0.0, 0.05, y);
        float core = (1.0 - smoothstep(0.0, 0.7, d)) * (1.0 - smoothstep(0.05, 0.42, y));
        vec3 col = mix(vec3(1.0, 0.3, 0.045), vec3(1.0, 0.74, 0.3), core) * (body * 2.2 + core * 3.2);
        float sz = linZ(texture2D(tDepth, gl_FragCoord.xy / uRes).r);
        col *= smoothstep(-0.6, 0.0, sz - vZ) * vOn;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

/** pennants streaming from the tallest spires (an ordinary lit mesh in the main scene: the air and the lens act on it) */
export function makeFlags(U: Shared, flags: Flag[], th: Pick<Theme, "pennants" | "pennantStripe">) {
  const NX = 14, per = (NX + 1) * 2;
  const n = flags.length;
  const pos = new Float32Array(n * per * 3), aUv = new Float32Array(n * per * 2), aInfo = new Float32Array(n * per * 4);
  const idx: number[] = [];
  flags.forEach((fl, i) => {
    for (let k = 0; k <= NX; k++) for (let j = 0; j < 2; j++) {
      const o = i * per + k * 2 + j;
      pos.set([fl.p.x, fl.p.y, fl.p.z], o * 3);
      aUv.set([k / NX, j], o * 2);
      aInfo.set([fl.len, fl.h, fl.seed, fl.col], o * 4);
    }
    for (let k = 0; k < NX; k++) {
      const a = i * per + k * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aUv", new THREE.BufferAttribute(aUv, 2));
  g.setAttribute("aInfo", new THREE.BufferAttribute(aInfo, 4));
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: U.time, uWind: U.wind, uAmb: U.amb, uMoonDir: U.moonDir, uMoonCol: U.moonCol, uCloth: { value: th.pennants.map((c) => new THREE.Vector3(...c)) }, uStripe: { value: new THREE.Vector3(...th.pennantStripe) } },
    vertexShader: /* glsl */ `
      attribute vec2 aUv; attribute vec4 aInfo;
      uniform float uTime; uniform vec2 uWind;
      varying vec2 vU; varying vec3 vN; varying float vCol;
      void main(){
        float u = aUv.x; float v = aUv.y;
        vec2 wd = normalize(uWind);
        vec3 dir = vec3(wd.x, 0.0, wd.y); vec3 side = vec3(-wd.y, 0.0, wd.x);
        float len = aInfo.x; float h = aInfo.y; float sd = aInfo.z;
        float ph = uTime * 3.4 + sd * 40.0;
        // the fly streams down-wind; the wave grows towards the point, the whole length lifts and sinks with the gusts
        float wave = sin(u * 6.5 - ph) * 0.6 + sin(u * 11.7 - ph * 1.6 + 1.3) * 0.3;
        float dwave = cos(u * 6.5 - ph) * 3.9 + cos(u * 11.7 - ph * 1.6 + 1.3) * 3.5;
        float gust = 0.72 + 0.28 * sin(uTime * 0.7 + sd * 10.0);
        float droop = u * u * len * 0.3 * (1.3 - gust);
        float taper = 1.0 - 0.8 * u;
        vec3 p = position + dir * (u * len * (0.9 + 0.1 * gust)) + side * (wave * 0.085 * len * u) + vec3(0.0, (v - 0.5) * h * taper - droop + wave * 0.05 * len * u, 0.0);
        vN = normalize(side - dir * (dwave * 0.085 * u));
        vU = aUv; vCol = aInfo.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uAmb; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform vec3 uCloth[3]; uniform vec3 uStripe;
      varying vec2 vU; varying vec3 vN; varying float vCol;
      void main(){
        vec3 base = vCol < 0.5 ? uCloth[0] : (vCol < 1.5 ? uCloth[1] : uCloth[2]);
        base = mix(base, uStripe, step(abs(vU.y - 0.5), 0.1) * 0.85);
        float nl = abs(dot(normalize(vN), uMoonDir));
        vec3 col = base * (uAmb * 1.7 + uMoonCol * (0.2 + 0.75 * nl));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

/** a few rooks wheeling round the great tower in the afternoon (they are gone by nightfall: uShow) */
export function makeBirds(U: Shared, F: FxShared, n: number, centre: [number, number, number]) {
  const g = quad();
  const r = rng(5150);
  const sd = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) sd[i] = r();
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(sd, 4));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    ...BLEND,
    uniforms: { uTime: U.time, uCentre: { value: new THREE.Vector3(...centre) }, uRes: F.res, tDepth: F.tDepth, uNearFar: F.nearFar, uShow: { value: 1 }, uAmb: U.amb, uFogK: F.fogK },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform vec3 uCentre; uniform float uShow; uniform float uFogK;
      varying vec2 vC; varying float vFlap; varying float vA; varying float vBank;
      void main(){
        float rad = mix(24.0, 62.0, aSeed.x);
        float ang = aSeed.w * 6.2831853 + uTime * (9.5 / rad) * (0.85 + 0.3 * aSeed.y);
        vec3 c = uCentre + vec3(cos(ang) * rad, sin(ang * 0.6 + aSeed.x * 6.0) * 6.0 + (aSeed.y - 0.5) * 22.0, sin(ang) * rad * 0.82);
        // flap in bursts, glide in between
        float burst = smoothstep(-0.25, 0.35, sin(uTime * 0.55 + aSeed.z * 20.0));
        vFlap = sin(uTime * (6.0 + aSeed.z * 2.0) + aSeed.w * 30.0) * burst + 0.25 * (1.0 - burst);
        vec4 mv = viewMatrix * vec4(c, 1.0);
        // the bird banks into its turn: roll the sprite a little with the heading seen from the lens
        vec3 head = vec3(-sin(ang), 0.0, cos(ang) * 0.82);
        vec3 hv = (viewMatrix * vec4(head, 0.0)).xyz;
        vBank = clamp(hv.x, -1.0, 1.0);
        mv.xy += position.xy * 0.78;
        gl_Position = projectionMatrix * mv;
        vC = position.xy;
        vA = uShow * exp(max(-mv.z, 0.0) * -uFogK * 0.7);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${DEPTH_FN}
      uniform vec3 uAmb;
      varying vec2 vC; varying float vFlap; varying float vA; varying float vBank;
      float seg(vec2 p, vec2 a, vec2 b, float r0, float r1){
        vec2 pa = p - a; vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - mix(r0, r1, h);
      }
      void main(){
        float sd0 = texture2D(tDepth, gl_FragCoord.xy / uRes).r;
        if (gl_FragCoord.z > sd0) discard;
        vec2 p = vC;
        float lift = vFlap * 0.42;
        // seen side-on the wings foreshorten, seen head-on they span the sprite
        float span = mix(0.42, 0.95, 1.0 - abs(vBank) * 0.75);
        float d = min(seg(p, vec2(0.0, 0.0), vec2(span * 0.55, lift * 0.6 + 0.06), 0.085, 0.06), seg(p, vec2(span * 0.55, lift * 0.6 + 0.06), vec2(span, lift), 0.06, 0.012));
        d = min(d, min(seg(p, vec2(0.0, 0.0), vec2(-span * 0.55, lift * 0.6 + 0.06), 0.085, 0.06), seg(p, vec2(-span * 0.55, lift * 0.6 + 0.06), vec2(-span, lift), 0.06, 0.012)));
        d = min(d, seg(p, vec2(-0.16 * vBank, -0.03), vec2(0.2 * vBank, 0.02), 0.1, 0.06));
        float aa = max(fwidth(d), 1e-4);
        float a = clamp(0.5 - d / aa, 0.0, 1.0) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uAmb * 0.06 * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}
