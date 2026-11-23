// Sea world palette (our own hues on the measured light arc):
//   day    late-afternoon gold sky over a teal sea, warm low sun, teal-violet shadows
//   storm  petrol-teal night storm, cold low light (lightning lifts it, see story.ts)
//   galley warm lamp-lit interior (copper/amber against green tiles)
//   rays   the ending: gold light breaking through the teal storm
// Same field meanings as ../base/lights.ts (lit/shade/lift = linear multipliers for shade.ts twoTone; sky/sea colours are
// ON-SCREEN targets, world.ts pre-inverts the Neutral tone map with untone()).
import type { LightPreset, WorldLook } from "../base/lights";
import type { GradeParams } from "../base/grade";

export type SLight = "day" | "storm" | "galley" | "rays";
export type SeaLook = {
  near: string; mid: string; far: string; crest: string; trough: string; foam: string; glint: string; sheen: string;
  /** sea state 0 = afternoon swell .. 1 = full storm (wave height, chop, foam) */
  state: number;
};

export const LIGHTS: Record<SLight, LightPreset> = {
  day: {
    az: 70, el: 24,
    lit: [1.62, 1.36, 1.02], shade: [0.2, 0.3, 0.36], lift: [0.03, 0.07, 0.09], lambert: 0.35, sideK: 0.84, term: 0.18,
    charTint: [1.0, 0.93, 0.85], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.92, 0.96],
    blob: [0.55, 0.62, 0.64], actorShadow: false,
    top: "#4f97ad", hor: "#ffd9a0", skyCurve: [0.0, 0.5, 0.6], fog: "#f1d3a3", fogNear: 40, fogFar: 520, sunDisc: "#000000",
    sunCol: "#ffe2b8", sunI: 3.0, sky: "#e8dcc4", ground: "#4d7d80", hemiI: 0.5,
    bias: -0.0003, normalBias: 0.02,
  },
  storm: {
    az: 40, el: 32,
    lit: [0.72, 0.84, 0.86], shade: [0.11, 0.19, 0.22], lift: [0.02, 0.05, 0.06], lambert: 0.4, sideK: 0.8, term: 0.22,
    charTint: [0.8, 0.92, 0.95], charShade: 0.8, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.78, 0.88, 0.92],
    blob: [0.4, 0.5, 0.52], actorShadow: false,
    top: "#0e1d22", hor: "#2c4f55", skyCurve: [0.0, 0.5, 0.6], fog: "#2d4b51", fogNear: 12, fogFar: 230, sunDisc: "#000000",
    sunCol: "#cfe9ee", sunI: 1.2, sky: "#5f8086", ground: "#17363a", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.025,
  },
  galley: {
    az: -60, el: 40,
    lit: [1.75, 1.22, 0.72], shade: [0.34, 0.22, 0.2], lift: [0.06, 0.04, 0.03], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.86, 0.7], charShade: 0.86, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.95, 0.86, 0.8],
    blob: [0.55, 0.42, 0.36], actorShadow: true,
    top: "#3a2a20", hor: "#5a4030", skyCurve: [0.0, 0.5, 0.6], fog: "#3a2a20", fogNear: 60, fogFar: 400, sunDisc: "#000000",
    sunCol: "#ffc27a", sunI: 2.2, sky: "#c89a70", ground: "#4a3022", hemiI: 0.5,
    bias: -0.0004, normalBias: 0.02,
  },
  rays: {
    az: 0, el: 30,
    lit: [1.35, 1.12, 0.78], shade: [0.13, 0.22, 0.25], lift: [0.02, 0.05, 0.06], lambert: 0.4, sideK: 0.82, term: 0.2,
    charTint: [0.95, 0.9, 0.82], charShade: 0.82, charGrad: 0.1, bodyGrad: 0.24, sideTint: [0.82, 0.9, 0.92],
    blob: [0.42, 0.52, 0.54], actorShadow: false,
    top: "#13272c", hor: "#c9a86a", skyCurve: [0.0, 0.5, 0.6], fog: "#3d5a5a", fogNear: 14, fogFar: 260, sunDisc: "#000000",
    sunCol: "#ffd796", sunI: 2.0, sky: "#7a9488", ground: "#17363a", hemiI: 0.42,
    bias: -0.0004, normalBias: 0.025,
  },
};

