// Set: the stair down to the serpents' hall, shot 33.3 – 36.3 («So Jamasp… led them down»).
// A vaulted stair comes down through the rock and opens onto a ledge high on the wall of the serpent hall; a second
// flight runs on down the rock face into the dark. The camera hangs in the air in front of the ledge, at the foot of
// the stair, looking up it: Jamasp comes down toward the lens one step every half second, head bowed, a candle in his
// hands lighting his face from below, five soldiers close behind him with torches, spears and shields. On «down» the
// camera cranes back and tilts down over the ledge to reveal the hall far below and its blue shaft of light.
import * as THREE from "three";
import { CUE, clamp, ease, lerp, noise1, ramp, rnd } from "../lib";
import { Board, Flame, dust } from "../kit";
import type { Sil } from "../tex";
import { STAIR, V, type Ctx, type SetMod, type Shot } from "./common";
import { BeamCard, Puffs, SilFig, pbr } from "./c-kit";
import { jamaspC, soldierC } from "./c-tex";

const RISE = 0.18, RUN = 0.3, NST = 26, HALF = 1.05, SPRING = 2.25;
/** the face of the rock the stair comes out of, and the ledge in front of it */
const FACE = 0.6, LEDGE = 2.4, FLOOR = -4.5;
const lineY = (z: number) => Math.max(0, -z) * (RISE / RUN);

