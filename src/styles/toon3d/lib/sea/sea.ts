// Toon sea: 7 Gerstner waves whose amplitudes run from the afternoon swell (state 0) to the full storm (state 1),
// on a radial grid that follows the camera (dense near the lens, sparse at the horizon; small waves fade out where
// the grid is too coarse for them). Colour: trough -> body -> crest by height, two-tone sun term, cartoon glints,
// whitecaps on steep crests, flowing white foam lines, fresnel to the horizon colour, fog.
// The oil slick: inside it the short waves (chop) die out and the surface gets a gold sheen, no foam.
// heightAt()/tiltAt() are the same waves in JS (long waves only) so the ships ride the sea.
import * as THREE from "three";
import { NOINK } from "../base/ink";
import { untone } from "../base/shade";
import type { SeaLook } from "./lights";

type Wave = { ang: number; L: number; aDay: number; aStorm: number; q: number; ph: number };
// wind/swell travel toward +x (the cook pours on the windward side = -x of the ship)
const WAVES: Wave[] = [
  { ang: 0, L: 64, aDay: 0.32, aStorm: 3.3, q: 0.48, ph: 0.0 },
  { ang: 24, L: 37, aDay: 0.2, aStorm: 1.9, q: 0.52, ph: 1.7 },
  { ang: -31, L: 23, aDay: 0.13, aStorm: 1.15, q: 0.55, ph: 4.1 },
  { ang: 58, L: 12.5, aDay: 0.07, aStorm: 0.56, q: 0.55, ph: 2.3 },
  { ang: -66, L: 7.2, aDay: 0.04, aStorm: 0.3, q: 0.55, ph: 5.6 },
  { ang: 12, L: 4.1, aDay: 0.022, aStorm: 0.15, q: 0.45, ph: 3.2 },
  { ang: 108, L: 2.6, aDay: 0.012, aStorm: 0.06, q: 0.35, ph: 0.9 },
];
const G = 9.81;
const K = WAVES.map((w) => (2 * Math.PI) / w.L);
const OM = K.map((k) => Math.sqrt(G * k) * 0.9);
const DIR = WAVES.map((w) => [Math.cos((w.ang * Math.PI) / 180), Math.sin((w.ang * Math.PI) / 180)]);
const amp = (i: number, state: number) => WAVES[i].aDay + (WAVES[i].aStorm - WAVES[i].aDay) * state;

/** the one big wave (travels toward +z): crest at zc, height h, length scale L, curl 0..1 (front steepness), across x
 *  full height within |x - xc| < hw then tapering over `taper`. Inside the oil slick the curl dies (a smooth hill).
 *  world.ts sets it every frame before the ships ride. */
export const BIG = { on: 0, zc: 0, h: 0, L: 40, curl: 0, xc: 0, hw: 220, taper: 120, steep: 0, slick: [0, 0, 1, 0] as [number, number, number, number] };
const slickAt = (x: number, z: number) => {
  const [sx, sz, r, s] = BIG.slick, d = Math.hypot(x - sx, z - sz), u = Math.max(0, Math.min(1, (d - r * 0.55) / (r * 0.45)));
  return s * (1 - u * u * (3 - 2 * u));
};
export const bigH = (x: number, z: number) => {
  if (!BIG.on || BIG.h <= 0) return 0;
  const d = z - BIG.zc, curl = BIG.curl * (1 - slickAt(x, z)), Lb = BIG.L * 1.6, Lf = BIG.L * (1 - 0.6 * curl);
  // the front face: Gaussian, or with steep > 0 a super-Gaussian (a high shoulder, then a wall down to the trough)
  const prof = d < 0 ? Math.exp(-(d * d) / (Lb * Lb)) : Math.exp(-Math.pow(d / Lf, 2 + 4 * BIG.steep));
  const ax = Math.abs(x - BIG.xc), u = Math.max(0, Math.min(1, (ax - BIG.hw) / BIG.taper));
  return BIG.h * prof * (1 - u * u * (3 - 2 * u));
};
/** sea height at world (x, z), long waves only (what a ship feels) + the big wave */
export const heightAt = (x: number, z: number, t: number, state: number, slick = 0, big = 1) => {
  let y = 0;
  for (let i = 0; i < 4; i++) {
    const a = amp(i, state) * (i >= 3 ? 1 - 0.85 * slick : 1);
    y += a * Math.sin(K[i] * (DIR[i][0] * x + DIR[i][1] * z) - OM[i] * t + WAVES[i].ph);
  }
  return y + big * bigH(x, z);
};
/** pitch (about the ship's z, bow up +), roll (starboard side up +) and heave of a hull of length l / beam b centred at
 *  (x, z), heading yaw (three.js rotation.y: the bow points along (cos yaw, 0, -sin yaw), starboard along (sin yaw, 0, cos yaw)) */
