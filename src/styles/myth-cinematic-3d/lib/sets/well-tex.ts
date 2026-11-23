// Canvas textures for the well set: backlit standing men (R = blurred alpha for the rim, G = sharp alpha), heads
// peering over the rim seen from below, and a twisted hemp rope.
import * as THREE from "three";
import { rnd } from "../lib";

const TAU = Math.PI * 2;
const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};
type X = CanvasRenderingContext2D;
type P = [number, number];

const limb = (x: X, pts: P[], w0: number, w1 = w0) => {
  // a tapering stroke drawn as overlapping round segments
  const n = 24;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (let k = 0; k <= n; k++) {
      const s = k / n, g = (i + s) / (pts.length - 1);
      x.beginPath();
      x.arc(ax + (bx - ax) * s, ay + (by - ay) * s, (w0 + (w1 - w0) * g) / 2, 0, TAU);
      x.fill();
    }
  }
};
const ell = (x: X, cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  x.fill();
};

/** packs a white-on-black canvas into R = blurred, G = sharp (alphaMap reads G) */
const pack = (c: HTMLCanvasElement, blur: number) => {
  const [, bx] = cv(c.width, c.height);
  bx.fillStyle = "#000";
  bx.fillRect(0, 0, c.width, c.height);
  bx.filter = `blur(${blur}px)`;
  bx.drawImage(c, 0, 0);
  bx.filter = "none";
  const sd = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
  const bd = bx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < sd.data.length; i += 4) {
    sd.data[i + 1] = sd.data[i];
    sd.data[i] = bd.data[i];
    sd.data[i + 2] = 0;
    sd.data[i + 3] = 255;
  }
  c.getContext("2d")!.putImageData(sd, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
};

export type ManPose = "rope" | "staff" | "lean";

