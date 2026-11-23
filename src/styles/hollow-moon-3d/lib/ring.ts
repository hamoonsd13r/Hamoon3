// Hollow Moon 3D · the great ring around the moon: a dark plated band with golden rails, wall-washers that graze its panels,
// rows of windows with rooms behind the glass, and — between its twelve junction houses — the brand's wordmark as real
// letters: light boxes with bronze returns that stand off a brushed plate and throw a halo on it. Around it all, two
// lattice orbits with beads.
import * as THREE from "three";
import { LOGO, TH } from "./brand";
import { shapes } from "./logo";
import type { WordTex } from "./text";
import { hexToLinear } from "./theme";
import { RING_AXIS, rng } from "./util";

export const RING = { R: 150, half: 5, trackHalf: 4.2, N: 12, speed: 0.028 };
/** the band's outer face stands this far outside RING.R */
const RO = 1.9;

/** shader chunk: bump a view-space normal with a height field given in metres */
export const BUMP_GLSL = /* glsl */ `
vec3 hmBump(vec3 n, vec3 vp, float h){
  vec3 sx = dFdx(vp), sy = dFdy(vp);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}
float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }`;

function bandGeometry() {
  const { R, half: H, trackHalf: T } = RING;
  const ro = RO, ri = 1.55;
  const prof: [number, number][] = [[-H, ro], [-T, ro], [-T, ri], [T, ri], [T, ro], [H, ro], [H, -ro], [T, -ro], [T, -ri], [-T, -ri], [-T, -ro], [-H, -ro]];
  const NS = 720, NP = prof.length;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], face: number[] = [], idx: number[] = [];
  for (let s = 0; s < NP; s++) {
    const [a0, r0] = prof[s], [a1, r1] = prof[(s + 1) % NP];
    const da = a1 - a0, dr = r1 - r0, l = Math.hypot(da, dr), na = -dr / l, nr = da / l;
    const base = pos.length / 3;
    for (let k = 0; k <= NS; k++) {
      const th = (k / NS) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      for (const [a, r, v] of [[a0, r0, 0], [a1, r1, 1]] as const) {
        pos.push(c * (R + r), a, sn * (R + r));
        nor.push(c * nr, na, sn * nr);
        uv.push(k / NS, v);
        face.push(s);
      }
    }
    for (let k = 0; k < NS; k++) {
      const A = base + k * 2, B = A + 1, D = A + 2, C = A + 3;
      idx.push(A, B, D, B, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aFace", new THREE.Float32BufferAttribute(face, 1));
  g.setIndex(idx);
  return g;
}

/** width of the letters themselves in metres (the field of the wordmark texture is a little wider: its padding) */
const WORD_W = 23.5;

export function bandMaterial(word: WordTex, plateARM: THREE.Texture, plateN: THREE.Texture, shared: Record<string, THREE.IUniform>, inscr: THREE.Texture | null = null, geoWord = true) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.9 });
  const arc = (2 * Math.PI * RING.R) / RING.N; // metres of one period
  const wordW = WORD_W, wordH = wordW / word.aspect, track = RING.trackHalf * 2;
  const uni = {
    tWord: { value: word.tex }, tPlateARM: { value: plateARM }, tPlateN: { value: plateN }, tInscr: { value: inscr }, uInscr: { value: inscr ? 1 : 0 },
    uRing: { value: new THREE.Vector4(RING.N, 2 * Math.PI * RING.R, track, arc) },
    uWord: { value: new THREE.Vector4(0.5 - wordW / arc / 2, 0.5 + wordW / arc / 2, 0.5 - wordH / track / 2, 0.5 + wordH / track / 2) },
    uLetter: { value: new THREE.Vector4(1.0, 0.84, 0.6, 1.5) }, uSlash: { value: new THREE.Vector4(...hexToLinear(TH.accent), 1.2) },
    uWin: { value: new THREE.Vector4(1.0, 0.7, 0.38, 1.0) }, uGold: { value: new THREE.Vector3(1.0, 0.72, 0.32) },
    // real letters stand on the outer face (1) or the word is drawn on it (0); strength of the wall-washers
    uGeoWord: { value: geoWord ? 1 : 0 }, uWash: { value: new THREE.Vector4(1.0, 0.74, 0.46, 1.0) },
    ...shared,
  };
  m.userData.uni = uni;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aFace; varying float vFace; varying vec2 vUvR; varying float vAx;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFace = aFace; vUvR = uv; vAx = position.y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", /* glsl */ `#include <common>
        ${BUMP_GLSL}
        uniform sampler2D tWord; uniform sampler2D tPlateARM; uniform sampler2D tPlateN; uniform sampler2D tInscr; uniform float uInscr;
        uniform vec4 uRing; uniform vec4 uWord; uniform vec4 uLetter; uniform vec4 uSlash; uniform vec4 uWin; uniform vec3 uGold; uniform float uTime;
        uniform float uGeoWord; uniform vec4 uWash;
        varying float vFace; varying vec2 vUvR; varying float vAx;`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          float face = floor(vFace + 0.5);
          bool outer = face == 2.0, inner = face == 8.0, side = face == 5.0 || face == 11.0;
          float arcM = vUvR.x * uRing.y;                       // metres along the ring
          vec2 duv = vec2(arcM / 5.5, (side ? vUvR.y * 3.8 : vAx) / 5.5 + face * 0.37);
          vec3 arm = texture2D(tPlateARM, duv).rgb;
          vec2 pn = texture2D(tPlateN, duv).xy * 2.0 - 1.0;
          float hgt = 0.0;
          vec3 emis = vec3(0.0);
          if (outer || inner || side) {
            diffuseColor.rgb = vec3(0.085, 0.09, 0.104) * (0.7 + 0.6 * arm.r);
            metalnessFactor = 0.85; roughnessFactor = 0.34 + 0.36 * arm.g;
          } else {
            diffuseColor.rgb = uGold * (0.82 + 0.18 * arm.r);
            metalnessFactor = 1.0; roughnessFactor = 0.2 + 0.3 * arm.g;
          }
          float per = vUvR.x * uRing.x, pid = floor(per), px = fract(per);
          float xt = outer ? 1.0 - px : px;                    // reads left to right from the side it is seen from
          float y = vUvR.y;
          if (inner) y = 1.0 - y;
          if (outer || inner) {
            float my = y * uRing.z;                            // metres across the track
            float mx = xt * uRing.w;                           // metres along this period
            float edge = step(0.048, xt) * step(xt, 0.952);
            // the frame of the surface in view space: what lies behind a pane is found by sliding along the line of sight
            vec3 dpx = dFdx(vViewPosition), dpy = dFdy(vViewPosition);
            float dux = dFdx(mx), duy = dFdy(mx), dvx = dFdx(my), dvy = dFdy(my);
            float det = dux * dvy - duy * dvx;
            float idet = abs(det) > 1e-9 ? -1.0 / det : 0.0;
            vec3 Tv = (dpx * dvy - dpy * dvx) * idet, Bv = (dpy * dux - dpx * duy) * idet;
            vec3 Vv = normalize(vViewPosition);
            vec3 vt = vec3(dot(Vv, normalize(Tv + 1e-6)), dot(Vv, normalize(Bv + 1e-6)), max(dot(Vv, normal), 0.12));
            // plating: a seam every 3.3 m with a rivet line beside it, and a shallow joint along the middle of each panel row
            float sx = fract(xt * uRing.w / 3.29 + 0.5) - 0.5;
            hgt -= 0.012 * (1.0 - smoothstep(0.0, 0.012, abs(sx)));
            float rv = fract(my / 0.31);
            hgt += 0.006 * (1.0 - smoothstep(0.0, 0.11, length(vec2((abs(sx) * 3.29 - 0.11) / 0.31, rv - 0.5)))) * edge;
            // two rows of windows in fours. Each pane sits in a raised frame; behind the glass a room half a metre deep
            {
              float rowT = step(0.36, my) * step(my, 1.06), rowB = step(uRing.z - 1.06, my) * step(my, uRing.z - 0.36);
              float rc = rowT > 0.5 ? 0.71 : uRing.z - 0.71;                 // centre line of the row
              float cw = uRing.w / 92.0;
              float cx = xt * 92.0, ci = floor(cx);
              float grp = step(mod(ci, 5.0), 3.5);
              vec2 lp = vec2((fract(cx) - 0.5) * cw, my - rc);                // metres from the centre of the pane
              vec2 hw = vec2(0.31, 0.27);
              float inRow = (rowT + rowB) * grp * edge;
              float frame = (1.0 - smoothstep(0.0, 0.02, max(abs(lp.x) - hw.x - 0.05, abs(lp.y) - hw.y - 0.05))) * inRow;
              float pane = (1.0 - smoothstep(-0.006, 0.006, max(abs(lp.x) - hw.x, abs(lp.y) - hw.y))) * inRow;
              float hs = h21(vec2(ci + (rowB > 0.5 ? 211.0 : 0.0), pid * 7.0 + (inner ? 91.0 : 3.0)));
              float lit = step(0.38, hs);
              vec3 wcol = mix(uWin.rgb, vec3(0.72, 0.84, 1.0), step(0.93, fract(hs * 3.77)));
              // the room: its back wall is larger than the pane; the reveal hides it at an angle
              vec2 li = lp - vt.xy / vt.z * 0.5;
              float back = (1.0 - smoothstep(0.0, 0.05, max(abs(li.x) - hw.x - 0.3, abs(li.y) - hw.y - 0.22)));
              float ceil1 = smoothstep(-hw.y, hw.y + 0.2, li.y);                 // light falls from the ceiling
              float furn = 0.55 + 0.45 * step(0.5, h21(vec2(floor((li.x + 2.0) * 3.3) + ci * 3.0, pid + 5.0 + rowB * 9.0))) * step(li.y, -0.02);
              float room = back * (0.35 + 0.65 * ceil1) * furn + (1.0 - back) * 0.1;
              emis += wcol * (uWin.a * pane * lit * room * (0.45 + 0.9 * fract(hs * 7.31)));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012), pane);
              roughnessFactor = mix(roughnessFactor, 0.07, pane);
              metalnessFactor = mix(metalnessFactor, 0.0, pane);
              diffuseColor.rgb = mix(diffuseColor.rgb, uGold * 0.55, frame * (1.0 - pane));
              metalnessFactor = mix(metalnessFactor, 1.0, frame * (1.0 - pane));
              roughnessFactor = mix(roughnessFactor, 0.3, frame * (1.0 - pane));
              hgt += 0.03 * frame * (1.0 - pane) - 0.04 * pane;
            }
            // a gilded fillet inside each row of windows
            float fil = (1.0 - smoothstep(0.018, 0.03, abs(my - 1.19))) + (1.0 - smoothstep(0.018, 0.03, abs(my - (uRing.z - 1.19))));
            diffuseColor.rgb = mix(diffuseColor.rgb, uGold, clamp(fil, 0.0, 1.0) * edge);
            metalnessFactor = mix(metalnessFactor, 1.0, clamp(fil, 0.0, 1.0) * edge);
            hgt += 0.02 * clamp(fil, 0.0, 1.0);
            // engraved strips (ornament and rule lines) between the windows and the name
            {
              float s1 = (my - 1.3) / 0.36, s2 = (uRing.z - 1.3 - my) / 0.36;
              float sy = s1 > 0.0 && s1 < 1.0 ? s1 : (s2 > 0.0 && s2 < 1.0 ? s2 : -1.0);
              if (sy >= 0.0 && uInscr > 0.5) {
                float e = texture2D(tInscr, vec2(xt * uRing.w / 9.6, mix(0.2, 0.8, sy))).r * edge;
                diffuseColor.rgb = mix(diffuseColor.rgb, uGold * 0.85, e);
                metalnessFactor = mix(metalnessFactor, 1.0, e);
                roughnessFactor = mix(roughnessFactor, 0.26, e);
                hgt -= 0.006 * e;
              }
            }
            // graduations along both rails
            float tk = fract(xt * 120.0);
            float tl = mod(floor(xt * 120.0), 5.0) < 0.5 ? 0.3 : 0.18;
            float tick = (1.0 - smoothstep(0.045, 0.07, abs(tk - 0.5))) * (step(my, tl) + step(uRing.z - tl, my)) * edge;
            diffuseColor.rgb = mix(diffuseColor.rgb, uGold, tick);
            metalnessFactor = mix(metalnessFactor, 1.0, tick);
            // wall-washers under both rails, one to a panel: warm light that grazes the plating and dies towards the middle
            {
              float fxm = (fract(xt * uRing.w / 3.29) - 0.5) * 3.29;
              float dt = my - 0.12, db = uRing.z - 0.12 - my;
              float wt = exp(-fxm * fxm / 1.5) * exp(-dt / 1.7) * smoothstep(0.02, 0.3, dt) + exp(-fxm * fxm / 1.5) * exp(-db / 1.7) * smoothstep(0.02, 0.3, db);
              // the grazing light picks out the relief of the plates
              float rel = 0.75 + 1.4 * (dt < db ? -pn.y : pn.y) + 0.5 * (arm.r - 0.5);
              emis += uWash.rgb * (uWash.a * 0.16 * wt * clamp(rel, 0.15, 2.2)) * edge;
            }
            // the wordmark
            vec2 wuv = vec2((xt - uWord.x) / (uWord.y - uWord.x), (y - uWord.z) / (uWord.w - uWord.z));
            if (wuv.x > 0.0 && wuv.x < 1.0 && wuv.y > 0.0 && wuv.y < 1.0) {
              vec2 sd = texture2D(tWord, wuv).rg;
              float d = max(sd.r, sd.g);
              if (outer && uGeoWord > 0.5) {
                // real letters stand off this face: behind them a brushed plate set a little into the band, with a
                // gilded line around it, and the light that spills round the backs of the letters
                vec2 q = abs(wuv - 0.5) * 2.0;
                float plate = 1.0 - smoothstep(0.93, 0.95, max(q.x, q.y * 0.86 + 0.14 * q.x));
                float rim = (1.0 - smoothstep(0.0, 0.012, abs(max(q.x, q.y * 0.86 + 0.14 * q.x) - 0.94)));
                float brush = h21(vec2(floor(my * 420.0), 7.0)) - 0.5;
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.052, 0.058) * (1.0 + 0.25 * brush), plate);
                roughnessFactor = mix(roughnessFactor, 0.3 + 0.12 * brush, plate);
                metalnessFactor = mix(metalnessFactor, 0.95, plate);
                hgt -= 0.035 * plate + 0.0012 * brush * plate;
                diffuseColor.rgb = mix(diffuseColor.rgb, uGold, rim);
                metalnessFactor = mix(metalnessFactor, 1.0, rim);
                float halo = exp(min(sd.r, 0.0) * 3.4) * (1.0 - 0.75 * smoothstep(-0.02, 0.12, sd.r));
                float haloS = exp(min(sd.g, 0.0) * 5.0) * (1.0 - 0.75 * smoothstep(-0.02, 0.12, sd.g));
                emis += (uLetter.rgb * (0.34 * halo) + uSlash.rgb * (0.22 * haloS)) * (0.8 + 0.4 * brush) * plate;
              } else {
                // drawn letters (the inner face): back-lit, in a recessed field with a gilded bezel
                float aa = max(fwidth(d) * 0.75, 1e-4);
                float inL = smoothstep(-aa, aa, sd.r), inS = smoothstep(-aa, aa, sd.g), inAny = max(inL, inS);
                float bez = smoothstep(-0.2, -0.1, d) * (1.0 - inAny);
                hgt += 0.07 * smoothstep(-0.22, -0.07, d) - 0.11 * inAny;
                diffuseColor.rgb = mix(diffuseColor.rgb, uGold, bez);
                metalnessFactor = mix(metalnessFactor, 1.0, bez);
                roughnessFactor = mix(roughnessFactor, 0.2, bez);
                float core = smoothstep(0.0, 0.34, sd.r);
                float flick = 0.94 + 0.06 * sin(uTime * 2.3 + pid * 1.7);
                emis += uLetter.rgb * (uLetter.a * inL * (0.5 + 0.5 * core) * flick);
                emis += uSlash.rgb * (uSlash.a * inS * (0.55 + 0.45 * smoothstep(0.0, 0.3, sd.g)));
                emis += uLetter.rgb * (0.16 * exp(min(sd.r, 0.0) * 9.0) * (1.0 - inAny));
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), inAny);
              }
            }
          } else if (side) {
            // flanks: a line of small lights
            float cx = px * 46.0, ci = floor(cx);
            vec2 q = vec2(fract(cx) - 0.5, (y - 0.5) * 3.8 / (uRing.w / 46.0));
            float dot1 = 1.0 - smoothstep(0.1, 0.14, length(q));
            float lit = step(0.55, h21(vec2(ci, pid + face)));
            emis += uWin.rgb * (uWin.a * 0.9 * dot1 * lit);
          }
          hgt += 0.004 * (pn.x + pn.y);
          normal = hmBump(normal, -vViewPosition, hgt);
          totalEmissiveRadiance += emis;
        }`);
  };
  return m;
}

