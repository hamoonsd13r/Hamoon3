// Hollow Moon 3D · offline bake of the moon (CPU, a few minutes, ~2 GB of RAM): crater relief, albedo (NASA LROC,
// low-passed, + fresh ejecta), normal / cavity maps, and the fractured crust (spherical Voronoi plates cut out of an
// icosphere by marching triangles, with side walls and undersides). Run pipeline/fetch-assets.mjs first (the LROC map).
//   npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts [maps] [mesh] [--levels=8] [--public public] [--cache .cache/hollow-moon-3d]
// Output → <public>/styles/hollow-moon-3d/moon/: nrm.png (normal xy + cavity), alb.jpg, crust.hdr (the plates as one
//          binary mesh), platemap.hdr (plate + relief per texel), plates.json; then assets.json says ready.
// Cache  → <cache>/height.f32 (so `mesh` can run again without `maps`), moon-preview.jpg and moon-crop.jpg to look at.
// --levels: icosphere subdivisions of the crust (8 = the film: edge ≈ 0.43 m, 97 MB; 7 = edge 0.86 m, 24 MB, faster).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { CRUST, R, clamp, fbm3, lerp, noise3, rng, sstep } from "../lib/util";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PUBLIC = path.resolve(opt("--public", "public"));
const STYLE = path.join(PUBLIC, "styles", "hollow-moon-3d");
const OUT = path.join(STYLE, "moon");
const TMP = path.resolve(opt("--cache", ".cache/hollow-moon-3d"));
const LROC = path.join(TMP, "lroc_color_poles_4k.tif");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
if (!fs.existsSync(LROC)) { console.error(`missing ${LROC}: run node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs first`); process.exit(1); }
const W = 8192, HH = 4096;
const only = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--public", "--cache"].includes(args[i - 1])));
const DO_MAPS = !only.length || only.includes("maps");
const DO_MESH = !only.length || only.includes("mesh");
const LEVELS = Number((args.find((a) => a.startsWith("--levels=")) ?? "--levels=8").split("=")[1]);
const D2R = Math.PI / 180;
const T0 = Date.now();
const log = (s: string) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);

/** where the shell is broken open (moon-local; the near side of the NASA map faces +X, north is +Y) */
export const BREACH = { lat: -24, lon: 27, radius: 47 };
const bl = BREACH.lat * D2R, bo = BREACH.lon * D2R;
const B: [number, number, number] = [Math.cos(bl) * Math.cos(bo), Math.sin(bl), -Math.cos(bl) * Math.sin(bo)];

const cosLon = new Float32Array(W), sinLon = new Float32Array(W), cosLat = new Float32Array(HH), sinLat = new Float32Array(HH);
for (let x = 0; x < W; x++) { const lon = ((x + 0.5) / W - 0.5) * 2 * Math.PI; cosLon[x] = Math.cos(lon); sinLon[x] = Math.sin(lon); }
for (let y = 0; y < HH; y++) { const lat = (0.5 - (y + 0.5) / HH) * Math.PI; cosLat[y] = Math.cos(lat); sinLat[y] = Math.sin(lat); }

const Hm = new Float32Array(W * HH);
/** bilinear height at a direction (wraps in longitude) */
function sampleH(dx: number, dy: number, dz: number) {
  const lon = Math.atan2(-dz, dx), lat = Math.asin(clamp(dy, -1, 1));
  const fx = (lon / (2 * Math.PI) + 0.5) * W - 0.5, fy = (0.5 - lat / Math.PI) * HH - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const xa = ((x0 % W) + W) % W, xb = (xa + 1) % W, ya = clamp(y0, 0, HH - 1), yb = clamp(y0 + 1, 0, HH - 1);
  return lerp(lerp(Hm[ya * W + xa], Hm[ya * W + xb], tx), lerp(Hm[yb * W + xa], Hm[yb * W + xb], tx), ty);
}

// ───────────────────────────────────────────────────────────── maps
function boxBlur(src: Float32Array, w: number, h: number, rad: number, passes = 1) {
  let a = src, b = new Float32Array(w * h);
  const n = 2 * rad + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      const o = y * w;
      for (let k = -rad; k <= rad; k++) s += a[o + (((k % w) + w) % w)];
      for (let x = 0; x < w; x++) {
        b[o + x] = s / n;
        s += a[o + ((x + rad + 1) % w)] - a[o + (((x - rad) % w) + w) % w];
      }
    }
    const c = a === src ? new Float32Array(w * h) : a;
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -rad; k <= rad; k++) s += b[clamp(k, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        c[y * w + x] = s / n;
        s += b[clamp(y + rad + 1, 0, h - 1) * w + x] - b[clamp(y - rad, 0, h - 1) * w + x];
      }
    }
    a = c;
  }
  return a;
}

