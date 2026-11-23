// Mirror Hall · the hall world: builds the engine once (hall, candlesticks, her mother's mirror
// and its shards, stones, the light swarm) and renders the director's state for any film second. A free review
// camera (look tool) replaces only the camera.
import * as THREE from "three";
import { G } from "./base/shapes89";
import { DENS_H, GEN_H, MIRROR_AT, SHAPES_H, SHARD_T, STICK_L, STICK_R, directH, wallTargets, type DirCtx } from "./dirH";
import { HallEngine, type CamState } from "./engineH";
import { HALL_COMMON } from "./hallMat";
import { makeMirror, placeShards, planShards, tiltAt, type Life, type Mirror } from "./mirrorH";
import { FLAME_Y, STD_VERT } from "./propsH";
import { buildSwarm, type Swarm } from "./swarmH";

export type FreeCam = number[]; // px, py, pz, tx, ty, tz, fov[, focus, aper]

const STONE_FRAG = /* glsl */ `
${HALL_COMMON}
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float grain = fract(sin(dot(floor(vW * 3.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  vec3 alb = vec3(0.16, 0.15, 0.14) * (0.75 + 0.5 * grain);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  gl_FragColor = vec4(alb * diffuseAt(vW, N) + vec3(0.5, 0.65, 0.9) * rim * 0.06, 1.0);
}`;

