// Atlas Doc · satellite tiles for your region: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0 — put the credit line in
// the film and the description: «Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus
// Sentinel data 2016)»). A pyramid: wide zooms for the whole region, deeper zooms only where your camera goes close.
// Polite: 6 at a time, retries, skips tiles already on disk. Writes <out>/{z}/{x}/{y}.jpg and <out>/index.json
// ({ "z": ["x,y", …] }) — import that index in your film: tiles={{ index, url: (z, x, y) => staticFile(`…/${z}/${x}/${y}.jpg`) }}.
// Usage: node src/styles/atlas-doc/pipeline/tiles-get.mjs --out public/vNN/tiles
//          --plan "3-5:-20,-12,60,42" --plan "6-7:28,20,36,32" --plan "8-9:32,23,33.6,24.6"
//   each --plan is zoomFrom-zoomTo:lon0,lat0,lon1,lat1 (deep zooms cost: z9 ≈ 4× z8). Budget: a 20-min film ≈ 50 MB.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const OUT = args[args.indexOf("--out") + 1];
const plans = args.flatMap((a, i) => (a === "--plan" ? [args[i + 1]] : []));
if (!OUT || args.indexOf("--out") < 0 || !plans.length) {
  console.log('usage: node src/styles/atlas-doc/pipeline/tiles-get.mjs --out public/vNN/tiles --plan "3-5:lon0,lat0,lon1,lat1" [--plan …]');
  process.exit(1);
}
const URL = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`;
const UA = "NFP-Kit/3 (documentary maps)";
const tx = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const ty = (lat, z) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z); };
const jobs = new Map();
for (const p of plans) {
  const [zz, box] = p.split(":");
  const [z0, z1] = zz.split("-").map(Number);
  const [lon0, lat0, lon1, lat1] = box.split(",").map(Number);
  for (let z = z0; z <= (z1 ?? z0); z++)
    for (let x = tx(lon0, z); x <= tx(lon1, z); x++)
      for (let y = ty(lat1, z); y <= ty(lat0, z); y++) jobs.set(`${z}/${x}/${y}`, [z, x, y]);
}
const todo = [...jobs.values()].filter(([z, x, y]) => !fs.existsSync(path.join(OUT, String(z), String(x), `${y}.jpg`)));
console.log(`tiles: ${jobs.size} in plan, ${todo.length} to fetch`);
let done = 0, fail = 0;
const get = async ([z, x, y]) => {
  const f = path.join(OUT, String(z), String(x), `${y}.jpg`);
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(URL(z, x, y), { headers: { "User-Agent": UA } });
      if (r.status === 404) return;
      if (!r.ok) throw new Error(String(r.status));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
      if (++done % 100 === 0) console.log(done, "/", todo.length);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (k + 1)));
    }
  }
  fail++;
};
const q = [...todo];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await get(q.shift()); }));
// index of what is on disk (the film only asks for tiles that exist: a missing tile would fail the render)
const index = {};
for (const z of fs.readdirSync(OUT).filter((d) => /^\d+$/.test(d))) {
  const list = [];
  for (const x of fs.readdirSync(path.join(OUT, z))) for (const yf of fs.readdirSync(path.join(OUT, z, x))) if (yf.endsWith(".jpg")) list.push(`${x},${yf.slice(0, -4)}`);
  index[z] = list;
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));
let bytes = 0;
for (const z of Object.keys(index)) for (const k of index[z]) { const [x, y] = k.split(","); bytes += fs.statSync(path.join(OUT, z, x, `${y}.jpg`)).size; }
console.log(`done ${done}, failed ${fail}; on disk ${Object.values(index).flat().length} tiles, ${(bytes / 1e6).toFixed(1)} MB → ${path.join(OUT, "index.json")}`);
