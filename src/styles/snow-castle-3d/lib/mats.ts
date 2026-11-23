// Snow Castle 3D · materials. Scanned PBR textures (Poly Haven, CC0) on world-scale uvs, with snow, grime and macro
// variation injected into three's standard shader; plus the hand-written window, sky, water and lamp shaders.
import * as THREE from "three";
import { rng } from "./util";

export const GLSL_NOISE = /* glsl */ `
float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h13(i + vec3(0.0, 1.0, 0.0)), h13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h13(i + vec3(0.0, 0.0, 1.0)), h13(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h13(i + vec3(0.0, 1.0, 1.0)), h13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float vn2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm3(vec3 p){
  float a = 0.5; float s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; }
  return s / 0.9375;
}
`;

/** uniforms shared by every material (one object each, so one write updates them all) */
export type Shared = ReturnType<typeof makeShared>;
export function makeShared() {
  return {
    time: { value: 0 },
    snow: { value: new THREE.Vector4(0.34, 0.62, 0.34, 0.22) }, // lo, hi, noise, wall dust
    snowT: { value: new THREE.Vector2(0.33, 0.47) },
    snowCol: { value: new THREE.Color(0.86, 0.88, 0.92) },
    wind: { value: new THREE.Vector2(0.8, 0.6) },
    amb: { value: new THREE.Color(0.12, 0.16, 0.24) },
    skyZen: { value: new THREE.Color(0.06, 0.09, 0.16) },
    skyHor: { value: new THREE.Color(0.2, 0.25, 0.34) },
    moonDir: { value: new THREE.Vector3(0.7, 0.6, -0.3).normalize() },
    moonCol: { value: new THREE.Color(0.75, 0.84, 1.0) },
    litGain: { value: 3.2 },
    /** the light clock: lamps and windows compare their own second with this (it runs behind film time, see engine) */
    lit: { value: 0 },
  };
}

export type TexSet = { map: THREE.Texture; nor: THREE.Texture; arm: THREE.Texture };
export async function loadSet(url: (m: string) => string, T: number, aniso: number): Promise<TexSet> {
  const L = new THREE.TextureLoader();
  const one = async (m: string, srgb: boolean) => {
    const t = await L.loadAsync(url(m));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.repeat.set(1 / T, 1 / T);
    return t;
  };
  const [map, nor, arm] = await Promise.all([one("diff", true), one("nor_gl", false), one("arm", false)]);
  return { map, nor, arm };
}

const VERT_PATCH = (sh: { vertexShader: string }) => {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute vec3 aCol;\nvarying vec3 vCol;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying vec2 vUvM;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCol = aCol;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * normal);\nvUvM = uv;");
};
const FRAG_HEAD = /* glsl */ `
varying vec3 vCol; varying vec3 vWPos; varying vec3 vWNrm; varying vec2 vUvM;
uniform vec4 uSnow; uniform vec3 uSnowCol; uniform vec2 uWind; uniform vec2 uSnowT;
float gSnow = 0.0;
float gBlend = 0.0;
${GLSL_NOISE}
vec4 sctex(sampler2D t, vec2 uv){ return mix(texture2D(t, uv), texture2D(t, uv * 0.71 + vec2(0.37, 0.11)), gBlend); }
`;

