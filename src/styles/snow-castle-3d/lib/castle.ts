// Snow Castle 3D · the castle: parametric towers, halls, the great hall, the viaduct, the covered bridge, the boathouse…
// Everything is baked by the Builder into a handful of world-space meshes. Windows, lamps and chimneys are only
// registered here; the engine turns them into the parallax window mesh, glow sprites and smoke.
import * as THREE from "three";
import { Builder, archOutline, archRise, gBall, gBox, gCyl, gDisk, gExtrude, gLathe, gLump, gPrism, gPyramid, gRing, gSnowRidge, gSnowStrip } from "./geo";
import { clamp, lerp, noise2, rng, sstep } from "./util";
import { JETTY, STACK, Y0, heightAt } from "./terrain";

export type Win = { p: THREE.Vector3; n: THREE.Vector3; w: number; h: number; type: number; lit: boolean; tOn: number; seed: number; warm: number };
export type Lamp = { p: THREE.Vector3; col: [number, number, number]; i: number; r: number; tOn: number; glow: number; pl: boolean };
export type Smoke = { p: THREE.Vector3; s: number };
/** open fire (braziers at the gate): position of the coals, size, the second of the light clock it is lit */
export type Flame = { p: THREE.Vector3; s: number; tOn: number };
/** pennant on a spire: foot of the staff's upper end, length, height at the hoist, colour index, phase */
export type Flag = { p: THREE.Vector3; len: number; h: number; col: number; seed: number };
export class Registry {
  wins: Win[] = [];
  lamps: Lamp[] = [];
  smokes: Smoke[] = [];
  flames: Flame[] = [];
  flags: Flag[] = [];
}

/** window kinds understood by the window shader */
export const WT = { lancet: 0, twin: 1, cross: 2, slit: 3, round: 4, great: 5, clock: 6, dormer: 7, door: 8, glass: 9 } as const;

const TAU = Math.PI * 2;
const STONE_T = 2.5, ROOF_T = 3;

/** centre line of the trodden path on the viaduct deck (world x → offset across, metres); the deck shader draws the
 *  same line, so ruts and footprints lie in the hollow of the mesh */
export const deckPath = (x: number) => 0.5 * Math.sin(x * 0.07) + 0.2 * Math.sin(x * 0.19 + 1.0);

