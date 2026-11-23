// Jamasp as a boy (shared character spec): a long tunic to mid-calf with side slits, a cloth sash, a small head
// wrap, simple trousers and sandals; slim, about 1.32 m. Built from smooth primitives, with a soft contact shadow.
import * as THREE from "three";
import { rnd } from "../lib";
import { sstep } from "./well-env";

const blobTex = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

export type Boy = ReturnType<typeof makeBoy>;

export const makeBoy = () => {
  const boy = new THREE.Group();
  const body = new THREE.Group();
  const M = (color: number, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });
  const wool = M(0x7a6248), sashM = M(0x5e2c22), trou = M(0x4a4034), wrapM = M(0xb6a68c), skin = M(0x9a6648, 0.7), leather = M(0x3a2818, 0.8);

  // tunic: an elliptical lathe, straight-hanging, slightly flared at the hem, with side slits and soft folds
  const prof: [number, number][] = [[0.0, 0.3], [0.165, 0.3], [0.162, 0.36], [0.152, 0.46], [0.138, 0.58], [0.122, 0.68], [0.118, 0.72], [0.128, 0.82], [0.134, 0.9], [0.13, 0.96], [0.1, 1.0], [0.05, 1.03], [0.0, 1.035]];
  const tg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  {
    const p = tg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const a = Math.atan2(z, x);
      const low = 1 - sstep(0.35, 0.7, y);
      const fold = (0.008 * Math.sin(a * 9 + 0.7) + 0.005 * Math.sin(a * 17 + y * 11)) * low;
      // side slits: the hem rises at the two sides
      const side = Math.max(0, Math.abs(Math.cos(a)) - 0.93) / 0.07;
      const k = (r + fold) / r;
      p.setXYZ(i, x * k, y + (y < 0.31 ? 0.13 * side : 0) + 0.006 * Math.sin(a * 6) * (1 - sstep(0.3, 0.34, y)), z * k);
    }
    tg.computeVertexNormals();
  }
  const tunic = new THREE.Mesh(tg, wool);
  tunic.scale.set(1.0, 1, 0.74);
  // sash, knotted at the left hip with hanging ends
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 32), sashM);
  sash.rotation.x = Math.PI / 2;
  sash.scale.set(1.0, 0.74, 1.4);
  sash.position.y = 0.7;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), sashM);
  knot.position.set(-0.11, 0.7, 0.04);
  const ends = [0, 1].map((i) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2 - i * 0.04, 0.008), sashM);
    e.position.set(-0.115 + i * 0.02, 0.6 + i * 0.02, 0.05);
    e.rotation.z = 0.1 - i * 0.18;
    return e;
  });
  body.add(tunic, sash, knot, ...ends);
  // trousers showing below the hem, bare ankles, sandals
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.3, 12), trou);
    leg.position.set(s * 0.062, 0.2, 0);
    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.06, 10), skin);
    ankle.position.set(s * 0.062, 0.05, 0);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), skin);
    foot.scale.set(0.95, 0.5, 2.1);
    foot.position.set(s * 0.064, 0.026, -0.04);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.2), leather);
    sole.position.set(s * 0.064, 0.006, -0.035);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), leather);
    strap.position.set(s * 0.064, 0.02, -0.07);
    strap.rotation.z = Math.PI;
    body.add(leg, ankle, foot, sole, strap);
  }
  // head, neck, a small wrapped head-cloth with a tail
  const headG = new THREE.Group();
  headG.position.y = 1.03;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.08, 12), skin);
  neck.position.y = 0.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 18), skin);
  head.scale.set(0.88, 1.08, 0.98);
  head.position.y = 0.115;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 8), skin);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.105, -0.082);
  const ears = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skin);
    e.scale.set(0.5, 1, 0.8);
    e.position.set(s * 0.072, 0.11, 0.005);
    return e;
  });
  const wrap = new THREE.Group();
  wrap.position.set(0, 0.155, 0.006);
  for (let i = 0; i < 4; i++) {
    const tr = new THREE.Mesh(new THREE.TorusGeometry(0.074 - i * 0.012, 0.022, 8, 24), wrapM);
    tr.rotation.set(Math.PI / 2 + (i % 2 ? 0.22 : -0.16), 0, (rnd(i + 3) - 0.5) * 0.3);
    tr.position.set(0, i * 0.018, (i % 2 ? 0.006 : -0.004));
    wrap.add(tr);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), wrapM);
  cap.position.y = 0.04;
  cap.scale.set(1, 0.8, 1);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.012), wrapM);
  tail.position.set(0.02, -0.06, 0.075);
  tail.rotation.x = 0.25;
  wrap.add(cap, tail);
  headG.add(neck, head, nose, ...ears, wrap);
  body.add(headG);
  // arms: sleeves widening to the cuff, slim hands
  const arm = (side: number) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.128, 0.93, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.24, 12), wool);
    up.position.y = -0.12;
    const el = new THREE.Group();
    el.position.y = -0.24;
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.2, 12), wool);
    fo.position.y = -0.1;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), skin);
    hand.scale.set(0.75, 1.6, 0.85);
    hand.position.y = -0.235;
    el.add(fo, hand);
    sh.add(up, el);
    return { sh, el, hand, meshes: [up, fo, hand] as THREE.Mesh[] };
  };
  const armL = arm(-1), armR = arm(1);
  boy.add(body, armL.sh, armR.sh);
  boy.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
  });
  // soft contact shadow under the feet
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(), color: 0x000000, transparent: true, opacity: 0.78, depthWrite: false }));
  blob.position.set(0, 0.004, -0.02);
  blob.renderOrder = 1;
  boy.add(blob);
  const showBody = (on: boolean) => {
    body.visible = on;
    blob.visible = on;
    for (const m of [...armL.meshes, ...armR.meshes]) m.visible = on;
  };
  return { boy, body, headG, armL, armR, blob, showBody };
};