/** masonry / slate / timber: uv-mapped PBR + grime + snow on what faces the sky (and in bands on steep slate) */
export function archMaterial(U: Shared, tex: TexSet | null, o: { color?: number; roof?: boolean; normalScale?: number; rough?: number; metal?: number; snowRough?: number; emissive?: number; emissiveIntensity?: number; holes?: boolean; grain?: THREE.Texture } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex?.map ?? null, normalMap: tex?.nor ?? null, roughnessMap: tex?.arm ?? null, aoMap: tex?.arm ?? null,
    color: o.color ?? 0xffffff, roughness: o.rough ?? 1, metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
  });
  if (tex) m.normalScale.set(o.normalScale ?? 1, o.normalScale ?? 1);
  if (o.roof) m.defines = { ...(m.defines ?? {}), SNOW_ROOF: 1 };
  if (o.holes) m.defines = { ...(m.defines ?? {}), SC_HOLES: 1 };
  if (o.grain) m.defines = { ...(m.defines ?? {}), SC_GRAIN: 1 };
  const uGrainN = { value: o.grain ?? null };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = U.snow; sh.uniforms.uSnowCol = U.snowCol; sh.uniforms.uWind = U.wind; sh.uniforms.uSnowT = U.snowT;
    sh.uniforms.uGrainN = uGrainN;
    VERT_PATCH(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + FRAG_HEAD + "\nuniform sampler2D uGrainN;\n")
      .replace("#include <roughnessmap_fragment>", THREE.ShaderChunk.roughnessmap_fragment.replace("texture2D( roughnessMap, vRoughnessMapUv )", "sctex( roughnessMap, vRoughnessMapUv )"))
      .replace("#include <normal_fragment_maps>", THREE.ShaderChunk.normal_fragment_maps.split("texture2D( normalMap, vNormalMapUv )").join("sctex( normalMap, vNormalMapUv )") + "\n// sc-after-normal")
      .replace("#include <map_fragment>", "gBlend = smoothstep(0.36, 0.64, vn3(vWPos * 0.27 + 2.0) * 0.7 + vn3(vWPos * 0.9) * 0.3);\n" + THREE.ShaderChunk.map_fragment.replace("texture2D( map, vMapUv )", "sctex( map, vMapUv )") + /* glsl */ `
      #ifdef USE_MAP
      {
        vec3 mcol = texture2D(map, vMapUv, 6.0).rgb;
        float dk = smoothstep(18.0, 140.0, length(vViewPosition)) * 0.62;
        diffuseColor.rgb *= mix(vec3(1.0), mcol / max(sampledDiffuseColor.rgb, vec3(0.03)), dk);
        // the few pale stones of the scan come back with every tile and read as a grid from afar: pull them into the wall
        float lt = dot(sampledDiffuseColor.rgb, vec3(0.3333)) / max(dot(mcol, vec3(0.3333)), 0.02);
        diffuseColor.rgb *= mix(1.0, 1.3 / lt, smoothstep(1.3, 1.9, lt) * (1.0 - dk));
      }
      #endif
      {
        float mv = fbm3(vWPos * 0.055 + 3.0);
        float mv2 = vn3(vWPos * 0.6);
        diffuseColor.rgb *= mix(0.74, 1.16, mv) * mix(0.93, 1.07, mv2) * mix(0.86, 1.12, vCol.y);
        // warm and cold stones side by side
        diffuseColor.rgb *= mix(vec3(1.05, 1.0, 0.93), vec3(0.94, 1.0, 1.07), vn3(vWPos * 0.13 + 11.0));
        float streak = vn3(vec3(vWPos.x * 0.8, vWPos.y * 0.06, vWPos.z * 0.8) + 9.0);
        diffuseColor.rgb *= 1.0 - 0.42 * vCol.z * (0.55 + 0.45 * streak) - 0.14 * smoothstep(0.58, 0.92, streak);
        // what the rain leaves on a wall: narrow dark runs, and paler ones where the lime has washed out
        float wallK = 1.0 - smoothstep(0.3, 0.65, abs(vWNrm.y));
        float run = vn3(vec3(vWPos.x * 2.6, vWPos.y * 0.045, vWPos.z * 2.6) + 4.0);
        diffuseColor.rgb *= 1.0 - wallK * (0.24 * smoothstep(0.6, 0.9, run) - 0.12 * (1.0 - smoothstep(0.1, 0.34, run)));
        #ifdef SC_HOLES
        {
          // putlog holes left by the scaffolding of the builders, course after course
          vec2 q = vUvM / vec2(2.9, 1.9);
          q.x += 0.5 * mod(floor(q.y), 2.0);
          vec2 id = floor(q); vec2 fq = (fract(q) - 0.5) * vec2(2.9, 1.9);
          float hole = step(0.42, h12(id + 3.0)) * (1.0 - smoothstep(0.075, 0.1, abs(fq.x))) * (1.0 - smoothstep(0.095, 0.12, abs(fq.y)));
          hole *= wallK * (1.0 - smoothstep(0.35, 1.3, fwidth(vUvM.y) / 0.2));
          diffuseColor.rgb *= 1.0 - 0.88 * hole;
        }
        #endif
      }`)
      .replace("// sc-after-normal", /* glsl */ `
      {
        vec3 nW = normalize(normal * mat3(viewMatrix));
        vec3 gW = normalize(nonPerturbedNormal * mat3(viewMatrix));
        float n1 = fbm3(vWPos * 0.31);
        float n2 = vn3(vWPos * 2.3);
        float up = mix(gW.y, nW.y, 0.55);
        float s = smoothstep(uSnow.x, uSnow.y, up + (n1 - 0.5) * uSnow.z + (n2 - 0.5) * 0.12);
        vec2 gh = gW.xz / max(length(gW.xz), 1e-3);
        #ifdef SNOW_ROOF
          // a dusting that thins at the lip of every slate course, heavier on the weather side
          // frosted slate: a granular dusting sorted by the courses and the wind, the stone showing through everywhere
          float row = fract(vUvM.y / 0.38 + n2 * 0.1);
          float course = smoothstep(0.03, 0.26, row);
          float pxr = fwidth(vUvM.y) / 0.38;
          course = mix(0.7, course, 1.0 - smoothstep(0.1, 0.4, pxr));
          // bands of four courses stay readable from far away: each carries its own load, with a darker line where it starts
          float bandL = vn2(vec2(vUvM.x * 0.3, floor(vUvM.y / 1.52) * 7.31));
          float bandE = mix(1.0, smoothstep(0.0, 0.16, fract(vUvM.y / 1.52)), 1.0 - smoothstep(0.5, 2.0, pxr));
          float grit = vn3(vWPos * 9.0) * 0.5 + vn3(vWPos * 23.0) * 0.5;
          float mott = vn3(vWPos * 2.6 + 4.0) * 0.55 + vn3(vWPos * 0.9 + 9.0) * 0.45;
          float run1 = vn2(vec2(vUvM.x * 1.7, vUvM.y * 0.11) + 21.0);
          float lee = 0.5 + 0.5 * dot(gh, uWind);
          float cover = 0.5 + (lee - 0.5) * 0.36 + (gW.y - 0.35) * 0.45 + (mott - 0.5) * 0.55 + (bandL - 0.5) * 0.16 - 0.18 * smoothstep(0.62, 0.86, run1);
          float sr = smoothstep(0.34, 0.66, cover * 0.7 + grit * 0.42) * mix(0.45, 1.0, course) * mix(0.72, 1.0, bandE);
          // a pitched roof does not hold the deep snow of level ground: the dusting takes over with the pitch
          s = mix(sr * 0.74, s, smoothstep(0.8, 0.95, gW.y));
        #endif
        float dust = uSnow.w * smoothstep(0.52, 0.8, fbm3(vWPos * vec3(1.7, 0.8, 1.7) + 7.0) * 0.7 + n2 * 0.3) * smoothstep(-0.25, 0.25, nW.y + 0.1) * (0.4 + 0.6 * max(dot(gh, uWind), 0.0));
        s = clamp(max(s, dust) * vCol.x, 0.0, 1.0);
        gSnow = s;
        vec3 sc = uSnowCol * (0.9 + 0.1 * n2);
        diffuseColor.rgb = mix(diffuseColor.rgb, sc, s);
        roughnessFactor = mix(roughnessFactor, ${(o.snowRough ?? 0.78).toFixed(2)}, s);
        vec3 rip = vec3(vn3(vWPos * vec3(0.55, 0.55, 2.4) + 2.0), 0.5, vn3(vWPos * vec3(0.55, 0.55, 2.4) + 8.0)) - 0.5;
        vec3 sn = normalize(nonPerturbedNormal + (vec3(n2, vn3(vWPos * 3.1 + 5.0), vn3(vWPos * 2.9 + 11.0)) - 0.5) * 0.3 + rip * 0.42);
        normal = normalize(mix(normal, sn, s * 0.9));
        #ifdef SC_GRAIN
        {
          float vdg = length(vViewPosition);
          float nearK = 1.0 - smoothstep(20.0, 90.0, vdg);
          vec3 g1 = texture2D(uGrainN, vWPos.xz * 0.83).xyz * 2.0 - 1.0;
          vec3 g2 = texture2D(uGrainN, vWPos.xz * 0.19 + 0.4).xyz * 2.0 - 1.0;
          normal = normalize(normal + mat3(viewMatrix) * vec3(g1.x * 0.3 * nearK + g2.x * 0.3, 0.0, g1.y * 0.3 * nearK + g2.y * 0.3));
          float sp = step(0.9972, h12(floor(vWPos.xz * 150.0) + floor(vWPos.y * 150.0))) * (1.0 - smoothstep(6.0, 40.0, vdg));
          roughnessFactor = mix(roughnessFactor, 0.1, sp);
        }
        #endif
      }`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 - gSnow;")
      .replace("#include <aomap_fragment>", /* glsl */ `
      #ifdef USE_AOMAP
        float ambientOcclusion = (sctex(aoMap, vAoMapUv).r - 1.0) * aoMapIntensity + 1.0;
        ambientOcclusion = mix(ambientOcclusion, 1.0, gSnow * 0.8);
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined(USE_ENVMAP) && defined(STANDARD)
          float dotNV = saturate(dot(geometryNormal, geometryViewDir));
          reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
        #endif
      #endif`);
  };
  m.customProgramCacheKey = () => "scarch" + (o.roof ? "R" : "W") + (tex ? "T" : "N") + (o.holes ? "H" : "") + (o.grain ? "G" : "") + (o.snowRough ?? 0.78);
  return m;
}

const ROCK_FN = /* glsl */ `
float gRockAO = 1.0;
vec3 hash33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
// nearest point of a jittered grid: the cell's own random vector and the distance to the border with its neighbour
void cell3(vec3 p, out vec3 rv, out float edge){
  vec3 ip = floor(p); vec3 fp = fract(p);
  float d1 = 8.0; float d2 = 8.0; rv = vec3(0.5);
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 h = hash33(ip + g);
    vec3 d = g + h - fp;
    float dd = dot(d, d);
    if (dd < d1) { d2 = d1; d1 = dd; rv = h; } else if (dd < d2) { d2 = dd; }
  }
  edge = sqrt(d2) - sqrt(d1);
}
// ridged relief: beds a few metres thick, blocks, then grit (the fine part fades with distance)
float rockH(vec3 p, float fine){
  vec3 q = vec3(p.x, p.y * 1.4, p.z);
  float a = 1.0 - abs(vn3(q * 0.15) * 2.0 - 1.0);
  float b = 1.0 - abs(vn3(q * 0.43 + 3.1) * 2.0 - 1.0);
  float c = 1.0 - abs(vn3(q * 1.25 + 7.7) * 2.0 - 1.0);
  float d = vn3(q * 3.6 + 1.3);
  return a * a * 0.92 + b * b * 0.5 + (c * c * 0.26 + d * 0.09) * fine;
}
`;

