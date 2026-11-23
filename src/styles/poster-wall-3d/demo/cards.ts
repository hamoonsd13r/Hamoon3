// Poster Wall 3D · the demo's cards: the twenty style-index posters. Each card has a tone (0 dark · 1 mid · 2 light)
// and what it shows (head / figure / object / land) so neighbours differ and every hold mixes them.
// Sources: stills in public/styles/poster-wall-3d/cards/<id>.jpg (shipped). For moving cards, render the clips once:
//   node src/styles/poster-wall-3d/pipeline/render-cards.mjs   → public/styles/poster-wall-3d/clips/<id>.mp4
// and set USE_CLIPS = true. Your own posters: any 9:16 (or 4:5, set cw/ch) images or clips with the same ids.
import { staticFile } from "remotion";
import type { SlotInfo } from "../lib/engine";
import { configureWall, type WallCard } from "../lib/wall";
import { slotTime } from "../lib/timing";
import { FPS } from "../lib/theme";

export const USE_CLIPS = false;

export const CARDS: WallCard[] = [
  { id: "minimal", tone: 1, cat: "figure" },
  { id: "maxi", tone: 1, cat: "head" },
  { id: "future", tone: 0, cat: "head" },
  { id: "vector", tone: 2, cat: "head" },
  { id: "collage", tone: 2, cat: "head" },
  { id: "retro", tone: 1, cat: "object" },
  { id: "cyber", tone: 0, cat: "figure" },
  { id: "pop", tone: 2, cat: "head" },
  { id: "glass", tone: 0, cat: "head" },
  { id: "clay", tone: 2, cat: "figure" },
  { id: "pixel", tone: 0, cat: "land" },
  { id: "editorial", tone: 2, cat: "figure" },
  { id: "y2k", tone: 1, cat: "head" },
  { id: "swiss", tone: 2, cat: "figure" },
  { id: "surreal", tone: 2, cat: "land" },
  { id: "boho", tone: 2, cat: "object" },
  { id: "victorian", tone: 0, cat: "head" },
  { id: "graffiti", tone: 1, cat: "figure" },
  { id: "aurora", tone: 0, cat: "land" },
  { id: "hand", tone: 2, cat: "object" },
];

configureWall({
  cards: CARDS,
  heroA: "cyber", // full frame on frame 0
  heroB: "aurora", // the ending push-in
  framing: { aboveA: "glass", belowA: "pixel", aboveB: "future", belowB: "victorian" }, // the edges that show are dark and calm
  cw: 1080, // 9:16 posters
  ch: 1920,
});

/** where each card's picture comes from */
export const slotSource = (slot: string): SlotInfo => {
  const id = slot.split("@")[0];
  return USE_CLIPS
    ? { src: staticFile(`styles/poster-wall-3d/clips/${id}.mp4`), time: (t) => slotTime(slot, t), fps: FPS }
    : { src: staticFile(`styles/poster-wall-3d/cards/${id}.jpg`) };
};
