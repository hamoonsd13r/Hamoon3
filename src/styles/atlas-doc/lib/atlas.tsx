// Atlas Doc · the Atlas: a documentary map with a real camera (lon, lat, zoom, tilt°, rot°). Satellite tiles when you
// have them (Sentinel-2 cloudless 2016 by EOX, CC BY 4.0 — pipeline/tiles-get.mjs), graded cold and dark like a
// war-room screen; without tiles, a clean dark vector map. Natural Earth borders, rivers, lakes (pipeline/geo-prep.mjs),
// plus everything the story needs: a focus country, highlighted areas (hatched or filled), routes that draw themselves,
// arcs with heads, markers, distance rings, and Persian labels drawn in screen space (sharp and upright even on a
// tilted map). Web Mercator; map units = Mercator pixels at zoom 10. Pure function of (t, cam, props).
import React, { useEffect, useState } from "react";
import { Img, continueRender, delayRender, staticFile } from "remotion";
import { C, F, H, W, clamp, ease, hash, mix, ramp } from "./theme";

export type LL = [number, number];
export type Ring = LL[];
export type GeoData = {
  countries: Record<string, Ring[]>;
  rivers?: { n: string; r: number; p: LL[] }[];
  lakes?: { n: string; r: number; rings: Ring[] }[];
  admin1?: Record<string, Ring[]>;
  roads?: LL[][];
  towns?: { ll: LL; n: string; r: number }[];
};
/** satellite tiles: which tiles exist per zoom ("x,y" strings) and where they are (staticFile path) */
export type TileSet = { index: Record<string, string[]>; url: (z: number, x: number, y: number) => string };

/** load a tile folder made by pipeline/tiles-get.mjs (reads its index.json once; no folder → undefined → vector map) */
export const useTiles = (dir?: string): TileSet | undefined => {
  const [h] = useState(() => (dir ? delayRender("atlas-doc tiles index") : null));
  const [set, setSet] = useState<TileSet>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!dir || h === null) return;
    fetch(staticFile(`${dir}/index.json`))
      .then((r) => r.json())
      .then((index: Record<string, string[]>) => setSet({ index, url: (z, x, y) => staticFile(`${dir}/${z}/${x}/${y}.jpg`) }))
      .catch((e) => {
        console.error("atlas-doc: no tiles index in", dir, e);
        setFailed(true);
      });
  }, [dir, h]);
  // release the frame only after the tiles are in the state (so the first frame already has them)
  useEffect(() => {
    if (h !== null && (set || failed)) continueRender(h);
  }, [set, failed, h]);
  return set;
};

const Z0 = 10;
const WORLD = 256 * 2 ** Z0;
/** lon/lat → map units (Mercator pixels at zoom 10) */
export const M = (ll: LL): [number, number] => {
  const s = Math.sin((Math.max(-85, Math.min(85, ll[1])) * Math.PI) / 180);
  return [((ll[0] + 180) / 360) * WORLD, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD];
};
export const Minv = ([x, y]: [number, number]): LL => [(x / WORLD) * 360 - 180, ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * y) / WORLD))) - Math.PI / 2) * 180) / Math.PI];

const r1 = (v: number) => Math.round(v * 10) / 10;
export const ringsD = (rings: Ring[]) => {
  let d = "";
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const [x, y] = M(r[i]);
      d += (i ? "L" : "M") + r1(x) + "," + r1(y);
    }
    d += "Z";
  }
  return d;
};
export const lineD = (pts: LL[]) => pts.map((p, i) => { const [x, y] = M(p); return (i ? "L" : "M") + r1(x) + "," + r1(y); }).join("");