/** rock and ground: triplanar PBR at two scales + snow by slope, a wet waterline, darker forest floor */
export function terrainMaterial(U: Shared, rock: TexSet, snowN: THREE.Texture, o: { T?: number; Tfar?: number; color?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: rock.map, normalMap: rock.nor, roughnessMap: rock.arm, color: o.color ?? 0xffffff, roughness: 1, metalness: 0 });
  m.normalScale.set(1.2, 1.2);
  const uTexM = { value: new THREE.Vector2(o.T ?? 5, o.Tfar ?? 43) };
  const uSnowN = { value: snowN };
  /** bare-rock lift, how much the big fracture facets steer the snow, speckle at the snow edge, weight of the beds */
  const uRockK = { value: new THREE.Vector4(1.3, 0.55, 0.24, 1.35) };
  (m.userData as { uRockK?: unknown }).uRockK = uRockK;
  /** less snow on steep rock, snow in the joints, how granular the dusting is, how much the bays and runnels matter */
  const uRockD = { value: new THREE.Vector4(0.1, 0.8, 0.55, 1) };
  (m.userData as { uRockD?: unknown }).uRockD = uRockD;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = U.snow; sh.uniforms.uSnowCol = U.snowCol; sh.uniforms.uWind = U.wind; sh.uniforms.uSnowT = U.snowT;
    sh.uniforms.uTexM = uTexM; sh.uniforms.uSnowN = uSnowN; sh.uniforms.uRockK = uRockK; sh.uniforms.uRockD = uRockD;
    VERT_PATCH(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + FRAG_HEAD + "\nuniform vec2 uTexM; uniform sampler2D uSnowN; uniform vec4 uRockK; uniform vec4 uRockD;\nvec3 gArm = vec3(1.0);\n" + ROCK_FN)
      .replace("#include <map_fragment>", /* glsl */ `
        vec3 gWn = normalize(vWNrm);
        vec3 bw = pow(abs(gWn), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
        float tsc = 1.0 / uTexM.x;
        vec2 tx = vWPos.zy * tsc; vec2 ty = vWPos.xz * tsc; vec2 tz = vWPos.xy * tsc;
        // two copies of the scan at unrelated scale and offset, swapped by a slow noise: no patch of rock comes back
        float tb = smoothstep(0.38, 0.62, vn3(vWPos * 0.19 + 5.0));
        vec2 tx2 = tx * 0.71 + vec2(0.37, 0.11); vec2 ty2 = ty * 0.71 + vec2(0.13, 0.57); vec2 tz2 = tz * 0.71 + vec2(0.61, 0.29);
        vec3 cN = mix(texture2D(map, tx).rgb, texture2D(map, tx2).rgb, tb) * bw.x + mix(texture2D(map, ty).rgb, texture2D(map, ty2).rgb, tb) * bw.y + mix(texture2D(map, tz).rgb, texture2D(map, tz2).rgb, tb) * bw.z;
        float tsc2 = 1.0 / uTexM.y;
        vec3 cF = texture2D(map, vWPos.zy * tsc2 + 0.37).rgb * bw.x + texture2D(map, vWPos.xz * tsc2 + 0.37).rgb * bw.y + texture2D(map, vWPos.xy * tsc2 + 0.37).rgb * bw.z;
        float vd = length(vViewPosition);
        float farK = smoothstep(40.0, 380.0, vd);
        float lumF = dot(cF, vec3(0.3333));
        vec4 sampledDiffuseColor = vec4(mix(cN * (0.45 + 0.55 * lumF / 0.16), cF, farK * 0.8), 1.0);
        diffuseColor *= sampledDiffuseColor;
        // bedding: pale and dark beds a few metres thick, tilted and wavy
        float bed = vn3(vec3(vWPos.x * 0.018, vWPos.y * 0.42 + vWPos.x * 0.035 + vn3(vWPos * 0.06) * 2.5, vWPos.z * 0.018));
        float bed2 = vn3(vec3(vWPos.x * 0.05, vWPos.y * 1.9 + vn3(vWPos * 0.21) * 1.5, vWPos.z * 0.05));
        diffuseColor.rgb *= mix(0.72, 1.22, bed) * mix(0.88, 1.1, bed2);
        gArm = mix(texture2D(roughnessMap, tx).rgb, texture2D(roughnessMap, tx2).rgb, tb) * bw.x + mix(texture2D(roughnessMap, ty).rgb, texture2D(roughnessMap, ty2).rgb, tb) * bw.y + mix(texture2D(roughnessMap, tz).rgb, texture2D(roughnessMap, tz2).rgb, tb) * bw.z;
      `)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness * gArm.g;")
      .replace("#include <normal_fragment_maps>", /* glsl */ `
      {
        vec3 nx_ = mix(texture2D(normalMap, tx).xyz, texture2D(normalMap, tx2).xyz, tb) * 2.0 - 1.0;
        vec3 ny_ = mix(texture2D(normalMap, ty).xyz, texture2D(normalMap, ty2).xyz, tb) * 2.0 - 1.0;
        vec3 nz_ = mix(texture2D(normalMap, tz).xyz, texture2D(normalMap, tz2).xyz, tb) * 2.0 - 1.0;
        float ns = normalScale.x * (1.0 - 0.6 * farK);
        nx_.xy *= ns; ny_.xy *= ns; nz_.xy *= ns;
        nx_ = vec3(nx_.xy + gWn.zy, abs(nx_.z) * gWn.x);
        ny_ = vec3(ny_.xy + gWn.xz, abs(ny_.z) * gWn.y);
        nz_ = vec3(nz_.xy + gWn.xy, abs(nz_.z) * gWn.z);
        vec3 wn = normalize(nx_.zyx * bw.x + ny_.xzy * bw.y + nz_.xyz * bw.z);
        float t1 = fbm3(vWPos * 0.043 + 1.7);
        float t2 = fbm3(vWPos * 0.47 + 5.1);
        float t0 = fbm3(vWPos * 0.0085 + 9.3);
        // crag relief: strong on slopes, a whisper on level ground
        float steep = 1.0 - smoothstep(0.62, 0.96, gWn.y);
        float fine = 1.0 - smoothstep(160.0, 520.0, vd);
        float eps = 0.06 + vd * 0.0007;
        float h0 = rockH(vWPos, fine);
        vec3 gr = vec3(rockH(vWPos + vec3(eps, 0.0, 0.0), fine) - h0, rockH(vWPos + vec3(0.0, eps, 0.0), fine) - h0, rockH(vWPos + vec3(0.0, 0.0, eps), fine) - h0) / eps;
        gr -= gWn * dot(gr, gWn);
        // fractured blocks: every cell of two jittered grids is one flat facet with its own tilt, cracks run along the borders
        vec3 rvA; float eA; cell3(vWPos * vec3(0.125, 0.19, 0.125) + 3.7, rvA, eA);
        vec3 rvB; float eB; cell3(vWPos * vec3(0.36, 0.56, 0.36) + 9.1, rvB, eB);
        float farF = 1.0 - smoothstep(500.0, 1700.0, vd);
        float bevA = smoothstep(0.0, 0.36, eA); float bevB = smoothstep(0.0, 0.32, eB);
        vec3 tilt = ((rvA - 0.5) * 1.35 * bevA + (rvB - 0.5) * 0.95 * bevB * fine) * farF;
        tilt -= gWn * dot(tilt, gWn);
        float relief = mix(0.05, 0.6, steep) * (1.0 - 0.7 * smoothstep(300.0, 1500.0, vd));
        vec3 wr = normalize(wn + tilt * mix(0.1, 1.0, steep) - gr * relief);
        float crack = ((1.0 - smoothstep(0.0, 0.1, eA)) * 0.6 * farF + (1.0 - smoothstep(0.0, 0.08, eB)) * 0.4 * fine) * steep;
        float facetTone = mix(1.0, 0.84 + 0.32 * rvA.z, steep * farF);
        gRockAO = mix(1.0, mix(0.8, 1.0, clamp(h0 / 1.3, 0.0, 1.0)), steep) * (1.0 - 0.45 * crack);
        // snow lies on what faces the sky and in the hollows; ribs and steps stay bare
        // the snow follows the beds and small ledges more than the big fracture facets, and its edge is speckled
        vec3 wrS = normalize(wn + tilt * mix(0.1, 1.0, steep) * uRockK.y - gr * relief * uRockK.w);
        float spk = vn3(vWPos * 5.3 + 2.0) * 0.6 + vn3(vWPos * 13.0 + 6.0) * 0.4;
        // three larger things steer it too: bays that hold the snow and buttresses the wind sweeps bare (20 m cells),
        // runnels down the face, and (below) the joints between the blocks
        vec3 rvC; float eC; cell3(vWPos * vec3(0.045, 0.062, 0.045) + 1.3, rvC, eC);
        float bay = (rvC.y - 0.5) * 2.0 * smoothstep(0.0, 0.25, eC);
        float gn = vn3(vec3(vWPos.x * 0.15, vWPos.y * 0.022, vWPos.z * 0.15) + 17.0);
        float gully = 1.0 - abs(gn * 2.0 - 1.0); gully = gully * gully * gully;
        float lie = wrS.y * 0.72 + gWn.y * 0.28 + (0.62 - h0 / 1.45) * 0.2 * steep + (t1 - 0.5) * 0.22 + (t2 - 0.5) * 0.2 + (spk - 0.5) * uRockK.z * steep * fine + (t0 - 0.5) * 0.3 * smoothstep(250.0, 900.0, vd);
        lie += steep * farF * (uRockD.w * (bay * 0.16 + gully * 0.2) - uRockD.x);
        {
          float farD = smoothstep(380.0, 1300.0, vd);
          if (farD > 0.0) {
            float rb1 = 1.0 - abs(vn3(vWPos * vec3(0.014, 0.03, 0.014) + 2.0) * 2.0 - 1.0);
            float rb2 = 1.0 - abs(vn3(vWPos * vec3(0.043, 0.085, 0.043) + 7.0) * 2.0 - 1.0);
            float rb3 = vn3(vWPos * vec3(0.11, 0.2, 0.11) + 13.0);
            lie -= farD * (0.5 * rb1 * rb1 + 0.26 * rb2 * rb2 + 0.14 * (rb3 - 0.5)) * (1.0 - smoothstep(0.8, 0.985, gWn.y)) * 1.25;
          }
        }
        float sT = smoothstep(uSnowT.x, uSnowT.y, lie);
        float fr = vn3(vWPos * 2.9 + 3.0) * 0.6 + vn3(vWPos * 8.3) * 0.4;
        float frost = smoothstep(uSnowT.x - 0.22, uSnowT.x + 0.02, lie + (fr - 0.5) * 0.4) * (0.26 + 0.3 * fr);
        sT = max(sT, frost);
        // on the steep rock the snow is a dusting the stone shows through, and it lies along the joints
        sT *= mix(1.0, mix(1.0, 0.4 + 0.6 * smoothstep(0.32, 0.66, spk), uRockD.z), steep * fine);
        float vein = max((1.0 - smoothstep(0.0, 0.06, eA)) * farF, (1.0 - smoothstep(0.0, 0.05, eB)) * fine * 0.8);
        sT = max(sT, vein * smoothstep(0.36, 0.6, t2 + (spk - 0.5) * 0.3) * steep * uRockD.y);
        sT *= smoothstep(0.1, 1.5, vWPos.y + (t2 - 0.5) * 0.9);
        sT *= vCol.x;
        gSnow = sT;
        vec3 sn1 = texture2D(uSnowN, vWPos.xz * 0.21).xyz * 2.0 - 1.0;
        vec3 sn2 = texture2D(uSnowN, vWPos.xz * 0.037 + 0.5).xyz * 2.0 - 1.0;
        float nearK = 1.0 - smoothstep(30.0, 300.0, vd);
        vec3 soft = normalize(mix(gWn, wr, 0.45));
        vec3 snw = normalize(vec3(soft.x + (sn1.x * 0.3 * nearK + sn2.x * 0.42), soft.y, soft.z + (sn1.y * 0.3 * nearK + sn2.y * 0.42)));
        wn = normalize(mix(wr, snw, sT));
        vec3 snowC = uSnowCol * (0.9 + 0.1 * t2) * mix(1.0, 0.6, vCol.y * (0.55 + 0.45 * t2));
        float wet = 1.0 - smoothstep(0.2, 2.6, vWPos.y);
        diffuseColor.rgb = mix(diffuseColor.rgb * uRockK.x * mix(1.0, 0.5, wet) * mix(0.9, 1.0, gRockAO) * facetTone * (1.0 - 0.4 * crack), snowC, sT);
        roughnessFactor = mix(mix(roughnessFactor, 0.35, wet * 0.7), 0.8, sT);
        normal = normalize(mat3(viewMatrix) * wn);
      }`)
      .replace("#include <aomap_fragment>", /* glsl */ `
      {
        float ambientOcclusion = mix(gArm.r * gRockAO, 1.0, gSnow * 0.85) * mix(1.0, 0.62, vCol.y);
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        reflectedLight.directDiffuse *= mix(1.0, 0.45, vCol.y);
      }`);
  };
  m.customProgramCacheKey = () => "scterrain";
  return m;
}

