// AE Grid · constants, the three palettes and easing. A 3×3 grid of 360×360 animated tiles in a 1080×1920 frame
// (y 420 → 1500), 30 fps, an 8-second seamless loop: every tile is a pure function of t with periods that divide 8.
export const FPS = 30, W = 1080, H = 1920, DUR = 8, TILE = 360, GRID_TOP = 420;

export type Pal = { name: string; D: string; V: string; L: string };
/** three colours each: D = dark (backgrounds), V = vivid (the accent), L = light */
export const PALETTES = {
  P1: { name: "Aubergine / Saffron / Ivory", D: "#23153C", V: "#FFB21E", L: "#F5EFE6" },
  P2: { name: "Forest / Tomato / Blush", D: "#12332C", V: "#FF5638", L: "#F7DCCF" },
  P3: { name: "Ink / Signal Red / Ice", D: "#121418", V: "#FF3B30", L: "#D9E8FF" },
} satisfies Record<string, Pal>;
export type PalId = keyof typeof PALETTES;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const loop = (t: number, p: number) => ((t % p) + p) % p;
export const ease = {
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u: number) => 1 - Math.pow(1 - u, 3),
  in: (u: number) => u * u * u,
  /** settles with a small overshoot (≈6 %) */
  outBack: (u: number) => {
    const c1 = 1.2, c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
};
/** the frame's background: the dark colour, a little darker */
export const darker = (hex: string, k = 0.72) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, "0");
  return `#${c(16)}${c(8)}${c(0)}`;
};
