// Hall artwork (round 2): the queen as layered masks (robe body, profile head with a light map, back of head, arm),
// soldiers, a Persian manuscript page, a healing herb leaf, glazed tile band maps and candle wax.
// Masks: R = solid body, G = translucent veil/hair/sleeve, B = gold. Light maps: R = how much warm light reaches there.
import * as THREE from "three";
import { rnd } from "../lib";

const TAU = Math.PI * 2;
const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
};
const tex = (c: HTMLCanvasElement, srgb: boolean, wrap = false) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const maskCanvas = (w: number, h: number) => {
  const [c, x] = cv(w, h);
  x.fillStyle = "#000";
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "lighter";
  return [c, x] as const;
};
const R = (k = 1) => `rgb(${Math.round(k * 255)},0,0)`;
const G = (k: number) => `rgb(0,${Math.round(k * 255)},0)`;
const B = (k: number) => `rgb(0,0,${Math.round(k * 255)})`;
const limb = (x: CanvasRenderingContext2D, pts: number[][], w: number) => {
  x.lineWidth = w;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = pts[i];
    if (i < pts.length - 1) {
      const [c2, d2] = pts[i + 1];
      x.quadraticCurveTo(a, b, (a + c2) / 2, (b + d2) / 2);
    } else x.lineTo(a, b);
  }
  x.stroke();
};
export type Layer = { map: THREE.Texture; lit?: THREE.Texture; aspect: number; w: number; h: number };

// ---------------------------------------------------------------- the queen
/** body layer: 3.4 × 3.7 m, top edge = neck (y 6.6), bottom = gown hem flowing into the coils (y 2.9). Px/m ≈ 301.
 *  One continuous gown (no belt, no seam) that thins into sheer cloth over the serpent body. */
