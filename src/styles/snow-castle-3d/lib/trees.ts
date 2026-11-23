// Snow Castle 3D · snow-laden spruces: card-built trees (hero and mid versions) and far impostors, textures painted in code.
import * as THREE from "three";
import { rng } from "./util";
import type { Shared } from "./mats";
import type { Tree } from "./terrain";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** a spruce spray seen from above (x: trunk → tip): bottle-brush shoots on three orders of twigs, and the snow lying on them */
function boughTextures() {
  const S = 1024;
  const cg = canvas(S, S), cs = canvas(S, S);
  const g = cg.getContext("2d")!, s = cs.getContext("2d")!;
  const r = rng(555);
  g.clearRect(0, 0, S, S);
  s.clearRect(0, 0, S, S);
  type Seg = { x0: number; y0: number; x1: number; y1: number; w: number; ord: number };
  const segs: Seg[] = [];
  const twig = (x0: number, y0: number, ang: number, len: number, w: number, ord: number) => {
    // a shoot bends a little: two pieces
    const bend = (r() - 0.5) * 0.22;
    const xm = x0 + Math.cos(ang) * len * 0.5, ym = y0 + Math.sin(ang) * len * 0.5;
    const x1 = xm + Math.cos(ang + bend) * len * 0.5, y1 = ym + Math.sin(ang + bend) * len * 0.5;
    segs.push({ x0, y0, x1: xm, y1: ym, w, ord }, { x0: xm, y0: ym, x1, y1, w: w * 0.8, ord });
    if (ord >= 2) return;
    const gap = ord === 0 ? 44 : 30;
    const n = Math.max(2, Math.floor(len / gap));
    for (let i = 1; i <= n; i++) {
      const t = (i - 0.25 + r() * 0.3) / (n + 0.4);
      for (const side of [1, -1]) {
        if (ord === 1 && r() < 0.18) continue;
        const a2 = ang + side * (0.98 - 0.36 * t + (r() - 0.5) * 0.22);
        const l2 = len * (ord === 0 ? 0.5 : 0.44) * (1 - t * 0.7) * (0.72 + r() * 0.42);
        const px = t < 0.5 ? x0 + (xm - x0) * (t * 2) : xm + (x1 - xm) * (t * 2 - 1);
        const py = t < 0.5 ? y0 + (ym - y0) * (t * 2) : ym + (y1 - ym) * (t * 2 - 1);
        if (l2 > 16) twig(px, py, a2, l2, w * 0.58, ord + 1);
      }
    }
  };
  twig(6, S / 2, 0, S - 40, 9, 0);
  // needles: short, dense, all round each shoot
  for (const sg of segs) {
    const len = Math.hypot(sg.x1 - sg.x0, sg.y1 - sg.y0), a = Math.atan2(sg.y1 - sg.y0, sg.x1 - sg.x0);
    const n = Math.round(len / 1.25);
    for (let i = 0; i < n; i++) {
      const t = (i + r()) / n;
      const x = sg.x0 + (sg.x1 - sg.x0) * t, y = sg.y0 + (sg.y1 - sg.y0) * t;
      for (const side of [1, -1]) {
        const na = a + side * (0.55 + r() * 0.75), nl = 7 + r() * 7 + (2 - sg.ord) * 1.5;
        const tip = r() < 0.12;
        const hue = 100 + r() * 38, sat = 18 + r() * 20, lig = tip ? 20 + r() * 8 : 7 + r() * 11;
        g.strokeStyle = `hsla(${hue},${sat}%,${lig}%,${0.8 + r() * 0.2})`;
        g.lineWidth = 1.2 + r() * 1.0;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(na) * nl, y + Math.sin(na) * nl);
        g.stroke();
      }
    }
  }
  g.lineCap = "round";
  for (const sg of segs) {
    g.strokeStyle = sg.ord === 0 ? "#20150d" : "#2a1c12";
    g.lineWidth = Math.max(1.3, sg.w * 0.55);
    g.beginPath();
    g.moveTo(sg.x0, sg.y0);
    g.lineTo(sg.x1, sg.y1);
    g.stroke();
  }
  // bark swatch for the trunk (top-left corner)
  g.fillStyle = "#241811";
  g.fillRect(0, 0, 36, 36);
  // snow: pillows along the first two orders, lumps at the forks
  s.lineCap = "round";
  s.filter = "blur(3px)";
  for (const sg of segs) {
    if (sg.ord === 2 && r() < 0.6) continue;
    const a0 = 0.04 + r() * 0.12, a1 = 0.62 + r() * 0.34;
    s.strokeStyle = `rgba(255,255,255,${0.8 + r() * 0.2})`;
    s.lineWidth = (sg.ord === 0 ? 30 : sg.ord === 1 ? 17 : 9) * (0.75 + r() * 0.5);
    s.beginPath();
    s.moveTo(sg.x0 + (sg.x1 - sg.x0) * a0, sg.y0 + (sg.y1 - sg.y0) * a0);
    s.lineTo(sg.x0 + (sg.x1 - sg.x0) * a1, sg.y0 + (sg.y1 - sg.y0) * a1);
    s.stroke();
  }
  for (let i = 0; i < 420; i++) {
    const sg = segs[Math.floor(r() * segs.length)], t = r();
    const x = sg.x0 + (sg.x1 - sg.x0) * t + (r() - 0.5) * 18, y = sg.y0 + (sg.y1 - sg.y0) * t + (r() - 0.5) * 18;
    s.fillStyle = `rgba(255,255,255,${0.45 + r() * 0.5})`;
    s.beginPath();
    s.arc(x, y, 4 + r() * 11, 0, Math.PI * 2);
    s.fill();
  }
  s.filter = "none";
  s.clearRect(0, 0, 44, 44);
  const mk = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { tG: mk(cg), tS: mk(cs) };
}

