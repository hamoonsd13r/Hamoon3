// Painted Story · palette tokens. ONE accent per film (the author's taste: warm orange on dark; never neon green, teal
// or purple). Put your own brand colour in `accent`; everything else stays quiet so the painted plates lead.
import React from "react";

export type Theme = {
  ink: string; // frame base, dips to black, end-card dark
  text: string; // main text on pictures
  textDim: string; // labels, small print
  accent: string; // the only accent: rules, ticks, day-card rule, «you» on maps
  warm: string; // quoted speech (intercom, neighbour, radio) in captions; soft highlights
  danger: string; // low levels / alarms (tank drained, readings)
  water: string; // tank fill
  panel: string; // dark glass panels behind UI
  panelLine: string;
  paper: string; // the taped rules sheet
  paperInk: string;
  night: string; // night tint (vignette colour)
  sd: string; // text shadow on pictures
};

/** 16:9 survival doc (stick-figure cartoon stills): black frame, white text, warm orange accent */
export const NIGHT_DOC: Theme = {
  ink: "#05060a",
  text: "#ffffff",
  textDim: "rgba(255,255,255,0.78)",
  accent: "#f2762e",
  warm: "#f6dcc8",
  danger: "#ff7a6a",
  water: "rgba(120,190,235,0.8)",
  panel: "rgba(8,10,14,0.6)",
  panelLine: "rgba(255,255,255,0.12)",
  paper: "#EFE5D8",
  paperInk: "#1d2a25",
  night: "rgba(6,8,22,0.55)",
  sd: "0 3px 18px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.8)",
};

/** 9:16 tale (painterly plates): pale sage by day, near-black forest by night, blush for warmth, tomato as the one accent */
export const FOREST_WARD: Theme = {
  ink: "#06100d",
  text: "#ffffff",
  textDim: "rgba(247,220,207,0.85)",
  accent: "#FF5638",
  warm: "#F7DCCF",
  danger: "#FF5638",
  water: "rgba(143,168,155,0.85)",
  panel: "rgba(6,16,13,0.66)",
  panelLine: "rgba(247,220,207,0.16)",
  paper: "#EFE5D8",
  paperInk: "#1d2a25",
  night: "rgba(3,9,7,0.55)",
  sd: "0 2px 4px rgba(0,0,0,0.55), 0 4px 22px rgba(0,0,0,0.6)",
};

/** the tale's plate palette (for image prompts and code-drawn glows) */
export const WARD_PALETTE = { sage: "#DCE3DC", sageMid: "#8FA89B", forest: "#12332C", night: "#0B1F1A", blush: "#F7DCCF", tomato: "#FF5638" };

export const ThemeCtx = React.createContext<Theme>(NIGHT_DOC);
export const useTheme = () => React.useContext(ThemeCtx);

/** safe zones. Tall (Reels/Shorts): UI never above y=236 (the app's top bar) and never under 28 px; captions ~y 1395.
 *  Wide (YouTube): chips at the top band, quotes ~y 850, nothing important in the bottom 90 px (player bar). */
export const SAFE = {
  tall: { top: 236, side: 56, caption: 1395, minText: 28 },
  wide: { top: 50, side: 80, quote: 850, bottom: 990 },
};
