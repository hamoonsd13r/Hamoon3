// Atlas Doc · demo film «نیل؛ رودی که یک کشور را ساخت» (16:9, ~60 s excerpt of a long-form map documentary, silent:
// estimated narration timing). Five sections: the map from space → two footage scenes → the dam on the map → footage →
// the map today; two chapter cards in pauses; the end card. Map sections take satellite tiles when you pass
// props.tiles (a folder made by pipeline/tiles-get.mjs); without them the map is a clean dark vector map.
import React from "react";
import { Atlas, camAt, useTiles, type CamKey, type GeoData, type LL, type TileSet } from "../lib/atlas";
import { BigStat, Caption, Headline, Key, SourceTag } from "../lib/doc";
import { makeFilm, type FilmProps } from "../lib/film";
import { Clip, type Media } from "../lib/footage";
import { C, ease, ramp } from "../lib/theme";
import GEO_JSON from "./geo.json";
import { CARDS, END, SC, TL } from "./script";

const GEO = GEO_JSON as unknown as GeoData;
const { S } = TL;

/** your clips (public/…): name → { src, dur }; empty = labelled slots */
export const MEDIA: Media = {};

// the Nile from its source to the sea (approximate waypoints; the real river line comes from geo.json)
const NILE: LL[] = [[33.2, 0.45], [32.9, 1.6], [32.07, 3.6], [31.6, 4.85], [31.65, 9.53], [32.53, 15.6], [33.98, 17.7], [33.32, 19.53], [30.48, 19.17], [31.35, 21.8], [32.9, 24.09], [32.64, 25.69], [31.18, 27.18], [31.24, 30.04], [30.43, 31.46]];
const CAIRO: LL = [31.24, 30.04];
const DAM: LL = [32.877, 23.97];
const VICTORIA: LL = [33.2, -1.2];

const TilesCtx = React.createContext<TileSet | undefined>(undefined);
const credit = (tiles?: TileSet) => (tiles ? "MAP DATA: NATURAL EARTH · SATELLITE: SENTINEL-2 CLOUDLESS 2016 BY EOX (CC BY 4.0)" : "MAP DATA: NATURAL EARTH");

// ─── 1 · from space: the Sahara, the green line, Egypt, the whole river ────────────────────────────────────
const CAM_A: CamKey[] = [
  { t: 0, lon: 23, lat: 17, zoom: 5.05 },
  { t: SC.nile - 0.3, lon: 27, lat: 20, zoom: 5.55 },
  { t: SC.egypt + 0.9, lon: 30.6, lat: 26.6, zoom: 6.95, tilt: 22 },
  { t: SC.heart + 0.4, lon: 31.4, lat: 15.5, zoom: 5.55, tilt: 0 },
  { t: CARDS[0].b, lon: 31.4, lat: 15.5, zoom: 5.7 },
];
const MapA: React.FC<{ t: number }> = ({ t }) => {
  const tiles = React.useContext(TilesCtx);
  const cam = camAt(t, CAM_A);
  const egypt = ramp(t, SC.egypt - 0.2, SC.egypt + 0.4) * (1 - ramp(t, SC.heart - 0.3, SC.heart + 0.3));
  return (
    <>
      <Atlas
        t={t}
        cam={cam}
        geo={GEO}
        tiles={tiles}
        riverRank={4}
        grid={0.8}
        scaleBar={1}
        focus={{ iso: "EGY", u: egypt }}
        edge={egypt > 0.05 ? ["EGY"] : []}
        riverHi={{ match: "nile", u: ramp(t, SC.line - 0.1, SC.line + 0.5) }}
        routes={[{ pts: NILE, u: ease.inOut(ramp(t, SC.heart, SC.sea + 0.4)), glow: true, width: 4, fade: 1 - ramp(t, CARDS[0].a, CARDS[0].a + 0.4) }]}
        markers={[
          { ll: CAIRO, u: ramp(t, SC.egypt, SC.egypt + 0.4) * (1 - ramp(t, SC.heart - 0.3, SC.heart)), kind: "pulse", size: 12 },
          { ll: VICTORIA, u: ramp(t, SC.heart, SC.heart + 0.4), kind: "diamond", size: 14 },
          { ll: [30.43, 31.46], u: ramp(t, SC.sea - 0.2, SC.sea + 0.3), kind: "diamond", size: 14 },
        ]}
        labels={[
          { ll: [12, 23], text: "صحرای بزرگ آفریقا", en: "THE SAHARA", tier: 1, u: ramp(t, SC.sahara - 0.1, SC.sahara + 0.5) * (1 - ramp(t, SC.egypt - 0.4, SC.egypt)) },
          { ll: [33.8, 20.4], text: "رود نیل", en: "THE NILE", tier: 2, color: C.mark, u: ramp(t, SC.line, SC.line + 0.5) * (1 - ramp(t, SC.egypt - 0.4, SC.egypt)) },
          { ll: [28.8, 26.6], text: "مصر", en: "EGYPT", tier: 1, u: egypt },
          { ll: CAIRO, text: "قاهره", en: "CAIRO", tier: 3, dy: -54, u: ramp(t, SC.egypt + 0.2, SC.egypt + 0.6) * (1 - ramp(t, SC.heart - 0.3, SC.heart)) },
          { ll: VICTORIA, text: "سرچشمه: دریاچه‌ی ویکتوریا", en: "LAKE VICTORIA", tier: 3, dy: 34, u: ramp(t, SC.heart + 0.1, SC.heart + 0.5) },
          { ll: [27, 34.2], text: "دریای مدیترانه", en: "MEDITERRANEAN", tier: 3, u: ramp(t, SC.sea - 0.1, SC.sea + 0.4) },
        ]}
      />
      <BigStat t={t} a={SC.km - 0.2} b={CARDS[0].a + 0.3} value={6650} suffix="کیلومتر" label="طولِ نیل، از سرچشمه تا دریا" source="NILE · ≈ 6,650 KM" x={140} y={330} align="left" size={150} />
      <SourceTag t={t} a={0} b={CARDS[0].a} text={credit(tiles)} />
    </>
  );
};