// ── paths built once per geo object ──
type Built = { all: string; byIso: Map<string, string>; rivers: Map<number, string>; lakes: string; roads: string; a1: Map<string, string>; named: Map<string, string> };
const BUILT = new WeakMap<GeoData, Built>();
const built = (g: GeoData): Built => {
  let b = BUILT.get(g);
  if (b) return b;
  b = {
    all: ringsD(Object.values(g.countries).flat()),
    byIso: new Map(),
    rivers: new Map(),
    lakes: ringsD((g.lakes ?? []).flatMap((l) => l.rings)),
    roads: (g.roads ?? []).map(lineD).join(""),
    a1: new Map(),
    named: new Map(),
  };
  BUILT.set(g, b);
  return b;
};
const isoD = (g: GeoData, iso: string) => {
  const b = built(g);
  if (!b.byIso.has(iso)) b.byIso.set(iso, ringsD(g.countries[iso] ?? []));
  return b.byIso.get(iso)!;
};
const riversD = (g: GeoData, maxRank: number) => {
  const b = built(g);
  if (!b.rivers.has(maxRank)) b.rivers.set(maxRank, (g.rivers ?? []).filter((x) => x.r <= maxRank).map((x) => lineD(x.p)).join(""));
  return b.rivers.get(maxRank)!;
};
/** all river lines whose name contains `match` (case-insensitive), e.g. "nile" → White Nile, Blue Nile, Nile … */
const namedRiverD = (g: GeoData, match: string) => {
  const b = built(g);
  if (!b.named.has(match)) b.named.set(match, (g.rivers ?? []).filter((x) => x.n.toLowerCase().includes(match.toLowerCase())).map((x) => lineD(x.p)).join(""));
  return b.named.get(match)!;
};
const namedLakeD = (g: GeoData, match: string) => ringsD((g.lakes ?? []).filter((l) => l.n.toLowerCase().includes(match.toLowerCase())).flatMap((l) => l.rings));
const a1D = (g: GeoData, key: string) => {
  const b = built(g);
  if (!b.a1.has(key)) b.a1.set(key, ringsD(g.admin1?.[key] ?? []));
  return b.a1.get(key)!;
};

// ── camera ──
export type Cam = { lon: number; lat: number; zoom: number; tilt?: number; rot?: number };
export type CamKey = Cam & { t: number; arc?: number };
/** camera between keys: the centre eases in map space, zoom eases linearly (already logarithmic); `arc` on the
 *  arriving key lifts the zoom out mid-move (a flight between far places) */
