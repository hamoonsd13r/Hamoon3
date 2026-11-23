// Atlas Doc · map data for your region, from Natural Earth (public domain): countries, rivers, lakes — clipped to a
// lon/lat box, simplified, 3 decimals. → one JSON your film imports (src/vNN/geo.json).
//   countries: { ISO3: [ring…] }   rivers: [{ n, r, p: [[lon,lat]…] }] (r = rank, 1 = biggest)   lakes: [{ n, r, rings }]
// The three Natural Earth files (~25 MB) are downloaded once into --ne (default .cache/natural-earth) and reused.
// Usage: node src/styles/atlas-doc/pipeline/geo-prep.mjs --bbox <lon0,lat0,lon1,lat1> --out src/vNN/geo.json
//          [--eps 0.02] (simplify, degrees; smaller = more detail, bigger file) [--rivers 7] [--lakes 6] [--ne <dir>]
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BB = (opt("bbox", "") || "").split(",").map(Number);
const OUT = opt("out", "");
if (BB.length !== 4 || BB.some((x) => !Number.isFinite(x)) || !OUT) {
  console.log("usage: node src/styles/atlas-doc/pipeline/geo-prep.mjs --bbox lon0,lat0,lon1,lat1 --out src/vNN/geo.json [--eps 0.02] [--rivers 7] [--lakes 6] [--ne dir]");
  process.exit(1);
}
const EPS = Number(opt("eps", 0.02)), RIV_MAX = Number(opt("rivers", 7)), LAKE_MAX = Number(opt("lakes", 6));
const NE = opt("ne", ".cache/natural-earth");
const SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const FILES = ["ne_10m_admin_0_countries", "ne_10m_rivers_lake_centerlines", "ne_10m_lakes"];

fs.mkdirSync(NE, { recursive: true });
for (const f of FILES) {
  const p = path.join(NE, `${f}.geojson`);
  if (fs.existsSync(p) && fs.statSync(p).size > 100000) continue;
  console.log("downloading", f, "…");
  const r = await fetch(SRC + f + ".geojson", { headers: { "User-Agent": "NFP-Kit/3 (map data)" } });
  if (!r.ok) throw new Error(`${f}: HTTP ${r.status} — download it by hand into ${NE}/ (naturalearthdata.com)`);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
}
const read = (f) => JSON.parse(fs.readFileSync(path.join(NE, `${f}.geojson`), "utf8"));

const q = (x) => Math.round(x * 1000) / 1000;
const [lo0, la0, lo1, la1] = BB;
const pad = Math.max(lo1 - lo0, la1 - la0) * 0.08;
const inBox = ([x, y]) => x >= lo0 - pad && x <= lo1 + pad && y >= la0 - pad && y <= la1 + pad;
const touches = (pts) => pts.some(inBox);
// Douglas–Peucker (degrees)
const rdp = (pts, eps) => {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    let dm = 0, im = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((pts[i][0] - x1) * dx + (pts[i][1] - y1) * dy) / L));
      const ex = x1 + t * dx - pts[i][0], ey = y1 + t * dy - pts[i][1], d = ex * ex + ey * ey;
      if (d > dm) { dm = d; im = i; }
    }
    if (dm > eps * eps) { keep[im] = 1; st.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
};
const ringsOf = (g) => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
const linesOf = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
const simp = (pts, eps) => rdp(pts, eps).map(([x, y]) => [q(x), q(y)]);

const out = { bbox: BB, countries: {}, rivers: [], lakes: [] };
for (const f of read(FILES[0]).features) {
  const p = f.properties;
  const iso = p.ADM0_A3 || p.ISO_A3 || p.SOV_A3;
  const rings = ringsOf(f.geometry).map((r) => r).filter(touches).map((r) => simp(r, EPS)).filter((r) => r.length >= 4);
  if (rings.length) out.countries[iso] = (out.countries[iso] ?? []).concat(rings);
}
for (const f of read(FILES[1]).features) {
  const r = f.properties.scalerank ?? 10;
  if (r > RIV_MAX) continue;
  for (const l of linesOf(f.geometry)) if (touches(l)) out.rivers.push({ n: f.properties.name_en || f.properties.name || "", r, p: simp(l, EPS * 0.6) });
}
for (const f of read(FILES[2]).features) {
  const r = f.properties.scalerank ?? 10;
  if (r > LAKE_MAX) continue;
  const rings = ringsOf(f.geometry).filter(touches).map((x) => simp(x, EPS * 0.6)).filter((x) => x.length >= 4);
  if (rings.length) out.lakes.push({ n: f.properties.name_en || f.properties.name || "", r, rings });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`${OUT}: ${Object.keys(out.countries).length} countries, ${out.rivers.length} river lines, ${out.lakes.length} lakes, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