export const tiltAt = (x: number, z: number, t: number, state: number, l: number, b: number, yaw = 0, slick = 0, big = 1) => {
  const fx = Math.cos(yaw), fz = -Math.sin(yaw), sx = Math.sin(yaw), sz = Math.cos(yaw);
  const hb = heightAt(x + fx * l * 0.4, z + fz * l * 0.4, t, state, slick, big), hs = heightAt(x - fx * l * 0.4, z - fz * l * 0.4, t, state, slick, big);
  const hp = heightAt(x + sx * b * 0.5, z + sz * b * 0.5, t, state, slick, big), hq = heightAt(x - sx * b * 0.5, z - sz * b * 0.5, t, state, slick, big);
  return { heave: (hb + hs + hp + hq) / 4, pitch: Math.atan2(hb - hs, l * 0.8), roll: Math.atan2(hp - hq, b) };
};

const VERT = /* glsl */ `
#define NW 7
uniform float uTime, uState, uFade;
uniform vec4 uW[NW];      // dir.x, dir.z, k, omega
uniform vec4 uA[NW];      // amp, q, phase, wavelength
uniform vec4 uSlick;      // x, z, radius, strength
uniform vec4 uBig;        // crest z, height, length scale, curl
uniform vec4 uBigX;       // centre x, half width at full height, taper, on
uniform float uBigS;      // face steepness (0 = Gaussian)
varying vec3 vWP; varying vec3 vN; varying float vH; varying float vCrest; varying float vSlick; varying float vDist;
varying float vBig; varying float vBigF;
float slickAtV(vec2 p){ return uSlick.w * (1.0 - smoothstep(uSlick.z * 0.55, uSlick.z, length(p - uSlick.xy))); }
float bigH(vec2 p){
  float d = p.y - uBig.x, curl = uBig.w * (1.0 - slickAtV(p));
  float Lb = uBig.z * 1.6, Lf = uBig.z * (1.0 - 0.6 * curl);
  float prof = d < 0.0 ? exp(-(d * d) / (Lb * Lb)) : exp(-pow(max(d, 0.0) / Lf, 2.0 + 4.0 * uBigS));
  float ex = 1.0 - smoothstep(uBigX.y, uBigX.y + uBigX.z, abs(p.x - uBigX.x));
  return uBig.y * prof * ex;
}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 p = wp.xz;
  float dist = length(p - cameraPosition.xz);
  float sl = uSlick.w * (1.0 - smoothstep(uSlick.z * 0.55, uSlick.z, length(p - uSlick.xy)));
  vec3 d = vec3(0.0); vec3 n = vec3(0.0, 1.0, 0.0); float crest = 0.0;
  for (int i = 0; i < NW; i++){
    vec4 w = uW[i]; vec4 a = uA[i];
    float fade = 1.0 - smoothstep(a.w * 5.0, a.w * 10.0, dist * uFade);
    float A = a.x * fade * (i >= 3 ? 1.0 - 0.88 * sl : 1.0);
    float th = w.z * dot(w.xy, p) - w.w * uTime + a.z;
    float S = sin(th), Cc = cos(th), WA = w.z * A;
    d.x += a.y * A * w.x * Cc; d.z += a.y * A * w.y * Cc; d.y += A * S;
    n.x -= w.x * WA * Cc; n.z -= w.y * WA * Cc; n.y -= a.y * WA * S;
    crest += a.y * WA * S;
  }
  vBig = 0.0; vBigF = 0.0;
  float hg = d.y;
  if (uBigX.w > 0.5 && uBig.y > 0.0) {
    float e = 0.8, h0 = bigH(p), hx = bigH(p + vec2(e, 0.0)), hz = bigH(p + vec2(0.0, e));
    d.y += h0; n.x -= (hx - h0) / e; n.z -= (hz - h0) / e;
    vBig = h0 / uBig.y; vBigF = (hz - h0) / e;
  }
  wp.xyz += d;
  vWP = wp.xyz; vN = normalize(n); vH = hg; vCrest = crest; vSlick = sl; vDist = dist;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform vec3 uNear, uMid, uFar, uCrestC, uTrough, uFoam, uGlint, uSheen, uHor, uFogC, uSun;
uniform float uState, uTime, uFogNear, uFogFar, uAmp, uLines, uFlash;
uniform vec4 uHullA[2];   // centre x, z, cos(yaw), sin(yaw)
uniform vec4 uHullB[2];   // half length, half beam, strength, wake strength
uniform float uSlickGlow;
varying vec3 vWP; varying vec3 vN; varying float vH; varying float vCrest; varying float vSlick; varying float vDist;
varying float vBig; varying float vBigF;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vWP), L = normalize(uSun);
  float dist = vDist;
  // body colour by distance, then by height (trough -> body -> crest)
  vec3 body = mix(uNear, uMid, smoothstep(6.0, 70.0, dist));
  body = mix(body, uFar, smoothstep(80.0, 520.0, dist));
  float h01 = clamp(vH / max(0.62 * uAmp, 0.05) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uTrough, body, smoothstep(0.08, 0.6, h01));
  col = mix(col, uCrestC, smoothstep(0.76, 0.99, h01) * 0.42);
  // two-tone sun
  float ndl = dot(N, L);
  float lit = smoothstep(-0.02, 0.22, ndl);
  col *= mix(0.74, 1.1, lit);
  // fresnel toward the horizon colour (no mirror reflections in this style)
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col = mix(col, uHor, fres * 0.3);
  // cartoon glints: hard-edged specular blobs, glossier inside the slick
  vec3 R = reflect(-L, N);
  float spec = pow(max(dot(R, V), 0.0), mix(60.0, 180.0, vSlick));
  float gl = smoothstep(0.5, 0.56, spec) * max(1.0 - smoothstep(0.3, 0.75, uState), 0.9 * vSlick) * (1.0 - smoothstep(150.0, 600.0, dist));
  // whitecaps on steep crests (storm) + flowing foam lines (white streaks)
  float cap = smoothstep(0.48, 0.78, vCrest + 0.22 * fbm(vWP.xz * 0.15 + uTime * 0.05)) * smoothstep(0.3, 1.0, uState)
    * smoothstep(0.38, 0.62, fbm(vWP.xz * vec2(0.22, 0.045) + vec2(uTime * 0.07, 0.0)))
    * (0.45 + 0.55 * smoothstep(0.35, 0.65, fbm(vWP.xz * 0.8 + 7.3))) * 0.85;
  vec2 q = vWP.xz * vec2(0.045, 0.07) + vec2(uTime * 0.012, uTime * 0.004);
  float f = fbm(q + 0.6 * vec2(fbm(q * 1.7 + 3.1), fbm(q * 1.7 - 5.3)));
  float band = abs(fract(f * 7.0) - 0.5);
  float w = fwidth(f * 7.0);
  float line = 1.0 - smoothstep(0.035, 0.035 + w * 1.5, band);
  line *= smoothstep(0.38, 0.58, fbm(vWP.xz * 0.02 - uTime * 0.01)) * uLines * (1.0 - smoothstep(60.0, 260.0, dist));
  float foam = max(cap, line * (0.55 + 0.45 * smoothstep(0.4, 0.85, h01))) * (1.0 - vSlick);
  // foam hugging each hull at the waterline + a short wake off the stern
  for (int k = 0; k < 2; k++){
    vec4 A = uHullA[k], B = uHullB[k];
    if (B.z <= 0.0) continue;
    vec2 d = vWP.xz - A.xy;
    float lx = dot(d, vec2(A.z, -A.w)), lz = dot(d, vec2(A.w, A.z));
    float e = length(vec2(lx / B.x, lz / B.y)) - 1.0;
    float n = fbm(vec2(lx, lz) * 0.9 + uTime * 0.6);
    float ring = (1.0 - smoothstep(0.0, 0.1 + 0.12 * n, abs(e - 0.03))) * smoothstep(0.25, 0.55, n + 0.2);
    float aft = -lx - B.x * 0.85;
    float wake = step(0.0, aft) * (1.0 - smoothstep(B.y * (0.55 + 0.09 * aft) - 0.6, B.y * (0.55 + 0.09 * aft), abs(lz)))
      * (1.0 - smoothstep(0.0, 26.0, aft)) * smoothstep(0.45, 0.7, fbm(vec2(lx * 0.35 + uTime * 0.8, lz * 0.9)));
    foam = max(foam, B.z * ring + B.w * wake * 0.85);
  }
  // the big wave: its face lightens toward the crest (light through the water), a white breaking crest and foam
  // streaks down the front where it is steep, none inside the slick
  if (vBig > 0.01) {
    col = mix(col, mix(body, uCrestC, 0.55), smoothstep(0.45, 1.0, vBig) * 0.45);
    float steep = smoothstep(0.25, 0.9, -vBigF);
    float lip = smoothstep(0.8, 0.95, vBig) * steep * (0.55 + 0.45 * fbm(vWP.xz * vec2(0.12, 0.5) + uTime * 0.3));
    float streak = smoothstep(0.55, 0.85, vBig) * steep * smoothstep(0.52, 0.68, fbm(vWP.xz * vec2(0.35, 0.05) + vec2(0.0, uTime * 0.4)));
    foam = max(foam, max(lip, streak * 0.75) * (1.0 - vSlick));
  }
  col = mix(col, uFoam, foam);
  col += uGlint * gl * 0.9;
  // the oil slick: the water stays water (a touch darker and calmer), with thin golden swirls drifting on it, a warm
  // gloss toward grazing angles and, in the storm, a soft glow; the edge is ragged (noise), never a flat patch
  float sl2 = vSlick * smoothstep(0.32, 0.6, fbm(vWP.xz * 0.06 + 3.7) * 0.6 + vSlick * 0.55);
  float sw = fbm(vWP.xz * 0.11 + vec2(uTime * 0.015, -uTime * 0.01));
  float swB = abs(fract(sw * 6.0) - 0.5), swW = fwidth(sw * 6.0);
  float swirl = (1.0 - smoothstep(0.05, 0.05 + swW * 1.8, swB)) * smoothstep(0.3, 0.65, fbm(vWP.xz * 0.05 - 2.1));
  col = mix(col, col * 0.78, sl2 * 0.6);
  col = mix(col, uSheen, sl2 * (0.65 * swirl + 0.04 * fres));
  col += uSheen * sl2 * (0.012 + 0.22 * swirl) * uSlickGlow;
  // lightning lifts the whole sea
  col *= 1.0 + uFlash * 1.6;
  // the big wave keeps most of its colour through the fog: the wall has to read on the horizon
  float fog = smoothstep(uFogNear, uFogFar, dist) * (1.0 - 0.72 * smoothstep(0.12, 0.7, vBig));
  col = mix(col, uFogC, fog);
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sea {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  state = 0;
  constructor(rings = 190, segs = 360, r0 = 0.25, r1 = 1600) {
    const pos: number[] = [], idx: number[] = [];
    pos.push(0, 0, 0);
    for (let i = 0; i < rings; i++) {
      const r = r0 * Math.pow(r1 / r0, i / (rings - 1));
      for (let j = 0; j < segs; j++) { const a = (j / segs) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) {
      const a = 1 + i * segs + j, b = 1 + i * segs + ((j + 1) % segs), c = 1 + (i + 1) * segs + ((j + 1) % segs), d = 1 + (i + 1) * segs + j;
      idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), r1 + 50);
    const U = <T,>(v: T) => ({ value: v });
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: U(0), uState: U(0), uFade: U(1), uAmp: U(1), uLines: U(1), uFlash: U(0),
        uW: U(WAVES.map((_, i) => new THREE.Vector4(DIR[i][0], DIR[i][1], K[i], OM[i]))),
        uA: U(WAVES.map((w) => new THREE.Vector4(w.aDay, w.q * 0.88, w.ph, w.L))),
        uSlick: U(new THREE.Vector4(0, 0, 1, 0)),
        uNear: U(new THREE.Color()), uMid: U(new THREE.Color()), uFar: U(new THREE.Color()), uCrestC: U(new THREE.Color()),
        uTrough: U(new THREE.Color()), uFoam: U(new THREE.Color()), uGlint: U(new THREE.Color()), uSheen: U(new THREE.Color()),
        uHor: U(new THREE.Color()), uFogC: U(new THREE.Color()), uSun: U(new THREE.Vector3(0, 1, 0)),
        uFogNear: U(40), uFogFar: U(500),
        uHullA: U([new THREE.Vector4(), new THREE.Vector4()]), uHullB: U([new THREE.Vector4(1, 1, 0, 0), new THREE.Vector4(1, 1, 0, 0)]),
        uBig: U(new THREE.Vector4(0, 0, 40, 0)), uBigX: U(new THREE.Vector4(0, 220, 120, 0)), uBigS: U(0), uSlickGlow: U(0),
      },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(NOINK);
    this.mesh.renderOrder = -0.5;
  }
  /** per frame: time, sea state, colours (on-screen targets), sun (world dir), fog, slick, lightning flash */
  update(o: { t: number; state: number; look: SeaLook; hor: string; fog: string; fogNear: number; fogFar: number; sun: THREE.Vector3;
    cam: THREE.Vector3; slick?: [number, number, number, number]; flash?: number; lines?: number; glow?: number;
    hulls?: { x: number; z: number; yaw: number; hl: number; hb: number; foam: number; wake: number }[] }) {
    const u = this.mat.uniforms;
    this.state = o.state;
    u.uTime.value = o.t; u.uState.value = o.state; u.uFlash.value = o.flash ?? 0; u.uLines.value = o.lines ?? 1;
    const A = u.uA.value as THREE.Vector4[];
    let tot = 0;
    WAVES.forEach((w, i) => { const a = amp(i, o.state); A[i].x = a; if (i < 3) tot += a; });
    u.uAmp.value = tot;
    const L = o.look;
    untone(L.near, u.uNear.value); untone(L.mid, u.uMid.value); untone(L.far, u.uFar.value); untone(L.crest, u.uCrestC.value);
    untone(L.trough, u.uTrough.value); untone(L.foam, u.uFoam.value); untone(L.glint, u.uGlint.value); untone(L.sheen, u.uSheen.value);
    untone(o.hor, u.uHor.value); untone(o.fog, u.uFogC.value);
    u.uFogNear.value = o.fogNear; u.uFogFar.value = o.fogFar;
    (u.uSun.value as THREE.Vector3).copy(o.sun);
    (u.uSlick.value as THREE.Vector4).set(...(o.slick ?? [0, 0, 1, 0]));
    u.uSlickGlow.value = o.glow ?? 0;
    (u.uBig.value as THREE.Vector4).set(BIG.zc, BIG.h, BIG.L, BIG.curl);
    (u.uBigX.value as THREE.Vector4).set(BIG.xc, BIG.hw, BIG.taper, BIG.on);
    u.uBigS.value = BIG.steep;
    const HA = u.uHullA.value as THREE.Vector4[], HB = u.uHullB.value as THREE.Vector4[];
    for (let k = 0; k < 2; k++) {
      const h = o.hulls?.[k];
      if (!h) { HB[k].set(1, 1, 0, 0); continue; }
      HA[k].set(h.x, h.z, Math.cos(h.yaw), Math.sin(h.yaw)); HB[k].set(h.hl, h.hb, h.foam, h.wake);
    }
    // the grid follows the lens in whole cells (no swimming): snap to 2 m
    this.mesh.position.set(Math.round(o.cam.x / 2) * 2, 0, Math.round(o.cam.z / 2) * 2);
  }
}
