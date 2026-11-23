// Hollow Moon 3D · the air: ambient occlusion composite, night haze over the sea, and the light of the core caught by the
// air — inside the hall (closed-form airlight of a point source) and outside, where it leaves the moon as a cone
// through the opening (marched).
import * as THREE from "three";

export const AIR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDepth; uniform vec2 uNearFar;
uniform sampler2D tColor; uniform sampler2D tAO;
uniform mat4 uInvVP; uniform vec3 uCam; uniform float uAO;
uniform vec3 uFogCol; uniform vec3 uFog;       // density at sea level, height falloff, cap
uniform vec3 uMoonC; uniform vec3 uBreachW;    // centre of the moon, direction of its opening (world)
uniform vec4 uCone;                            // cos(inner), cos(outer), strength outside, strength inside
uniform vec3 uCoreCol; uniform vec2 uRad;      // R, hall radius
uniform float uShut;                           // 1 = the core is hidden behind its cage (no light in the air)
varying vec2 vUv;
float linZ(float d){ return uNearFar.x * uNearFar.y / (uNearFar.y - d * (uNearFar.y - uNearFar.x)); }
float IGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float d = texture2D(tDepth, vUv).r;
  vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec3 rd = wp.xyz - uCam;
  float dist = length(rd);
  rd /= dist;
  bool sky = d >= 0.999995;
  if (!sky) {
    float ao = 0.35 + 0.65 * texture2D(tAO, vUv).r;
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= mix(1.0, ao, uAO * (1.0 - smoothstep(1.2, 5.0, lum)));
    // night haze, thicker near the water
    float k = uFog.y * rd.y;
    float tk = abs(k) > 1e-5 ? (1.0 - exp(-clamp(k * dist, -30.0, 30.0))) / k : dist;
    float tau = min(uFog.x * exp(-uFog.y * max(uCam.y, 0.0)) * tk, uFog.z);
    float T = exp(-tau);
    col = col * T + uFogCol * (1.0 - T);
  }
  float dd = sky ? 5000.0 : dist;
  vec3 L = uMoonC - uCam;
  float b = dot(L, rd), c2 = dot(L, L), h2 = max(c2 - b * b, 0.0);
  float glow = 0.0;
  // inside the hall: the chord of the hall sphere, integrated exactly
  float disc = uRad.y * uRad.y - h2;
  if (disc > 0.0) {
    float s = sqrt(disc), t0 = max(b - s, 0.0), t1 = min(b + s, dd);
    if (t1 > t0) { float h = sqrt(h2 + 16.0); glow += uCone.w * (atan((t1 - b) / h) - atan((t0 - b) / h)) / h; }
  }
  // outside: the cone of light through the opening
  float jit = IGN(gl_FragCoord.xy);
  const int NS = 24;
  float tMax = min(dd, 1500.0), acc = 0.0;
  for (int i = 0; i < NS; i++) {
    float t = tMax * (float(i) + jit) / float(NS);
    vec3 p = uCam + rd * t - uMoonC;
    float r2 = dot(p, p);
    if (r2 < uRad.x * uRad.x) continue;
    float mu = dot(p, uBreachW) * inversesqrt(r2);
    acc += smoothstep(uCone.y, uCone.x, mu) / (r2 + 900.0) * exp(-sqrt(r2) * 0.0022);
  }
  glow += uCone.z * acc * tMax / float(NS);
  col += uCoreCol * glow * (1.0 - uShut);
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

export const RAYS_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tBright; uniform vec2 uLight; uniform vec4 uRay; // strength, decay, reach, 0
varying vec2 vUv;
float IGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  if (uRay.x > 0.0) {
    const int NS = 56;
    vec2 d = (uLight - vUv) * uRay.z / float(NS);
    vec2 uv = vUv + d * IGN(gl_FragCoord.xy);
    float w = 1.0; vec3 acc = vec3(0.0);
    for (int i = 0; i < NS; i++) {
      vec3 s = texture2D(tBright, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
      acc += min(s, vec3(24.0)) * w;
      w *= uRay.y;
      uv += d;
    }
    col += acc * (uRay.x / float(NS));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export const MB_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform mat4 uInvVP; uniform mat4 uPrevVP; uniform vec2 uRes; uniform vec2 uMB;   // strength, longest smear in pixels
varying vec2 vUv;
float IGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d = texture2D(tDepth, vUv).r;
  vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec4 pp = uPrevVP * vec4(wp.xyz, 1.0);
  vec2 vel = pp.w > 1e-4 ? (vUv - (pp.xy / pp.w * 0.5 + 0.5)) * uMB.x : vec2(0.0);
  float px = length(vel * uRes);
  if (px < 0.7) { gl_FragColor = vec4(texture2D(tColor, vUv).rgb, 1.0); return; }
  if (px > uMB.y) vel *= uMB.y / px;
  const int NS = 14;
  float j = IGN(gl_FragCoord.xy) - 0.5;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < NS; i++) {
    float f = (float(i) + 0.5 + j) / float(NS) - 0.5;
    acc += texture2D(tColor, clamp(vUv + vel * f, vec2(0.001), vec2(0.999))).rgb;
  }
  gl_FragColor = vec4(acc / float(NS), 1.0);
}`;

export function airUniforms(depth: THREE.Texture, nearFar: THREE.IUniform) {
  return {
    tDepth: { value: depth }, uNearFar: nearFar, tColor: { value: null as THREE.Texture | null }, tAO: { value: null as THREE.Texture | null },
    uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uAO: { value: 0.7 },
    uFogCol: { value: new THREE.Color(0.012, 0.018, 0.03) }, uFog: { value: new THREE.Vector3(0.0009, 1 / 160, 1.6) },
    uMoonC: { value: new THREE.Vector3() }, uBreachW: { value: new THREE.Vector3(0, 0, 1) },
    uCone: { value: new THREE.Vector4(Math.cos(0.6), Math.cos(1.05), 9, 5) },
    uCoreCol: { value: new THREE.Color(1.0, 0.62, 0.26) }, uRad: { value: new THREE.Vector2(100, 90) }, uShut: { value: 0 },
  };
}
