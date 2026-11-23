// Sea world textures (canvas, cached by key): hull bands by height (ship.ts remaps the height so the waterline stays
// level while the stripe follows the sheer), sails (ours: ochre/cream stripes; pirates: crimson with a toothy
// dog-skull), the pirates' flag, barrel staves, the castle bulkhead with its door, hatch grate, life ring, soup,
// the oil can label.
import { ctex, rng } from "../base/paint";
import { Pen, INK } from "../base/toon";

export type ShipKind = "ours" | "pirate";
/** the hull texture spans these (remapped) heights in ship space: midships deck 2.0, rail 3.0 */
export const HULL_Y0 = -2.4, HULL_Y1 = 3.2;
export const DECK_REF = 2.0, RAIL_REF = 3.0;
export type ShipCol = { hull: string; stripe: string; pin: string; bottom: string; wl: string; cap: string; inner: string; sail: string; sail2: string; mast: string; rope: string; brass: string };
export const SHIP_COL: Record<ShipKind, ShipCol> = {
  ours: { hull: "#2f7a6c", stripe: "#efe0bd", pin: "#1f3e3a", bottom: "#8a4632", wl: "#1d2426", cap: "#6e4a30", inner: "#b98a5c",
    sail: "#d79c3e", sail2: "#f1e3c3", mast: "#8a5a38", rope: "#4a3626", brass: "#d9a441" },
  pirate: { hull: "#26221f", stripe: "#8e2531", pin: "#c9a24a", bottom: "#4a2a22", wl: "#111111", cap: "#4a3222", inner: "#7a5638",
    sail: "#8a2330", sail2: "#7a1d29", mast: "#5e3f2a", rope: "#3a2a20", brass: "#c9a24a" },
};

/** hull planking, bands by (remapped) height: bottom paint | waterline | hull | stripe | pin line | hull (bulwark) | cap line */
export const hullTex = (kind: ShipKind) => ctex(`hull3_${kind}`, 1024, 2048, (g, r) => {
  const C = SHIP_COL[kind], H = 2048, toV = (y: number) => H - ((y - HULL_Y0) / (HULL_Y1 - HULL_Y0)) * H;
  const band = (y0: number, y1: number, col: string) => { g.fillStyle = col; g.fillRect(0, toV(y1), 1024, toV(y0) - toV(y1)); };
  const D = DECK_REF;
  band(HULL_Y0, 0.04, C.bottom);
  band(0.04, 0.22, C.wl);
  band(0.22, HULL_Y1, C.hull);
  band(D - 0.62, D - 0.14, C.stripe);
  band(D - 0.14, D - 0.07, C.pin);
  if (kind === "pirate") { band(D - 0.7, D - 0.62, C.pin); band(D + 0.84, D + 0.9, C.pin); }
  else { band(D - 0.69, D - 0.62, C.pin); band(D + 0.84, D + 0.9, C.stripe); }
  // pirate gun ports on the stripe: dark squares with gold frames
  if (kind === "pirate") for (let x = 60; x < 1024; x += 150) {
    const y0 = toV(D - 0.2), y1 = toV(D - 0.56);
    g.fillStyle = "#120d0c"; g.fillRect(x, y1, 64, y0 - y1);
    g.strokeStyle = C.pin; g.lineWidth = 6; g.strokeRect(x, y1, 64, y0 - y1);
  }
  // plank seams every 0.24 m + butt joints, a little tone noise per plank
  const pitch = (0.24 / (HULL_Y1 - HULL_Y0)) * H;
  g.globalAlpha = 0.16; g.fillStyle = "#000";
  for (let v = toV(0.22); v > 0; v -= pitch) {
    g.fillRect(0, v, 1024, 2);
    for (let x = r() * 300; x < 1024; x += 260 + r() * 240) g.fillRect(x, v - pitch, 2, pitch);
  }
  g.globalAlpha = 0.06;
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 1024, r() * H, 40 + r() * 160, 3 + r() * 6); }
  g.globalAlpha = 1;
});