export const LOOK: Record<SLight, WorldLook & { sea: SeaLook }> = {
  day: {
    sky: { c: ["#ffd9a0", "#f6c793", "#dcc3a6", "#8fbcc4", "#4f97ad"], e: [0, 4, 10, 24, 50] },
    water: { near: "#1f8e8a", mid: "#17707a", far: "#3d7f8c", crest: "#8fdccd", trough: "#0f4f5a", glint: "#fff2d2", shade: [0.5, 0.6, 0.66] },
    cloud: { lit: "#fff1d8", mid: "#f3d2b0", shade: "#b8b2c4" },
    bounce: [0.02, 0.015, 0], sat: 1.06,
    sea: { near: "#1f8e8a", mid: "#16707a", far: "#6f9aa0", crest: "#96e0cf", trough: "#0e4c58", foam: "#f4f1e6", glint: "#fff3d6", sheen: "#f2c45c", state: 0.12 },
  },
  storm: {
    sky: { c: ["#36585c", "#2c4b51", "#22393f", "#172a30", "#0d1b20"], e: [0, 4, 12, 26, 55] },
    water: { near: "#1c4c4e", mid: "#12383c", far: "#2a4a50", crest: "#b9d6cf", trough: "#08201f", glint: "#d5ecf2", shade: [0.4, 0.5, 0.55] },
    cloud: { lit: "#4e6e72", mid: "#36545a", shade: "#1f353b" },
    bounce: [0, 0, 0], sat: 1.0,
    sea: { near: "#1b4e50", mid: "#123a3e", far: "#2b4c52", crest: "#a9cbc4", trough: "#071d1e", foam: "#dfeeea", glint: "#d8f0f4", sheen: "#e8c060", state: 1.0 },
  },
  galley: {
    sky: { c: ["#5a4030", "#4a3326", "#3a2a20", "#2c2018", "#201810"], e: [0, 4, 12, 26, 55] },
    water: { near: "#1c4c4e", mid: "#12383c", far: "#2a4a50", crest: "#b9d6cf", trough: "#08201f", glint: "#d5ecf2", shade: [0.4, 0.5, 0.55] },
    cloud: { lit: "#4e6e72", mid: "#36545a", shade: "#1f353b" },
    bounce: [0.04, 0.02, 0.0], sat: 1.04,
    sea: { near: "#1b4e50", mid: "#123a3e", far: "#2b4c52", crest: "#a9cbc4", trough: "#071d1e", foam: "#dfeeea", glint: "#d8f0f4", sheen: "#e8c060", state: 1.0 },
  },
  rays: {
    sky: { c: ["#d9b874", "#9e9a7a", "#4f6a66", "#22393f", "#10222a"], e: [0, 5, 14, 28, 55] },
    water: { near: "#1f5453", mid: "#143f42", far: "#6a7a66", crest: "#c2dccf", trough: "#08201f", glint: "#ffe9b8", shade: [0.42, 0.52, 0.56] },
    cloud: { lit: "#8a8a6e", mid: "#4f6464", shade: "#22383d" },
    bounce: [0.02, 0.01, 0], sat: 1.04,
    sea: { near: "#1e5654", mid: "#143f42", far: "#7a8a72", crest: "#c8e0d2", trough: "#08201f", foam: "#eef2e4", glint: "#ffe6b0", sheen: "#f0c862", state: 0.85 },
  },
};

/** grades per light: gentle S-curves (the base GRADE_DAY2 family) with our own tints */
export const GRADES: Record<SLight, GradeParams> = {
  day: { ky: [0, 0.095, 0.27, 0.59, 0.83, 0.945, 1], sat: [1.0, 1.06, 1.02], tintS: [0.012, -0.006], tintM: [0, 0.004], tintH: [-0.01, 0.006], vig: [0.14, 0.45] },
  storm: { ky: [0, 0.085, 0.25, 0.55, 0.8, 0.93, 1], sat: [0.95, 1.0, 1.0], tintS: [0.014, -0.012], tintM: [0.006, -0.008], tintH: [0, 0], vig: [0.22, 0.4] },
  galley: { ky: [0, 0.09, 0.26, 0.57, 0.82, 0.94, 1], sat: [1.0, 1.08, 1.04], tintS: [0.006, 0.01], tintM: [-0.006, 0.006], tintH: [-0.012, 0.008], vig: [0.2, 0.42] },
  rays: { ky: [0, 0.085, 0.25, 0.56, 0.82, 0.94, 1], sat: [0.96, 1.04, 1.06], tintS: [0.012, -0.01], tintM: [0, 0], tintH: [-0.014, 0.008], vig: [0.2, 0.42] },
};

