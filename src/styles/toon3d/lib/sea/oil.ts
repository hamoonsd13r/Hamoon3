// The oil stream: a tube rebuilt in place every frame along a ballistic arc down to the sea, thinning as it falls,
// with a slow ripple travelling down it. Coloured per vertex in our own toon tones (gold lit side, deep gold shade
// side, a pale highlight toward the sun), so it never takes the teal shadow tint of the world (that turned it olive).
// It keeps the world ink (a cartoon stream reads with a dark outline). The top is closed with a fan.
import * as THREE from "three";
import { untone } from "../base/shade";

const N = 56, R = 10, NV = N * R + 1;
const C_LIT = untone("#f4c534"), C_DARK = untone("#c98c16"), C_HI = untone("#fde68f");
export class OilStream {
  mesh: THREE.Mesh;
  private pos = new Float32Array(NV * 3);
  private nor = new Float32Array(NV * 3);
  private col = new Float32Array(NV * 3);
  private pts: THREE.Vector3[] = Array.from({ length: N }, () => new THREE.Vector3());
  constructor(parent: THREE.Object3D) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    const idx: number[] = [], top = N * R;
    for (let k = 0; k < R; k++) idx.push(top, (k + 1) % R, k); // cap fan
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < R; k++) {
      const a = i * R + k, b = i * R + ((k + 1) % R), c = (i + 1) * R + ((k + 1) % R), d = (i + 1) * R + k;
      idx.push(a, d, c, a, c, b);
    }
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false; this.mesh.visible = false;
    parent.add(this.mesh);
  }
  /** start = world start point, vel = velocity there (m/s), seaY = water height under the fall, t = time (ripple),
   *  sun = world direction toward the sun, cam = lens position (highlight) */
  set(start: THREE.Vector3, vel: THREE.Vector3, seaY: number, t: number, r0: number, amt: number, sun?: THREE.Vector3, cam?: THREE.Vector3) {
    if (amt <= 0.001) { this.mesh.visible = false; return; }
    const g = 9.81, dy = start.y - seaY + 0.3;
    const T = (vel.y + Math.sqrt(vel.y * vel.y + 2 * g * Math.max(0.05, dy))) / g;
    for (let i = 0; i < N; i++) {
      const s = Math.pow(i / (N - 1), 1.25), tau = T * s;
      this.pts[i].set(start.x + vel.x * tau, start.y + vel.y * tau - 0.5 * g * tau * tau, start.z + vel.z * tau);
    }
    const T0 = new THREE.Vector3(), S = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const L = (sun ?? up).clone().normalize(), tmpC = new THREE.Color(), hv = new THREE.Vector3();
    const shadeV = (nx: number, ny: number, nz: number, px: number, py: number, pz: number, o: number) => {
      const lam = nx * L.x + ny * L.y + nz * L.z;
      tmpC.copy(C_DARK).lerp(C_LIT, THREE.MathUtils.smoothstep(lam, -0.2, 0.25));
      if (cam) {
        hv.set(cam.x - px, cam.y - py, cam.z - pz).normalize().add(L).normalize();
        const h = nx * hv.x + ny * hv.y + nz * hv.z;
        tmpC.lerp(C_HI, 0.85 * THREE.MathUtils.smoothstep(h, 0.86, 0.95));
      }
      this.col[o] = tmpC.r; this.col[o + 1] = tmpC.g; this.col[o + 2] = tmpC.b;
    };
    for (let i = 0; i < N; i++) {
      const p = this.pts[i], a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(N - 1, i + 1)];
      T0.subVectors(b, a).normalize();
      S.crossVectors(T0, up); if (S.lengthSq() < 1e-6) S.set(1, 0, 0); S.normalize();
      B.crossVectors(S, T0).normalize();
      const s = i / (N - 1);
      const rr = amt * r0 * (1 - 0.45 * Math.sqrt(s)) * (1 + 0.12 * THREE.MathUtils.smoothstep(s, 0, 0.1) * Math.sin(s * 34 - t * 18));
      for (let k = 0; k < R; k++) {
        const ang = (k / R) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), o = (i * R + k) * 3;
        const nx = S.x * c + B.x * sn, ny = S.y * c + B.y * sn, nz = S.z * c + B.z * sn;
        this.pos[o] = p.x + nx * rr; this.pos[o + 1] = p.y + ny * rr; this.pos[o + 2] = p.z + nz * rr;
        this.nor[o] = nx; this.nor[o + 1] = ny; this.nor[o + 2] = nz;
        shadeV(nx, ny, nz, this.pos[o], this.pos[o + 1], this.pos[o + 2], o);
      }
    }
    // cap centre (top of the fall)
    const o = N * R * 3, p0 = this.pts[0], d0 = this.pts[1].clone().sub(p0).normalize();
    this.pos[o] = p0.x; this.pos[o + 1] = p0.y; this.pos[o + 2] = p0.z;
    this.nor[o] = -d0.x; this.nor[o + 1] = -d0.y; this.nor[o + 2] = -d0.z;
    this.col[o] = C_LIT.r; this.col[o + 1] = C_LIT.g; this.col[o + 2] = C_LIT.b;
    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    this.mesh.visible = true;
  }
  /** where the stream meets the sea (after set) */
  end() { return this.pts[N - 1]; }
}