export function buildCastle(B: Builder, R: Registry) {
  const rand = rng(7801);
  const rr = (a: number, b: number) => a + (b - a) * rand();
  // the detail pass draws from its own generator, so the windows and lights of the first build stay where they were
  const drand = rng(7802);
  const dr = (a: number, b: number) => a + (b - a) * drand();

  // ── lighting schedule: every group of rooms lights up around its own moment, a first few are lit from frame 0
  const groupT: number[] = [];
  /** lights that used to be on from frame 0: each gets its own early second (no random draw, so nothing else changes) */
  const early0 = (p: THREE.Vector3) => { const h = Math.sin(p.x * 12.9898 + p.y * 78.233 + p.z * 37.719) * 43758.5453; return -5 + (h - Math.floor(h)) * 5; };
  const gt = (g: number) => (groupT[g] ??= 1.5 + rand() * 30);
  const win = (lx: number, ly: number, lz: number, nx: number, nz: number, w: number, h: number, type: number, group: number, pLit = 0.62, warm?: number) => {
    const p = B.at(lx, ly, lz), n = B.dir(nx, 0, nz);
    p.addScaledVector(n, 0.035);
    const dark = type === WT.slit;
    const lit = !dark && rand() < pLit * 0.84;
    const early = rand() < 0.3;
    R.wins.push({ p, n, w, h, type, lit, tOn: early ? early0(p) : gt(group) + rand() * 7, seed: rand(), warm: warm ?? rand() });
  };
  const lamp = (lx: number, ly: number, lz: number, i = 1, r = 6, tOn = -5, glow = 1, col: [number, number, number] = [1, 0.62, 0.28], pl = true) => {
    R.lamps.push({ p: B.at(lx, ly, lz), col, i, r, tOn, glow, pl });
  };
  const snowCap = (w: number, d: number, t = 0.22) => B.add("snow", gLump(w, d, t), { uv: "keep" });

  // ── small parts ───────────────────────────────────────────────────────────────────────────────
  const finial = (s = 1) => {
    B.add("metal", gLathe([[0.16 * s, 0], [0.32 * s, 0.22 * s], [0.1 * s, 0.55 * s], [0.26 * s, 0.85 * s], [0.05 * s, 1.15 * s], [0.035 * s, 3.0 * s], [0.001, 3.1 * s]], 10, 1), { uv: "keep", snow: 0.3 });
  };
  /** conical slate roof with a bell-cast eave, in three texture bands so the slates keep a believable size */
  const cone = (rE: number, hR: number, seg = 40) => {
    const prof = (t: number): [number, number] => [(rE * (1 - t) * (1 + 0.13 * Math.exp(-9 * t))) / 1.13, hR * t];
    const cuts = [0, 0.09, 0.2, 0.34, 0.5, 0.68, 0.85, 1];
    for (let k = 0; k < cuts.length - 1; k++) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 3; i++) pts.push(prof(lerp(cuts[k], cuts[k + 1], i / 3)));
      B.add("roof", gLathe(pts, seg, ROOF_T, Math.max(0.35, (pts[0][0] + pts[3][0]) * 0.5)), { uv: "keep" });
    }
    // lead roll where the slates end
    B.add("metal", gLathe([[rE + 0.03, -0.1], [rE + 0.1, 0.0], [rE + 0.03, 0.12]], seg, 1), { uv: "keep", snow: 0.6 });
    // lead rolls running up the slates and a band or two round them: the roof reads as built, not turned
    if (rE > 2.3) {
      const nr = rE > 9 ? 16 : rE > 5 ? 12 : 8;
      const ts = [0.035, 0.1, 0.2, 0.34, 0.5, 0.68, 0.84, 0.94];
      const rw = clamp(rE * 0.014, 0.07, 0.15);
      for (let i = 0; i < nr; i++) {
        const a = ((i + 0.5) / nr) * TAU;
        for (let k = 0; k < ts.length - 1; k++) {
          const [r0, y0] = prof(ts[k]), [r1, y1] = prof(ts[k + 1]);
          B.push().rotY(a).translate(0, y0, r0 + 0.03).rotX(Math.atan2(r1 - r0, y1 - y0));
          B.add("roof", gBox(rw * 1.7, Math.hypot(r1 - r0, y1 - y0), 0.14), { snow: 1 });
          B.pop();
        }
      }
      for (const tb of rE > 6 ? [0.3, 0.62] : [0.46]) {
        const [rb, yb] = prof(tb);
        B.add("roof", gLathe([[rb + 0.02, yb - 0.11], [rb + 0.12, yb], [rb + 0.02, yb + 0.13]], seg, ROOF_T), { uv: "keep", snow: 1 });
      }
    }
    const fsz = clamp(rE / 4.5, 0.55, 1.5);
    B.push().translate(0, hR - 0.25, 0);
    finial(fsz);
    B.pop();
    return B.at(0, hR - 0.25 + 3.05 * fsz, 0);
  };
  /** a pennant flying from the spike of a finial */
  const pennant = (tip: THREE.Vector3 | null | undefined, len: number, h: number, col: number) => {
    if (tip) R.flags.push({ p: tip.clone().add(new THREE.Vector3(0, -h * 0.5 - 0.15, 0)), len, h, col, seed: drand() });
  };
  /** gothic pinnacle: square shaft, four gablets, a spire with a knob (origin = centre of its foot) */
  const spirelet = (h: number, w = 0.7, crockets = false) => {
    const hs = h * 0.36, hp = h * 0.58;
    B.add("stone2", gBox(w, hs, w));
    B.push().translate(0, hs, 0);
    B.add("stone2", gBox(w + 0.18, 0.12, w + 0.18), { snow: 1.4 });
    B.translate(0, 0.12, 0);
    for (let q = 0; q < 4; q++) {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, w * 0.8); sh.lineTo(-w / 2, 0);
      B.push().rotY((q * Math.PI) / 2).translate(0, 0, w / 2 - 0.03);
      B.add("stone2", gExtrude(sh, 0.11), { snow: 0.5 });
      B.pop();
    }
    B.add("stone2", gPyramid(4, w * 0.74, hp), { snow: 0.55 });
    if (crockets) {
      // leaf knobs climbing the four arrises
      for (let q = 0; q < 4; q++) for (let k = 1; k <= 3; k++) {
        const t = k / 4.2, rr0 = w * 0.74 * (1 - t);
        B.push().rotY(Math.PI / 4 + (q * Math.PI) / 2).translate(0, hp * t - 0.1, rr0);
        B.add("stone2", gBox(0.2, 0.22, 0.24), { snow: 1.2 });
        B.pop();
      }
    }
    B.translate(0, hp - 0.1, 0);
    B.add("stone2", gBall(Math.max(0.1, w * 0.15), 6), { uv: "keep", snow: 0.8 });
    B.pop();
  };
  /** a fringe of icicles under a horizontal edge that runs along local x (origin = middle of the edge) */
  const icicles = (len: number, density = 2.2, maxL = 1.1, keep = 0.6) => {
    const n = Math.max(1, Math.round(len * density));
    for (let i = 0; i < n; i++) {
      if (drand() > keep) continue;
      const x = (drand() - 0.5) * len, l = maxL * (0.14 + 0.86 * Math.pow(drand(), 2.2)), r = 0.028 + l * 0.04;
      B.push().translate(x, 0, (drand() - 0.5) * 0.08).rotX(Math.PI);
      B.add("ice", gCyl(0.004, r, l, 5, 1), { uv: "keep", snow: 0 });
      B.pop();
    }
  };
  const merlonRing = (r: number, y: number, mh = 1.05, thick = 0.5) => {
    const n = Math.max(8, Math.round((TAU * r) / 1.75));
    for (let i = 0; i < n; i++) {
      B.push().rotY((i / n) * TAU).translate(0, y, r - thick / 2);
      B.add("stone2", gBox(0.95, mh, thick));
      B.translate(0, mh, 0);
      snowCap(0.95, thick, 0.16);
      B.pop();
    }
  };
  const merlonLine = (x0: number, z0: number, x1: number, z1: number, y: number, mh = 1.05, thick = 0.5) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.75));
    const a = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      B.push().translate(lerp(x0, x1, t), y, lerp(z0, z1, t)).rotY(a + Math.PI / 2);
      B.add("stone2", gBox(0.95, mh, thick));
      B.translate(0, mh, 0);
      snowCap(0.95, thick, 0.16);
      B.pop();
    }
  };
  /** stepped buttress standing against a wall that faces +z (origin = wall face at ground) */
  const buttress = (h: number, w = 1.1, d = 1.5, pinnacle = 0) => {
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const hh = h / steps, dd = d * (1 - s * 0.27);
      B.push().translate(0, s * hh, dd / 2);
      B.add("stone2", gBox(w, hh, dd), { baseY: s === 0 ? B.at(0, 0, 0).y + 2 : undefined });
      // weathering (sloped cap) of this step
      B.translate(0, hh, 0);
      const sh = new THREE.Shape();
      sh.moveTo(-dd / 2, 0); sh.lineTo(dd / 2, 0); sh.lineTo(-dd / 2, 0.55); sh.lineTo(-dd / 2, 0);
      B.push().rotY(-Math.PI / 2).translate(0, 0, -w / 2);
      B.add("stone2", gExtrude(sh, w), { snow: 0.7 });
      B.pop();
      B.pop();
    }
    if (pinnacle > 0) {
      const pw = Math.min(w * 0.74, d * 0.46 * 0.95);
      B.push().translate(0, h, d * 0.23);
      spirelet(pinnacle, pw, pw > 0.95);
      B.pop();
    }
  };
  const chimney = (h: number, smoke: boolean, w = 1.15) => {
    B.add("stone", gBox(w, h, w * 0.8));
    B.push().translate(0, h, 0);
    B.add("stone2", gBox(w + 0.3, 0.28, w * 0.8 + 0.3));
    B.translate(0, 0.28, 0);
    snowCap(w + 0.3, w * 0.8 + 0.3, 0.14);
    for (const dx of [-0.28, 0.28]) {
      B.push().translate(dx, 0, 0);
      B.add("metal", gCyl(0.13, 0.17, 0.75, 8, 1), { uv: "keep", snow: 0.4 });
      B.pop();
    }
    if (smoke) R.smokes.push({ p: B.at(0, 0.9, 0), s: rr(0.8, 1.3) });
    B.pop();
  };
  /** lantern on a post (origin = foot) */
  /** four-sided iron lantern with glass panes and a flame (origin = underside of the cage) */
  const lantern = (tOn: number, i: number) => {
    const hC = 0.5, r0 = 0.165, r1 = 0.245;
    // the glass knows its height above the lantern floor (aCol.z), so the shader can put the flame behind it
    const by = B.at(0, 0, 0).y;
    B.add("metal", gBox(0.27, 0.035, 0.27), { snow: 0 });
    B.push().translate(0, 0.035, 0);
    B.add("lamp", gPrism(4, r1 - 0.012, r0 - 0.012, hC), { snow: tOn, tint: i * 0.34, baseY: by });
    const tilt = Math.atan2(r1 - r0, hC), bl = Math.hypot(r1 - r0, hC);
    for (let k = 0; k < 4; k++) {
      B.push().rotY(Math.PI / 4 + (k * Math.PI) / 2).translate(0, 0, r0).rotX(tilt);
      B.add("metal", gBox(0.03, bl, 0.03), { snow: 0 });
      B.pop();
    }
    // glazing bar round the panes
    const rm = lerp(r0, r1, 0.66) + 0.004;
    B.push().translate(0, hC * 0.66, 0);
    B.add("metal", gPrism(4, rm, rm, 0.02), { snow: 0 });
    B.pop();
    B.push().translate(0, 0.05, 0);
    B.add("metal", gCyl(0.02, 0.03, 0.1, 6, 1), { uv: "keep", snow: 0 });
    B.translate(0, 0.1, 0);
    B.add("lamp", gBox(0.05, 0.11, 0.05), { snow: tOn, tint: i * 3.2, baseY: by });
    B.pop();
    B.translate(0, hC, 0);
    B.add("metal", gBox(0.44, 0.03, 0.44), { snow: 0 });
    // little icicles under the corners of the roof
    for (let k = 0; k < 4; k++) {
      if (drand() > 0.5) continue;
      const l = dr(0.07, 0.26);
      B.push().rotY(Math.PI / 4 + (k * Math.PI) / 2).translate(0, 0, 0.28).rotX(Math.PI);
      B.add("ice", gCyl(0.003, 0.012 + l * 0.03, l, 4, 1), { uv: "keep", snow: 0 });
      B.pop();
    }
    B.translate(0, 0.03, 0);
    B.add("metal", gPyramid(4, 0.32, 0.24), { snow: 1.3 });
    B.translate(0, 0.24, 0);
    B.add("metal", gBall(0.045, 8), { uv: "keep", snow: 0.5 });
    B.translate(0, 0.03, 0);
    B.add("metal", gPrism(4, 0.006, 0.018, 0.17), { snow: 0.3 });
    B.pop();
  };
  const lampPost = (h = 3.4, tOn = -5, i = 1, pl = true) => {
    if (tOn <= -4.99) tOn = early0(B.at(0, 0, 0));
    // cast-iron post: plinth, moulded foot, two collars, a ladder rest under the lantern
    B.add("metal", gPrism(8, 0.2, 0.22, 0.12), { snow: 0.3 });
    B.push().translate(0, 0.12, 0);
    B.add("metal", gLathe([[0.17, 0], [0.19, 0.06], [0.13, 0.2], [0.115, 0.42], [0.14, 0.5], [0.085, 0.6], [0.07, 0.72]], 8, 1), { uv: "keep", snow: 0.25 });
    B.translate(0, 0.72, 0);
    const hs = h - 0.84;
    B.add("metal", gPrism(8, 0.045, 0.068, hs), { snow: 0 });
    for (const f of [0.34, 0.8]) {
      B.push().translate(0, hs * f, 0);
      B.add("metal", gLathe([[0.06, -0.04], [0.085, 0], [0.06, 0.05]], 8, 1), { uv: "keep", snow: 0.4 });
      B.pop();
    }
    B.push().translate(0, hs - 0.22, 0);
    B.add("metal", gBox(0.035, 0.035, 0.66), { snow: 0.9 });
    for (const s of [1, -1]) {
      B.push().translate(0, 0.018, s * 0.33);
      B.add("metal", gBall(0.035, 6), { uv: "keep", snow: 0.5 });
      B.pop();
    }
    B.pop();
    B.pop();
    B.push().translate(0, h, 0);
    B.add("metal", gPrism(8, 0.1, 0.05, 0.12), { snow: 0 });
    B.translate(0, 0.12, 0);
    lantern(tOn, i);
    B.pop();
    lamp(0, h + 0.4, 0, i, 7, tOn, 1, [1, 0.62, 0.28], pl);
  };
  /** lantern on a wall bracket (origin = wall face, wall looks at +z) */
  const wallLamp = (tOn = -5, i = 1) => {
    if (tOn <= -4.99) tOn = early0(B.at(0, 0, 0));
    B.push().translate(0, 0, 0.3);
    B.add("metal", gBox(0.05, 0.05, 0.6), { snow: 0 });
    B.translate(0, -0.62, 0.25);
    lantern(tOn, i);
    B.pop();
    lamp(0, -0.3, 0.55, i, 6, tOn);
  };

  // ── round tower ───────────────────────────────────────────────────────────────────────────────
  type TowerO = {
    x: number; z: number; y?: number; r: number; h: number; roof?: number; found?: number;
    top?: "eave" | "corbel" | "flat"; bands?: number; rings?: number; wtype?: number; stair?: boolean; lucarnes?: number; bartizans?: number;
    group: number; mat?: string; taper?: number; pLit?: number; noWinFrom?: number; noWinTo?: number;
  };
  const roundTower = (o0: TowerO) => {
    const o = o0.roof ? { ...o0, roof: o0.roof * 1.24 } : o0;
    const y = o.y ?? Y0, found = o.found ?? 12, top = o.top ?? "eave", mat = o.mat ?? "stone";
    const r = o.r, H = found + o.h, seg = clamp(Math.round(r * 6), 20, 64);
    const gy = Math.min(heightAt(o.x, o.z), y);
    B.push().translate(o.x, y - found, o.z);
    const taper = o.taper ?? 0.035;
    const rAt = (yy: number) => r * (1 + taper * (1 - yy / H));
    B.add(mat, gCyl(r, rAt(0), H, seg, STONE_T, 1), { uv: "keep", baseY: gy, tint: rand() });
    // battered plinth
    B.add("stone2", gLathe([[rAt(0) + 0.75, 0], [rAt(0) + 0.75, found + 0.6], [rAt(found + 2.2) + 0.03, found + 2.4]], seg, STONE_T), { uv: "keep", baseY: gy });
    // string courses
    const nb = o.bands ?? Math.max(1, Math.round(o.h / 13));
    for (let k = 1; k <= nb; k++) {
      const yy = found + (o.h * k) / (nb + 1);
      const rb = rAt(yy);
      B.add("stone2", gLathe([[rb, yy - 0.06], [rb + 0.17, yy], [rb + 0.17, yy + 0.3], [rb, yy + 0.5]], seg, STONE_T), { uv: "keep", snow: 1.3 });
    }
    // windows
    const rings = o.rings ?? Math.max(1, Math.round(o.h / 6.8));
    const hs = o.h / rings;
    for (let j = 0; j < rings; j++) {
      const n = Math.max(3, Math.round((TAU * r) / rr(3.4, 4.8)));
      const a0 = rand() * TAU;
      const type = o.wtype ?? (j === rings - 1 && r > 4 ? WT.twin : WT.lancet);
      const ww = type === WT.twin ? Math.min(1.7, r * 0.36) : Math.min(0.95, r * 0.24), wh = Math.min(type === WT.twin ? 3.4 : 2.7, hs * 0.5);
      const yy = found + j * hs + hs * 0.36;
      for (let i = 0; i < n; i++) {
        if (rand() < 0.16) continue;
        const a = a0 + (i / n) * TAU;
        const an = ((a % TAU) + TAU) % TAU;
        if (o.noWinFrom !== undefined && an > o.noWinFrom && an < o.noWinTo!) continue;
        const rw = rAt(yy) + 0.01;
        win(Math.sin(a) * rw, yy, Math.cos(a) * rw, Math.sin(a), Math.cos(a), ww, wh, type, o.group, o.pLit ?? 0.6);
        // sill
        B.push().rotY(a).translate(0, yy - 0.16, rw);
        B.add("stone2", gBox(ww + 0.35, 0.16, 0.3), { snow: 1.5 });
        B.pop();
      }
    }
    if (o.stair && r > 3.2) {
      const at = rand() * TAU, rt = clamp(r * 0.2, 1.15, 1.9), ht = o.h + (o.roof ?? 0) * 0.32 + 2;
      B.push().rotY(at).translate(0, found, r + rt * 0.35);
      B.add(mat, gCyl(rt, rt * 1.03, ht, 18, STONE_T, 1), { uv: "keep", tint: rand() });
      for (let k = 0; k * 4.6 < ht - 4; k++) {
        const aa = (k % 2 === 0 ? 0.5 : -0.5) + rr(-0.2, 0.2);
        win(Math.sin(aa) * (rt + 0.01), 2.2 + k * 4.6, Math.cos(aa) * (rt + 0.01), Math.sin(aa), Math.cos(aa), 0.34, 1.5, rand() < 0.4 ? WT.lancet : WT.slit, o.group, 0.5);
      }
      B.translate(0, ht, 0);
      B.add("stone2", gLathe([[rt, -0.55], [rt + 0.32, -0.1], [rt + 0.32, 0]], 18, STONE_T), { uv: "keep" });
      cone(rt + 0.4, rt * 3.6, 18);
      B.pop();
    }
    if (o.stair) {
      const a0 = rand() * TAU;
      for (let k = 0, yy = found + 3; yy < H - 5; k++, yy += 2.9) {
        const a = a0 + k * 0.82, rw = rAt(yy) + 0.01;
        win(Math.sin(a) * rw, yy, Math.cos(a) * rw, Math.sin(a), Math.cos(a), 0.34, 1.7, rand() < 0.3 ? WT.lancet : WT.slit, o.group, 0.5);
      }
    }
    // top
    // how far the eave stands out: the big towers carry a deep machicolated shadow under the roof
    const ov = r > 6 ? 1.0 : r > 3.5 ? 0.7 : 0.5;
    let roofY = H, rE = r + ov + 0.1;
    if (top === "eave") {
      B.add("stone2", gLathe([[r, H - 1.3 - ov * 0.6], [r + ov * 0.6, H - 0.75], [r + ov * 0.6, H - 0.4], [r + ov, H - 0.05], [r + ov, H]], seg, STONE_T), { uv: "keep" });
      // corbel table: a ring of brackets and the shadow they throw
      if (r > 2.4) {
        const cd = 0.3 + ov * 0.75, ch = 0.95 + ov * 0.5;
        const nc = Math.round((TAU * r) / (0.8 + ov * 0.3));
        for (let i = 0; i < nc; i++) {
          B.push().rotY((i / nc) * TAU).translate(0, H - 1.3 - ch, r + cd / 2 - 0.12);
          B.add("stone2", gBox(0.36, ch, cd));
          B.pop();
        }
        B.add("stone2", gLathe([[r, H - 1.8 - ch], [r + 0.16, H - 1.65 - ch], [r + 0.16, H - 1.4 - ch], [r, H - 1.3 - ch]], seg, STONE_T), { uv: "keep", snow: 1.2 });
      }
    } else {
      // machicolated parapet walk
      B.add("stone2", gLathe([[r, H - 2.4], [r + 0.8, H - 1.0], [r + 0.8, H + 1.15], [r + 0.32, H + 1.15], [r + 0.32, H + 0.1]], seg, STONE_T), { uv: "keep" });
      const nc = Math.round((TAU * r) / 1.3);
      for (let i = 0; i < nc; i++) {
        B.push().rotY((i / nc) * TAU).translate(0, H - 2.2, r + 0.18);
        B.add("stone2", gBox(0.42, 1.15, 0.55));
        B.pop();
      }
      B.push().translate(0, H + 0.1, 0);
      B.add("snow", gRing(Math.max(0.2, r - 1.6), r + 0.34, seg), { uv: "keep" });
      B.pop();
      merlonRing(r + 0.8, H + 1.15, 1.0, 0.48);
      if ((o.roof ?? 0) > 0) {
        const rd = r - 1.15;
        B.push().translate(0, H, 0);
        B.add(mat, gCyl(rd, rd, 2.6, seg, STONE_T, 1), { uv: "keep" });
        B.add("stone2", gLathe([[rd, 2.2], [rd + 0.35, 2.6]], seg, STONE_T), { uv: "keep" });
        const nw = Math.max(4, Math.round((TAU * rd) / 3.2));
        for (let i = 0; i < nw; i++) {
          const a = (i / nw) * TAU;
          win(Math.sin(a) * (rd + 0.01), 0.5, Math.cos(a) * (rd + 0.01), Math.sin(a), Math.cos(a), 0.7, 1.6, WT.lancet, o.group, 0.5);
        }
        B.pop();
        roofY = H + 2.6;
        rE = rd + 0.5;
      }
    }
    let tip: THREE.Vector3 | null = null;
    if ((o.roof ?? 0) > 0) {
      B.push().translate(0, roofY, 0);
      tip = cone(rE, o.roof!, seg);
      const nl = o.lucarnes ?? 0;
      const lucarne = (a: number, t: number, s: number, pLit: number) => {
        const rl = (rE * (1 - t) * (1 + 0.13 * Math.exp(-9 * t))) / 1.13;
        B.push().rotY(a).translate(0, o.roof! * t - 0.9 * s, rl - 0.55 * s);
        B.add("stone2", gBox(1.3 * s, 2.0 * s, 1.6 * s));
        win(0, 0.45 * s, 0.81 * s, 0, 1, 0.62 * s, 1.15 * s, WT.dormer, o.group, pLit);
        B.translate(0, 2.0 * s, 0).rotY(Math.PI / 4);
        B.add("roof", gPyramid(4, 1.12 * s, 1.7 * s), {});
        B.translate(0, 1.6 * s, 0);
        B.add("metal", gBall(0.09 * s, 6), { uv: "keep", snow: 0.6 });
        B.pop();
      };
      for (let i = 0; i < nl; i++) lucarne((i / nl) * TAU + 0.3, 0.16, 1, 0.75);
      // higher rows of smaller lucarnes on the big roofs, set between the ones below
      if (nl >= 6) for (let i = 0; i < nl; i++) lucarne((i / nl) * TAU + 0.3, 0.34, 0.74, 0.6);
      if (nl >= 10) for (let i = 0; i < nl; i++) {
        lucarne((i / nl) * TAU + 0.3, 0.5, 0.58, 0.5);
        if (i % 2 === 0) lucarne((i / nl) * TAU + 0.3, 0.64, 0.46, 0.4);
      }
      B.pop();
    } else if (top === "flat") {
      B.push().translate(0, H + 0.1, 0);
      B.add("snow", gDisk(r + 0.3, seg), { uv: "keep" });
      B.pop();
    }
    // corbelled corner turrets
    const nbz = o.bartizans ?? 0;
    for (let i = 0; i < nbz; i++) {
      const a = (i / nbz) * TAU + 0.6, rb = clamp(r * 0.27, 1.05, 1.7), hb = rb * 4.4;
      B.push().rotY(a).translate(0, H - 2.4, r + rb * 0.45);
      B.add("stone2", gLathe([[0.12, -rb * 2.1], [rb, 0]], 16, STONE_T), { uv: "keep" });
      B.add(mat, gCyl(rb, rb, hb, 16, STONE_T, 1), { uv: "keep" });
      win(0, hb * 0.45, rb + 0.01, 0, 1, 0.4, 1.2, WT.lancet, o.group, 0.5);
      B.translate(0, hb, 0);
      cone(rb + 0.28, rb * 3.1, 16);
      B.pop();
    }
    B.pop();
    return { H: y + o.h, roofY: y - found + roofY, tip };
  };

  // ── gabled hall ───────────────────────────────────────────────────────────────────────────────
  /** gable roof over a len × wid box (ridge along local x), origin at eave level, centre */
  const gableRoof = (len: number, wid: number, h: number, over = 0.55, snow = 1) => {
    const run = wid / 2 + over, slope = h / (wid / 2), sl = run * Math.sqrt(1 + slope * slope), a = Math.atan2(h, wid / 2);
    for (const s of [1, -1]) {
      B.push().translate(0, h - (slope * run) / 2, (s * run) / 2).rotX(s * a).translate(0, -0.26, 0);
      B.add("roof", gBox(len, 0.26, sl), { snow });
      B.pop();
    }
    B.push().translate(0, h + 0.02, 0).rotZ(Math.PI / 2).translate(0, -len / 2, 0);
    B.add("metal", gCyl(0.15, 0.15, len, 6, 1), { uv: "keep", snow: 1.2 });
    B.pop();
  };
  /** parapet gable wall (triangle) closing a roof end, facing +x; origin at eave level on the wall plane */
  const gableEnd = (wid: number, h: number, thick = 0.8, group = 0, winType = -1) => {
    const hw = wid / 2 + 0.25, hh = h + 0.9;
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0.45, hh); sh.lineTo(-0.45, hh); sh.lineTo(-hw, 0);
    B.push().rotY(Math.PI / 2).translate(0, 0, -thick);
    B.add("stone", gExtrude(sh, thick), { snow: 0.9, tint: 0.5 });
    B.pop();
    // coping stones along the rake and an apex finial
    const rl = Math.hypot(hw - 0.45, hh), ra = Math.atan2(hh, hw - 0.45);
    for (const s of [1, -1]) {
      B.push().translate(-thick / 2, hh / 2, (s * (hw + 0.45)) / 2).rotX(s * ra).translate(0, -0.02, 0);
      B.add("stone2", gBox(thick + 0.24, 0.24, rl + 0.3), { snow: 1.3 });
      B.pop();
    }
    B.push().translate(-thick / 2, hh, 0);
    B.add("stone2", gBox(0.7, 0.5, 0.95));
    B.translate(0, 0.5, 0);
    B.add("stone2", gPyramid(4, 0.5, 1.5), { snow: 0.6 });
    B.pop();
    if (winType >= 0) {
      if (winType === WT.round) win(0.01, h * 0.22, 0, 1, 0, Math.min(3.2, wid * 0.2), Math.min(3.2, wid * 0.2), WT.round, group, 0.8);
      else win(0.01, h * 0.12, 0, 1, 0, Math.min(1.9, wid * 0.14), Math.min(4.2, h * 0.5), WT.twin, group, 0.7);
    }
  };
  type HallO = {
    x: number; z: number; y?: number; len: number; wid: number; h: number; rot?: number; roof: number; storeys?: number; bays?: number; found?: number;
    buttress?: boolean; chimneys?: number; dormers?: number; gable?: number; group: number; pLit?: number; topType?: number; noWin?: ("+z" | "-z" | "+x" | "-x")[];
    /** oriel windows: [bay, side] */
    oriels?: [number, 1 | -1][];
    /** every third bay carries one tall traceried window through the middle storeys (default on the long ranges) */
    tall?: boolean;
  };
  /** oriel window corbelled out of a wall that looks at +z (origin = wall face at the oriel's floor) */
  const oriel = (w: number, d: number, h: number, group: number) => {
    for (let q = 0; q < 3; q++) {
      const dd = d * (1 - q * 0.3);
      B.push().translate(0, -0.36 * (q + 1), dd / 2);
      B.add("stone2", gBox(w - q * 0.55, 0.36, dd));
      B.pop();
    }
    B.push().translate(0, 0, d / 2);
    B.add("stone", gBox(w, h, d), { tint: 0.62 });
    B.add("stone2", gBox(w + 0.16, 0.2, d + 0.16), { snow: 1.4 });
    const n = Math.max(1, Math.round(h / 3.6)), hh = h / n;
    for (let k = 0; k < n; k++) {
      const yy = k * hh + 0.85;
      win(0, yy, d / 2, 0, 1, w * 0.6, hh * 0.6, WT.twin, group, 0.85);
      for (const s of [1, -1]) win((s * w) / 2, yy, 0, s, 0, d * 0.42, hh * 0.56, WT.lancet, group, 0.85);
      if (k > 0) {
        B.push().translate(0, k * hh, 0);
        B.add("stone2", gBox(w + 0.14, 0.2, d + 0.14), { snow: 1.4 });
        B.pop();
      }
    }
    B.translate(0, h, 0);
    B.add("stone2", gBox(w + 0.3, 0.24, d + 0.3), { snow: 1.4 });
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2 - 0.15, 0.24); sh.lineTo(d / 2 + 0.15, 0.24); sh.lineTo(-d / 2 - 0.15, 0.24 + d * 1.25); sh.lineTo(-d / 2 - 0.15, 0.24);
    B.push().rotY(-Math.PI / 2).translate(0, 0, -(w + 0.3) / 2);
    B.add("roof", gExtrude(sh, w + 0.3), {});
    B.pop();
    B.pop();
  };
  /** snow lying along a roof ridge, draped over both slopes (ridge along local x, origin on the ridge line) */
  const ridgeSnow = (len: number, slope: number, seed: number) => {
    B.add("snow", gSnowStrip(len, 1.7, (x, z) => {
      const e = Math.abs(z) / 0.85;
      const t = 0.1 + 0.22 * (0.5 + 0.5 * noise2(x * 0.33, seed)) * (0.6 + 0.4 * noise2(x * 1.3, seed + 4));
      return -slope * Math.abs(z) + 0.03 + t * Math.pow(Math.max(1 - e, 0), 0.7);
    }, 1.6, 8), { uv: "keep" });
  };
  const hall = (o: HallO) => {
    const y = o.y ?? Y0, found = o.found ?? 12, len = o.len, wid = o.wid, st = o.storeys ?? Math.max(2, Math.round(o.h / 5.6)), bays = o.bays ?? Math.max(2, Math.round(len / 4.6));
    const gy = Math.min(heightAt(o.x, o.z), y);
    const tint = rand();
    B.push().translate(o.x, y - found, o.z).rotY(o.rot ?? 0);
    const H = found + o.h;
    B.add("stone", gBox(len, H, wid), { baseY: gy, tint });
    B.add("stone2", gBox(len + 0.9, found + 1.0, wid + 0.9), { baseY: gy });
    B.push().translate(0, found + 1.0, 0);
    B.add("stone2", gBox(len + 0.5, 0.35, wid + 0.5), { snow: 1.3 });
    B.pop();
    for (let s = 1; s < st; s++) {
      B.push().translate(0, found + (o.h * s) / st - 0.15, 0);
      B.add("stone2", gBox(len + 0.34, 0.3, wid + 0.34), { snow: 1.4 });
      B.pop();
    }
    B.push().translate(0, H - 0.5, 0);
    B.add("stone2", gBox(len + 0.7, 0.5, wid + 0.7), { snow: 1.2 });
    B.pop();
    // corbel table under the cornice
    {
      const nc = Math.round(len / 0.95);
      for (const s of [1, -1]) for (let i = 0; i < nc; i++) {
        B.push().translate(-len / 2 + ((i + 0.5) * len) / nc, H - 1.05, s * (wid / 2 + 0.1));
        B.add("stone2", gBox(0.3, 0.55, 0.44));
        B.pop();
      }
    }
    // the buttressed ranges carry a battlemented parapet with the roof set back behind it
    const parapet = !!o.buttress;
    if (parapet) {
      for (const s of [1, -1]) {
        B.push().translate(0, H, s * (wid / 2 + 0.12));
        B.add("stone2", gBox(len + 0.7, 0.7, 0.42), { snow: 1.1 });
        B.pop();
        B.push().translate(0, H, s * (wid / 2 - 0.45));
        B.add("snow", gBox(len - 0.4, 0.42, 0.75), {});
        B.pop();
        merlonLine(-len / 2, s * (wid / 2 + 0.12), len / 2, s * (wid / 2 + 0.12), H + 0.7, 0.8, 0.4);
      }
    }
    const hs = o.h / st, bw = len / bays;
    const skip = new Set(o.noWin ?? []);
    const orl = st >= 3 ? o.oriels ?? [] : [];
    const tallOK = (o.tall ?? true) && st >= 4 && bays >= 5;
    for (const s of [1, -1]) {
      const side = s > 0 ? "+z" : "-z";
      for (let b = 0; b <= bays; b++) {
        if (!o.buttress) break;
        B.push().translate(-len / 2 + b * bw, found, (s * wid) / 2).rotY(s > 0 ? 0 : Math.PI);
        buttress(o.h + 0.45, 1.0, 1.25, 3.4);
        B.pop();
      }
      if (skip.has(side as "+z")) continue;
      for (let b = 0; b < bays; b++) {
        const xc = -len / 2 + (b + 0.5) * bw;
        const hasOriel = orl.some(([ob, os]) => ob === b && os === s);
        const tall = tallOK && !hasOriel && b % 3 === 1;
        for (let k = 0; k < st; k++) {
          if (rand() < 0.1) continue;
          if (hasOriel && (k === 1 || (k === 2 && st >= 4))) continue;
          if (tall && k === 2) continue;
          const topS = k === st - 1;
          let type: number = topS ? o.topType ?? WT.twin : k === 0 ? WT.twin : WT.cross;
          let ww = Math.min(type === WT.cross ? 1.5 : 1.7, bw * 0.34), wh = Math.min(type === WT.cross ? 2.3 : 3.3, hs * 0.56);
          let yy = found + k * hs + hs * 0.26;
          if (k === 0 && !topS) { wh = Math.min(3.7, hs * 0.66); yy = found + hs * 0.2; }
          if (tall && k === 1) { type = WT.great; ww = Math.min(2.3, bw * 0.5); wh = hs * 1.64; yy = found + hs * 1.2; }
          win(xc, yy, (s * wid) / 2, 0, s, ww, wh, type, o.group + (b > bays / 2 ? 1 : 0), o.pLit ?? 0.58);
          B.push().translate(xc, yy - 0.16, (s * wid) / 2 + s * 0.12);
          B.add("stone2", gBox(ww + 0.4, 0.16, 0.34), { snow: 1.5 });
          B.pop();
          // label mould over the square-headed lights
          if (type === WT.cross) {
            B.push().translate(xc, yy + wh + 0.1, (s * wid) / 2 + s * 0.1);
            B.add("stone2", gBox(ww + 0.5, 0.13, 0.26), { snow: 1.5 });
            B.pop();
          }
        }
      }
      for (const [ob, os] of orl) {
        if (os !== s) continue;
        B.push().translate(-len / 2 + (ob + 0.5) * bw, found + hs + 0.3, (s * wid) / 2).rotY(s > 0 ? 0 : Math.PI);
        oriel(Math.min(3.4, bw * 0.8), 1.25, st >= 4 ? hs * 2 - 0.6 : hs - 0.4, o.group);
        B.pop();
      }
    }
    // gable ends with their own windows
    for (const s of [1, -1]) {
      const side = s > 0 ? "+x" : "-x";
      const ne = Math.max(1, Math.round(wid / 5.5));
      if (!skip.has(side as "+x")) {
        for (let b = 0; b < ne; b++) {
          const zc = -wid / 2 + ((b + 0.5) * wid) / ne;
          for (let k = 0; k < st; k++) {
            if (rand() < 0.2) continue;
            const yy = found + k * hs + hs * 0.26;
            win((s * len) / 2, yy, zc, s, 0, 1.3, Math.min(2.4, hs * 0.55), k === st - 1 ? WT.lancet : WT.cross, o.group, o.pLit ?? 0.55);
          }
        }
      }
      B.push().translate((s * len) / 2, H, 0).rotY(s > 0 ? 0 : Math.PI);
      gableEnd(wid, o.roof, 0.8, o.group, skip.has(side as "+x") ? -1 : o.gable ?? WT.twin);
      B.pop();
      // a finial on the apex of each gable
      B.push().translate((s * len) / 2, H + o.roof + 0.55, 0);
      finial(0.62);
      B.pop();
    }
    // corner pinnacles: slender octagonal turrets corbelled out under the eaves, each with its own little spire
    if (len > 24) for (const sx of [1, -1]) for (const sz of [1, -1]) {
      B.push().translate(sx * (len / 2 + 0.05), H - 5.4, sz * (wid / 2 + 0.05));
      B.add("stone2", gPrism(8, 0.74, 0.3, 1.1), {});
      B.translate(0, 1.1, 0);
      B.add("stone", gPrism(8, 0.7, 0.74, 5.6), { tint });
      B.translate(0, 5.6, 0);
      B.add("stone2", gPrism(8, 0.86, 0.8, 0.26), { snow: 1.2 });
      B.translate(0, 0.26, 0);
      B.add("roof", gPyramid(8, 0.84, 3.6), {});
      B.translate(0, 3.45, 0);
      finial(0.45);
      B.pop();
    }
    B.push().translate(0, H, 0);
    gableRoof(len - 1.5, wid, o.roof, parapet ? -0.62 : 0.5);
    B.push().translate(0, o.roof + 0.1, 0);
    ridgeSnow(len - 1.8, o.roof / (wid / 2), o.x * 0.37 + o.z);
    B.pop();
    // dormers
    const nd = o.dormers ?? 0;
    for (let i = 0; i < nd; i++) {
      for (const s of [1, -1]) {
        const xc = -len / 2 + ((i + 0.5) * len) / nd + rr(-0.6, 0.6);
        const t = 0.3;
        B.push().translate(xc, o.roof * t - 0.2, s * (wid / 2) * (1 - t)).rotY(s > 0 ? 0 : Math.PI);
        B.add("stone2", gBox(1.5, 1.9, 1.9));
        win(0, 0.35, 0.96, 0, 1, 0.75, 1.15, WT.dormer, o.group, 0.72);
        B.translate(0, 1.9, 0.1);
        gableRoofSmall(1.9, 1.7, 1.1);
        B.pop();
      }
    }
    // chimneys ride the ridge
    const nc = o.chimneys ?? 0;
    for (let i = 0; i < nc; i++) {
      const xc = -len / 2 + ((i + 0.5) * len) / nc + rr(-1, 1), s = rand() < 0.5 ? 1 : -1;
      B.push().translate(xc, o.roof * 0.55, s * wid * 0.2);
      chimney(o.roof * 0.45 + 2.6, rand() < 0.55);
      B.pop();
    }
    B.pop();
    B.pop();
  };
  const gableRoofSmall = (len: number, wid: number, h: number) => {
    const sl = Math.hypot(wid / 2 + 0.15, h), a = Math.atan2(h, wid / 2);
    for (const s of [1, -1]) {
      B.push().rotY(Math.PI / 2).translate(0, h / 2, (s * (wid / 2 + 0.15)) / 2).rotX(s * a);
      B.add("roof", gBox(len, 0.14, sl), {});
      B.pop();
    }
  };

  // ── square tower ──────────────────────────────────────────────────────────────────────────────
  const squareTower = (o: { x: number; z: number; y?: number; w: number; h: number; roof: number; rot?: number; group: number; clock?: boolean; found?: number }) => {
    const y = o.y ?? Y0, found = o.found ?? 12, w = o.w, H = found + o.h;
    const gy = Math.min(heightAt(o.x, o.z), y);
    B.push().translate(o.x, y - found, o.z).rotY(o.rot ?? 0);
    B.add("stone", gBox(w, H, w), { baseY: gy, tint: rand() });
    B.add("stone2", gBox(w + 0.9, found + 1.0, w + 0.9), { baseY: gy });
    const nst = Math.round(o.h / 8);
    for (let s = 1; s <= nst; s++) {
      B.push().translate(0, found + (o.h * s) / (nst + 1), 0);
      B.add("stone2", gBox(w + 0.36, 0.34, w + 0.36), { snow: 1.4 });
      B.pop();
    }
    for (let q = 0; q < 4; q++) {
      B.push().rotY((q * Math.PI) / 2);
      // clasping corner buttress
      B.push().translate(w / 2 - 0.3, found, w / 2 - 0.3).rotY(Math.PI / 4).translate(0, 0, 0.2);
      buttress(o.h * 0.92, 1.3, 1.5, 3.4);
      B.pop();
      const hs = o.h / (nst + 1);
      for (let k = 0; k < nst; k++) {
        const yy = found + k * hs + hs * 0.32;
        if (k === nst - 1) {
          for (const dx of [-w * 0.2, w * 0.2]) win(dx, yy, w / 2, 0, 1, w * 0.17, hs * 0.72, WT.lancet, o.group, 0.35);
        } else win(0, yy, w / 2, 0, 1, 1.25, Math.min(2.6, hs * 0.5), WT.twin, o.group, 0.55);
      }
      if (o.clock && q < 2) win(0, found + o.h * 0.6, w / 2 + 0.02, 0, 1, w * 0.52, w * 0.52, WT.clock, o.group, 1, 0.5);
      B.pop();
    }
    B.push().translate(0, H, 0);
    B.add("stone2", gBox(w + 0.8, 0.5, w + 0.8), { snow: 1.3 });
    B.translate(0, 0.5, 0);
    for (let q = 0; q < 4; q++) {
      B.push().rotY((q * Math.PI) / 2);
      merlonLine(-w / 2 - 0.1, w / 2 + 0.15, w / 2 + 0.1, w / 2 + 0.15, 0, 0.95, 0.45);
      B.pop();
    }
    B.rotY(Math.PI / 4);
    B.add("roof", gPyramid(4, w * 0.66, o.roof), {});
    B.translate(0, o.roof - 0.2, 0);
    finial(1.1);
    B.pop();
    B.pop();
  };

  // ════════════════════════════════════════ the layout ════════════════════════════════════════

  // ── Great Hall ────────────────────────────────────────────────────────────────────────────────
  {
    const cx = -80, cz = 58, len = 60, wid = 21, h = 21, roofH = 14, found = 16, G = 1;
    const gy = Math.min(heightAt(cx, cz + wid / 2), Y0);
    B.push().translate(cx, Y0 - found, cz);
    const H = found + h;
    B.add("stone", gBox(len, H, wid), { baseY: gy, tint: 0.62 });
    B.add("stone2", gBox(len + 1.2, found + 1.4, wid + 1.2), { baseY: gy });
    B.push().translate(0, found + 1.4, 0);
    B.add("stone2", gBox(len + 0.7, 0.4, wid + 0.7), { snow: 1.3 });
    B.pop();
    B.push().translate(0, found + 4.6, 0);
    B.add("stone2", gBox(len + 0.4, 0.35, wid + 0.4), { snow: 1.5 });
    B.pop();
    const bays = 8, bw = len / bays;
    for (const s of [1, -1]) {
      for (let b = 0; b <= bays; b++) {
        B.push().translate(-len / 2 + b * bw, found - 6, (s * wid) / 2).rotY(s > 0 ? 0 : Math.PI);
        buttress(h + 6 + 0.4, 1.5, 2.6, 7.4);
        B.pop();
      }
      for (let b = 0; b < bays; b++) {
        const xc = -len / 2 + (b + 0.5) * bw;
        R.wins.push({ p: B.at(xc, found + 5.4, (s * wid) / 2 + s * 0.04), n: B.dir(0, 0, s), w: 3.3, h: 13.2, type: WT.great, lit: true, tOn: b % 3 === 0 ? -5 : 2.5 + b * 0.55 + (s > 0 ? 0 : 1.3), seed: rand(), warm: 0.55 });
        B.push().translate(xc, found + 5.2, (s * wid) / 2 + s * 0.16);
        B.add("stone2", gBox(3.9, 0.22, 0.45), { snow: 1.6 });
        B.pop();
      }
      // pierced parapet along the eaves
      B.push().translate(0, H, (s * (wid / 2 + 0.1)));
      B.add("stone2", gBox(len + 0.6, 0.55, 0.6), { snow: 1.2 });
      B.pop();
      merlonLine(-len / 2, s * (wid / 2 + 0.1), len / 2, s * (wid / 2 + 0.1), H + 0.55, 0.85, 0.42);
    }
    // west front: the great window
    R.wins.push({ p: B.at(-len / 2 - 0.04, found + 5.6, 0), n: B.dir(-1, 0, 0), w: 9.6, h: 16.5, type: WT.great, lit: true, tOn: -5, seed: 0.37, warm: 0.6 });
    for (const s of [1, -1]) {
      B.push().translate((s * len) / 2, H, 0).rotY(s > 0 ? 0 : Math.PI);
      gableEnd(wid, roofH, 1.0, G, s > 0 ? -1 : WT.round);
      B.pop();
      // octagonal corner turrets with stone spires
      for (const q of [1, -1]) {
        B.push().translate((s * (len / 2 + 0.3)), 0, q * (wid / 2 + 0.3));
        B.add("stone2", gPrism(8, 2.5, 2.7, H + 8), { baseY: gy });
        for (let k = 0; k < 3; k++) {
          B.push().translate(0, found + 7 + k * 8.5, 0);
          B.add("stone2", gPrism(8, 2.72, 2.72, 0.35), { snow: 1.4 });
          B.pop();
        }
        for (let f = 0; f < 8; f += 2) {
          const a = (f * Math.PI) / 4 + Math.PI / 8;
          win(Math.sin(a) * 2.42, H + 3.4, Math.cos(a) * 2.42, Math.sin(a), Math.cos(a), 0.55, 2.6, WT.lancet, G, 0.6);
        }
        B.translate(0, H + 8, 0);
        B.add("stone2", gPrism(8, 2.9, 2.9, 0.45), { snow: 1.3 });
        B.translate(0, 0.45, 0);
        B.add("roof", gPyramid(8, 2.75, 11), {});
        B.translate(0, 10.8, 0);
        finial(0.8);
        B.pop();
      }
    }
    B.push().translate(0, H, 0);
    gableRoof(len - 2, wid, roofH, 0.2);
    B.push().translate(0, roofH + 0.1, 0);
    ridgeSnow(len - 2.4, roofH / (wid / 2), 3.3);
    B.pop();
    // flèche on the ridge
    B.push().translate(-len * 0.12, roofH - 0.6, 0);
    B.add("stone2", gPrism(8, 1.0, 1.25, 3.6), { snow: 0.8 });
    for (let f = 0; f < 8; f += 2) win(Math.sin((f * Math.PI) / 4 + Math.PI / 8) * 0.95, 0.9, Math.cos((f * Math.PI) / 4 + Math.PI / 8) * 0.95, Math.sin((f * Math.PI) / 4 + Math.PI / 8), Math.cos((f * Math.PI) / 4 + Math.PI / 8), 0.4, 1.7, WT.lancet, G, 0.8);
    B.translate(0, 3.6, 0);
    B.add("roof", gPyramid(8, 1.25, 12.5), { snow: 1 });
    B.translate(0, 12.2, 0);
    finial(0.7);
    B.pop();
    for (let i = 0; i < 3; i++) {
      B.push().translate(len * (0.08 + i * 0.14), roofH * 0.5, -wid * 0.2);
      chimney(roofH * 0.5 + 3, i !== 1, 1.3);
      B.pop();
    }
    B.pop();
    // warm pools of light the tall windows throw on the terrace
    for (let b = 0; b < bays; b += 2) for (const s of [1, -1]) lamp(-len / 2 + (b + 1) * bw, found + 9, (s * (wid / 2 + 2.2)), 2.4, 13, 2.5 + b * 0.55, 0);
    lamp(-len / 2 - 3, found + 12, 0, 3.2, 15, -5, 0);
    B.pop();
  }

  // ── the great staircase tower beside the hall
  pennant(roundTower({ x: -32, z: 50, r: 13.5, h: 48, roof: 31, top: "eave", bands: 4, rings: 6, lucarnes: 10, group: 3, stair: true, found: 16, pLit: 0.66 }).tip, 8, 1.8, 0);
  // ── entrance hall and its court at the head of the viaduct
  hall({ x: 0, z: 46, len: 30, wid: 22, h: 26, roof: 12.5, storeys: 5, bays: 6, group: 5, buttress: true, chimneys: 2, dormers: 3, gable: WT.round, noWin: [], oriels: [[3, 1], [2, -1]] });
  {
    // door in the east front
    B.push().translate(15.02, Y0, 46);
    const sh = new THREE.Shape();
    sh.moveTo(-3.6, 0); sh.lineTo(3.6, 0); sh.lineTo(3.6, 6.5); sh.lineTo(0, 10.4); sh.lineTo(-3.6, 6.5); sh.lineTo(-3.6, 0);
    const hole = new THREE.Path();
    archOutline(hole, 0, 5.0, 0.01, 4.6, 0.82);
    sh.holes.push(hole);
    B.push().rotY(Math.PI / 2);
    B.add("stone2", gExtrude(sh, 1.1), { snow: 0.8 });
    B.pop();
    win(0.3, 0, 0, 1, 0, 5.0, 4.6 + archRise(5.0, 0.82), WT.door, 5, 1, 0.4);
    R.wins[R.wins.length - 1].lit = true;
    R.wins[R.wins.length - 1].tOn = -5;
    for (const s of [1, -1]) {
      B.push().translate(1.2, 5.4, s * 4.6).rotY(Math.PI / 2);
      wallLamp(-5, 1.5);
      B.pop();
    }
    // steps
    for (let k = 0; k < 4; k++) {
      B.push().translate(1.4 + k * 0.6, -0.9 + (3 - k) * 0.22 - 0.2, 0);
      B.add("stone2", gBox(1.4, 0.3, 9 + k * 1.2), { snow: 1.5 });
      B.pop();
    }
    B.pop();
  }
  // court walls and the two gate turrets
  const wallRun = (x0: number, z0: number, x1: number, z1: number, h = 5.5, y = Y0, thick = 1.3) => {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    const gy = Math.min(heightAt((x0 + x1) / 2, (z0 + z1) / 2), y);
    B.push().translate((x0 + x1) / 2, y - 12, (z0 + z1) / 2).rotY(a + Math.PI / 2);
    B.add("stone", gBox(len, h + 12, thick), { baseY: gy, tint: 0.4 });
    B.push().translate(0, h + 12, 0);
    B.add("stone2", gBox(len + 0.2, 0.3, thick + 0.4), { snow: 1.3 });
    B.pop();
    B.pop();
    const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
    for (const s of [1, -1]) merlonLine(x0 + nx * s * (thick / 2 - 0.05), z0 + nz * s * (thick / 2 - 0.05), x1 + nx * s * (thick / 2 - 0.05), z1 + nz * s * (thick / 2 - 0.05), y + h + 0.3, 0.95, 0.42);
  };
  wallRun(15, 28.5, 49, 28.5);
  wallRun(15, 63.5, 49, 63.5);
  wallRun(50.5, 28.5, 50.5, 39);
  wallRun(50.5, 53, 50.5, 63.5);
  for (const zz of [39.6, 52.4]) roundTower({ x: 51, z: zz, r: 2.9, h: 15, roof: 8.5, top: "corbel", bands: 1, rings: 2, group: 6, found: 14, pLit: 0.7 });
  for (const [lx, lz] of [[22, 33], [22, 59], [40, 33], [40, 59]] as const) {
    B.push().translate(lx, Y0 - 0.1, lz);
    lampPost(3.6, 6 + rand() * 2, 1.3);
    B.pop();
  }

  // ── the gate between the two turrets: a moulded archway, the portcullis drawn up into it, a chamber above,
  //    fire baskets at its feet, banners on the turrets and a few things left by the wall
  /** iron fire basket on a stone block (origin = foot of the block) */
  const brazier = (tOn: number) => {
    B.add("stone2", gBox(0.72, 0.85, 0.72), {});
    B.push().translate(0, 0.85, 0);
    B.add("stone2", gBox(0.86, 0.12, 0.86), { snow: 1.3 });
    B.translate(0, 0.12, 0);
    for (let q = 0; q < 3; q++) {
      B.push().rotY((q / 3) * TAU).translate(0, 0, 0.2).rotX(-0.22);
      B.add("metal", gBox(0.045, 0.62, 0.045), { snow: 0 });
      B.pop();
    }
    B.translate(0, 0.56, 0);
    B.add("metal", gCyl(0.4, 0.24, 0.4, 10, 1), { uv: "keep", snow: 0 });
    B.add("metal", gLathe([[0.38, 0.36], [0.44, 0.4], [0.38, 0.44]], 10, 1), { uv: "keep", snow: 0 });
    B.push().translate(0, 0.3, 0);
    B.add("lamp", gDisk(0.35, 10), { uv: "keep", snow: tOn, tint: 1.3 });
    B.pop();
    R.flames.push({ p: B.at(0, 0.34, 0), s: 1.3, tOn });
    lamp(0, 0.95, 0, 2.6, 11, tOn, 0.4, [1, 0.5, 0.18], true);
    B.pop();
  };
  const barrel = (s = 1) => {
    B.add("wood", gLathe([[0.27 * s, 0], [0.33 * s, 0.22 * s], [0.345 * s, 0.45 * s], [0.33 * s, 0.68 * s], [0.27 * s, 0.9 * s]], 12, 1), { uv: "keep", snow: 0.15, tint: dr(0.3, 0.7) });
    for (const yh of [0.16, 0.74]) B.add("metal", gLathe([[0.3 * s, (yh - 0.035) * s], [0.345 * s, yh * s], [0.3 * s, (yh + 0.035) * s]], 12, 1), { uv: "keep", snow: 0 });
    B.push().translate(0, 0.9 * s, 0);
    B.add("wood", gDisk(0.27 * s, 12), { uv: "keep", snow: 1 });
    snowCap(0.62 * s, 0.62 * s, 0.17 * s);
    B.pop();
  };
  {
    const gx = 49.9, gzc = 46, gw = 7.7, gt = 1.8, gh = 10.6, ow = 4.4, osp = 3.5, ok = 0.8;
    const rise = archRise(ow, ok), Rb = ok * ow, off = Rb - ow / 2;
    const sh = new THREE.Shape();
    sh.moveTo(-gw / 2, -2); sh.lineTo(gw / 2, -2); sh.lineTo(gw / 2, gh); sh.lineTo(-gw / 2, gh); sh.lineTo(-gw / 2, -2);
    const hole = new THREE.Path();
    archOutline(hole, 0, ow, -0.4, osp, ok);
    sh.holes.push(hole);
    // local frame: x runs along the wall, z through it; the bridge side is the face at z = gt
    B.push().translate(gx, Y0, gzc).rotY(Math.PI / 2);
    B.add("stone", gExtrude(sh, gt, 12), { tint: 0.5, baseY: Y0 - 1 });
    // two orders of moulding round the arch, their jambs below the springing
    const band = (r0: number, r1: number) => {
      const Ra = Rb + r0, Rc = Rb + r1, hA2 = Math.sqrt(Ra * Ra - off * off), hC2 = Math.sqrt(Rc * Rc - off * off);
      const s2 = new THREE.Shape();
      s2.moveTo(ow / 2 + r1, osp);
      s2.absarc(-off, osp, Rc, 0, Math.atan2(hC2, off), false);
      s2.absarc(off, osp, Rc, Math.atan2(hC2, -off), Math.PI, false);
      s2.lineTo(-ow / 2 - r0, osp);
      s2.absarc(off, osp, Ra, Math.PI, Math.atan2(hA2, -off), true);
      s2.absarc(-off, osp, Ra, Math.atan2(hA2, off), 0, true);
      s2.lineTo(ow / 2 + r1, osp);
      return s2;
    };
    for (const [r0, r1, proud] of [[0, 0.38, 0.17], [0.38, 0.8, 0.34]] as const) {
      B.push().translate(0, 0, gt);
      B.add("stone2", gExtrude(band(r0, r1), proud, 12), { snow: 0.8, tint: 0.62 });
      for (const s of [1, -1]) {
        B.push().translate(s * (ow / 2 + (r0 + r1) / 2), -0.4, proud / 2);
        B.add("stone2", gBox(r1 - r0, osp + 0.4, proud), { baseY: Y0 });
        B.translate(0, osp + 0.4 - 0.28, 0);
        B.add("stone2", gBox(r1 - r0 + 0.1, 0.28, proud + 0.1), { snow: 1.2 });
        B.pop();
      }
      B.pop();
    }
    // two inner orders set back in the thickness of the wall: the passage reads as deep
    for (const zf of [0.1, gt - 0.52]) {
      B.push().translate(0, 0, zf);
      B.add("stone2", gExtrude(band(-0.3, 0), 0.32, 12), { tint: 0.5 });
      for (const s of [1, -1]) {
        B.push().translate(s * (ow / 2 - 0.15), -0.4, 0.16);
        B.add("stone2", gBox(0.3, osp + 0.4, 0.32), { baseY: Y0 });
        B.pop();
      }
      B.pop();
    }
    // the chamber over the arch: string course, three lights to the bridge and to the court, corbelled wall-walk
    B.push().translate(0, osp + rise + 1.05, gt / 2);
    B.add("stone2", gBox(gw, 0.3, gt + 0.36), { snow: 1.4 });
    B.pop();
    for (const dx of [-2.1, 0, 2.1]) {
      win(dx, osp + rise + 1.5, gt, 0, 1, 0.55, 1.55, WT.lancet, 6, 0.95, 0.5);
      win(dx, osp + rise + 1.5, 0, 0, -1, 0.55, 1.55, WT.lancet, 6, 0.8, 0.5);
      B.push().translate(dx, osp + rise + 1.36, gt + 0.12);
      B.add("stone2", gBox(0.95, 0.14, 0.3), { snow: 1.5 });
      B.pop();
    }
    for (let i = 0; i < 10; i++) {
      B.push().translate(-gw / 2 + ((i + 0.5) * gw) / 10, gh - 0.75, gt + 0.16);
      B.add("stone2", gBox(0.36, 0.75, 0.5));
      B.pop();
    }
    B.push().translate(0, gh, gt / 2);
    B.add("stone2", gBox(gw, 0.36, gt + 0.95), { snow: 0.6 });
    B.translate(0, 0.36, 0);
    B.add("snow", gBox(gw - 0.1, 0.2, gt - 0.1), {});
    B.pop();
    merlonLine(-gw / 2, gt + 0.25, gw / 2, gt + 0.25, gh + 0.36, 0.95, 0.45);
    merlonLine(-gw / 2, -0.25, gw / 2, -0.25, gh + 0.36, 0.95, 0.45);
    // icicles under the wall-walk and in the head of the arch
    B.push().translate(0, gh - 0.75, gt + 0.42);
    icicles(gw - 0.6, 2.6, 0.85, 0.5);
    B.pop();
    // portcullis, drawn up: its feet hang in the arch
    const pz = gt * 0.45, yB = 4.55;
    for (let x = -ow / 2 + 0.2; x < ow / 2 - 0.05; x += 0.4) {
      const yt = osp + Math.sqrt(Math.max(Rb * Rb - (Math.abs(x) + off) ** 2, 0));
      if (yt - yB < 0.15) continue;
      B.push().translate(x, yB, pz);
      B.add("metal", gBox(0.085, yt - yB, 0.085), { snow: 0 });
      B.rotX(Math.PI);
      B.add("metal", gPyramid(4, 0.075, 0.32), { snow: 0 });
      B.pop();
    }
    for (let yy = yB + 0.22; yy < osp + rise - 0.25; yy += 0.5) {
      const hw = Math.sqrt(Math.max(Rb * Rb - (yy - osp) ** 2, 0)) - off;
      if (hw < 0.3) continue;
      B.push().translate(0, yy, pz);
      B.add("metal", gBox(hw * 2, 0.075, 0.055), { snow: 0.5 });
      B.pop();
    }
    B.pop();

    // fire baskets either side of the way in (lit just before the lanterns of the viaduct)
    for (const s of [1, -1]) {
      B.push().translate(gx + gt + 1.15, Y0 + 0.3, gzc + s * 2.95).scale(1.3, 1.3, 1.3);
      brazier(6.6 + (s > 0 ? 0 : 0.25));
      B.pop();
    }
    // banners on the two turrets
    for (const zz of [39.6, 52.4]) {
      B.push().translate(51 + 2.98 + 0.2, Y0 + 12.1, zz).rotY(Math.PI / 2).rotZ(zz < 46 ? 0.02 : -0.025);
      const bw2 = 1.25, bl = 5.6;
      B.push().translate(0, 0.04, 0).rotZ(Math.PI / 2).translate(0, -(bw2 + 0.5) / 2, 0);
      B.add("metal", gCyl(0.035, 0.035, bw2 + 0.5, 6, 1), { uv: "keep", snow: 1 });
      B.pop();
      const bs = new THREE.Shape();
      bs.moveTo(-bw2 / 2, 0); bs.lineTo(bw2 / 2, 0); bs.lineTo(bw2 / 2, -bl); bs.lineTo(0, -bl + 0.6); bs.lineTo(-bw2 / 2, -bl); bs.lineTo(-bw2 / 2, 0);
      B.add("banner", gExtrude(bs, 0.03), { snow: 0.25, tint: 0.5 });
      const st2 = new THREE.Shape();
      st2.moveTo(-0.14, -0.01); st2.lineTo(0.14, -0.01); st2.lineTo(0.14, -bl + 0.47); st2.lineTo(0, -bl + 0.61); st2.lineTo(-0.14, -bl + 0.47); st2.lineTo(-0.14, -0.01);
      B.push().translate(0, 0, 0.02);
      B.add("banner2", gExtrude(st2, 0.025), { snow: 0.25, tint: 0.5 });
      B.pop();
      B.pop();
    }
    // left by the wall: barrels, a crate, a hand sledge with firewood
    const yD = Y0 + 0.44;
    for (const [px, pz2, ps, top] of [[54.7, 43.42, 1, 0], [55.42, 43.5, 0.92, 0], [55.05, 43.44, 0.8, 1]] as const) {
      B.push().translate(px, yD + (top ? 0.86 : 0), pz2).rotY(dr(0, 6));
      barrel(ps);
      B.pop();
    }
    B.push().translate(56.5, yD, 43.5).rotY(0.25);
    B.add("wood", gBox(0.9, 0.7, 0.75), { snow: 0.3, tint: 0.35 });
    B.translate(0, 0.7, 0);
    snowCap(0.95, 0.8, 0.2);
    B.pop();
    B.push().translate(55.6, yD, 48.62).rotY(0.34);
    for (const sx of [1, -1]) {
      B.push().translate(sx * 0.3, 0, 0);
      B.add("wood", gBox(0.06, 0.12, 1.7), { snow: 0.2 });
      B.pop();
    }
    B.push().translate(0, 0.26, 0);
    B.add("wood", gBox(0.72, 0.05, 1.45), { snow: 0.3 });
    for (let q = 0; q < 6; q++) {
      B.push().translate(-0.26 + (q % 3) * 0.26, 0.14 + Math.floor(q / 3) * 0.2, -0.55).rotX(Math.PI / 2);
      B.add("wood", gCyl(0.1, 0.1, 1.1, 7, 1), { uv: "keep", snow: 0.2, tint: dr(0.2, 0.8) });
      B.pop();
    }
    B.translate(0, 0.52, 0);
    snowCap(0.8, 1.2, 0.2);
    B.pop();
    B.pop();
  }

  // ── the viaduct ───────────────────────────────────────────────────────────────────────────────
  {
    const x0 = 53, x1 = 173, zc = 46, yDeck = Y0 + 0.3, wid = 7.6, n = 7, yMin = -4;
    const L = x1 - x0, span = L / n, pier = 4.4, ySpring = yDeck - 15.5, k = 0.72;
    const sh = new THREE.Shape();
    sh.moveTo(0, yDeck); sh.lineTo(L, yDeck); sh.lineTo(L, yMin);
    for (let i = n - 1; i >= 0; i--) {
      const xr = (i + 1) * span - pier / 2, xl = i * span + pier / 2, w = xr - xl, cxm = (xl + xr) / 2;
      const Rr = k * w, off = Rr - w / 2, hA = Math.sqrt(Rr * Rr - off * off);
      sh.lineTo(xr, yMin); sh.lineTo(xr, ySpring);
      sh.absarc(cxm - off, ySpring, Rr, 0, Math.atan2(hA, off), false);
      sh.absarc(cxm + off, ySpring, Rr, Math.atan2(hA, -off), Math.PI, false);
      sh.lineTo(xl, yMin);
    }
    sh.lineTo(0, yMin); sh.lineTo(0, yDeck);
    B.push().translate(x0, 0, zc - wid / 2);
    B.add("stone", gExtrude(sh, wid, 14), { tint: 0.8, snow: 0.8, baseY: 16 });
    B.pop();
    B.push().translate(x0 + L / 2, 0, zc);
    // deck (snow), string course, parapets
    B.push().translate(0, yDeck, 0);
    const dw = wid - 1.15;
    B.add("stone2", gBox(L, 0.02, dw), { snow: 0 });
    // the snow on the deck: drifts against the parapets, wind ripples, and the hollow of the trodden path
    // (cart ruts and footprints are drawn into it by the deck shader, along the same line)
    B.add("deck", gSnowStrip(L + 14, dw, (x, z) => {
      const e = Math.abs(z) / (dw / 2);
      const drift = 0.34 * Math.pow(sstep(0.45, 1.0, e), 1.5) * (0.65 + 0.6 * noise2(x * 0.21, z > 0 ? 3.3 : 9.1));
      const dunes = 0.04 * noise2(x * 0.5, z * 0.55) + 0.05 * noise2(x * 0.09 + 5, z * 0.2);
      const pathC = deckPath(x + x0 + L / 2);
      const path = -0.085 * (1 - sstep(0.75, 1.5, Math.abs(z - pathC))) * (0.75 + 0.25 * noise2(x * 1.9, z * 1.9));
      return 0.215 + drift + dunes + path;
    }, 3, 22), { uv: "keep" });
    B.pop();
    for (const s of [1, -1]) {
      B.push().translate(0, yDeck - 0.9, s * (wid / 2 + 0.08));
      B.add("stone2", gBox(L + 1, 0.4, 0.5), { snow: 1.3 });
      B.translate(0, 0.9, s * -0.4);
      B.add("stone", gBox(L + 1, 1.15, 0.5), { tint: 0.55 });
      B.translate(0, 1.15, 0);
      B.add("stone2", gBox(L + 1, 0.16, 0.66), { snow: 0.6 });
      B.translate(0, 0.16, 0);
      B.add("snow", gSnowRidge(L + 1, 0.62, 0.24, s * 2.1), { uv: "keep" });
      B.pop();
    }
    B.pop();
    // ── dressed stone: a ring of voussoirs round every arch (it also lines the soffit), imposts at the springing
    for (let i = 0; i < n; i++) {
      const xr = (i + 1) * span - pier / 2, xl = i * span + pier / 2, w = xr - xl, cxm = (xl + xr) / 2;
      const Rr = k * w, off = Rr - w / 2, hA = Math.sqrt(Rr * Rr - off * off);
      const tr = 0.62, Ro = Rr + tr, hO = Math.sqrt(Ro * Ro - off * off), Ri = Rr - 0.035, hI = Math.sqrt(Ri * Ri - off * off);
      const ring = new THREE.Shape();
      ring.moveTo(xr + tr, ySpring);
      ring.absarc(cxm - off, ySpring, Ro, 0, Math.atan2(hO, off), false);
      ring.absarc(cxm + off, ySpring, Ro, Math.atan2(hO, -off), Math.PI, false);
      ring.lineTo(xl + 0.035, ySpring);
      ring.absarc(cxm + off, ySpring, Ri, Math.PI, Math.atan2(hI, -off), true);
      ring.absarc(cxm - off, ySpring, Ri, Math.atan2(hI, off), 0, true);
      ring.lineTo(xr + tr, ySpring);
      B.push().translate(x0, 0, zc - wid / 2 - 0.2);
      B.add("stone2", gExtrude(ring, wid + 0.4, 14), { snow: 0.7, tint: 0.9 });
      B.pop();
      // keystone standing proud at the point of the arch
      B.push().translate(x0 + cxm, ySpring + hA - 0.4, zc);
      B.add("stone2", gBox(1.0, 1.6, wid + 0.8), { snow: 1.2, tint: 0.8 });
      B.pop();
    }
    for (let i = 0; i <= n; i++) {
      B.push().translate(x0 + i * span, ySpring - 0.55, zc);
      B.add("stone2", gBox(pier + 0.5, 0.55, wid + 0.5), { snow: 1.3 });
      B.pop();
    }
    for (const s of [1, -1]) {
      // corbel table under the string course
      const nc = Math.round(L / 1.1);
      for (let i = 0; i < nc; i++) {
        B.push().translate(x0 + ((i + 0.5) * L) / nc, yDeck - 1.42, zc + s * (wid / 2 + 0.12));
        B.add("stone2", gBox(0.36, 0.52, 0.34));
        B.pop();
      }
      // little piers along the parapet, each with its cap of snow
      for (let i = 0; i < n; i++) for (const j of [1, 2]) {
        B.push().translate(x0 + (i + j / 3) * span, yDeck, zc + s * (wid / 2 - 0.32));
        B.add("stone2", gBox(0.7, 1.5, 0.7));
        B.translate(0, 1.5, 0);
        B.add("stone2", gPyramid(4, 0.56, 0.24), { snow: 1.4 });
        snowCap(0.62, 0.62, 0.2);
        B.pop();
      }
      // a stone spout over every arch crown, and the ice that hangs from it and from the string course
      for (let i = 0; i < n; i++) {
        const xc = x0 + (i + 0.5) * span;
        B.push().translate(xc, yDeck - 1.36, zc + s * (wid / 2 + 0.5)).rotY(s > 0 ? 0 : Math.PI);
        B.add("stone2", gBox(0.34, 0.3, 1.0), { snow: 1.4 });
        B.translate(0, 0, 0.42);
        icicles(0.36, 18, 2.9, 0.95);
        B.pop();
        for (let q = 0; q < 3; q++) {
          const fl = dr(2.5, 6.5);
          B.push().translate(x0 + (i + dr(0.12, 0.88)) * span, yDeck - 0.9, zc + s * (wid / 2 + 0.34));
          icicles(fl, 3.2, dr(0.8, 1.9), 0.6);
          B.pop();
        }
      }
    }
    // piers: stepped cutwaters and a refuge with a lantern above each one
    for (let i = 0; i <= n; i++) {
      const xp = x0 + i * span;
      const gy = heightAt(xp, zc);
      for (const s of [1, -1]) {
        B.push().translate(xp, gy - 3, zc + s * (wid / 2)).rotY(s > 0 ? 0 : Math.PI);
        buttress(yDeck - gy + 3 - 0.2, pier * 0.8, 2.4);
        B.translate(0, yDeck - gy + 3 - 0.35, 0.42);
        B.add("stone2", gPrism(8, 0.62, 0.5, 1.75), {});
        B.translate(0, 1.75, 0);
        B.add("stone2", gPrism(8, 0.7, 0.7, 0.14), { snow: 0.7 });
        B.translate(0, 0.14, 0);
        snowCap(1.05, 1.05, 0.16);
        lampPost(2.75, 7.5 + i * 0.75 + (s > 0 ? 0 : 0.3), 1.6, true);
        B.pop();
      }
    }
    // far gatehouse on the hill
    roundTower({ x: x1 + 4, z: zc - 7.5, y: yDeck - 0.3, r: 3.2, h: 12, roof: 8, top: "corbel", bands: 1, rings: 2, group: 7, found: 14 });
    roundTower({ x: x1 + 4, z: zc + 7.5, y: yDeck - 0.3, r: 3.2, h: 12, roof: 8, top: "corbel", bands: 1, rings: 2, group: 7, found: 14 });
  }

  // ── the quadrangle and its ranges
  hall({ x: -68, z: 22, len: 64, wid: 15, h: 24, roof: 9.5, storeys: 4, bays: 9, group: 10, chimneys: 5, dormers: 6, buttress: true });
  hall({ x: -101, z: -6, len: 56, wid: 15, h: 22, roof: 9.5, rot: Math.PI / 2, storeys: 4, bays: 8, group: 12, chimneys: 4, dormers: 5 });
  hall({ x: -68, z: -34, len: 64, wid: 15, h: 26, roof: 10, storeys: 4, bays: 9, group: 14, chimneys: 5, dormers: 6, buttress: true });
  hall({ x: -35, z: -6, len: 56, wid: 15, h: 24, roof: 9.5, rot: Math.PI / 2, storeys: 4, bays: 8, group: 16, chimneys: 4, dormers: 5 });
  hall({ x: -108, z: 38, len: 22, wid: 12, h: 19, roof: 8, rot: Math.PI / 2, storeys: 3, bays: 3, group: 18, chimneys: 1 });
  hall({ x: 22, z: -22, len: 44, wid: 16, h: 22, roof: 9.5, storeys: 4, bays: 9, group: 20, chimneys: 3, dormers: 4, buttress: true, oriels: [[2, 1], [6, 1]] });
  hall({ x: 44, z: -40, len: 28, wid: 13, h: 18, roof: 8.5, rot: Math.PI / 2, storeys: 3, bays: 4, group: 22, chimneys: 2, oriels: [[1, 1]] });
  hall({ x: -12, z: 12, len: 26, wid: 13, h: 30, roof: 9, rot: Math.PI / 2, storeys: 6, bays: 5, group: 24, chimneys: 2, dormers: 2, oriels: [[2, 1]] });

  // ── towers
  pennant(roundTower({ x: -24, z: -46, r: 5.2, h: 58, roof: 16, top: "corbel", bartizans: 3, group: 30, stair: true }).tip, 5.5, 1.25, 1);
  roundTower({ x: -112, z: 26, r: 5.4, h: 38, roof: 14, top: "eave", lucarnes: 4, group: 31 });
  pennant(roundTower({ x: 14, z: 10, r: 7.6, h: 46, roof: 20, top: "eave", lucarnes: 6, group: 32, stair: true, pLit: 0.7 }).tip, 6, 1.4, 2);
  roundTower({ x: -8, z: 22, r: 3.7, h: 54, roof: 12.5, top: "corbel", group: 33, stair: true });
  roundTower({ x: -35, z: 24, r: 4.3, h: 41, roof: 12.5, top: "eave", group: 34 });
  roundTower({ x: 2, z: -44, r: 4.5, h: 37, roof: 11.5, top: "corbel", bartizans: 2, group: 35 });
  roundTower({ x: 40, z: 20, r: 4.0, h: 30, roof: 10.5, top: "eave", group: 36 });
  roundTower({ x: -101, z: -36, r: 3.4, h: 33, roof: 9.5, top: "eave", group: 37 });
  roundTower({ x: 24, z: 26, r: 2.9, h: 24, roof: 8, top: "eave", group: 36 });
  {
    // the headmaster's tower: a shaft with two stacked turrets hanging off its sides
    const x = -66, z = -52;
    const t = roundTower({ x, z, r: 4.7, h: 50, roof: 13.5, top: "eave", lucarnes: 4, group: 38, pLit: 0.75 });
    for (const [a, y0, hh, rb] of [[0.9, 22, 22, 2.7], [3.6, 31, 19, 2.3]] as const) {
      B.push().translate(x + Math.sin(a) * (4.7 + rb * 0.55), Y0 + y0, z + Math.cos(a) * (4.7 + rb * 0.55));
      B.add("stone2", gLathe([[0.15, -rb * 2.3], [rb, 0]], 20, STONE_T), { uv: "keep" });
      B.add("stone", gCyl(rb, rb, hh, 20, STONE_T, 1), { uv: "keep", tint: 0.6 });
      for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) {
        const aa = a + (i - 1.5) * 0.7;
        if (rand() < 0.3) continue;
        win(Math.sin(aa) * (rb + 0.01), 3 + k * 6, Math.cos(aa) * (rb + 0.01), Math.sin(aa), Math.cos(aa), 0.55, 1.8, WT.lancet, 38, 0.75);
      }
      B.translate(0, hh, 0);
      B.add("stone2", gLathe([[rb, -0.5], [rb + 0.4, 0]], 20, STONE_T), { uv: "keep" });
      cone(rb + 0.45, rb * 3.3, 20);
      B.pop();
    }
    pennant(t.tip, 5, 1.15, 0);
  }
  {
    // the astronomy tower: the tallest shaft, a corbelled gallery, an open lantern stage and turrets at its shoulders
    const x = -108, z = -44, r = 6.9, h = 74;
    roundTower({ x, z, r, h, roof: 0, top: "corbel", bands: 5, rings: 8, group: 40, stair: true, found: 16, pLit: 0.5 });
    B.push().translate(x, Y0 + h, z);
    const r2 = 5.0, h2 = 11;
    B.add("stone", gCyl(r2, r2 + 0.2, h2, 36, STONE_T, 1), { uv: "keep", tint: 0.55 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      win(Math.sin(a) * (r2 + 0.12), 2.2, Math.cos(a) * (r2 + 0.12), Math.sin(a), Math.cos(a), 1.5, 6.2, WT.twin, 40, 0.8, 0.7);
    }
    B.translate(0, h2, 0);
    B.add("stone2", gLathe([[r2, -0.9], [r2 + 0.5, -0.2], [r2 + 0.5, 0]], 36, STONE_T), { uv: "keep" });
    pennant(cone(r2 + 0.6, 17, 36), 6.5, 1.5, 1);
    B.pop();
    for (const [a, y0, hh, rb] of [[0.7, 44, 40, 2.5], [2.9, 56, 36, 2.1], [4.6, 30, 34, 2.3]] as const) {
      B.push().translate(x + Math.sin(a) * (r + rb * 0.5), Y0 + y0, z + Math.cos(a) * (r + rb * 0.5));
      B.add("stone2", gLathe([[0.15, -rb * 2.4], [rb, 0]], 20, STONE_T), { uv: "keep" });
      B.add("stone", gCyl(rb, rb, hh, 20, STONE_T, 1), { uv: "keep", tint: 0.5 });
      for (let k = 0; k * 5.5 < hh - 4; k++) {
        const aa = a + (rand() - 0.5) * 1.6;
        win(Math.sin(aa) * (rb + 0.01), 2.5 + k * 5.5, Math.cos(aa) * (rb + 0.01), Math.sin(aa), Math.cos(aa), 0.5, 1.7, rand() < 0.6 ? WT.lancet : WT.slit, 40, 0.6);
      }
      B.translate(0, hh, 0);
      B.add("stone2", gLathe([[rb, -0.5], [rb + 0.4, 0]], 20, STONE_T), { uv: "keep" });
      cone(rb + 0.45, rb * 3.5, 20);
      B.pop();
    }
  }
  squareTower({ x: 52, z: -2, w: 11.5, h: 41, roof: 17, group: 44, clock: true });
  squareTower({ x: -2, z: -66, w: 8, h: 30, roof: 12, group: 45 });
  squareTower({ x: -46, z: -66, w: 8, h: 30, roof: 12, group: 45 });
  hall({ x: -24, z: -66, len: 36, wid: 11, h: 17, roof: 7.5, storeys: 3, bays: 5, group: 46, chimneys: 2 });

  // ── terrace walls along the cliff edge
  wallRun(-116, 72, -46, 76, 1.6, Y0 - 2.6, 1.1);
  wallRun(-46, 76, -18, 70, 1.6, Y0 - 2.6, 1.1);
  wallRun(-122, 18, -116, 72, 1.6, Y0 - 3, 1.1);
  wallRun(66, -30, 78, 8, 2.2, Y0 - 1.2, 1.1);
  wallRun(78, 8, 64, 26, 2.2, Y0 - 1.2, 1.1);
  for (const [lx, lz] of [[-100, 72.5], [-72, 74.2], [-34, 72.5], [-121, 44], [70, -8]] as const) {
    B.push().translate(lx, Y0 - 1.4, lz);
    lampPost(3.4, 9 + rand() * 6, 1.2);
    B.pop();
  }

  // ── greenhouses on the north lawn
  for (let i = 0; i < 3; i++) {
    const gx = -86 + i * 15, gz = -86 - i * 1.5, gl = 24, gw = 8.4;
    const gy = heightAt(gx, gz);
    B.push().translate(gx, gy - 3, gz).rotY(0.08);
    B.add("stone2", gBox(gw + 0.5, 3 + 1.1, gl + 0.5), { baseY: gy });
    B.translate(0, 3 + 1.1, 0);
    // glass walls and roof are window quads lit from inside with a greenish glow
    for (const s of [1, -1]) {
      for (let k = 0; k < 6; k++) {
        const zc = -gl / 2 + ((k + 0.5) * gl) / 6;
        R.wins.push({ p: B.at(s * (gw / 2), 0.05, zc), n: B.dir(s, 0, 0), w: gl / 6 - 0.25, h: 2.3, type: WT.glass, lit: true, tOn: 4 + i * 2.5 + k * 0.2, seed: rand(), warm: 0.15 });
      }
      B.push().translate(s * (gw / 4 + 0.05), 2.35 + 1.25, 0).rotZ(-s * Math.atan2(2.5, gw / 2));
      B.add("glassroof", gBox(Math.hypot(gw / 2, 2.5) + 0.3, 0.07, gl + 0.3), { snow: 0.75 });
      B.pop();
    }
    for (const s of [1, -1]) {
      R.wins.push({ p: B.at(0, 0.05, s * (gl / 2)), n: B.dir(0, 0, s), w: gw - 0.5, h: 2.3, type: WT.glass, lit: true, tOn: 4 + i * 2.5, seed: rand(), warm: 0.15 });
    }
    B.add("metal", gBox(gw + 0.1, 0.12, gl + 0.1), { snow: 0 });
    B.push().translate(0, 2.35, 0);
    B.add("metal", gBox(gw + 0.1, 0.12, gl + 0.1), { snow: 0 });
    B.pop();
    lamp(0, 1.6, 0, 1.6, 9, 4 + i * 2.5, 0, [0.75, 0.9, 0.45]);
    B.pop();
  }

  // ── covered wooden bridge to the north-east
  {
    const ax = 67, az = -31, bx = 174, bz = -96, y = Y0 - 0.4;
    const len = Math.hypot(bx - ax, bz - az), a = Math.atan2(bx - ax, bz - az), bays = Math.round(len / 5.2), bl = len / bays, wid = 3.6;
    B.push().translate(ax, y, az).rotY(a);
    // deck and roof run along +z
    B.push().translate(0, -0.3, len / 2);
    B.add("wood", gBox(wid, 0.3, len), { snow: 0.5 });
    B.translate(0, 3.5, 0);
    B.pop();
    B.push().translate(0, 3.2, len / 2).rotY(Math.PI / 2);
    gableRoofWood(len + 1, wid + 0.9, 1.9);
    B.pop();
    for (let i = 0; i <= bays; i++) {
      const zc = i * bl;
      const wp = B.at(0, 0, zc), gy = heightAt(wp.x, wp.z);
      for (const s of [1, -1]) {
        B.push().translate((s * wid) / 2, 0, zc);
        B.add("wood", gBox(0.26, 3.3, 0.26), { snow: 0.3 });
        // rail
        if (i < bays) {
          B.push().translate(0, 1.0, bl / 2);
          B.add("wood", gBox(0.1, 0.12, bl), { snow: 1 });
          B.translate(0, -0.5, 0);
          B.add("wood", gBox(0.08, 0.1, bl), { snow: 0.5 });
          B.pop();
          // arched brace under the eave
          B.push().translate(0, 2.55, 0.55).rotX(-0.8);
          B.add("wood", gBox(0.14, 0.14, 1.2), { snow: 0.3 });
          B.pop();
          B.push().translate(0, 2.55, bl - 0.55).rotX(0.8);
          B.add("wood", gBox(0.14, 0.14, 1.2), { snow: 0.3 });
          B.pop();
        }
        // trestle legs down to the ground, splayed, with cross braces
        const hh = y - gy + 2;
        if (hh > 2.5 && i % 2 === 0) {
          B.push().translate(s * 0.2, -0.3, 0).rotZ(s * 0.1).translate(0, -hh, 0);
          B.add("wood", gBox(0.42, hh, 0.42), { snow: 0.2 });
          B.pop();
          if (i < bays - 1) {
            for (let q = 1; q * 7 < hh; q++) {
              B.push().translate(s * (0.25 + q * 0.7), -0.3 - q * 7, bl);
              B.add("wood", gBox(0.24, 0.24, bl * 2), { snow: 0.8 });
              B.pop();
            }
          }
        }
        B.pop();
      }
      const hh = y - gy + 2;
      if (hh > 6 && i % 2 === 0) {
        for (let q = 1; q * 7 < hh; q++) {
          B.push().translate(0, -0.3 - q * 7, zc);
          B.add("wood", gBox(wid + 0.4 + q * 1.3, 0.3, 0.3), { snow: 0.8 });
          B.pop();
        }
      }
      if (i % 3 === 1) {
        B.push().translate(0, 2.75, zc);
        B.add("lamp", gBox(0.2, 0.3, 0.2), { snow: 10 + i * 0.35, tint: 1.1 });
        lamp(0, 0, 0, 1.1, 5.5, 10 + i * 0.35, 1, [1, 0.62, 0.28], false);
        B.pop();
      }
    }
    B.pop();
    // stone abutment towers at the castle end
    roundTower({ x: ax - 3, z: az + 5.5, r: 2.6, h: 13, roof: 7.5, top: "eave", bands: 1, rings: 2, group: 50, found: 14 });
  }
  function gableRoofWood(len: number, wid: number, h: number) {
    const sl = Math.hypot(wid / 2, h), a = Math.atan2(h, wid / 2);
    for (const s of [1, -1]) {
      B.push().translate(0, h / 2, (s * wid) / 4).rotX(s * a);
      B.add("roof", gBox(len, 0.16, sl + 0.25), { snow: 1.25 });
      B.pop();
    }
  }

  // ── boathouse at the foot of the south cliff
  {
    const bx = -36, bz = 103;
    B.push().translate(bx, -3, bz);
    B.add("stone2", gBox(15, 3 + 4.2, 11), { baseY: 0.5 });
    for (const dx of [-4.2, 0, 4.2]) R.wins.push({ p: B.at(dx, 3 + 0.25, 5.54), n: B.dir(0, 0, 1), w: 3.1, h: 3.3, type: WT.door, lit: true, tOn: -5, seed: rand(), warm: 0.35 });
    B.translate(0, 3 + 4.2, 0);
    B.add("stone2", gBox(15.4, 0.3, 11.4), { snow: 1.4 });
    B.add("wood", gBox(14.2, 3.6, 10.2), { snow: 0.25, tint: 0.4 });
    for (const dx of [-4.2, 0, 4.2]) win(dx, 1.2, 5.1, 0, 1, 1.1, 1.5, WT.cross, 60, 0.9);
    for (const sx of [1, -1]) win(sx * 7.1, 1.2, 0, sx, 0, 1.2, 1.6, WT.cross, 60, 0.9);
    B.translate(0, 3.6, 0);
    gableRoof(15.6, 10.2, 4.4, 0.8, 1.2);
    B.push().translate(-4.5, 2.2, 1.5);
    chimney(4.2, true, 1.0);
    B.pop();
    B.pop();
    lamp(bx, 4.6, bz + 6.4, 2.2, 10, -5, 1);
    // little jetty with two lanterns
    B.push().translate(bx + 11.5, 0.55, bz + 3);
    B.add("wood", gBox(8, 0.25, 2.2), { snow: 1 });
    for (const dx of [-3.6, 3.6]) for (const dz of [-0.9, 0.9]) {
      B.push().translate(dx, -3, dz);
      B.add("wood", gCyl(0.13, 0.15, 3.6, 6, 1), { uv: "keep", snow: 0.8 });
      B.pop();
    }
    B.translate(3.6, 0.25, 0.9);
    lampPost(2.4, -5, 1.2);
    B.pop();
  }

  // ── stack tower on its own pillar of rock in the lake
  {
    const ox = STACK.x, oz = STACK.z, oy = STACK.y;
    roundTower({ x: ox, z: oz, y: oy, r: 4.6, h: 19, roof: 11, top: "corbel", bands: 2, rings: 4, wtype: WT.lancet, group: 62, found: 10, pLit: 0.35 });
  }

  // ── a lantern on the island's little stone jetty (foreground of the opening shot)
  for (const j of JETTY) {
    const gy = heightAt(j.x, j.z);
    B.push().translate(j.x, Math.max(gy, 0.35), j.z).rotY(j.rot);
    B.add("stone2", gBox(1.1, 0.5, 1.1), { snow: 1.4 });
    B.translate(0, 0.5, 0);
    lampPost(2.7, j.tOn, 1.25);
    B.pop();
  }

  // ── standing stones on the hill where the wooden bridge lands
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU, sx = 196 + Math.sin(a) * 9.5, sz = -108 + Math.cos(a) * 9.5;
    const gy = heightAt(sx, sz);
    B.push().translate(sx, gy - 0.8, sz).rotY(a + rr(-0.3, 0.3)).rotZ(rr(-0.08, 0.08));
    B.add("stone2", gBox(rr(1.2, 1.9), rr(3.2, 5.2), rr(0.5, 0.8)), { snow: 1.2, baseY: gy });
    B.pop();
  }
  void gBall; void gRing;
}

