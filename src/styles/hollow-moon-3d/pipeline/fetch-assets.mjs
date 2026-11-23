// Hollow Moon 3D · downloads everything the film needs that the kit cannot ship (all free for any use):
//   Poly Haven (CC0): the moonlit cloud deck "kloppenheim_07_puresky" (2k lights the world, 8k is the sky you see),
//     the lunar regolith and rock textures, a dark metal plate for the ring, and seven photoscanned moon rocks (glTF,
//     flattened here into small binary meshes the engine reads without a loader);
//   NASA SVS CGI Moon Kit (public domain): the LROC colour map of the moon (4k TIFF) — the input of pipeline/bake.mts.
// Then run the bake. Both scripts write public/styles/hollow-moon-3d/assets.json; the film renders once it says ready.
//   node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs                 → ≈ 180 MB (2k textures and rocks, 8k sky)
//   options: --public <dir> (default public) · --cache <dir> (default .cache/hollow-moon-3d: raw downloads, bake input)
//            --res 1k|2k|4k (textures and rocks) · --sky 2k|4k|8k · --dry
// Files already on disk with the right size are kept. Needs Node 18+ and access to api.polyhaven.com and svs.gsfc.nasa.gov.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PUBLIC = path.resolve(opt("--public", "public"));
const CACHE = path.resolve(opt("--cache", ".cache/hollow-moon-3d"));
const RES = opt("--res", "2k"), SKY = opt("--sky", "8k"), DRY = args.includes("--dry");
const OUT = path.join(PUBLIC, "styles", "hollow-moon-3d");
const UA = { "User-Agent": "nfp-kit-assets/1.0" };
const HDRI = "kloppenheim_07_puresky";
/** id → maps the engine reads (tex/<id>_<map>.jpg) */
const TEXTURES = {
  moon_meteor_01: ["Diffuse", "nor_gl"],   // regolith at metre scale (on the crust)
  moon_macro_01: ["Diffuse", "nor_gl"],    // the same at hand scale
  dark_rock_02: ["Diffuse", "nor_gl"],     // layered basalt on the broken edges of the plates
  blue_metal_plate: ["arm", "nor_gl"],     // the plated band of the great ring
};
const SHORT = { Diffuse: "diff", nor_gl: "nor_gl", arm: "arm" };
const ROCKS = ["moon_rock_01", "moon_rock_02", "moon_rock_03", "moon_rock_04", "moon_rock_05", "moon_rock_06", "moon_rock_07"];
const LROC = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif";