/** far impostor: a whole spruce painted as a ragged silhouette with snow on its tiers */
function impostorTexture() {
  const W = 128, H = 256;
  const c = canvas(W, H), g = c.getContext("2d")!;
  const r = rng(77);
  g.clearRect(0, 0, W, H);
  const tiers = 22;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = H * (0.985 - t * 0.95), hw = W * 0.44 * Math.pow(1 - t, 0.9) * (0.8 + r() * 0.3) + 1.5, th = H * 0.085 * (1 - t * 0.5);
    g.fillStyle = `hsl(${108 + r() * 22},${20 + r() * 12}%,${6 + r() * 5}%)`;
    g.beginPath();
    g.moveTo(W / 2, y - th * 1.4);
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const x = W / 2 + hw * (1 - (2 * k) / n);
      const droop = Math.abs(1 - (2 * k) / n);
      g.lineTo(x + (r() - 0.5) * 4, y + droop * th * 0.5 + (k % 2 === 0 ? 0 : -th * 0.3) + (r() - 0.5) * 3);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = `rgba(214,224,240,${0.55 + r() * 0.35})`;
    g.lineWidth = 1.4 + (1 - t) * 2.2;
    g.lineCap = "round";
    for (const sd of [-1, 1]) {
      if (r() < 0.2) continue;
      g.beginPath();
      g.moveTo(W / 2 + sd * hw * 0.12, y - th * 1.0);
      g.quadraticCurveTo(W / 2 + sd * hw * 0.5, y - th * 0.7, W / 2 + sd * hw * (0.7 + r() * 0.22), y + th * 0.1);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** unit-height spruce (y 0..1). hero: boughs with hanging side sprays; mid: fewer whorls, one card per bough */
function spruceGeometry(hero: boolean, seed: number) {
  const r = rng(seed);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], aT: number[] = [], idx: number[] = [];
  const levels = hero ? 36 : 14, per = hero ? 8 : 5, segN = hero ? 4 : 2;
  const Rmax = 0.17 + r() * 0.03;
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const card = (y: number, ang: number, len: number, wid: number, pitch: number, droop: number, roll: number, t: number, off = 0, u0 = 0.03, u1 = 0.98) => {
    const base = pos.length / 3;
    q.setFromEuler(e.set(0, ang, 0));
    for (let i = 0; i <= segN; i++) {
      const s = i / segN;
      // along local +x from the trunk: sag under the snow, the tip lifting again
      const lx = len * s * Math.cos(pitch), ly = Math.sin(pitch) * len * s - droop * len * s * s + droop * len * 0.45 * s * s * s;
      const hw = wid * 0.5 * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, s * 0.9 + 0.14)));
      for (const side of [-1, 1]) {
        v.set(lx, ly + Math.sin(roll) * side * hw, off + Math.cos(roll) * side * hw).applyQuaternion(q);
        pos.push(v.x, y + v.y, v.z);
        const nl = Math.hypot(v.x, v.z) || 1;
        nor.push((v.x / nl) * 0.6, 0.8, (v.z / nl) * 0.6);
        uv.push(u0 + s * (u1 - u0), 0.5 + side * 0.49);
        aT.push(t, s);
      }
    }
    for (let i = 0; i < segN; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
  };
  for (let L = 0; L < levels; L++) {
    const t = L / (levels - 1);
    const y = 0.07 + 0.89 * Math.pow(t, 0.9);
    // crown: widest a little above the base, a narrow spire at the top
    const taper = Math.pow(1 - t, 0.78) * (0.55 + 0.45 * Math.min(1, t * 7 + 0.2)) * (0.9 + 0.2 * r());
    const a0 = r() * Math.PI * 2;
    const n = Math.max(3, Math.round(per * (0.6 + 0.6 * (1 - t))));
    for (let k = 0; k < n; k++) {
      if (r() < 0.06) continue;
      const ang = a0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.6;
      const len = Rmax * taper * (0.66 + r() * 0.5) + 0.012;
      const pitch = -0.32 + t * 0.95 + (r() - 0.5) * 0.24;
      const droop = 0.42 * (1 - t) + 0.06;
      const yy = y + (r() - 0.5) * 0.02;
      card(yy, ang, len, len * (0.7 + r() * 0.25), pitch, droop, (r() - 0.5) * 0.45, t);
      if (hero) {
        // sprays hanging off the sides of the bough
        for (const sd of [-1, 1]) card(yy - len * 0.06, ang + sd * 0.22, len * 0.7, len * 0.5, pitch - 0.5, droop * 1.2, sd * (0.9 + r() * 0.5), t, 0, 0.3, 0.98);
      }
    }
  }
  // leader
  for (let k = 0; k < 3; k++) card(0.94, (k * Math.PI * 2) / 3, 0.04, 0.035, 1.4, 0, 0, 1);
  // trunk
  {
    const base = pos.length / 3, sides = hero ? 8 : 5, rb = 0.013;
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2, rr = j === 0 ? rb : rb * 0.1;
      pos.push(Math.cos(a) * rr, j * 0.97 - 0.03, Math.sin(a) * rr);
      nor.push(Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9);
      uv.push(0.012, 0.988);
      aT.push(j, 0);
    }
    for (let i = 0; i < sides; i++) {
      const a = base + i, b = a + 1, c = a + sides + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 2));
  g.setIndex(idx);
  return g;
}

