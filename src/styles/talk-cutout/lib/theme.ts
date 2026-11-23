// Talk Cutout · theme tokens. One accent (orange on black / dark glass), cream type, dark glass for everything that
// sits on the speaker's wall (a light wall swallows cream type). Put YOUR brand colour in `accent` / `accent2`.
// App colours (YouTube red, Instagram gradient) only appear inside those apps' own UI.
export const C = {
  bg: "#060708", // the stage under the motion sections
  bg2: "#0c0e11",
  panel: "#121418",
  panel2: "#181b20",
  line: "rgba(244,238,230,0.10)",
  line2: "rgba(244,238,230,0.18)",
  cream: "#F4EEE6",
  dim: "rgba(244,238,230,0.64)",
  faint: "rgba(244,238,230,0.36)",
  accent: "#FF6A1F", // the one accent (the author's taste: orange; never neon green, teal or purple)
  accent2: "#FF8B45", // a lighter step of it (key words in captions, big numbers on dark)
  accentSoft: "rgba(255,106,31,0.16)",
  accentInk: "#160a04", // text on an accent pill
  red: "#FF3B30", // only for «wrong / delete / costly»
  ok: "#3DDC84",
  // app chrome (inside the app screens only)
  yt: "#FF0033",
  igBlue: "#4A5DF9",
  ig1: "#FEDA75",
  ig2: "#FA7E1E",
  ig3: "#D62976",
  ig4: "#962FBF",
  ig5: "#4F5BD5",
};
export const IG_GRAD = `linear-gradient(45deg, ${C.ig1} 0%, ${C.ig2} 25%, ${C.ig3} 50%, ${C.ig4} 75%, ${C.ig5} 100%)`;
/** the accent as rgba (glows, outlines) */
export const accentA = (a: number) => `rgba(255,106,31,${a})`;

/** dark glass: every tile, pill and card that sits on the speaker's picture */
export const GLASS = {
  background: "rgba(14,16,19,0.9)",
  border: "1.5px solid rgba(244,238,230,0.16)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
} as const;

/** a soft text shadow that keeps type readable over anything */
export const SD = "0 2px 6px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.5)";

/** one clean colour of light per motion section (key + a deep shade of the same hue; no muddy mixes) and its faint
 *  giant word. Keep them in the orange/red/amber/rose family; never neon green, teal or purple. */
export const SECTION = {
  youtube: { c1: "#c62828", c2: "#2a0606" },
  ai: { c1: "#c8642c", c2: "#2b1208" },
  publish: { c1: "#c8901a", c2: "#2a1a02" },
  cta: { c1: "#d6336c", c2: "#2a0614" },
};

/** font families (all SIL OFL, files in public/fonts; loaded by useTalkFonts in fonts.ts) */
export const F = {
  ui: "TCInter", // Inter (variable 100–900): app screens, big Latin numbers
  head: "TCLalezar", // Lalezar: kinetic Persian words, captions, card labels
  vz: "TCVazir", // Vazirmatn Regular: Persian text inside app screens
  vzB: "TCVazirB", // Vazirmatn Bold: Persian labels
  vzK: "TCVazirK", // Vazirmatn Black: heavy Persian labels
  anton: "TCAnton", // Anton: the backdrop's giant outlined words
  osd: "TCOsd", // VT323: camcorder OSD (landscape variant)
};