const get = async (url, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
    }
  }
};
const files = async (id) => (await get(`https://api.polyhaven.com/files/${id}`)).json();
let total = 0;
async function save(url, size, dst) {
  if (fs.existsSync(dst) && (!size || fs.statSync(dst).size === size)) return false;
  total += size || 0;
  if (DRY) { console.log(`  · ${dst} ${size ? (size / 1e6).toFixed(1) + " MB" : ""}`); return true; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  fs.writeFileSync(dst, buf);
  console.log(`  ↓ ${path.basename(dst)} ${(buf.length / 1e6).toFixed(1)} MB`);
  return true;
}

console.log(`→ ${OUT} · textures/rocks ${RES} · sky ${SKY} · cache ${CACHE}${DRY ? " · dry run" : ""}`);
// ── sky
{
  const h = (await files(HDRI)).hdri;
  for (const res of [...new Set(["2k", SKY])]) {
    const e = h?.[res]?.hdr;
    if (!e) throw new Error(`${HDRI}: no ${res} hdr`);
    await save(e.url, e.size, path.join(OUT, "hdr", `${HDRI}_${res}.hdr`));
  }
}
// ── textures
for (const [id, maps] of Object.entries(TEXTURES)) {
  const j = await files(id);
  for (const m of maps) {
    const e = j[m]?.[RES]?.jpg;
    if (!e) throw new Error(`${id}: no ${m} at ${RES}`);
    await save(e.url, e.size, path.join(OUT, "tex", `${id}_${SHORT[m]}.jpg`));
  }
}
// ── the NASA map (bake input, kept out of public: Remotion copies public/ on every render)
await save(LROC, 0, path.join(CACHE, "lroc_color_poles_4k.tif"));

// ── scanned rocks: glTF → one binary per rock: header u32 nV, nI · f32 pos[3nV] · f32 nrm[3nV] · f32 uv[2nV] · u32 idx[nI]
// (named .hdr only because the renderer's static server streams that extension quickly) + its maps + rocks.json
if (!DRY) {
  const RO = path.join(OUT, "rocks"), RAW = path.join(CACHE, "ph-rocks");
  fs.mkdirSync(RO, { recursive: true });
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const RD = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" };
  const meta = [];
  for (const id of ROCKS) {
    const dir = path.join(RAW, id);
    const f = await files(id);
    const g = f.gltf?.[RES]?.gltf;
    if (!g) { console.log(`  ${id}: no glTF at ${RES} (have ${Object.keys(f.gltf ?? {}).join(", ")})`); continue; }
    await save(g.url, g.size, path.join(dir, path.basename(g.url)));
    for (const [rel, inc] of Object.entries(g.include ?? {})) await save(inc.url, inc.size, path.join(dir, rel));
    const j = JSON.parse(fs.readFileSync(path.join(dir, path.basename(g.url)), "utf8"));
    const bufs = j.buffers.map((b) => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri))));
    const acc = (i) => {
      const a = j.accessors[i], v = j.bufferViews[a.bufferView], T = COMP[a.componentType], n = NUM[a.type];
      const off = (v.byteOffset ?? 0) + (a.byteOffset ?? 0), sz = T.BYTES_PER_ELEMENT, step = v.byteStride || sz * n;
      const src = bufs[v.buffer], dv = new DataView(src.buffer, src.byteOffset, src.byteLength), out = new T(a.count * n);
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[RD[a.componentType]](off + k * step + c * sz, true);
      return { data: out, count: a.count };
    };
    // every primitive of every mesh, moved by its node (scale / rotation / translation), merged
    const P = [], Nn = [], UV = [], IX = [];
    let base = 0;
    const quat = (q, v) => { const [x, y, z, w] = q, [a, b, c] = v; const tx = 2 * (y * c - z * b), ty = 2 * (z * a - x * c), tz = 2 * (x * b - y * a); return [a + w * tx + (y * tz - z * ty), b + w * ty + (z * tx - x * tz), c + w * tz + (x * ty - y * tx)]; };
    for (const node of j.nodes ?? []) {
      if (node.mesh === undefined) continue;
      const s = node.scale ?? [1, 1, 1], r = node.rotation ?? [0, 0, 0, 1], t = node.translation ?? [0, 0, 0];
      for (const prim of j.meshes[node.mesh].primitives) {
        const p = acc(prim.attributes.POSITION), nn = acc(prim.attributes.NORMAL), uv = prim.attributes.TEXCOORD_0 !== undefined ? acc(prim.attributes.TEXCOORD_0) : null, ix = acc(prim.indices);
        for (let k = 0; k < p.count; k++) {
          const v = quat(r, [p.data[k * 3] * s[0], p.data[k * 3 + 1] * s[1], p.data[k * 3 + 2] * s[2]]);
          P.push(v[0] + t[0], v[1] + t[1], v[2] + t[2]);
          const m = quat(r, [nn.data[k * 3] / s[0], nn.data[k * 3 + 1] / s[1], nn.data[k * 3 + 2] / s[2]]), ml = Math.hypot(...m) || 1;
          Nn.push(m[0] / ml, m[1] / ml, m[2] / ml);
          UV.push(uv ? uv.data[k * 2] : 0, uv ? uv.data[k * 2 + 1] : 0);
        }
        for (let k = 0; k < ix.count; k++) IX.push(ix.data[k] + base);
        base += p.count;
      }
    }
    // centre on the middle of the bounding box, scale so the longest half-axis is 1
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < P.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[k + c]); mx[c] = Math.max(mx[c], P[k + c]); }
    const cen = mn.map((v, c) => (v + mx[c]) / 2), half = Math.max(...mx.map((v, c) => (v - mn[c]) / 2));
    for (let k = 0; k < P.length; k += 3) for (let c = 0; c < 3; c++) P[k + c] = (P[k + c] - cen[c]) / half;
    const nV = P.length / 3, nI = IX.length;
    const buf = Buffer.alloc(8 + nV * 32 + nI * 4);
    buf.writeUInt32LE(nV, 0); buf.writeUInt32LE(nI, 4);
    Buffer.from(new Float32Array(P).buffer).copy(buf, 8);
    Buffer.from(new Float32Array(Nn).buffer).copy(buf, 8 + nV * 12);
    Buffer.from(new Float32Array(UV).buffer).copy(buf, 8 + nV * 24);
    Buffer.from(new Uint32Array(IX).buffer).copy(buf, 8 + nV * 32);
    fs.writeFileSync(path.join(RO, `${id}.hdr`), buf);
    const tex = {};
    for (const rel of Object.keys(g.include ?? {})) {
      const mt = /_(diff|nor_gl|arm|rough)_\dk\.(jpg|png)$/.exec(rel);
      if (!mt) continue;
      const role = mt[1] === "nor_gl" ? "nor" : mt[1];
      const dst = `${id}_${role}.${mt[2]}`;
      fs.copyFileSync(path.join(dir, rel), path.join(RO, dst));
      tex[role] = dst;
    }
    meta.push({ id, nV, nI, size: mx.map((v, c) => +((v - mn[c]) / (2 * half)).toFixed(3)), metres: +(half * 2).toFixed(3), tex });
    console.log(`  ${id}: ${nV} vertices, ${nI / 3} triangles, ${(half * 2).toFixed(2)} m, maps ${Object.values(tex).join(", ")}`);
  }
  fs.writeFileSync(path.join(RO, "rocks.json"), JSON.stringify(meta, null, 1));
}

// ── manifest: ready only when the bake's files are there too
const NEED = ["moon/crust.hdr", "moon/plates.json", "moon/platemap.hdr", "moon/nrm.png", "moon/alb.jpg", "rocks/rocks.json", `hdr/${HDRI}_2k.hdr`];
if (!DRY) {
  const skies = ["8k", "4k", "2k"].map((r) => `hdr/${HDRI}_${r}.hdr`).filter((f) => fs.existsSync(path.join(OUT, f)));
  const ready = NEED.every((f) => fs.existsSync(path.join(OUT, f)));
  const manifest = { env: `hdr/${HDRI}_2k.hdr`, bg: skies[0] ?? `hdr/${HDRI}_2k.hdr`, ready };
  fs.writeFileSync(path.join(OUT, "assets.json"), JSON.stringify(manifest, null, 1) + "\n");
  console.log(`${(total / 1e6).toFixed(1)} MB downloaded · assets.json ${JSON.stringify(manifest)}${ready ? "" : " · next: npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts"}`);
} else console.log(`would download ≈ ${(total / 1e6).toFixed(1)} MB (+ the rocks)`);
