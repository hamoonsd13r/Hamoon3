// Sea world props: the grappling hook (+ its rope), a lit rope tube, the curling lip of the big wave (the crash), the
// galley set (planks, green tiles, brass porthole with the storm outside, swinging lamp, stove, kettle, pots, the
// oil can, the counter) and the soup bowl seen from above (ripples where you blow, smooth oily spots), plus 2D
// spray / splash drawings. All world materials are two-tone (lam) and inked like the ships.
import * as THREE from "three";
import { Batch, V, lam } from "../base/build";
import { ctex, planksHD } from "../base/paint";
import { untone } from "../base/shade";
import { NOINK } from "../base/ink";
import { Pen, INK } from "../base/toon";

const UP = V(0, 1, 0);
const spar = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, ra: number, rb: number, seg = 10) => {
  const d = c.clone().sub(a), len = d.length();
  b.add(new THREE.CylinderGeometry(rb, ra, len, seg, 1, false), mat,
    new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V(1, 1, 1)));
};
const boxAt = (b: Batch, mat: THREE.Material, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) =>
  b.add(new THREE.BoxGeometry(sx, sy, sz), mat, new THREE.Matrix4().makeTranslation(cx, cy, cz));

// ---------------- a lit rope: tube rebuilt in place (outward winding) ----------------
export class RopeTube {
  mesh: THREE.Mesh;
  private pos: Float32Array; private nor: Float32Array; private pts: THREE.Vector3[];
  constructor(parent: THREE.Object3D, public n = 40, private R = 6, col = "#4a3626") {
    this.pos = new Float32Array(n * R * 3); this.nor = new Float32Array(n * R * 3);
    this.pts = Array.from({ length: n }, () => new THREE.Vector3());
    const g = new THREE.BufferGeometry(), idx: number[] = [];
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < R; k++) {
      const a = i * R + k, b = i * R + ((k + 1) % R), c = (i + 1) * R + ((k + 1) % R), d = (i + 1) * R + k;
      idx.push(a, d, c, a, c, b);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, lam(`ropeTube_${col}`, () => ({ color: col })));
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.visible = false;
    parent.add(this.mesh);
  }
  /** a sagging rope from a to b (sag in m at the middle), radius r */
  set(a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.03) {
    const { n, R } = this, T = V(0, 0, 0), S = V(0, 0, 0), B = V(0, 0, 0);
    for (let i = 0; i < n; i++) { const s = i / (n - 1); this.pts[i].lerpVectors(a, b, s).y -= sag * 4 * s * (1 - s); }
    for (let i = 0; i < n; i++) {
      const p = this.pts[i]; T.subVectors(this.pts[Math.min(n - 1, i + 1)], this.pts[Math.max(0, i - 1)]).normalize();
      S.crossVectors(T, UP); if (S.lengthSq() < 1e-6) S.set(1, 0, 0); S.normalize(); B.crossVectors(S, T).normalize();
      for (let k = 0; k < R; k++) {
        const an = (k / R) * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an), o = (i * R + k) * 3;
        const nx = S.x * c + B.x * sn, ny = S.y * c + B.y * sn, nz = S.z * c + B.z * sn;
        this.pos[o] = p.x + nx * r; this.pos[o + 1] = p.y + ny * r; this.pos[o + 2] = p.z + nz * r;
        this.nor[o] = nx; this.nor[o + 1] = ny; this.nor[o + 2] = nz;
      }
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; }
}

// ---------------- the grappling hook: iron shaft, four curved prongs, a ring ----------------
export class Hook {
  root = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const b = new Batch(), Mi = lam("hookIron", () => ({ color: "#9aa2ae" }));
    spar(b, Mi, V(0, -0.36, 0), V(0, 0.36, 0), 0.04, 0.04, 8);
    b.add(new THREE.TorusGeometry(0.075, 0.022, 6, 14), Mi, new THREE.Matrix4().makeTranslation(0, 0.43, 0));
    for (let k = 0; k < 4; k++) {
      const g = new THREE.TorusGeometry(0.22, 0.03, 6, 12, Math.PI * 0.62);
      // arc in its xy plane from angle 0 (x+) up: lift it so it starts at the shaft foot and curves up-and-out
      g.rotateZ(-Math.PI * 0.5).translate(-0.22, -0.36, 0);
      b.add(g, Mi, new THREE.Matrix4().makeRotationY((k * Math.PI) / 2));
      b.add(new THREE.ConeGeometry(0.04, 0.12, 6), Mi, new THREE.Matrix4().compose(
        new THREE.Vector3(-0.22 + 0.22 * Math.cos(Math.PI * 0.12), -0.36 + 0.22 * Math.sin(Math.PI * 0.62 - Math.PI * 0.5) + 0.2, 0).applyAxisAngle(UP, (k * Math.PI) / 2),
        new THREE.Quaternion().setFromAxisAngle(UP, (k * Math.PI) / 2), V(1, 1, 1)));
    }
    b.build(this.root, true);
    this.root.visible = false;
    parent.add(this.root);
  }
  /** ring = where the rope ties on */
  ring(out = new THREE.Vector3()) { return out.set(0, 0.45, 0).applyMatrix4(this.root.matrixWorld); }
}