// ─── 2 · the flood that gave life: footage, a headline with its key word, a place caption ─────────────────
const Flood: React.FC<{ t: number }> = ({ t }) => (
  <>
    {t < SC.farm ? (
      <Clip t={t} a={SC.flood} b={SC.farm} name="nile-fields" hint="کشتزارهای سبز کنار نیل، از بالا" media={MEDIA} z0={1.0} z1={1.09} fx={0.5} fy={0.55} />
    ) : (
      <Clip t={t} a={SC.farm} b={S(5)} name="farmers" hint="کشاورز و جوی آب، مزرعه‌ی کنار رود" media={MEDIA} z0={1.03} z1={1.1} />
    )}
    <Headline t={t} a={SC.flood + 0.3} b={SC.farm - 0.1} text={<>هر تابستون، <Key t={t} at={SC.floodW}>سیلاب</Key></>} size={78} style={{ right: 110, top: 120 }} />
    <Caption t={t} a={SC.flood + 0.6} b={SC.farm - 0.2} text="درّه‌ی نیل · مصر" sub="NILE VALLEY · EGYPT" />
    <Headline t={t} a={SC.farm + 0.1} b={CARDS[1].a + 0.2} text={<>کشاورزیِ <Key t={t} at={SC.ancient}>مصرِ باستان</Key></>} size={78} style={{ right: 110, top: 120 }} />
  </>
);

