// Snow Castle 3D · downloads the scanned materials and the sky photograph from Poly Haven (all CC0, no account) into
// public/styles/snow-castle-3d/ and writes assets.json, which tells the engine which sky file to show.
// The kit ships a light set (1k textures + the 2k sky) so the demo plays at once; run this before a final render.
//   node src/styles/snow-castle-3d/pipeline/fetch-assets.mjs                 → 2k textures + 8k sky (≈ 115 MB, the accepted film)
//   node src/styles/snow-castle-3d/pipeline/fetch-assets.mjs --res 1k --sky 2k   → the light set again (≈ 15 MB)
//   options: --public <dir> (default: public of this project) · --res 1k|2k|4k · --sky 2k|4k|8k · --dry (only list)
// Files already on disk with the right size are kept. Needs Node 18+ and network access to api.polyhaven.com.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PUBLIC = path.resolve(opt("--public", "public"));
const RES = opt("--res", "2k"), SKY = opt("--sky", "8k"), DRY = args.includes("--dry");
const OUT = path.join(PUBLIC, "styles", "snow-castle-3d");
const UA = { "User-Agent": "nfp-kit-assets/1.0" };

/** the materials of the film: id → maps (Poly Haven names); snow_02 only lends its normal map to the snow */
const TEXTURES = {
  castle_wall_slates: ["Diffuse", "nor_gl", "arm"],
  stone_brick_wall_001: ["Diffuse", "nor_gl", "arm"],
  roof_slates_03: ["Diffuse", "nor_gl", "arm"],
  dark_rock_02: ["Diffuse", "nor_gl", "arm"],
  weathered_planks: ["Diffuse", "nor_gl", "arm"],
  pine_bark: ["Diffuse", "nor_gl", "arm"],
  snow_02: ["nor_gl"],
};
/** a pure sky over flat ground: a soft overcast deck with a brighter lead to the left (turned behind the castle in the engine) */
const HDRI = "overcast_soil_puresky";
const SHORT = { Diffuse: "diff", nor_gl: "nor_gl", arm: "arm" };

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
  if (fs.existsSync(dst) && fs.statSync(dst).size === size) { console.log(`  = ${path.relative(PUBLIC, dst)} (on disk)`); return; }
  total += size;
  if (DRY) { console.log(`  · ${path.relative(PUBLIC, dst)} ${(size / 1e6).toFixed(1)} MB`); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  fs.writeFileSync(dst, buf);
  console.log(`  ↓ ${path.relative(PUBLIC, dst)} ${(buf.length / 1e6).toFixed(1)} MB`);
}

console.log(`→ ${OUT} · textures ${RES} · sky ${SKY}${DRY ? " · dry run" : ""}`);
for (const [id, maps] of Object.entries(TEXTURES)) {
  const j = await files(id);
  for (const m of maps) {
    const e = j[m]?.[RES]?.jpg;
    if (!e) throw new Error(`${id}: no ${m} at ${RES} (have ${Object.keys(j[m] ?? {}).join(", ")})`);
    await save(e.url, e.size, path.join(OUT, "tex", `${id}_${SHORT[m]}.jpg`));
  }
}
const h = (await files(HDRI)).hdri;
for (const res of [...new Set(["2k", SKY])]) {
  const e = h?.[res]?.hdr;
  if (!e) throw new Error(`${HDRI}: no ${res} hdr`);
  await save(e.url, e.size, path.join(OUT, "hdr", `${HDRI}_${res}.hdr`));
}
const manifest = { env: `hdr/${HDRI}_2k.hdr`, bg: `hdr/${HDRI}_${SKY}.hdr`, tex: RES };
if (!DRY) fs.writeFileSync(path.join(OUT, "assets.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`${DRY ? "would download" : "downloaded"} ${(total / 1e6).toFixed(1)} MB · assets.json ${JSON.stringify(manifest)}`);