/** the snow on the viaduct: wind-packed grain, glints under the lanterns, and what a cart and a few walkers left in it.
 *  deckZ = world z of the deck's centre line; the path wanders round it exactly as castle.deckPath(x) does. */
export function deckSnowMaterial(U: Shared, snowN: THREE.Texture, cobble: TexSet, deckZ: number) {
  const m = new THREE.MeshStandardMaterial({ color: 0xccd6e8, roughness: 0.82, metalness: 0 });
  const uSnowN = { value: snowN }, uCob = { value: cobble.map }, uDeckZ = { value: deckZ };
  void U;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnowN = uSnowN; sh.uniforms.uCob = uCob; sh.uniforms.uDeckZ = uDeckZ;
    VERT_PATCH(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + /* glsl */ `
        varying vec3 vCol; varying vec3 vWPos; varying vec3 vWNrm; varying vec2 vUvM;
        uniform sampler2D uSnowN; uniform sampler2D uCob; uniform float uDeckZ;
        ${GLSL_NOISE}
        float gRut = 0.0; float gPrint = 0.0; float gBare = 0.0; float gSpark = 0.0; vec3 gDN = vec3(0.0, 1.0, 0.0);
        float pathC(float x){ return 0.5 * sin(x * 0.07) + 0.2 * sin(x * 0.19 + 1.0); }
        // depth of the marks in metres (never above 0); kind.x = cart ruts, kind.y = footprints
        float deckH(vec2 p, out vec2 kind){
          float v = p.y - uDeckZ - pathC(p.x);
          float wob = 0.035 * sin(p.x * 1.3) + 0.02 * sin(p.x * 3.1 + 2.0);
          float dR = min(abs(v - 0.72 - wob), abs(v + 0.72 - wob));
          // each wheel bites deep here and rides up over the crust there
          float rutK = 0.5 + 0.5 * vn2(vec2(p.x * 0.5, step(0.0, v) * 7.0 + 1.0));
          float rut = (1.0 - smoothstep(0.045, 0.13, dR)) * rutK;
          float rim = smoothstep(0.1, 0.16, dR) * (1.0 - smoothstep(0.16, 0.32, dR)) * rutK;
          float fp = 0.0; float fr = 0.0;
          for (int k = 0; k < 3; k++) {
            float fk = float(k);
            float stride = 0.38 + 0.04 * fk;
            float u = p.x / stride + fk * 0.37 + 0.35 * sin(p.x * 0.9 + fk * 2.0);
            float id = floor(u);
            float side = mod(id, 2.0) * 2.0 - 1.0;
            float lane = (k == 0 ? -0.24 : (k == 1 ? 0.2 : 1.48)) + 0.17 * sin(p.x * 0.23 + fk * 1.7) + 0.07 * sin(p.x * 0.71 + fk);
            // one walker went up to the gate, one came back: the boots point opposite ways
            float a = ((fract(u) - 0.5) * stride + (h12(vec2(id, fk + 1.0)) - 0.5) * 0.13) * (k == 1 ? -1.0 : 1.0);
            float b = v - lane - side * (0.085 + 0.035 * h12(vec2(id, fk + 3.0))) - (h12(vec2(id, fk + 7.0)) - 0.5) * 0.07;
            float e = min(length(vec2((a - 0.05) / 0.105, b / 0.056)), length(vec2((a + 0.1) / 0.052, b / 0.046)));
            float dep = step(0.07, h12(vec2(id, fk + 11.0))) * (0.55 + 0.45 * h12(vec2(id, fk + 5.0)));
            fp = max(fp, dep * (1.0 - smoothstep(0.55, 1.0, e)));
            fr = max(fr, dep * smoothstep(1.0, 1.25, e) * (1.0 - smoothstep(1.25, 1.95, e)));
          }
          fp *= 1.0 - rut;
          kind = vec2(rut, fp);
          // wind ripples across the open snow
          float ripl = vn2(vec2(dot(p, vec2(0.8, 0.6)) * 0.42, dot(p, vec2(-0.6, 0.8)) * 2.9)) - 0.5;
          return -(0.08 * rut + 0.055 * fp) + 0.02 * rim + 0.014 * fr * (1.0 - rut) + 0.03 * ripl * (1.0 - rut) * (1.0 - fp);
        }
      `)
      .replace("#include <map_fragment>", /* glsl */ `
        {
          float vd = length(vViewPosition);
          float fine = 1.0 - smoothstep(22.0, 70.0, vd);
          float mid = 1.0 - smoothstep(70.0, 160.0, vd);
          vec2 kd; vec2 kx;
          float h0 = deckH(vWPos.xz, kd);
          float e = 0.012 + vd * 0.0006;
          float hx = deckH(vWPos.xz + vec2(e, 0.0), kx);
          float hz = deckH(vWPos.xz + vec2(0.0, e), kx);
          gRut = kd.x * mid; gPrint = kd.y * fine;
          vec3 g1 = texture2D(uSnowN, vWPos.xz * 0.83).xyz * 2.0 - 1.0;
          vec3 g2 = texture2D(uSnowN, vWPos.xz * 0.17 + 0.4).xyz * 2.0 - 1.0;
          vec3 dn = vec3(-(hx - h0) / e, 0.0, -(hz - h0) / e) * mix(fine, mid, clamp(kd.x * 4.0, 0.0, 1.0));
          gDN = normalize(normalize(vWNrm) + dn * 0.9 + vec3(g1.x * 0.26 * fine + g2.x * 0.3, 0.0, g1.y * 0.26 * fine + g2.y * 0.3) * (1.0 - 0.6 * gRut));
          // the bottom of a rut is packed and glazed, not bare: darker, bluer, smoother
          gBare = gRut * smoothstep(0.5, 1.0, kd.x);
          vec3 snowC = diffuseColor.rgb * (0.93 + 0.07 * vn2(vWPos.xz * 2.1));
          snowC *= 1.0 - 0.26 * gRut - 0.3 * gPrint;
          snowC *= mix(vec3(1.0), vec3(0.88, 0.94, 1.05), gRut);
          diffuseColor.rgb = snowC;
          gSpark = step(0.9968, h12(floor(vWPos.xz * 160.0))) * (1.0 - smoothstep(5.0, 38.0, vd)) * (1.0 - gBare);
        }
      `)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = mix(mix(roughness, 0.46, gBare), 0.08, gSpark);")
      .replace("#include <normal_fragment_maps>", "normal = normalize(mat3(viewMatrix) * gDN);");
  };
  m.customProgramCacheKey = () => "scdeck";
  return m;
}