/** inner bulwark + deck furniture wood */
export const innerTex = (kind: ShipKind) => ctex(`inner3_${kind}`, 512, 512, (g, r) => {
  const C = SHIP_COL[kind];
  g.fillStyle = C.inner; g.fillRect(0, 0, 512, 512);
  g.globalAlpha = 0.2; g.fillStyle = "#000";
  for (let y = 0; y < 512; y += 64) g.fillRect(0, y, 512, 3);
  g.globalAlpha = 0.07;
  for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 512, r() * 512, 30 + r() * 90, 2 + r() * 4); }
  g.globalAlpha = 1;
});

/** square sail canvas (u across, v down from the yard): stripes / emblem, seams, a darker reef band */
export const sailTex = (kind: ShipKind, emblem = false) => ctex(`sail3_${kind}_${emblem}`, 1024, 1024, (g, r) => {
  const C = SHIP_COL[kind];
  g.fillStyle = C.sail; g.fillRect(0, 0, 1024, 1024);
  if (kind === "ours") { g.fillStyle = C.sail2; for (let i = 1; i < 7; i += 2) g.fillRect((i * 1024) / 7, 0, 1024 / 7, 1024); }
  g.globalAlpha = 0.14; g.fillStyle = "#3a2410";
  for (let x = 0; x < 1024; x += 64) g.fillRect(x, 0, 3, 1024);
  g.globalAlpha = 0.08;
  for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 1024, r() * 1024, 4 + r() * 10, 60 + r() * 220); }
  g.globalAlpha = 1;
  g.strokeStyle = "rgba(40,24,12,0.55)"; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 1010);
  g.fillStyle = "rgba(40,24,12,0.16)"; g.fillRect(0, 150, 1024, 16);
  for (let x = 40; x < 1024; x += 64) { g.fillStyle = "rgba(40,24,12,0.5)"; g.fillRect(x, 140, 4, 36); }
  if (emblem) skull(new Pen(g), 512, 590, 1.05);
});

/** plain cloth for the jib (cream for ours, crimson for the pirates) */
export const jibTex = (kind: ShipKind) => ctex(`jib3_${kind}`, 512, 512, (g, r) => {
  const C = SHIP_COL[kind];
  g.fillStyle = kind === "ours" ? C.sail2 : C.sail; g.fillRect(0, 0, 512, 512);
  g.globalAlpha = 0.12; g.fillStyle = "#3a2410";
  for (let x = 0; x < 512; x += 48) g.fillRect(x, 0, 3, 512);
  g.globalAlpha = 0.06;
  for (let i = 0; i < 50; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 512, r() * 512, 4 + r() * 8, 40 + r() * 120); }
  g.globalAlpha = 1;
});

/** the pirates' emblem: a grinning dog skull over crossed bones (our own design) */
const skull = (p: Pen, cx: number, cy: number, s: number) => {
  const W = "#efe8d6", D = "#2a1a1a";
  const bone = (a: number) => {
    const c = Math.cos(a), sn = Math.sin(a), L = 330 * s, by = cy + 120 * s;
    p.band([[cx - c * L, by - sn * L], [cx + c * L, by + sn * L]], W, 46 * s, 8 * s, "round");
    for (const k of [-1, 1]) for (const e of [-1, 1])
      p.ell(cx + k * c * L - e * sn * 24 * s, by + k * sn * L + e * c * 24 * s, 32 * s, 32 * s, W, 8 * s);
  };
  bone(0.55); bone(-0.55);
  // skull: wide cranium, two pointed ears, a long snout with a toothy grin
  p.poly([[cx - 180 * s, cy - 160 * s], [cx - 250 * s, cy - 340 * s], [cx - 100 * s, cy - 245 * s]], W, 9 * s);
  p.poly([[cx + 180 * s, cy - 160 * s], [cx + 250 * s, cy - 340 * s], [cx + 100 * s, cy - 245 * s]], W, 9 * s);
  p.ell(cx, cy - 110 * s, 220 * s, 170 * s, W, 10 * s);
  p.ell(cx, cy + 40 * s, 150 * s, 110 * s, W, 10 * s);
  for (const k of [-1, 1]) {
    p.ell(cx + k * 85 * s, cy - 120 * s, 62 * s, 52 * s, D, 0);
    p.ell(cx + k * 85 * s, cy - 120 * s, 18 * s, 18 * s, "#e0b23a", 0);
  }
  p.poly([[cx - 26 * s, cy - 40 * s], [cx + 26 * s, cy - 40 * s], [cx, cy - 6 * s]], D, 0);
  p.poly([[cx - 120 * s, cy + 40 * s], [cx + 120 * s, cy + 40 * s], [cx + 70 * s, cy + 110 * s], [cx - 70 * s, cy + 110 * s]], D, 6 * s);
  for (let i = 0; i < 7; i++) {
    const x = cx - 105 * s + i * 35 * s;
    p.poly([[x, cy + 42 * s], [x + 30 * s, cy + 42 * s], [x + 15 * s, cy + 80 * s]], W, 2 * s);
  }
};

