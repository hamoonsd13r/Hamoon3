// Well set helpers: the dusk sun + aerial haze shared by every desert material, MeshStandardMaterial shader patches
// (haze, sky occlusion down the shaft, a hole for the shaft, wet patches, wind ripples, baked dune shadows), ropes.
import * as THREE from "three";

export const GLSL_N = /* glsl */ `
float wh21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float wn2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(wh21(i),wh21(i+vec2(1,0)),f.x), mix(wh21(i+vec2(0,1)),wh21(i+vec2(1,1)),f.x), f.y); }
float wfbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*wn2(p); p=p*2.03+vec2(17.1,9.7); a*=0.5; } return s; }
float wWet(vec2 p){ float n = wfbm(p*0.8 + 3.1) + 0.25*wn2(p*5.0); return smoothstep(0.62, 0.72, n) * (1.0 - smoothstep(-4.0, -2.0, p.y)); }
`;

/** shared uniforms: sun direction, haze density, haze on/off (only the desert shot uses it) */
export const HZ = {
  wSun: { value: new THREE.Vector3(-0.25, 0.03, -1).normalize() },
  wHazeK: { value: 0.0016 },
  wHazeOn: { value: 1 },
};

/** dusk haze colour for a view direction d; the sky shader uses the same function at the horizon */
export const GLSL_HAZE = /* glsl */ `
uniform vec3 wSun; uniform float wHazeK; uniform float wHazeOn;
vec3 wHazeCol(vec3 d){
  float s = max(dot(normalize(vec3(d.x, d.y * 0.5, d.z)), wSun), 0.0);
  vec3 base = vec3(0.06, 0.036, 0.036);
  vec3 glow = vec3(0.6, 0.23, 0.075);
  vec3 c = mix(base, glow, pow(s, 9.0));
  c += vec3(0.85, 0.26, 0.04) * pow(s, 120.0) * 0.9;
  return c;
}
vec3 wHaze(vec3 col, vec3 wp){
  vec3 v = wp - cameraPosition; float d = length(v);
  // denser near the ground
  float f = (1.0 - exp(-d * wHazeK * (0.55 + 0.45 * exp(-max(wp.y, 0.0) * 0.06)))) * wHazeOn;
  return mix(col, wHazeCol(v / d), f);
}
`;

export type Patch = {
  /** aerial perspective toward the dusk haze */
  haze?: boolean;
  /** sky occlusion down the shaft: indirect light fades from y1 (open) to y0 (none) */
  ao?: [number, number];
  /** discard inside radius r of the shaft axis, above y (the vault's opening) */
  hole?: [number, number];
  /** per-vertex baked terrain shadow (attribute "tsh") scales the sun */
  tsh?: boolean;
  /** procedural wind ripples, amplitude */
  ripple?: number;
  /** wet, glossy patches, amount */
  wet?: number;
  /** darken the albedo where world y is low (dune troughs) etc.: [y0, y1, k] */
  grade?: [number, number, number];
  /** scale the specular (dry sand has almost none) */
  spec?: number;
  /** GLSL condition on vWP: discard where true (a doorway cut through a wall) */
  cut?: string;
};

const f3 = (x: number) => x.toFixed(4);

