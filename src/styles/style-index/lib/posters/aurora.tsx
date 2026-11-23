// 19 · Aurora — sinuous curtains of light folding and drifting over a mountain range (one full-frame shader: sky,
// twinkling stars, three domain-warped curtains with a bright green hem fading to violet, two opaque ridges, a snow
// plain catching the glow), a hiker on a rock raising both arms in the foreground, thin luminous type above.
import React from "react";
import * as THREE from "three";
import { F, PW, ease, mix, tween } from "../theme";
import { Cut, Frame, Grain, Letters, ar, type PosterProps } from "../kit";
import { ThreeLayer, type BuildArgs } from "../three";

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = /* glsl */ `
uniform float uTime; uniform float uOn; uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
const float HOR = 0.30;
vec3 skyAt(float y){ return mix(vec3(0.05, 0.10, 0.22), vec3(0.008, 0.012, 0.05), smoothstep(HOR, 1.0, y)); }
// one curtain: a folded hem (domain-warped), light rising from it in soft rays, pulsing along its length
vec3 curtain(vec2 p, float t, float k){
  float x = p.x * (5.0 + 1.5 * k) + k * 3.7;
  float w = 0.55 * sin(x * 0.6 + t * 1.6 + k) + 0.4 * fbm(vec2(x * 0.5 - t * 0.36, k * 5.0));
  float xw = x + w;
  float base = 0.56 + 0.07 * k + 0.08 * sin(xw * 0.9 + t * 1.4 + k * 2.0) + 0.06 * fbm(vec2(xw * 0.8 + t * 0.45, k));
  float d = p.y - base;
  float edge = smoothstep(-0.004, 0.014, d);
  float up = exp(-max(d, 0.0) * (4.2 + 2.6 * k));
  float rays = 0.45 + 0.55 * smoothstep(0.3, 0.8, fbm(vec2(xw * 3.0 + t * 1.8, t * 1.0 + k * 3.0)));
  float pulse = (0.78 + 0.22 * sin(xw * 4.0 - t * 4.2 + k * 5.0)) * (0.9 + 0.1 * sin(t * 2.3 + k));
  vec3 cLow = vec3(0.30, 1.0, 0.62), cMid = vec3(0.12, 0.78, 0.72), cHigh = vec3(0.66, 0.30, 0.90);
  vec3 c = mix(cLow, cMid, smoothstep(0.0, 0.07, d));
  c = mix(c, cHigh, smoothstep(0.07, 0.32, d));
  float under = exp(-max(-d, 0.0) * 40.0) * 0.16 * (1.0 - edge);
  return c * (edge * up * rays * pulse + under) * (1.25 - 0.3 * k);
}
float ridge1(float x){ return HOR + 0.05 + 0.07 * fbm(vec2(x * 3.6, 1.3)) + 0.03 * sin(x * 6.0 + 1.0); }
float ridge2(float x){ return HOR + 0.012 + 0.04 * fbm(vec2(x * 6.5 + 3.0, 2.1)); }
void main(){
  vec2 uv = vUv; float asp = uRes.x / uRes.y; float t = uTime;
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y);
  vec3 au = vec3(0.0);
  for (int k = 0; k < 3; k++) au += curtain(p, t, float(k));
  au *= uOn;
  vec3 col;
  if (uv.y >= HOR){
    col = skyAt(uv.y);
    vec2 sp = uv * vec2(asp, 1.0) * 170.0; vec2 cell = floor(sp); float h = hash(cell);
    float star = step(0.986, h) * smoothstep(0.38, 0.0, length(fract(sp) - 0.5)) * (0.55 + 0.45 * sin(t * 3.0 + h * 60.0));
    col += star * smoothstep(HOR + 0.08, 0.9, uv.y) * vec3(0.95, 0.97, 1.0);
    col += au;
    // the ridges are opaque: the far one only catches a little of the light
    float glow = dot(au, vec3(0.33));
    if (uv.y < ridge1(uv.x)) col = vec3(0.028, 0.038, 0.075) + vec3(0.04, 0.12, 0.10) * glow * 0.35;
    if (uv.y < ridge2(uv.x)) col = vec3(0.012, 0.016, 0.035);
  } else {
    // a lake: a rippled mirror of the sky, the curtains and the ridges, darker toward us
    float depth = (HOR - uv.y) / HOR;
    float rip = (0.004 + 0.01 * depth) * sin(uv.y * 260.0 / (0.3 + depth) + t * 3.0) + 0.003 * sin(uv.x * 60.0 - t * 1.7 + uv.y * 40.0);
    vec2 r = vec2(uv.x + rip, HOR + (HOR - uv.y) * 0.9);
    vec2 rp = vec2((r.x - 0.5) * asp, r.y);
    vec3 ra = vec3(0.0);
    for (int k = 0; k < 3; k++) ra += curtain(rp, t, float(k));
    vec3 rc = skyAt(r.y) + ra * uOn * 0.75;
    if (r.y < ridge1(r.x)) rc = vec3(0.028, 0.038, 0.075);
    if (r.y < ridge2(r.x)) rc = vec3(0.012, 0.016, 0.035);
    col = rc * mix(0.95, 0.3, depth);
    // reflected stars twinkle on the water
    vec2 sp2 = vec2(r.x * asp, r.y) * 170.0; float h2 = hash(floor(sp2));
    col += step(0.988, h2) * smoothstep(0.38, 0.0, length(fract(sp2) - 0.5)) * 0.35 * (0.5 + 0.5 * sin(t * 4.0 + h2 * 50.0)) * (1.0 - depth);
    col = mix(col, vec3(0.01, 0.015, 0.03), smoothstep(0.55, 1.0, depth) * 0.6);
  }
  col = 1.0 - exp(-col * 1.3);
  gl_FragColor = vec4(col, 1.0);
}`;