function bakeMaps() {
  // ── NASA LROC colour map → broad tone (maria / highlands), small craters filtered out
  const lw = 2048, lh = 1024;
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", LROC, "-vf", `scale=${lw}:${lh}:flags=area`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 });
  let lum: Float32Array = new Float32Array(lw * lh);
  for (let i = 0; i < lum.length; i++) lum[i] = raw[i] / 255;
  lum = boxBlur(lum, lw, lh, 4, 2);
  {
    const s: number[] = [];
    for (let y = 60; y < lh - 60; y += 3) for (let x = 0; x < lw; x += 3) s.push(lum[y * lw + x]);
    s.sort((a, b) => a - b);
    const p3 = s[Math.floor(s.length * 0.03)], p97 = s[Math.floor(s.length * 0.97)];
    for (let i = 0; i < lum.length; i++) lum[i] = clamp((lum[i] - p3) / (p97 - p3));
    log(`lroc tone: p3=${p3.toFixed(3)} p97=${p97.toFixed(3)}`);
  }
  const tone = (dx: number, dy: number, dz: number) => {
    const lon = Math.atan2(-dz, dx), lat = Math.asin(clamp(dy, -1, 1));
    const fx = (lon / (2 * Math.PI) + 0.5) * lw - 0.5, fy = (0.5 - lat / Math.PI) * lh - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const xa = ((x0 % lw) + lw) % lw, xb = (xa + 1) % lw, ya = clamp(y0, 0, lh - 1), yb = clamp(y0 + 1, 0, lh - 1);
    return lerp(lerp(lum[ya * lw + xa], lum[ya * lw + xb], tx), lerp(lum[yb * lw + xa], lum[yb * lw + xb], tx), ty);
  };
  const mare = (dx: number, dy: number, dz: number) => 1 - sstep(0.22, 0.52, tone(dx, dy, dz));

  // ── craters: power-law sizes (many small, few large), fewer on the maria; old ones soft, a few fresh with rays
  type Cr = { c: [number, number, number]; r: number; fresh: number; seed: number; rays: boolean; key: number };
  const rand = rng(91017);
  const rmin = 0.19 * D2R, rmax = 9.0 * D2R, q = 1 - (rmin / rmax) ** 2;
  const list: Cr[] = [];
  const NC = 36000;
  for (let i = 0; i < NC; i++) {
    const r = rmin / Math.sqrt(1 - rand() * q);
    const z = 2 * rand() - 1, ph = 2 * Math.PI * rand(), s = Math.sqrt(1 - z * z);
    const c: [number, number, number] = [s * Math.cos(ph), z, s * Math.sin(ph)];
    const hi = 1 - mare(c[0], c[1], c[2]);
    const keep = rand();
    if (r < 3.2 * D2R && keep > lerp(0.22, 1, hi)) continue;
    const young = rand() < 0.085;
    const fresh = young ? 1 : lerp(0.25, 0.9, rand() ** 1.3);
    list.push({ c, r, fresh, seed: rand() * 97, rays: young && r > 0.7 * D2R && rand() < 0.5, key: r * (0.6 + 0.8 * rand()) * (young ? 0.02 : 1) });
  }
  list.sort((a, b) => b.key - a.key);
  log(`${list.length} craters`);

  const dA = new Float32Array(W * HH);
  const pert = new Float32Array(65);
  let visits = 0;
  for (const cr of list) {
    const [cx, cy, cz] = cr.c;
    const a = cr.r * R;
    const big = a > 7.5;
    const dr = a < 1 ? 0.42 : a < 5 ? lerp(0.42, 0.33, (a - 1) / 4) : lerp(0.33, 0.25, clamp((a - 5) / 11));
    const f = cr.fresh;
    const d = a * dr * (0.3 + 0.7 * f);
    const rimH = d * (0.15 + 0.11 * f);
    const ext = cr.r * (cr.rays ? 6.5 : 2.5);
    const cosExt = Math.cos(Math.min(ext, Math.PI));
    // tangent basis at the centre
    let e1x: number, e1y: number, e1z: number;
    if (Math.abs(cy) < 0.9) { e1x = cz; e1y = 0; e1z = -cx; } else { e1x = 0; e1y = -cz; e1z = cy; }
    const il = 1 / Math.hypot(e1x, e1y, e1z);
    e1x *= il; e1y *= il; e1z *= il;
    const e2x = cy * e1z - cz * e1y, e2y = cz * e1x - cx * e1z, e2z = cx * e1y - cy * e1x;
    // the old ground level around the rim
    let base = 0;
    const cr1 = Math.cos(1.12 * cr.r), sr1 = Math.sin(1.12 * cr.r);
    for (let k = 0; k < 10; k++) {
      const an = (k / 10) * 2 * Math.PI, ca = Math.cos(an) * sr1, sa = Math.sin(an) * sr1;
      base += sampleH(cx * cr1 + e1x * ca + e2x * sa, cy * cr1 + e1y * ca + e2y * sa, cz * cr1 + e1z * ca + e2z * sa);
    }
    base /= 10;
    const irregular = a > 0.7;
    if (irregular) for (let k = 0; k <= 64; k++) {
      const an = ((k % 64) / 64) * 2 * Math.PI;
      pert[k] = 1 + 0.075 * noise3(Math.cos(an) * 1.6 + cr.seed, Math.sin(an) * 1.6, cr.seed * 0.37) + 0.03 * noise3(Math.cos(an) * 5.3 + cr.seed, Math.sin(an) * 5.3, 7.7 + cr.seed);
    }
    const latc = Math.asin(cy), lonc = Math.atan2(-cz, cx), chor = Math.hypot(cx, cz);
    const y0 = clamp(Math.floor((0.5 - (latc + ext) / Math.PI) * HH), 0, HH - 1), y1 = clamp(Math.ceil((0.5 - (latc - ext) / Math.PI) * HH), 0, HH - 1);
    for (let y = y0; y <= y1; y++) {
      const cl = cosLat[y], sl = sinLat[y];
      let dl = Math.PI;
      const den = cl * chor;
      if (den > 1e-6) {
        const tt = (cosExt - sl * cy) / den;
        if (tt > 1) continue;
        if (tt > -1) dl = Math.acos(tt);
      }
      const xa = Math.floor(((lonc - dl) / (2 * Math.PI) + 0.5) * W), xb = Math.ceil(((lonc + dl) / (2 * Math.PI) + 0.5) * W);
      const span = Math.min(xb - xa, W - 1);
      for (let k = 0; k <= span; k++) {
        const x = (((xa + k) % W) + W) % W;
        const dx = cl * cosLon[x], dz = -cl * sinLon[x];
        const dot = dx * cx + sl * cy + dz * cz;
        if (dot < cosExt) continue;
        visits++;
        const om = Math.max(0, 1 - dot);
        let xr = (Math.sqrt(2 * om) * (1 + om / 12)) / cr.r;
        let ang = 0;
        if (irregular || cr.rays) {
          const ux = dx * e1x + sl * e1y + dz * e1z, uy = dx * e2x + sl * e2y + dz * e2z;
          ang = Math.atan2(uy, ux) / (2 * Math.PI) + 0.5;
          if (irregular) { const fa = ang * 64, ia = Math.min(63, Math.floor(fa)); xr *= lerp(pert[ia], pert[ia + 1], fa - ia); }
        }
        const i = y * W + x;
        let hh: number;
        if (xr < 1) {
          if (big) {
            const s = sstep(0.45, 1, xr);
            hh = -d + (d + rimH) * Math.pow(s, 1.5) + 0.28 * d * Math.exp(-((xr / 0.13) ** 2)) + 0.035 * d * Math.sin(xr * 30) * s * (1 - s) * 4;
          } else hh = -d + (d + rimH) * Math.pow(xr, 2.4);
        } else hh = rimH * Math.pow(xr, -3.2) * (1 - sstep(1.7, 2.5, xr));
        const w = (1 - sstep(0.8, 1.35, xr)) * (0.5 + 0.5 * f);
        const old = Hm[i];
        Hm[i] = old + (base - old) * w + hh;
        if (f > 0.97) {
          // fresh rock: bright walls, and for some a ray system
          if (xr < 1.15) dA[i] += 0.07 * sstep(0.25, 0.9, xr);
          if (cr.rays && xr > 0.95) {
            const ry = noise3(ang * 23 + cr.seed, cr.seed * 1.3, 0.5), ry2 = noise3(ang * 61 + cr.seed, 3.1, cr.seed);
            const streak = Math.max(0, ry * 0.8 + ry2 * 0.5 + 0.15);
            dA[i] += 0.2 * Math.exp(-(xr - 1) * 0.75) * (0.3 + 1.7 * streak * streak) * sstep(6.5, 4.5, xr);
          }
        }
      }
    }
  }
  log(`craters stamped (${(visits / 1e6).toFixed(0)}M texel visits)`);

  // ── broad undulation (coarse grid) and fine grain
  {
    const gw = 1024, gh = 512, G = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      const lat = (0.5 - (y + 0.5) / gh) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < gw; x++) {
        const lon = ((x + 0.5) / gw - 0.5) * 2 * Math.PI, dx = cl * Math.cos(lon), dz = -cl * Math.sin(lon);
        const m = mare(dx, sl, dz);
        G[y * gw + x] = (1.5 * fbm3(dx * 2.6 + 3.1, sl * 2.6, dz * 2.6, 5) + 0.55 * fbm3(dx * 9 + 1.7, sl * 9 - 4.2, dz * 9, 4)) * (1 - 0.55 * m) - 0.9 * m;
      }
    }
    for (let y = 0; y < HH; y++) {
      const fy = ((y + 0.5) / HH) * gh - 0.5, yy0 = Math.floor(fy), ty = fy - yy0;
      const wy = [0.5 * (-ty + 2 * ty * ty - ty * ty * ty), 0.5 * (2 - 5 * ty * ty + 3 * ty * ty * ty), 0.5 * (ty + 4 * ty * ty - 3 * ty * ty * ty), 0.5 * (-ty * ty + ty * ty * ty)];
      const cl = cosLat[y], sl = sinLat[y];
      for (let x = 0; x < W; x++) {
        const fx = ((x + 0.5) / W) * gw - 0.5, x0 = Math.floor(fx), tx = fx - x0;
        let g = 0;
        for (let j = -1; j <= 2; j++) {
          const row = clamp(yy0 + j, 0, gh - 1) * gw;
          const p0 = G[row + ((((x0 - 1) % gw) + gw) % gw)], p1 = G[row + (((x0 % gw) + gw) % gw)], p2 = G[row + ((((x0 + 1) % gw) + gw) % gw)], p3 = G[row + ((((x0 + 2) % gw) + gw) % gw)];
          g += wy[j + 1] * (0.5 * (2 * p1 + (-p0 + p2) * tx + (2 * p0 - 5 * p1 + 4 * p2 - p3) * tx * tx + (-p0 + 3 * p1 - 3 * p2 + p3) * tx * tx * tx));
        }
        const dx = cl * cosLon[x], dz = -cl * sinLon[x];
        Hm[y * W + x] += g + 0.11 * fbm3(dx * 43, sl * 43, dz * 43, 3);
      }
    }
    log("undulation added");
  }
  fs.writeFileSync(`${TMP}/height.f32`, Buffer.from(Hm.buffer, Hm.byteOffset, Hm.byteLength));
  {
    let mn = 1e9, mx = -1e9;
    for (let i = 0; i < Hm.length; i += 7) { if (Hm[i] < mn) mn = Hm[i]; if (Hm[i] > mx) mx = Hm[i]; }
    log(`height range ${mn.toFixed(2)} … ${mx.toFixed(2)} m`);
  }

  // ── cavity (pits dark, crests light) at two scales
  const b1 = boxBlur(Hm, W, HH, 5, 1), b2 = boxBlur(Hm, W, HH, 22, 1);
  const nrm = Buffer.alloc(W * HH * 3), alb = Buffer.alloc(W * HH);
  const dn = (Math.PI * R) / HH;
  for (let y = 0; y < HH; y++) {
    const ya = Math.max(0, y - 1), yb = Math.min(HH - 1, y + 1);
    const cl = Math.max(cosLat[y], 0.02), sl = sinLat[y];
    const de = (2 * Math.PI * R * cl) / W;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, xa = (x + W - 1) % W, xb = (x + 1) % W;
      const sx = (Hm[y * W + xb] - Hm[y * W + xa]) / (2 * de), sy = (Hm[ya * W + x] - Hm[yb * W + x]) / ((yb - ya) * dn);
      const il = 1 / Math.sqrt(sx * sx + sy * sy + 1);
      const c1 = Hm[i] - b1[i], c2 = Hm[i] - b2[i];
      const ao = clamp(0.82 + c1 * 0.9 + c2 * 0.16, 0.25, 1);
      nrm[i * 3] = Math.round(clamp(-sx * il * 0.5 + 0.5) * 255);
      nrm[i * 3 + 1] = Math.round(clamp(-sy * il * 0.5 + 0.5) * 255);
      nrm[i * 3 + 2] = Math.round(ao * 255);
      const dx = cosLat[y] * cosLon[x], dz = -cosLat[y] * sinLon[x];
      const t = tone(dx, sl, dz);
      let av = lerp(0.33, 0.7, t) + dA[i] + 0.03 * fbm3(dx * 70, sl * 70, dz * 70, 2) + clamp(c1 * 0.035, -0.05, 0.05);
      av = clamp(av, 0.1, 0.97);
      alb[i] = Math.round(av * 255);
    }
  }
  log("normal / cavity / albedo computed");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${HH}`, "-i", "-", "-compression_level", "4", `${OUT}/nrm.png`], { input: nrm, maxBuffer: 1 << 20 });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${HH}`, "-i", "-", "-q:v", "2", `${OUT}/alb.jpg`], { input: alb, maxBuffer: 1 << 20 });
  // previews for a quick look
  {
    const pw = 2048, ph = 1024, pv = Buffer.alloc(pw * ph * 3);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const i = (y * 4 + 2) * W + x * 4 + 2;
      const nx = nrm[i * 3] / 127.5 - 1, ny = nrm[i * 3 + 1] / 127.5 - 1, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const sh = clamp(nx * -0.62 + ny * 0.45 + nz * 0.64) * (nrm[i * 3 + 2] / 255) * (alb[i] / 255) * 1.9;
      const v = Math.round(255 * Math.pow(clamp(sh), 1 / 2.2));
      pv[(y * pw + x) * 3] = v; pv[(y * pw + x) * 3 + 1] = v; pv[(y * pw + x) * 3 + 2] = v;
    }
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${pw}x${ph}`, "-i", "-", "-q:v", "3", `${TMP}/moon-preview.jpg`], { input: pv });
    // 1:1 crop near the breach rim
    const cw = 1600, ch = 900, cx0 = Math.floor(((BREACH.lon - 55) / 360 + 0.5) * W), cy0 = Math.floor((0.5 - (BREACH.lat + 30) / 180) * HH), cv = Buffer.alloc(cw * ch * 3);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (cy0 + y) * W + ((cx0 + x) % W);
      const nx = nrm[i * 3] / 127.5 - 1, ny = nrm[i * 3 + 1] / 127.5 - 1, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const sh = clamp(nx * -0.62 + ny * 0.45 + nz * 0.64) * (nrm[i * 3 + 2] / 255) * (alb[i] / 255) * 1.9;
      const v = Math.round(255 * Math.pow(clamp(sh), 1 / 2.2));
      cv[(y * cw + x) * 3] = v; cv[(y * cw + x) * 3 + 1] = v; cv[(y * cw + x) * 3 + 2] = v;
    }
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${cw}x${ch}`, "-i", "-", "-q:v", "3", `${TMP}/moon-crop.jpg`], { input: cv });
  }
  log("maps written");
}

