// Set: extreme close-up of the serpent's eye in the dark («Just never speak my name.»), shot 25.55 – 27.6.
// One curved plane with a procedural shader: imbricate keeled scales around a recessed eye (a ring of small scales
// that grows into rows of keeled head scales), a brow ridge, a fibrous amber iris with a vertical slit pupil, and a
// wet spectacle that reflects the candle. A candle off-frame left sweeps in on «never» (only part of the eye gets lit,
// the brow throws a shadow across it); the slit snaps shut on «name».
import * as THREE from "three";
import { CUE, ease, hit, lerp, noise1, ramp, rnd } from "../lib";
import { EYE, V, type Ctx, type SetMod, type Shot } from "./common";

/** eye centre and radius on the plane (world units, group-local) */
const EX = 0.5, EY = 0.06, ER = 1.75;

const FRAG = /* glsl */ `
precision highp float;
uniform float uT, uPupil, uLI, uAmb;
uniform vec3 uLP;
uniform vec2 uGaze;
uniform vec2 uFQ;
varying vec2 vQ;
varying vec3 vV;
#define TAU 6.2831853

float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
// value noise periodic in x with period P (integer)
float vnP(vec2 p, float P){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  float x0 = mod(i.x, P), x1 = mod(i.x + 1.0, P);
  return mix(mix(h21(vec2(x0, i.y)), h21(vec2(x1, i.y)), u.x), mix(h21(vec2(x0, i.y+1.0)), h21(vec2(x1, i.y+1.0)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vn(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }

// ---------------- macro shape: eye dome sunk in a socket, a brow ridge above it ----------------
float browF(vec2 q){
  vec2 d = q - vec2(0.25, 1.32);
  float ca = cos(0.2), sa = sin(0.2);
  d = vec2(ca*d.x - sa*d.y, sa*d.x + ca*d.y);
  return 1.0 - length(d / vec2(1.35, 0.62));
}
// where the eye ends: the brow's scales lip over the top of the eye (and a little at the bottom), so it sits in a socket
float rEdgeF(vec2 q){
  float r = max(length(q), 1e-3);
  float s = q.y/r, a = atan(q.y, q.x)/TAU;
  return 1.0 - 0.022*vnP(vec2(a*14.0, 0.5), 14.0) - 0.13*smoothstep(0.1, 0.85, s)*(0.85 + 0.15*sin(a*40.0)) - 0.04*smoothstep(-0.45, -0.95, s);
}
float macroH(vec2 q){
  float r = length(q);
  float re = rEdgeF(q);
  if (r < re) return 0.03 + 0.30*sqrt(max(1.0 - r*r, 0.0));
  float s = q.y/max(r, 1e-3);
  float h = 0.11*exp(-max(r - 1.0, 0.0)*2.2) + 0.04;
  // the overhanging lip stands above the dome
  h += 0.24*smoothstep(0.1, 0.85, s)*(1.0 - smoothstep(re + 0.05, 1.2, r)) + 0.06*smoothstep(-0.45, -0.95, s)*(1.0 - smoothstep(re, 1.08, r));
  h += 0.26*smoothstep(-0.1, 0.55, browF(q))*smoothstep(0.92, 1.1, r);
  h -= 0.012*dot(q, q);
  return h;
}
float softShadow(vec3 P, vec3 L){
  float s = 1.0, tt = 0.03;
  for (int i = 0; i < 18; i++){
    vec3 X = P + L*tt;
    float d = X.z - macroH(X.xy);
    s = min(s, clamp(6.0*d/tt + 0.1, 0.0, 1.0));
    tt += 0.04 + tt*0.2;
  }
  return s;
}

// ---------------- scales ----------------
// one scale: a lanceolate dome (wide base, narrower free tip at +x), tilted so the tip rides over the next scale
float prof(vec2 d, vec2 rad, float tilt, out float s, out vec2 e){
  float ex = clamp(d.x/rad.x, -1.0, 1.0);
  e = vec2(d.x/rad.x, d.y/(rad.y*(1.0 - 0.35*ex)));
  s = 1.0 - dot(e, e);
  float w = smoothstep(0.0, 0.05, s);
  return (0.26*smoothstep(0.0, 0.45, s) + 0.2*sqrt(max(s, 0.0)) + tilt*(e.x + 1.0))*w - (1.0 - w);
}
// ring of small bead scales around the eye (log-polar cells), growing outward
const float NS = 50.0;
float ringScales(vec2 q, out vec4 info){
  float r = max(length(q), 1e-3);
  vec2 uv = vec2(log(r), atan(q.y, q.x))*(NS/TAU);
  uv += 0.2*vec2(vn(q*2.6) - 0.5, vn(q*2.6 + 11.0) - 0.5);
  vec2 ip = floor(uv);
  float best = -9.0; info = vec4(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cell = ip + vec2(float(i), float(j));
    vec2 key = vec2(cell.x, mod(cell.y, NS));
    vec2 c = cell + 0.5 + (h22(key + 17.0) - 0.5)*0.3 + vec2(0.0, mod(cell.x, 2.0)*0.5);
    vec2 d = uv - c;
    float s; vec2 e;
    float hh = prof(d, vec2(0.7, 0.6)*(0.92 + 0.16*h21(key + 5.0)), 0.06, s, e) + h21(key)*0.05;
    hh += 0.06*exp(-e.y*e.y*30.0)*smoothstep(0.0, 0.4, s);
    if (hh > best){ best = hh; info = vec4(h21(key + 3.7), s, e.x, e.y); }
  }
  return best*(r*TAU/NS)*0.17;
}
// rows of keeled head scales, overlapping from the snout (left) back toward the neck (right)
float gridScales(vec2 q, out vec4 info){
  float ca = cos(-0.16), sa = sin(-0.16);
  vec2 p = vec2(ca*q.x - sa*q.y, sa*q.x + ca*q.y);
  vec2 cs = vec2(0.27, 0.19);
  vec2 uv = p/cs + 0.2*vec2(vn(q*1.6) - 0.5, vn(q*1.6 + 5.0) - 0.5);
  vec2 ip = floor(uv);
  float best = -9.0; info = vec4(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cell = ip + vec2(float(i), float(j));
    vec2 c = cell + 0.5 + (h22(cell + 41.0) - 0.5)*vec2(0.34, 0.22) + vec2(mod(cell.y, 2.0)*0.5, 0.0);
    vec2 d = uv - c;
    float s; vec2 e;
    float hh = prof(d, vec2(0.8, 0.56)*(0.92 + 0.16*h21(cell + 5.0)), 0.09, s, e) + h21(cell)*0.05;
    // keel: a sharp ridge along the scale's axis, strongest toward the free tip
    hh += 0.12*exp(-e.y*e.y*26.0)*smoothstep(0.0, 0.3, s)*(0.5 + 0.5*e.x);
    if (hh > best){ best = hh; info = vec4(h21(cell + 3.7), s, e.x, e.y); }
  }
  return best*cs.y*0.2;
}
float headH(vec2 q, out vec4 info){
  float h = macroH(q);
  float r = length(q);
  if (r < rEdgeF(q)){ info = vec4(0.0); return h; }
  vec4 ia, ib;
  float zone = r + 0.4*(vn(q*1.3) - 0.5) - 1.8;
  float ha = r < 2.6 ? ringScales(q, ia) - zone*0.06 : -9.0;
  float hb = r > 1.2 ? gridScales(q, ib) + zone*0.06 : -9.0;
  float sc;
  if (ha > hb){ sc = ha + zone*0.06; info = ia; } else { sc = hb - zone*0.06; info = ib; }
  // fine dimpled skin texture
  sc += 0.0012*(vn(q*120.0) - 0.5) + 0.0008*(vn(q*280.0) - 0.5);
  return h + sc;
}

// ---------------- iris ----------------
// fibre coordinates for a slit pupil: u runs along the slit (fibres start on it), d = distance from the slit
vec2 slitUV(vec2 pq){
  float cy = clamp(pq.y, -0.82, 0.82);
  vec2 dv = pq - vec2(0.0, cy);
  return vec2(cy*2.2 + atan(dv.y, abs(dv.x))*0.95, length(dv));
}
float fibers(vec2 pq){
  // angle measured in a vertically squashed frame, so the fibres fan out from the length of the slit, not one point
  float pr = length(pq), ang = atan(pq.y*0.45, pq.x)/TAU;
  vec2 w = vec2(vn(pq*5.0), vn(pq*5.0 + 5.0)) - 0.5;
  // fine radial fibres, domain-warped so they waver like real tissue
  float a = vnP(vec2(ang*170.0 + w.x*7.0, pr*10.0 + w.y*2.0), 170.0);
  float b = vnP(vec2(ang*420.0 + w.x*15.0, pr*24.0 + 4.0), 420.0);
  return a*0.6 + b*0.4;
}
float stripeK(vec2 q){
  return smoothstep(0.34, 0.12, abs(q.y + 0.1 - q.x*0.22 + 0.06*(vn(q*5.0) - 0.5)))*smoothstep(-0.95, 0.2, q.x);
}
vec3 irisAlbedo(vec2 q, vec2 pq, float fib, out float glint){
  float pr = length(pq);
  float z = pr/0.97;
  vec2 su = slitUV(pq);
  float zone = smoothstep(0.02, 0.55, su.y);
  float low = fbm(pq*2.2 + 3.0);
  float tone = 0.66 - 0.28*zone + 0.62*(low - 0.5) + 0.2*(fib - 0.5)*smoothstep(0.04, 0.3, pr);
  vec3 deep = vec3(0.17, 0.06, 0.012), amber = vec3(0.56, 0.25, 0.035), gold = vec3(0.86, 0.56, 0.15), pale = vec3(0.97, 0.82, 0.45);
  vec3 c = mix(deep, amber, smoothstep(0.18, 0.48, tone));
  c = mix(c, gold, smoothstep(0.46, 0.72, tone));
  c = mix(c, pale, smoothstep(0.74, 0.95, tone)*0.5);
  // fine gold vermiculation over the bronze
  float v1 = 1.0 - abs(2.0*fbm(pq*6.0 + vec2(vn(pq*2.0)*1.5)) - 1.0);
  c = mix(c, c*vec3(1.35, 1.2, 0.9) + vec3(0.04, 0.025, 0.0), smoothstep(0.82, 0.96, v1)*0.55);
  // olive and rust casts
  float hue = fbm(pq*3.0 + 9.0);
  c = mix(c, c*vec3(0.82, 0.96, 0.5), smoothstep(0.55, 0.75, hue)*0.4);
  c = mix(c, c*vec3(1.08, 0.7, 0.55), smoothstep(0.4, 0.2, hue)*0.3);
  // dark radial threads from the slit
  float st = vn(vec2(su.x*24.0 + 11.0, su.y*1.4) + vec2(vn(pq*5.0)*2.0, 0.0));
  c *= 1.0 - 0.38*smoothstep(0.74, 0.88, st)*smoothstep(0.12, 0.4, su.y);
  // a few dark flecks in the outer half
  float fl = vn(pq*34.0 + 3.0)*0.6 + vn(pq*90.0)*0.4;
  float flc = smoothstep(0.4, 0.7, vn(pq*3.5 + 1.0)) + 0.6*stripeK(q);
  c = mix(c, c*0.2, smoothstep(0.68, 0.78, fl)*clamp(flc, 0.0, 1.0)*smoothstep(0.25, 0.55, z)*0.85);
  // gold glints (reflective cells) that catch the candle
  glint = smoothstep(0.86, 0.97, vn(pq*95.0 + 21.0))*smoothstep(0.45, 0.7, tone)*(1.0 - smoothstep(0.8, 0.95, z));
  // the head's dark eye stripe runs on through the iris
  c *= 1.0 - 0.6*stripeK(q);
  // dark limbal zone
  c *= 1.0 - 0.9*smoothstep(0.74, 0.98, z);
  return c;
}

float flameImg(vec2 p, float t){
  // p in flame units: y up, base near y = -1
  p.x += 0.1*sin(t*13.0 + p.y*3.0)*(p.y + 1.0)*0.5;
  float w = 0.40*(1.0 - smoothstep(-1.0, 1.3, p.y))*smoothstep(-1.3, -0.5, p.y) + 0.04;
  return smoothstep(1.0, 0.3, abs(p.x)/w)*smoothstep(1.3, 0.55, p.y)*smoothstep(-1.35, -0.95, p.y);
}

void main(){
  vec2 q = vQ;
  float r = length(q);
  vec3 V = normalize(vV);
  vec3 lightC = vec3(1.0, 0.56, 0.24);
  vec3 coolC = vec3(0.32, 0.62, 0.72);
  float ang = atan(q.y, q.x)/TAU;
  float rEdge = rEdgeF(q);

  // ---------- head surface ----------
  vec4 info, dmy;
  float e = 0.003*max(r, 0.8);
  float h0 = headH(q, info);
  float hx = headH(q + vec2(e, 0.0), dmy);
  float hy = headH(q + vec2(0.0, e), dmy);
  vec3 N = normalize(vec3(-(hx - h0)/e, -(hy - h0)/e, 1.0));
  vec3 P = vec3(q, h0);
  vec3 Lv = uLP - P;
  float dl = length(Lv);
  vec3 L = Lv/dl;
  float att = uLI/(1.0 + dl*dl*0.7);
  float sh = softShadow(P + vec3(0.0, 0.0, 0.004), L);

  // colour: near-black teal with dark bronze blotches, a black stripe behind the eye, per-scale variation
  float blot = fbm(q*0.8 + 4.0);
  vec3 alb = mix(vec3(0.016, 0.026, 0.026), vec3(0.070, 0.054, 0.028), smoothstep(0.4, 0.7, blot + (info.x - 0.5)*0.3));
  float sl = q.y + 0.06 - q.x*0.2 + 0.08*(vn(q*2.0) - 0.5);
  float stripe = smoothstep(0.40, 0.18, abs(sl))*smoothstep(0.95, 1.5, q.x);
  alb = mix(alb, vec3(0.008, 0.008, 0.008), stripe*0.9);
  alb = mix(alb, vec3(0.11, 0.085, 0.05), smoothstep(0.62, 0.44, abs(sl - 0.08))*(1.0 - stripe)*smoothstep(1.0, 1.7, q.x)*0.45);
  alb *= 0.7 + 0.6*info.x;
  // skin between scales and under their free edges stays dark
  float ao = mix(0.12, 1.0, smoothstep(0.0, 0.3, info.y));
  float crev = smoothstep(rEdge - 0.012, rEdge, r)*(1.0 - smoothstep(rEdge, rEdge + 0.07, r));
  ao *= 1.0 - 0.85*crev;

  vec3 Hh = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndh = max(dot(N, Hh), 0.0);
  float ndv = max(dot(N, V), 0.0);
  float fres = 0.04 + 0.96*pow(clamp(1.0 - ndv, 0.0, 1.0), 5.0);
  vec3 sheen = mix(vec3(1.0), vec3(0.75, 1.0, 0.95), 0.35*(1.0 - ndv));
  float gloss = 0.6 + 0.4*vn(q*60.0);
  float spec = pow(ndh, 160.0)*0.8 + pow(ndh, 1200.0)*7.0*gloss;
  vec3 head = alb*lightC*ndl*att*sh*ao;
  head += lightC*sheen*spec*(0.05 + fres)*att*sh*smoothstep(0.02, 0.25, info.y);
  // a cool, very low fill from the right keeps the dark side legible
  vec3 Lc = normalize(vec3(0.8, 0.35, 0.5));
  float ndhc = max(dot(N, normalize(Lc + V)), 0.0);
  head += alb*coolC*max(dot(N, Lc), 0.0)*uAmb*ao*0.6 + coolC*pow(ndhc, 50.0)*0.4*uAmb*smoothstep(0.02, 0.25, info.y)*(0.5 + 0.5*smoothstep(0.0, 1.5, q.x));

  // ---------- eye ----------
  vec3 eyeC = vec3(0.0);
  if (r < 1.03){
    vec2 pq = q - uGaze;
    float fib = fibers(pq);
    float ef = 0.004;
    float fx = fibers(pq + vec2(ef, 0.0)), fy = fibers(pq + vec2(0.0, ef));
    vec3 Ni = normalize(vec3(-(fx - fib)/ef*0.01, -(fy - fib)/ef*0.01, 1.0));
    Ni = normalize(Ni + vec3(-pq*0.55, 0.0));
    float glint;
    vec3 ic = irisAlbedo(q, pq, fib, glint);
    // pupil: vertical slit with soft edges, darker ruff around it
    float yy = clamp(pq.y/0.93, -1.0, 1.0);
    float hw = uPupil*pow(max(1.0 - yy*yy, 0.0), 0.65);
    float pm = (1.0 - smoothstep(hw - 0.01, hw + 0.01, abs(pq.x)))*(1.0 - smoothstep(0.88, 0.95, abs(pq.y)));
    float ruff = (1.0 - smoothstep(hw, hw + 0.07, abs(pq.x)))*(1.0 - pm);
    ic *= 1.0 - 0.6*ruff;
    float hd = macroH(q);
    vec3 Pe = vec3(q, hd);
    vec3 Le = normalize(uLP - Pe);
    float de = length(uLP - Pe);
    float atte = uLI/(1.0 + de*de*0.7);
    float she = softShadow(Pe + vec3(0.0, 0.0, 0.004), Le);
    float di = max(dot(Ni, Le)*0.85 + 0.15, 0.0);
    vec3 irisCol = ic*mix(lightC, vec3(1.0, 0.8, 0.55), 0.35)*di*atte*she*1.25;
    irisCol += ic*coolC*uAmb*0.12;
    irisCol += vec3(1.0, 0.75, 0.35)*glint*pow(max(dot(reflect(-Le, Ni), V), 0.0), 6.0)*atte*she*0.6;
    irisCol *= 1.0 - pm*0.99;
    // the socket rim shades the edge of the eye
    irisCol *= 1.0 - 0.85*smoothstep(rEdge - 0.16, rEdge, r);

    // spectacle (wet cornea): the candle flame, a curved highlight, fresnel sheen
    float rr = min(r, 0.995);
    float k = 0.7/sqrt(1.0 - rr*rr);
    vec3 Nc = normalize(vec3(q*k, 1.0));
    float cv = clamp(dot(Nc, V), 0.0, 1.0);
    float F = 0.035 + 0.965*pow(1.0 - cv, 5.0);
    vec3 R = reflect(-V, Nc);
    vec3 Ld = normalize(uLP - vec3(q, 0.3));
    vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), Ld));
    vec3 e2 = cross(Ld, e1);
    // the candle flame mirrored in the spectacle (drawn upright at the specular point)
    vec2 fp = (q - uFQ)/vec2(0.042, 0.07);
    float fl = flameImg(fp, uT);
    float core = flameImg(fp*1.7 + vec2(0.0, 0.5), uT);
    vec3 refl = (vec3(1.0, 0.5, 0.15)*fl*0.9 + vec3(1.0, 0.9, 0.7)*core*1.6)*uLI*0.5*she;
    refl += vec3(1.0, 0.55, 0.22)*exp(-dot(fp, fp)*0.1)*0.05*uLI*she;
    // curved highlight: the warm, candle-lit wall reflected along the upper-left of the dome
    float th = atan(q.y, q.x);
    float ad = (r - 0.855 - 0.02*sin(th*3.0))/0.03;
    float arc = exp(-ad*ad)*smoothstep(1.5, 1.95, th)*smoothstep(3.05, 2.6, th);
    refl += vec3(1.0, 0.82, 0.6)*arc*(0.6 + 0.4*vn(vec2(th*9.0, 0.0)))*uLI*0.07*she;
    // a warm patch of the candle-lit cave behind the lens, and in it, tiny, the figure of Jamasp
    vec2 rp = (q - vec2(-0.5, -0.1))*vec2(0.8, 1.6);
    float patchR = exp(-dot(rp, rp)/0.012)*smoothstep(rEdge - 0.02, rEdge - 0.1, r);
    vec2 jp = (q - vec2(-0.5, -0.12))/0.07;
    float jw = 0.46 - 0.12*(jp.y + 1.0);
    float sil = (1.0 - smoothstep(jw - 0.06, jw + 0.06, abs(jp.x)))*smoothstep(-1.1, -0.95, jp.y)*(1.0 - smoothstep(0.32, 0.42, jp.y));
    sil = max(sil, 1.0 - smoothstep(0.85, 1.05, length((jp - vec2(0.0, 0.6))/vec2(0.2, 0.24))));
    sil = max(sil, 1.0 - smoothstep(0.85, 1.05, length((jp - vec2(0.03, 0.82))/vec2(0.25, 0.16))));
    refl += vec3(1.0, 0.66, 0.36)*patchR*(1.0 - 0.95*sil)*uLI*0.055;
    // grazing sheen: cool on the far side, warm near the light
    refl += mix(coolC*0.16*uAmb, lightC*0.18*atte, smoothstep(0.0, 0.8, dot(R, Ld)))*F*(0.4 + 0.6*she);
    // wet meniscus where the spectacle meets the scales, on the lit side only
    float men = smoothstep(rEdge - 0.035, rEdge - 0.012, r)*(1.0 - smoothstep(rEdge - 0.01, rEdge, r));
    refl += lightC*men*pow(max(dot(normalize(vec3(q, 0.2)), Le), 0.0), 4.0)*atte*0.6*she;
    eyeC = irisCol + refl;
  }
  float aa = fwidth(r)*1.2;
  vec3 col = mix(eyeC, head, smoothstep(rEdge - aa, rEdge + aa, r));
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = /* glsl */ `
uniform vec2 uEC;
uniform float uER;
varying vec2 vQ;
varying vec3 vV;
void main(){
  vQ = (position.xy - uEC)/uER;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vV = cameraPosition - w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

export const buildEye = (c: Ctx): SetMod => {
  const eyeSet = c.mk("eye", EYE);
  const uni = {
    uT: { value: 0 },
    uPupil: { value: 0.3 },
    uLI: { value: 0 },
    uAmb: { value: 0.4 },
    uLP: { value: new THREE.Vector3(-6, 1, 2) },
    uGaze: { value: new THREE.Vector2(0, 0) },
    uFQ: { value: new THREE.Vector2(-0.5, 0.3) },
    uEC: { value: new THREE.Vector2(EX, EY) },
    uER: { value: ER },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, fog: false });
  // the head's surface bends away from the lens, so the depth of field softens the far scales
  const geo = new THREE.PlaneGeometry(26, 15, 160, 92);
  const pa = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i) - EX, y = pa.getY(i) - EY;
    pa.setZ(i, -0.06 * (x * x + y * y * 1.4));
  }
  geo.computeVertexNormals();
  const plane = new THREE.Mesh(geo, mat);
  plane.frustumCulled = false;
  eyeSet.add(plane);

  // dust motes drifting through the candle light, in front of the eye
  const ND = 70;
  const dpos = new Float32Array(ND * 3);
  const dseed = new Float32Array(ND);
  for (let i = 0; i < ND; i++) {
    dpos[i * 3] = (rnd(i * 3.1 + 1) - 0.5) * 7;
    dpos[i * 3 + 1] = (rnd(i * 5.7 + 2) - 0.5) * 4;
    dpos[i * 3 + 2] = 0.6 + rnd(i * 2.3 + 3) * 6.5;
    dseed[i] = rnd(i * 9.1);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  dg.setAttribute("seed", new THREE.BufferAttribute(dseed, 1));
  const dmat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uL: { value: new THREE.Vector3() }, uLI: { value: 0 }, uPx: { value: c.H } },
    vertexShader: `attribute float seed; uniform float uT; uniform vec3 uL; uniform float uLI; uniform float uPx; varying float vA;
      void main(){ vec3 p = position;
        p.x += sin(uT*0.31 + seed*40.0)*0.25 + uT*0.08*(seed - 0.3);
        p.y += sin(uT*0.23 + seed*17.0)*0.18 - uT*0.03;
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        float d = length(p - uL);
        vA = uLI*0.05/(1.0 + d*d*0.3)*(0.4 + seed);
        gl_PointSize = uPx*(0.010 + 0.012*seed)/(-mv.z)*4.0;
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(1.0, 0.72, 0.42)*a*vA, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(dg, dmat);
  motes.frustumCulled = false;
  eyeSet.add(motes);

  // the candle: off-frame left, swept in on «never», then drifting slowly (q-space: units of eye radius, z up off the skin)
  const lightAt = (t: number) => {
    const s = ease.out(ramp(t, CUE.never - 0.2, CUE.never + 0.8));
    const d = ramp(t, CUE.never + 0.8, 27.6);
    const x = lerp(-7.0, -3.1, s) + d * 0.4 + (noise1(t * 2.3, 5) - 0.5) * 0.08;
    const y = lerp(0.8, 1.85, s) + d * 0.05 + (noise1(t * 2.9, 6) - 0.5) * 0.06;
    const z = lerp(1.8, 1.05, s);
    return V(x, y, z);
  };
  const flick = (t: number) => 0.86 + 0.12 * noise1(t * 7.5, 11) + 0.06 * noise1(t * 19, 12);

  const D0 = 9.4, D1 = 7.9;
  const shots: Shot[] = [
    {
      a: 25.55,
      b: 27.6,
      set: ["eye"],
      fog: null,
      focus: lerp(D0, D1, 0.5),
      range: 2.4,
      cam: (k) => {
        // a steady push-in with the eye held on the right third (the candle side, left, gets the room)
        const m = 0.25 * ease.sine(k) + 0.75 * k;
        return { p: V(lerp(-0.95, -0.98, m), lerp(0.14, 0.08, m), 2000 + lerp(D0, D1, m)), l: V(lerp(-1.0, -0.95, m), lerp(0.1, 0.06, m), 2000), fov: 40, roll: lerp(-0.035, -0.012, m) };
      },
    },
  ];
  const update = (t: number, sh: Shot) => {
    if (!sh.set.includes("eye")) return;
    uni.uT.value = t;
    const lp = lightAt(t);
    uni.uLP.value.copy(lp);
    // where the flame shows in the spectacle: the dome point whose normal bisects light and view
    const Ld = V(lp.x, lp.y, lp.z - 0.3).normalize();
    const Nh = Ld.add(V(0, 0, 1)).normalize();
    const m = Math.hypot(Nh.x, Nh.y) / Math.max(Nh.z, 1e-3);
    const rr = m / Math.sqrt(0.49 + m * m);
    const hl = Math.hypot(Nh.x, Nh.y) || 1;
    uni.uFQ.value.set((Nh.x / hl) * rr, (Nh.y / hl) * rr);
    const on = ease.out(ramp(t, CUE.never - 0.25, CUE.never + 0.55));
    uni.uLI.value = on * 6.5 * flick(t);
    uni.uAmb.value = lerp(0.12, 0.4, on);
    // pupil: dark-adapted wide, narrows a little as the light lands, then snaps to a hairline on «name»
    const pre = lerp(0.16, 0.125, ease.out(ramp(t, CUE.never, CUE.never + 0.9)));
    const snap = ease.out(ramp(t, CUE.name - 0.06, CUE.name + 0.16));
    uni.uPupil.value = Math.max(0.026, lerp(pre, 0.032, snap) - 0.01 * hit(t, CUE.name + 0.16, 0.08));
    // the eye turns a touch toward the lens as the light finds it
    const g = ease.io(ramp(t, CUE.never - 0.1, CUE.never + 0.8));
    uni.uGaze.value.set(lerp(0.07, 0.0, g), lerp(-0.03, 0.01, g));
    // dust: light position in world (group-local) units
    const dl = dmat.uniforms;
    dl.uT.value = t;
    dl.uL.value.set(EX + lp.x * ER, EY + lp.y * ER, lp.z * ER);
    dl.uLI.value = uni.uLI.value;
  };
  return { shots, update };
};
