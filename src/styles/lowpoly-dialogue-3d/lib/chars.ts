// The two characters, low-poly and flat-shaded (like the reference): a young man in a hoodie and a small white robot.
// Both are built facing +z, sitting with the seat at the group origin (the laptop's top edge). Units ≈ metres of a
// toy world: sitting height ≈ 1. Every joint is a Group so the director can pose them with plain rotations.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rnd } from "./theme";

const flat = (color: string, rough = 0.62, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};
const joint = (parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};
/** a limb segment hanging down from its joint (−y), n-sided, slightly tapered */
const limb = (r0: number, r1: number, len: number, mat: THREE.Material, sides = 6) => {
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1);
  g.translate(0, -len / 2, 0);
  return new THREE.Mesh(g, mat);
};
/** jitter the vertices of a geometry a little (hand-made low-poly feel), welding shared corners */
const jitter = (g: THREE.BufferGeometry, amt: number, seed: number) => {
  const p = g.attributes.position as THREE.BufferAttribute;
  const key = (i: number) => `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
  const off = new Map<string, THREE.Vector3>();
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    if (!off.has(k)) {
      const n = off.size + seed * 97;
      off.set(k, new THREE.Vector3(rnd(n * 1.3) - 0.5, rnd(n * 2.1) - 0.5, rnd(n * 3.7) - 0.5).multiplyScalar(amt));
    }
  }
  for (let i = 0; i < p.count; i++) {
    const o = off.get(key(i))!;
    p.setXYZ(i, p.getX(i) + o.x, p.getY(i) + o.y, p.getZ(i) + o.z);
  }
  g.computeVertexNormals();
  return g;
};

export type Arm = { sh: THREE.Group; el: THREE.Group; hand: THREE.Group };
export type Leg = { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group };

// ─────────────────────────────────────────────────────────────── the man
export function buildHuman() {
  const SKIN = flat("#EDB497", 0.7);
  const SKIN_D = flat("#D9967A", 0.75);
  const HOOD = flat("#34407E", 0.78);
  const HOOD_D = flat("#2A3366", 0.8);
  const JEANS = flat("#232A4A", 0.85);
  const SHOE = flat("#E4E2EA", 0.6);
  const SOLE = flat("#2A2A33", 0.7);
  const HAIR = flat("#3A2A20", 0.55);
  const DARK = new THREE.MeshStandardMaterial({ color: "#151018", roughness: 0.4 });
  const MOUTH = new THREE.MeshStandardMaterial({ color: "#5A1F22", roughness: 0.6 });

  const root = new THREE.Group();
  const pelvis = joint(root, 0, 0.07, 0);
  pelvis.add(mesh(jitter(new THREE.CylinderGeometry(0.19, 0.2, 0.14, 7, 1), 0.01, 3), JEANS, 0, 0, 0));
  const torso = joint(pelvis, 0, 0.04, 0);
  // hoodie body: a 7-sided tapered prism, flattened front-back
  const tg = jitter(new THREE.CylinderGeometry(0.17, 0.205, 0.42, 7, 2), 0.012, 5);
  tg.translate(0, 0.21, 0);
  const tm = new THREE.Mesh(tg, HOOD);
  tm.scale.set(1, 1, 0.74);
  torso.add(tm);
  // kangaroo pocket + drawstrings + hood ring
  const pocket = mesh(new RoundedBoxGeometry(0.2, 0.09, 0.03, 1, 0.012), HOOD_D, 0, 0.11, 0.135);
  pocket.rotation.x = -0.12;
  torso.add(pocket);
  for (const s of [-1, 1]) {
    const str = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), SHOE, s * 0.035, 0.34, 0.13);
    str.rotation.x = 0.15;
    torso.add(str);
  }
  const hood = mesh(new THREE.TorusGeometry(0.12, 0.055, 5, 9, Math.PI * 1.25), HOOD_D, 0, 0.42, -0.02);
  hood.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.875 + Math.PI / 2);
  torso.add(hood);

  const neck = joint(torso, 0, 0.43, 0);
  neck.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 6), SKIN_D, 0, 0.03, 0));
  const head = joint(neck, 0, 0.07, 0.01);
  const hg = jitter(new THREE.IcosahedronGeometry(0.2, 1), 0.018, 11);
  const hm = new THREE.Mesh(hg, SKIN);
  hm.scale.set(1, 1.08, 0.94);
  hm.position.y = 0.17;
  head.add(hm);
  // chin/jaw block (gives the faceted jaw of the reference)
  const jaw = mesh(jitter(new RoundedBoxGeometry(0.22, 0.09, 0.16, 1, 0.03), 0.01, 13), SKIN, 0, 0.06, 0.045);
  head.add(jaw);
  const nose = mesh(new THREE.ConeGeometry(0.032, 0.075, 4), SKIN_D, 0, 0.15, 0.2);
  nose.rotation.x = Math.PI / 2 + 0.25;
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(jitter(new RoundedBoxGeometry(0.04, 0.08, 0.06, 1, 0.012), 0.006, 17 + s), SKIN_D, s * 0.198, 0.165, -0.005);
    head.add(ear);
  }
  const eyes: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.021, 8, 6), DARK, s * 0.072, 0.195, 0.178);
    e.scale.set(1, 1.35, 0.5);
    head.add(e);
    eyes.push(e);
    const b = mesh(new RoundedBoxGeometry(0.065, 0.016, 0.02, 1, 0.006), HAIR, s * 0.074, 0.255, 0.18);
    head.add(b);
    brows.push(b);
  }
  const mouth = mesh(new RoundedBoxGeometry(0.075, 0.014, 0.02, 1, 0.006), MOUTH, 0, 0.088, 0.183);
  head.add(mouth);
  // hair: a cap + spikes pointing up/back (the reference's spiky low-poly hair)
  const capG = jitter(new THREE.IcosahedronGeometry(0.215, 1), 0.02, 23);
  const cap = new THREE.Mesh(capG, HAIR);
  cap.scale.set(1.0, 0.72, 0.98);
  cap.position.set(0, 0.255, -0.025);
  head.add(cap);
  const SP: [number, number, number, number, number, number][] = [
    // x, y, z, len, tilt-forward(x rot), tilt-side(z rot)
    [0, 0.38, 0.06, 0.15, 0.55, 0],
    [-0.08, 0.37, 0.05, 0.14, 0.45, 0.45],
    [0.08, 0.37, 0.05, 0.14, 0.45, -0.45],
    [-0.13, 0.33, -0.02, 0.13, 0.1, 0.9],
    [0.13, 0.33, -0.02, 0.13, 0.1, -0.9],
    [0, 0.37, -0.06, 0.16, -0.4, 0],
    [-0.07, 0.35, -0.11, 0.14, -0.75, 0.4],
    [0.07, 0.35, -0.11, 0.14, -0.75, -0.4],
    [0, 0.3, -0.17, 0.13, -1.25, 0],
    [-0.16, 0.27, 0.07, 0.1, 0.6, 1.0],
    [0.16, 0.27, 0.07, 0.1, 0.6, -1.0],
  ];
  SP.forEach(([x, y, z, len, rx, rz], i) => {
    const g = new THREE.ConeGeometry(0.055 + 0.012 * rnd(i), len, 4);
    g.translate(0, len / 2 - 0.02, 0);
    const s = new THREE.Mesh(g, HAIR);
    s.position.set(x, y, z);
    s.rotation.set(rx, rnd(i + 9) * 1.5, rz);
    head.add(s);
  });

  const mkArm = (s: number): Arm => {
    const sh = joint(torso, s * 0.205, 0.39, 0);
    sh.add(mesh(new THREE.SphereGeometry(0.068, 6, 5), HOOD, 0, 0, 0));
    sh.add(limb(0.064, 0.058, 0.2, HOOD));
    const el = joint(sh, 0, -0.2, 0);
    el.add(mesh(new THREE.SphereGeometry(0.058, 6, 4), HOOD, 0, 0, 0));
    el.add(limb(0.057, 0.05, 0.17, HOOD));
    el.add(mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 6), HOOD_D, 0, -0.17, 0));
    const hand = joint(el, 0, -0.18, 0);
    hand.add(mesh(jitter(new RoundedBoxGeometry(0.06, 0.075, 0.045, 1, 0.015), 0.006, 31 + s), SKIN, 0, -0.035, 0));
    const th = mesh(new RoundedBoxGeometry(0.022, 0.045, 0.025, 1, 0.008), SKIN, -s * 0.032, -0.02, 0.012);
    th.rotation.z = -s * 0.5;
    hand.add(th);
    return { sh, el, hand };
  };
  const mkLeg = (s: number): Leg => {
    const hip = joint(pelvis, s * 0.095, 0, 0);
    hip.add(limb(0.082, 0.07, 0.3, JEANS));
    const knee = joint(hip, 0, -0.3, 0);
    knee.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), JEANS, 0, 0, 0));
    knee.add(limb(0.068, 0.058, 0.27, JEANS));
    const ankle = joint(knee, 0, -0.27, 0);
    const shoe = new THREE.Group();
    shoe.add(mesh(new RoundedBoxGeometry(0.105, 0.075, 0.19, 2, 0.025), SHOE, 0, -0.03, 0.035));
    shoe.add(mesh(new RoundedBoxGeometry(0.11, 0.025, 0.2, 1, 0.01), SOLE, 0, -0.072, 0.035));
    ankle.add(shoe);
    return { hip, knee, ankle };
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const legL = mkLeg(-1), legR = mkLeg(1);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { root, pelvis, torso, neck, head, eyes, brows, mouth, armL, armR, legL, legR };
}
export type Human = ReturnType<typeof buildHuman>;

// ─────────────────────────────────────────────────────────────── the robot
export function buildRobot(face: THREE.Texture, chest: THREE.Texture) {
  const WHITE = flat("#ECEAF2", 0.5);
  const WHITE_D = flat("#D6D3E0", 0.55);
  const JOINT = flat("#33323C", 0.5, 0.3);
  const VISOR = new THREE.MeshStandardMaterial({ color: "#07070A", roughness: 0.18, metalness: 0.4 });
  const faceMat = new THREE.MeshBasicMaterial({ map: face, transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
  const chestMat = new THREE.MeshBasicMaterial({ map: chest, transparent: true, toneMapped: false, depthWrite: false, color: new THREE.Color(2.2, 2.2, 2.2) });
  const BULB = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.9), toneMapped: false });

  const root = new THREE.Group();
  const pelvis = joint(root, 0, 0.075, 0);
  pelvis.add(mesh(new RoundedBoxGeometry(0.34, 0.12, 0.26, 2, 0.04), WHITE_D, 0, 0, 0));
  const torso = joint(pelvis, 0, 0.05, 0);
  torso.add(mesh(new RoundedBoxGeometry(0.42, 0.42, 0.3, 2, 0.06), WHITE, 0, 0.22, 0));
  // chest plate (slightly raised) + the glowing core light on it
  torso.add(mesh(new RoundedBoxGeometry(0.3, 0.28, 0.03, 2, 0.02), WHITE_D, 0, 0.23, 0.145));
  const emblem = mesh(new THREE.PlaneGeometry(0.27, 0.27), chestMat, 0, 0.23, 0.162);
  torso.add(emblem);
  // shoulder caps
  for (const s of [-1, 1]) torso.add(mesh(new RoundedBoxGeometry(0.1, 0.1, 0.22, 2, 0.03), WHITE_D, s * 0.215, 0.39, 0));
  const neck = joint(torso, 0, 0.44, 0);
  neck.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.07, 8), JOINT, 0, 0.02, 0));
  const head = joint(neck, 0, 0.06, 0);
  head.add(mesh(new RoundedBoxGeometry(0.52, 0.4, 0.38, 2, 0.07), WHITE, 0, 0.2, 0));
  const visor = mesh(new RoundedBoxGeometry(0.44, 0.27, 0.06, 2, 0.04), VISOR, 0, 0.2, 0.168);
  head.add(visor);
  const facePlane = mesh(new THREE.PlaneGeometry(0.4, 0.245), faceMat, 0, 0.2, 0.2);
  head.add(facePlane);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 10), WHITE_D, s * 0.285, 0.2, 0);
    ear.rotation.z = Math.PI / 2;
    head.add(ear);
    const nub = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), JOINT, s * 0.32, 0.2, 0);
    nub.rotation.z = Math.PI / 2;
    head.add(nub);
  }
  const antenna = joint(head, 0, 0.4, -0.02);
  antenna.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.2, 6), JOINT, 0, 0.1, 0));
  const bulb = mesh(new THREE.IcosahedronGeometry(0.038, 1), BULB, 0, 0.215, 0);
  antenna.add(bulb);

  const mkArm = (s: number): Arm => {
    const sh = joint(torso, s * 0.27, 0.38, 0);
    sh.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), JOINT, 0, 0, 0));
    sh.add(mesh(new RoundedBoxGeometry(0.1, 0.19, 0.1, 2, 0.03), WHITE, 0, -0.105, 0));
    const el = joint(sh, 0, -0.2, 0);
    el.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), JOINT, 0, 0, 0));
    el.add(mesh(new RoundedBoxGeometry(0.095, 0.16, 0.095, 2, 0.03), WHITE, 0, -0.09, 0));
    const hand = joint(el, 0, -0.18, 0);
    hand.add(mesh(new RoundedBoxGeometry(0.085, 0.08, 0.06, 2, 0.025), WHITE_D, 0, -0.035, 0));
    const th = mesh(new RoundedBoxGeometry(0.03, 0.05, 0.035, 1, 0.012), WHITE_D, -s * 0.045, -0.02, 0.015);
    th.rotation.z = -s * 0.4;
    hand.add(th);
    return { sh, el, hand };
  };
  const mkLeg = (s: number): Leg => {
    const hip = joint(pelvis, s * 0.1, -0.01, 0);
    hip.add(mesh(new RoundedBoxGeometry(0.13, 0.26, 0.13, 2, 0.035), WHITE, 0, -0.13, 0));
    const knee = joint(hip, 0, -0.27, 0);
    knee.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), JOINT, 0, 0, 0));
    knee.add(mesh(new RoundedBoxGeometry(0.12, 0.22, 0.12, 2, 0.035), WHITE, 0, -0.12, 0));
    const ankle = joint(knee, 0, -0.24, 0);
    ankle.add(mesh(new RoundedBoxGeometry(0.14, 0.07, 0.2, 2, 0.03), WHITE_D, 0, -0.03, 0.035));
    return { hip, knee, ankle };
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const legL = mkLeg(-1), legR = mkLeg(1);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== facePlane && o !== emblem && o !== bulb) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { root, pelvis, torso, neck, head, antenna, bulb, faceMat, chestMat, emblem, armL, armR, legL, legR };
}
export type Robot = ReturnType<typeof buildRobot>;

/** sitting pose base: thighs forward over the edge, shins hanging down; `swing` swings the lower legs */
export function sitLegs(l: Leg, swing: number, spread = 0.06, side = 1) {
  l.hip.rotation.set(-Math.PI / 2 + 0.08, 0, side * spread);
  l.knee.rotation.set(Math.PI / 2 - 0.12 + swing, 0, 0);
  l.ankle.rotation.set(-0.15 - swing * 0.4, 0, 0);
}
/** arm pose: pitch (forward +), out (away from the body +), elbow bend (+), twist */
export function setArm(a: Arm, side: number, pitch: number, out: number, bend: number, twist = 0, wrist = 0) {
  a.sh.rotation.set(-pitch, side * twist, side * out, "XZY");
  a.el.rotation.set(-bend, 0, 0);
  a.hand.rotation.set(-wrist, 0, 0);
}
