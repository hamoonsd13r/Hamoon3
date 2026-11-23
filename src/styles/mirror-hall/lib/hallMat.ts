// Mirror Hall · the mirror hall's materials.
//  • Mirror-work (آینه‌کاری) is drawn per pixel: each surface carries (u, v) in world units and a pattern id; the
//    shader cuts it into mirror pieces (8-point stars of 8 kite facets and their crosses, hexagons of 6 facets,
//    diamonds, the frieze, the cove's big facets, the dome's rings) with plaster grout between them. Every piece is
//    a small flat mirror with its own tilt, so a candle shows up in some pieces and not in their neighbours: glitter.
//  • A piece reflects (a) the lights analytically — a candle flame is a small bright disc in direction space, so a
//    piece shows it only when its reflected ray hits it (crisp, parallax-correct glints), (b) the heroine through a
//    billboard (her picture, rendered each frame, placed where she stands: every piece that sees her shows the right
//    fragment of her), (c) a dim mirror-hall environment (sparse twinkles = other mirrors).
//  • Pieces set (appear) in waves from impact points: revealTime = min(impact time + distance / speed) + jitter.
//  • Plaster and the marble dado are lit by the same point lights (no shadows: candles low in a dark room).
import * as THREE from "three";
import { G } from "./base/shapes89";
import { DADO, DOME_R, DOME_Y, E_, N_AP, N_HW, N_SP, R_ } from "./archH";

export const NL = 32; // point lights
export const NI = 32; // impact points (mirror-work reveal)

export type HallUniforms = ReturnType<typeof makeHallUniforms>;
export function makeHallUniforms() {
  return {
    uTime: { value: 0 },
    nL: { value: 0 },
    lP: { value: Array.from({ length: NL }, () => new THREE.Vector3()) },
    lC: { value: Array.from({ length: NL }, () => new THREE.Vector3()) }, // diffuse power (rgb)
    lE: { value: Array.from({ length: NL }, () => new THREE.Vector3()) }, // radiance seen in a mirror (rgb)
    lR: { value: Array.from({ length: NL }, () => 1) }, // source radius (world units)
    iP: { value: Array.from({ length: NI }, () => new THREE.Vector3(0, -9999, 0)) },
    iT: { value: Array.from({ length: NI }, () => 9999) },
    iSpeed: { value: 120 },
    revealAll: { value: 9999 }, // everything is set by this time
    hideT: { value: 9999 }, hideSpeed: { value: 60 }, hideTop: { value: 400 }, // the outro: pieces go dark from the top
    herRT: { value: null as THREE.Texture | null },
    herC: { value: new THREE.Vector3(0, 0, 0) },
    herHalf: { value: new THREE.Vector2(30, 26) },
    herAmt: { value: 0 },
    miniK: { value: 0 },
    ambC: { value: new THREE.Vector3(0.006, 0.008, 0.014) },
    envK: { value: 0.0 },
    glitK: { value: 1 }, glitD: { value: 0.35 }, roomK: { value: 1 }, pxAng: { value: 0.0007 },
    envWarm: { value: new THREE.Vector3(1.0, 0.75, 0.45) },
    glintK: { value: 1 },
    popK: { value: 1 },
    mirK: { value: 1 }, swA: { value: 0 }, swK: { value: 0 }, swW: { value: 0.35 },
    plaster: { value: new THREE.Vector3(0.66, 0.62, 0.56) },
    // floor
    reflTex: { value: null as THREE.Texture | null },
    reflMat: { value: new THREE.Matrix4() },
    reflK: { value: 0.75 },
    reflRes: { value: new THREE.Vector2(960, 540) },
    stickP: { value: Array.from({ length: 12 }, () => new THREE.Vector3(0, -999, 0)) },
    nStick: { value: 0 },
  };
}

