// Market File · the news map (Natural Earth 1:50m via world-atlas, public domain; ISC package). Any region:
// a lon/lat box, the countries the story is about lit in the accent, pins that pop on their word (ring + Persian
// name + MONO name), routes that draw themselves with a travelling light, and a broken state for a cut route.
// Country ids are ISO 3166-1 numeric strings ("384" Côte d'Ivoire, "288" Ghana, "364" Iran, "840" USA …).
// Routes are drawn from waypoints you type: label them «مسیرِ تقریبی» on screen.
import React from "react";
import { geoMercator, geoPath, type GeoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import world50 from "./geo/countries-50m.json";
import { C, FA, MONO, accentA, clamp, kick, ramp } from "./theme";

export type LL = [number, number];
type FC = { type: "FeatureCollection"; features: { id?: string; properties?: { name?: string }; geometry: unknown; type: string }[] };
const T50 = world50 as unknown as { objects: { countries: never } };
let C50: FC | null = null;
const countries = () => (C50 ??= feature(T50 as never, T50.objects.countries) as unknown as FC);

// fit to the corner points (a Polygon ring wound the wrong way is read by d3 as the whole globe minus the box)
const bboxPoints = (b: [number, number, number, number]) => ({ type: "MultiPoint", coordinates: [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]] });

