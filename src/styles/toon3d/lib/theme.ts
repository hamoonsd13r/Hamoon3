// Toon3D film-level tokens: the caption look and the ONE accent colour. The world's own colours live with its lights
// (sea/lights.ts: LIGHTS / LOOK / GRADES per light: day, storm, galley, rays) and its cast (sea/cast.ts outfits).
// House taste: white Lalezar captions with a dark outline, one warm accent (orange) for a key word; never neon green,
// teal or purple as an accent. Put a brand colour in ACCENT if the film has one.
import React from "react";
import { bare, type Card } from "./kit/timeline";

/** the caption font (OFL, public/fonts) */
export const CAPTION_FONT: [string, string] = ["Lalezar", "fonts/Lalezar-Regular.ttf"];
/** caption block: 104 px at y 1290 of 1920 (67-74 % of the height: above Instagram's bottom 20 %, under the faces) */
export const CAPTION = { font: "Lalezar", size: 104, top: 1290, color: "#ffffff", outline: "#14181b" };
/** the accent for highlighted caption words */
export const ACCENT = "#ff9a3c";

/** caption.node for makeFilm: paints the given words (any punctuation) in ACCENT, the rest stays white */
export const accentWords = (words: string[], color = ACCENT) => {
  const set = new Set(words.map(bare));
  return (c: Card): React.ReactNode =>
    c.text.split(" ").map((w, i) => React.createElement("span", { key: i, style: set.has(bare(w)) ? { color } : undefined }, (i ? " " : "") + w));
};