/** a man in a long robe and a head-wrap, standing (512×1024, feet at y≈1000) */
export const man = (pose: ManPose, seed: number) => {
  const [c, x] = cv(512, 1024);
  x.fillStyle = "#000";
  x.fillRect(0, 0, 512, 1024);
  x.fillStyle = "#fff";
  x.strokeStyle = "#fff";
  const j = (k: number, a: number) => (rnd(seed * 31 + k) - 0.5) * a;
  const cx = 256;
  if (pose === "lean") {
    // bent over the rim, hands on it, head low between the shoulders
    x.save();
    x.translate(cx, 1000);
    // legs and robe from the hips down
    x.beginPath();
    x.moveTo(-92, -470);
    x.bezierCurveTo(-110, -330, -126, -160, -136, -14);
    for (let i = 0; i <= 8; i++) x.lineTo(-136 + i * 34, -14 + (i % 2 ? 9 : 0) + j(i, 6));
    x.bezierCurveTo(124, -170, 108, -330, 94, -470);
    x.closePath();
    x.fill();
    // bent back: hips to hunched shoulders
    x.beginPath();
    x.moveTo(-96, -470);
    x.bezierCurveTo(-120, -560, -132, -610, -118, -650);
    x.bezierCurveTo(-60, -690, 60, -690, 118, -650);
    x.bezierCurveTo(132, -610, 120, -560, 96, -470);
    x.closePath();
    x.fill();
    // arms down to the rim
    limb(x, [[-112, -640], [-128, -560], [-120, -470]], 46, 34);
    limb(x, [[112, -640], [130, -560], [124, -472]], 46, 34);
    ell(x, -120, -462, 20, 14);
    ell(x, 124, -464, 20, 14);
    // head lowered, wrap on top
    ell(x, 6, -640, 50, 54);
    ell(x, 10, -676, 62, 40, 0.15);
    ell(x, 40, -700, 30, 20, 0.5);
    x.restore();
  } else {
    const lean = pose === "rope" ? -0.07 : 0.02;
    x.save();
    x.translate(cx, 1000);
    x.rotate(lean);
    // robe (shoulders → hem), a little flare and fold ripples at the hem
    const hemL = pose === "staff" ? -150 : -134, hemR = pose === "staff" ? 146 : 132;
    x.beginPath();
    x.moveTo(-102, -740);
    x.bezierCurveTo(-108, -680, -100, -610, -88, -530);
    x.bezierCurveTo(-96, -450, -112, -300, hemL + 8, -150);
    x.bezierCurveTo(hemL, -80, hemL - 4, -40, hemL, -14);
    for (let i = 0; i <= 10; i++) x.lineTo(hemL + (i * (hemR - hemL)) / 10, -14 + (i % 2 ? 10 : 0) + j(i, 8));
    x.bezierCurveTo(hemR + 2, -60, hemR - 6, -120, hemR - 10, -170);
    x.bezierCurveTo(108, -320, 94, -450, 88, -530);
    x.bezierCurveTo(100, -610, 110, -680, 102, -740);
    x.bezierCurveTo(70, -770, 30, -778, 0, -778);
    x.bezierCurveTo(-30, -778, -70, -770, -102, -740);
    x.fill();
    if (pose === "staff") {
      // a cloak over the shoulders, wider and longer at the back
      x.beginPath();
      x.moveTo(-108, -748);
      x.bezierCurveTo(-140, -640, -150, -420, -146, -170);
      x.lineTo(-112, -180);
      x.lineTo(-96, -560);
      x.lineTo(96, -560);
      x.lineTo(114, -190);
      x.lineTo(144, -180);
      x.bezierCurveTo(146, -420, 136, -640, 108, -748);
      x.fill();
    }
    // feet
    ell(x, -48, -8, 34, 11);
    ell(x, 52, -8, 34, 11);
    // neck + head + wrap with a tail
    x.fillRect(-21, -812, 42, 50);
    const hx = j(20, 8);
    ell(x, hx, -856, 44, 56);
    // a bulbous wrapped turban, its tail hanging to the shoulder, a beard
    ell(x, hx, -893, 54, 40);
    ell(x, hx - 12, -910, 40, 28, -0.3 + j(21, 0.2));
    ell(x, hx + 14, -906, 38, 27, 0.35);
    limb(x, [[hx + 34, -884], [hx + 56, -826], [hx + 62, -772]], 22, 12);
    ell(x, hx - 6, -808, 26, 24);
    // arms
    if (pose === "rope") {
      // both hands up and forward on the rope (toward the pulley, upper left)
      limb(x, [[-96, -728], [-150, -820], [-190, -910]], 44, 30);
      limb(x, [[96, -728], [40, -800], [-120, -860]], 44, 30);
      ell(x, -194, -918, 20, 16);
      ell(x, -126, -864, 20, 16);
    } else {
      limb(x, [[-98, -730], [-128, -560], [-150, -440]], 46, 32);
      limb(x, [[98, -730], [118, -560], [108, -420]], 46, 32);
      ell(x, -152, -430, 19, 22);
      ell(x, 108, -410, 18, 22);
      // the staff
      x.lineWidth = 15;
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(-170, -6);
      x.lineTo(-146, -985);
      x.stroke();
    }
    x.restore();
  }
  return pack(c, 7);
};