type Prep = { proj: GeoProjection; path: GeoPath; land: string; byId: Map<string, string> };
const CACHE = new Map<string, Prep>();
const prep = (bbox: [number, number, number, number], w: number, h: number): Prep => {
  const key = `${bbox.join(",")}|${w}x${h}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const proj = geoMercator().fitExtent([[-40, 0], [w + 40, h]], bboxPoints(bbox) as never);
  const path = geoPath(proj);
  const fs = countries().features;
  const land = fs.map((f) => path(f as never) ?? "").join("");
  const p: Prep = { proj, path, land, byId: new Map() };
  CACHE.set(key, p);
  return p;
};
const countryPath = (p: Prep, id: string) => {
  if (!p.byId.has(id)) p.byId.set(id, p.path(countries().features.find((f) => f.id === id) as never) ?? "");
  return p.byId.get(id)!;
};

/** screen x,y of a lon/lat point in a map of this bbox and size (place chips and labels next to pins with it) */
export const mapXY = (bbox: [number, number, number, number], w: number, h: number, ll: LL) => prep(bbox, w, h).proj(ll) as [number, number];

/** a polyline through screen points, smoothed (Catmull-Rom → cubic Bézier) */
export const smoothPath = (pts: [number, number][]) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

/** one route: hairline glow, the drawn line (k 0→1), a travelling light; broken = a dim dotted cream line */
const Route: React.FC<{ d: string; k: number; t: number; seed: number; broken?: number; w?: number; color?: string }> = ({ d, k, t, seed, broken = 0, w = 5, color = C.accent }) => {
  const ph = ((t * 0.28 + seed * 0.37) % 1 + 1) % 1;
  const cut = clamp(broken) > 0.5;
  const col = cut ? "rgba(242,239,232,.5)" : color;
  return (
    <g>
      <path d={d} pathLength={1} fill="none" stroke={col} strokeOpacity={(cut ? 0.05 : 0.18) * k} strokeWidth={w + 10} strokeLinecap="round" style={{ filter: "blur(6px)" }} />
      <path d={d} pathLength={1} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeDasharray={cut ? "0.022 0.03" : "1 1"} strokeDashoffset={cut ? 0 : 1 - k} opacity={cut ? 0.9 : 1} />
      {k >= 1 && !cut && <path d={d} pathLength={1} fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={w * 0.9} strokeLinecap="round" strokeDasharray="0.05 0.95" strokeDashoffset={-ph} />}
    </g>
  );
};

export type Pin = { ll: LL; at: number; fa: string; mono?: string; dx?: number; dy?: number; muted?: boolean; size?: number };
export type MapLabel = { ll: LL; fa: string; size?: number; o?: number; rot?: number };
export type MapRoute = { pts: LL[]; k: number; broken?: number; w?: number };

/** a ring that pops on the word + a big Persian name and a MONO name; muted = named but not the subject (dashed) */
const PinMark: React.FC<{ p: Pin; xy: [number, number]; t: number }> = ({ p, xy: [x, y], t }) => {
  const k = ramp(t, p.at - 0.05, p.at + 0.35);
  if (k <= 0) return null;
  const pulse = kick(t, p.at, 0.6);
  const r = 26 + 40 * (1 - Math.pow(1 - k, 3)) + 30 * pulse;
  const col = p.muted ? C.cream : C.accent;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={col} strokeWidth={4} strokeDasharray={p.muted ? "10 9" : undefined} opacity={(p.muted ? 0.75 : 0.9) * k} />
      {!p.muted && <circle cx={x} cy={y} r={r * 1.6} fill="none" stroke={col} strokeWidth={2} opacity={0.35 * k * (1 - pulse)} />}
      <circle cx={x} cy={y} r={9} fill={col} opacity={k} />
      <g transform={`translate(${x + (p.dx ?? 0)}, ${y + (p.dy ?? -110)})`} opacity={k}>
        <text x={0} y={0} textAnchor="middle" direction="rtl" fontFamily={FA} fontWeight={900} fontSize={p.size ?? 50} fill={C.cream} style={{ paintOrder: "stroke", stroke: "rgba(6,6,7,.75)", strokeWidth: 10 }}>
          {p.fa}
        </text>
        {p.mono && (
          <text x={0} y={38} textAnchor="middle" fontFamily={MONO} fontSize={20} letterSpacing="0.24em" fill={C.creamDim}>
            {p.mono}
          </text>
        )}
      </g>
    </g>
  );
};

/**
 * The map, w × h at (x, y). land 0→1 fades it in; `lit` lights countries (k 0→1 each); `zoom` scales around
 * `origin` (a lon/lat) for a slow push.
 */
export const NewsMap: React.FC<{
  t: number;
  bbox: [number, number, number, number];
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  land?: number;
  lit?: { id: string; k: number }[];
  labels?: MapLabel[];
  pins?: Pin[];
  routes?: MapRoute[];
  zoom?: number;
  origin?: LL;
}> = ({ t, bbox, w = 1080, h = 900, x = 0, y = 0, land = 1, lit = [], labels = [], pins = [], routes = [], zoom = 1, origin }) => {
  const P = prep(bbox, w, h);
  const xy = (ll: LL) => P.proj(ll) as [number, number];
  const o = origin ? xy(origin) : [w / 2, h / 2];
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: x, top: y, overflow: "visible", opacity: clamp(land) }}>
      <g transform={`translate(${o[0]} ${o[1]}) scale(${zoom}) translate(${-o[0]} ${-o[1]})`}>
        <path d={P.land} fill="rgba(242,239,232,.09)" stroke="rgba(242,239,232,.34)" strokeWidth={1.6} />
        {lit.map(({ id, k }) => (
          <path key={id} d={countryPath(P, id)} fill={accentA(0.06 + 0.22 * clamp(k))} stroke={k > 0.05 ? C.accent : "rgba(242,239,232,.4)"} strokeWidth={1.6 + 2.4 * clamp(k)} />
        ))}
        {labels.map((l, i) => {
          const [lx, ly] = xy(l.ll);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" direction="rtl" fontFamily={FA} fontWeight={800} fontSize={l.size ?? 32} fill={C.cream} opacity={0.5 * (l.o ?? 1)} transform={l.rot ? `rotate(${l.rot} ${lx} ${ly})` : undefined}>
              {l.fa}
            </text>
          );
        })}
        {routes.map((r, i) => (
          <Route key={i} d={smoothPath(r.pts.map(xy))} k={clamp(r.k)} t={t} seed={i} broken={r.broken} w={r.w} />
        ))}
        {pins.map((p, i) => (
          <PinMark key={i} p={p} xy={xy(p.ll)} t={t} />
        ))}
      </g>
    </svg>
  );
};

/** the map lives in a fixed box whose top and bottom fade, so land never runs under the headline or the source line */
export const MapBox: React.FC<{ y: number; h?: number; fadeTop?: number; fadeBot?: number; children: React.ReactNode }> = ({ y, h = 900, fadeTop = 120, fadeBot = 120, children }) => {
  const m = `linear-gradient(180deg, transparent 0px, #000 ${fadeTop}px, #000 ${h - fadeBot}px, transparent ${h}px)`;
  return <div style={{ position: "absolute", left: 0, top: y, width: 1080, height: h, WebkitMaskImage: m, maskImage: m }}>{children}</div>;
};