// ---------------- the big wave's curling lip (the crash) ----------------
// A sheet along x from x0 to x1 at the crest (zc, h): in each cross-section the lip leaves the crest top and curls
// forward (+z) and down through `curl` (0..1 = 0..200 deg) with radius ~0.36 h; `drop` (0..1) brings the whole lip down
// onto the deck. Vertex colours: deep teal underside, light green-teal body, white foam at the leading edge.
const LIP_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vWP; varying vec3 vN;
void main(){
  vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const LIP_FRAG = /* glsl */ `
uniform vec3 uBody, uUnder, uFoam, uFogC, uSun;
uniform float uTime, uFogNear, uFogFar, uFlash, uDrop;
varying vec2 vUv; varying vec3 vWP; varying vec3 vN;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  float s = vUv.y, u = vUv.x;
  // deep under the curl, lighter water over its top (light through the lip)
  vec3 col = mix(uUnder, uBody, smoothstep(0.0, 0.5, s));
  col = mix(col, mix(uBody, uFoam, 0.25), smoothstep(0.1, 0.45, s) * (1.0 - smoothstep(0.55, 0.8, s)) * 0.5);
  float lit = smoothstep(-0.05, 0.25, dot(N, normalize(uSun)));
  col *= mix(0.74, 1.08, lit);
  // white streaks flowing round the curl (the wall's face streaks carried over the top)
  float f = fbm(vec2(u * 22.0, s * 2.4 - uTime * 0.45) + 0.6 * vec2(fbm(vec2(u * 9.0, s * 1.3)), 0.0));
  float streak = smoothstep(0.56, 0.64, f) * smoothstep(0.04, 0.3, s);
  // the frothy leading edge, ragged along the lip
  float edge = smoothstep(0.7, 0.88, s + 0.16 * (fbm(vec2(u * 16.0, uTime * 0.7)) - 0.5));
  float foam = clamp(max(streak * 0.85, edge) + 0.3 * uDrop * smoothstep(0.3, 0.9, s), 0.0, 1.0);
  col = mix(col, uFoam, foam);
  col *= 1.0 + uFlash * 1.6;
  float dist = length(vWP - cameraPosition);
  col = mix(col, uFogC, smoothstep(uFogNear, uFogFar, dist) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;
export class Lip {
  mesh: THREE.Mesh;
  private NX = 120; private NS = 40;
  private pos: Float32Array; private mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D) {
    const { NX, NS } = this, nv = (NX + 1) * (NS + 1);
    this.pos = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2);
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NS; j++) { const k = i * (NS + 1) + j; uv[k * 2] = i / NX; uv[k * 2 + 1] = j / NS; }
    const g = new THREE.BufferGeometry(), idx: number[] = [];
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 2, d = a + NS + 1;
      idx.push(a, b, c, a, c, d);
    }
    g.setIndex(idx);
    const U = <T,>(v: T) => ({ value: v });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uBody: U(new THREE.Color()), uUnder: U(new THREE.Color()), uFoam: U(new THREE.Color()), uFogC: U(new THREE.Color()),
        uSun: U(new THREE.Vector3(0, 1, 0)), uTime: U(0), uFogNear: U(40), uFogFar: U(500), uFlash: U(0), uDrop: U(0) },
      vertexShader: LIP_VERT, fragmentShader: LIP_FRAG, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.visible = false;
    parent.add(this.mesh);
  }
  set(o: { x0: number; x1: number; zc: number; h: number; base: number; curl: number; drop: number; rz?: number; ry?: number; t: number; body: string; under: string; foam: string;
    fog?: string; fogNear?: number; fogFar?: number; sun?: THREE.Vector3; flash?: number }) {
    const { NX, NS } = this, RZ = o.rz ?? 0.36 * o.h, RY = o.ry ?? 0.36 * o.h, A = (o.curl * 200 * Math.PI) / 180;
    for (let i = 0; i <= NX; i++) {
      const u = i / NX, x = o.x0 + (o.x1 - o.x0) * u, ea = Math.min(1, u / 0.14), eb = Math.min(1, (1 - u) / 0.14);
      const edge = ea * ea * (3 - 2 * ea) * eb * eb * (3 - 2 * eb);
      const wob = 0.035 * Math.sin(u * 9 + o.t * 1.7) + 0.015 * Math.sin(u * 23 - o.t * 2.6);
      const rk = (0.55 + 0.45 * edge) * (1 + wob), top = o.base + o.h * (0.7 + 0.3 * edge) - o.drop * o.h * 0.85;
      for (let j = 0; j <= NS; j++) {
        const s = j / NS, a = A * s;
        const z = o.zc + RZ * rk * Math.sin(a) * (1 + 0.25 * o.drop), y = top + RY * rk * (Math.cos(a) - 1) - o.drop * s * s * o.h * 0.4;
        const k = (i * (NS + 1) + j) * 3;
        this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    const m = this.mat.uniforms;
    untone(o.body, m.uBody.value); untone(o.under, m.uUnder.value); untone(o.foam, m.uFoam.value); untone(o.fog ?? "#2d4b51", m.uFogC.value);
    if (o.sun) (m.uSun.value as THREE.Vector3).copy(o.sun);
    m.uTime.value = o.t; m.uFogNear.value = o.fogNear ?? 40; m.uFogFar.value = o.fogFar ?? 500; m.uFlash.value = o.flash ?? 0; m.uDrop.value = o.drop;
    this.mesh.visible = o.curl > 0.01 && o.drop < 0.99;
  }
  hide() { this.mesh.visible = false; }
}

// ---------------- textures for the galley ----------------
const tilesTex = () => ctex("galleyTiles", 512, 512, (g, r) => {
  g.fillStyle = "#e9dcc2"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const v = r() * 0.12;
    g.fillStyle = `rgb(${Math.round(46 + 30 * v)},${Math.round(122 + 30 * v)},${Math.round(104 + 25 * v)})`;
    g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(i * 64 + 8, j * 64 + 7, 22, 6);
  }
});
const portStormTex = () => ctex("portStorm", 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#2c4b51"); gr.addColorStop(0.55, "#1a3236"); gr.addColorStop(1, "#0d1d20");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(210,236,238,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const x = r() * 280 - 20, y = r() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 18, y + 46); g.stroke(); }
  g.fillStyle = "rgba(190,225,222,0.25)";
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(r() * 256, 170 + r() * 60, 40, 8, 0, 0, Math.PI * 2); g.fill(); }
});
export const canLabelTex = () => ctex("canLabelFa", 1024, 512, (g) => {
  g.fillStyle = "#c8463a"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#f2ece0"; g.fillRect(0, 120, 1024, 272);
  g.fillStyle = "#24393c"; g.font = "180px Lalezar, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.direction = "rtl"; g.fillText("روغن", 512, 262);
  g.fillStyle = "#e8b23a"; g.fillRect(0, 96, 1024, 20); g.fillRect(0, 396, 1024, 20);
});

// ---------------- the galley (origin = floor centre, the counter runs along x, the cook stands at z = -0.6 behind it) ----
/** galley layout (galley space): lamp = the hanging lamp's pivot (its glowing glass hangs 0.87 m below, at the cook's
 *  eye line + ~0.8 m so a hook shot holds both); lampLen = pivot -> glass centre */
export const GALLEY = { origin: V(0, -600, 0), counterTop: 1.0, cookZ: -0.75, bowl: V(0.62, 1.0, 0.05), can: V(-1.3, 1.0, 0.0), lamp: V(-0.7, 3.13, -0.1), lampLen: 1.02 };
export class Galley {
  root = new THREE.Group();
  lamp = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const b = new Batch(), wood = planksHD().clone(); wood.needsUpdate = true; wood.repeat.set(1, 1);
    const Mwall = lam("galleyWall", () => ({ map: wood, color: "#d8b088" })), Mfloor = lam("galleyFloor", () => ({ map: wood, color: "#b98a5c" }));
    const Mtile = lam("galleyTile", () => ({ map: tilesTex() })), Mcounter = lam("galleyCounter", () => ({ color: "#9a6a42" }));
    const Mtop = lam("galleyTop", () => ({ color: "#c08a56" })), Miron = lam("galleyIron", () => ({ color: "#34383f" }));
    const Mcop = lam("galleyCopper", () => ({ color: "#c8743a" })), Mbrass = lam("galleyBrass", () => ({ color: "#d9a441" }));
    const Mglass = new THREE.MeshBasicMaterial({ map: portStormTex() });
    const Mshelf = lam("galleyShelf", () => ({ color: "#7a5236" })), Mjar = lam("galleyJar", () => ({ color: "#e9dcc2" }));
    const Mcan = lam("oilCan", () => ({ map: canLabelTex() }));
    // room: floor, back wall (z = 1.6), side walls, ceiling beams; the tiled splash-back behind the stove
    b.add(new THREE.PlaneGeometry(8, 6).rotateX(-Math.PI / 2), Mfloor);
    b.add(new THREE.PlaneGeometry(8, 3.4).rotateY(Math.PI).translate(0, 1.7, 1.6), Mwall);
    for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(6, 3.4).rotateY(-s * Math.PI / 2).translate(s * 4, 1.7, -1.4), Mwall);
    for (let x = -3.5; x <= 3.5; x += 1.4) boxAt(b, Mshelf, x, 3.25, -0.6, 0.22, 0.24, 4.6);
    b.add(new THREE.PlaneGeometry(2.2, 1.3).rotateY(Math.PI).translate(1.5, 1.55, 1.59), Mtile);
    // brass porthole on the back wall, the storm outside
    const pq = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
    b.add(new THREE.TorusGeometry(0.36, 0.07, 10, 28), Mbrass, new THREE.Matrix4().compose(V(-1.25, 1.95, 1.56), pq, V(1, 1, 1)));
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; b.add(new THREE.SphereGeometry(0.035, 8, 6), Mbrass, new THREE.Matrix4().makeTranslation(-1.25 + 0.47 * Math.cos(a), 1.95 + 0.47 * Math.sin(a), 1.55)); }
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28).rotateY(Math.PI).translate(-1.25, 1.95, 1.585), Mglass);
    glass.layers.set(NOINK); this.root.add(glass);
    // counter (front, the cook behind it facing the lens at -z)
    boxAt(b, Mcounter, 0, 0.46, 0, 3.2, 0.92, 0.7);
    boxAt(b, Mtop, 0, 0.96, 0, 3.3, 0.08, 0.78);
    for (const x of [-1.1, 0, 1.1]) { boxAt(b, Mshelf, x, 0.46, -0.355, 0.95, 0.75, 0.02); b.add(new THREE.SphereGeometry(0.035, 8, 6), Mbrass, new THREE.Matrix4().makeTranslation(x + 0.36, 0.5, -0.37)); }
    // stove with a kettle and a stew pot, against the tiles
    boxAt(b, Miron, 1.5, 0.45, 1.2, 1.4, 0.9, 0.6);
    spar(b, Miron, V(1.95, 0.9, 1.35), V(1.95, 3.4, 1.35), 0.08, 0.08, 10);
    const kettle = [[0, 0], [0.2, 0.01], [0.24, 0.08], [0.25, 0.2], [0.18, 0.3], [0.08, 0.34], [0.06, 0.4], [0.0, 0.4]].map(([r, y]) => new THREE.Vector2(r, y));
    b.add(new THREE.LatheGeometry(kettle, 18), Mcop, new THREE.Matrix4().makeTranslation(1.15, 0.9, 1.15));
    spar(b, Mcop, V(1.38, 1.08, 1.15), V(1.6, 1.3, 1.15), 0.035, 0.02, 6);
    const pot = [[0, 0], [0.28, 0.0], [0.3, 0.06], [0.3, 0.34], [0.33, 0.36], [0.27, 0.36]].map(([r, y]) => new THREE.Vector2(r, y));
    b.add(new THREE.LatheGeometry(pot, 20), Mcop, new THREE.Matrix4().makeTranslation(1.75, 0.9, 1.15));
    // jars and bottles on the shelf above the counter
    for (let i = 0; i < 7; i++) {
      const x = -2.6 + i * 0.42, h = 0.2 + (i % 3) * 0.07;
      b.add(new THREE.CylinderGeometry(0.09, 0.1, h, 12), i % 2 ? Mjar : Mcop, new THREE.Matrix4().makeTranslation(x, 2.36 + h / 2, 1.42));
    }
    boxAt(b, Mshelf, -1.6, 2.33, 1.42, 2.6, 0.05, 0.3);
    // the oil can on the counter (label toward the lens)
    const can = new THREE.CylinderGeometry(0.11, 0.11, 0.3, 24, 1, false).rotateY(-Math.PI / 2);
    b.add(can, Mcan, new THREE.Matrix4().makeTranslation(GALLEY.can.x, GALLEY.can.y + 0.15, GALLEY.can.z));
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), Mbrass, new THREE.Matrix4().makeTranslation(GALLEY.can.x + 0.04, GALLEY.can.y + 0.33, GALLEY.can.z));
    b.build(this.root, true);
    // the hanging lamp (swings about its pivot under a ceiling beam): iron rod, brass frame, glowing glass lampLen below
    const lb = new Batch(), d = GALLEY.lampLen - 0.87;
    spar(lb, Miron, V(0, 0.02, 0), V(0, -0.7 - d, 0), 0.012, 0.012, 6);
    lb.add(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 14), Mbrass, new THREE.Matrix4().makeTranslation(0, -0.72 - d, 0));
    lb.add(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 14), Mbrass, new THREE.Matrix4().makeTranslation(0, -1.0 - d, 0));
    lb.build(this.lamp, true);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.55) }));
    glow.position.set(0, -GALLEY.lampLen, 0); glow.layers.set(NOINK); this.lamp.add(glow);
    this.lamp.position.copy(GALLEY.lamp);
    this.root.add(this.lamp);
    this.root.position.copy(GALLEY.origin);
    this.root.visible = false;
    parent.add(this.root);
  }
}

// ---------------- the soup bowl (seen from straight above): ripples where you blow, the oily spots stay smooth ----
const BOWL_FRAG = /* glsl */ `
uniform float uTime, uBlow; uniform vec3 uBroth, uBroth2, uOil, uHi, uDark, uBit1, uBit2;
uniform vec4 uSpots[6];
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 p = vUv * 2.0 - 1.0; float r = length(p);
  if (r > 1.0) discard;
  // oily spots: inside them the ripples die and the surface is glossy
  float oil = 0.0;
  for (int i = 0; i < 6; i++) { vec4 s = uSpots[i]; oil = max(oil, 1.0 - smoothstep(s.z * 0.82, s.z, length(p - s.xy))); }
  // ripples from the breath (coming from the bottom edge, -y), travelling up, fading with distance
  vec2 src = vec2(0.0, -1.35); float d = length(p - src);
  float wob = 0.5 * sin(p.x * 5.0 + uTime * 1.3) + 0.35 * sin(p.y * 7.0 - uTime * 1.7);
  float rip = sin(d * 30.0 - uTime * 8.0 + wob) * exp(-max(0.0, d - 0.3) * 1.05) * uBlow * (1.0 - oil);
  float band = smoothstep(-0.35, 0.35, rip), crest = smoothstep(0.55, 0.9, rip);
  vec3 col = mix(uBroth2, uBroth, mix(0.75, 0.25 + 0.75 * band, min(1.0, uBlow * 1.2)));
  col = mix(col, uHi, crest * 0.45);
  // the calm edge of each oily spot: a thin dark seam where the ripples stop
  float seam = 0.0;
  for (int i = 0; i < 6; i++) { vec4 s = uSpots[i]; float e = abs(length(p - s.xy) - s.z * 0.97); seam = max(seam, (1.0 - smoothstep(0.004, 0.016, e)) * uBlow); }
  col = mix(col, uDark, seam * 0.5);
  // the breath itself: three soft air lines drifting in from the near edge
  for (int i = 0; i < 3; i++) { float fi = float(i); float yy = -0.98 + fract(uTime * 0.35 + fi * 0.33) * 0.55;
    float ln = 1.0 - smoothstep(0.006, 0.02, abs(p.y - yy - 0.05 * sin(p.x * 7.0 + uTime * 3.0 + fi)));
    col = mix(col, vec3(1.0), ln * uBlow * 0.35 * (1.0 - smoothstep(0.35, 0.6, abs(p.x))) * (1.0 - fract(uTime * 0.35 + fi * 0.33))); }
  col = mix(col, uDark, smoothstep(0.78, 1.0, r) * 0.55);                    // the bowl's rim shadow
  // floating bits (herbs, carrot) bob on the ripples
  for (int i = 0; i < 14; i++) {
    float fi = float(i); vec2 c = vec2(hash(vec2(fi, 1.3)) * 1.4 - 0.7, hash(vec2(fi, 7.1)) * 1.4 - 0.7);
    c.y += 0.02 * sin(uTime * 3.0 + fi) * uBlow;
    float bit = 1.0 - smoothstep(0.035, 0.045, length(p - c));
    col = mix(col, mod(fi, 2.0) < 1.0 ? uBit1 : uBit2, bit);
  }
  col = mix(col, uOil, oil * 0.85);
  // glossy highlight crescent on each spot (light from the upper left)
  for (int i = 0; i < 6; i++) { vec4 s = uSpots[i]; vec2 q = (p - s.xy) / s.z; float h = smoothstep(0.55, 0.35, length(q - vec2(-0.32, 0.32))) * step(length(q), 0.85); col = mix(col, uHi, h * 0.85); }
  gl_FragColor = vec4(col, 1.0);
}`;
export class Bowl {
  root = new THREE.Group();
  mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D) {
    const b = new Batch(), Mbowl = lam("bowlCeramic", () => ({ color: "#f4f0e6" })), Mrim = lam("bowlRim", () => ({ color: "#2f7a6c" }));
    const prof = [[0.0, 0.0], [0.2, 0.0], [0.27, 0.06], [0.33, 0.16], [0.36, 0.2], [0.35, 0.215], [0.3, 0.2], [0.24, 0.13], [0.0, 0.11]].map(([r, y]) => new THREE.Vector2(r, y));
    b.add(new THREE.LatheGeometry(prof, 40), Mbowl);
    b.add(new THREE.TorusGeometry(0.352, 0.012, 6, 48).rotateX(Math.PI / 2).translate(0, 0.21, 0), Mrim);
    b.build(this.root, true);
    const U = <T,>(v: T) => ({ value: v });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U(0), uBlow: U(0), uBroth: U(untone("#f0b43c")), uBroth2: U(untone("#d68e22")), uOil: U(untone("#fbd65a")), uHi: U(untone("#fff3c4")),
        uDark: U(untone("#8f5a18")), uBit1: U(untone("#5f8f3a")), uBit2: U(untone("#e0703e")),
        uSpots: U([[0.25, 0.3, 0.22], [-0.35, 0.05, 0.16], [0.05, -0.38, 0.14], [-0.1, 0.48, 0.1], [0.45, -0.15, 0.11], [-0.48, -0.42, 0.09]].map(([x, y, r]) => new THREE.Vector4(x, y, r, 0))) },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: BOWL_FRAG,
    });
    const broth = new THREE.Mesh(new THREE.CircleGeometry(0.31, 48).rotateX(-Math.PI / 2).translate(0, 0.165, 0), this.mat);
    broth.layers.set(NOINK); this.root.add(broth);
    this.root.position.copy(GALLEY.origin).add(GALLEY.bowl);
    parent.add(this.root);
  }
  update(t: number, blow: number) { this.mat.uniforms.uTime.value = t; this.mat.uniforms.uBlow.value = blow; }
}

// ---------------- 2D effects ----------------
/** white storm spray (the crash): lobed puffs with a cool shaded underside, ink rim; 600 x 600 canvas, seed shapes it */
export const fxSpray = (p: Pen, seed: number, k = 1) => {
  const r = (i: number) => { const v = Math.sin(seed * 91.7 + i * 37.3) * 43758.5453; return v - Math.floor(v); };
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) lobes.push([300 + (r(i) - 0.5) * 340, 340 - r(i + 20) * 200 + (i % 3) * 30, (70 + r(i + 40) * 70) * k]);
  for (const [x, y, rr] of lobes) p.ell(x, y, rr + 9, rr + 9, INK, 0);
  for (const [x, y, rr] of lobes) p.ell(x, y, rr, rr, "#d9ecec", 0);
  for (const [x, y, rr] of lobes) p.ell(x - rr * 0.12, y - rr * 0.16, rr * 0.82, rr * 0.8, "#f6fbfb", 0);
  for (let i = 0; i < 10; i++) p.ell(300 + (r(i + 60) - 0.5) * 520, 120 + r(i + 80) * 380, 10 + r(i + 90) * 14, 12 + r(i + 95) * 16, "#f6fbfb", 6);
};
/** a burst of white water (the crash): inked tapering fingers shooting up from a white base, solid droplets;
 *  600 x 600 canvas, base at y 560, k 0..1 grows it */
export const fxBurst = (p: Pen, seed: number, k = 1) => {
  const r = (i: number) => { const v = Math.sin(seed * 91.7 + i * 37.3) * 43758.5453; return v - Math.floor(v); };
  const n = 7, cx = 300, base = 560;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.24 + (r(i) - 0.5) * 0.16, len = (200 + r(i + 10) * 230) * (0.35 + 0.65 * k), w0 = (40 + r(i + 20) * 26) * (0.6 + 0.4 * k);
    const x0 = cx + (i - (n - 1) / 2) * 46, tx = x0 + Math.cos(a) * len, ty = base + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
    const pts: [number, number][] = [[x0 - nx * w0, base - ny * w0 * 0.2], [tx - nx * w0 * 0.3, ty + 8], [tx - nx * w0 * 0.05, ty - 14], [tx + nx * w0 * 0.3, ty + 8], [x0 + nx * w0, base - ny * w0 * 0.2]];
    p.poly(pts, i % 2 ? "#e2f2f0" : "#f6fbfb", 9);
  }
  p.ell(cx, base - 6, 150 + 110 * k, 62, "#f6fbfb", 9);
  p.ell(cx - 40, base - 22, 90 + 60 * k, 26, "#ffffff", 0);
  for (let i = 0; i < 14; i++) {
    const x = cx + (r(i + 40) - 0.5) * 520 * (0.4 + 0.6 * k), y = base - (140 + r(i + 60) * 330) * (0.4 + 0.6 * k), s = 7 + r(i + 80) * 11;
    p.ell(x, y, s, s * 1.25, "#f6fbfb", 4);
  }
};
/** a plank flung by the crash, turned by ang; 200 x 200 canvas */
export const fxPlank = (p: Pen, ang: number) => {
  const c = Math.cos(ang), s = Math.sin(ang), R = (x: number, y: number): [number, number] => [100 + x * c - y * s, 100 + x * s + y * c];
  p.poly([R(-78, -16), R(78, -16), R(78, 16), R(-78, 16)], "#8a5a33", 7);
  p.line([R(-60, -3), R(56, -1)], "#5e3b20", 4, false);
};
/** small crown splash where the oil meets the sea: 400 x 300 canvas, t 0..1 loops */
export const fxOilSplash = (p: Pen, t: number) => {
  const rise = Math.sin(Math.PI * Math.min(1, t)), c = 200, base = 250;
  // the oil spreading on the water (no ink: it lies on the surface)
  p.ell(c, base + 6, 160, 20, "#f4c534", 0);
  p.ell(c, base + 4, 118, 13, "#fde68f", 0);
  // the crown: rounded fingers leaning out from the impact, pale gold with a thin ink line
  for (let i = 0; i < 7; i++) {
    const lean = (i - 3) * 0.33, h = (70 + 38 * Math.sin(i * 1.7 + 0.5)) * rise, x0 = c + (i - 3) * 24;
    const tx = x0 + Math.sin(lean) * h * 0.9, ty = base - h;
    p.poly([[x0 - 13, base], [tx - 7, ty + 10], [tx, ty - 4], [tx + 7, ty + 10], [x0 + 13, base]], i % 2 ? "#f6cf4a" : "#efb92c", 4);
    p.ell(tx, ty - 1, 7, 7, "#fffbe9", 0);
  }
  p.ell(c, base - 4, 46 * (0.6 + 0.4 * rise), 22 * (0.6 + 0.4 * rise), "#fffbe9", 4);
  // droplets thrown out
  for (let i = 0; i < 6; i++) {
    const ang = ((205 + i * 26) * Math.PI) / 180, d = 50 + 110 * t;
    p.ell(c + d * Math.cos(ang), 200 + d * Math.sin(ang) + 120 * t * t, 7 * (1 - t) + 3, 8 * (1 - t) + 3.5, i % 2 ? "#f4c534" : "#fffbe9", 0);
  }
};