export const QB = { w: 3.4, h: 3.7, top: 6.6 };
export const qBodyMask = (): Layer => {
  const W = 1024, H = 1114, cx = 512;
  const [c, x] = maskCanvas(W, H);
  const Y = (y: number) => (QB.top - y) * (H / QB.h); // world y → canvas
  const X = (m: number) => cx + m * (W / QB.w);
  // mantle / veil falling from the shoulders behind her, widening over the coils; its edges catch the rim
  x.fillStyle = G(0.3);
  x.beginPath();
  x.moveTo(X(-0.28), Y(6.42));
  x.bezierCurveTo(X(-0.9), Y(6.0), X(-1.25), Y(4.7), X(-1.65), Y(2.95));
  x.lineTo(X(1.65), Y(2.95));
  x.bezierCurveTo(X(1.25), Y(4.7), X(0.9), Y(6.0), X(0.28), Y(6.42));
  x.fill();
  x.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 7;
    x.strokeStyle = G(0.08 + 0.1 * rnd(i * 5));
    x.lineWidth = 14 + rnd(i) * 24;
    x.beginPath();
    x.moveTo(X(s * (0.3 + k * 0.2)), Y(6.2));
    x.bezierCurveTo(X(s * (0.72 + k * 0.3)), Y(5.3), X(s * (0.95 + k * 0.4)), Y(4.2), X(s * (1.05 + k * 0.52)), Y(2.95));
    x.stroke();
  }
  // long hair down her back, falling on the right (she looks left)
  x.fillStyle = G(0.62);
  x.beginPath();
  x.moveTo(X(0.04), Y(6.6));
  x.bezierCurveTo(X(0.42), Y(6.45), X(0.6), Y(5.7), X(0.62), Y(4.8));
  x.bezierCurveTo(X(0.6), Y(4.45), X(0.42), Y(4.5), X(0.32), Y(4.9));
  x.bezierCurveTo(X(0.32), Y(5.6), X(0.2), Y(6.2), X(0.0), Y(6.45));
  x.fill();
  for (let i = 0; i < 12; i++) {
    const k = rnd(i * 3);
    x.strokeStyle = G(0.3 + 0.35 * rnd(i));
    x.lineWidth = 3 + rnd(i + 1) * 6;
    x.beginPath();
    x.moveTo(X(0.1 + k * 0.12), Y(6.45));
    x.bezierCurveTo(X(0.48 + k * 0.12), Y(6.0), X(0.64 + k * 0.08), Y(5.3), X(0.58 + k * 0.18), Y(4.4 - k * 0.35));
    x.stroke();
  }
  // solid: a long neck, sloping shoulders, a gown that follows the body and flows into the coils without a waistline
  x.fillStyle = R(1);
  x.beginPath();
  x.moveTo(X(-0.075), Y(6.6));
  x.lineTo(X(0.075), Y(6.6));
  x.bezierCurveTo(X(0.085), Y(6.4), X(0.17), Y(6.28), X(0.37), Y(6.17)); // neck → shoulder slope
  x.bezierCurveTo(X(0.46), Y(6.12), X(0.45), Y(5.95), X(0.4), Y(5.8)); // shoulder cap
  x.bezierCurveTo(X(0.36), Y(5.6), X(0.3), Y(5.4), X(0.255), Y(5.15)); // ribcage → waist, one smooth line
  x.bezierCurveTo(X(0.24), Y(4.95), X(0.3), Y(4.65), X(0.33), Y(4.4)); // hips
  x.bezierCurveTo(X(0.36), Y(4.15), X(0.4), Y(4.0), X(0.44), Y(3.85));
  x.lineTo(X(-0.44), Y(3.85));
  x.bezierCurveTo(X(-0.4), Y(4.0), X(-0.36), Y(4.15), X(-0.33), Y(4.4));
  x.bezierCurveTo(X(-0.3), Y(4.65), X(-0.24), Y(4.95), X(-0.255), Y(5.15));
  x.bezierCurveTo(X(-0.3), Y(5.4), X(-0.36), Y(5.6), X(-0.4), Y(5.8));
  x.bezierCurveTo(X(-0.45), Y(5.95), X(-0.46), Y(6.12), X(-0.37), Y(6.17));
  x.bezierCurveTo(X(-0.17), Y(6.28), X(-0.085), Y(6.4), X(-0.075), Y(6.6));
  x.fill();
  // the gown's lower part: opaque, then fading to sheer as it pours over the serpent body
  const sg = x.createLinearGradient(0, Y(3.9), 0, Y(2.95));
  sg.addColorStop(0, R(1));
  sg.addColorStop(0.85, R(1));
  sg.addColorStop(1, R(0.3));
  x.fillStyle = sg;
  x.beginPath();
  x.moveTo(X(-0.445), Y(3.87));
  x.lineTo(X(0.445), Y(3.87));
  x.bezierCurveTo(X(0.52), Y(3.6), X(0.62), Y(3.3), X(0.8), Y(2.95));
  for (let k = 0; k <= 12; k++) x.lineTo(X(0.8 - (k / 12) * 1.6), Y(2.95 + 0.05 * Math.sin(k * 1.9)));
  x.bezierCurveTo(X(-0.62), Y(3.3), X(-0.52), Y(3.6), X(-0.445), Y(3.87));
  x.fill();
  // long folds of sheer cloth over the gown (G)
  for (let i = 0; i < 12; i++) {
    const u = -1 + (i / 11) * 2;
    x.strokeStyle = G(0.14 + 0.12 * rnd(i * 7));
    x.lineWidth = 5 + rnd(i * 2) * 8;
    x.beginPath();
    x.moveTo(X(u * 0.22), Y(5.0));
    x.bezierCurveTo(X(u * 0.3), Y(4.4), X(u * 0.5), Y(3.6), X(u * 0.78 + (rnd(i) - 0.5) * 0.1), Y(2.98));
    x.stroke();
  }
  // gold: only a fine embroidered neckline
  x.strokeStyle = B(0.75);
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(X(-0.2), Y(6.24));
  x.quadraticCurveTo(X(0), Y(5.98), X(0.2), Y(6.24));
  x.stroke();
  x.fillStyle = B(0.9);
  x.beginPath();
  x.ellipse(X(0), Y(5.99), 5, 8, 0, 0, TAU);
  x.fill();
  return { map: tex(c, false), aspect: W / H, w: QB.w, h: QB.h };
};

/** shared tiara: a jewelled band with spires, the tallest at the front. drawn around (bx, by), tilted by ang */
const tiara = (x: CanvasRenderingContext2D, bx: number, by: number, w: number, ang: number, front: number, col: string) => {
  x.save();
  x.translate(bx, by);
  x.rotate(ang);
  x.fillStyle = col;
  x.fillRect(-w / 2, -10, w, 20);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const peak = Math.exp(-(((u - front) / 0.32) ** 2));
    const ph = 34 + 92 * peak - (i % 2) * 18;
    const px = u * w * 0.92;
    x.beginPath();
    x.moveTo(px - 7, -8);
    x.lineTo(px - 1.5, -8 - ph * 0.86);
    x.lineTo(px, -8 - ph);
    x.lineTo(px + 1.5, -8 - ph * 0.86);
    x.lineTo(px + 7, -8);
    x.fill();
    x.beginPath();
    x.arc(px, -8 - ph - 5, i % 2 ? 4 : 6.5, 0, TAU);
    x.fill();
  }
  x.restore();
};