// ---------------- blends (time-of-day changes inside a shot: the storm creeping in, the rays breaking through) ----
const L3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const LN = (a: number, b: number, k: number) => a + (b - a) * k;
export const hexMix = (a: string, b: string, k: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
export const mixLight = (a: LightPreset, b: LightPreset, k: number): LightPreset => k <= 0 ? a : k >= 1 ? b : ({
  az: LN(a.az, b.az, k), el: LN(a.el, b.el, k),
  lit: L3(a.lit, b.lit, k), shade: L3(a.shade, b.shade, k), lift: L3(a.lift, b.lift, k), lambert: LN(a.lambert, b.lambert, k), sideK: LN(a.sideK, b.sideK, k), term: LN(a.term, b.term, k),
  charTint: L3(a.charTint, b.charTint, k), charShade: LN(a.charShade, b.charShade, k), charGrad: LN(a.charGrad, b.charGrad, k), bodyGrad: LN(a.bodyGrad, b.bodyGrad, k), sideTint: L3(a.sideTint, b.sideTint, k),
  blob: L3(a.blob, b.blob, k), actorShadow: k < 0.5 ? a.actorShadow : b.actorShadow,
  top: hexMix(a.top, b.top, k), hor: hexMix(a.hor, b.hor, k), skyCurve: L3(a.skyCurve, b.skyCurve, k), fog: hexMix(a.fog, b.fog, k), fogNear: LN(a.fogNear, b.fogNear, k), fogFar: LN(a.fogFar, b.fogFar, k), sunDisc: a.sunDisc,
  sunCol: hexMix(a.sunCol, b.sunCol, k), sunI: LN(a.sunI, b.sunI, k), sky: hexMix(a.sky, b.sky, k), ground: hexMix(a.ground, b.ground, k), hemiI: LN(a.hemiI, b.hemiI, k),
  bias: LN(a.bias, b.bias, k), normalBias: LN(a.normalBias, b.normalBias, k),
});
type LookT = WorldLook & { sea: SeaLook };
export const mixLook = (a: LookT, b: LookT, k: number): LookT => k <= 0 ? a : k >= 1 ? b : ({
  sky: { c: a.sky.c.map((c, i) => hexMix(c, b.sky.c[i], k)), e: a.sky.e.map((e, i) => LN(e, b.sky.e[i], k)) },
  water: a.water, cloud: a.cloud,
  bounce: L3(a.bounce, b.bounce, k), sat: LN(a.sat, b.sat, k),
  sea: { near: hexMix(a.sea.near, b.sea.near, k), mid: hexMix(a.sea.mid, b.sea.mid, k), far: hexMix(a.sea.far, b.sea.far, k), crest: hexMix(a.sea.crest, b.sea.crest, k),
    trough: hexMix(a.sea.trough, b.sea.trough, k), foam: hexMix(a.sea.foam, b.sea.foam, k), glint: hexMix(a.sea.glint, b.sea.glint, k), sheen: hexMix(a.sea.sheen, b.sea.sheen, k),
    state: LN(a.sea.state, b.sea.state, k) },
});
export const mixGrade = (a: GradeParams, b: GradeParams, k: number): GradeParams => k <= 0 ? a : k >= 1 ? b : ({
  ky: a.ky.map((v, i) => LN(v, b.ky[i], k)), sat: L3(a.sat, b.sat, k),
  tintS: [LN(a.tintS[0], b.tintS[0], k), LN(a.tintS[1], b.tintS[1], k)], tintM: [LN(a.tintM[0], b.tintM[0], k), LN(a.tintM[1], b.tintM[1], k)],
  tintH: [LN(a.tintH[0], b.tintH[0], k), LN(a.tintH[1], b.tintH[1], k)], vig: [LN(a.vig[0], b.vig[0], k), LN(a.vig[1], b.vig[1], k)],
});