/** the wordmark as real letters, bent to the outer face of the band and repeated in every period:
 *  aW = (u, v in the wordmark texture, how much the face looks outwards) */
function wordGeometry(d: string, word: WordTex, depth: number, gap: number) {
  const L = LOGO.main, sc = (WORD_W * (1 - (2 * word.pad) / word.w)) / (L.x1 - L.x0), cy = (L.y0 + L.y1) / 2, CX = (L.x0 + L.x1) / 2;
  const bevT = 0.07;
  const g0 = new THREE.ExtrudeGeometry(shapes(d, sc, cy), { depth, bevelEnabled: true, bevelThickness: bevT, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
  const p0 = g0.getAttribute("position"), n0 = g0.getAttribute("normal"), n = p0.count, NP = RING.N;
  const pos = new Float32Array(n * 3 * NP), nor = new Float32Array(n * 3 * NP), aw = new Float32Array(n * 3 * NP);
  const Rr = RING.R + RO + gap + bevT;
  for (let k = 0; k < NP; k++) {
    const thc = ((k + 0.5) / NP) * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const x = p0.getX(i), y = p0.getY(i), z = p0.getZ(i), o = (k * n + i) * 3;
      const th = thc - x / Rr, r = Rr + z, c = Math.cos(th), s = Math.sin(th);
      pos[o] = c * r; pos[o + 1] = y; pos[o + 2] = s * r;
      const nx = n0.getX(i), ny = n0.getY(i), nz = n0.getZ(i);
      nor[o] = nx * s + nz * c; nor[o + 1] = ny; nor[o + 2] = -nx * c + nz * s;
      const xl = CX + x / sc, yl = cy - y / sc;
      aw[o] = (word.pad + (xl - L.x0) * word.scale) / word.w; aw[o + 1] = 1 - (word.pad + (yl - L.y0) * word.scale) / word.h; aw[o + 2] = nz;
    }
  }
  g0.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("aW", new THREE.BufferAttribute(aw, 3));
  return g;
}

/** a letter: the face is a light box of opal glass (a little darker towards its rim), the returns are bronze */
function letterMaterial(word: WordTex, col: [number, number, number, number], ch: "r" | "g", body: THREE.Color, key: string) {
  const m = new THREE.MeshStandardMaterial({ color: body, metalness: 1, roughness: 0.32 });
  const uni = { tWord: { value: word.tex }, uFaceCol: { value: new THREE.Vector4(...col) } };
  m.userData.uni = uni;
  m.customProgramCacheKey = () => key;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aW; varying vec3 vWd;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWd = aW;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D tWord; uniform vec4 uFaceCol; varying vec3 vWd;")
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          float front = smoothstep(0.6, 0.92, vWd.z);
          float sd = texture2D(tWord, vWd.xy).${ch};
          float core = smoothstep(0.0, 0.3, sd);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.55), front);
          metalnessFactor = mix(1.0, 0.0, front);
          roughnessFactor = mix(0.3, 0.36, front);
          totalEmissiveRadiance += uFaceCol.rgb * (uFaceCol.a * front * (0.58 + 0.42 * core));
        }`);
  };
  return m;
}

export type RingRig = { group: THREE.Group; update: (t: number) => void; axis: THREE.Vector3 };

export function buildRing(word: WordTex, plateARM: THREE.Texture, plateN: THREE.Texture, shared: Record<string, THREE.IUniform>, P: (n: string, d: number) => number, opts: { phase: number; inscr?: THREE.Texture }): RingRig {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  group.add(tilt);
  tilt.add(spin);
  // the plane of the ring leans towards the lens of the opening shot: its near side dips below the moon
  const axis = new THREE.Vector3(...RING_AXIS);
  tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);

  const geoWord = P("geoword", 1) > 0.5;
  const bm = bandMaterial(word, plateARM, plateN, shared, opts.inscr ?? null, geoWord);
  (bm.userData.uni.uWash.value as THREE.Vector4).w = P("wash", 1.7);
  (bm.userData.uni.uWin.value as THREE.Vector4).w = P("ringwin", 1);
  const band = new THREE.Mesh(bandGeometry(), bm);
  band.castShadow = true; band.receiveShadow = true;
  band.layers.enable(1);
  spin.add(band);

  // ── the name: letters that stand off the band, their faces alight
  if (geoWord) {
    const k = P("letter", 0.95);
    const letters = new THREE.Mesh(wordGeometry(LOGO.paths.main, word, 0.34, 0.12), letterMaterial(word, [1.0, 0.86, 0.66, k], "r", new THREE.Color(0.62, 0.42, 0.18), "hm-ringword-l"));
    const acc = hexToLinear(TH.accent);
    const slash = LOGO.paths.accent ? new THREE.Mesh(wordGeometry(LOGO.paths.accent, word, 0.42, 0.12), letterMaterial(word, [acc[0] * 0.82, acc[1] * 0.82, acc[2] * 0.82, k * 0.85], "g", new THREE.Color(acc[0] * 0.36, acc[1] * 0.36, acc[2] * 0.36), "hm-ringword-s")) : null;
    for (const m of slash ? [letters, slash] : [letters]) { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; m.layers.enable(1); spin.add(m); }
  }

  // ── junction houses, masts and lamps
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.04, 0.043, 0.05), metalness: 0.85, roughness: 0.42 });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.72, 0.32), metalness: 1, roughness: 0.3 });
  const bronze = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.33, 0.21, 0.09), metalness: 1, roughness: 0.42 });
  const rail = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.66, 0.28), metalness: 1, roughness: 0.2 });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 3.5, 1.9) });
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(22, 17, 10) });
  const redM = new THREE.MeshBasicMaterial({ color: new THREE.Color(16, 1.2, 0.8) });
  const parts: { geo: THREE.BufferGeometry; mat: THREE.Material; at: THREE.Matrix4[]; shadow: boolean }[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => { const p = { geo, mat, at: [] as THREE.Matrix4[], shadow }; parts.push(p); return p; };
  const body = add(new THREE.BoxGeometry(7.4, 13.4, 5.6), dark);
  const bandG = add(new THREE.BoxGeometry(7.75, 0.55, 5.95), gold);
  const capG = add(new THREE.BoxGeometry(6.2, 0.45, 4.6), gold);
  const winG = add(new THREE.BoxGeometry(0.85, 0.85, 0.08), warm, false);
  const mast = add(new THREE.CylinderGeometry(0.1, 0.2, 12, 8), dark);
  const lamp = add(new THREE.SphereGeometry(0.42, 16, 10), lampM, false);
  const beacon = add(new THREE.SphereGeometry(0.34, 12, 8), redM, false);
  // the washers themselves: a small hooded fitting under each rail at every seam
  const hood = add(new THREE.BoxGeometry(0.5, 0.1, 0.22), dark, false);
  const q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1);
  const rand = rng(91310);
  for (let k = 0; k < RING.N; k++) {
    const th = (k / RING.N) * Math.PI * 2;
    // local frame of the house: x = along the ring, y = the ring's axis, z = outwards
    const er = new THREE.Vector3(Math.cos(th), 0, Math.sin(th)), et = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)), ey = new THREE.Vector3(0, 1, 0);
    const basis = new THREE.Matrix4().makeBasis(et, ey, er);
    q.setFromRotationMatrix(basis);
    const at = (x: number, y: number, z: number) => new THREE.Matrix4().compose(er.clone().multiplyScalar(RING.R + z).addScaledVector(et, x).addScaledVector(ey, y), q, s1);
    body.at.push(at(0, 0, 0));
    for (const y of [-4.6, 4.6]) bandG.at.push(at(0, y, 0));
    for (const y of [-6.9, 6.9]) capG.at.push(at(0, y, 0));
    for (const z of [2.82, -2.82]) for (const x of [-1.7, 0, 1.7]) for (const y of [-2.4, -0.8, 0.8, 2.4]) if (rand() < 0.62) winG.at.push(at(x, y, z));
    for (const sg of [1, -1]) {
      mast.at.push(new THREE.Matrix4().compose(er.clone().multiplyScalar(RING.R).addScaledVector(ey, sg * 13), sg > 0 ? q : q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)), s1));
      (k % 3 === 0 && sg > 0 ? beacon : lamp).at.push(at(0, sg * 19.3, 0));
    }
  }
  {
    const nSeam = Math.round((2 * Math.PI * RING.R) / 3.29);
    for (let k = 0; k < nSeam; k++) {
      const th = ((k + 0.5) / nSeam) * Math.PI * 2;
      const er = new THREE.Vector3(Math.cos(th), 0, Math.sin(th)), et = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
      for (const sg of [1, -1]) hood.at.push(new THREE.Matrix4().makeBasis(et, new THREE.Vector3(0, 1, 0), er).setPosition(er.clone().multiplyScalar(RING.R + RO + 0.11).add(new THREE.Vector3(0, sg * (RING.trackHalf - 0.06), 0))));
    }
  }
  for (const p of parts) {
    const im = new THREE.InstancedMesh(p.geo, p.mat, p.at.length);
    p.at.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = p.shadow; im.receiveShadow = p.shadow;
    im.frustumCulled = false;
    im.layers.enable(1);
    spin.add(im);
  }

  // ── ribs on the outer face between the names, handrails on stanchions along both edges
  {
    const arc = (2 * Math.PI * RING.R) / RING.N, wordHalf = 14.2;
    const ribG = new THREE.BoxGeometry(0.2, RING.trackHalf * 2 + 0.3, 0.34);
    const ribs: THREE.Matrix4[] = [];
    const nSeam = Math.round((2 * Math.PI * RING.R) / 3.29);
    for (let k = 0; k < nSeam; k++) {
      const th = (k / nSeam) * Math.PI * 2;
      // distance along the ring from the middle of its period, where the name sits
      const u = (((th / (2 * Math.PI)) * RING.N) % 1 + 1) % 1;
      if (Math.abs(u - 0.5) * arc < wordHalf || u * arc < 4.4 || (1 - u) * arc < 4.4) continue;
      const er = new THREE.Vector3(Math.cos(th), 0, Math.sin(th)), et = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
      ribs.push(new THREE.Matrix4().makeBasis(et, new THREE.Vector3(0, 1, 0), er).setPosition(er.clone().multiplyScalar(RING.R + RO + 0.12)));
    }
    const ribM = new THREE.InstancedMesh(ribG, dark, ribs.length);
    ribs.forEach((m, i) => ribM.setMatrixAt(i, m));
    ribM.castShadow = true; ribM.receiveShadow = true; ribM.frustumCulled = false; ribM.layers.enable(1);
    spin.add(ribM);
    const postG = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6);
    const posts: THREE.Matrix4[] = [];
    const nPost = 420;
    for (const sg of [1, -1]) {
      for (const off of [1.75, -1.35]) {
        for (const up of [0.9, 0.5]) {
          const rl = new THREE.Mesh(new THREE.TorusGeometry(RING.R + off, up > 0.8 ? 0.045 : 0.022, 6, 720), rail);
          rl.rotation.x = Math.PI / 2;
          rl.position.y = sg * (RING.half + up);
          rl.layers.enable(1);
          spin.add(rl);
        }
        for (let k = 0; k < nPost; k++) {
          const th = (k / nPost) * Math.PI * 2;
          posts.push(new THREE.Matrix4().makeTranslation(Math.cos(th) * (RING.R + off), sg * (RING.half + 0.45), Math.sin(th) * (RING.R + off)));
        }
      }
    }
    const postM = new THREE.InstancedMesh(postG, rail, posts.length);
    posts.forEach((m, i) => postM.setMatrixAt(i, m));
    postM.frustumCulled = false; postM.layers.enable(1);
    spin.add(postM);
  }

  // ── two lattice orbits: three chords laced together (a truss, not a wire), marker lamps, gilded beads that ride them
  const orbits: { g: THREE.Group; w: number }[] = [];
  // (the larger an orbit, the flatter it lies: none may dip into the sea under the low moon)
  const defs: [number, number, number, number, number][] = [[176, 0.8, -0.52, 0.3, -0.012], [226, 0.24, 0.8, 0.55, -0.006]];
  for (const [rad, ax, ay, az, w] of defs) {
    const og = new THREE.Group(), os = new THREE.Group();
    og.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ax, ay, az).normalize());
    og.add(os);
    // chords: two in the plane of the orbit, one below them
    const chord: [number, number][] = [[-1.5, 0], [1.5, 0], [0, -2.1]];
    for (const [off, yy] of chord) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(rad + off, 0.13, 8, 640), rail);
      tor.rotation.x = Math.PI / 2;
      tor.position.y = yy;
      tor.castShadow = true;
      tor.layers.enable(1);
      os.add(tor);
    }
    // lacing: in every bay a strut across the top, two down to the lower chord, and a diagonal to the next bay
    {
      const bays = Math.round((2 * Math.PI * rad) / 2.9);
      const unit = new THREE.CylinderGeometry(0.045, 0.045, 1, 5);
      const M: THREE.Matrix4[] = [];
      const yAx = new THREE.Vector3(0, 1, 0);
      const pt = (i: number, c: number) => { const a = (i / bays) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * (rad + chord[c][0]), chord[c][1], Math.sin(a) * (rad + chord[c][0])); };
      const strut = (a: THREE.Vector3, b: THREE.Vector3) => { const d = b.clone().sub(a), l = d.length(); M.push(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(yAx, d.normalize()), new THREE.Vector3(1, l, 1))); };
      for (let i = 0; i < bays; i++) {
        strut(pt(i, 0), pt(i, 1));
        strut(pt(i, 0), pt(i + 0.5, 2)); strut(pt(i, 1), pt(i + 0.5, 2));
        strut(pt(i + 0.5, 2), pt(i + 1, 0)); strut(pt(i + 0.5, 2), pt(i + 1, 1));
        strut(pt(i, 0), pt(i + 1, 1));
      }
      const lac = new THREE.InstancedMesh(unit, bronze, M.length);
      M.forEach((m, i) => lac.setMatrixAt(i, m));
      lac.instanceMatrix.needsUpdate = true;
      lac.frustumCulled = false; lac.layers.enable(1);
      os.add(lac);
      // marker lamps along the lower chord
      const nl = Math.round(bays / 9);
      const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 6.4, 3.4) }), nl);
      for (let i = 0; i < nl; i++) { const a = ((i + 0.5) / nl) * Math.PI * 2; lamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a) * rad, -2.4, Math.sin(a) * rad)); }
      lamps.frustumCulled = false;
      os.add(lamps);
    }
    const nb = 9;
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1.15, 20, 14), gold, nb);
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 10, 8), lampM, nb);
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2;
      beads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a) * rad, 0.9, Math.sin(a) * rad));
      lights.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a + 0.012) * rad, 2.3, Math.sin(a + 0.012) * rad));
    }
    beads.castShadow = true;
    beads.frustumCulled = false; lights.frustumCulled = false;
    os.add(beads, lights);
    group.add(og);
    orbits.push({ g: os, w });
  }
  const phase = P("ringphase", opts.phase);
  const update = (t: number) => {
    // seen from outside the name travels to the left, its first letter leading
    spin.rotation.y = -(phase + RING.speed * t);
    for (const o of orbits) o.g.rotation.y = o.w * t;
  };
  update(0);
  return { group, update, axis };
}