function treeMaterial(U: Shared, tG: THREE.Texture, tS: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { tG: { value: tG }, tS: { value: tS }, uTime: U.time, uWind: U.wind, uAmb: U.amb, uMoonDir: U.moonDir, uMoonCol: U.moonCol, uSnowCol: U.snowCol },
    side: THREE.DoubleSide, alphaToCoverage: true,
    vertexShader: /* glsl */ `
      attribute vec2 aT; attribute float aSeed;
      uniform float uTime; uniform vec2 uWind;
      varying vec2 vUv; varying vec3 vN; varying vec2 vT; varying float vSeed; varying vec3 vWP;
      void main(){
        vec3 p = position;
        float ph = aSeed * 6.2831 + uTime * (0.6 + aSeed * 0.5);
        float sway = (0.005 * aT.x * aT.x + 0.009 * aT.y);
        p.xz += uWind * sway * sin(ph + p.y * 2.5);
        p.y += 0.0035 * aT.y * sin(ph * 1.31 + aT.x * 7.0);
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(p, 1.0);
        vN = normalize(mat3(m) * normal);
        vUv = uv; vT = aT; vSeed = aSeed; vWP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tG; uniform sampler2D tS; uniform vec3 uAmb; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform vec3 uSnowCol;
      varying vec2 vUv; varying vec3 vN; varying vec2 vT; varying float vSeed; varying vec3 vWP;
      void main(){
        vec4 g = texture2D(tG, vUv);
        vec4 s = texture2D(tS, vUv);
        float top = gl_FrontFacing ? 1.0 : 0.12;
        float load = 0.7 + 0.6 * fract(vSeed * 7.31);
        float snowA = s.a * top * load;
        float lod = clamp(log2(max(fwidth(vUv.x) * 1024.0, 1.0)), 0.0, 8.0);
        float a = max(g.a, snowA) * (1.0 + 0.42 * lod);
        float aw = max(fwidth(a), 1e-3);
        float alpha = clamp((a - 0.45) / aw + 0.5, 0.0, 1.0);
        if (alpha < 0.03) discard;
        vec3 alb = g.rgb * (0.8 + 0.5 * fract(vSeed * 3.7)) * 1.35;
        float sn = clamp(snowA * 1.3, 0.0, 1.0);
        alb = mix(alb, uSnowCol, sn);
        vec3 N = normalize(vN);
        // boughs deep in the crown and low on the tree sit in the tree's own shade
        float ao = mix(0.2, 1.0, smoothstep(0.0, 0.8, vT.y)) * mix(0.5, 1.0, vT.x);
        float wrap = clamp((dot(N, uMoonDir) + 0.5) / 1.5, 0.0, 1.0);
        vec3 V = normalize(cameraPosition - vWP);
        float back = pow(max(dot(-V, uMoonDir), 0.0), 3.0) * 0.5;
        vec3 light = uAmb * (0.45 + 0.55 * N.y) * 1.3 * ao + uMoonCol * (wrap * wrap * 0.55 + back * (0.3 + 0.7 * sn)) * ao;
        gl_FragColor = vec4(alb * light, alpha);
      }`,
  });
}