// ───────────────────────── windows ─────────────────────────
export function windowMaterial(U: Shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uAmb: U.amb, uSkyZen: U.skyZen, uSkyHor: U.skyHor, uMoonDir: U.moonDir, uMoonCol: U.moonCol, uGain: U.litGain, uLit: U.lit, uStone: { value: new THREE.Color(0.3, 0.285, 0.27) }, uTrim: { value: new THREE.Color(0.46, 0.44, 0.42) } },
    alphaToCoverage: true,
    vertexShader: /* glsl */ `
      attribute vec2 aUv; attribute vec2 aSize; attribute vec4 aInfo;
      varying vec2 vUv; varying vec2 vSize; varying vec4 vInfo; varying vec3 vWPos; varying vec3 vN;
      void main(){
        vUv = aUv; vSize = aSize; vInfo = aInfo;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWPos = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime; uniform vec3 uAmb; uniform vec3 uSkyZen; uniform vec3 uSkyHor; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform float uGain; uniform float uLit; uniform vec3 uStone; uniform vec3 uTrim;
      varying vec2 vUv; varying vec2 vSize; varying vec4 vInfo; varying vec3 vWPos; varying vec3 vN;
      ${GLSL_NOISE}
      float sdArch(vec2 p, float w, float h, float k){
        float R = k * w; float off = R - 0.5 * w; float hA = sqrt(max(R * R - off * off, 1e-5)); float ys = h - hA;
        vec2 q = vec2(abs(p.x), p.y);
        float dSide = q.x - 0.5 * w;
        float dTop = (q.y > ys) ? length(vec2(q.x + off, q.y - ys)) - R : dSide;
        return max(max(dSide, dTop), -q.y);
      }
      float sdBox(vec2 p, vec2 c, vec2 hs){ vec2 d = abs(p - c) - hs; return max(d.x, d.y); }
      float shape(vec2 p, float ty, float w, float h){
        if (ty < 0.5) return sdArch(p, w, h, 0.95);
        if (ty < 1.5) return sdArch(p, w, h, 0.8);
        if (ty < 3.5) return sdBox(p, vec2(0.0, h * 0.5), vec2(w * 0.5, h * 0.5));
        if (ty < 4.5) return length(p - vec2(0.0, h * 0.5)) - w * 0.5;
        if (ty < 5.5) return sdArch(p, w, h, 0.9);
        if (ty < 6.5) return length(p - vec2(0.0, h * 0.5)) - w * 0.5;
        if (ty < 7.5) return sdBox(p, vec2(0.0, h * 0.5), vec2(w * 0.5, h * 0.5));
        if (ty < 8.5) return sdArch(p, w, h, 0.82);
        return sdBox(p, vec2(0.0, h * 0.5), vec2(w * 0.5, h * 0.5));
      }
      // stone mullions and tracery: 1 where stone, 0 where glass
      float stone(vec2 p, float ty, float w, float h){
        float s = 0.0;
        if (ty < 0.5) { s = 0.0; }
        else if (ty < 1.5) {
          float lw = w * 0.5 - 0.11; float lh = h - w * 0.52;
          float l = min(sdArch(p - vec2(w * 0.25 + 0.01, 0.0), lw, lh, 0.95), sdArch(p + vec2(w * 0.25 + 0.01, 0.0), lw, lh, 0.95));
          float oc = length(p - vec2(0.0, h - w * 0.5)) - w * 0.16;
          s = step(0.0, min(l, oc));
        } else if (ty < 2.5) {
          s = max(step(abs(p.x), 0.065), step(abs(p.y - h * 0.63), 0.065));
        } else if (ty < 3.5) { s = 0.0; }
        else if (ty < 4.5) {
          vec2 q = p - vec2(0.0, h * 0.5); float r = length(q); float a = atan(q.y, q.x);
          float sp = abs(fract(a / 6.2831853 * 8.0) - 0.5) * 2.0 * r * 0.39;
          s = max(step(sp, 0.05) * step(w * 0.1, r), step(abs(r - w * 0.12), 0.045));
        } else if (ty < 5.5) {
          float n = w > 6.0 ? 5.0 : 3.0;
          float bar = 0.2; float lw = (w - bar * (n + 1.0)) / n;
          float hA = 0.9 * w; hA = sqrt(max(hA * hA - (hA - 0.5 * w) * (hA - 0.5 * w), 1e-4));
          float lh = h - hA * 0.92;
          float l = 1e3;
          for (float i = 0.0; i < 5.0; i += 1.0) {
            if (i >= n) break;
            float cx = -0.5 * w + bar + lw * 0.5 + i * (lw + bar);
            l = min(l, sdArch(p - vec2(cx, 0.0), lw, lh + 0.25 * lw * (1.0 - abs(cx) / (0.5 * w)), 0.95));
          }
          float c0 = length(p - vec2(0.0, lh + hA * 0.5)) - hA * 0.3;
          float c1 = length(vec2(abs(p.x) - w * 0.25, p.y - (lh + hA * 0.22))) - hA * 0.15;
          float tr = min(l, min(c0, c1));
          s = step(0.0, tr);
          s = max(s, step(abs(fract(p.y / 1.15) - 0.5), 0.022) * step(p.y, lh));
        } else if (ty < 6.5) { s = 0.0; }
        else if (ty < 7.5) { s = step(abs(p.x), 0.04); }
        else if (ty < 8.5) { s = 0.0; }
        else { s = max(step(abs(fract(p.x / 0.62) - 0.5), 0.03), step(abs(p.y - h * 0.55), 0.03)); }
        return s;
      }
      void main(){
        float ty = vInfo.x; float seed = vInfo.y; float tOn = vInfo.z; float warm = vInfo.w;
        float w = vSize.x; float h = vSize.y;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vWPos);
        vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
        vec3 Bt = cross(N, T);
        vec3 v = vec3(dot(V, T), dot(V, Bt), max(dot(V, N), 0.06));
        vec2 p0 = vUv;
        float d0 = shape(p0, ty, w, h);
        float aa = max(fwidth(d0), 1e-4);
        // dressed-stone surround (not for doors, greenhouse glass, clock dials)
        float mw = (ty > 7.5 || (ty > 5.5 && ty < 6.5)) ? 0.0 : min(0.2, 0.07 + 0.06 * w);
        float alpha = clamp(0.5 - (d0 - mw) / aa, 0.0, 1.0);
        if (alpha < 0.02) discard;
        vec3 moonL0 = uMoonCol * max(dot(N, uMoonDir), 0.0);
        if (d0 > 0.0) {
          float ch = smoothstep(0.0, 0.055, d0);
          float blk = 0.9 + 0.2 * h12(floor(vec2(p0.x * 0.0 + seed * 31.0, p0.y / 0.42)));
          vec3 sc = uTrim * blk * (uAmb * 1.15 + moonL0 * 0.7) * mix(0.5, 1.0, ch) * (0.93 + 0.14 * vn2(p0 * 11.0 + seed * 7.0));
          gl_FragColor = vec4(sc, alpha);
          return;
        }
        float D = ty > 7.5 && ty < 8.5 ? 1.5 : (ty > 4.5 && ty < 5.5 ? 0.85 : (ty > 8.5 ? 0.06 : (ty > 5.5 && ty < 6.5 ? 0.3 : 0.48)));
        vec2 shift = -v.xy / v.z * D;
        vec2 p1 = p0 + shift;
        float d1 = shape(p1, ty, w, h);
        // where the ray meets the reveal (jamb) instead of the glass
        float f = 1.0;
        if (d1 > 0.0) {
          float lo = 0.0; float hi = 1.0;
          for (int i = 0; i < 5; i++) { float mid = 0.5 * (lo + hi); if (shape(p0 + shift * mid, ty, w, h) > 0.0) hi = mid; else lo = mid; }
          f = lo;
        }
        float isLit = step(0.0, warm);
        float wm = abs(warm);
        float on = isLit * smoothstep(0.0, 0.9, uLit - tOn);
        // most rooms are lit by a candle or two, a few blaze
        if (ty < 4.5 || (ty > 6.5 && ty < 7.5)) on *= mix(0.3, 1.25, pow(h12(vec2(seed, 9.0)), 1.5));
        on *= 1.0 + 0.3 * exp(-max(uLit - tOn, 0.0) * 1.6) * sin((uLit - tOn) * 21.0);
        on *= 0.93 + 0.07 * sin(uTime * (4.0 + seed * 5.0) + seed * 50.0) * sin(uTime * 2.3 + seed * 20.0);
        vec3 warmCol = mix(vec3(1.0, 0.47, 0.13), vec3(1.0, 0.76, 0.44), wm);
        if (ty > 8.5) warmCol = vec3(0.78, 0.92, 0.42);
        vec3 moonL = uMoonCol * max(dot(N, uMoonDir), 0.0);
        vec3 col;
        if (d1 > 0.0) {
          // jamb: outside light fades with depth, the room's light grows towards the glass
          col = uStone * (uAmb * (0.8 - 0.6 * f) + moonL * 0.2 * (1.0 - f)) + warmCol * on * uGain * 0.035 * f * f;
        } else {
          vec2 g = p1;
          float st = stone(g, ty, w, h);
          // leaded quarries: each little pane tilts its own way
          vec2 dq = vec2(g.x + g.y, g.x - g.y) / 0.17;
          vec2 fq = abs(fract(dq) - 0.5);
          float px = fwidth(g.x) / 0.17;
          float lead = smoothstep(0.42, 0.47, max(fq.x, fq.y));
          lead = mix(lead, 0.2, smoothstep(0.25, 0.9, px));
          vec2 pane = floor(dq);
          float ph = h12(pane + seed * 91.0);
          vec3 Ng = normalize(N + (T * (ph - 0.5) + Bt * (h12(pane + 7.0) - 0.5)) * 0.07);
          vec3 Rr = reflect(-V, Ng);
          float Fr = 0.05 + 0.95 * pow(1.0 - max(dot(V, Ng), 0.0), 5.0);
          vec3 sky = mix(uSkyHor, uSkyZen, clamp(Rr.y * 1.4, 0.0, 1.0));
          vec3 refl = sky * Fr + uMoonCol * pow(max(dot(Rr, uMoonDir), 0.0), 260.0) * 6.0;
          vec3 glass = vec3(0.012, 0.016, 0.022) * (0.6 + 0.8 * ph) + refl * (0.36 + 0.3 * ph) + uSkyHor * 0.03;
          // the room behind
          float glow = 0.5 + 0.5 * vn2(g * vec2(1.4, 0.9) + seed * 37.0);
          glow *= 1.2 - 0.45 * clamp(g.y / h, 0.0, 1.0);
          vec2 hc = vec2((h12(vec2(seed, 1.0)) - 0.5) * w * 0.6, h * (0.22 + 0.3 * h12(vec2(seed, 2.0))));
          vec2 dh = g - hc;
          glow += 1.1 * exp(-dot(dh, dh) / (0.1 * w * w + 0.03));
          float curtain = step(0.62, h12(vec2(seed, 5.0)));
          glow *= mix(1.0, 0.35 + 0.65 * smoothstep(0.0, 0.3 * w, 0.5 * w - abs(g.x)), curtain);
          vec3 room = warmCol * glow;
          if (ty > 4.5 && ty < 5.5) {
            // stained glass of the great hall: warm field with a few deep panes
            float pc = h12(floor(vec2(g.x / 0.55, g.y / 0.8)) + seed * 13.0);
            room *= mix(vec3(1.0), mix(vec3(1.0, 0.36, 0.2), vec3(0.42, 0.62, 1.0), step(0.5, fract(pc * 7.0))), step(0.8, pc) * 0.55);
            room *= 1.25;
          }
          if (ty > 5.5 && ty < 6.5) {
            // clock face
            vec2 q = g - vec2(0.0, h * 0.5); float r = length(q) / (w * 0.5); float a = atan(q.x, q.y);
            float tick = step(abs(fract(a / 6.2831853 * 12.0 + 0.5) - 0.5), 0.045) * step(0.74, r) * step(r, 0.9);
            float ring = step(abs(r - 0.95), 0.035) + step(abs(r - 0.68), 0.012);
            float ah = 5.2; float am = 0.9 + uTime * 0.0017;
            float hh = step(abs(sin(a - ah)) * r, 0.035) * step(r, 0.45) * step(0.0, cos(a - ah));
            float mh = step(abs(sin(a - am)) * r, 0.025) * step(r, 0.72) * step(0.0, cos(a - am));
            room = vec3(1.0, 0.86, 0.62) * (0.1 + 0.05 * (1.0 - r)) * (1.0 - clamp(tick + ring + hh + mh, 0.0, 1.0) * 0.95);
            glass = vec3(0.62, 0.6, 0.54) * (uAmb * 0.55 + moonL * 0.3) * (1.0 - clamp(tick + ring + hh + mh, 0.0, 1.0) * 0.9);
            lead = 0.0; st = 0.0;
          }
          if (ty > 7.5 && ty < 8.5) {
            // open doorway: lamplit hall, brighter up where the lamp hangs, door leaves at the sides
            float ey = (g.y - h * 0.6) / (h * 0.26);
            float ex = g.x / (0.3 * w);
            room = warmCol * (0.1 + 0.42 * exp(-ey * ey - ex * ex * 0.6) + 0.2 * exp(-g.y / (0.12 * h))) * (0.7 + 0.3 * vn2(g * 0.9 + seed * 9.0));
            float leaf = smoothstep(0.26 * w, 0.3 * w, abs(g.x));
            float plank = 0.75 + 0.25 * step(0.08, abs(fract(g.x / 0.32) - 0.5));
            float bandI = step(abs(fract(g.y / (0.33 * h) + 0.2) - 0.5), 0.035);
            room = mix(room, warmCol * 0.035 * plank * (1.0 - 0.7 * bandI), leaf) * 0.5;
            lead = 0.0; st = 0.0; glass = vec3(0.004);
          }
          if (ty > 8.5) {
            float plants = smoothstep(0.35, 0.65, vn2(g * vec2(1.7, 1.2) + seed * 31.0)) * (1.0 - smoothstep(0.3, 0.95, g.y / h));
            room = warmCol * (0.5 + 0.5 * vn2(g * 0.6 + seed * 5.0)) * (1.0 - 0.8 * plants);
            lead = 0.0;
          }
          col = glass + room * on * uGain * (1.0 - 0.6 * lead);
          vec3 bar = uStone * (uAmb * 0.9 + moonL * 0.35);
          col = mix(col, bar, st);
        }
        gl_FragColor = vec4(col, alpha);
      }`,
  });
}

