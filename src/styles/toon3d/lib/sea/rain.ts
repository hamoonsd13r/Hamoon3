// Rain: thin streaks in a box that wraps around the lens (world-stable drops, pure function of t), instanced quads,
// unlit, alpha-blended, never inked. Width never drops under ~1 px so far streaks read as fine lines, not shimmer.
import * as THREE from "three";
import { NOINK } from "../base/ink";
import { rng } from "../base/paint";
import { untone } from "../base/shade";

const VERT = /* glsl */ `
attribute vec4 aOff;
uniform float uTime, uAmt, uLen, uPx;
uniform vec3 uBox, uVel;
varying float vA; varying float vU;
void main(){
  vec3 base = cameraPosition - 0.5 * uBox;
  vec3 c = base + mod(aOff.xyz * uBox + uVel * uTime * (0.85 + 0.3 * aOff.w) - base, uBox);
  vec3 dir = normalize(uVel);
  float len = uLen * (0.7 + 0.6 * aOff.w);
  vec3 toCam = cameraPosition - c;
  float dist = length(toCam);
  vec3 side = normalize(cross(dir, toCam / max(dist, 1e-3)));
  float w0 = 0.01, w = max(w0, uPx * dist * 1.15);
  vec3 wp = c + side * position.x * w + dir * (position.y - 0.5) * len;
  vA = uAmt * (1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, dist)) * smoothstep(0.8, 3.0, dist) * (0.5 + 0.5 * aOff.w);
  vA *= clamp(w0 / w * 2.4, 0.3, 1.0);
  vU = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const FRAG = /* glsl */ `
uniform vec3 uCol; varying float vA; varying float vU;
void main(){ float a = vA * smoothstep(0.0, 0.3, vU) * (1.0 - smoothstep(0.7, 1.0, vU)); if (a < 0.003) discard; gl_FragColor = vec4(uCol, a); }`;

export class Rain {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  constructor(n = 5200) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    const r = rng(7), off = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) off[i] = r();
    g.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
    g.instanceCount = n;
    const U = <T,>(v: T) => ({ value: v });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U(0), uAmt: U(0), uLen: U(1), uPx: U(0.001), uBox: U(new THREE.Vector3(46, 30, 46)), uVel: U(new THREE.Vector3(6, -22, 2)), uCol: U(new THREE.Color()) },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(NOINK);
    this.mesh.renderOrder = 3;
  }
  /** amt 0..1; wind = world velocity of the drops (m/s); col = on-screen streak colour */
  update(t: number, amt: number, cam: THREE.PerspectiveCamera, heightPx: number, wind: [number, number, number], col: string) {
    const u = this.mat.uniforms;
    u.uTime.value = t; u.uAmt.value = 0.42 * amt;
    u.uPx.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / heightPx;
    (u.uVel.value as THREE.Vector3).set(...wind);
    untone(col, u.uCol.value);
    this.mesh.visible = amt > 0.001;
  }
}