/** a head and shoulders leaning over the rim, seen from straight below (512², body at the bottom edge) */
export const peekBelow = (kind: 0 | 1 | 2) => {
  const [c, x] = cv(512, 512);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  // shoulders and chest, continuing past the rim (bottom edge)
  ell(x, 256, 520, 230, 150);
  if (kind === 0) {
    // a bearded man in profile, looking down into the well: turban, brow, nose, lips, beard
    x.fillRect(226, 380, 70, 80);
    ell(x, 278, 300, 70, 78);
    x.beginPath();
    x.moveTo(240, 236);
    x.quadraticCurveTo(212, 244, 206, 270);
    x.lineTo(196, 286);
    x.lineTo(200, 294);
    x.lineTo(166, 322);
    x.lineTo(172, 330);
    x.lineTo(194, 330);
    x.lineTo(190, 342);
    x.lineTo(198, 346);
    x.lineTo(192, 360);
    x.quadraticCurveTo(170, 402, 186, 428);
    x.quadraticCurveTo(212, 446, 252, 428);
    x.lineTo(290, 380);
    x.lineTo(270, 250);
    x.closePath();
    x.fill();
    // turban wound over the back of the head, a loose tail
    ell(x, 302, 262, 84, 60, -0.45);
    ell(x, 318, 230, 56, 38, -0.2);
    ell(x, 340, 290, 46, 40, 0.3);
    limb(x, [[360, 300], [392, 360], [400, 430]], 26, 16);
    // forearm resting on the rim
    limb(x, [[110, 480], [84, 400], [76, 352]], 44, 32);
    ell(x, 76, 342, 24, 20);
  } else if (kind === 1) {
    // looking straight down, a head-cloth hanging toward us, one hand on the rope
    x.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU, r = 108 + 14 * Math.sin(a * 5 + 1) + 8 * Math.sin(a * 11);
      x.lineTo(256 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.9);
    }
    x.fill();
    ell(x, 256, 300, 66, 70);
    limb(x, [[370, 470], [392, 360], [372, 250]], 42, 30);
    ell(x, 370, 240, 22, 26);
  } else {
    // an arm reaching in with a knife, a head behind it
    ell(x, 170, 380, 64, 70);
    ell(x, 160, 350, 82, 62, -0.3);
    limb(x, [[390, 520], [356, 380], [300, 262]], 52, 34);
    ell(x, 296, 252, 26, 30, 0.5);
    x.beginPath();
    x.moveTo(286, 238);
    x.lineTo(232, 150);
    x.lineTo(304, 226);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
};

/** twisted three-strand hemp rope: x (256 px) along the rope = 4 circumferences, y (64 px) around */
export const ropeTex = () => {
  const [c, x] = cv(256, 64);
  const im = x.createImageData(256, 64);
  for (let py = 0; py < 64; py++)
    for (let px = 0; px < 256; px++) {
      const ph = (px - 2 * py) / 42.6667;
      const f = ph - Math.floor(ph);
      const band = Math.sin(Math.PI * f) ** 0.6;
      const fib = 0.85 + 0.3 * rnd(px * 7 + py * 263) * (0.5 + 0.5 * Math.sin((px + py * 0.5) * 1.7));
      const k = (0.32 + 0.8 * band) * fib;
      const o = (py * 256 + px) * 4;
      im.data[o] = Math.min(255, 128 * k);
      im.data[o + 1] = Math.min(255, 98 * k);
      im.data[o + 2] = Math.min(255, 62 * k);
      im.data[o + 3] = 255;
    }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
};

/** the boy hanging on the rope by his hands, being lowered (256×512; hands at the top, feet at y≈495) */
export const boyHang = () => {
  const [c, x] = cv(256, 512);
  x.fillStyle = "#000";
  x.fillRect(0, 0, 256, 512);
  x.fillStyle = "#fff";
  x.strokeStyle = "#fff";
  const cx = 128;
  // rope above the hands
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(cx, 0);
  x.lineTo(cx, 60);
  x.stroke();
  // arms raised to the rope, hands one above the other
  limb(x, [[cx - 30, 216], [cx - 24, 128], [cx - 4, 58]], 17, 12);
  limb(x, [[cx + 30, 216], [cx + 22, 124], [cx + 3, 34]], 17, 12);
  ell(x, cx - 2, 54, 9, 12);
  ell(x, cx + 2, 30, 9, 12);
  // head with a small wrapped cloth, neck
  x.fillRect(cx - 8, 186, 16, 26);
  ell(x, cx, 172, 19, 23);
  ell(x, cx + 1, 154, 22, 14);
  ell(x, cx + 9, 146, 9, 7, 0.4);
  // tunic to mid-calf, a little flare, sash
  x.beginPath();
  x.moveTo(cx - 34, 214);
  x.bezierCurveTo(cx - 34, 250, cx - 28, 280, cx - 27, 300);
  x.bezierCurveTo(cx - 30, 340, cx - 38, 380, cx - 40, 405);
  for (let i = 0; i <= 8; i++) x.lineTo(cx - 40 + i * 10, 405 + (i % 2 ? 4 : 0));
  x.bezierCurveTo(cx + 38, 380, cx + 30, 340, cx + 27, 300);
  x.bezierCurveTo(cx + 28, 280, cx + 34, 250, cx + 34, 214);
  x.bezierCurveTo(cx + 20, 204, cx - 20, 204, cx - 34, 214);
  x.fill();
  // trousers, ankles, sandalled feet dangling
  limb(x, [[cx - 11, 400], [cx - 12, 470]], 15, 12);
  limb(x, [[cx + 11, 400], [cx + 13, 468]], 15, 12);
  ell(x, cx - 14, 484, 8, 13, 0.25);
  ell(x, cx + 15, 482, 8, 13, -0.2);
  return pack(c, 4);
};