/** the pirates' black flag with the same emblem, small */
export const flagTex = (kind: ShipKind) => ctex(`flag3_${kind}`, 512, 320, (g) => {
  if (kind === "pirate") {
    g.fillStyle = "#151313"; g.fillRect(0, 0, 512, 320);
    skull(new Pen(g), 256, 175, 0.42);
  } else {
    // ours: a long cream pennant with a teal band
    g.fillStyle = "#f1e3c3"; g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#2f7a6c"; g.fillRect(0, 120, 512, 80);
  }
});

/** barrel staves + two iron hoops (u around, v up) */
export const barrelTex = () => ctex("barrel3", 512, 256, (g, r) => {
  for (let i = 0; i < 16; i++) { g.fillStyle = ["#a8724a", "#9a6844", "#b07a50"][i % 3]; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(i * 32, 0, 2, 256); }
  for (const y of [40, 200]) { g.fillStyle = "#3d414c"; g.fillRect(0, y, 512, 22); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(0, y + 3, 512, 4); }
  g.globalAlpha = 0.06;
  for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 512, r() * 256, 2 + r() * 4, 20 + r() * 60); }
  g.globalAlpha = 1;
});

/** the castle bulkhead (front of the raised stern deck): planks, a door with brass knob, two small windows */
export const bulkheadTex = (kind: ShipKind) => ctex(`bulk3_${kind}`, 1024, 256, (g, r) => {
  const C = SHIP_COL[kind];
  g.fillStyle = C.inner; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "rgba(0,0,0,0.2)";
  for (let x = 0; x < 1024; x += 56) g.fillRect(x, 0, 3, 256);
  // door in the middle
  g.fillStyle = C.cap; g.fillRect(452, 40, 120, 216);
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(452, 40, 120, 216);
  g.fillStyle = C.brass; g.beginPath(); g.arc(548, 150, 9, 0, Math.PI * 2); g.fill();
  for (const x of [250, 720]) {
    g.fillStyle = "#24353a"; g.fillRect(x, 70, 70, 60);
    g.strokeStyle = C.brass; g.lineWidth = 8; g.strokeRect(x, 70, 70, 60);
  }
  g.globalAlpha = 0.06;
  for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(r() * 1024, r() * 256, 30 + r() * 80, 2 + r() * 3); }
  g.globalAlpha = 1;
});

/** hatch grate (top of the cargo hatch) */
export const grateTex = () => ctex("grate3", 256, 256, (g) => {
  g.fillStyle = "#6e4a30"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#1c1410";
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.fillRect(8 + i * 31, 8 + j * 31, 20, 20);
});

/** life ring: 8 alternating segments around (u = angle) */
export const ringTex = () => ctex("lifering3", 512, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f2ece0" : "#c8463a"; g.fillRect((i * 512) / 8, 0, 512 / 8, 64); }
});

/** soup surface (tomato-red with bits) for the deck pot */
export const soupTex = () => ctex("soup3", 256, 256, (g, r) => {
  g.fillStyle = "#c8452e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = ["#e0703e", "#9c2f22", "#e8b04a", "#6a8f3a"][i % 4]; g.beginPath(); g.arc(r() * 256, r() * 256, 4 + r() * 10, 0, Math.PI * 2); g.fill(); }
});

export { rng };