/** lantern glass: aCol.x = second it lights up, aCol.y = strength */
export function lampMaterial(U: Shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uGain: U.litGain, uLit: U.lit },
    vertexShader: /* glsl */ `attribute vec3 aCol; varying vec3 vCol; varying vec3 vP;
      void main(){ vCol = aCol; vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `precision highp float; uniform float uTime; uniform float uGain; uniform float uLit; varying vec3 vCol; varying vec3 vP;
      void main(){
        float t = uLit - vCol.x;
        float on = smoothstep(0.0, 0.5, t) * (1.0 + 0.5 * exp(-max(t, 0.0) * 2.5) * sin(t * 26.0));
        float fl = 0.9 + 0.1 * sin(uTime * 9.0 + vP.x * 3.1 + vP.z * 1.7) * sin(uTime * 3.7 + vP.x);
        float pane = 1.0;
        vec3 tc = vec3(1.0, 0.6, 0.24);
        if (vCol.z > 0.001) {
          // lantern glass: aCol.z carries the height above the lantern floor. The flame sits low behind the panes,
          // the glass falls off above and below it, frost has crept up from the bottom rail
          float hgt = (1.0 - vCol.z) * 7.0;
          float qh = (hgt - 0.2) / 0.12;
          float core = exp(-qh * qh);
          pane = 0.2 + 1.2 * core;
          float fr = 1.0 - smoothstep(0.045, 0.13, hgt + (sin(vP.x * 41.0) + sin(vP.z * 37.0)) * 0.012);
          pane *= 1.0 - 0.55 * fr;
          tc = mix(tc, vec3(1.0, 0.78, 0.5), core * 0.6);
        }
        gl_FragColor = vec4(tc * (0.02 + on * fl * vCol.y * uGain * 1.5 * pane), 1.0);
      }`,
  });
}

// ───────────────────────── sky ─────────────────────────
export function skyMaterial(tex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { tSky: { value: tex }, uShift: { value: 0 }, uExp: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uHorizon: { value: new THREE.Color(0.1, 0.12, 0.16) }, uCon: { value: new THREE.Vector2(0.5, 2.3) }, uDim: { value: 1 }, uWin: { value: new THREE.Vector4(-0.882, 0.309, -0.357, 0.9) }, uWinW: { value: 0.12 } },
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; vec4 mv = viewMatrix * vec4(cameraPosition + position * 1000.0, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: /* glsl */ `precision highp float; uniform sampler2D tSky; uniform float uShift; uniform float uExp; uniform vec3 uTint; uniform vec3 uHorizon; uniform vec2 uCon; uniform float uDim; uniform vec4 uWin; uniform float uWinW; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float u = atan(d.z, d.x) * 0.15915494309 + 0.5 - uShift;
        float v = asin(clamp(d.y, -1.0, 1.0)) * 0.31830988618 + 0.5;
        vec3 c = texture2D(tSky, vec2(u, max(v, 0.502))).rgb;
        c = mix(c, uHorizon / max(uExp, 1e-4) / uTint, smoothstep(0.0, 0.07, -d.y));
        c = min(c * uExp * uTint, vec3(24.0));
        // deepen the cloud bellies, keep the bright breaks: contrast around a mid grey
        float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        c *= pow(l / uCon.x, uCon.y - 1.0);
        // a grade window on the photograph: the deck is thinner and brighter behind the castle
        c *= 1.0 + uWin.w * exp(-(1.0 - dot(d, uWin.xyz)) / uWinW);
        // shoulder: the breaks in the deck glow, they do not burn out
        float l2 = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        if (l2 > 0.7) c *= (0.7 + (l2 - 0.7) / (1.0 + (l2 - 0.7) * 0.7)) / l2;
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
  });
}