export const patch = <M extends THREE.MeshStandardMaterial>(m: M, o: Patch): M => {
  // sharper textures at grazing angles (the shaft walls, the dunes)
  for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) t.anisotropy = 8;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, HZ);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWP;${o.tsh ? "\nattribute float tsh; varying float vTsh;" : ""}`)
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>\n{ vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWP = (modelMatrix * wp4).xyz; }${o.tsh ? "\nvTsh = tsh;" : ""}`,
      );
    let f = s.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP;${o.tsh ? " varying float vTsh;" : ""}\n${GLSL_N}\n${GLSL_HAZE}`);
    if (o.cut) f = f.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
 if (${o.cut}) discard;`);
    if (o.hole) f = f.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n if (length(vWP.xz) < ${f3(o.hole[0])} && vWP.y > ${f3(o.hole[1])}) discard;`);
    if (o.grade) f = f.replace("#include <color_fragment>", `#include <color_fragment>\n diffuseColor.rgb *= mix(${f3(o.grade[2])}, 1.0, smoothstep(${f3(o.grade[0])}, ${f3(o.grade[1])}, vWP.y));`);
    if (o.wet)
      f = f.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n{ float w = wWet(vWP.xz) * ${f3(o.wet)}; roughnessFactor = mix(roughnessFactor, 0.07, w); diffuseColor.rgb *= mix(1.0, 0.45, w); }`,
      );
    // wet patches are smooth: a calm film of water over the stone, a clean reflection instead of glitter
    if (o.wet) f = f.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n{ float w = wWet(vWP.xz) * ${f3(o.wet)}; normal = normalize(mix(normal, nonPerturbedNormal, w * 0.9)); }`);
    if (o.ripple)
      f = f.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{ vec2 q = vWP.xz; vec2 wd = normalize(vec2(0.3, 1.0));
  // fine wind ripples (~12 cm) and long low sand waves (~1.4 m), faded where they would alias
  float k1 = 52.0, k2 = 4.5;
  float ph1 = dot(q, wd) * k1 + wfbm(q * 1.3) * 10.0 + wn2(q * 0.21) * 24.0;
  float ph2 = dot(q, wd + vec2(wd.y, -wd.x) * 0.25) * k2 + wfbm(q * 0.15) * 6.0;
  float a1 = ${f3(o.ripple)} * (1.0 - smoothstep(0.7, 2.2, fwidth(ph1))) * (0.55 + 0.45 * wn2(q * 0.6 + 7.0));
  float a2 = ${f3(o.ripple)} * 5.0 * (1.0 - smoothstep(0.7, 2.2, fwidth(ph2))) * (0.35 + 0.65 * wn2(q * 0.1));
  float ph3 = dot(q, wd + vec2(-wd.y, wd.x) * 0.12) * 14.0 + wfbm(q * 0.5 + 3.0) * 8.0;
  float a3 = ${f3(o.ripple)} * 1.7 * (1.0 - smoothstep(0.7, 2.2, fwidth(ph3))) * (0.3 + 0.7 * wn2(q * 0.35 + 2.0));
  float dh = (cos(ph1) + 0.45 * cos(2.0 * ph1 + 0.6)) * a1 * k1 + (cos(ph2) + 0.3 * cos(2.0 * ph2)) * a2 * k2 + (cos(ph3) + 0.4 * cos(2.0 * ph3 + 0.3)) * a3 * 14.0;
  vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  nW = normalize(nW - vec3(wd.x * dh, 0.0, wd.y * dh));
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }`,
      );
    if (o.tsh)
      f = f.replace(
        "#include <lights_fragment_begin>",
        THREE.ShaderChunk.lights_fragment_begin.replace("getDirectionalLightInfo( directionalLight, directLight );", "getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= vTsh;"),
      );
    if (o.ao) f = f.replace("#include <aomap_fragment>", `#include <aomap_fragment>\n{ float a = smoothstep(${f3(o.ao[0])}, ${f3(o.ao[1])}, vWP.y); a *= a; reflectedLight.indirectDiffuse *= a; reflectedLight.indirectSpecular *= a; }`);
    if (o.spec !== undefined) f = f.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>\n reflectedLight.directSpecular *= ${f3(o.spec)}; reflectedLight.indirectSpecular *= ${f3(o.spec)};`);
    if (o.haze) f = f.replace("#include <fog_fragment>", "#include <fog_fragment>\n gl_FragColor.rgb = wHaze(gl_FragColor.rgb, vWP);");
    s.fragmentShader = f;
  };
  m.customProgramCacheKey = () => "well|" + JSON.stringify(o);
  return m;
};

/** a rope tube along points, rebuilt per frame; uv.x is scaled so the rope texture keeps its proportions */
export const ropeTube = (mesh: THREE.Mesh, pts: THREE.Vector3[], r: number, radial = 6) => {
  mesh.geometry.dispose();
  if (pts.length < 2) {
    mesh.geometry = new THREE.BufferGeometry();
    return;
  }
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5), Math.min(900, Math.max(8, Math.round(L / 0.03))), r, radial, false);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * L) / (r * 25));
  mesh.geometry = g;
};

/** a polyline resampled to points spaced ~ds apart, measured along the line */
export const resample = (pts: THREE.Vector3[], ds: number) => {
  const out: THREE.Vector3[] = [pts[0].clone()];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = a.distanceTo(b);
    let s = ds - carry;
    while (s <= L) {
      out.push(a.clone().lerp(b, s / L));
      s += ds;
    }
    carry = L - (s - ds);
  }
  if (out[out.length - 1].distanceTo(pts[pts.length - 1]) > ds * 0.3) out.push(pts[pts.length - 1].clone());
  return out;
};

export const sstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