export const buildStairs = (c: Ctx): SetMod => {
  const { T, mk, flames } = c;
  const st = mk("stairs", STAIR);
  const add = <O extends THREE.Object3D>(m: O, cast = false, recv = true) => {
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = cast;
        o.receiveShadow = recv;
      }
    });
    st.add(m);
    return m;
  };
  /** a plane whose UVs are scaled to metres / tile so one material tiles evenly on every face */
  const quad = (w: number, h: number, tile: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
    return g;
  };
  const box = (w: number, h: number, d: number, tile: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const nm = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(nm.getX(i)), ay = Math.abs(nm.getY(i));
      const su = ax > 0.5 ? d : w, sv = ay > 0.5 ? d : h;
      uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
    }
    return g;
  };

  // ---------------- the upper stair in its vaulted passage ----------------
  const stepM = pbr(T, "large_sandstone_blocks_01", 1, 1, { tint: 0x8a7662, rough: 1, nScale: 1.4 });
  const riserM = pbr(T, "medieval_blocks_03", 1, 1, { tint: 0x6a5a4a, rough: 1, nScale: 1.3 });
  for (let i = 0; i < NST; i++) {
    const y = (i + 1) * RISE + (rnd(i * 3.1) - 0.5) * 0.012;
    const z0 = -i * RUN, z1 = -(i + 1) * RUN;
    const tread = new THREE.Mesh(quad(HALF * 2, RUN + 0.03, 1.4), stepM);
    tread.rotation.x = -Math.PI / 2;
    tread.rotation.z = (rnd(i * 7.7) - 0.5) * 0.012;
    tread.position.set(0, y, (z0 + z1) / 2 + 0.01);
    add(tread);
    const riser = new THREE.Mesh(quad(HALF * 2, RISE, 1.0), riserM);
    riser.position.set(0, y - RISE / 2, z0 + 0.015);
    add(riser);
  }
  const wallM = pbr(T, "rustic_stone_wall", 1, 1, { tint: 0x5e5044, rough: 1, nScale: 1.5 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(quad(13, 12, 1.8), wallM);
    w.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    w.position.set(s * HALF, 4, FACE - 6.5);
    add(w);
  }
  const vaultM = pbr(T, "castle_wall_slates", 1, 1, { tint: 0x584a3e, rough: 1, nScale: 1.4, side: THREE.BackSide });
  const slope = Math.atan2(RISE, RUN);
  const vlen = (NST * RUN + 1) / Math.cos(slope);
  const vg = new THREE.CylinderGeometry(HALF, HALF, vlen, 28, 1, true, -Math.PI / 2, Math.PI);
  const vuv = vg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < vuv.count; i++) vuv.setXY(i, (vuv.getX(i) * Math.PI * HALF) / 1.6, (vuv.getY(i) * vlen) / 1.6);
  const vault = new THREE.Mesh(vg, vaultM);
  vault.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, Math.sin(slope), -Math.cos(slope)));
  const vmid = -(NST * RUN) / 2;
  vault.position.set(0, lineY(vmid) + SPRING, vmid);
  add(vault);
  const lv = new THREE.Mesh(new THREE.CylinderGeometry(HALF, HALF, FACE + 0.1, 28, 1, true, -Math.PI / 2, Math.PI), vaultM);
  lv.rotation.x = -Math.PI / 2;
  lv.position.set(0, SPRING, FACE / 2);
  add(lv);
  const ribM = pbr(T, "large_sandstone_blocks_01", 0.3, 2, { tint: 0x6a5a4a, rough: 1 });
  for (const z of [-2.1, -4.2, -6.3]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(HALF - 0.02, 0.09, 8, 28, Math.PI), ribM);
    rib.scale.set(1, 1 / Math.cos(slope), 1);
    rib.position.set(0, lineY(z) + SPRING, z);
    add(rib);
    for (const s of [-1, 1]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.16, SPRING + 0.4, 0.22), ribM);
      pil.position.set(s * (HALF - 0.05), lineY(z) + SPRING / 2 - 0.2, z);
      add(pil);
    }
  }

  // ---------------- the rock face of the hall, the doorway, the ledge, the flight down the face ----------------
  const rockM = pbr(T, "rustic_stone_wall", 1, 1, { tint: 0x4e4238, rough: 1, nScale: 1.6 });
  const face = new THREE.Shape();
  face.moveTo(-10, FLOOR - 0.5);
  face.lineTo(14, FLOOR - 0.5);
  face.lineTo(14, 9);
  face.lineTo(-10, 9);
  face.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-HALF, -0.05);
  hole.lineTo(HALF, -0.05);
  hole.lineTo(HALF, SPRING);
  hole.absarc(0, SPRING, HALF, 0, Math.PI, false);
  hole.lineTo(-HALF, -0.05);
  face.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(face, { depth: 0.4, bevelEnabled: false });
  const fuv = fg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) / 2.2, fuv.getY(i) / 2.2);
  add(new THREE.Mesh(fg, rockM)).position.set(0, 0, FACE);
  // a carved arch frame around the doorway
  const archM = pbr(T, "large_sandstone_blocks_01", 0.4, 0.4, { tint: 0x7a6650, rough: 1 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(HALF + 0.12, 0.13, 10, 32, Math.PI), archM);
  arch.position.set(0, SPRING, FACE + 0.42);
  add(arch);
  for (const s of [-1, 1]) {
    const jamb = new THREE.Mesh(box(0.26, SPRING, 0.26, 1), archM);
    jamb.position.set(s * (HALF + 0.12), SPRING / 2, FACE + 0.42);
    add(jamb);
  }
  // the ledge, thick stone, jutting out of the face
  const ledge = new THREE.Mesh(box(3.6, 0.7, LEDGE - FACE + 0.6, 1.4), stepM);
  ledge.position.set(0.2, -0.35, (FACE + LEDGE) / 2 + 0.1);
  add(ledge);
  const land = new THREE.Mesh(quad(HALF * 2, FACE + 0.1, 1.4), stepM);
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, 0.002, FACE / 2);
  add(land);
  // the lower flight: down the face to the right, into the dark
  for (let k = 0; k < 25; k++) {
    const y = -(k + 1) * RISE;
    const s = new THREE.Mesh(box(RUN + 0.02, 0.55, 1.3, 1.2), stepM);
    s.position.set(2.0 + (k + 0.5) * RUN, y - 0.275, FACE + 0.4 + 0.65);
    add(s);
  }
  // the hall below: wet dark floor, pillars fading into the fog, candle clusters, the blue shaft
  const floorM = pbr(T, "large_sandstone_blocks_01", 14, 14, { tint: 0x2a2e34, rough: 0.35, nScale: 0.8 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), floorM);
  fl.position.set(4, FLOOR, 14);
  add(fl);
  const pilM = pbr(T, "large_sandstone_blocks_01", 3, 6, { tint: 0x5a4c40, rough: 1 });
  for (const [px, pz] of [[-5.5, 4.5], [9.5, 5.5], [-7, 9]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 18, 24), pilM);
    p.position.set(px, FLOOR + 9, pz);
    add(p);
  }
  // candle clusters on the hall floor at the foot of the rock (two of them light the wet floor)
  const clusters = [[-1.4, 2.2, 0], [0.9, 3.4, 3.5], [4.8, 3.1, 0], [6.9, 2.0, 0], [-3.4, 4.6, 0], [3.0, 5.6, 0]];
  clusters.forEach(([cx, cz, cd], j) => {
    for (let i = 0; i < 6; i++) {
      const f = new Flame(T, 0.05 + rnd(j * 9 + i) * 0.04, 980 + j * 9 + i, i === 0 ? cd : 0, 0xffa050);
      f.position.set(cx + (rnd(j * 3 + i * 1.7) - 0.5) * 0.7, FLOOR + 0.06 + rnd(i + j) * 0.12, cz + (rnd(j * 5 + i * 2.3) - 0.5) * 0.7);
      st.add(f);
      flames.push(f);
    }
  });
  // serpents on the floor around the light: tapered bodies in the hall's scale skin, one rearing up
  const snakeTex = c.S.map.clone(), snakeNor = c.S.normal.clone();
  snakeTex.repeat.set(14, 1);
  snakeNor.repeat.set(14, 1);
  snakeTex.needsUpdate = snakeNor.needsUpdate = true;
  const snakeM = new THREE.MeshStandardMaterial({ map: snakeTex, normalMap: snakeNor, color: 0x9aa8a4, metalness: 0.35, roughness: 0.32, normalScale: new THREE.Vector2(1.2, 1.2) });
  const taper = (pts: THREE.Vector3[], r: (s: number) => number) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const n = 120, m = 10;
    const g = new THREE.TubeGeometry(curve, n, 1, m, false);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n);
      const rr = r(i / n);
      for (let j = 0; j <= m; j++) {
        const k = i * (m + 1) + j;
        pos.setXYZ(k, p.x + (pos.getX(k) - p.x) * rr, p.y + (pos.getY(k) - p.y) * rr, p.z + (pos.getZ(k) - p.z) * rr);
      }
    }
    g.computeVertexNormals();
    return g;
  };
  const body = (s: number) => 0.015 + 0.075 * ramp(s, 0, 0.35) - 0.03 * ramp(s, 0.8, 0.93) + 0.025 * Math.exp(-(((s - 0.97) / 0.025) ** 2));
  for (let j = 0; j < 3; j++) {
    const pts: THREE.Vector3[] = [];
    const a0 = rnd(j * 3.1) * 6.28, r0 = 1.0 + j * 0.55;
    for (let k = 0; k < 16; k++) {
      const a = a0 + k * 0.38;
      const rr = r0 + 0.35 * Math.sin(k * 0.8 + j);
      const rear = j === 1 ? Math.max(0, k - 12) * 0.16 : 0;
      pts.push(V(2.6 + Math.cos(a) * rr * 1.3, FLOOR + 0.07 + rear, 2.9 + Math.sin(a) * rr * 0.8));
    }
    add(new THREE.Mesh(taper(pts, body), snakeM));
  }
  const SHAFT_FOOT = V(2.6, FLOOR, 2.6);
  const blue = new THREE.SpotLight(0x7aa8ff, 1800, 0, 0.17, 0.7, 2);
  blue.position.set(3.4, 11, 4.2);
  blue.target.position.copy(SHAFT_FOOT);
  st.add(blue, blue.target);
  const shaftCard = new BeamCard(V(3.3, 6.5, 4.0), SHAFT_FOOT.clone().add(V(0, 0.3, 0)), 0.7, 1.4, 0x6f9fd8, 0.55);
  st.add(shaftCard.mesh);
  const shaft2 = new BeamCard(V(-2.2, 7, 6.5), V(-2.6, FLOOR + 0.3, 4.6), 0.5, 1.1, 0x5a84c0, 0.28);
  st.add(shaft2.mesh);
  const hallDust = dust(T, 260, [2.6, 9, 2.6], V(2.9, FLOOR + 4.5, 3.2), 0x9cc0ff, 0.03, 0.55);
  st.add(hallDust.pts);
  // ---------------- torches: two flanking the doorway, one inside the passage ----------------
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1612, metalness: 0.7, roughness: 0.6 });
  const fire: THREE.Vector3[] = [];
  const sconce = (x: number, y: number, z: number, seed: number, cd: number) => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.24), iron);
    br.position.set(x, y - 0.14, z - 0.1);
    add(br);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.12, 10), iron);
    cup.position.set(x, y - 0.06, z);
    add(cup);
    const f = new Flame(T, 0.2, seed, cd, 0xff8a38);
    f.position.set(x, y, z);
    f.glow.scale.setScalar(0.6);
    st.add(f);
    flames.push(f);
    fire.push(f.position.clone().add(V(0, 0.12, 0)));
    return f;
  };
  sconce(-1.75, 1.95, FACE + 0.62, 960, 5);
  sconce(1.75, 1.95, FACE + 0.62, 961, 5);
  sconce(-(HALF - 0.2), lineY(-3.6) + 1.75, -3.6, 962, 0);
  // and two lower down the rock face, along the flight into the hall
  sconce(4.4, -0.55, FACE + 0.62, 963, 4);
  sconce(7.7, -2.55, FACE + 0.62, 964, 0);
  st.add(new THREE.HemisphereLight(0x223650, 0x0a0604, 0.22));

  // ---------------- the procession ----------------
  type M = { fig: SilFig; s0: number; ph: number; x: number; i: number; walk: Sil[]; torch?: Flame; tongues?: Board[]; candle?: Flame };
  const marchers: M[] = [];
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.8 });
  const pitch = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9, emissive: 0x401204 });
  // Jamasp on step 5, then five soldiers, two steps apart, alternating sides, every other one with a torch
  const kinds = ["torch", "spear", "torch", "shield", "torch"] as const;
  const xs = [0.42, -0.4, 0.36, -0.42, 0.4];
  const defs: { kind: "jamasp" | (typeof kinds)[number]; s0: number; ph: number; x: number }[] = [{ kind: "jamasp", s0: 5, ph: 0, x: 0.03 }];
  kinds.forEach((k, j) => defs.push({ kind: k, s0: 5 + 2 * (j + 1), ph: (j % 2 ? 0.5 : 0.25) * (rnd(j * 3.3) * 0.4 + 0.8), x: xs[j] }));
  let lit = 0;
  defs.forEach((d, i) => {
    const jam = d.kind === "jamasp";
    const walk = [0, 1, 2].map((step) => (jam ? jamaspC({ step, bow: 1, hands: "candle" }) : soldierC({ spear: d.kind !== "torch", shield: d.kind === "shield", torch: d.kind === "torch", step })));
    const h = jam ? 1.72 : 1.76 + (rnd(i * 4.4) - 0.5) * 0.06;
    const fig = new SilFig(walk[0], h, { body: 0x090605, shadow: i < 3, alb: jam ? 0x3a2a20 : 0x2a2420 });
    st.add(fig);
    const m: M = { fig, s0: d.s0, ph: d.ph, x: d.x, i, walk };
    const w = h * 0.5;
    if (jam) {
      // a candle held at the chest on a little dish; it lights his face from below
      const cg = new THREE.Group();
      cg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.015, 14), new THREE.MeshStandardMaterial({ color: 0x6a5030, metalness: 0.8, roughness: 0.4 })));
      const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.5, emissive: 0x3a1a06 }));
      cs.position.y = 0.045;
      cg.add(cs);
      cg.position.set(0, (1 - 352 / 1024) * h - 0.02, 0.14);
      fig.add(cg);
      const f = new Flame(T, 0.05, 900, 3.5, 0xffa848);
      f.position.set(0, (1 - 352 / 1024) * h + 0.075, 0.14);
      fig.add(f);
      flames.push(f);
      m.candle = f;
    }
    if (d.kind === "torch") {
      // a real torch in his raised right hand: shaft, pitch-soaked head, fire on top
      const hand = V((406 / 512 - 0.5) * w, (1 - 300 / 1024) * h, 0.06);
      const top = V((423 / 512 - 0.5) * w, (1 - 175 / 1024) * h, 0.06);
      const len = hand.distanceTo(top) + 0.25;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, len, 8), wood);
      shaft.position.copy(hand).lerp(top, 0.5).add(V(0, -0.1, 0));
      shaft.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(hand).normalize());
      fig.add(shaft);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.13, 10), pitch);
      head.position.copy(top);
      fig.add(head);
      const strong = lit < 3;
      const f = new Flame(T, 0.34, 900 + i, strong ? (lit === 0 ? 20 : 12) : 0, 0xff9a40);
      f.position.copy(top).add(V(0, 0.05, 0));
      f.glow.scale.setScalar(0.45);
      if (lit === 0 && f.light) {
        f.light.castShadow = true;
        f.light.shadow.mapSize.set(512, 512);
        f.light.shadow.bias = -0.004;
        f.light.shadow.radius = 3;
        f.light.shadow.camera.near = 0.1;
        f.light.distance = 9;
      }
      lit++;
      m.tongues = [0, 1, 2].map((k) => {
        const b = new Board(T.flame, k === 0 ? 0xffd090 : 0xff8a30, 0.14, 0.3, true, 0.9);
        b.position.y = 0.1;
        f.add(b);
        return b;
      });
      fig.add(f);
      flames.push(f);
      m.torch = f;
    }
    marchers.push(m);
  });

  /** stair position in steps (0 = the bottom step, below 0 = the landing): one step down every half second */
  const stepAt = (m: M, t: number) => {
    const prog = (tt: number) => {
      const u = (tt - 33.3) / 0.5 + m.ph;
      const n = Math.floor(u), f = u - n;
      return n + ease.io(clamp(f / 0.62));
    };
    return m.s0 - prog(t);
  };
  const placeOf = (s: number) => {
    const z = -(s + 0.5) * RUN;
    const y = Math.max(0, Math.min(NST, s + 1)) * RISE;
    // s = k: standing on the middle of step k; between k and k-1: stepping down
    return V(0, y, z);
  };

  // smoke from the torches, haze, sparks, dust in the light
  const NS = 120;
  const smoke = new Puffs(T, NS, c.H, 0x8a7a6a);
  smoke.u.uAmb.value = 0.02;
  st.add(smoke.pts);
  const NK = 60;
  const sparks = new Puffs(T, NK, c.H, 0xffa850, true);
  sparks.u.uAmb.value = 1.0;
  st.add(sparks.pts);
  const sDust = dust(T, 420, [2.0, 3.4, 10], V(0, 2.2, -2.5), 0xffc890, 0.02, 0.45);
  st.add(sDust.pts);

  const crane = (t: number) => ease.io(ramp(t, CUE.down - 0.5, 36.3));
  const camAt = (t: number) => {
    const k = ramp(t, 33.3, 35.2);
    const cr = crane(t);
    const p0 = V(lerp(0.2, 0.16, k) + (noise1(t * 0.6, 71) - 0.5) * 0.03, lerp(1.0, 0.97, k) + (noise1(t * 0.8, 72) - 0.5) * 0.015, lerp(3.75, 3.5, k));
    const l0 = V(lerp(0.04, 0.02, k), lerp(2.2, 1.7, k), lerp(-4, -3, k));
    const p = p0.lerp(V(0.9, 1.9, 9.2), cr);
    const l = l0.lerp(V(1.4, -1.5, 1.6), cr);
    return { p, l, fov: lerp(42, 50, cr) };
  };

  const update = (t: number, sh: Shot) => {
    if (!sh.set.includes("stairs")) return;
    sDust.tick(t, [0.01, 0.03, 0.05]);
    hallDust.tick(t, [0.01, -0.02, 0.02]);
    shaftCard.face(c.camera.position.clone().sub(STAIR), t);
    shaft2.face(c.camera.position.clone().sub(STAIR), t);
    const cam = c.camera;
    // world positions of the fire, for the figures' volume light
    const torchW = marchers.filter((m) => m.torch).map((m) => m.torch!.getWorldPosition(V(0, 0, 0)));
    const fireW = fire.map((f) => f.clone().add(STAIR));
    marchers.forEach((m, i) => {
      const s = stepAt(m, t);
      const p = placeOf(s);
      const ph = s - Math.floor(s);
      const bob = 0.025 * Math.sin(ph * Math.PI);
      const sway = Math.sin(s * Math.PI + i) * 0.02 + (noise1(t * 0.7, i + 50) - 0.5) * 0.02;
      m.fig.position.set(m.x + sway, p.y + bob, p.z);
      m.fig.rotation.z = Math.sin(s * Math.PI + i * 1.3) * 0.012;
      m.fig.face(cam);
      m.fig.setSil(m.walk[[1, 0, 2, 0][((Math.floor(s * 2 + 40) % 4) + 4) % 4]]);
      m.fig.updateMatrixWorld();
      // volume light: his own fire, the nearest fire behind him, the candle in front, the doorway torches
      const own = m.torch?.getWorldPosition(V(0, 0, 0)) ?? m.candle?.getWorldPosition(V(0, 0, 0));
      const behind = torchW.find((w) => w.z < m.fig.position.z + STAIR.z - 0.3) ?? fireW[2];
      const cand = marchers[0].candle!.getWorldPosition(V(0, 0, 0));
      const ls = [own ?? cand, behind, i === 0 ? fireW[0] : cand, fireW[1]];
      const cs = [
        new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(own ? (m.candle ? 1.6 : 1.4) : 0.6),
        new THREE.Color(1.0, 0.5, 0.2).multiplyScalar(1.3),
        new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(i === 0 ? 0.35 : 0.5),
        new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(0.35),
      ];
      m.fig.lights(ls, cs);
      m.fig.rimFrom(behind, cam, 0xff9a50, 0.8);
      if (m.candle) {
        // the candle lights his bowed face and the turban's edge from below
        const fl = 0.85 + 0.15 * noise1(t * 9, 3) + 0.08 * noise1(t * 23, 4);
        m.fig.u.uGlowAt.value.set(0.5, 1 - 205 / 1024);
        m.fig.u.uGlowR.value = 0.085;
        (m.fig.u.uGlow.value as THREE.Color).setRGB(0.3, 0.13, 0.04).multiplyScalar(fl);
      }
      if (m.tongues) {
        m.tongues.forEach((b, k) => {
          const n = noise1(t * 6 + k * 3.3, i * 7 + k);
          b.position.set(Math.sin(t * 7 + k * 2 + i) * 0.035, 0.1 + n * 0.08 + k * 0.03, 0);
          b.scale.set(0.7 + 0.5 * noise1(t * 5 + k, i + k + 3), 0.7 + 0.7 * n, 1);
          b.material.opacity = 0.55 + 0.4 * n;
          b.face(cam);
        });
      }
    });
    // torch smoke and haze
    const srcs = marchers.filter((m) => m.torch).map((m) => m.torch!);
    smoke.lights([...torchW.slice(0, 2), fireW[0]], [0.6, 0.6, 0.4]);
    for (let i = 0; i < NS; i++) {
      const life = 2.4 + rnd(i * 3.3) * 1.6;
      const age = ((((t - 30) / life + rnd(i * 1.7)) % 1) + 1) % 1;
      let p: THREE.Vector3;
      if (i < 70) {
        const tor = srcs[i % srcs.length];
        p = tor.getWorldPosition(V(0, 0, 0)).sub(STAIR);
        p.y += 0.15 + age * 1.1;
        p.z -= age * 0.55;
        p.x += Math.sin(age * 5 + i) * 0.08 * age;
        smoke.set(i, p, 0.1 + age * 0.7, 0.18 * Math.sin(Math.PI * Math.min(1, age * 1.4)) * (1 - age * 0.6), rnd(i) * 6 + t * 0.2);
      } else {
        const zz = FACE + 1.5 - rnd(i * 5.1) * 9;
        p = V((rnd(i * 2.2) - 0.5) * 1.6 + Math.sin(t * 0.2 + i) * 0.2, lineY(Math.min(0, zz)) + 1.9 + rnd(i * 9.9) * 1.2, zz + t * 0.05);
        smoke.set(i, p, 0.9 + rnd(i * 4.4) * 0.8, 0.06, rnd(i) * 6 + t * 0.05);
      }
    }
    smoke.commit(cam);
    for (let i = 0; i < NK; i++) {
      const p = srcs[i % srcs.length].getWorldPosition(V(0, 0, 0)).sub(STAIR);
      const life = 0.8 + rnd(i * 2.9) * 0.8;
      const age = ((((t - 30) / life + rnd(i * 7.3)) % 1) + 1) % 1;
      p.y += age * 0.9 + 0.05;
      p.x += (rnd(i * 3.7) - 0.5) * 0.5 * age + Math.sin(t * 9 + i) * 0.02;
      p.z += (rnd(i * 5.9) - 0.6) * 0.5 * age;
      sparks.set(i, p, 0.012 + rnd(i) * 0.012, (1 - age) * (rnd(i * 8.1) > 0.4 ? 1 : 0.3), 0);
    }
    sparks.lights([], []);
    sparks.commit(cam);
  };

  let curT = 33.3;
  const FOG = new THREE.FogExp2(0x0a0807, 0.05);
  const shot: Shot = {
    a: 33.3,
    b: 36.3,
    set: ["stairs"],
    fog: FOG,
    get focus() {
      const cm = camAt(curT);
      const j = placeOf(stepAt(marchers[0], curT));
      return lerp(cm.p.distanceTo(j.add(V(0, 1.3, 0))), cm.p.distanceTo(cm.l) * 0.7, crane(curT));
    },
    range: 4.5,
    cam: (_k, t) => {
      curT = t;
      const cm = camAt(t);
      return { p: cm.p.add(STAIR), l: cm.l.add(STAIR), fov: cm.fov };
    },
  };
  return { shots: [shot], update };
};
