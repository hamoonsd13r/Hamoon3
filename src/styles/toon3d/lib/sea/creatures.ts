// The pirates' dog (our own design): a stocky white bull terrier sitting up, brown spots, a black eye patch, a
// spiked collar, laughing with the crew. Same card space as the people (600 x 1000, soles at y = 975), ink rims.
import { Pen, INK } from "../base/toon";

type P2 = [number, number];
const WHITE = "#f7f3ea", SHADE = "#d9d2c6", SPOT = "#9a6a42", PINK = "#e88a8a", MOUTH = "#5a1e28";
export type DogOpts = { expr?: "laugh" | "neutral" | "shock"; blink?: number; light?: number; pant?: number };

const ell = (cx: number, cy: number, rx: number, ry: number, n = 40): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

export const dogFront = (p: Pen, o: DogOpts = {}) => {
  const expr = o.expr ?? "laugh", light = o.light ?? -2.1, pant = o.pant ?? 0;
  // haunches + chest (a sitting pear)
  const body: P2[] = [[300, 640], [370, 660], [420, 740], [450, 880], [430, 960], [300, 975], [170, 960], [150, 880], [180, 740], [230, 660]];
  p.gradFill(body, WHITE, SHADE, light, 0.35);
  p.clip(body, () => { p.ell(380, 860, 60, 48, SPOT, 0); p.ell(210, 930, 45, 30, SPOT, 0); });
  p.inkRing(body, 11, Math.atan2(0.8, 1));
  // front legs + paws
  for (const s of [-1, 1]) {
    const x = 300 + s * 52;
    p.poly([[x - 26, 760], [x + 26, 760], [x + 24, 950], [x - 24, 950]], WHITE, 10);
    p.ell(x + s * 4, 955, 36, 20, WHITE, 10);
    for (const d of [-12, 0, 12]) p.stroke([[x + s * 4 + d, 945], [x + s * 4 + d, 965]], 4);
  }
  // spiked collar
  p.poly([[205, 655], [395, 655], [400, 690], [200, 690]], "#2a2430", 9);
  for (let i = 0; i < 7; i++) { const x = 220 + i * 27; p.poly([[x - 9, 690], [x + 9, 690], [x, 714]], "#d9dde0", 5); }
  // ears (behind the head)
  for (const s of [-1, 1]) {
    p.poly([[300 + s * 70, 470], [300 + s * 150, 345], [300 + s * 135, 470]], WHITE, 10);
    p.poly([[300 + s * 92, 455], [300 + s * 140, 380], [300 + s * 126, 458]], PINK, 0);
  }
  // head: a long egg with the muzzle at the bottom
  const head = ell(300, 540, 128, 118, 64);
  p.gradFill(head, WHITE, SHADE, light, 0.35);
  p.clip(head, () => p.ell(225, 600, 55, 42, SPOT, 0));
  p.inkRing(head, 11, Math.atan2(0.8, 1));
  // eye patch over the dog's right eye (screen left), strap across the head
  p.band([[178, 470], [300, 452], [425, 480]], "#151313", 9, 2);
  p.ell(248, 528, 34, 30, "#151313", 6);
  // the other eye: amber with a pupil, or squeezed shut when it laughs
  const ex = 352, ey = 528;
  if (expr === "laugh" || (o.blink ?? 0) >= 1) p.stroke([[ex - 18, ey - 10], [ex, ey + 2], [ex + 18, ey - 10]], 7);
  else if (expr === "shock") { p.ell(ex, ey, 22, 22, "#ffffff", 6); p.dot(ex, ey + 2, 8); }
  else { p.ell(ex, ey, 18, 16, "#e0b23a", 6); p.dot(ex + 2, ey + 1, 7); }
  // brows
  p.stroke([[ex - 22, ey - 34], [ex + 18, ey - 40]], 8);
  // muzzle, nose, mouth
  p.ell(300, 600, 70, 46, WHITE, 0);
  p.poly([[276, 572], [324, 572], [316, 596], [300, 604], [284, 596]], INK, 0);
  p.ell(292, 580, 7, 4, "#5a5a66", 0);
  if (expr === "laugh" || expr === "shock") {
    const open = expr === "shock" ? 34 : 30 + 8 * pant;
    const m: P2[] = [[248, 618], [352, 618], [338, 618 + open * 0.8], [300, 618 + open], [262, 618 + open * 0.8]];
    p.poly(m, MOUTH, 8);
    p.clip(m, () => { p.ell(300, 618 + open * 0.95, 30, 16 + 5 * pant, PINK, 0); for (const x of [262, 338]) p.poly([[x - 9, 618], [x + 9, 618], [x, 636]], "#ffffff", 0); });
    p.poly(m, null, 8);
  } else p.arc(300, 612, 40, 14, 20, 160, 7);
  p.stroke([[300, 604], [300, 618]], 6);
};
