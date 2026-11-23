// Hollow Moon 3D · the night sky: a real moonlit cloud deck (Poly Haven "kloppenheim_07_puresky", CC0) shown as a dome,
// graded to night, with the golden light of the open moon caught by the clouds around it. The same function is used
// by the sea for its reflections, and a low-resolution copy lights the scene (image-based lighting).
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export type SkyU = ReturnType<typeof makeSkyUniforms>;
export function makeSkyUniforms() {
  return {
    tSky: { value: null as THREE.Texture | null },
    tSkyLow: { value: null as THREE.Texture | null },
    uSkyShift: { value: 0 },
    uSkyExp: { value: 1 },
    uSkyDim: { value: 1 },
    uSkyCon: { value: new THREE.Vector2(0.05, 1.4) },
    uSkyTint: { value: new THREE.Vector3(0.78, 0.92, 1.16) },
    uGlowDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    uGlowCol: { value: new THREE.Vector3(1.0, 0.62, 0.26) },
    uGlowK: { value: new THREE.Vector3(30, 0.05, 0.004) }, // tight lobe power, its strength, strength of the wide lobe
    // lightning inside the deck: where the channel leaves the cloud (direction from the lens) and its strength now;
    // a second, far-off sheet flash
    uFlash: { value: new THREE.Vector4(0, 1, 0, 0) },
    uFlashB: { value: new THREE.Vector4(0, 1, 0, 0) },
    uFlashCol: { value: new THREE.Vector3(0.62, 0.74, 1.0) },
    uSkyHorizon: { value: new THREE.Vector3(0.012, 0.018, 0.03) },
  };
}

