// Backlit silhouette for the hall: a dark cut-out whose rim lights up from INSIDE its edge (like a real backlit body,
// not a sticker outline), with translucent hair/veil that glows when lit from behind and gold accents that glint.
// Works on channel masks (R body, G veil, B gold; see hall-tex.ts) or on plain alpha silhouettes from tex.ts.
import * as THREE from "three";
import type { Mask } from "./hall-tex";

const vert = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main(){
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uTexSize;
uniform float uMode;      // 0: channel mask (R body, G veil, B gold), 1: plain alpha silhouette
uniform vec3 uBody;       // body colour (near black)
uniform vec3 uRimCol;
uniform float uRim;       // rim intensity
uniform float uRimPx;     // rim width in screen pixels
uniform vec2 uLDir;       // where the light comes from, in texture space (y up)
uniform float uWrap;      // 0 = rim only on the lit side, 1 = all round
uniform vec3 uVeilCol;
uniform float uVeil;
uniform vec3 uGoldCol;
uniform float uGold;
uniform float uGlint;
uniform float uT;
uniform float uFadeLo;    // bottom fade (uv.y below this fades out)
uniform float uOpacity;
uniform float uSoft;      // defocus radius in screen pixels (0 = sharp)
uniform vec3 uFill;       // warm light from below (candles) on the dark body
uniform sampler2D uLit;   // optional light map (R): modelled light on the face
uniform float uLitAmt;
uniform vec3 uLitCol;
uniform float uNoRimLo;   // rim suppressed below this uv.y (where another layer overlaps)
uniform float uNoRimHi;   // rim suppressed above this uv.y
varying vec2 vUv;
#include <fog_pars_fragment>
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec3 smp(vec2 uv){
  vec4 c = texture2D(uMap, uv);
  if (uMode > 0.5) return vec3(c.a, 0.0, 0.0);
  return c.rgb;
}
void main(){
  vec2 uv = vUv;
  vec2 tpp = max(fwidth(uv) * uTexSize, vec2(0.5));      // texels per screen pixel
  // the veil sways a little (sampled with its own offset)
  vec2 sway = vec2(sin(uv.y * 9.0 + uT * 1.3) * 0.004 + sin(uv.y * 23.0 - uT * 2.1) * 0.0015, 0.0) * (1.0 - uv.y);
  vec3 c = smp(uv);
  float veil = uMode > 0.5 ? 0.0 : texture2D(uMap, uv + sway).g;
  if (uSoft > 0.5) {
    vec3 acc = c;
    float wsum = 1.0;
    for (int ring = 1; ring <= 3; ring++)
      for (int i = 0; i < 10; i++) {
        float ang = float(i) * 0.6283 + float(ring) * 0.37;
        vec2 o = vec2(cos(ang), sin(ang)) * uSoft * float(ring) / 3.0 * tpp / uTexSize;
        acc += smp(uv + o);
        wsum += 1.0;
      }
    c = acc / wsum;
    veil = c.g;
  }
  float body = c.r;
  float a = max(body, veil * 0.8);
  if (a < 0.01) discard;
  // rim: how much of the neighbourhood is outside the shape, weighted toward the light
  float rim = 0.0;
  for (int ring = 0; ring < 2; ring++) {
    float rad = uRimPx * (ring == 0 ? 0.45 : 1.0);
    float acc = 0.0;
    for (int i = 0; i < 12; i++) {
      float ang = float(i) * 0.5235988;
      vec2 o = vec2(cos(ang), sin(ang));
      float outside = 1.0 - smp(uv + o * rad * tpp / uTexSize).r;
      float w = mix(max(dot(o, uLDir), 0.0), 1.0, uWrap);
      acc += outside * w;
    }
    rim += acc / 12.0 * (ring == 0 ? 1.3 : 0.7);
  }
  rim = clamp(rim, 0.0, 1.0) * body * smoothstep(uNoRimLo, uNoRimLo + 0.06, uv.y) * (1.0 - smoothstep(uNoRimHi - 0.06, uNoRimHi, uv.y));
  // break the rim up so it never reads as an even outline
  rim *= 0.45 + 0.75 * vn(uv * vec2(14.0, 22.0) + vec2(0.0, uT * 0.15));
  vec3 col = uBody + uFill * pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.6) * body;
  col += uRimCol * uRim * rim * rim * 2.2;
  if (uLitAmt > 0.0) col += uLitCol * uLitAmt * texture2D(uLit, uv).r * body;
  // translucent hair / veil glows when lit from behind
  float thin = veil * (1.0 - body);
  col += uVeilCol * uVeil * thin;
  // gold: edge sheen + moving glints
  float gold = uMode > 0.5 ? 0.0 : c.b;
  float tw = h21(floor(uv * vec2(90.0, 120.0)) + floor(uT * 6.0));
  float glint = smoothstep(0.93, 1.0, tw) * uGlint;
  col += uGoldCol * gold * (uGold * (0.25 + rim * 2.0) + glint * 3.0);
  float fade = smoothstep(0.0, uFadeLo, uv.y);
  gl_FragColor = vec4(col, a * fade * uOpacity);
  #include <fog_fragment>
}`;

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;

export class Sil extends THREE.Group {
  mat: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
  u: Record<string, THREE.IUniform>;
  constructor(m: Mask | { map: THREE.Texture; aspect: number; lit?: THREE.Texture }, height: number, plainAlpha = false) {
    super();
    const w = height * m.aspect;
    const img = m.map.image as HTMLCanvasElement;
    this.u = {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: m.map },
      uTexSize: { value: new THREE.Vector2(img.width, img.height) },
      uMode: { value: plainAlpha ? 1 : 0 },
      uBody: { value: new THREE.Color(0x030303) },
      uRimCol: { value: new THREE.Color(0xffc27a) },
      uRim: { value: 1 },
      uRimPx: { value: 3.5 },
      uLDir: { value: new THREE.Vector2(0, 1) },
      uWrap: { value: 0.35 },
      uVeilCol: { value: new THREE.Color(0xffb060) },
      uVeil: { value: 0.3 },
      uGoldCol: { value: new THREE.Color(0xffc870) },
      uGold: { value: 0.4 },
      uGlint: { value: 0 },
      uT: { value: 0 },
      uFadeLo: { value: 0.001 },
      uOpacity: { value: 1 },
      uSoft: { value: 0 },
      uLit: { value: BLACK },
      uLitAmt: { value: 0 },
      uLitCol: { value: new THREE.Color(0xffb46a) },
      uNoRimLo: { value: -1 },
      uNoRimHi: { value: 2 },
      uFill: { value: new THREE.Color(0, 0, 0) },
    };
    if ("lit" in m && m.lit) this.u.uLit.value = m.lit;
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, transparent: true, fog: true, depthWrite: true });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, height), this.mat);
    this.mesh.position.y = height / 2;
    this.add(this.mesh);
  }
  /** turn about Y to face the camera */
  face(cam: THREE.Camera) {
    const p = new THREE.Vector3();
    this.getWorldPosition(p);
    this.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
  }
}