function impostorMaterial(U: Shared, tI: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { tI: { value: tI }, uAmb: U.amb, uMoonDir: U.moonDir, uMoonCol: U.moonCol },
    side: THREE.DoubleSide, alphaToCoverage: true,
    vertexShader: /* glsl */ `
      attribute float aSeed; varying vec2 vUv; varying float vSeed;
      void main(){ vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tI; uniform vec3 uAmb; uniform vec3 uMoonDir; uniform vec3 uMoonCol;
      varying vec2 vUv; varying float vSeed;
      void main(){
        vec4 c = texture2D(tI, vUv);
        float aw = max(fwidth(c.a), 1e-3);
        float alpha = clamp((c.a - 0.35) / aw + 0.5, 0.0, 1.0);
        if (alpha < 0.03) discard;
        vec3 light = uAmb * 1.15 + uMoonCol * 0.25 * max(uMoonDir.y, 0.0);
        gl_FragColor = vec4(c.rgb * (0.85 + 0.35 * fract(vSeed * 5.3)) * light * mix(0.55, 1.0, vUv.y), alpha);
      }`,
  });
}

export function buildForest(U: Shared, trees: Tree[]) {
  const { tG, tS } = boughTextures();
  const tI = impostorTexture();
  const group = new THREE.Group();
  const mat = treeMaterial(U, tG, tS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const counts = [0, 0, 0];
  const mkInst = (geo: THREE.BufferGeometry, material: THREE.Material, list: Tree[], width = 1) => {
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    const seeds = new Float32Array(list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      p.set(t.x, t.y, t.z);
      sc.set(t.s * width, t.s, t.s * width);
      mesh.setMatrixAt(i, m4.compose(p, q, sc));
      seeds[i] = t.v;
    });
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  };
  const hero = trees.filter((t) => t.lod === 0), mid = trees.filter((t) => t.lod === 1), far = trees.filter((t) => t.lod === 2);
  counts[0] = hero.length; counts[1] = mid.length; counts[2] = far.length;
  for (let k = 0; k < 4; k++) {
    const list = hero.filter((_, i) => i % 4 === k);
    if (list.length) group.add(mkInst(spruceGeometry(true, 100 + k), mat, list, 1 + k * 0.05));
  }
  for (let k = 0; k < 3; k++) {
    const list = mid.filter((_, i) => i % 3 === k);
    if (list.length) group.add(mkInst(spruceGeometry(false, 200 + k), mat, list, 1.08));
  }
  if (far.length) {
    const g = new THREE.BufferGeometry();
    const hw = 0.2;
    g.setAttribute("position", new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, -hw, 1, 0, hw, 1, 0, 0, 0, -hw, 0, 0, hw, 0, 1, -hw, 0, 1, hw], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
    group.add(mkInst(g, impostorMaterial(U, tI), far));
  }
  return { group, counts };
}
