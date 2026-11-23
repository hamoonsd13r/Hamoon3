// Hollow Moon 3D · the heart of the moon: a small sun kept in a golden cage (twelve interlaced circles, two halves that can
// part like doors), inside an armillary sphere of four nested, engraved hoops that turn slowly on their hinges, with a
// polar rod and a few dark planets riding on the hoops.
import * as THREE from "three";
import { BUMP_GLSL } from "./ring";

export const CAGE_R = 11.5, SUN_R = 5.2;

function hoopGeometry(R: number, half: number, thick: number) {
  const ch = Math.min(0.09, thick * 0.3);
  const prof: [number, number][] = [[-half, thick / 2 - ch], [-half + ch, thick / 2], [half - ch, thick / 2], [half, thick / 2 - ch], [half, -thick / 2 + ch], [half - ch, -thick / 2], [-half + ch, -thick / 2], [-half, -thick / 2 + ch]];
  const NS = 360, NP = prof.length;
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
    for (let k = 0; k < NS; k++) { const A = base + k * 2, B = A + 1, D = A + 2, C = A + 3; idx.push(A, B, D, B, C, D); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aFace", new THREE.Float32BufferAttribute(face, 1));
  g.setIndex(idx);
  return g;
}

/** gold with an engraved, softly glowing inscription on the outer (face 1) and inner (face 5) sides of a hoop */
export function hoopMaterial(inscr: THREE.Texture, rep: number, shared: Record<string, THREE.IUniform>) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.66, 0.27), roughness: 0.32, metalness: 1 });
  const uni = { tInscr: { value: inscr }, uRep: { value: rep }, uInk: { value: new THREE.Vector4(1.0, 0.8, 0.5, 0.8) }, ...shared };
  m.userData.uni = uni;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aFace; varying float vFace; varying vec2 vUvH;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvFace = aFace; vUvH = uv;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${BUMP_GLSL}\nuniform sampler2D tInscr; uniform float uRep; uniform vec4 uInk; varying float vFace; varying vec2 vUvH;`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          float face = floor(vFace + 0.5);
          if (face == 1.0 || face == 5.0) {
            vec2 uv = vec2(vUvH.x * uRep, vUvH.y);
            if (face == 1.0) uv.x = -uv.x; else uv.y = 1.0 - uv.y;
            float e = texture2D(tInscr, uv).r;
            normal = hmBump(normal, -vViewPosition, -0.055 * e);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.06, 0.02), e * 0.85);
            roughnessFactor = mix(roughnessFactor, 0.6, e);
            totalEmissiveRadiance += uInk.rgb * (uInk.a * e);
          } else {
            // the edges of the hoop: a milled line of small notches
            float nt = step(0.5, fract(vUvH.x * uRep * 24.0));
            roughnessFactor = mix(0.28, 0.42, nt);
          }
        }`);
  };
  return m;
}

export type CoreRig = {
  group: THREE.Group;
  /** t = film time, open = 0…1 how far the doors of the cage stand apart, dir = side from which the lens arrives (hall space) */
  update: (t: number, open: number) => void;
  mats: THREE.MeshStandardMaterial[];
  sun: THREE.Mesh;
  setDoor: (dir: THREE.Vector3) => void;
};