/** GLSL: vec3 skyAt(vec3 dir) and vec3 skyLow(vec3 dir, float lod) */
export const SKY_GLSL = /* glsl */ `
uniform sampler2D tSky; uniform sampler2D tSkyLow;
uniform float uSkyShift; uniform float uSkyExp; uniform float uSkyDim;
uniform vec2 uSkyCon; uniform vec3 uSkyTint;
uniform vec3 uGlowDir; uniform vec3 uGlowCol; uniform vec3 uGlowK;
uniform vec4 uFlash; uniform vec4 uFlashB; uniform vec3 uFlashCol; uniform vec3 uSkyHorizon;
// light of a discharge inside the deck: a hot cell around it and a wide wash; the deck is a layer, so the glow runs
// further along it than up and down
float flashLobe(vec3 d, vec3 c, float tight, float wide){
  vec3 q = d - c; q.y *= 2.3;
  float r2 = dot(q, q);
  return exp(-r2 * tight) + 0.2 * exp(-r2 * wide);
}
vec2 skyUv(vec3 d, out float el){
  el = asin(clamp(d.y, -1.0, 1.0));
  return vec2(atan(d.z, d.x) / 6.2831853 + 0.5 + uSkyShift, clamp(el / 3.14159265 + 0.5, 0.503, 0.9985));
}
vec3 skyGrade(vec3 c, vec3 d, float el){
  c *= uSkyExp;
  float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
  c *= pow(l / uSkyCon.x, uSkyCon.y - 1.0);
  c *= uSkyTint;
  c /= 1.0 + 1.25 * max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0);
  float cl = smoothstep(0.0, uSkyCon.x * 1.3, l);
  // the open moon lights the clouds around it
  float mu = max(dot(d, uGlowDir), 0.0);
  c += uGlowCol * ((pow(mu, uGlowK.x) * uGlowK.y + pow(mu, 4.0) * uGlowK.z) * (0.3 + 0.7 * cl));
  // lightning inside the deck: cloud scatters it (the thicker, the brighter, until it is too thick to let it out);
  // clear gaps stay dark
  float fl = flashLobe(d, uFlash.xyz, 150.0, 9.0) * uFlash.w + flashLobe(d, uFlashB.xyz, 110.0, 12.0) * uFlashB.w;
  if (fl > 1e-4) {
    // the light shows the build of the deck: billows that stand out from their surroundings catch it, hollows stay dim
    float e2; vec2 ub = skyUv(d, e2);
    float lb = max(dot(textureLod(tSkyLow, ub, 5.0).rgb, vec3(0.2126, 0.7152, 0.0722)) * uSkyExp, 1e-5);
    float detail = clamp(l / lb, 0.0, 2.6);
    float body = smoothstep(0.0, uSkyCon.x * 1.1, lb);
    c += uFlashCol * (fl * (0.04 + body * (0.22 + 0.62 * detail * detail)) + 0.03 * (uFlash.w + 0.4 * uFlashB.w) * (0.2 + 0.8 * cl));
  }
  float hz = exp(-max(el, 0.0) * 20.0);
  c = mix(c, uSkyHorizon, hz * 0.9);
  return c * uSkyDim;
}
vec3 skyAt(vec3 d){
  float el; vec2 uv = skyUv(d, el);
  return skyGrade(texture2D(tSky, uv).rgb, d, el);
}
vec3 skyLow(vec3 d, float lod){
  float el; vec2 uv = skyUv(d, el);
  return skyGrade(textureLod(tSkyLow, uv, lod).rgb, d, el);
}`;

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 0.0);
  gl_Position = projectionMatrix * vec4(p.xyz, 1.0);
  gl_Position.z = gl_Position.w * 0.999999;
}`;
const SKY_FS = /* glsl */ `
precision highp float;
${SKY_GLSL}
varying vec3 vDir;
void main(){ gl_FragColor = vec4(skyAt(normalize(vDir)), 1.0); }`;

export type SkyOpts = { bg: string; env: string; shift: number; mean: number; con: number; envInt: number };

export async function makeSky(r: THREE.WebGLRenderer, o: SkyOpts, log: (s: string) => void) {
  const U = makeSkyUniforms();
  const [envSrc, bg] = await Promise.all([new HDRLoader().setDataType(THREE.FloatType).loadAsync(o.env), new HDRLoader().loadAsync(o.bg)]);
  const img = envSrc.image as { data: Float32Array; width: number; height: number };
  const w = img.width, h = img.height, d = img.data;
  // cos-weighted mean of the upper half sets the exposure
  let sw = 0, sm = 0;
  for (let y = 0; y < h / 2; y += 4) {
    const wt = Math.cos((0.5 - (y + 2) / h) * Math.PI);
    for (let x = 0; x < w; x += 4) { const i = (y * w + x) * 4; sm += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * wt; sw += wt; }
  }
  const mean = sm / sw, k = o.mean / mean;
  U.uSkyExp.value = k;
  U.uSkyCon.value.set(o.mean, o.con);
  U.uSkyShift.value = o.shift;
  const tint = U.uSkyTint.value;
  // image-based light: the same grade on the 2k copy, the lower half replaced by the dark sea
  const out = new Uint16Array(w * h * 4);
  const lowT = new Uint16Array(w * h * 4);
  const amb = [0, 0, 0];
  let an = 0;
  const shift = ((Math.round(o.shift * w) % w) + w) % w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    lowT[i] = THREE.DataUtils.toHalfFloat(Math.min(d[i], 60000)); lowT[i + 1] = THREE.DataUtils.toHalfFloat(Math.min(d[i + 1], 60000)); lowT[i + 2] = THREE.DataUtils.toHalfFloat(Math.min(d[i + 2], 60000)); lowT[i + 3] = 15360;
    // panorama column x shows azimuth (u - shift): rotate so the lighting matches the dome
    const j = (y * w + ((x - shift + w) % w)) * 4;
    let rr = d[i] * k, gg = d[i + 1] * k, bb = d[i + 2] * k;
    const l = Math.max(0.2126 * rr + 0.7152 * gg + 0.0722 * bb, 1e-6);
    const c = Math.pow(l / o.mean, o.con - 1);
    rr *= c * tint.x; gg *= c * tint.y; bb *= c * tint.z;
    if (y >= h / 2) { rr = 0.004; gg = 0.007; bb = 0.011; }
    else if (y % 4 === 0 && x % 4 === 0) { amb[0] += rr; amb[1] += gg; amb[2] += bb; an++; }
    out[j] = THREE.DataUtils.toHalfFloat(rr); out[j + 1] = THREE.DataUtils.toHalfFloat(gg); out[j + 2] = THREE.DataUtils.toHalfFloat(bb); out[j + 3] = 15360;
  }
  const env = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  env.mapping = THREE.EquirectangularReflectionMapping;
  env.flipY = true;
  env.minFilter = env.magFilter = THREE.LinearFilter;
  env.colorSpace = THREE.LinearSRGBColorSpace;
  env.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(r);
  const pmrem = pm.fromEquirectangular(env).texture;
  pm.dispose();
  env.dispose();
  const low = new THREE.DataTexture(lowT, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  low.flipY = true;
  low.wrapS = THREE.RepeatWrapping;
  low.minFilter = THREE.LinearMipmapLinearFilter;
  low.magFilter = THREE.LinearFilter;
  low.generateMipmaps = true;
  low.colorSpace = THREE.LinearSRGBColorSpace;
  low.needsUpdate = true;
  bg.wrapS = THREE.RepeatWrapping;
  bg.minFilter = bg.magFilter = THREE.LinearFilter;
  bg.generateMipmaps = false;
  bg.needsUpdate = true;
  U.tSky.value = bg;
  U.tSkyLow.value = low;
  const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: U as unknown as Record<string, THREE.IUniform>, side: THREE.BackSide, depthWrite: false, depthTest: true });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  log(`sky: mean ${mean.toFixed(3)} → scale ${k.toFixed(3)}, ambient ${amb.map((v) => (v / an).toFixed(4)).join(" ")}`);
  return { U, mesh, pmrem, ambient: new THREE.Color(amb[0] / an, amb[1] / an, amb[2] / an) };
}