// ───────────────────────────────────────────────────────────── crust mesh
function bakeMesh() {
  if (!DO_MAPS) {
    const b = fs.readFileSync(`${TMP}/height.f32`);
    Hm.set(new Float32Array(b.buffer, b.byteOffset, W * HH));
  }
  // ── icosphere
  const tph = (1 + Math.sqrt(5)) / 2;
  let vx: number[] = [], vy: number[] = [], vz: number[] = [];
  const addV = (x: number, y: number, z: number) => { const l = Math.hypot(x, y, z); vx.push(x / l); vy.push(y / l); vz.push(z / l); return vx.length - 1; };
  for (const [x, y, z] of [[-1, tph, 0], [1, tph, 0], [-1, -tph, 0], [1, -tph, 0], [0, -1, tph], [0, 1, tph], [0, -1, -tph], [0, 1, -tph], [tph, 0, -1], [tph, 0, 1], [-tph, 0, -1], [-tph, 0, 1]]) addV(x, y, z);
  let tris = new Uint32Array([0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]);
  for (let lv = 0; lv < LEVELS; lv++) {
    const mid = new Map<number, number>();
    const nv0 = vx.length;
    const m = (a: number, b: number) => {
      const k = a < b ? a * 4194304 + b : b * 4194304 + a;
      let i = mid.get(k);
      if (i === undefined) { i = addV(vx[a] + vx[b], vy[a] + vy[b], vz[a] + vz[b]); mid.set(k, i); }
      return i;
    };
    const nt = new Uint32Array(tris.length * 4);
    for (let t = 0, o = 0; t < tris.length; t += 3) {
      const a = tris[t], b = tris[t + 1], c = tris[t + 2], ab = m(a, b), bc = m(b, c), ca = m(c, a);
      nt.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], o);
      o += 12;
    }
    tris = nt;
    void nv0;
  }
  const NV = vx.length, NT = tris.length / 3;
  log(`icosphere: ${NV} vertices, ${NT} triangles, edge ≈ ${((1.107 / 2 ** LEVELS) * R).toFixed(2)} m`);

  // ── sites: dense near the breach rim, sparse far away; a few fracture lines run out over the intact side
  const rand = rng(91203);
  const dotB = (x: number, y: number, z: number) => x * B[0] + y * B[1] + z * B[2];
  /** angular distance from the breach centre in degrees, warped so the opening is irregular */
  const thetaW = (x: number, y: number, z: number) => Math.acos(clamp(dotB(x, y, z), -1, 1)) / D2R + 11 * fbm3(x * 1.9 + 5.2, y * 1.9, z * 1.9, 3) + 4 * fbm3(x * 6.1, y * 6.1 + 2.2, z * 6.1, 2);
  const BR = BREACH.radius;
  const spacing = (th: number) => (th < BR - 6 ? 10.5 : th < BR + 13 ? 6.2 : th < BR + 55 ? lerp(10.5, 17, (th - BR - 13) / 42) : 24);
  type Site = { d: [number, number, number]; th: number; far: boolean; line: boolean; sp: number };
  const sites: Site[] = [];
  const tooClose = (d: [number, number, number], sp: number) => {
    for (const s of sites) { const c = d[0] * s.d[0] + d[1] * s.d[1] + d[2] * s.d[2]; if (c > Math.cos(Math.min(sp, s.sp) * 0.86 * D2R)) return true; }
    return false;
  };
  // fracture lines first (pairs of sites either side of a great-circle arc → the arc becomes a crack)
  {
    const up: [number, number, number] = Math.abs(B[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let t1: [number, number, number] = [B[1] * up[2] - B[2] * up[1], B[2] * up[0] - B[0] * up[2], B[0] * up[1] - B[1] * up[0]];
    const l1 = Math.hypot(...t1); t1 = [t1[0] / l1, t1[1] / l1, t1[2] / l1];
    const t2: [number, number, number] = [B[1] * t1[2] - B[2] * t1[1], B[2] * t1[0] - B[0] * t1[2], B[0] * t1[1] - B[1] * t1[0]];
    const NL = 7;
    for (let k = 0; k < NL; k++) {
      const az = ((k + 0.25 + 0.5 * rand()) / NL) * 2 * Math.PI;
      const len = 55 + rand() * 60;
      let bend = (rand() - 0.5) * 0.5;
      // direction along the surface, starting at the rim
      const dirT: [number, number, number] = [t1[0] * Math.cos(az) + t2[0] * Math.sin(az), t1[1] * Math.cos(az) + t2[1] * Math.sin(az), t1[2] * Math.cos(az) + t2[2] * Math.sin(az)];
      for (let s = BR + 16; s < BR + 16 + len; s += 7.5) {
        const a = s * D2R;
        bend += (rand() - 0.5) * 0.22;
        const side: [number, number, number] = [B[1] * dirT[2] - B[2] * dirT[1], B[2] * dirT[0] - B[0] * dirT[2], B[0] * dirT[1] - B[1] * dirT[0]];
        const p: [number, number, number] = [B[0] * Math.cos(a) + dirT[0] * Math.sin(a), B[1] * Math.cos(a) + dirT[1] * Math.sin(a), B[2] * Math.cos(a) + dirT[2] * Math.sin(a)];
        for (const sg of [-1, 1]) {
          const off = (sg * 4.1 + bend * 9) * D2R;
          const dd: [number, number, number] = [p[0] + side[0] * off, p[1] + side[1] * off, p[2] + side[2] * off];
          const l = Math.hypot(...dd);
          const d: [number, number, number] = [dd[0] / l, dd[1] / l, dd[2] / l];
          if (!tooClose(d, 6.5)) sites.push({ d, th: thetaW(...d), far: false, line: true, sp: 8.2 });
        }
      }
    }
  }
  const nLine = sites.length;
  for (let tries = 0; tries < 160000; tries++) {
    const z = 2 * rand() - 1, ph = 2 * Math.PI * rand(), s = Math.sqrt(1 - z * z);
    const d: [number, number, number] = [s * Math.cos(ph), z, s * Math.sin(ph)];
    const th = thetaW(...d), sp = spacing(th);
    if (tooClose(d, sp)) continue;
    sites.push({ d, th, far: th >= BR + 55, line: false, sp });
  }
  // sites of a fracture line that ended up among far sites still count as near plates
  const NS = sites.length;
  const plateOf = new Int32Array(NS);
  let NP = 1;
  for (let i = 0; i < NS; i++) plateOf[i] = sites[i].far ? 0 : NP++;
  log(`${NS} sites (${nLine} on fracture lines) → ${NP} plates`);
  if (NP > 2040) throw new Error("too many plates for the shader encoding");
  const sx = new Float32Array(NS), sy = new Float32Array(NS), sz = new Float32Array(NS);
  sites.forEach((s, i) => { sx[i] = s.d[0]; sy[i] = s.d[1]; sz[i] = s.d[2]; });

  // ── nearest site of every vertex, in a warped space (organic borders)
  const wx = new Float32Array(NV), wy = new Float32Array(NV), wz = new Float32Array(NV), vs = new Int32Array(NV);
  for (let i = 0; i < NV; i++) {
    const x = vx[i], y = vy[i], z = vz[i];
    let ax = x + 0.045 * noise3(x * 7.3 + 1.1, y * 7.3, z * 7.3) + 0.014 * noise3(x * 23 + 4.4, y * 23, z * 23) + 0.005 * noise3(x * 71, y * 71 + 9.1, z * 71);
    let ay = y + 0.045 * noise3(x * 7.3, y * 7.3 + 5.7, z * 7.3) + 0.014 * noise3(x * 23, y * 23 + 8.8, z * 23) + 0.005 * noise3(x * 71 + 2.2, y * 71, z * 71);
    let az = z + 0.045 * noise3(x * 7.3, y * 7.3, z * 7.3 + 9.2) + 0.014 * noise3(x * 23, y * 23, z * 23 + 1.9) + 0.005 * noise3(x * 71, y * 71, z * 71 + 6.3);
    const l = 1 / Math.hypot(ax, ay, az);
    ax *= l; ay *= l; az *= l;
    wx[i] = ax; wy[i] = ay; wz[i] = az;
    let best = -2, bi = 0;
    for (let s = 0; s < NS; s++) { const c = ax * sx[s] + ay * sy[s] + az * sz[s]; if (c > best) { best = c; bi = s; } }
    vs[i] = bi;
  }
  log("vertices assigned to sites");

  // ── output buffers (grown as needed)
  let pos = new Float32Array(NV * 3 * 3), info = new Float32Array(NV * 3), nOut = 0;
  let idx = new Uint32Array(NT * 3 * 3), nIdx = 0;
  const pushV = (x: number, y: number, z: number, plate: number, kind: number) => {
    if (nOut * 3 + 3 > pos.length) { const p2 = new Float32Array(pos.length * 2); p2.set(pos); pos = p2; const i2 = new Float32Array(info.length * 2); i2.set(info); info = i2; }
    pos[nOut * 3] = x; pos[nOut * 3 + 1] = y; pos[nOut * 3 + 2] = z;
    info[nOut] = plate + kind * 2048;
    return nOut++;
  };
  const pushT = (a: number, b: number, c: number) => {
    if (nIdx + 3 > idx.length) { const i2 = new Uint32Array(idx.length * 2); i2.set(idx); idx = i2; }
    idx[nIdx++] = a; idx[nIdx++] = b; idx[nIdx++] = c;
  };
  // points of the cut surface: original vertices (key v), edge crossings (key e), triangle centres (key t)
  type Pt = { x: number; y: number; z: number; h: number };
  const ptDir = new Map<string, Pt>();
  const mkPt = (key: string, x: number, y: number, z: number) => {
    let p = ptDir.get(key);
    if (!p) { const l = 1 / Math.hypot(x, y, z); x *= l; y *= l; z *= l; p = { x, y, z, h: sampleH(x, y, z) }; ptDir.set(key, p); }
    return p;
  };
  const cross = (a: number, b: number) => {
    const key = a < b ? `e${a}_${b}` : `e${b}_${a}`;
    let p = ptDir.get(key);
    if (p) return key;
    const i = vs[a], j = vs[b];
    const fa = wx[a] * (sx[i] - sx[j]) + wy[a] * (sy[i] - sy[j]) + wz[a] * (sz[i] - sz[j]);
    const fb = wx[b] * (sx[i] - sx[j]) + wy[b] * (sy[i] - sy[j]) + wz[b] * (sz[i] - sz[j]);
    const s = fa - fb > 1e-12 ? clamp(fa / (fa - fb), 0.04, 0.96) : 0.5;
    mkPt(key, lerp(vx[a], vx[b], s), lerp(vy[a], vy[b], s), lerp(vz[a], vz[b], s));
    return key;
  };
  const vkey = (a: number) => { const k = `v${a}`; if (!ptDir.has(k)) mkPt(k, vx[a], vy[a], vz[a]); return k; };
  const topV = new Map<string, number>(), botV = new Map<string, number>();
  const RB = R - CRUST;
  const top = (key: string, plate: number) => {
    const k = key + "|" + plate;
    let i = topV.get(k);
    if (i === undefined) { const p = ptDir.get(key)!; const r = R + p.h; i = pushV(p.x * r, p.y * r, p.z * r, plate, 0); topV.set(k, i); }
    return i;
  };
  const bot = (key: string, plate: number) => {
    const k = key + "|" + plate;
    let i = botV.get(k);
    if (i === undefined) { const p = ptDir.get(key)!; i = pushV(p.x * RB, p.y * RB, p.z * RB, plate, 2); botV.set(k, i); }
    return i;
  };
  // per-plate bookkeeping
  const acc = Array.from({ length: NP }, () => ({ x: 0, y: 0, z: 0, n: 0, tris: 0 }));
  const segs: { a: string; b: string; plate: number }[] = [];
  const emit = (plate: number, ka: string, kb: string, kc: string) => {
    pushT(top(ka, plate), top(kb, plate), top(kc, plate));
    if (plate > 0) pushT(bot(ka, plate), bot(kc, plate), bot(kb, plate));
    const A = acc[plate];
    for (const k of [ka, kb, kc]) { const p = ptDir.get(k)!; A.x += p.x; A.y += p.y; A.z += p.z; A.n++; }
    A.tris++;
  };
  for (let t = 0; t < NT; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
    const pa = plateOf[vs[a]], pb = plateOf[vs[b]], pc = plateOf[vs[c]];
    if (pa === pb && pb === pc) { emit(pa, vkey(a), vkey(b), vkey(c)); continue; }
    // rotate so that the odd one out (or any, when all differ) is last
    let A = a, Bv = b, C = c, PA = pa, PB = pb, PC = pc;
    if (pa === pc && pa !== pb) { A = c; Bv = a; C = b; PA = pc; PB = pa; PC = pb; }
    else if (pb === pc && pa !== pb) { A = b; Bv = c; C = a; PA = pb; PB = pc; PC = pa; }
    if (PA === PB) {
      // A, B on one plate, C on another (the sites may differ although the plates are equal: use vertices' own sites)
      const kbc = cross(Bv, C), kca = cross(C, A);
      emit(PA, vkey(A), vkey(Bv), kbc);
      emit(PA, vkey(A), kbc, kca);
      emit(PC, vkey(C), kca, kbc);
      segs.push({ a: kbc, b: kca, plate: PA }, { a: kca, b: kbc, plate: PC });
    } else {
      const kab = cross(A, Bv), kbc = cross(Bv, C), kca = cross(C, A);
      const p1 = ptDir.get(kab)!, p2 = ptDir.get(kbc)!, p3 = ptDir.get(kca)!;
      const km = `t${t}`;
      mkPt(km, p1.x + p2.x + p3.x, p1.y + p2.y + p3.y, p1.z + p2.z + p3.z);
      emit(PA, vkey(A), kab, km); emit(PA, vkey(A), km, kca);
      emit(PB, vkey(Bv), kbc, km); emit(PB, vkey(Bv), km, kab);
      emit(PC, vkey(C), kca, km); emit(PC, vkey(C), km, kbc);
      segs.push({ a: kab, b: km, plate: PA }, { a: km, b: kca, plate: PA });
      segs.push({ a: kbc, b: km, plate: PB }, { a: km, b: kab, plate: PB });
      segs.push({ a: kca, b: km, plate: PC }, { a: km, b: kbc, plate: PC });
    }
  }
  log(`surface cut: ${nOut} vertices, ${nIdx / 3} triangles, ${segs.length} border segments`);

  // ── centroids (pivot of each plate)
  const cen: [number, number, number][] = acc.map((A) => { const l = Math.hypot(A.x, A.y, A.z) || 1; return [A.x / l, A.y / l, A.z / l]; });
  cen[0] = [-B[0], -B[1], -B[2]];

  // ── side walls: nine rows from the surface down to the underside. A broken face, not a cut one: under a crumbled
  // lip the rock steps back in ledges and hollows up to a metre deep (blocks about three metres across, chips on them)
  const ROWS = [0, 0.045, 0.13, 0.25, 0.4, 0.56, 0.72, 0.87, 1];
  const wallV = new Map<string, number[]>();
  const wall = (key: string, plate: number) => {
    const k = key + "|" + plate;
    let v = wallV.get(k);
    if (!v) {
      const p = ptDir.get(key)!, c = cen[plate];
      // towards the middle of the plate, along the surface
      const dc = c[0] * p.x + c[1] * p.y + c[2] * p.z;
      let ix = c[0] - p.x * dc, iy = c[1] - p.y * dc, iz = c[2] - p.z * dc;
      const il = 1 / (Math.hypot(ix, iy, iz) || 1);
      ix *= il; iy *= il; iz *= il;
      const rt = R + p.h;
      v = ROWS.map((g0, ri) => {
        // the ledges do not run at one level: each row wanders a little along the edge
        const g = ri === 0 || ri === ROWS.length - 1 ? g0 : clamp(g0 + 0.035 * noise3(p.x * 41 + ri * 7.1, p.y * 41, p.z * 41 + plate * 0.37), 0.02, 0.97);
        const rr0 = lerp(rt, RB, g), X = p.x * rr0, Y = p.y * rr0, Z = p.z * rr0;
        const blocks = noise3(X * 0.34 + plate * 1.9, Y * 0.34, Z * 0.34), stepped = Math.round(blocks * 2.6) / 2.6;
        const chips = noise3(X * 1.25, Y * 1.25 + 3.3, Z * 1.25) * 0.6 + noise3(X * 3.1 + 8.8, Y * 3.1, Z * 3.1) * 0.4;
        const prof = sstep(0, 0.045, g) * (1 - sstep(0.86, 1, g));
        const jit = prof * Math.max(0.06, 0.34 + 0.4 * (0.35 * blocks + 0.65 * stepped) + 0.22 * chips);
        const rr = lerp(rt, RB, g);
        const qx = p.x + (ix * jit) / R, qy = p.y + (iy * jit) / R, qz = p.z + (iz * jit) / R, ql = 1 / Math.hypot(qx, qy, qz);
        return pushV(qx * ql * rr, qy * ql * rr, qz * ql * rr, plate, 1);
      });
      wallV.set(k, v);
    }
    return v;
  };
  for (const s of segs) {
    const A = wall(s.a, s.plate), Bw = wall(s.b, s.plate);
    for (let r = 0; r < ROWS.length - 1; r++) { pushT(A[r], A[r + 1], Bw[r + 1]); pushT(A[r], Bw[r + 1], Bw[r]); }
  }
  log(`walls added: ${nOut} vertices, ${nIdx / 3} triangles`);

  // ── a map of the plates (which plate owns a direction) and of the relief, for scattering boulders on the surface:
  // 2048 × 1024 pairs (plate, height in metres), rows from north to south, columns as the height map
  {
    const MW = 2048, MH = 1024, pm = new Float32Array(MW * MH * 2);
    for (let y = 0; y < MH; y++) {
      const lat = (0.5 - (y + 0.5) / MH) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < MW; x++) {
        const lon = ((x + 0.5) / MW - 0.5) * 2 * Math.PI, dx = cl * Math.cos(lon), dy = sl, dz = -cl * Math.sin(lon);
        let ax = dx + 0.045 * noise3(dx * 7.3 + 1.1, dy * 7.3, dz * 7.3) + 0.014 * noise3(dx * 23 + 4.4, dy * 23, dz * 23) + 0.005 * noise3(dx * 71, dy * 71 + 9.1, dz * 71);
        let ay = dy + 0.045 * noise3(dx * 7.3, dy * 7.3 + 5.7, dz * 7.3) + 0.014 * noise3(dx * 23, dy * 23 + 8.8, dz * 23) + 0.005 * noise3(dx * 71 + 2.2, dy * 71, dz * 71);
        let az = dz + 0.045 * noise3(dx * 7.3, dy * 7.3, dz * 7.3 + 9.2) + 0.014 * noise3(dx * 23, dy * 23, dz * 23 + 1.9) + 0.005 * noise3(dx * 71, dy * 71, dz * 71 + 6.3);
        const l = 1 / Math.hypot(ax, ay, az);
        ax *= l; ay *= l; az *= l;
        let best = -2, bi = 0;
        for (let q = 0; q < NS; q++) { const c = ax * sx[q] + ay * sy[q] + az * sz[q]; if (c > best) { best = c; bi = q; } }
        const o = (y * MW + x) * 2;
        pm[o] = plateOf[bi]; pm[o + 1] = sampleH(dx, dy, dz);
      }
    }
    fs.writeFileSync(`${OUT}/platemap.hdr`, Buffer.from(pm.buffer));
    log("plate map written");
  }

  // ── plates.json
  const ang = new Float32Array(NP);
  for (const [k, vi] of topV) {
    const plate = Number(k.slice(k.indexOf("|") + 1));
    const c = cen[plate], l = 1 / Math.hypot(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
    const dd = (pos[vi * 3] * c[0] + pos[vi * 3 + 1] * c[1] + pos[vi * 3 + 2] * c[2]) * l;
    const a = Math.acos(clamp(dd, -1, 1));
    if (plate > 0 && a > ang[plate]) ang[plate] = a;
  }
  const plates: unknown[] = [{ i: 0, c: cen[0], ang: Math.PI, th: 180, line: false, tris: acc[0].tris }];
  for (let s = 0; s < NS; s++) {
    const p = plateOf[s];
    if (p === 0) continue;
    const c = cen[p];
    plates[p] = { i: p, c: c.map((v) => +v.toFixed(6)), ang: +ang[p].toFixed(5), th: +thetaW(c[0], c[1], c[2]).toFixed(2), line: sites[s].line, tris: acc[p].tris };
  }
  fs.writeFileSync(`${OUT}/plates.json`, JSON.stringify({ R, crust: CRUST, breach: { dir: B, radius: BR }, plates }));
  const head = new Uint32Array([nOut, nIdx, NP, 0]);
  // named .hdr only because the renderer's static server streams that extension quickly (.bin took 68 s)
  const fd = fs.openSync(`${OUT}/crust.hdr`, "w");
  fs.writeSync(fd, Buffer.from(head.buffer));
  fs.writeSync(fd, Buffer.from(pos.buffer, 0, nOut * 12));
  fs.writeSync(fd, Buffer.from(info.buffer, 0, nOut * 4));
  fs.writeSync(fd, Buffer.from(idx.buffer, 0, nIdx * 4));
  fs.closeSync(fd);
  log(`crust.hdr: ${nOut} vertices, ${nIdx / 3} triangles, ${NP} plates, ${((16 + nOut * 16 + nIdx * 4) / 1e6).toFixed(1)} MB`);
}

if (DO_MAPS) bakeMaps();
if (DO_MESH) bakeMesh();
// ── the manifest the film reads: ready when every file of the fetch and of the bake is there
{
  const HDRI = "kloppenheim_07_puresky";
  const need = ["moon/crust.hdr", "moon/plates.json", "moon/platemap.hdr", "moon/nrm.png", "moon/alb.jpg", "rocks/rocks.json", `hdr/${HDRI}_2k.hdr`];
  const skies = ["8k", "4k", "2k"].map((r) => `hdr/${HDRI}_${r}.hdr`).filter((f) => fs.existsSync(path.join(STYLE, f)));
  const missing = need.filter((f) => !fs.existsSync(path.join(STYLE, f)));
  const manifest = { env: `hdr/${HDRI}_2k.hdr`, bg: skies[0] ?? `hdr/${HDRI}_2k.hdr`, ready: !missing.length };
  fs.writeFileSync(path.join(STYLE, "assets.json"), JSON.stringify(manifest, null, 1) + "\n");
  log(`assets.json ${JSON.stringify(manifest)}${missing.length ? " · missing: " + missing.join(", ") : ""}`);
}
log("done");
