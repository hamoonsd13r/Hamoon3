// Hollow Moon 3D · inside the core. Once the lens has passed the cage it is in the light itself: a hollow of slow golden
// plasma, the cage seen from within, drifting motes — and at its centre the brand's logo, cut from its own vector paths
// (brand.ts) as solid gold letters that ignite from left to right, the accent last, the second line beneath.
import * as THREE from "three";
import { LOGO, TH } from "./brand";
import { hexToLinear } from "./theme";
import { clamp, ease, rng, sstep } from "./util";

/** metres per logo unit: the mark (with its accent) is 7 m wide; its middle is x = 0, the middle of everything y = 0 */
const S = () => 7 / (LOGO.main.x1 - LOGO.main.x0);
const CX = () => (LOGO.main.x0 + LOGO.main.x1) / 2;
const CY = () => LOGO.cy;

/** Douglas-Peucker on an open run of points */
function rdp(p: THREE.Vector2[], a: number, b: number, tol: number, keep: boolean[]) {
  let worst = -1, wd = tol;
  const ax = p[a].x, ay = p[a].y, dx = p[b].x - ax, dy = p[b].y - ay, l = Math.hypot(dx, dy) || 1e-9;
  for (let i = a + 1; i < b; i++) {
    const d = Math.abs((p[i].x - ax) * dy - (p[i].y - ay) * dx) / l;
    if (d > wd) { wd = d; worst = i; }
  }
  if (worst >= 0) { keep[worst] = true; rdp(p, a, worst, tol, keep); rdp(p, worst, b, tol, keep); }
}

/** "M x y L x y … Z" sub-paths → shapes in metres, y up, centred on the wordmark (sc = metres per logo unit,
 *  cy = the logo line that becomes y = 0) */
export function shapes(d: string, sc = S(), cy = CY()): THREE.Shape[] {
  const out: THREE.Shape[] = [];
  const k = sc / S(), cx = CX();
  for (const sub of d.split("M").filter((s) => s.trim().length)) {
    const nums = [...sub.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const p = new THREE.Vector2((nums[i] - cx) * sc, -(nums[i + 1] - cy) * sc);
      // the trace has runs of nearly identical points: drop them, they only upset the bevel
      if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.004 * k) pts.push(p);
    }
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 0.004 * k) pts.pop();
    if (pts.length < 3) continue;
    // simplify: split the closed outline at its two most distant points, reduce both halves
    let far = 0, fd = 0;
    for (let i = 1; i < pts.length; i++) { const dd = pts[0].distanceTo(pts[i]); if (dd > fd) { fd = dd; far = i; } }
    const loop = [...pts, pts[0]], flags = new Array(loop.length).fill(false);
    flags[0] = flags[far] = flags[loop.length - 1] = true;
    rdp(loop, 0, far, 0.0016 * k, flags);
    rdp(loop, far, loop.length - 1, 0.0016 * k, flags);
    const keep = loop.filter((_, i) => flags[i] && i < loop.length - 1);
    if (keep.length > 2) out.push(new THREE.Shape(keep));
  }
  return out;
}

/** the face of an instrument ring: lathe-turned gold, graduations, the engraved name */
const RING_FRAG = /* glsl */ `
  {
    float front = smoothstep(0.6, 0.95, abs(normalize(vOn).z));
    float rr = (length(vOp.xy) - uRR.x) / (uRR.y - uRR.x);
    float an = 0.5 - atan(vOp.y, vOp.x) / 6.2831853;
    if (vOn.z < 0.0) an = 1.0 - an;
    float an2 = fract(an + 0.5) - 0.5;
    an = fwidth(an) < fwidth(an2) + 1e-7 ? an : an2;
    // turned on a lathe: fine circular grooves
    float gr = fract(sin(floor(rr * 46.0) * 37.3) * 43758.5453) - 0.5;
    normal = normalize(normal + vec3(normalize(vOp.xy + 1e-5) * gr * 0.05 * front, 0.0));
    roughnessFactor = mix(0.16, 0.25, front);
    if (uRR.w > 0.5) {
      float e = texture2D(tInscr, vec2(an * uRR.z, clamp(rr, 0.03, 0.97))).r * front;
      diffuseColor.rgb *= mix(1.0, 0.22, e);
      roughnessFactor = mix(roughnessFactor, 0.55, e);
    } else {
      // the thin ring carries only a row of graduations
      float tk = fract(an * 360.0);
      float e = (1.0 - smoothstep(0.08, 0.14, abs(tk - 0.5))) * step(0.25, rr) * step(rr, 0.75) * front;
      diffuseColor.rgb *= mix(1.0, 0.25, e);
    }
  }`;