// ───────────────────────── water ─────────────────────────
export function makeWaterNormal(size = 512) {
  // tileable ripple field: a sum of sines with integer wave numbers, slopes written as a normal map
  const r = rng(991);
  const waves: [number, number, number, number][] = [];
  for (let i = 0; i < 70; i++) {
    const k = 2 + Math.floor(Math.pow(r(), 1.6) * 44), a = r() * Math.PI * 2;
    const kx = Math.round(Math.cos(a) * k), ky = Math.round(Math.sin(a) * k);
    const kk = Math.hypot(kx, ky) || 1;
    waves.push([kx, ky, r() * Math.PI * 2, 1 / Math.pow(kk, 1.15)]);
  }
  const data = new Uint8Array(size * size * 4);
  let mx = 0;
  const sx = new Float32Array(size * size), sy = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dx = 0, dy = 0;
    const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
    for (const [kx, ky, ph, am] of waves) { const c = Math.cos(kx * u + ky * v + ph) * am; dx += c * kx; dy += c * ky; }
    sx[y * size + x] = dx; sy[y * size + x] = dy;
    mx = Math.max(mx, Math.abs(dx), Math.abs(dy));
  }
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round((sx[i] / mx) * 127 + 128);
    data[i * 4 + 1] = Math.round((sy[i] / mx) * 127 + 128);
    data[i * 4 + 2] = 255; data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

