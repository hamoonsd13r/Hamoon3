// Myth Cinematic 3D · downloads the scanned materials from Poly Haven (all CC0, no account) into
// public/styles/myth-cinematic-3d/tex/. The kit ships a light set (1k colour, 512 px normal and roughness maps) so the
// demo renders at once; run this before a final render for the full-quality maps.
//   node src/styles/myth-cinematic-3d/pipeline/fetch-textures.mjs            → 1k colour + normal + roughness (the film)
//   node src/styles/myth-cinematic-3d/pipeline/fetch-textures.mjs --res 2k   → sharper (≈ 4× the size)
//   options: --public <dir> (default: public of this project) · --res 1k|2k|4k · --dry (only list) · --force (replace)
// Needs Node 18+ and network access to api.polyhaven.com.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PUBLIC = path.resolve(opt("--public", "public"));
const RES = opt("--res", "1k"), DRY = args.includes("--dry"), FORCE = args.includes("--force");
const OUT = path.join(PUBLIC, "styles", "myth-cinematic-3d", "tex");
const UA = { "User-Agent": "nfp-kit-assets/1.0" };
// the four base materials + every id listed in extra-<set>.json (the sets' own picks)
const BASE = ["large_sandstone_blocks_01", "medieval_blocks_03", "aerial_sand", "damp_sand"];
const extra = ["well", "hall", "c"].flatMap((s) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `extra-${s}.json`), "utf8")); } catch { return []; } });
const IDS = [...new Set([...BASE, ...extra])];
const MAPS = { Diffuse: "diff", nor_gl: "nor_gl", Rough: "rough" };

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
let total = 0;
console.log(`→ ${OUT} · ${IDS.length} materials · ${RES}${DRY ? " · dry run" : ""}`);
for (const id of IDS) {
  const j = await (await get(`https://api.polyhaven.com/files/${id}`)).json();
  for (const [m, short] of Object.entries(MAPS)) {
    const e = j[m]?.[RES]?.jpg;
    if (!e) throw new Error(`${id}: no ${m} at ${RES} (have ${Object.keys(j[m] ?? {}).join(", ")})`);
    const dst = path.join(OUT, `${id}_${short}.jpg`);
    if (!FORCE && fs.existsSync(dst) && fs.statSync(dst).size === e.size) { console.log(`  = ${path.basename(dst)}`); continue; }
    total += e.size;
    if (DRY) { console.log(`  · ${path.basename(dst)} ${(e.size / 1e6).toFixed(1)} MB`); continue; }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(dst, Buffer.from(await (await get(e.url)).arrayBuffer()));
    console.log(`  ↓ ${path.basename(dst)} ${(e.size / 1e6).toFixed(1)} MB`);
  }
}
console.log(`${DRY ? "would download" : "downloaded"} ${(total / 1e6).toFixed(1)} MB`);
