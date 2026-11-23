// Talk Page — palette, fonts and geometry tokens. Change the look here (or pass your own values to the pieces).
// The frame is the speaker's own vertical video (1080 × 1920). The paper page lies in the lower third; only that band
// is rendered (transparent ProRes) and laid on the original video with ffmpeg.

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** paper, ink and ONE accent (pen + marker). Put your brand colour in `accent` / `mark` if you have one. */
export const C = {
  paper: "#F2ECE0",
  paper2: "#E9E1D2",
  paperHi: "#FBF8F1", // cards pasted on the page
  ink: "#1C1A17",
  ink2: "#4A453D",
  ink3: "#7C7466", // axis lines, faint pen
  label: "#5E584C", // meaningful mono labels (≥ 21 px) — contrast ≥ 5:1 on the paper
  rule: "rgba(28,26,23,0.18)",
  accent: "#D2561E", // the pen, stamps, the one key colour
  mark: "rgba(244,150,70,0.50)", // highlighter (multiplied on the paper)
  dark: "#17150F", // a dark card (player, call bubble)
  cream: "#EDE4D2", // text on the dark card
};

/** font families (loaded by useTalkPageFonts). Persian falls back to Vazirmatn inside every stack. */
export const F = {
  serif: "TPSerif, TPFa", // STIX Two Text — headlines, values
  mono: "TPMono, TPFa", // IBM Plex Mono — running header, labels, chips
  pen: "TPPen, TPFa", // Caveat — handwritten notes
  fa: "TPFa, TPSerif", // Vazirmatn — Persian headlines (lang="fa")
  ui: "TPUi, TPFa", // Inter — the Silver variant
};

/** the page (absolute frame px). Centred, 934 wide (the last accepted edits); it bleeds off the bottom edge. */
export const PAGE = {
  x: (W - 934) / 2,
  w: 934,
  low: 1252, // normal top: the page covers the lower third, the face stays clear
  tall: 1060, // a tall page for a big printed figure in the hook (footage from frame 0); never higher (face)
  bottom: 1972,
};
/** content zone inside the page (page px): headline row at 56, zone below */
export const ZONE = { x: 54, y: 124, h: 416 };
/** Instagram-safe box (absolute frame px): text and graphics stay left of RIGHT and above BOTTOM. Footage may bleed lower. */
export const SAFE = { right: 940, bottom: 1680, buttons: 980 };
/** overlay band top for the demo (it has a tall page). If your page never stands tall, 1190 is enough. */
export const OV_Y = 1000;