export const HALL_COMMON = /* glsl */ `
#define NL ${NL}
#define NI ${NI}
#define DOME_R ${DOME_R.toFixed(2)}
#define DOME_Y ${DOME_Y.toFixed(2)}
#define GF ${G.toFixed(2)}
#define N_SP ${N_SP.toFixed(2)}
#define N_AP ${N_AP.toFixed(2)}
#define N_HW ${N_HW.toFixed(2)}
#define ARC_E ${E_.toFixed(4)}
#define ARC_R ${R_.toFixed(4)}
#define DADO ${DADO.toFixed(2)}
uniform float uTime;
uniform int nL;
uniform vec3 lP[NL]; uniform vec3 lC[NL]; uniform vec3 lE[NL]; uniform float lR[NL];
uniform vec3 ambC; uniform float envK; uniform vec3 envWarm; uniform float glintK;
uniform float glitK, glitD, roomK, pxAng;
float h11(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

/** diffuse light from every point light (soft 1/d² with a radius so nothing explodes next to a flame) */
vec3 diffuseAt(vec3 P, vec3 N){
  vec3 acc = ambC;
  for (int i = 0; i < NL; i++){
    if (i >= nL) break;
    vec3 L = lP[i] - P; float d2 = dot(L, L); vec3 Ld = L * inversesqrt(d2);
    acc += lC[i] * max(dot(N, Ld), 0.0) / (d2 + 60.0);
  }
  return acc;
}
/** the hall's dark air seen in a mirror, without parallax (rough metal, marble) */
vec3 envR(vec3 R){
  float up = R.y * 0.5 + 0.5;
  return ambC * (0.6 + 1.6 * up);
}
/** what a mirror piece at P shows along R: the ray runs on to the room (floor, walls, dome); the light falling
 *  there, and the glitter of the other mirror pieces as tiny dots (never smaller than a pixel, energy kept) */
vec3 roomR(vec3 P, vec3 R){
  float tH = 1e5;
  if (R.y < -1e-4) { float tf = (GF - P.y) / R.y; if (tf > 0.0) tH = tf; }
  float a = R.x * R.x + R.z * R.z;
  if (a > 1e-6) {
    float b = P.x * R.x + P.z * R.z;
    float c = P.x * P.x + P.z * P.z - 147.0 * 147.0;
    float disc = b * b - a * c;
    if (disc > 0.0) { float tc = (-b + sqrt(disc)) / a; if (tc > 0.05 && tc < tH) tH = tc; }
  }
  if (tH > 9e4) tH = 300.0;
  vec3 H = P + R * tH;
  if (H.y > DOME_Y) {
    vec3 oc = P - vec3(0.0, DOME_Y, 0.0);
    float bb = dot(oc, R), cc = dot(oc, oc) - DOME_R * DOME_R, dd = bb * bb - cc;
    tH = -bb + sqrt(max(dd, 0.0));
    H = P + R * tH;
  }
  vec3 hn = H.y < GF + 0.5 ? vec3(0.0, 1.0, 0.0) : normalize(vec3(-H.x, H.y > DOME_Y ? DOME_Y - H.y : 0.0, -H.z));
  vec3 li = diffuseAt(H, hn);
  float alb = H.y < GF + 0.5 ? 0.06 : (H.y > DOME_Y ? 0.42 : 0.5);
  vec3 col = li * alb * roomK;
  if (glitK > 0.0) {
    vec3 q = H / 2.6;
    vec3 g = floor(q);
    vec3 o = vec3(h31(g + 1.31), h31(g + 2.77), h31(g + 5.13)) - 0.5;
    float dw = length(q - g - 0.5 - o * 0.55) * 2.6;
    float pathL = length(cameraPosition - P) + tH;
    float r0 = 0.4, r = max(r0, pathL * pxAng * 0.9);
    float on = step(1.0 - glitD, h31(g));
    float lum = dot(li, vec3(0.3, 0.6, 0.1)) * (alb > 0.1 ? 1.0 : 0.2);
    col += envWarm * on * smoothstep(r, 0.0, dw) * min(1.0, (r0 * r0) / (r * r)) * glitK * (0.45 + 7.0 * lum);
  }
  return col;
}
/** the lights seen in a mirror: a small disc (angular radius = r / d) and a soft halo; rough widens the lobe */
vec3 glintsAt(vec3 P, vec3 R, float rough){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < NL; i++){
    if (i >= nL) break;
    vec3 L = lP[i] - P; float d = length(L); vec3 Ld = L / d;
    float c = dot(R, Ld);
    float ar = lR[i] / d + rough;
    float x = (1.0 - c) / max(0.5 * ar * ar, 1e-8);
    acc += lE[i] * (smoothstep(1.7, 0.45, x) * (lR[i] / d) * (lR[i] / d) / (ar * ar) + 0.012 * exp(-x * 0.06));
  }
  return acc * glintK;
}
uniform sampler2D herRT; uniform vec3 herC; uniform vec2 herHalf; uniform float herAmt, miniK;
/** her, seen in a mirror: the reflected ray hits a vertical billboard through her that faces the piece */
vec3 herRefl(vec3 P, vec3 R, vec2 loc){
  if (herAmt <= 0.0) return vec3(0.0);
  vec3 toP = P - herC; toP.y = 0.0;
  float lp = length(toP);
  if (lp < 2.0) return vec3(0.0);
  vec3 nPl = toP / lp;
  float den = -dot(R, nPl);
  vec3 c = vec3(0.0);
  if (den > 0.02) {
    float s = lp / den;
    vec3 Q = P + R * s;
    vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), nPl));
    vec2 uv = vec2(dot(Q - herC, side) / herHalf.x, (Q.y - herC.y) / herHalf.y) * 0.5 + 0.5;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) c = texture2D(herRT, uv).rgb;
  }
  if (miniK > 0.0) c = mix(c, texture2D(herRT, clamp((loc - 0.5) * vec2(0.55, 0.85) + 0.5, 0.0, 1.0)).rgb * 1.8, miniK);
  return c * herAmt;
}
vec3 marbleCream(vec2 p){
  float v1 = fbm(p * 0.09 + 3.0);
  float vein = smoothstep(0.035, 0.0, abs(fbm(p * 0.05 + v1 * 1.6) - 0.5));
  float cloud = fbm(p * 0.21 + 9.0);
  return mix(vec3(0.6, 0.53, 0.43), vec3(0.72, 0.66, 0.56), cloud) * (1.0 - 0.28 * vein);
}
`;