/** head layer: 1.09 × 1.63 m (512 × 768 px, ≈ 471 px/m), pivot (neck base) at canvas (256, 720) */
export const QH = { w: 1.09, h: 1.63, px: 256, py: 720 };
/** profile facing left: brow, nose, lips and chin form the edge so a warm rim models the face; lit map adds cheek and brow */
export const qHeadProfile = (): Layer => {
  const W = 512, H = 768;
  const [c, x] = maskCanvas(W, H);
  const [lc, lx] = cv(W, H);
  lx.fillStyle = "#000";
  lx.fillRect(0, 0, W, H);
  // hair falling back from the crown (G, then denser near the head)
  x.fillStyle = G(0.6);
  x.beginPath();
  x.moveTo(250, 420);
  x.bezierCurveTo(330, 410, 372, 470, 370, 560);
  x.bezierCurveTo(372, 640, 352, 720, 340, H);
  x.lineTo(268, H);
  x.bezierCurveTo(290, 690, 300, 620, 290, 560);
  x.fill();
  for (let i = 0; i < 8; i++) {
    x.strokeStyle = G(0.35 + 0.3 * rnd(i * 9));
    x.lineWidth = 3 + rnd(i) * 5;
    x.beginPath();
    x.moveTo(300 + i * 6, 440 + i * 4);
    x.bezierCurveTo(360 + i * 3, 500, 365 + i * 4, 620, 345 + i * 6, H);
    x.stroke();
  }
  // the head in profile (R): skull, forehead, brow, nose, lips, chin, jaw, neck
  const face = new Path2D();
  face.moveTo(300, 440); // crown, back
  face.bezierCurveTo(255, 405, 196, 412, 172, 452); // top of head → hairline
  face.bezierCurveTo(160, 470, 158, 488, 160, 498); // forehead
  face.bezierCurveTo(158, 503, 154, 506, 155, 512); // brow ridge
  face.bezierCurveTo(158, 518, 160, 522, 157, 528); // eye socket dip
  face.bezierCurveTo(150, 542, 140, 556, 136, 566); // nose bridge → tip
  face.bezierCurveTo(134, 571, 138, 575, 146, 575); // nose tip underside
  face.bezierCurveTo(150, 578, 150, 582, 148, 586); // philtrum
  face.bezierCurveTo(145, 590, 146, 594, 151, 596); // upper lip
  face.bezierCurveTo(147, 600, 148, 605, 153, 607); // lower lip
  face.bezierCurveTo(158, 612, 156, 618, 153, 624); // chin indent
  face.bezierCurveTo(152, 636, 162, 646, 180, 648); // chin
  face.bezierCurveTo(205, 650, 225, 640, 240, 632); // jaw
  face.bezierCurveTo(238, 660, 236, 690, 232, H); // throat
  face.lineTo(300, H);
  face.bezierCurveTo(302, 680, 306, 620, 310, 580); // nape
  face.bezierCurveTo(318, 520, 318, 470, 300, 440);
  face.closePath();
  x.fillStyle = R(1);
  x.fill(face);
  // tiara (R + B), the same design as in every shot
  tiara(x, 238, 430, 150, -0.22, -0.18, R(1));
  tiara(x, 238, 430, 150, -0.22, -0.18, B(1));
  // earring
  x.fillStyle = B(0.9);
  x.beginPath();
  x.ellipse(262, 600, 6, 12, 0, 0, TAU);
  x.fill();
  // light map: warm amber along the profile edge (brow, nose, lips, chin) and on the cheekbone
  // only the face edge (hairline → brow → nose → lips → chin), not the skull, throat or nape
  const edge = new Path2D();
  edge.moveTo(172, 452);
  edge.bezierCurveTo(160, 470, 158, 488, 160, 498);
  edge.bezierCurveTo(158, 503, 154, 506, 155, 512);
  edge.bezierCurveTo(158, 518, 160, 522, 157, 528);
  edge.bezierCurveTo(150, 542, 140, 556, 136, 566);
  edge.bezierCurveTo(134, 571, 138, 575, 146, 575);
  edge.bezierCurveTo(150, 578, 150, 582, 148, 586);
  edge.bezierCurveTo(145, 590, 146, 594, 151, 596);
  edge.bezierCurveTo(147, 600, 148, 605, 153, 607);
  edge.bezierCurveTo(158, 612, 156, 618, 153, 624);
  edge.bezierCurveTo(152, 636, 162, 646, 180, 648);
  lx.save();
  lx.clip(face);
  lx.filter = "blur(2.5px)";
  lx.strokeStyle = "rgba(255,255,255,0.95)";
  lx.lineWidth = 7;
  lx.stroke(edge);
  lx.restore();
  // the far side of the head stays dark: fade the light map toward the back
  lx.globalCompositeOperation = "destination-in";
  const fg = lx.createLinearGradient(140, 0, 300, 0);
  fg.addColorStop(0, "rgba(0,0,0,1)");
  fg.addColorStop(0.55, "rgba(0,0,0,0.6)");
  fg.addColorStop(1, "rgba(0,0,0,0)");
  lx.fillStyle = fg;
  lx.fillRect(0, 0, W, H);
  return { map: tex(c, false), lit: tex(lc, false), aspect: W / H, w: QH.w, h: QH.h };
};
/** where her eye is in the profile head canvas */
export const Q_EYE = { x: 168, y: 520 };