export function waterMaterial(U: Shared, tNrm: THREE.Texture, tHgt: THREE.Texture, rect: THREE.Vector4) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tRefl: { value: null }, uTexMat: { value: new THREE.Matrix4() }, tNrm: { value: tNrm }, tHgt: { value: tHgt }, uRect: { value: rect },
      uTime: U.time, uAmb: U.amb, uSkyHor: U.skyHor, uMoonDir: U.moonDir, uMoonCol: U.moonCol, uSnowCol: U.snowCol,
      uDeep: { value: new THREE.Color(0.012, 0.03, 0.045) }, uWave: { value: 0.085 },
    },
    vertexShader: /* glsl */ `uniform mat4 uTexMat; varying vec3 vWPos; varying vec4 vRefl;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz; vRefl = uTexMat * wp; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `precision highp float;
      uniform sampler2D tRefl; uniform sampler2D tNrm; uniform sampler2D tHgt; uniform vec4 uRect;
      uniform float uTime; uniform vec3 uAmb; uniform vec3 uSkyHor; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform vec3 uDeep; uniform vec3 uSnowCol; uniform float uWave;
      varying vec3 vWPos; varying vec4 vRefl;
      ${GLSL_NOISE}
      void main(){
        vec2 p = vWPos.xz;
        float dist = length(cameraPosition - vWPos);
        vec3 V = normalize(cameraPosition - vWPos);
        // ground height under the water (negative = depth); outside the detailed patch the lake is deep
        vec2 hu = (p - uRect.xy) * uRect.zw;
        float inside = step(0.0, hu.x) * step(hu.x, 1.0) * step(0.0, hu.y) * step(hu.y, 1.0);
        float gh = mix(-20.0, texture2D(tHgt, hu).r, inside);
        float depth = max(-gh, 0.0);
        vec2 w1 = texture2D(tNrm, p * 0.031 + uTime * vec2(0.006, 0.004)).xy * 2.0 - 1.0;
        vec2 w2 = texture2D(tNrm, p * 0.083 + uTime * vec2(-0.011, 0.007)).xy * 2.0 - 1.0;
        vec2 w3 = texture2D(tNrm, p * 0.29 + uTime * vec2(0.017, -0.021)).xy * 2.0 - 1.0;
        float gust = 0.55 + 0.9 * fbm3(vec3(p * 0.006 + uTime * 0.012, 0.0));
        float calm = smoothstep(0.3, 6.0, depth);
        vec2 sl = (w1 * 0.5 + w2 * 0.36 + w3 * 0.2 / (1.0 + dist * 0.03)) * uWave * gust * (0.25 + 0.75 * calm);
        vec3 n = normalize(vec3(sl.x, 1.0, sl.y));
        float F = 0.02 + 0.98 * pow(1.0 - max(dot(V, n), 0.0), 5.0);
        vec2 ruv = vRefl.xy / vRefl.w + sl * vec2(0.7, 1.9) * (0.35 + 6.0 / (dist + 8.0));
        vec3 refl = texture2D(tRefl, clamp(ruv, 0.001, 0.999)).rgb;
        vec3 col = uDeep * (uAmb * 6.0) * (1.0 - F) + refl * F;
        vec3 Rr = reflect(-V, n);
        col += uMoonCol * pow(max(dot(Rr, uMoonDir), 0.0), 700.0) * 14.0;
        // ice along the shore, dusted with snow and cracked
        float n1 = fbm3(vec3(p * 0.11, 3.0)); float n2 = fbm3(vec3(p * 0.9, 7.0));
        float ice = 1.0 - smoothstep(0.9, 3.4, depth + (n1 - 0.5) * 3.2);
        ice *= inside;
        if (ice > 0.001) {
          float crack = (1.0 - smoothstep(0.0, 0.02, abs(fbm3(vec3(p * 0.35, 11.0)) - 0.5))) * 0.6;
          float dustS = smoothstep(0.42, 0.62, n1 * 0.6 + n2 * 0.5);
          vec3 lightS = uAmb * 1.25 + uMoonCol * max(uMoonDir.y, 0.0) * 0.5;
          vec3 iceC = mix(vec3(0.16, 0.25, 0.3), uSnowCol, dustS) * lightS * (1.0 - crack * (1.0 - dustS));
          iceC += refl * F * 0.35 * (1.0 - dustS);
          col = mix(col, iceC, ice);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** tileable 3D value-noise volume (fbm) for the drifting mist */
export function makeNoise3D(size = 64) {
  const r = rng(321);
  const data = new Uint8Array(size * size * size);
  const octs = [4, 8, 16, 32];
  const amps = [0.5, 0.25, 0.14, 0.11];
  const lat = octs.map((p) => { const a = new Float32Array(p * p * p); for (let i = 0; i < a.length; i++) a[i] = r(); return a; });
  const sm = (t: number) => t * t * (3 - 2 * t);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0;
    for (let o = 0; o < octs.length; o++) {
      const p = octs[o], L = lat[o];
      const fx = (x / size) * p, fy = (y / size) * p, fz = (z / size) * p;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
      const tx = sm(fx - x0), ty = sm(fy - y0), tz = sm(fz - z0);
      const g = (i: number, j: number, k: number) => L[(((z0 + k) % p) * p + ((y0 + j) % p)) * p + ((x0 + i) % p)];
      const a = g(0, 0, 0) + (g(1, 0, 0) - g(0, 0, 0)) * tx, b = g(0, 1, 0) + (g(1, 1, 0) - g(0, 1, 0)) * tx;
      const c = g(0, 0, 1) + (g(1, 0, 1) - g(0, 0, 1)) * tx, d = g(0, 1, 1) + (g(1, 1, 1) - g(0, 1, 1)) * tx;
      const e = a + (b - a) * ty, f = c + (d - c) * ty;
      s += (e + (f - e) * tz) * amps[o];
    }
    data[(z * size + y) * size + x] = Math.max(0, Math.min(255, Math.round(s * 255)));
  }
  const t = new THREE.Data3DTexture(data, size, size, size);
  t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}