const VERT = /* glsl */ `
attribute vec2 aUV; attribute vec3 aTan; attribute float aPat; attribute float aAO; attribute float aWall;
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying vec3 vT; varying float vPat; varying float vAO; varying float vWall;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUV = aUV; vT = normalize(mat3(modelMatrix) * aTan);
  vPat = aPat; vAO = aAO; vWall = aWall;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
${HALL_COMMON}
uniform vec3 iP[NI]; uniform float iT[NI]; uniform float iSpeed, revealAll, hideT, hideSpeed, hideTop;
uniform float popK, mirK, swA, swK, swW;
uniform vec3 plaster;
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying vec3 vT; varying float vPat; varying float vAO; varying float vWall;

struct Tile { float cov; vec2 tilt; vec2 id; vec2 loc; };

// 8-point stars (8 kite facets each) and the crosses between them (4 facets each)
Tile patStar(vec2 uv, float s){
  Tile T; vec2 q = uv / s; vec2 c = floor(q); vec2 f = q - c - 0.5;
  float a = 0.315;
  float dS = min(max(abs(f.x), abs(f.y)) - a, (abs(f.x) + abs(f.y)) * 0.70710678 - a);
  float aa = fwidth(q.x) + fwidth(q.y) + 1e-4;
  float g = 0.016;
  if (dS < 0.0) {
    float ang = atan(f.y, f.x);
    float k = floor(ang / 0.78539816 + 0.5);
    float ca = k * 0.78539816;
    float edgeF = (0.39269908 - abs(ang - ca)) * length(f);
    T.cov = smoothstep(g, g + aa, -dS) * smoothstep(g * 0.45, g * 0.45 + aa, edgeF);
    T.tilt = vec2(cos(ca), sin(ca)) * 0.17;
    T.id = c * 17.0 + vec2(k + 9.0, 3.0);
    T.loc = f / (a * 1.414) * 0.5 + 0.5;
  } else {
    vec2 sg = sign(f + 1e-6);
    vec2 cc = c + 0.5 + 0.5 * sg;
    vec2 g2 = f - 0.5 * sg;
    vec2 rq = vec2(g2.x + g2.y, g2.x - g2.y);
    vec2 qd = sign(rq + 1e-6);
    float edgeQ = min(abs(rq.x), abs(rq.y)) * 0.70710678;
    T.cov = smoothstep(g, g + aa, dS) * smoothstep(g * 0.45, g * 0.45 + aa, edgeQ);
    T.tilt = -normalize(vec2(qd.x + qd.y, qd.x - qd.y) + 1e-4) * 0.12;
    T.id = cc * 31.0 + qd * 5.0 + 101.0;
    T.loc = g2 * 2.0 + 0.5;
  }
  return T;
}
// hexagons of six triangular facets (a shallow pyramid each)
Tile patHex(vec2 uv, float s){
  Tile T; vec2 p = uv / s;
  const vec2 r = vec2(1.0, 1.7320508); vec2 hh = r * 0.5;
  vec2 a = mod(p, r) - hh, b = mod(p - hh, r) - hh;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = p - gv;
  vec2 ag = abs(gv);
  float edge = 0.5 - max(dot(ag, vec2(0.5, 0.8660254)), ag.x);
  float aa = fwidth(p.x) + fwidth(p.y) + 1e-4;
  float ang = atan(gv.y, gv.x);
  float k = floor(ang / 1.0471976 + 0.5);
  float ca = k * 1.0471976;
  float edgeF = (0.5235988 - abs(ang - ca)) * length(gv);
  float g = 0.028;
  T.cov = smoothstep(g, g + aa, edge) * smoothstep(g * 0.4, g * 0.4 + aa, edgeF);
  T.tilt = vec2(cos(ca), sin(ca)) * 0.15;
  T.id = floor(id * 8.0 + 0.5) * 13.0 + k;
  T.loc = gv + 0.5;
  return T;
}
// diamonds (rotated squares) of two facets each, the tilt alternating like a zigzag
Tile patDiamond(vec2 uv, float s, float tiltK){
  Tile T; vec2 q = vec2(uv.x + uv.y, uv.x - uv.y) / (s * 1.41421356);
  vec2 c = floor(q); vec2 f = q - c - 0.5;
  float edge = 0.5 - max(abs(f.x), abs(f.y));
  float aa = fwidth(q.x) + fwidth(q.y) + 1e-4;
  float side = sign(f.x - f.y + 1e-6);
  float edgeR = abs(f.x - f.y) * 0.70710678;
  float g = 0.035;
  T.cov = smoothstep(g, g + aa, edge) * smoothstep(g * 0.4, g * 0.4 + aa, edgeR);
  float par = mod(c.x + c.y, 2.0);
  T.tilt = vec2(side * 0.12, (par - 0.5) * 0.2) * tiltK;
  T.id = c * 7.0 + side + 3.0;
  T.loc = f + 0.5;
  return T;
}
// the frieze: three rows of small squares between two plain lines (a chain band)
Tile patFrieze(vec2 uv){
  Tile T; float lv = uv.y - ${132.0.toFixed(1)};
  float band = smoothstep(2.6, 2.9, lv) * (1.0 - smoothstep(15.1, 15.4, lv));
  vec2 q = vec2(uv.x / 3.1 + 0.5 * mod(floor(lv / 3.1), 2.0), lv / 3.1);
  vec2 c = floor(q); vec2 f = q - c - 0.5;
  float edge = 0.5 - max(abs(f.x), abs(f.y));
  float aa = fwidth(q.x) + fwidth(q.y) + 1e-4;
  T.cov = smoothstep(0.06, 0.06 + aa, edge) * band;
  T.tilt = (h22(c * 3.1) - 0.5) * 0.3;
  T.id = c * 11.0 + 7.0;
  T.loc = f + 0.5;
  return T;
}
// the dome: rings of pieces whose count doubles towards the base, sixteen plaster ribs, a star medallion at the top
Tile patDome(vec3 w){
  Tile T;
  vec3 d = (w - vec3(0.0, DOME_Y, 0.0)) / DOME_R;
  float th = acos(clamp(d.y, -1.0, 1.0));
  float az = atan(d.x, -d.z);
  float arc = th * DOME_R;
  float aa = fwidth(arc) * 1.5 + 1e-3;
  float azn = az / 6.2831853 + 0.5; // 0..1
  if (arc < 22.0) {
    // medallion: a 16-point star of radial facets
    float k = floor(azn * 16.0);
    float fu = azn * 16.0 - k - 0.5;
    float r = arc / 22.0;
    float spike = 0.55 + 0.45 * (1.0 - abs(fu) * 2.0);
    float cov = smoothstep(0.03, 0.06, spike - r) * smoothstep(0.02, 0.05, (0.5 - abs(fu)) * r);
    T.cov = cov;
    T.tilt = vec2(0.0, -0.22);
    T.id = vec2(k, 999.0);
    T.loc = vec2(fu + 0.5, r);
    return T;
  }
  // sixteen sectors, each mirrored about its centre line: an 8-point-star field that converges to the top like a
  // sunburst, white plaster ribs between the sectors, a plaster ring every 46 units of arc
  float sec = azn * 16.0;
  float k = floor(sec);
  float fs = sec - k - 0.5;
  float secW = 6.2831853 * DOME_R * sin(th) / 16.0;
  float ux = abs(fs) * secW;
  T = patStar(vec2(ux, arc + 4.0), 9.0);
  T.tilt.x *= sign(fs + 1e-6);
  float rib = secW * 0.5 - ux;
  float ringD = abs(fract((arc - 30.0) / 46.0) - 0.5) * 46.0;
  T.cov *= smoothstep(0.7, 0.7 + aa * 2.0, rib) * smoothstep(0.9, 0.9 + aa * 2.0, ringD);
  T.id += vec2(k * 131.0, 17.0);
  return T;
}

float revealTime(vec3 P){
  float best = revealAll;
  for (int i = 0; i < NI; i++) best = min(best, iT[i] + distance(P, iP[i]) / iSpeed);
  return best;
}


// the dado: carved cream marble — a chamfered plinth, six panels per wall (raised stiles, a groove, an 8-petal
// rosette with a boss), a half-round cap moulding. Height in world units (relief), sampled for the normal.
float dadoH(vec2 uv){
  float u = uv.x, v = uv.y;
  if (v < 2.4) return 1.0 - 0.5 * smoothstep(1.9, 2.4, v);
  if (v > 15.6) { float x = (v - 15.6) / 2.4; return 0.55 + 0.55 * sqrt(max(0.0, 1.0 - pow(2.0 * x - 1.0, 2.0))); }
  float pw = 124.264 / 6.0;
  float pu = mod(u + 62.132, pw) - pw * 0.5;
  float pv = v - 9.0;
  float fr = max(abs(pu) - (pw * 0.5 - 1.3), abs(pv) - 5.6);
  float h = 0.5 * smoothstep(-0.6, 0.2, fr);
  if (fr < -0.6) {
    h -= 0.18 * smoothstep(0.35, 0.0, abs(fr + 1.25));
    vec2 q = vec2(pu, pv);
    float r = length(q), a = atan(q.y, q.x);
    float petal = 3.5 + 0.95 * cos(8.0 * a);
    h += 0.32 * smoothstep(petal + 0.3, petal - 0.3, r) * (0.55 + 0.45 * smoothstep(0.0, 2.6, r));
    h += 0.26 * smoothstep(1.15, 0.7, r);
    h -= 0.12 * smoothstep(0.25, 0.0, abs(r - 4.9));
  }
  return h;
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  vec3 Tn = normalize(vT - N * dot(vT, N));
  vec3 Bn = cross(N, Tn);
  int pat = int(vPat + 0.5);
  Tile t; t.cov = 0.0; t.tilt = vec2(0.0); t.id = vec2(0.0); t.loc = vec2(0.5);
  float region = 0.0; // 0 field · 1 arch band · 2 spandrel · 3 alfiz border
  if (pat == 1) {
    // the classic niche composition: the arch → a band following it → spandrels → a rectangular frame (alfiz)
    float x = abs(vUV.x);
    float da = vUV.y < N_SP ? x - N_HW : length(vec2(x + ARC_E, vUV.y - N_SP)) - ARC_R;
    float AW = N_HW + 15.0, AT = N_AP + 13.0;
    bool inRect = x < AW && vUV.y < AT;
    if (da > 0.0 && da < 6.5) { region = 1.0; t = patDiamond(vec2(vUV.x, vUV.y), 2.5, 1.3); t.cov *= smoothstep(0.35, 0.8, da) * smoothstep(0.35, 0.8, 6.5 - da); }
    else if (inRect && (x > AW - 3.4 || vUV.y > AT - 3.4)) { region = 3.0; t = patDiamond(vUV, 2.0, 1.5); t.cov *= smoothstep(0.3, 0.7, min(AW - x, AT - vUV.y)) * smoothstep(0.3, 0.7, min(x - (AW - 3.4), 99.0) + (vUV.y > AT - 3.4 ? 99.0 : 0.0)); }
    else if (inRect) { region = 2.0; t = patHex(vUV + vec2(0.0, 1.3), 3.8); }
    else t = patStar(vUV, 10.0);
  }
  else if (pat == 2) t = patHex(vUV, 5.4);
  else if (pat == 3) t = patHex(vUV, 3.4);
  else if (pat == 4) t = patFrieze(vUV);
  else if (pat == 5) t = patDiamond(vUV, 6.2, 1.6);
  else if (pat == 6) t = patDome(vW);
  else if (pat == 7 && vUV.y > 7.0 && vUV.y < 157.0) t = patDiamond(vec2(vUV.x * 1.7 + vUV.y * 0.5, vUV.y * 0.55), 2.3, 1.2);
  vec3 dif = diffuseAt(vW, N) * vAO;
  vec3 col;
  bool stone = pat == 8 || (pat == 7 && (vUV.y <= 7.0 || vUV.y >= 157.0));
  if (stone) {
    // cream marble; on the walls' dado a carved relief (normal from the height field), polished
    vec3 n = N;
    float relief = 1.0;
    if (pat == 8 && abs(N.y) < 0.5) {
      float e = 0.12;
      float h0 = dadoH(vUV);
      float hu = (dadoH(vUV + vec2(e, 0.0)) - dadoH(vUV - vec2(e, 0.0))) / (2.0 * e);
      float hv = (dadoH(vUV + vec2(0.0, e)) - dadoH(vUV - vec2(0.0, e))) / (2.0 * e);
      n = normalize(N - Tn * hu - Bn * hv);
      relief = 0.72 + 0.28 * smoothstep(-0.2, 0.6, h0);
    }
    vec3 alb = marbleCream(vUV + vec2(vWall * 41.0, vWall * 7.0));
    vec3 R = reflect(-V, n);
    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    col = alb * diffuseAt(vW, n) * vAO * relief + (envR(R) * 0.5 + glintsAt(vW, R, 0.02) * 0.6) * (0.04 + 0.5 * fr) * relief;
  } else {
    // plaster (gypsum, a little uneven)
    float pn = fbm(vUV * 0.35) * 0.18 + fbm(vUV * 2.1) * 0.08;
    col = plaster * (0.86 + pn) * dif * (pat == 3 ? 1.35 : 1.0);
  }
  if (t.cov > 0.0) {
    float rid = h21(t.id * 0.731 + 0.17);
    float rt = revealTime(vW) + rid * 0.28;
    float on = step(rt, uTime);
    // the outro: pieces go dark from the top down (each with its own moment)
    float ht = hideT + (hideTop - vW.y) / hideSpeed + rid * 0.6;
    float lit = 1.0 - smoothstep(ht, ht + 0.5, uTime);
    if (on > 0.0) {
      vec2 jit = (h22(t.id * 1.37 + 0.5) - 0.5) * 0.12;
      vec3 n = normalize(N + Tn * (t.tilt.x + jit.x) + Bn * (t.tilt.y + jit.y));
      vec3 R = reflect(-V, n);
      vec3 m = (roomR(vW, R) + glintsAt(vW, R, 0.0)) * lit * mirK + herRefl(vW, R, t.loc);
      // a sweep of light running around the hall ("catch the light", the santur)
      if (swK > 0.0) { float az = atan(vW.x, -vW.z); float da = abs(mod(az - swA + 3.14159, 6.28318) - 3.14159); m += envWarm * swK * exp(-da * da / (swW * swW)) * (0.25 + rid * rid * 2.5); }
      m *= vec3(0.8, 0.83, 0.88);
      float pop = exp(-(uTime - rt) * 6.0) * popK;
      m += vec3(1.5, 1.38, 1.22) * pop * (0.4 + 0.6 * rid);
      // a mirror piece also scatters a little of the light that falls on it (dust, silvering)
      m += dif * 0.18;
      col = mix(col, m, t.cov);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeHallMaterial(U: HallUniforms) {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide });
}

// ───────────────────────── the floor: polished dark stone with a planar reflection ─────────────────────────
const FLOOR_VERT = /* glsl */ `
uniform mat4 reflMat;
varying vec3 vW; varying vec4 vR;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vR = reflMat * w;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FLOOR_FRAG = /* glsl */ `
${HALL_COMMON}
uniform sampler2D reflTex; uniform float reflK; uniform vec2 reflRes;
uniform vec3 stickP[12]; uniform int nStick;
varying vec3 vW; varying vec4 vR;
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec2 p, float s){ vec2 d = abs(p) - s; return max(d.x, d.y); }
float star8(vec2 p, float s){ return min(sdBox(rot2(0.3926991) * p, s), sdBox(rot2(-0.3926991) * p, s)); }
float wallD(vec2 p){
  float m = -1e9;
  for (int k = 0; k < 8; k++){ float ph = float(k) * 0.7853982; m = max(m, dot(p, vec2(sin(ph), -cos(ph)))); }
  return 150.0 - m;
}
vec3 marbleDark(vec2 p, float slab){
  float w = fbm(p * 0.02 + slab * 7.0);
  float v1 = smoothstep(0.022, 0.0, abs(fbm(p * 0.03 + w * 2.2 + slab * 3.0) - 0.5));
  float v2 = smoothstep(0.012, 0.0, abs(fbm(p * 0.09 + w * 1.4 + 11.0) - 0.5)) * 0.6;
  float cloud = fbm(p * 0.13 + slab * 5.0);
  vec3 base = mix(vec3(0.016, 0.022, 0.021), vec3(0.04, 0.05, 0.048), cloud) * (0.85 + 0.3 * slab);
  return base + vec3(0.32, 0.34, 0.33) * v1 * 0.55 + vec3(0.22) * v2 * 0.35;
}
void main(){
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz;
  float r = length(p);
  float aa = fwidth(r) * 1.2 + 1e-3;
  // ── the inlay: a dark 8-point star in a cream star, a cream ring between brass lines; a cream border band along
  //    the walls behind a brass line; the dark field in big slabs
  float s1 = star8(p, 21.0);
  float s2 = star8(rot2(0.3926991) * p, 8.5);
  float dw = wallD(p);
  float cream = 0.0;
  if (s1 < 0.0 && s2 > 0.0) cream = 1.0;
  if (r > 31.6 && r < 37.0) cream = 1.0;
  if (dw < 11.4) cream = 1.0;
  float brass = max(max(smoothstep(0.5, 0.5 - aa, abs(s1)), smoothstep(0.45, 0.45 - aa, abs(r - 31.1))), max(smoothstep(0.45, 0.45 - aa, abs(r - 37.5)), smoothstep(0.45, 0.45 - aa, abs(dw - 11.9))));
  brass = max(brass, smoothstep(0.35, 0.35 - aa, abs(s2)));
  // slabs and their joints: the field in a 40-unit grid turned 22.5°, the ring in 16 segments, the border every 20
  vec2 q = rot2(0.3926991) * p / 40.0;
  vec2 cq = floor(q);
  vec2 fq = abs(fract(q) - 0.5);
  float slab = h21(cq);
  float joint = smoothstep(0.4955, 0.4985, max(fq.x, fq.y));
  float ang = atan(p.y, p.x);
  if (r > 31.6 && r < 37.0) { float sg = abs(fract(ang / 0.3926991) - 0.5) * 0.3926991 * r; joint = smoothstep(0.18, 0.06, sg); slab = h11(floor(ang / 0.3926991) + 3.0); }
  if (dw < 11.4) { float along = dot(p, vec2(-cos(ang), sin(ang))); slab = h11(floor(r * 0.0) + floor(ang * 2.546)); joint = 0.0; }
  if (s1 < 0.0) joint = 0.0;
  vec3 alb = cream > 0.5 ? marbleCream(p * 1.3 + slab * 40.0) * 0.82 : marbleDark(p, slab);
  // contact shadows: along the walls, under the candlesticks
  float ao = mix(0.45, 1.0, smoothstep(0.0, 9.0, dw - 0.5));
  for (int i = 0; i < 12; i++) { if (i >= nStick) break; float d = length(p - stickP[i].xz); ao *= mix(0.35, 1.0, smoothstep(2.4, 6.5, d)); }
  vec3 dif = diffuseAt(vW, N) * ao;
  // the reflection: each slab is set a hair off level (its reflection shifts a little), polish varies
  vec2 uv = vR.xy / vR.w;
  vec2 px = 1.0 / reflRes;
  vec2 tiltOff = (h22(cq + 17.0) - 0.5) * 3.0 * px * (cream > 0.5 ? 0.6 : 1.0);
  float bl = cream > 0.5 ? 2.4 : 1.2;
  vec3 rc = texture2D(reflTex, uv + tiltOff).rgb * 0.3;
  rc += texture2D(reflTex, uv + tiltOff + vec2(bl, 0.7) * px).rgb * 0.14;
  rc += texture2D(reflTex, uv + tiltOff + vec2(-bl, -0.7) * px).rgb * 0.14;
  rc += texture2D(reflTex, uv + tiltOff + vec2(0.7, -bl) * px).rgb * 0.14;
  rc += texture2D(reflTex, uv + tiltOff + vec2(-0.7, bl) * px).rgb * 0.14;
  rc += texture2D(reflTex, uv + tiltOff + vec2(bl, -bl) * px * 1.6).rgb * 0.07;
  rc += texture2D(reflTex, uv + tiltOff + vec2(-bl, bl) * px * 1.6).rgb * 0.07;
  float fr = 0.045 + 0.955 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  float polish = (cream > 0.5 ? 0.55 : 1.0) * (0.85 + 0.3 * slab);
  vec3 R = reflect(-V, N);
  vec3 refl = rc * reflK * polish * (0.16 + 0.84 * fr) * (1.0 - joint * 0.85);
  vec3 col = alb * dif + refl + glintsAt(vW, R, 0.012) * 0.03 * polish;
  // brass: warm metal that mirrors the room and the lights
  if (brass > 0.0) {
    vec3 bc = vec3(0.86, 0.62, 0.3);
    vec3 bm = (rc * 0.8 + glintsAt(vW, R, 0.01) * 0.4 + dif * 0.25) * bc;
    col = mix(col, bm, brass);
  }
  col *= 1.0 - joint * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`;
export function makeFloorMaterial(U: HallUniforms) {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, side: THREE.DoubleSide });
}