/**
 * a man leaning over the rim, in profile against the sky (512²; shoulders at the bottom edge, head up, face to the
 * left). kind 0 watches, kind 1 hauls the rope hand over hand, kind 2 reaches in with a knife.
 * Returns the packed silhouette (R blurred, G sharp) and canvas points of interest.
 */
export const peekProfile = (kind: 0 | 1 | 2) => {
  const [c, x] = cv(512, 512);
  x.fillStyle = "#000";
  x.fillRect(0, 0, 512, 512);
  x.fillStyle = "#fff";
  x.strokeStyle = "#fff";
  // shoulders and back, continuing past the rim
  ell(x, 300, 540, 235, 165, -0.1);
  // neck bent forward
  limb(x, [[262, 420], [240, 330]], 74, 58);
  // skull, tipped forward
  ell(x, 246, 258, 66, 76, -0.35);
  // face: brow, nose, lips, chin, then a full beard back to the neck
  x.beginPath();
  x.moveTo(214, 196);
  x.quadraticCurveTo(184, 204, 178, 226);
  x.lineTo(170, 240);
  x.lineTo(176, 248);
  x.lineTo(146, 274);
  x.lineTo(150, 282);
  x.lineTo(170, 282);
  x.lineTo(166, 294);
  x.lineTo(174, 298);
  x.lineTo(168, 312);
  x.quadraticCurveTo(150, 352, 170, 380);
  x.quadraticCurveTo(200, 398, 236, 372);
  x.lineTo(262, 330);
  x.lineTo(250, 210);
  x.closePath();
  x.fill();
  // turban wound over the crown and the back of the head, its tail hanging behind
  ell(x, 270, 204, 86, 58, -0.38);
  ell(x, 296, 176, 60, 40, -0.5);
  ell(x, 234, 190, 46, 30, -0.2);
  limb(x, [[322, 226], [350, 290], [356, 352]], 30, 18);
  const pts: { hand?: [number, number]; tip?: [number, number] } = {};
  if (kind === 0) {
    // forearm resting on the rim
    limb(x, [[176, 470], [110, 452], [74, 436]], 46, 36);
    ell(x, 64, 432, 24, 18);
  } else if (kind === 1) {
    // both hands up on the haul rope in front of his face
    limb(x, [[200, 440], [140, 360], [104, 296]], 44, 32);
    limb(x, [[236, 452], [168, 400], [112, 352]], 44, 32);
    ell(x, 100, 288, 22, 26, 0.3);
    ell(x, 108, 348, 22, 26, 0.3);
    pts.hand = [104, 300];
  } else {
    // an arm reaching in, a knife at the end of it
    limb(x, [[196, 450], [120, 404], [62, 372]], 46, 34);
    ell(x, 54, 366, 24, 20, 0.4);
    x.beginPath();
    x.moveTo(44, 352);
    x.lineTo(6, 300);
    x.lineTo(52, 342);
    x.fill();
    pts.tip = [10, 304];
  }
  return { tex: pack(c, 6), pts };
};