/** the back of her head (last shot, before she turns): hair, nape, the same tiara from behind */
export const qHeadBack = (): Layer => {
  const W = 512, H = 768;
  const [c, x] = maskCanvas(W, H);
  x.fillStyle = R(1);
  x.beginPath();
  x.ellipse(256, 520, 102, 112, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.moveTo(190, 560);
  x.bezierCurveTo(176, 640, 170, 700, 166, H);
  x.lineTo(346, H);
  x.bezierCurveTo(342, 700, 336, 640, 322, 560);
  x.fill();
  x.fillStyle = G(0.55);
  for (let i = 0; i < 10; i++) {
    const s = i % 2 ? 1 : -1;
    x.strokeStyle = G(0.4 + 0.2 * rnd(i));
    x.lineWidth = 4 + rnd(i * 3) * 6;
    x.beginPath();
    x.moveTo(256 + s * (40 + i * 5), 470);
    x.bezierCurveTo(256 + s * (110 + i * 4), 560, 256 + s * (105 + i * 3), 660, 256 + s * (96 + i * 5), H);
    x.stroke();
  }
  tiara(x, 256, 432, 190, 0, 0, R(1));
  tiara(x, 256, 432, 190, 0, 0, B(0.85));
  return { map: tex(c, false), aspect: W / H, w: QH.w, h: QH.h };
};

/** two-part arm (so it can bend): full, tapered, slightly curved limbs (never rods), plus a separate sheer sleeve
 *  that hangs from the elbow. upper arm 0.8 x 0.9 m (pivot canvas (160, 26), elbow at canvas y 300), forearm
 *  0.8 x 1.3 m (pivot at the elbow, canvas (160, 26)), sleeve 0.8 x 1.5 m hanging from its top centre (160, 20). 400 px/m */
export const QA = { w: 0.8, upH: 0.9, foH: 1.3, drH: 1.5, px: 160, py: 26, elbow: 300 };
export const qUpperArm = (): Layer => {
  const W = 320, H = 360;
  const [c, x] = maskCanvas(W, H);
  // a sheer layer of sleeve flaring from the shoulder on the outer side
  x.fillStyle = G(0.36);
  x.beginPath();
  x.moveTo(176, 20);
  x.bezierCurveTo(240, 70, 272, 190, 280, 334);
  x.bezierCurveTo(240, 350, 210, 344, 196, 320);
  x.bezierCurveTo(212, 220, 206, 110, 176, 20);
  x.fill();
  // the arm: a full rounded shoulder, a soft swell, tapering to the elbow
  x.fillStyle = R(1);
  x.beginPath();
  x.moveTo(160, 4);
  x.bezierCurveTo(212, 4, 222, 44, 216, 92);
  x.bezierCurveTo(212, 160, 202, 244, 196, 316);
  x.bezierCurveTo(186, 334, 134, 334, 124, 316);
  x.bezierCurveTo(116, 244, 106, 160, 104, 92);
  x.bezierCurveTo(98, 44, 108, 4, 160, 4);
  x.fill();
  return { map: tex(c, false), aspect: W / H, w: QA.w, h: QA.upH };
};
export const qForearm = (): Layer => {
  const W = 320, H = 520;
  const [c, x] = maskCanvas(W, H);
  x.fillStyle = R(1);
  // forearm: full at the elbow, tapering to a slender wrist
  x.beginPath();
  x.moveTo(160, 0);
  x.bezierCurveTo(198, 0, 200, 30, 198, 62);
  x.bezierCurveTo(194, 150, 184, 236, 178, 300);
  x.lineTo(142, 300);
  x.bezierCurveTo(136, 236, 126, 150, 122, 62);
  x.bezierCurveTo(120, 30, 122, 0, 160, 0);
  x.fill();
  // an open, graceful hand: palm, four slightly parted fingers curving softly, thumb apart
  x.beginPath();
  x.ellipse(160, 334, 24, 40, 0.05, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = R(1);
  x.lineCap = "round";
  const fingers = [
    [-16, 0.18, 74, 9],
    [-5, 0.06, 88, 9.5],
    [6, -0.04, 84, 9],
    [16, -0.14, 70, 8],
  ];
  for (const [dx, ang, len, w] of fingers) {
    x.lineWidth = w;
    x.beginPath();
    x.moveTo(160 + dx, 360);
    const ex = 160 + dx + Math.sin(ang) * len, ey = 360 + Math.cos(ang) * len;
    x.quadraticCurveTo(160 + dx + Math.sin(ang) * len * 0.6 - 4, 360 + Math.cos(ang) * len * 0.55, ex, ey);
    x.stroke();
  }
  x.lineWidth = 11;
  x.beginPath();
  x.moveTo(140, 318);
  x.quadraticCurveTo(118, 340, 118, 372);
  x.stroke();
  // a thin gold bracelet
  x.strokeStyle = B(0.7);
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(141, 290);
  x.lineTo(179, 291);
  x.stroke();
  return { map: tex(c, false), aspect: W / H, w: QA.w, h: QA.foH };
};
/** the long sheer sleeve: gathered at the top, falling in folds; edges catch the rim light */
export const qDrape = (): Layer => {
  const W = 320, H = 600;
  const [c, x] = maskCanvas(W, H);
  x.fillStyle = G(0.5);
  x.beginPath();
  x.moveTo(146, 14);
  x.bezierCurveTo(196, 10, 226, 50, 240, 130);
  x.bezierCurveTo(266, 270, 298, 430, 302, 566);
  x.bezierCurveTo(240, 592, 140, 594, 64, 574);
  x.bezierCurveTo(74, 420, 98, 260, 110, 130);
  x.bezierCurveTo(116, 54, 124, 18, 146, 14);
  x.fill();
  x.fillStyle = R(0.32);
  x.beginPath();
  x.moveTo(150, 22);
  x.bezierCurveTo(186, 26, 200, 70, 206, 130);
  x.bezierCurveTo(222, 270, 232, 390, 228, 480);
  x.bezierCurveTo(190, 494, 150, 494, 116, 480);
  x.bezierCurveTo(116, 390, 122, 270, 128, 130);
  x.bezierCurveTo(130, 70, 136, 26, 150, 22);
  x.fill();
  x.strokeStyle = G(0.26);
  x.lineWidth = 10;
  for (let f = 0; f < 5; f++) {
    x.beginPath();
    x.moveTo(134 + f * 16, 60);
    x.bezierCurveTo(120 + f * 30, 240, 98 + f * 44, 420, 86 + f * 50, 572);
    x.stroke();
  }
  return { map: tex(c, false), aspect: W / H, w: QA.w, h: QA.drH };
};

// ---------------------------------------------------------------- soldiers
/** a Persian soldier walking toward camera: spiked helmet with mail, knee tunic with a belt, trousers and boots,
 *  a spear and round shield or a torch. stride 0..1 swings the legs. 400 × 800 px for 2.2 m, feet at y≈780 */
export const soldierMask = (v: { torch?: boolean; spear?: boolean; shield?: boolean; stride: number }) => {
  const W = 400, H = 800, cx = 200;
  const [c, x] = cv(W, H);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const s = v.stride * 2 - 1; // -1..1
  // legs (trousers) and boots
  limb(x, [[cx - 22, 520], [cx - 26 + s * 10, 640], [cx - 28 + s * 22, 760]], 34);
  limb(x, [[cx + 22, 520], [cx + 26 - s * 10, 640], [cx + 28 - s * 22, 760]], 34);
  x.beginPath();
  x.ellipse(cx - 32 + s * 22, 772, 26, 12, 0, 0, TAU);
  x.ellipse(cx + 32 - s * 22, 772, 26, 12, 0, 0, TAU);
  x.fill();
  // tunic to the knee, flaring
  x.beginPath();
  x.moveTo(cx - 62, 270);
  x.bezierCurveTo(cx - 30, 250, cx + 30, 250, cx + 62, 270);
  x.bezierCurveTo(cx + 74, 380, cx + 70, 460, cx + 84, 600);
  x.lineTo(cx - 84, 600);
  x.bezierCurveTo(cx - 70, 460, cx - 74, 380, cx - 62, 270);
  x.fill();
  // head, mail aventail, spiked helmet
  x.beginPath();
  x.ellipse(cx, 190, 30, 36, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.moveTo(cx - 36, 175);
  x.lineTo(cx - 46, 262);
  x.lineTo(cx + 46, 262);
  x.lineTo(cx + 36, 175);
  x.fill();
  x.beginPath();
  x.moveTo(cx - 40, 178);
  x.quadraticCurveTo(cx - 38, 120, cx, 104);
  x.lineTo(cx + 2, 66);
  x.lineTo(cx + 5, 104);
  x.quadraticCurveTo(cx + 40, 120, cx + 40, 178);
  x.fill();
  // arms
  limb(x, [[cx - 56, 285], [cx - 76, 380], [cx - 64, 460]], 30);
  if (v.torch) limb(x, [[cx + 56, 285], [cx + 92, 360], [cx + 96, 300]], 30);
  else limb(x, [[cx + 56, 285], [cx + 86, 380], [cx + 96, 340]], 30);
  if (v.torch) limb(x, [[cx + 96, 420], [cx + 104, 200]], 13);
  if (v.spear) {
    limb(x, [[cx + 98, 780], [cx + 98, 10]], 8);
    x.beginPath();
    x.moveTo(cx + 98, -6);
    x.lineTo(cx + 110, 40);
    x.lineTo(cx + 86, 40);
    x.fill();
  }
  if (v.shield) {
    x.beginPath();
    x.arc(cx - 72, 420, 64, 0, TAU);
    x.fill();
  }
  // a soft halo map for rim purposes is not needed: the rim shader reads alpha
  return { map: tex(c, true), aspect: W / H };
};

// ---------------------------------------------------------------- manuscript page
const NAST = "'IranNastaliq', 'Urdu Typesetting', 'Aldhabi', 'Arabic Typesetting', serif";
/** an aged Persian medical manuscript leaf: ruled jadval frame, nastaliq text, an ink-and-wash plant study */
export const manuscriptPage = (seed: number) => {
  const W = 512, H = 720;
  const [c, x] = cv(W, H);
  // paper: warm parchment, mottled, darker toward the edges, fibre specks
  x.fillStyle = "#d9c49a";
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const px = rnd(i * 3 + seed) * W, py = rnd(i * 7 + seed) * H, r = 20 + rnd(i + seed) * 90;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${150 + rnd(i) * 40},${110 + rnd(i * 2) * 30},60,0.12)`);
    g.addColorStop(1, "rgba(150,110,60,0)");
    x.fillStyle = g;
    x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 500; i++) {
    x.fillStyle = `rgba(90,60,30,${0.05 + rnd(i * 11 + seed) * 0.15})`;
    x.fillRect(rnd(i * 5 + seed) * W, rnd(i * 9 + seed) * H, 1 + rnd(i) * 2, 1);
  }
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(80,45,15,0.55)");
  x.fillStyle = vg;
  x.fillRect(0, 0, W, H);
  // jadval: gold, blue and red rules
  const rule = (inset: number, col: string, w: number) => {
    x.strokeStyle = col;
    x.lineWidth = w;
    x.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };
  rule(30, "rgba(170,130,50,0.95)", 4);
  rule(36, "rgba(40,60,120,0.85)", 1.5);
  rule(40, "rgba(150,40,30,0.85)", 1.2);
  // illuminated header (sarlowh): lapis panel with gold border and a gold cartouche
  x.fillStyle = "rgba(28,45,110,0.85)";
  x.fillRect(52, 50, W - 104, 46);
  x.strokeStyle = "rgba(190,150,60,0.95)";
  x.lineWidth = 3;
  x.strokeRect(52, 50, W - 104, 46);
  x.fillStyle = "rgba(205,165,70,0.95)";
  x.beginPath();
  x.ellipse(W / 2, 73, 92, 16, 0, 0, TAU);
  x.fill();
  for (let k = 0; k < 9; k++) {
    x.fillStyle = k % 2 ? "rgba(180,40,35,0.8)" : "rgba(220,190,110,0.85)";
    x.beginPath();
    x.arc(70 + k * ((W - 140) / 8), 73, 4, 0, TAU);
    x.fill();
  }
  // marginal note written on the diagonal, as in old manuscripts
  x.save();
  x.translate(46, 520);
  x.rotate(-Math.PI / 4);
  x.fillStyle = "rgba(60,35,18,0.75)";
  x.font = "20px " + NAST;
  x.textAlign = "center";
  x.direction = "rtl";
  x.fillText("آزموده است", 0, 0);
  x.restore();
  // text block: nastaliq lines, right aligned, dark ink with a red rubric
  const lines = [
    ["در شناخت گیاهان درمان", "rgba(140,30,25,0.95)"],
    ["برگ این گیاه تب را فرو نشاند", "rgba(35,22,12,0.92)"],
    ["و ریشه‌اش زهر مار را بی‌اثر کند", "rgba(35,22,12,0.92)"],
    ["سه روز بجوشان و به بیمار بنوشان", "rgba(35,22,12,0.92)"],
  ];
  x.textAlign = "right";
  x.direction = "rtl";
  lines.forEach(([t, col], i) => {
    x.fillStyle = col;
    x.font = `bold ${i === 0 ? 42 : 36}px ${NAST}`;
    x.fillText(t, W - 62, 140 + i * 46);
  });
  // a thin rule under the text
  x.strokeStyle = "rgba(170,130,50,0.8)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(60, 316);
  x.lineTo(W - 60, 316);
  x.stroke();
  // botanical study: roots, stem, leaves with veins, a flower; ink outline + green-olive wash
  const bx = W / 2 + (rnd(seed) - 0.5) * 40;
  x.strokeStyle = "rgba(60,40,20,0.85)";
  x.lineWidth = 2;
  // roots
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.moveTo(bx, 640);
    x.bezierCurveTo(bx + (rnd(i + seed) - 0.5) * 60, 660, bx + (rnd(i * 2 + seed) - 0.5) * 110, 670, bx + (rnd(i * 3 + seed) - 0.5) * 150, 680 - rnd(i) * 10);
    x.stroke();
  }
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(bx, 640);
  x.bezierCurveTo(bx - 12, 560, bx + 14, 460, bx, 372);
  x.stroke();
  for (let i = 0; i < 6; i++) {
    const y = 610 - i * 42, sd = i % 2 ? 1 : -1;
    const lx2 = bx + sd * 4, tipx = bx + sd * (70 + rnd(i + seed) * 26), tipy = y - 26;
    x.fillStyle = `rgba(${90 + rnd(i) * 30},${110 + rnd(i * 3) * 20},45,0.55)`;
    x.beginPath();
    x.moveTo(lx2, y);
    x.quadraticCurveTo((lx2 + tipx) / 2, y - 40, tipx, tipy);
    x.quadraticCurveTo((lx2 + tipx) / 2, y + 12, lx2, y);
    x.fill();
    x.lineWidth = 1.6;
    x.stroke();
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(lx2, y);
    x.quadraticCurveTo((lx2 + tipx) / 2, y - 14, tipx, tipy);
    x.stroke();
  }
  // flower head
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU;
    x.fillStyle = "rgba(165,45,40,0.7)";
    x.beginPath();
    x.ellipse(bx + Math.cos(a) * 16, 362 + Math.sin(a) * 16, 14, 7, a, 0, TAU);
    x.fill();
  }
  x.fillStyle = "rgba(190,150,60,0.9)";
  x.beginPath();
  x.arc(bx, 362, 8, 0, TAU);
  x.fill();
  // small labels in the margin
  x.fillStyle = "rgba(35,22,12,0.85)";
  x.font = `24px ${NAST}`;
  x.fillText("ریشه", bx - 70, 690);
  x.fillText("گل", bx + 80, 350);
  return tex(c, true);
};

/** a glowing healing herb leaf (veined, gold-green, translucent) */
export const herbLeaf = (seed: number) => {
  const [c, x] = cv(128, 256);
  const g = x.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, "rgba(150,170,70,0.95)");
  g.addColorStop(1, "rgba(235,215,120,0.95)");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(64, 248);
  x.bezierCurveTo(10 + rnd(seed) * 10, 190, 6, 80, 64, 8);
  x.bezierCurveTo(122, 80, 118 - rnd(seed) * 10, 190, 64, 248);
  x.fill();
  x.strokeStyle = "rgba(255,245,200,0.8)";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(64, 250);
  x.lineTo(64, 16);
  x.stroke();
  x.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) {
    const y = 230 - i * 26;
    x.beginPath();
    x.moveTo(64, y);
    x.quadraticCurveTo(44, y - 10, 26, y - 26);
    x.moveTo(64, y);
    x.quadraticCurveTo(84, y - 10, 102, y - 26);
    x.stroke();
  }
  return tex(c, true);
};

// ---------------------------------------------------------------- glazed tile band (colour + grout normals + roughness)
export const tileBand = () => {
  const W = 1024, H = 256;
  const [c, x] = cv(W, H);
  const [, hx] = cv(W, H);
  const [rc, rx] = cv(W, H);
  x.fillStyle = "#13353f";
  x.fillRect(0, 0, W, H);
  hx.fillStyle = "#c8c8c8";
  hx.fillRect(0, 0, W, H);
  rx.fillStyle = "rgb(0,80,0)";
  rx.fillRect(0, 0, W, H);
  const star = (g: CanvasRenderingContext2D, cx2: number, cy2: number, Rr: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, rr = k % 2 ? Rr * 0.6 : Rr;
      g.lineTo(cx2 + Math.cos(a) * rr, cy2 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  // borders top and bottom
  x.fillStyle = "#b08a45";
  x.fillRect(0, 0, W, 14);
  x.fillRect(0, H - 14, W, 14);
  for (let i = 0; i < 8; i++) {
    const cx2 = 64 + i * 128, cy2 = 128;
    star(x, cx2, cy2, 70, "#e3d6b4");
    star(x, cx2, cy2, 52, "#1f6f78");
    star(x, cx2, cy2, 26, "#c19a50");
    star(x, cx2 + 64, 30, 34, "#1d3f7a");
    star(x, cx2 + 64, 226, 34, "#1d3f7a");
  }
  // individual tiles: random tilt in the height field + roughness variation, grout lines recessed
  const tw = 32;
  for (let ty = 0; ty < H; ty += tw)
    for (let tx = 0; tx < W; tx += tw) {
      const k = rnd(tx * 0.37 + ty * 1.3);
      const gg = hx.createLinearGradient(tx, ty, tx + tw, ty + tw * (k - 0.5));
      gg.addColorStop(0, `rgb(${170 + k * 40},${170 + k * 40},${170 + k * 40})`);
      gg.addColorStop(1, `rgb(${210 - k * 30},${210 - k * 30},${210 - k * 30})`);
      hx.fillStyle = gg;
      hx.fillRect(tx + 1, ty + 1, tw - 2, tw - 2);
      rx.fillStyle = `rgb(0,${Math.round(125 + rnd(tx + ty * 7) * 80)},0)`;
      rx.fillRect(tx + 1, ty + 1, tw - 2, tw - 2);
    }
  hx.fillStyle = "#303030";
  rx.fillStyle = "rgb(0,235,0)";
  x.fillStyle = "rgba(25,22,18,0.55)";
  for (let t = 0; t < W; t += tw) {
    hx.fillRect(t - 1, 0, 2, H);
    rx.fillRect(t - 1, 0, 2, H);
    x.fillRect(t - 1, 0, 2, H);
  }
  for (let t = 0; t < H; t += tw) {
    hx.fillRect(0, t - 1, W, 2);
    rx.fillRect(0, t - 1, W, 2);
    x.fillRect(0, t - 1, W, 2);
  }
  // normal map
  const hd = hx.getImageData(0, 0, W, H).data;
  const [nc, nx] = cv(W, H);
  const out = nx.createImageData(W, H);
  const h = (i: number, j: number) => hd[(((j + H) % H) * W + ((i + W) % W)) * 4] / 255;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const dx = (h(i + 1, j) - h(i - 1, j)) * 2.2, dy = (h(i, j + 1) - h(i, j - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1), o = (j * W + i) * 4;
      out.data[o] = (-dx / l * 0.5 + 0.5) * 255;
      out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255;
      out.data[o + 2] = (1 / l) * 255;
      out.data[o + 3] = 255;
    }
  nx.putImageData(out, 0, 0);
  return { map: tex(c, true, true), normal: tex(nc, false, true), rough: tex(rc, false, true) };
};

/** candle wax: glowing translucent near the flame, darker down the body (emissive map, v = 1 at the top) */
export const waxGlow = () => {
  const [c, x] = cv(8, 128);
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgb(255,200,130)");
  g.addColorStop(0.12, "rgb(200,120,60)");
  g.addColorStop(0.4, "rgb(50,25,10)");
  g.addColorStop(1, "rgb(0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 8, 128);
  return tex(c, true);
};

/** soft warm pool of light on the floor */
export const poolTex = () => {
  const [c, x] = cv(256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,190,120,0.9)");
  g.addColorStop(0.25, "rgba(255,150,80,0.45)");
  g.addColorStop(0.6, "rgba(255,120,60,0.12)");
  g.addColorStop(1, "rgba(255,110,50,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return tex(c, true);
};
