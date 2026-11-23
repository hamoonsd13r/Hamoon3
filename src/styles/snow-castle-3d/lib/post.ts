// Snow Castle 3D · full-screen passes: ambient occlusion from depth, the atmosphere (height haze, drifting mist, lamp halos
// in the air), bloom, depth of field and the final film grade.
import * as THREE from "three";

export const NFL = 24; // lamps whose light scatters in the air

const VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const tri = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
})();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export class FS {
  mesh: THREE.Mesh;
  scene = new THREE.Scene();
  mat: THREE.ShaderMaterial;
  constructor(fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: Partial<THREE.ShaderMaterialParameters> = {}) {
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.mesh = new THREE.Mesh(tri, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  get u() {
    return this.mat.uniforms;
  }
  render(r: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    r.setRenderTarget(target);
    r.render(this.scene, cam);
  }
}

const DEPTH = /* glsl */ `
uniform sampler2D tDepth; uniform vec2 uNearFar;
float linZ(float d){ return uNearFar.x * uNearFar.y / (uNearFar.y - d * (uNearFar.y - uNearFar.x)); }
float IGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

// ── scalable ambient obscurance (McGuire et al.), two radii, normals rebuilt from depth
export const AO_FRAG = /* glsl */ `
precision highp float;
${DEPTH}
uniform vec2 uRes; uniform vec2 uTan; uniform float uPx; uniform vec2 uRadius; uniform float uIntensity;
varying vec2 vUv;
vec3 posAt(vec2 uv){ float z = linZ(texture2D(tDepth, uv).r); return vec3((uv * 2.0 - 1.0) * uTan * z, -z); }
float obscurance(vec3 P, vec3 N, float radius, float ang, int ns){
  float z = -P.z;
  float rPx = min(radius * uPx / z, uRes.y * 0.14);
  if (rPx < 1.5) return 1.0;
  float sum = 0.0;
  float r2 = radius * radius;
  float bias = 0.02 + 0.0015 * z;
  for (int i = 0; i < 16; i++) {
    if (i >= ns) break;
    float a = (float(i) + 0.5) / float(ns);
    float th = a * 6.2831853 * 5.0 + ang;
    vec2 off = vec2(cos(th), sin(th)) * a * rPx / uRes;
    vec3 Q = posAt(vUv + off);
    vec3 v = Q - P;
    float vv = dot(v, v); float vn = dot(v, N);
    float f = max(r2 - vv, 0.0);
    sum += f * f * f * max((vn - bias) / (vv + 0.01), 0.0);
  }
  return max(0.0, 1.0 - sum * 5.0 / (r2 * r2 * r2 * float(ns)) * uIntensity);
}
void main(){
  float d = texture2D(tDepth, vUv).r;
  if (d >= 0.999995) { gl_FragColor = vec4(1.0, 1e5, 0.0, 1.0); return; }
  vec3 P = posAt(vUv);
  vec2 px = 1.0 / uRes;
  vec3 Pr = posAt(vUv + vec2(px.x, 0.0)); vec3 Pl = posAt(vUv - vec2(px.x, 0.0));
  vec3 Pu = posAt(vUv + vec2(0.0, px.y)); vec3 Pd = posAt(vUv - vec2(0.0, px.y));
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  float ang = IGN(gl_FragCoord.xy) * 6.2831853;
  float a1 = obscurance(P, N, uRadius.x, ang, 14);
  float a2 = obscurance(P, N, uRadius.y, ang + 2.1, 14);
  float ao = a1 * mix(1.0, a2, 0.75);
  gl_FragColor = vec4(ao, -P.z, 0.0, 1.0);
}`;
export const AO_BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tAO; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec2 c = texture2D(tAO, vUv).rg;
  float sum = c.r * 0.2; float w = 0.2;
  for (int i = 1; i <= 4; i++) {
    float g = i == 1 ? 0.17 : (i == 2 ? 0.12 : (i == 3 ? 0.07 : 0.04));
    for (int s = -1; s <= 1; s += 2) {
      vec2 t = texture2D(tAO, vUv + uDir * float(i * s) * 1.5).rg;
      float ww = g * max(0.0, 1.0 - abs(t.g - c.g) / (0.02 * c.g + 0.08));
      sum += t.r * ww; w += ww;
    }
  }
  gl_FragColor = vec4(sum / w, c.g, 0.0, 1.0);
}`;

// ── atmosphere + ao composite
export const FOG_FRAG = /* glsl */ `
precision highp float; precision highp sampler3D;
${DEPTH}
uniform sampler2D tColor; uniform sampler2D tAO; uniform sampler3D tNoise;
uniform mat4 uInvVP; uniform vec3 uCam; uniform float uTime;
uniform vec3 uFogCol; uniform vec3 uFogMoon; uniform vec3 uMoonDir;
uniform vec4 uHaze;   // a1, b1, a2, b2 : density * exp(-b * y)
uniform vec4 uMist;   // density, top height, noise scale, threshold
uniform vec4 uCloud;  // density, centre height, half thickness, noise scale
uniform vec4 uL[${NFL}]; uniform vec3 uLC[${NFL}]; uniform float uGlow; uniform float uAO;
varying vec2 vUv;
float tauExp(float a, float b, float y0, float ry, float dist){
  float k = b * ry;
  float t = abs(k) > 1e-5 ? (1.0 - exp(-clamp(k * dist, -30.0, 30.0))) / k : dist;
  return a * exp(-b * max(y0, -20.0)) * t;
}
float mistAt(vec3 p){
  float hgt = uMist.y - p.y;
  if (hgt < 0.0) return 0.0;
  float prof = smoothstep(0.0, uMist.y * 0.55, hgt);
  vec3 q = p * uMist.z + vec3(uTime * 0.011, uTime * 0.002, uTime * 0.007);
  float n = texture(tNoise, q).r * 0.7 + texture(tNoise, q * 2.7 + 0.31).r * 0.3;
  return uMist.x * prof * smoothstep(uMist.w, uMist.w + 0.22, n);
}
float cloudAt(vec3 p){
  float e = (p.y - uCloud.y) / uCloud.z;
  if (abs(e) > 1.6) return 0.0;
  vec3 q = p * uCloud.w + vec3(uTime * 0.006, 0.0, uTime * 0.004);
  float n = texture(tNoise, q).r * 0.65 + texture(tNoise, q * 3.1 + 0.57).r * 0.35;
  return uCloud.x * exp(-e * e * 1.8) * smoothstep(0.5, 0.74, n);
}
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
    float ao = 0.4 + 0.6 * texture2D(tAO, vUv).r;
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= mix(1.0, ao, uAO * (1.0 - smoothstep(0.9, 3.5, lum)));
  }
  float ry = sky ? max(rd.y, 0.012) : rd.y;
  float dd = sky ? 60000.0 : dist;
  float tau = tauExp(uHaze.x, uHaze.y, uCam.y, ry, dd) + tauExp(uHaze.z, uHaze.w, uCam.y, ry, dd);
  // the sky photograph already holds its own air: only the last degrees above the horizon sink into the haze
  if (sky) tau *= 0.12;
  // drifting mist near the water and a thin layer of cloud around the towers: marched with more samples up close
  float tm = 0.0;
  float tMax = min(dd, 2200.0);
  float jit = IGN(gl_FragCoord.xy);
  const int NS = 30;
  float prev = 0.0;
  for (int i = 0; i < NS; i++) {
    float f = (float(i) + jit) / float(NS);
    float t = tMax * f * f;
    float dt = t - prev; prev = t;
    vec3 p = uCam + rd * t;
    tm += (mistAt(p) + cloudAt(p)) * dt;
  }
  tau = min(tau + tm, 40.0);
  float T = exp(-tau);
  float mu = dot(rd, uMoonDir);
  float g = 0.74;
  float hg = (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * mu, 1e-4), 1.5) * 0.25;
  vec3 fogC = uFogCol + uFogMoon * min(hg, 3.5);
  col = col * T + fogC * (1.0 - T);
  // light of the lamps and windows caught by the air (closed-form airlight integral)
  vec3 glow = vec3(0.0);
  for (int i = 0; i < ${NFL}; i++) {
    if (uL[i].w <= 0.0) continue;
    vec3 L = uL[i].xyz - uCam;
    float b = dot(L, rd);
    float h = sqrt(max(dot(L, L) - b * b, 0.0) + 0.35);
    float A = (atan((dd - b) / h) + atan(b / h)) / h;
    // the air between the lens and the lamp dims its halo
    glow += uLC[i] * (uL[i].w * A * exp(-max(b, 0.0) * 0.0035) / (1.0 + h * 0.03));
  }
  col += glow * uGlow;
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

// ── depth of field: gather on a golden-angle disc, samples weighted by their own blur
export const DOF_FRAG = /* glsl */ `
precision highp float;
${DEPTH}
uniform sampler2D tColor; uniform vec2 uRes; uniform vec3 uFocus; // distance, aperture (px at infinity), max px
varying vec2 vUv;
float coc(float z){ return clamp(uFocus.y * (1.0 - uFocus.x / z), -uFocus.z, uFocus.z); }
void main(){
  float z = linZ(texture2D(tDepth, vUv).r);
  float c0 = coc(z);
  float r0 = abs(c0);
  vec3 sum = texture2D(tColor, vUv).rgb; float w = 1.0;
  float rMax = uFocus.z;
  if (uFocus.y > 0.01) {
    float ang = IGN(gl_FragCoord.xy) * 6.2831853;
    const int NS = 48;
    for (int i = 0; i < NS; i++) {
      float f = sqrt((float(i) + 0.5) / float(NS));
      float th = float(i) * 2.39996323 + ang;
      vec2 off = vec2(cos(th), sin(th)) * f * rMax;
      vec2 uv = vUv + off / uRes;
      float zs = linZ(texture2D(tDepth, uv).r);
      float cs = abs(coc(zs));
      // a sample contributes if its blur disc reaches this pixel; background never bleeds over sharp foreground
      float reach = zs > z ? min(cs, r0) : cs;
      float ww = smoothstep(f * rMax - 1.0, f * rMax + 1.0, reach);
      sum += texture2D(tColor, uv).rgb * ww; w += ww;
    }
  }
  gl_FragColor = vec4(sum / w, 1.0);
}`;

// ── bloom: 13-tap downsample chain, tent upsample
export const BLOOM_DOWN_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPre; uniform vec2 uKnee;
varying vec2 vUv;
vec3 pre(vec3 c){
  if (uPre < 0.5) return c;
  c = min(c, vec3(64.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uKnee.x + uKnee.y, 0.0, 2.0 * uKnee.y);
  soft = soft * soft / (4.0 * uKnee.y + 1e-4);
  float k = max(soft, br - uKnee.x) / max(br, 1e-4);
  return c * (0.06 + 0.94 * k);
}
void main(){
  vec2 t = uTexel;
  vec3 a = pre(texture2D(tSrc, vUv + t * vec2(-2.0, 2.0)).rgb); vec3 b = pre(texture2D(tSrc, vUv + t * vec2(0.0, 2.0)).rgb); vec3 c = pre(texture2D(tSrc, vUv + t * vec2(2.0, 2.0)).rgb);
  vec3 d = pre(texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb); vec3 e = pre(texture2D(tSrc, vUv).rgb); vec3 f = pre(texture2D(tSrc, vUv + t * vec2(2.0, 0.0)).rgb);
  vec3 g = pre(texture2D(tSrc, vUv + t * vec2(-2.0, -2.0)).rgb); vec3 h = pre(texture2D(tSrc, vUv + t * vec2(0.0, -2.0)).rgb); vec3 i = pre(texture2D(tSrc, vUv + t * vec2(2.0, -2.0)).rgb);
  vec3 j = pre(texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb); vec3 k = pre(texture2D(tSrc, vUv + t * vec2(1.0, 1.0)).rgb);
  vec3 l = pre(texture2D(tSrc, vUv + t * vec2(-1.0, -1.0)).rgb); vec3 m = pre(texture2D(tSrc, vUv + t * vec2(1.0, -1.0)).rgb);
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(o, 1.0);
}`;
export const BLOOM_UP_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 uTexel; uniform float uMix;
varying vec2 vUv;
void main(){
  vec2 t = uTexel;
  vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
  s += (texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb + texture2D(tSrc, vUv - vec2(t.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb + texture2D(tSrc, vUv - vec2(0.0, t.y)).rgb) * 2.0;
  s += texture2D(tSrc, vUv + t).rgb + texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb + texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb;
  s /= 16.0;
  gl_FragColor = vec4(texture2D(tBase, vUv).rgb + s * uMix, 1.0);
}`;

// ── the grade: exposure, filmic curve, split tone, vignette, a breath of grain
export const FINAL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tBloom; uniform vec2 uRes;
uniform float uExposure; uniform float uBloom; uniform float uSat; uniform float uContrast; uniform float uVig; uniform float uGrain; uniform float uTime;
uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uBlack;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 I = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 O = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c = I * c; c = RRTAndODTFit(c); return clamp(O * c, 0.0, 1.0);
}
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;
  // gentle chromatic fringe towards the corners
  vec2 cc = vUv - 0.5;
  float r2 = dot(cc, cc);
  c.r = mix(c.r, texture2D(tColor, vUv - cc * 0.0016).r + texture2D(tBloom, vUv - cc * 0.0016).r * uBloom, 0.6 * smoothstep(0.05, 0.5, r2));
  c *= uExposure;
  c *= 1.0 - uVig * smoothstep(0.12, 0.62, r2 * vec3(1.0, 1.0, 1.0)).x;
  c = aces(c * 1.05);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float warmth = smoothstep(0.04, 0.3, c.r - c.b);
  c = mix(vec3(l), c, mix(uSat, 1.08, warmth));
  c = (c - 0.5) * uContrast + 0.5;
  c += uShadowTint * (1.0 - smoothstep(0.0, 0.45, l)) + uHighTint * smoothstep(0.45, 1.0, l);
  c = max(c, 0.0) * (1.0 - uBlack) + uBlack;
  c *= mix(vec3(0.885, 0.96, 1.085), vec3(1.0), warmth);
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  float gr = h12(gl_FragCoord.xy + fract(uTime * 7.13) * 311.0) - 0.5;
  c += gr * uGrain * (0.4 + 0.6 * (1.0 - l));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

/** last blit to the canvas: cross-dissolve between two graded shots, fades, letterbox-free */
export const MIX_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform float uFade; uniform vec2 uOut; uniform float uSharp;
varying vec2 vUv;
vec3 shot(vec2 uv){
  vec3 a = texture2D(tA, uv).rgb;
  vec3 b = texture2D(tB, uv).rgb;
  // dissolve in light, not in display values
  return pow(mix(pow(a, vec3(2.2)), pow(b, vec3(2.2)), uMix), vec3(1.0 / 2.2));
}
void main(){
  vec3 c = shot(vUv);
  if (uSharp > 0.0) {
    // unsharp mask at the size of the delivered picture; held back on steps that are already hard (lamps, flakes)
    vec2 px = 1.0 / uOut;
    vec3 n = shot(vUv + vec2(px.x, 0.0)) + shot(vUv - vec2(px.x, 0.0)) + shot(vUv + vec2(0.0, px.y)) + shot(vUv - vec2(0.0, px.y));
    vec3 d = c - n * 0.25;
    float m = max(abs(d.r), max(abs(d.g), abs(d.b)));
    c += d * uSharp * (1.0 - smoothstep(0.07, 0.26, m));
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0) * uFade, 1.0);
}`;

export function hdrTarget(w: number, h: number, opts: Partial<THREE.RenderTargetOptions> = {}) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false, ...opts });
}

export class Bloom {
  mips: THREE.WebGLRenderTarget[] = [];
  ups: THREE.WebGLRenderTarget[] = [];
  down: FS;
  up: FS;
  constructor(w: number, h: number, levels = 7) {
    let ww = w, hh = h;
    for (let i = 0; i < levels; i++) {
      ww = Math.max(2, Math.round(ww / 2));
      hh = Math.max(2, Math.round(hh / 2));
      this.mips.push(hdrTarget(ww, hh));
      this.ups.push(hdrTarget(ww, hh));
    }
    this.down = new FS(BLOOM_DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPre: { value: 0 }, uKnee: { value: new THREE.Vector2(0.9, 0.6) } });
    this.up = new FS(BLOOM_UP_FRAG, { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 } });
  }
  /** returns the texture holding the bloom (half resolution) */
  render(r: THREE.WebGLRenderer, src: THREE.Texture, sw: number, sh: number) {
    let tex = src, tw = sw, th = sh;
    for (let i = 0; i < this.mips.length; i++) {
      this.down.u.tSrc.value = tex;
      this.down.u.uTexel.value.set(1 / tw, 1 / th);
      this.down.u.uPre.value = i === 0 ? 1 : 0;
      this.down.render(r, this.mips[i]);
      tex = this.mips[i].texture; tw = this.mips[i].width; th = this.mips[i].height;
    }
    // walk back up, each level adds the blurred level below
    let acc = this.mips[this.mips.length - 1].texture;
    for (let i = this.mips.length - 2; i >= 0; i--) {
      const below = i === this.mips.length - 2 ? this.mips[i + 1] : this.ups[i + 1];
      this.up.u.tSrc.value = acc;
      this.up.u.tBase.value = this.mips[i].texture;
      this.up.u.uTexel.value.set(1 / below.width, 1 / below.height);
      this.up.u.uMix.value = 0.92;
      this.up.render(r, this.ups[i]);
      acc = this.ups[i].texture;
    }
    return acc;
  }
}