export function buildCore(inscr: THREE.Texture, ornament: THREE.Texture, shared: Record<string, THREE.IUniform>): CoreRig {
  const group = new THREE.Group();
  const mats: THREE.MeshStandardMaterial[] = [];
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.72, 0.31), roughness: 0.27, metalness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.09, 0.055, 0.03), roughness: 0.22, metalness: 1 });
  const bronze = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.36, 0.22, 0.09), roughness: 0.42, metalness: 1 });
  mats.push(gold, dark, bronze);

  // ── the sun: a sphere of boiling light
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector4(1.0, 0.66, 0.3, 26) }, uNear: { value: 0 }, ...shared },
    vertexShader: /* glsl */ `varying vec3 vD; varying vec3 vN; varying vec3 vV; void main(){ vD = normalize(position); vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec4 uSun; uniform float uTime; uniform float uNear;
      varying vec3 vD; varying vec3 vN; varying vec3 vV;
      vec3 h3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
      float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i).x, h3(i + vec3(1, 0, 0)).x, f.x), mix(h3(i + vec3(0, 1, 0)).x, h3(i + vec3(1, 1, 0)).x, f.x), f.y),
                   mix(mix(h3(i + vec3(0, 0, 1)).x, h3(i + vec3(1, 0, 1)).x, f.x), mix(h3(i + vec3(0, 1, 1)).x, h3(i + vec3(1, 1, 1)).x, f.x), f.y), f.z); }
      // cellular noise: distance to the nearest and to the second nearest feature point (the points drift, so the cells boil)
      vec2 wor(vec3 x){
        vec3 i = floor(x), f = fract(x);
        float d1 = 9.0, d2 = 9.0;
        for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int c = -1; c <= 1; c++) {
          vec3 g = vec3(float(a), float(b), float(c));
          vec3 o = 0.5 + 0.42 * sin(uTime * 0.7 + 6.2831 * h3(i + g));
          vec3 r = g + o - f;
          float d = dot(r, r);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        return sqrt(vec2(d1, d2));
      }
      void main(){
        vec3 p = vD * 5.0 + vec3(0.0, uTime * 0.11, 0.0);
        float g = vn(p) * 0.5 + vn(p * 2.3 + 7.1) * 0.3 + vn(p * 5.1 - uTime * 0.2) * 0.2;
        float mu = max(dot(normalize(vN), normalize(vV)), 0.0);
        float ld = pow(mu, 0.7);
        float cells = smoothstep(0.3, 0.76, g);
        vec3 hot = vec3(1.0, 0.8, 0.46), mid = vec3(1.0, 0.56, 0.17), rim = vec3(0.95, 0.27, 0.045);
        vec3 col = mix(rim, mid, smoothstep(0.0, 0.5, ld));
        col = mix(col, hot, smoothstep(0.45, 1.0, ld));
        col *= uSun.a * (0.2 + 1.0 * ld) * (0.86 + 0.28 * cells);
        // from near the eye has closed down on it: what was a white ball is a boiling surface — golden granules,
        // orange lanes between them, a deeper limb (the colours are chosen before the tone curve, which turns a
        // bright orange into gold)
        vec3 q = vD * 17.0 + 1.3 * vec3(vn(vD * 4.0 + 3.1), vn(vD * 4.0 + 9.7), vn(vD * 4.0 - 4.2));
        vec2 w = wor(q);
        float lane = smoothstep(0.02, 0.2, w.y - w.x);   // 0 on the border between two cells
        float heart = 1.0 - smoothstep(0.0, 0.55, w.x);  // 1 in the middle of a cell
        vec3 nc = mix(vec3(1.0, 0.27, 0.03), vec3(1.0, 0.4, 0.07), lane);
        nc = mix(nc, vec3(1.0, 0.5, 0.11), lane * heart);
        float nl = (1.25 + 1.0 * lane + 0.8 * lane * heart) * (0.75 + 0.5 * cells) * (0.4 + 0.6 * ld);
        col = mix(col, nc * nl, uNear);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 40), sunMat);
  sun.layers.enable(1);
  group.add(sun);
  // corona: a shell seen from the inside out, brightest where the line of sight passes closest to the sun
  {
    const cm = new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uSun: sunMat.uniforms.uSun },
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `precision highp float; uniform vec4 uSun; varying vec3 vN; varying vec3 vV;
        void main(){ float mu = abs(dot(normalize(vN), normalize(vV))); float k = pow(mu, 3.2); gl_FragColor = vec4(vec3(1.0, 0.52, 0.15) * (1.0 * k), 1.0); }`,
    });
    const corona = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.85, 48, 32), cm);
    corona.renderOrder = 5;
    group.add(corona);
  }

  // ── the cage: twelve circles around the corners of an icosahedron, each through the centres of five faces
  const cage = new THREE.Group();
  const halves = [new THREE.Group(), new THREE.Group()];
  cage.add(halves[0], halves[1]);
  group.add(cage);
  const tphi = (1 + Math.sqrt(5)) / 2;
  const verts: THREE.Vector3[] = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) { verts.push(new THREE.Vector3(0, s1, s2 * tphi).normalize(), new THREE.Vector3(s1, s2 * tphi, 0).normalize(), new THREE.Vector3(s1 * tphi, 0, s2).normalize()); }
  const alpha = 37.377 * (Math.PI / 180);
  const circleG = new THREE.TorusGeometry(CAGE_R * Math.sin(alpha), 0.19, 10, 140);
  const smallG = new THREE.TorusGeometry(CAGE_R * Math.sin(alpha * 0.5), 0.12, 8, 84);
  const knobG = new THREE.SphereGeometry(0.34, 14, 10);
  type CageItem = { mesh: THREE.Object3D; axis: THREE.Vector3 };
  const items: CageItem[] = [];
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (const v of verts) {
    const q = new THREE.Quaternion().setFromUnitVectors(zAxis, v);
    const c = new THREE.Mesh(circleG, bronze);
    c.quaternion.copy(q); c.position.copy(v).multiplyScalar(CAGE_R * Math.cos(alpha));
    const s = new THREE.Mesh(smallG, bronze);
    s.quaternion.copy(q); s.position.copy(v).multiplyScalar(CAGE_R * Math.cos(alpha * 0.5));
    const k = new THREE.Mesh(knobG, gold);
    k.position.copy(v).multiplyScalar(CAGE_R + 0.05);
    void k;
    for (const m of [c, s]) { m.castShadow = true; items.push({ mesh: m, axis: v }); }
  }
  let door = new THREE.Vector3(1, 0, 0);
  const side = new THREE.Vector3();
  const setDoor = (dir: THREE.Vector3) => {
    door = dir.clone().normalize();
    // the doors part sideways as seen by the arriving lens
    side.crossVectors(door, new THREE.Vector3(0, 1, 0)).normalize();
    for (const g of halves) g.clear();
    for (const it of items) halves[it.axis.dot(side) >= 0 ? 0 : 1].add(it.mesh);
  };
  setDoor(door);

  // ── the armillary: four nested hoops, each hinged on a diameter of the one outside it
  const defs = [
    { R: 44, half: 1.55, thick: 0.46, rep: 6, tilt: 0.3, axis: "x", w: 0.11, ph: 0.4, text: true },
    { R: 36, half: 1.3, thick: 0.42, rep: 5, tilt: 1.15, axis: "z", w: -0.05, ph: 1.9, text: false },
    { R: 28.5, half: 1.15, thick: 0.4, rep: 5, tilt: -0.3, axis: "x", w: 0.14, ph: 3.1, text: true },
    { R: 21.5, half: 1.0, thick: 0.36, rep: 4, tilt: 0.95, axis: "z", w: -0.09, ph: 0.9, text: false },
  ] as const;
  const pinG = new THREE.CylinderGeometry(0.22, 0.22, 1, 10);
  const hoops: { pivot: THREE.Group; def: (typeof defs)[number] }[] = [];
  let parent: THREE.Object3D = group;
  let prevR = 50;
  defs.forEach((d, i) => {
    const pivot = new THREE.Group();
    parent.add(pivot);
    const hm = hoopMaterial(d.text ? inscr : ornament, d.rep, shared);
    mats.push(hm);
    const hoop = new THREE.Mesh(hoopGeometry(d.R, d.half, d.thick), hm);
    hoop.castShadow = true; hoop.receiveShadow = true;
    pivot.add(hoop);
    // hinge pins towards the hoop outside, along the hinge axis (the first one hangs on the polar rod instead)
    if (i > 0) {
      for (const sg of [-1, 1]) {
        const pin = new THREE.Mesh(pinG, gold);
        const len = prevR - d.R;
        pin.scale.set(1, len, 1);
        if (d.axis === "x") { pin.rotation.z = Math.PI / 2; pin.position.set(sg * (d.R + len / 2), 0, 0); }
        else { pin.rotation.x = Math.PI / 2; pin.position.set(0, 0, sg * (d.R + len / 2)); }
        pin.castShadow = true;
        pivot.add(pin);
      }
    }
    // a planet on a short stalk
    {
      const a = 0.9 + i * 1.7, pr = 1.5 + 0.45 * ((i * 7) % 3);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(pr, 32, 20), dark);
      planet.position.set(Math.cos(a) * (d.R - pr - 1.1), 0, Math.sin(a) * (d.R - pr - 1.1));
      planet.castShadow = true; planet.receiveShadow = true;
      const stalk = new THREE.Mesh(pinG, gold);
      stalk.scale.set(0.6, 1.3, 0.6);
      stalk.position.set(Math.cos(a) * (d.R - 0.6), 0, Math.sin(a) * (d.R - 0.6));
      stalk.rotation.z = Math.PI / 2; stalk.rotation.y = -a;
      pivot.add(planet, stalk);
    }
    hoops.push({ pivot, def: d });
    parent = pivot;
    prevR = d.R;
  });
  // polar rod with finials
  {
    const rod = new THREE.Group();
    rod.rotation.z = -0.41;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 112, 12), gold);
    shaft.castShadow = true;
    rod.add(shaft);
    for (const sg of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), gold);
      f.position.y = sg * 56;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 16), gold);
      c.position.y = sg * 58.2; c.rotation.z = sg > 0 ? 0 : Math.PI;
      rod.add(f, c);
    }
    // the rod is cut away where it would pass through the sun and its cage
    const gap = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12), gold);
    gap.visible = false;
    rod.add(gap);
    (shaft as THREE.Mesh).geometry = mergeRod() as unknown as THREE.CylinderGeometry;
    group.add(rod);
  }
  function mergeRod() {
    const up = new THREE.CylinderGeometry(0.3, 0.3, 56 - CAGE_R - 0.4, 12).translate(0, (56 + CAGE_R + 0.4) / 2, 0);
    const dn = new THREE.CylinderGeometry(0.3, 0.3, 56 - CAGE_R - 0.4, 12).translate(0, -(56 + CAGE_R + 0.4) / 2, 0);
    const g = new THREE.BufferGeometry();
    const pa = up.getAttribute("position").array as Float32Array, pb = dn.getAttribute("position").array as Float32Array;
    const na = up.getAttribute("normal").array as Float32Array, nb = dn.getAttribute("normal").array as Float32Array;
    const ia = up.index!.array as Uint16Array, ib = dn.index!.array as Uint16Array;
    const pos = new Float32Array(pa.length + pb.length), nor = new Float32Array(na.length + nb.length), idx = new Uint32Array(ia.length + ib.length);
    pos.set(pa); pos.set(pb, pa.length); nor.set(na); nor.set(nb, na.length);
    idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + pa.length / 3;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }

  const update = (t: number, open: number) => {
    for (const h of hoops) {
      // hoops with the name sway around their tilt, the ornamental ones turn right round
      const a = h.def.text ? h.def.tilt + 0.32 * Math.sin(h.def.w * t + h.def.ph) : h.def.tilt + h.def.w * t;
      if (h.def.axis === "x") h.pivot.rotation.set(a, 0, 0); else h.pivot.rotation.set(0, 0, a);
    }
    cage.rotation.set(0, 0, 0);
    // the cage turns slowly; while the doors open it comes to rest facing the lens
    const spin = (1 - open) * (0.05 * t);
    cage.rotateOnAxis(door, spin);
    const e = open * open * (3 - 2 * open);
    halves[0].position.copy(side).multiplyScalar(e * 6.2);
    halves[1].position.copy(side).multiplyScalar(-e * 6.2);
    halves[0].rotation.set(0, 0, 0); halves[1].rotation.set(0, 0, 0);
    halves[0].rotateOnAxis(door, e * 0.5);
    halves[1].rotateOnAxis(door, e * 0.5);
  };
  update(0, 0);
  return { group, update, mats, sun, setDoor };
}