// ─── 3 · the dam: a close, tilted look at Aswan; the year; the lake behind it lights up ───────────────────
const CAM_B: CamKey[] = [
  { t: S(5), lon: 33.1, lat: 24.4, zoom: 9.1, tilt: 28 },
  { t: SC.aswan + 0.8, lon: 32.9, lat: 23.95, zoom: 9.75, tilt: 36 },
  { t: SC.lake + 0.4, lon: 32.6, lat: 23.25, zoom: 8.55, tilt: 18, arc: 0.3 },
  { t: S(7), lon: 32.5, lat: 23.0, zoom: 8.45, tilt: 14 },
];
const MapB: React.FC<{ t: number }> = ({ t }) => {
  const tiles = React.useContext(TilesCtx);
  const cam = camAt(t, CAM_B);
  const lake = ramp(t, SC.nasser - 0.6, SC.nasser + 0.2);
  return (
    <>
      <Atlas
        t={t}
        cam={cam}
        geo={GEO}
        tiles={tiles}
        riverRank={6}
        grid={0.6}
        areas={[{ lake: "nasser", u: lake, color: C.mark, fill: 0.32, edge: 2.4 }]}
        markers={[{ ll: DAM, u: ramp(t, SC.aswan - 0.1, SC.aswan + 0.3), kind: "diamond", size: 16, color: C.zone }]}
        rings={[{ center: DAM, km: 12, u: ramp(t, SC.aswan, SC.aswan + 0.5) * (1 - ramp(t, SC.lake, SC.lake + 0.4)), color: C.zone }]}
        labels={[
          { ll: DAM, text: "سدِ بلندِ اسوان", en: "ASWAN HIGH DAM", tier: 1, dy: -96, u: ramp(t, SC.aswan, SC.aswan + 0.45) },
          { ll: [32.25, 22.7], text: "دریاچه‌ی ناصر", en: "LAKE NASSER", tier: 1, color: C.mark, u: lake },
        ]}
      />
      <BigStat t={t} a={SC.year - 0.1} b={SC.lake - 0.1} value={1970} plain="۱۹۷۰" label="سد تموم شد" source="ASWAN HIGH DAM · 1970" x={140} y={330} align="left" size={170} />
      <BigStat t={t} a={SC.nasser - 0.2} b={S(7) - 0.05} value={550} suffix="کیلومتر" label="طولِ دریاچه‌ی پشتِ سد" source="LAKE NASSER · ≈ 550 KM LONG" x={140} y={330} align="left" size={150} />
      <SourceTag t={t} a={S(5)} b={S(7)} text={credit(tiles)} />
    </>
  );
};

// ─── 4 · tamed floods, trapped silt: footage and a two-step headline ──────────────────────────────────────
const Silt: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Clip t={t} a={S(7)} b={S(8)} name="dam-water" hint="آبِ آرامِ پشتِ سد، یا دیواره‌ی سد" media={MEDIA} z0={1.0} z1={1.07} />
    <Headline t={t} a={S(7) + 0.2} b={S(8) - 0.05} text="سیلاب‌ها مهار شدن،" size={72} style={{ right: 110, top: 120 }} />
    <Headline t={t} a={SC.but} b={S(8) - 0.05} text={<>ولی <Key t={t} at={SC.silt}>گل‌ولای</Key> هم پشتِ سد موند.</>} size={72} style={{ right: 110, top: 230 }} />
  </>
);

// ─── 5 · today: the valley lit, the number ────────────────────────────────────────────────────────────────
const CAM_C: CamKey[] = [
  { t: S(8), lon: 31.6, lat: 27.3, zoom: 6.6, tilt: 20 },
  { t: END.a + 2, lon: 31.2, lat: 28.6, zoom: 7.0, tilt: 26 },
];
const MapC: React.FC<{ t: number }> = ({ t }) => {
  const tiles = React.useContext(TilesCtx);
  return (
    <>
      <Atlas t={t} cam={camAt(t, CAM_C)} geo={GEO} tiles={tiles} riverRank={5} grid={0.5} focus={{ iso: "EGY", u: 1 }} edge={["EGY"]} riverHi={{ match: "nile", u: 1 }} labels={[{ ll: CAIRO, text: "قاهره", en: "CAIRO", tier: 2, dy: -60, u: ramp(t, S(8) + 0.4, S(8) + 0.9) }]} markers={[{ ll: CAIRO, u: 1, kind: "pulse", size: 12 }]} />
      <BigStat t={t} a={SC.hundred - 0.1} b={END.a + 0.2} value={100} from={64} prefix="بیش از" suffix="میلیون نفر" label="به آبِ همین رود وابسته‌اند" source="EGYPT · POPULATION 2024" x={140} y={330} align="left" size={150} />
      <SourceTag t={t} a={S(8)} b={END.a} text={credit(tiles)} />
    </>
  );
};

const Film = makeFilm({
  sections: [
    { from: 0, to: S(3), C: MapA },
    { from: S(3), to: S(5), C: Flood },
    { from: S(5), to: S(7), C: MapB },
    { from: S(7), to: S(8), C: Silt },
    { from: S(8), to: 1e9, C: MapC },
  ],
  cards: CARDS,
  end: END,
  brand: { name: "YOUR BRAND", sub: "DOCUMENTARY" },
});

export type DemoProps = FilmProps & { tiles?: string };
/** props.tiles: a tile folder in public/ (pipeline/tiles-get.mjs) for the satellite look */
export const AtlasDocDemo: React.FC<DemoProps> = ({ times, tiles }) => {
  const set = useTiles(tiles);
  return (
    <TilesCtx.Provider value={set}>
      <Film times={times} />
    </TilesCtx.Provider>
  );
};