export class HallWorld {
  E!: HallEngine;
  S!: Swarm;
  M!: Mirror;
  life!: Life[];
  targets!: THREE.Vector3[];
  stones: THREE.Mesh[] = [];
  ctx!: DirCtx;
  impacts!: { p: THREE.Vector3; t: number }[];
  static async create(canvas: HTMLCanvasElement, o: { W: number; H: number; ss: number; url: (p: string) => string }) {
    const w = new HallWorld();
    const E = (w.E = HallEngine.create(canvas, { W: o.W, H: o.H, ss: o.ss }));
    E.addCandlestick(STICK_L, 1.0, true);
    E.addCandlestick(STICK_R, 1.0, true);
    for (const n of E.info.niches) E.addCandlestick(n.sill, 0.9, true);
    // her mother's mirror and its shards
    w.M = makeMirror(E.U, MIRROR_AT, 0);
    E.addMirror(w.M);
    w.life = planShards(w.M, SHARD_T);
    w.targets = wallTargets();
    // the mirror-work sets where the pieces land: one impact per target, at its first piece's arrival
    w.impacts = w.targets.map((p, i) => {
      let tt = 9999;
      w.M.shards.forEach((_, si) => {
        if (si % w.targets.length === i) tt = Math.min(tt, SHARD_T.fly[si % SHARD_T.fly.length]);
      });
      return { p, t: tt };
    });
    // stones
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = 1 + 0.2 * Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7 + 0.4) * Math.sin(v.z * 3.3 + 2.2) + 0.07 * Math.sin(v.x * 7.1 + v.y * 6.3 + v.z * 5.2);
      v.multiply(new THREE.Vector3(1.15, 0.85, 1)).multiplyScalar(n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const sm = new THREE.ShaderMaterial({ uniforms: E.U, vertexShader: STD_VERT, fragmentShader: STONE_FRAG });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(geo, sm);
      m.visible = false;
      m.frustumCulled = false;
      m.scale.setScalar(2.2);
      E.hallScene.add(m);
      w.stones.push(m);
    }
    // the light
    w.S = buildSwarm(E, { shapes: SHAPES_H, extra: GEN_H, dens: DENS_H });
    w.ctx = { niches: E.info.niches.map((n) => n.sill.clone()), nicheN: E.info.niches.map((n) => n.N.clone()), targets: w.targets };
    // the floor's contact shadows under the two candlesticks on the floor
    E.U.stickP.value[0].copy(STICK_L);
    E.U.stickP.value[1].copy(STICK_R);
    E.U.nStick.value = 2;
    return w;
  }

  frame(t: number, o: { free?: FreeCam | null; dbg?: string }) {
    const E = this.E, S = this.S, M = this.M;
    const dbg = o.dbg ?? "";
    const f = directH(t, this.ctx);
    // ---- the hall
    E.setLights(f.lights);
    E.flames.set(f.flames);
    E.sticks.forEach((st, i) => {
      const a = f.stickAmt[i] ?? 0;
      st.glass.uniforms.flameAmt.value = a;
      st.wax.uniforms.flameAmt.value = a;
      st.glass.uniforms.flameP.value.copy(st.group.position).add(new THREE.Vector3(0, FLAME_Y * st.group.scale.y, 0));
      st.wax.uniforms.flameP.value.copy(st.glass.uniforms.flameP.value);
    });
    const U = E.U, h = f.hall;
    U.revealAll.value = h.revealAll;
    U.glitK.value = h.glitK;
    U.glitD.value = h.glitD;
    U.roomK.value = h.roomK;
    U.mirK.value = h.mirK;
    U.ambC.value.set(...h.amb);
    U.envWarm.value.set(...h.envWarm);
    U.hideT.value = h.hideT;
    U.hideSpeed.value = h.hideSpeed;
    U.popK.value = h.popK;
    U.miniK.value = h.miniK;
    U.swA.value = h.swA;
    U.swK.value = h.swK;
    U.swW.value = h.swW;
    U.glintK.value = h.glintK;
    U.reflK.value = h.reflK;
    E.setImpacts(this.impacts);
    // ---- the mirror
    M.root.visible = f.mirror.show;
    M.pivot.rotation.x = f.mirror.tilt ?? tiltAt(t, SHARD_T);
    M.cracks.visible = t < SHARD_T.impact || (t >= 191.2 && t < SHARD_T.retEnd + 0.8);
    M.cU.crackK.value = t < SHARD_T.impact ? f.mirror.crackK : 1 - Math.min(1, Math.max(0, (t - SHARD_T.retEnd) / 0.8));
    const herC = f.her?.c ?? new THREE.Vector3(0, 0, 0);
    placeShards(M, this.life, SHARD_T, t, herC, this.targets, f.mirror.held ?? undefined);
    // ---- stones
    f.stones.forEach((s, i) => {
      const m = this.stones[i];
      m.visible = s.vis;
      m.position.copy(s.p);
      m.rotation.set(s.spin, s.spin * 0.7, s.spin * 0.4);
    });
    // ---- the light
    const tr = f.tr;
    const pu = S.partU;
    pu.sA.value = S.shapeIndex(tr.a);
    pu.sB.value = S.shapeIndex(tr.b);
    pu.offA.value.set(...((tr.oa as [number, number, number]) ?? [0, 0, 0]));
    pu.offB.value.set(...((tr.ob as [number, number, number]) ?? [0, 0, 0]));
    pu.t0.value = tr.t0;
    pu.D.value = tr.D;
    pu.F.value = tr.F;
    pu.quant.value = tr.q;
    pu.swirl.value = tr.swirl;
    pu.turb.value = tr.turb;
    pu.flyDim.value = tr.dim ?? 0.6;
    pu.beats.value = f.beatsWin;
    const sw = f.sw;
    pu.pAmt.value = sw.pAmt;
    pu.othK.value = sw.othK;
    pu.herK.value = sw.herK;
    pu.glassK.value = sw.glassK;
    pu.warmK.value = sw.warmK;
    pu.sizeK.value = sw.sizeK;
    pu.arrGain.value = sw.arrGain;
    pu.kick.value = sw.kick;
    pu.beat.value = sw.beat;
    pu.tPrev.value = t - sw.tPrevDt;
    pu.scanY.value = sw.scanY;
    pu.scanAmt.value = sw.scanAmt;
    S.setTime(t);
    f.bursts.forEach(([tt, p, sp, dr, cu, life, dens], i) => {
      if (i >= S.MAXB) return;
      S.burstU.evT.value[i] = tt;
      S.burstU.evC.value[i].set(...p);
      S.burstU.evP.value[i].set(sp, dr, cu, life);
      S.burstU.evD.value[i] = dens;
    });
    S.coreU.cAmt.value = f.core.amt;
    S.coreU.cSize.value = f.core.size;
    S.coreU.cPos.value.set(...f.core.p);
    S.coreU.cCol.value.set(...f.core.col);
    S.dustU.amt.value = f.dustAmt;
    S.dustU.dl.value.forEach((v, i) => {
      const d = f.dustLights[i];
      if (d) v.set(d[0], d[1], d[2], d[3]);
      else v.set(0, -999, 0, 0);
    });
    // ---- camera (the film's, or a free review camera)
    let cam: CamState = f.cam;
    const fc = o.free;
    if (fc) cam = { pos: new THREE.Vector3(fc[0], fc[1], fc[2]), look: new THREE.Vector3(fc[3], fc[4], fc[5]), fov: fc[6] ?? 40, focus: fc[7] ?? new THREE.Vector3(fc[0], fc[1], fc[2]).distanceTo(new THREE.Vector3(fc[3], fc[4], fc[5])), aper: fc[8] ?? 0 };
    S.dof.focus.value = cam.focus;
    S.dof.bokeh.value = cam.aper;
    S.dof.maxCoc.value = f.bokehMax;
    // ---- grade
    const g = E.grade;
    const ex = dbg.match(/exp=([0-9.]+)/);
    g.set("exposure", f.grade.exposure * (ex ? Number(ex[1]) : 1));
    g.set("black", f.grade.black);
    g.set("vig", f.grade.vig);
    g.set("ca", f.grade.ca);
    g.set("lift", f.grade.lift);
    E.bloom.intensity = f.bloom;
    E.glowK = f.glowK;
    E.render(t, cam, { her: f.her, bokehMax: f.bokehMax });
    void G;
  }
}