export const camAt = (t: number, keys: CamKey[]): Cam => {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const u = ease.inOut(ramp(t, a.t, b.t));
      const [ax, ay] = M([a.lon, a.lat]), [bx, by] = M([b.lon, b.lat]);
      const ll = Minv([mix(ax, bx, u), mix(ay, by, u)]);
      return { lon: ll[0], lat: ll[1], zoom: mix(a.zoom, b.zoom, u) - (b.arc ?? 0) * Math.sin(Math.PI * u), tilt: mix(a.tilt ?? 0, b.tilt ?? 0, u), rot: mix(a.rot ?? 0, b.rot ?? 0, u) };
    }
  }
  return keys[keys.length - 1];
};
const PERSP = 2400;
/** map point → screen pixel (+ the perspective scale there) */
export const toScreen = (ll: LL, cam: Cam, w = W, h = H): [number, number, number] => {
  const [cx, cy] = M([cam.lon, cam.lat]);
  const [x0, y0] = M(ll);
  const k = 2 ** (cam.zoom - Z0);
  let x = (x0 - cx) * k, y = (y0 - cy) * k;
  const r = ((cam.rot ?? 0) * Math.PI) / 180;
  if (r) [x, y] = [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
  const a = ((cam.tilt ?? 0) * Math.PI) / 180;
  const z = y * Math.sin(a), pk = PERSP / (PERSP - z);
  return [w / 2 + x * pk, h / 2 + y * Math.cos(a) * pk, pk];
};
/** screen pixel → map units (inverse of the tilt and the rotation) */
const toMap = (sx: number, sy: number, cam: Cam, w = W, h = H): [number, number] => {
  const a = ((cam.tilt ?? 0) * Math.PI) / 180;
  const Y = sy - h / 2, X = sx - w / 2;
  const y = (Y * PERSP) / (PERSP * Math.cos(a) + Y * Math.sin(a));
  const pk = PERSP / (PERSP - y * Math.sin(a));
  let x = X / pk, yy = y;
  const r = (-(cam.rot ?? 0) * Math.PI) / 180;
  if (r) [x, yy] = [x * Math.cos(r) - yy * Math.sin(r), x * Math.sin(r) + yy * Math.cos(r)];
  const k = 2 ** (cam.zoom - Z0);
  const [cx, cy] = M([cam.lon, cam.lat]);
  return [cx + x / k, cy + yy / k];
};

export type Label = { ll: LL; text: string; en?: string; u: number; tier?: 1 | 2 | 3; dx?: number; dy?: number; color?: string };
export type Route = { pts: LL[]; u: number; color?: string; width?: number; glow?: boolean; fade?: number };
export type Arc = { from: LL; to: LL; u: number; color?: string; bend?: number; width?: number; head?: boolean };
export type Marker = { ll: LL; u: number; color?: string; size?: number; kind?: "dot" | "diamond" | "square" | "fire" | "pulse" };
export type Area = { rings?: Ring[]; iso?: string; lake?: string; u: number; color?: string; fill?: number; edge?: number; hatch?: boolean };

export type AtlasProps = {
  t: number;
  cam: Cam;
  geo: GeoData;
  tiles?: TileSet;
  sat?: number; // satellite brightness (1 = the grade)
  tint?: number; // cold tint strength 0..1 (default 1)
  focus?: { iso: string; u: number }; // everything but this country darkens
  edge?: string[]; // countries with a bright border
  rivers?: number;
  riverRank?: number; // draw rivers with Natural Earth rank ≤ this (1 = only the biggest)
  riverHi?: { match: string; u: number; color?: string }; // a named river glows («nile», «tigris»)
  lakes?: number;
  roads?: number;
  towns?: number;
  grid?: number;
  scaleBar?: number;
  hl?: { key: string; u: number; color?: string }[]; // admin-1 regions (if your geo has them)
  areas?: Area[];
  labels?: Label[];
  routes?: Route[];
  arcs?: Arc[];
  markers?: Marker[];
  rings?: { center: LL; km: number; u: number; color?: string }[];
  w?: number;
  h?: number;
  children?: React.ReactNode;
};

// the war-room grade of the satellite picture: little colour, dark, cold, contrasty
const SAT_FILTER = (b: number) => `saturate(0.5) brightness(${b.toFixed(3)}) contrast(1.12)`;

const Tiles: React.FC<{ cam: Cam; k: number; cx: number; cy: number; zt: number; tiles: TileSet; w: number; h: number }> = ({ cam, k, cx, cy, zt, tiles, w, h }) => {
  const pts = [[-80, -80], [w + 80, -80], [-80, h + 80], [w + 80, h + 80], [w / 2, -80]].map(([sx, sy]) => toMap(sx, sy, cam, w, h));
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const out: React.ReactNode[] = [];
  for (let z = Math.max(2, zt - 2); z <= zt; z++) {
    const list = tiles.index[String(z)];
    if (!list) continue;
    const set = new Set(list);
    const ts = WORLD / 2 ** z;
    for (let tx = Math.floor(x0 / ts); tx <= Math.floor(x1 / ts); tx++) {
      for (let ty = Math.floor(y0 / ts); ty <= Math.floor(y1 / ts); ty++) {
        if (!set.has(`${tx},${ty}`)) continue;
        const left = w / 2 + (tx * ts - cx) * k, top = h / 2 + (ty * ts - cy) * k, s = ts * k;
        out.push(<Img key={`${z}/${tx}/${ty}`} src={tiles.url(z, tx, ty)} style={{ position: "absolute", left: left - 0.4, top: top - 0.4, width: s + 0.8, height: s + 0.8, maxWidth: "none" }} />);
      }
    }
  }
  return <>{out}</>;
};

const niceKm = (km: number) => {
  const q = 10 ** Math.floor(Math.log10(km));
  const m = km / q;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * q;
};

let UID = 0;
export const Atlas: React.FC<AtlasProps> = (p) => {
  const { cam, t, geo } = p;
  const w = p.w ?? W, h = p.h ?? H;
  const [id] = React.useState(() => `ad${UID++}`);
  const [cx, cy] = M([cam.lon, cam.lat]);
  const k = 2 ** (cam.zoom - Z0);
  const zmax = p.tiles ? Math.max(...Object.keys(p.tiles.index).map(Number)) : 0;
  const zt = Math.min(zmax, Math.max(2, Math.ceil(cam.zoom - 0.2)));
  const tilt = cam.tilt ?? 0, rot = cam.rot ?? 0;
  const B = built(geo);
  const hs = 10 / k;
  const g = `translate(${w / 2} ${h / 2}) scale(${k}) translate(${-cx} ${-cy})`;
  const ns = { vectorEffect: "non-scaling-stroke" as const };
  const zoomFade = (z0: number, z1: number) => clamp((cam.zoom - z0) / (z1 - z0));
  const roads = (p.roads ?? 1) * zoomFade(6.4, 7.4);
  const towns = (p.towns ?? 1) * zoomFade(6.6, 7.6);
  const grid = p.grid ?? 1;
  const hasTiles = !!p.tiles;
  const plane: React.CSSProperties = { position: "absolute", inset: 0, transform: tilt || rot ? `perspective(${PERSP}px) rotateX(${tilt}deg) rotate(${rot}deg)` : undefined, transformOrigin: "50% 50%", zIndex: 0 };
  // lon/lat grid (1° when close, 5° when far), in screen space so it follows the tilt
  const step = cam.zoom >= 5.6 ? 1 : cam.zoom >= 4 ? 5 : 10;
  const gridLines: string[] = [], gridLabels: { x: number; y: number; s: string }[] = [];
  if (grid > 0) {
    const cs = [toMap(0, 0, cam, w, h), toMap(w, h, cam, w, h), toMap(w, 0, cam, w, h), toMap(0, h, cam, w, h)].map(Minv);
    const lo0 = Math.floor(Math.min(...cs.map((c) => c[0])) / step) * step, lo1 = Math.ceil(Math.max(...cs.map((c) => c[0])) / step) * step;
    const la0 = Math.floor(Math.min(...cs.map((c) => c[1])) / step) * step, la1 = Math.ceil(Math.max(...cs.map((c) => c[1])) / step) * step;
    for (let lo = lo0; lo <= lo1 && lo - lo0 < 180; lo += step) {
      const pts = Array.from({ length: 13 }, (_, i) => toScreen([lo, la0 + ((la1 - la0) * i) / 12], cam, w, h));
      gridLines.push(pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)).join(""));
      let best: [number, number] | null = null;
      for (const q of pts) if (q[1] < h - 24 && q[1] > 0 && (!best || q[1] > best[1])) best = [q[0], q[1]];
      if (best && best[0] > 40 && best[0] < w - 120) gridLabels.push({ x: best[0] + 6, y: h - 20, s: `${Math.abs(lo)}°${lo < 0 ? "W" : "E"}` });
    }
    for (let la = la0; la <= la1 && la - la0 < 120; la += step) {
      const pts = Array.from({ length: 13 }, (_, i) => toScreen([lo0 + ((lo1 - lo0) * i) / 12, la], cam, w, h));
      gridLines.push(pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)).join(""));
      let best: [number, number] | null = null;
      for (const q of pts) if (q[0] < w - 10 && (!best || q[0] > best[0])) best = [q[0], q[1]];
      if (best && best[1] > 60 && best[1] < h - 50) gridLabels.push({ x: w - 70, y: best[1] - 6, s: `${Math.abs(la)}°${la < 0 ? "S" : "N"}` });
    }
  }
  const mpp = (156543.03 * Math.cos((cam.lat * Math.PI) / 180)) / 2 ** cam.zoom; // metres per screen px at the centre
  const barKm = niceKm((220 * mpp) / 1000);
  const barPx = (barKm * 1000) / mpp;
  const focus = p.focus && p.focus.u > 0 ? p.focus : null;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.sea, overflow: "hidden" }}>
      <div style={plane}>
        {hasTiles ? (
          <>
            <div style={{ position: "absolute", inset: 0, filter: SAT_FILTER(p.sat ?? 1) }}>
              <Tiles cam={cam} k={k} cx={cx} cy={cy} zt={zt} tiles={p.tiles!} w={w} h={h} />
            </div>
            <div style={{ position: "absolute", inset: -400, background: "rgb(120,138,160)", mixBlendMode: "multiply", opacity: 0.55 * (p.tint ?? 1) }} />
            <div style={{ position: "absolute", inset: -400, background: "rgba(6,9,14,0.18)" }} />
          </>
        ) : null}
        <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <pattern id={`${id}hatch`} patternUnits="userSpaceOnUse" width={hs} height={hs} patternTransform="rotate(45)">
              <rect width={hs} height={hs} fill={C.zone} fillOpacity={0.22} />
              <rect width={hs * 0.26} height={hs} fill={C.zone} fillOpacity={0.62} />
            </pattern>
            <filter id={`${id}glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={4 / k} />
            </filter>
          </defs>
          <g transform={g}>
            {!hasTiles ? <path d={B.all} fill={C.land} /> : null}
            {!hasTiles && focus ? <path d={isoD(geo, focus.iso)} fill={C.landHi} opacity={focus.u} /> : null}
            {(p.lakes ?? 1) > 0 ? <path d={B.lakes} fill={hasTiles ? "rgba(70,95,125,0.35)" : "#0b1a2a"} stroke={C.river} strokeWidth={1} style={ns} opacity={p.lakes ?? 1} /> : null}
            {roads > 0 ? <path d={B.roads} fill="none" stroke="rgba(238,232,220,0.16)" strokeWidth={1} style={ns} opacity={roads} /> : null}
            {(p.rivers ?? 1) > 0 ? <path d={riversD(geo, p.riverRank ?? 5)} fill="none" stroke={C.river} strokeWidth={1.3} style={ns} opacity={p.rivers ?? 1} /> : null}
            <path d={B.all} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={3.2} style={ns} />
            <path d={B.all} fill="none" stroke="rgba(238,232,220,0.3)" strokeWidth={1} style={ns} />
            {(p.hl ?? []).map((x) => (x.u > 0 ? <path key={x.key} d={a1D(geo, x.key)} fill={x.color ?? C.mark} fillOpacity={0.12 * x.u} stroke={x.color ?? C.mark} strokeOpacity={0.9 * x.u} strokeWidth={1.8} style={ns} /> : null))}
            {(p.areas ?? []).map((a, i) => {
              if (a.u <= 0) return null;
              const d = a.iso ? isoD(geo, a.iso) : a.lake ? namedLakeD(geo, a.lake) : ringsD(a.rings ?? []);
              const col = a.color ?? C.zone;
              return (
                <g key={i}>
                  <path d={d} fill={a.hatch ? `url(#${id}hatch)` : col} fillOpacity={a.hatch ? a.u : (a.fill ?? 0.25) * a.u} fillRule="evenodd" />
                  <path d={d} fill="none" stroke={col} strokeWidth={(a.edge ?? 2) * 3.5} strokeOpacity={0.4 * a.u} style={{ ...ns, filter: `url(#${id}glow)` }} />
                  <path d={d} fill="none" stroke={col} strokeWidth={a.edge ?? 2} strokeOpacity={a.u} strokeLinejoin="round" style={ns} />
                </g>
              );
            })}
            {p.riverHi && p.riverHi.u > 0 ? (
              <g opacity={p.riverHi.u}>
                <path d={namedRiverD(geo, p.riverHi.match)} fill="none" stroke={p.riverHi.color ?? C.mark} strokeWidth={9} strokeOpacity={0.25} strokeLinecap="round" style={ns} />
                <path d={namedRiverD(geo, p.riverHi.match)} fill="none" stroke={p.riverHi.color ?? C.mark} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={ns} />
              </g>
            ) : null}
            {(p.edge ?? []).map((iso) => (
              <g key={iso}>
                <path d={isoD(geo, iso)} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={4.5} style={ns} />
                <path d={isoD(geo, iso)} fill="none" stroke="rgba(238,232,220,0.72)" strokeWidth={1.6} style={ns} />
              </g>
            ))}
            {focus ? <path d={`M-1,-1H${WORLD + 1}V${WORLD + 1}H-1Z` + isoD(geo, focus.iso)} fill="#000" fillRule="evenodd" opacity={0.5 * focus.u} /> : null}
            {(p.routes ?? []).map((r, i) => {
              let L = 0;
              for (let j = 1; j < r.pts.length; j++) {
                const a = M(r.pts[j - 1]), b = M(r.pts[j]);
                L += Math.hypot(b[0] - a[0], b[1] - a[1]);
              }
              const dash = `${L * clamp(r.u)} ${L * 2}`;
              return (
                <g key={i} opacity={r.fade ?? 1}>
                  <path d={lineD(r.pts)} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={(r.width ?? 3) + 4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={ns} />
                  {r.glow ? <path d={lineD(r.pts)} fill="none" stroke={r.color ?? C.mark} strokeWidth={(r.width ?? 3) * 3.4} strokeOpacity={0.22} strokeLinecap="round" strokeDasharray={dash} style={ns} /> : null}
                  <path d={lineD(r.pts)} fill="none" stroke={r.color ?? C.mark} strokeWidth={r.width ?? 3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={ns} />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {/* screen-space layers: grid, towns, rings, arcs, markers, scale */}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 2 }}>
        <defs>
          <filter id={`${id}soft`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={4} />
          </filter>
        </defs>
        {grid > 0 ? (
          <g opacity={grid}>
            {gridLines.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(238,232,220,0.09)" strokeWidth={1} />)}
            {gridLabels.map((l, i) => (
              <text key={i} x={l.x} y={l.y} fill="rgba(238,232,220,0.42)" fontFamily={F.lat} fontWeight={500} fontSize={14} letterSpacing="0.12em">
                {l.s}
              </text>
            ))}
          </g>
        ) : null}
        {towns > 0
          ? (geo.towns ?? []).map((tw, i) => {
              const [x, y, pk] = toScreen(tw.ll, cam, w, h);
              if (x < -10 || x > w + 10 || y < -10 || y > h + 10) return null;
              return <rect key={i} x={x - 2.2 * pk} y={y - 2.2 * pk} width={4.4 * pk} height={4.4 * pk} fill="rgba(238,232,220,0.55)" stroke="rgba(0,0,0,0.7)" strokeWidth={1} opacity={towns} />;
            })
          : null}
        {(p.rings ?? []).map((r, i) => {
          if (r.u <= 0) return null;
          const N = 96, pts: string[] = [];
          const lat0 = (r.center[1] * Math.PI) / 180, lon0 = (r.center[0] * Math.PI) / 180, d = r.km / 6371;
          for (let j = 0; j <= N; j++) {
            const b = (j / N) * 2 * Math.PI;
            const lat = Math.asin(Math.sin(lat0) * Math.cos(d) + Math.cos(lat0) * Math.sin(d) * Math.cos(b));
            const lon = lon0 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat0), Math.cos(d) - Math.sin(lat0) * Math.sin(lat));
            const [x, y] = toScreen([(lon * 180) / Math.PI, (lat * 180) / Math.PI], cam, w, h);
            pts.push((j ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1));
          }
          const dd = pts.join("");
          return (
            <g key={i} opacity={clamp(r.u)}>
              <path d={dd} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={4} />
              <path d={dd} fill="none" stroke={r.color ?? C.mark} strokeWidth={1.8} strokeDasharray="10 8" />
            </g>
          );
        })}
        {(p.arcs ?? []).map((a, i) => {
          const [x0, y0] = toScreen(a.from, cam, w, h), [x1, y1] = toScreen(a.to, cam, w, h);
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
          const bnd = a.bend ?? 0.22;
          const qx = mx - dy * bnd, qy = my + dx * bnd;
          const d = `M${x0},${y0} Q${qx},${qy} ${x1},${y1}`;
          const u = clamp(a.u);
          const px = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * qx + u * u * x1, py = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * qy + u * u * y1;
          const tx = 2 * (1 - u) * (qx - x0) + 2 * u * (x1 - qx), ty = 2 * (1 - u) * (qy - y0) + 2 * u * (y1 - qy);
          const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
          const total = L * 1.15;
          const col = a.color ?? C.mark;
          return u <= 0 ? null : (
            <g key={i}>
              <path d={d} fill="none" stroke="#000" strokeOpacity={0.55} strokeWidth={(a.width ?? 2.8) + 4} strokeDasharray={`${total * u} ${total * 2}`} strokeLinecap="round" />
              <path d={d} fill="none" stroke={col} strokeWidth={(a.width ?? 2.8) * 3.2} strokeOpacity={0.2} strokeDasharray={`${total * u} ${total * 2}`} strokeLinecap="round" />
              <path d={d} fill="none" stroke={col} strokeWidth={a.width ?? 2.8} strokeDasharray={`${total * u} ${total * 2}`} strokeLinecap="round" />
              {a.head !== false ? <path d="M2,0 L-17,-8 L-12,0 L-17,8 Z" fill={col} stroke="#000" strokeWidth={1} transform={`translate(${px} ${py}) rotate(${ang})`} /> : null}
            </g>
          );
        })}
        {(p.markers ?? []).map((m, i) => {
          if (m.u <= 0) return null;
          const [x, y, pk] = toScreen(m.ll, cam, w, h);
          const s = (m.size ?? 10) * pk * (0.6 + 0.4 * ease.outBack(clamp(m.u)));
          const col = m.color ?? C.mark;
          if (m.kind === "diamond") return <rect key={i} x={x - s / 2} y={y - s / 2} width={s} height={s} fill={col} transform={`rotate(45 ${x} ${y})`} opacity={clamp(m.u)} stroke="#000" strokeWidth={1.5} />;
          if (m.kind === "square") return <rect key={i} x={x - s / 2} y={y - s / 2} width={s} height={s} fill={col} opacity={clamp(m.u)} stroke="#000" strokeWidth={1.5} />;
          if (m.kind === "fire") {
            const fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.1) * Math.sin(t * 6.3 + i);
            return (
              <g key={i} opacity={clamp(m.u)}>
                <circle cx={x} cy={y} r={s * 2.4 * fl} fill="#ff6a1f" opacity={0.3} filter={`url(#${id}soft)`} />
                <circle cx={x} cy={y} r={s * 0.6} fill="#ffb347" stroke="#000" strokeWidth={1.2} />
              </g>
            );
          }
          if (m.kind === "pulse") {
            const ph = ((t * 0.8 + hash(i)) % 1 + 1) % 1;
            return (
              <g key={i} opacity={clamp(m.u)}>
                <circle cx={x} cy={y} r={s * (0.8 + 2.6 * ph)} fill="none" stroke={col} strokeWidth={2} opacity={0.8 * (1 - ph)} />
                <circle cx={x} cy={y} r={s / 2} fill={col} stroke="#000" strokeWidth={1.5} />
              </g>
            );
          }
          return <circle key={i} cx={x} cy={y} r={s / 2} fill={col} opacity={clamp(m.u)} stroke="#000" strokeWidth={1.5} />;
        })}
        {(p.scaleBar ?? 1) > 0 ? (
          <g opacity={p.scaleBar ?? 1} transform={`translate(${w - 80 - barPx} ${h - 64})`}>
            <rect x={-12} y={-30} width={barPx + 24} height={44} fill="rgba(5,6,8,0.6)" rx={3} />
            <path d={`M0,0 H${barPx} M0,-6 V6 M${barPx},-6 V6 M${barPx / 2},-4 V4`} stroke="rgba(238,232,220,0.8)" strokeWidth={1.6} fill="none" />
            <text x={barPx / 2} y={-11} fill="rgba(238,232,220,0.85)" fontFamily={F.lat} fontWeight={600} fontSize={14} letterSpacing="0.14em" textAnchor="middle">{`${barKm} KM`}</text>
          </g>
        ) : null}
      </svg>
      {(p.labels ?? []).map((l, i) => {
        if (l.u <= 0) return null;
        const [x, y] = toScreen(l.ll, cam, w, h);
        const tier = l.tier ?? 2;
        const fs = tier === 1 ? 40 : tier === 2 ? 30 : 24;
        const v = ease.out(clamp(l.u));
        return (
          <div key={i} style={{ position: "absolute", zIndex: 3, left: x + (l.dx ?? 0), top: y + (l.dy ?? -fs * 1.3), transform: `translate(-50%, ${(1 - v) * 8}px)`, opacity: v, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pointerEvents: "none" }}>
            <div style={{ fontFamily: tier === 1 ? F.faB : F.faS, fontSize: fs, color: l.color ?? C.bone, direction: "rtl", whiteSpace: "nowrap", padding: "2px 12px 4px", background: "rgba(5,6,8,0.72)", borderRadius: 3, lineHeight: 1.35 }}>{l.text}</div>
            {l.en ? <div style={{ fontFamily: F.lat, fontWeight: 600, fontSize: Math.round(fs * 0.42), letterSpacing: "0.22em", color: "rgba(238,232,220,0.62)", textShadow: "0 1px 4px #000, 0 0 2px #000" }}>{l.en}</div> : null}
          </div>
        );
      })}
      {p.children}
    </div>
  );
};