/** seconds after the lens enters the core: the ignition sweep (start, end), the accent lands, the second line, a sheen */
export type LogoTimes = { ignite0: number; ignite1: number; accent: number; sub: number; sheen: number };

export class CoreWorld {
  scene = new THREE.Scene();
  /** direction (unit) from the logo to the star behind it, in this scene */
  starPos = new THREE.Vector3(0.15, 0.02, -3.2);
  private U = { uTime: { value: 0 }, uCut: { value: LOGO.slit ? -(LOGO.cutY - CY()) * S() : 1e4 }, uIgnite: { value: new THREE.Vector4(-9, 0.6, 0, 0) }, uGlowCol: { value: new THREE.Vector3(1.0, 0.8, 0.5) }, uLit: { value: 0 }, uFace: { value: new THREE.Vector3(...TH.metal) } };
  private slashU = { uOn: { value: 0 }, uAcc: { value: new THREE.Vector3(...hexToLinear(TH.accent)) } };
  private acad: { mesh: THREE.Mesh; u: { uOn: { value: number } } }[] = [];
  private rings: THREE.Mesh[] = [];
  private cage = new THREE.Group();
  private key: THREE.DirectionalLight;
  private fill: THREE.PointLight;
  private bg!: THREE.Mesh;
  private bar: THREE.Mesh;
  private slash: THREE.Mesh | null = null;
  private slashMat: THREE.MeshStandardMaterial | null = null;
  private motes: THREE.Points;
  private bgU = { uTime: { value: 0 }, uStar: { value: new THREE.Vector3() }, uLevel: { value: 1 } };
  mats: THREE.MeshStandardMaterial[] = [];