const build = ({ gl, scene, camera, w, h }: BuildArgs<null>) => {
  gl.setClearColor(0x000000, 1);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uRes: { value: new THREE.Vector2(w, h) } }, depthTest: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  return {
    update: (t: number) => {
      mat.uniforms.uTime.value = t + 4;
      mat.uniforms.uOn.value = mix(0.35, 1, tween(t, 0, 0.6, ease.out));
    },
    render: () => gl.render(scene, camera),
  };
};
const load = () => Promise.resolve(null);

// the hiker on his rock (AUR-01, trimmed): 380 wide at the bottom
const HW = 380, HH = HW * ar("AUR-01");

export const Aurora: React.FC<PosterProps> = ({ t }) => (
  <Frame bg="#050916">
    <ThreeLayer t={t} build={build} load={load} />
    <div style={{ position: "absolute", left: (PW - HW) / 2 + 60, top: 1290 - HH + (1 - tween(t, 0, 0.5, ease.out)) * 60, width: HW, height: HH, filter: "brightness(0)" }}>
      <Cut id="AUR-01" x={0} y={0} w={HW} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 120, width: PW, textAlign: "center", fontFamily: F.italiana, fontSize: 132, letterSpacing: "0.22em", marginLeft: "0.11em", lineHeight: 1, color: "#F2F6FF", textShadow: "0 0 24px rgba(160,210,255,0.55)" }}>
      <Letters text="AURORA" t={t} at={0.0} each={0.04} dur={0.3} letter={(u) => ({ opacity: 0.25 + 0.75 * u, filter: `blur(${(1 - u) * 8}px)`, transform: `translateY(${(1 - ease.out(u)) * 18}px)` })} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 280, width: PW, textAlign: "center", fontFamily: F.inter, fontWeight: 300, fontSize: 20, letterSpacing: "0.6em", color: "rgba(230,240,255,0.8)", opacity: tween(t, 0.2, 0.55) }}>BOREALIS · 69°N</div>
    <div style={{ position: "absolute", left: 359, top: 326, width: 2, height: 80 * tween(t, 0.4, 0.8, ease.out), background: "linear-gradient(180deg, rgba(230,240,255,0.7), rgba(230,240,255,0))" }} />
    <div style={{ position: "absolute", left: 40, top: 1100, fontFamily: F.inter, fontWeight: 400, fontSize: 16, letterSpacing: "0.3em", color: "rgba(230,240,255,0.65)", opacity: tween(t, 0.5, 0.8) }}>TROMSØ · 23:14</div>
    <div style={{ position: "absolute", right: 40, top: 1080, fontFamily: F.inter, fontWeight: 400, fontSize: 16, letterSpacing: "0.3em", color: "rgba(230,240,255,0.65)", opacity: tween(t, 0.5, 0.8) }}>KP 7</div>
    <Grain t={t} amt={0.07} />
  </Frame>
);