  constructor(shared: { uPx: THREE.IUniform; inscr?: THREE.Texture | null }) {
    const { scene } = this;
    // ── the hollow: slow plasma, brightest behind the logo
    this.bgU.uStar.value.set(0, 0.03, -1).normalize();
    const bg = new THREE.Mesh(new THREE.SphereGeometry(90, 64, 40), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.bgU,
      vertexShader: /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime; uniform vec3 uStar; uniform float uLevel;
        varying vec3 vD;
        vec3 h3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
        float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i).x, h3(i + vec3(1, 0, 0)).x, f.x), mix(h3(i + vec3(0, 1, 0)).x, h3(i + vec3(1, 1, 0)).x, f.x), f.y),
                     mix(mix(h3(i + vec3(0, 0, 1)).x, h3(i + vec3(1, 0, 1)).x, f.x), mix(h3(i + vec3(0, 1, 1)).x, h3(i + vec3(1, 1, 1)).x, f.x), f.y), f.z); }
        float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
        void main(){
          vec3 d = normalize(vD);
          float mu = dot(d, uStar);
          vec3 q = d * 2.2 + vec3(0.0, uTime * 0.035, uTime * 0.02);
          float w = fbm(q + fbm(q * 1.7 + 3.1) * 1.3);
          float fil = pow(1.0 - abs(fbm(q * 2.6 + 11.0) * 2.0 - 1.0), 3.2);
          // deep amber that falls away from the star: the light sits behind the name, the rim of the frame is dark
          vec3 deep = vec3(0.006, 0.0016, 0.0003), mid = vec3(0.16, 0.046, 0.006), hot = vec3(1.0, 0.5, 0.14);
          float m = max(mu, 0.0);
          float g = smoothstep(0.35, 1.0, mu);
          vec3 col = mix(deep, mid, smoothstep(0.25, 0.75, w) * (0.12 + 0.88 * g * g));
          col += hot * (fil * 0.05 * (0.05 + 0.95 * g * g));
          col += hot * (pow(m, 6.0) * 0.14 + pow(m, 40.0) * 0.4);
          gl_FragColor = vec4(col * uLevel, 1.0);
        }`,
    }));
    bg.frustumCulled = false;
    scene.add(bg);

    this.bg = bg;
    // a bar of light behind the cut line of the wordmark: it shows only through the slit
    this.bar = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.085, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) }));
    this.bar.position.set(0, -(LOGO.cutY - CY()) * S(), -0.43);
    this.bar.visible = false;
    scene.add(this.bar);

    // ── lights for the gold
    this.key = new THREE.DirectionalLight(0xffffff, 1);
    this.key.color.setRGB(1.0, 0.9, 0.74);
    this.key.position.set(-5, 6, 10);
    scene.add(this.key);
    this.fill = new THREE.PointLight(0xffffff, 1, 0, 2);
    this.fill.color.setRGB(1.0, 0.66, 0.3);
    // behind and above the name: it rims the tops and sides of the letters, and does not glance off the walls of the
    // cut line straight into the lens (from directly behind it made a hot blob in the middle of the word)
    this.fill.position.set(0.4, 3.2, -6.5);
    scene.add(this.fill);

    // ── the wordmark
    const gold = (rough: number) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(...TH.metalSide), metalness: 1, roughness: rough }); this.mats.push(m); return m; };
    const ext = (d: string, depth: number, bev = 0.03) => {
      const g = new THREE.ExtrudeGeometry(shapes(d), { depth, bevelEnabled: true, bevelThickness: bev * 1.5, bevelSize: bev, bevelSegments: 4, curveSegments: 4 });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    let nKey = 0;
    const ignite = (m: THREE.MeshStandardMaterial, uni: Record<string, THREE.IUniform>, body: string) => {
      const key = `hm-ignite-${nKey++}-${body.length}`;
      m.customProgramCacheKey = () => key;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uni);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOp; varying vec3 vOn;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOp = position; vOn = normal;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform vec4 uIgnite; uniform vec3 uGlowCol; uniform float uOn; uniform float uTime; uniform float uLit; uniform float uCut; uniform vec3 uFace; uniform vec3 uAcc; varying vec3 vOp; varying vec3 vOn;")
          .replace("#include <normal_fragment_maps>", body);
      };
    };
    const lm = gold(0.24);
    ignite(lm, this.U, /* glsl */ `
      {
        float front = smoothstep(0.55, 0.9, normalize(vOn).z);
        // the front that sweeps from left to right: x = uIgnite.x, softness = uIgnite.y
        float on = 1.0 - smoothstep(uIgnite.x - uIgnite.y, uIgnite.x, vOp.x);
        float lead = on * smoothstep(uIgnite.x - uIgnite.y * 2.6, uIgnite.x - uIgnite.y * 0.5, vOp.x);
        float breath = 0.96 + 0.04 * sin(uTime * 1.9 + vOp.x * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFace, front);
        roughnessFactor = mix(0.14, 0.24, front);
        // brushed along the word: fine grooves tip the mirror a little up and down
        float gr = fract(sin(floor(vOp.y * 260.0) * 91.7 + 3.1) * 43758.5453) - 0.5;
        normal = normalize(normal + vec3(0.0, gr * 0.045 * front, 0.0));
        diffuseColor.rgb *= mix(0.05, 1.0, on);
        totalEmissiveRadiance += uGlowCol * (lead * (3.2 * front + 1.0) + on * front * 0.025 * breath);
        // light escapes through the cut line: the inner walls of the slit glow
        float slit = (1.0 - smoothstep(0.0, 0.06, abs(vOp.y - uCut))) * smoothstep(0.5, 0.9, abs(normalize(vOn).y));
        totalEmissiveRadiance += vec3(1.0, 0.8, 0.46) * (slit * (0.35 + 3.0 * on));
        // a slow sheen wandering over the lit letters
        float sh = exp(-pow((vOp.x - vOp.y * 0.6 - uIgnite.z) / 0.5, 2.0)) * uIgnite.w;
        totalEmissiveRadiance += vec3(1.0, 0.93, 0.8) * front * sh * 0.9;
      }`);
    const letters = new THREE.Mesh(ext(LOGO.paths.main, 0.7, 0.034), lm);
    scene.add(letters);
    if (LOGO.paths.accent) {
      const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(...hexToLinear(TH.accent)), metalness: 0, roughness: 0.52 });
      this.mats.push(sm);
      this.slashMat = sm;
      ignite(sm, this.slashU, /* glsl */ `
        {
          float front = smoothstep(0.55, 0.9, normalize(vOn).z);
          totalEmissiveRadiance += uAcc * (front * uOn * 0.9 + uOn * 0.1);
        }`);
      // the accent turns about its own centre when it lands
      const sg = ext(LOGO.paths.accent, 0.78, 0.03);
      sg.computeBoundingBox();
      const sc = sg.boundingBox!.getCenter(new THREE.Vector3());
      sg.translate(-sc.x, -sc.y, -sc.z);
      const slash = new THREE.Mesh(sg, sm);
      slash.position.copy(sc);
      slash.userData.home = sc.clone();
      scene.add(slash);
      this.slash = slash;
    }
    LOGO.paths.sub.forEach((d) => {
      const m = gold(0.3);
      const u = { uOn: { value: 0 } };
      ignite(m, { ...u, uGlowCol: this.U.uGlowCol }, /* glsl */ `
        {
          float front = smoothstep(0.55, 0.9, normalize(vOn).z);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.86, 0.6), front);
          roughnessFactor = mix(0.3, 0.17, front);
          diffuseColor.rgb *= mix(0.05, 1.0, uOn);
          totalEmissiveRadiance += uGlowCol * front * (uOn * 0.3 + 2.2 * uOn * (1.0 - uOn));
        }`);
      const mesh = new THREE.Mesh(ext(d, 0.16, 0.008), m);
      scene.add(mesh);
      this.acad.push({ mesh, u });
    });

    // ── three instrument rings that come to rest around the name: flat bands of gold, graduated and engraved
    // (the brand's words between the marks), each a little larger than the last
    {
      const annulus = (r0: number, r1: number, depth: number) => {
        const sh = new THREE.Shape();
        sh.absarc(0, 0, r1, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, r0, 0, Math.PI * 2, true);
        sh.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 2, curveSegments: 180 });
        g.translate(0, 0, -depth / 2);
        return g;
      };
      const defs: [number, number, number][] = [[4.72, 4.98, 5], [5.2, 5.34, 0], [5.62, 6.16, 3]];
      defs.forEach(([r0, r1, rep], i) => {
        const m = gold(0.2);
        const key = "hm-corering-" + i;
        const uni = { tInscr: { value: shared.inscr ?? null }, uRR: { value: new THREE.Vector4(r0, r1, rep, shared.inscr && rep > 0 ? 1 : 0) } };
        m.customProgramCacheKey = () => key;
        m.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, uni);
          sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOp; varying vec3 vOn;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOp = position; vOn = normal;");
          sh.fragmentShader = sh.fragmentShader
            .replace("#include <common>", "#include <common>\nuniform sampler2D tInscr; uniform vec4 uRR; varying vec3 vOp; varying vec3 vOn;")
            .replace("#include <normal_fragment_maps>", RING_FRAG);
        };
        const ring = new THREE.Mesh(annulus(r0, r1, 0.07 + 0.02 * i), m);
        scene.add(ring);
        this.rings.push(ring);
      });
    }

    // ── the cage, from the inside
    {
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.36, 0.21, 0.075), metalness: 1, roughness: 0.46 });
      this.mats.push(m);
      const tphi = (1 + Math.sqrt(5)) / 2, R = 27, alpha = (37.377 * Math.PI) / 180;
      const g = new THREE.TorusGeometry(R * Math.sin(alpha), 0.46, 6, 200), z = new THREE.Vector3(0, 0, 1);
      for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) for (const v of [new THREE.Vector3(0, s1, s2 * tphi), new THREE.Vector3(s1, s2 * tphi, 0), new THREE.Vector3(s1 * tphi, 0, s2)]) {
        v.normalize();
        const c = new THREE.Mesh(g, m);
        c.quaternion.setFromUnitVectors(z, v);
        c.position.copy(v).multiplyScalar(R * Math.cos(alpha));
        this.cage.add(c);
      }
      scene.add(this.cage);
    }

    // ── motes of light adrift in the hollow
    {
      const rand = rng(91606), n = 520;
      const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const r = 3 + 15 * Math.pow(rand(), 0.7), th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
        pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.75, r * Math.sin(ph) * Math.sin(th)], i * 3);
        seed.set([rand(), rand(), rand(), rand()], i * 4);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      this.motes = new THREE.Points(g, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uPx: shared.uPx, uTime: this.U.uTime },
        vertexShader: /* glsl */ `
          uniform float uPx; uniform float uTime; attribute vec4 aSeed; varying float vA;
          void main(){
            vec3 p = position + vec3(sin(uTime * (0.12 + aSeed.x * 0.2) + aSeed.y * 6.283), 0.35 * uTime * (aSeed.z - 0.35), cos(uTime * (0.1 + aSeed.y * 0.2) + aSeed.x * 6.283)) * 0.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float px = (0.018 + 0.03 * aSeed.w) * uPx / max(-mv.z, 0.2);
            gl_PointSize = max(px, 1.4);
            vA = min(px / 1.4, 1.0) * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.7 + aSeed.x * 2.0) + aSeed.z * 20.0)));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `precision highp float; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vec3(0.9, 0.6, 0.28) * vA * (1.0 - smoothstep(0.4, 1.0, r)), 1.0); }`,
      }));
      this.motes.frustumCulled = false;
      scene.add(this.motes);
    }
  }

  /** image-based light of the hollow for everything gilded in it */
  bake(r: THREE.WebGLRenderer) {
    const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cc = new THREE.CubeCamera(0.5, 200, crt);
    cc.position.set(0, 0, 0.2);
    const vis = this.scene.children.map((c) => c.visible);
    const all = [...this.scene.children];
    all.forEach((c) => { c.visible = c === this.bg; });
    const cards: THREE.Mesh[] = [];
    const card = (w: number, h: number, p: [number, number, number], col: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col[0], col[1], col[2]), side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]);
      m.lookAt(0, 0, 0);
      this.scene.add(m);
      cards.push(m);
    };
    // the wall behind the lens is a horizon: dark below, a bright band just above it that thins out upwards. The flat
    // faces of the letters mirror it, so a line of light stands across the word and slides as the lens moves
    for (let i = 0; i < 16; i++) {
      const y = -7 + i * 1.25, u = Math.max((y - 1.6) / 1.4, 0);
      const b = y < 1.6 ? 0.03 + 0.05 * Math.exp((y - 1.6) / 2.5) : 0.22 + 2.3 * Math.exp(-u * 0.55) * (1 - Math.exp(-u * 3.0));
      card(34, 1.27, [0, y, 23], [b * 1.0, b * 0.83, b * 0.6]);
    }
    card(2.2, 9, [-5.2, 2.5, 22], [1.7, 1.35, 0.9]);   // two soft strips in it: the sheen that slides over the faces
    card(1.4, 9, [6.8, 2.5, 22], [1.1, 0.88, 0.58]);
    card(18, 5, [0, 11, 9], [6.0, 5.2, 3.9]);          // top soft box: the bright upper bevels
    card(3, 14, [-14, 1, 7], [5.5, 4.0, 2.2]);         // side strips
    card(3, 14, [14, -1, 8], [3.0, 2.2, 1.3]);
    card(20, 4, [0, -10, 7], [1.5, 0.8, 0.3]);         // warm bounce from below
    cc.update(r, this.scene);
    for (const m of cards) { this.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    all.forEach((c, i) => { c.visible = vis[i]; });
    const pm = new THREE.PMREMGenerator(r);
    const env = pm.fromCubemap(crt.texture).texture;
    pm.dispose();
    for (const m of this.mats) { m.envMap = env; m.envMapIntensity = 1.35; m.needsUpdate = true; }
    if (this.slashMat) this.slashMat.envMapIntensity = 0.2;
    r.setRenderTarget(null);
  }

  /** s = seconds since the lens entered the core */
  update(s: number, k: LogoTimes) {
    this.U.uTime.value = s;
    this.bgU.uTime.value = s;
    // letters ignite: the front crosses the wordmark (x from -3.6 to +3.6 m) between ignite0 and ignite1
    const ig = ease.inOut(clamp((s - k.ignite0) / (k.ignite1 - k.ignite0)));
    const sheen = clamp((s - k.sheen) / 1.6);
    this.U.uIgnite.value.set(-4.3 + 9.0 * ig, 0.55, -5.5 + 11 * ease.sine(sheen), sheen > 0 && sheen < 1 ? Math.sin(sheen * Math.PI) : 0);
    this.slashU.uOn.value = ease.out(clamp((s - k.accent) / 0.3)) * (1 + 0.7 * Math.exp(-Math.max(0, s - k.accent) * 5) * (s > k.accent ? 1 : 0));
    if (this.slash) {
      // the accent drops into its place, a quarter turn undone, and settles with a small overshoot
      const u = clamp((s - (k.accent - 0.16)) / 0.34), e = 1 - Math.pow(1 - u, 3), over = Math.sin(u * Math.PI) * 0.12;
      const home = this.slash.userData.home as THREE.Vector3;
      this.slash.visible = u > 0;
      this.slash.scale.setScalar(Math.max(0.001, e + over));
      this.slash.position.set(home.x, home.y + (1 - e) * 0.9, home.z + (1 - e) * 0.6);
      this.slash.rotation.z = (1 - e) * 0.9;
    }
    this.acad.forEach((a, i) => { a.u.uOn.value = ease.out(clamp((s - k.sub - i * 0.085) / 0.4)); a.mesh.visible = a.u.uOn.value > 0.001; a.mesh.position.z = (1 - a.u.uOn.value) * -0.4; });
    // the light on the gold grows as the name ignites; before that the letters are silhouettes against the star
    const lit = sstep(k.ignite0, k.ignite1 + 0.3, s);
    this.key.intensity = 0.2 + 1.5 * lit;
    this.fill.intensity = 300 * (1 - 0.45 * lit);
    // the light passes into the name: the hollow is bright while the letters are dark, and settles to deep amber
    // as they take fire
    this.bgU.uLevel.value = 1.3 - 0.5 * sstep(k.ignite0, k.ignite1 + 0.9, s);
    // the bar behind the slit brightens as the sweep passes, then breathes
    (this.bar.material as THREE.MeshBasicMaterial).color.setRGB(34, 24, 12).multiplyScalar((0.12 + 0.88 * lit) * (0.92 + 0.08 * Math.sin(s * 2.1)));
    // hoops: tumbling, then settling into one tilted plane around the name
    const settle = ease.inOut(clamp((s - k.ignite0 + 0.6) / 2.4));
    this.rings.forEach((r, i) => {
      const w = [0.9, -0.7, 0.55][i], ph = [0.3, 1.9, 3.4][i];
      // in its own plane each still turns, slower and slower, and stands still on the hit
      const left = Math.max(k.sheen - s, 0), spin = [0.5, -0.8, 0.32][i] * left * left * 0.22;
      r.rotation.set((1 - settle) * (1.1 * Math.sin(s * w + ph) + 0.8) + 0.3, (1 - settle) * (s * w * 0.8 + ph), 0.12 * (1 - settle) + spin);
      r.position.z = -0.25 - 0.12 * i;
    });
    this.cage.rotation.set(0.2 + s * 0.012, s * 0.03, 0.1);
  }

  /** the lens: a slow push with a little arc, s = seconds since entering */
  cam(s: number, dur: number) {
    const u = clamp(s / dur), e = ease.sine(u);
    const az = -0.2 + 0.26 * e, dist = 12.4 - 3.3 * e, el = 0.1 - 0.05 * e;
    return { p: [Math.sin(az) * dist, Math.sin(el) * dist + 0.1, Math.cos(az) * dist] as [number, number, number], t: [0, -0.12, 0] as [number, number, number], fov: 34, focus: dist, aper: 90, exp: 1 };
  }
}
