// Canvas-made textures for «Shahmaran»: silhouettes (+ blurred halos for rim light), flame/glow sprites, serpent
// scales (colour + normal), Persian carpet, tile band, manuscript page, healing leaf.
import * as THREE from "three";
import { rnd } from "./lib";

type Ctx = CanvasRenderingContext2D;
const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const TAU = Math.PI * 2;

// ---------------- sprites ----------------
export const flameTex = () => {
  const [c, x] = cv(128, 256);
  const g = x.createRadialGradient(64, 170, 4, 64, 160, 90);
  g.addColorStop(0, "rgba(255,250,235,1)");
  g.addColorStop(0.25, "rgba(255,214,140,0.95)");
  g.addColorStop(0.55, "rgba(255,140,50,0.55)");
  g.addColorStop(1, "rgba(255,80,10,0)");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(64, 10);
  x.bezierCurveTo(98, 90, 112, 150, 104, 190);
  x.bezierCurveTo(96, 238, 32, 238, 24, 190);
  x.bezierCurveTo(16, 150, 30, 90, 64, 10);
  x.fill();
  return tex(c);
};
export const glowTex = (inner = "rgba(255,220,170,1)", mid = "rgba(255,140,60,0.35)") => {
  const [c, x] = cv(256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.18, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return tex(c);
};
export const dotTex = () => {
  const [c, x] = cv(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return tex(c);
};
/** soft smoke puff */
export const smokeTex = () => {
  const [c, x] = cv(256, 256);
  for (let i = 0; i < 26; i++) {
    const px = 128 + (rnd(i) - 0.5) * 120, py = 128 + (rnd(i + 9) - 0.5) * 120, r = 30 + rnd(i + 3) * 60;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  return tex(c);
};

// ---------------- silhouettes ----------------
export type Sil = { map: THREE.Texture; halo: THREE.Texture; aspect: number };
const finish = (c: HTMLCanvasElement, blur = 9): Sil => {
  const [h, hx] = cv(c.width, c.height);
  hx.filter = `blur(${blur}px)`;
  hx.drawImage(c, 0, 0);
  hx.drawImage(c, 0, 0);
  hx.filter = "none";
  // halo is white; tinted by the material colour
  hx.globalCompositeOperation = "source-in";
  hx.fillStyle = "#fff";
  hx.fillRect(0, 0, c.width, c.height);
  return { map: tex(c), halo: tex(h), aspect: c.width / c.height };
};
const limb = (x: Ctx, pts: number[][], w: number) => {
  x.lineWidth = w;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.stroke();
};
type Pose = { turban?: boolean; helmet?: boolean; spear?: boolean; shield?: boolean; lamp?: boolean; rope?: boolean; torch?: boolean; robe?: number; lean?: number; child?: boolean };
/** standing figure on a 512×1024 canvas, feet at y≈1000 */
export const person = (p: Pose): Sil => {
  const [c, x] = cv(512, 1024);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const s = p.child ? 0.86 : 1;
  x.save();
  x.translate(256, 1000);
  x.scale(s, s);
  x.rotate(p.lean ?? 0);
  x.translate(-256, -1000);
  const hx = 256, hy = 190;
  x.beginPath();
  x.ellipse(hx, hy, 46, 56, 0, 0, TAU);
  x.fill();
  if (p.turban) {
    x.beginPath();
    x.ellipse(hx, hy - 34, 60, 40, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.ellipse(hx + 8, hy - 62, 34, 26, 0.3, 0, TAU);
    x.fill();
  }
  if (p.helmet) {
    x.beginPath();
    x.moveTo(hx - 58, hy - 8);
    x.quadraticCurveTo(hx - 56, hy - 92, hx, hy - 110);
    x.lineTo(hx + 3, hy - 160);
    x.lineTo(hx + 8, hy - 110);
    x.quadraticCurveTo(hx + 58, hy - 92, hx + 58, hy - 8);
    x.closePath();
    x.fill();
    x.fillRect(hx - 60, hy - 14, 120, 18);
    // aventail
    x.beginPath();
    x.moveTo(hx - 54, hy);
    x.lineTo(hx - 70, hy + 90);
    x.lineTo(hx + 70, hy + 90);
    x.lineTo(hx + 54, hy);
    x.fill();
  }
  x.fillRect(hx - 22, hy + 40, 44, 50);
  const robe = p.robe ?? 1;
  x.beginPath();
  x.moveTo(hx - 98, 290);
  x.bezierCurveTo(hx - 60, 262, hx + 60, 262, hx + 98, 290);
  x.bezierCurveTo(hx + 108, 420, hx + 82, 520, hx + 76, 560);
  x.bezierCurveTo(hx + 100 * robe, 760, hx + 128 * robe, 900, hx + 140 * robe, 985);
  x.lineTo(hx - 140 * robe, 985);
  x.bezierCurveTo(hx - 128 * robe, 900, hx - 100 * robe, 760, hx - 76, 560);
  x.bezierCurveTo(hx - 82, 520, hx - 108, 420, hx - 98, 290);
  x.fill();
  x.beginPath();
  x.ellipse(hx - 60, 992, 40, 14, 0, 0, TAU);
  x.ellipse(hx + 60, 992, 40, 14, 0, 0, TAU);
  x.fill();
  // arms
  const L = [[hx - 88, 310], [hx - 118, 470], [hx - 104, 600]];
  let R = [[hx + 88, 310], [hx + 118, 470], [hx + 104, 600]];
  if (p.lamp) R = [[hx + 88, 310], [hx + 150, 430], [hx + 200, 400]];
  if (p.spear || p.torch) R = [[hx + 88, 310], [hx + 150, 420], [hx + 150, 330]];
  if (p.rope) R = [[hx + 88, 310], [hx + 150, 440], [hx + 196, 520]];
  limb(x, L, 44);
  limb(x, R, 44);
  if (p.lamp) {
    x.beginPath();
    x.ellipse(hx + 214, 392, 34, 14, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(hx + 240, 388);
    x.lineTo(hx + 262, 380);
    x.lineTo(hx + 244, 398);
    x.fill();
  }
  if (p.spear) {
    limb(x, [[hx + 150, 980], [hx + 150, 20]], 12);
    x.beginPath();
    x.moveTo(hx + 150, -10);
    x.lineTo(hx + 166, 40);
    x.lineTo(hx + 134, 40);
    x.fill();
  }
  if (p.torch) limb(x, [[hx + 150, 470], [hx + 162, 250]], 18);
  if (p.shield) {
    x.beginPath();
    x.arc(hx - 112, 520, 92, 0, TAU);
    x.fill();
  }
  if (p.rope) {
    x.lineWidth = 7;
    x.beginPath();
    x.moveTo(hx + 196, 520);
    x.bezierCurveTo(hx + 240, 700, hx + 200, 900, hx + 250, 1020);
    x.stroke();
  }
  x.restore();
  return finish(c);
};

/** heads and shoulders leaning over the well rim, seen from the bottom (against the sky) */
export const peek = (seed: number): Sil => {
  const [c, x] = cv(512, 512);
  x.fillStyle = "#000";
  x.beginPath();
  x.ellipse(256, 470, 220, 110, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.ellipse(256, 300, 92, 104, 0, 0, TAU);
  x.fill();
  // turban rim seen from below
  x.beginPath();
  x.ellipse(256 + (rnd(seed) - 0.5) * 20, 222, 118, 72, (rnd(seed + 2) - 0.5) * 0.3, 0, TAU);
  x.fill();
  // nose / chin hint
  x.beginPath();
  x.ellipse(256, 392, 40, 30, 0, 0, TAU);
  x.fill();
  return finish(c, 8);
};

/** the queen: crowned woman, long hair, torso that tapers into the serpent */
export const queen = (): Sil => {
  const [c, x] = cv(1024, 1280);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const hx = 512, hy = 300;
  // hair falling behind
  x.beginPath();
  x.moveTo(hx - 70, hy - 40);
  x.bezierCurveTo(hx - 170, hy + 160, hx - 210, hy + 420, hx - 250, hy + 700);
  x.lineTo(hx + 250, hy + 700);
  x.bezierCurveTo(hx + 210, hy + 420, hx + 170, hy + 160, hx + 70, hy - 40);
  x.fill();
  x.beginPath();
  x.ellipse(hx, hy, 70, 88, 0, 0, TAU);
  x.fill();
  // crown: band + seven points
  x.fillRect(hx - 78, hy - 96, 156, 30);
  for (let i = 0; i < 7; i++) {
    const px = hx - 72 + i * 24, ph = i === 3 ? 120 : i % 2 ? 60 : 84;
    x.beginPath();
    x.moveTo(px - 11, hy - 90);
    x.lineTo(px, hy - 90 - ph);
    x.lineTo(px + 11, hy - 90);
    x.fill();
  }
  x.fillRect(hx - 30, hy + 70, 60, 70);
  // shoulders, arms opening outward, waist to serpent
  x.beginPath();
  x.moveTo(hx - 170, hy + 170);
  x.bezierCurveTo(hx - 100, hy + 120, hx + 100, hy + 120, hx + 170, hy + 170);
  x.bezierCurveTo(hx + 150, hy + 360, hx + 100, hy + 500, hx + 120, hy + 640);
  x.bezierCurveTo(hx + 170, hy + 820, hx + 260, hy + 900, hx + 380, hy + 980);
  x.lineTo(hx - 380, hy + 980);
  x.bezierCurveTo(hx - 260, hy + 900, hx - 170, hy + 820, hx - 120, hy + 640);
  x.bezierCurveTo(hx - 100, hy + 500, hx - 150, hy + 360, hx - 170, hy + 170);
  x.fill();
  limb(x, [[hx - 150, hy + 190], [hx - 280, hy + 360], [hx - 400, hy + 400]], 52);
  limb(x, [[hx + 150, hy + 190], [hx + 280, hy + 360], [hx + 400, hy + 400]], 52);
  // flowing veil strands
  x.lineWidth = 10;
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.moveTo(hx - 60 + i * 24, hy + 40);
    x.bezierCurveTo(hx - 200 + i * 80, hy + 300, hx - 300 + i * 120, hy + 520, hx - 340 + i * 136, hy + 760);
    x.stroke();
  }
  return finish(c, 13);
};

/** the dying king lying in profile (head left) */
export const kingLying = (): Sil => {
  const [c, x] = cv(1024, 384);
  x.fillStyle = "#000";
  // body under the blanket
  x.beginPath();
  x.moveTo(230, 300);
  x.bezierCurveTo(300, 200, 520, 205, 640, 232);
  x.bezierCurveTo(760, 250, 860, 230, 950, 270);
  x.lineTo(960, 330);
  x.lineTo(220, 330);
  x.fill();
  // head on the pillow, nose up, beard
  x.beginPath();
  x.ellipse(170, 262, 62, 50, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.moveTo(206, 232);
  x.lineTo(236, 214);
  x.lineTo(222, 250);
  x.fill();
  x.beginPath();
  x.ellipse(232, 288, 46, 26, 0.4, 0, TAU);
  x.fill();
  // crown (tilted)
  x.save();
  x.translate(118, 238);
  x.rotate(-1.35);
  x.fillRect(-46, -14, 92, 22);
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    x.moveTo(-40 + i * 20 - 8, -12);
    x.lineTo(-40 + i * 20, -54);
    x.lineTo(-40 + i * 20 + 8, -12);
    x.fill();
  }
  x.restore();
  // pillow
  x.beginPath();
  x.ellipse(150, 318, 110, 34, 0, 0, TAU);
  x.fill();
  return finish(c, 8);
};

/** a scholar sitting cross-legged (the grown Jamasp) */
export const sitting = (): Sil => {
  const [c, x] = cv(512, 512);
  x.fillStyle = "#000";
  x.beginPath();
  x.ellipse(256, 150, 40, 48, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.ellipse(256, 112, 54, 34, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.moveTo(170, 230);
  x.bezierCurveTo(210, 200, 302, 200, 342, 230);
  x.bezierCurveTo(360, 330, 350, 380, 360, 400);
  x.lineTo(152, 400);
  x.bezierCurveTo(162, 380, 152, 330, 170, 230);
  x.fill();
  x.beginPath();
  x.ellipse(256, 430, 200, 60, 0, 0, TAU);
  x.fill();
  limb(x, [[180, 250], [150, 350], [230, 390]], 36);
  limb(x, [[332, 250], [362, 350], [282, 390]], 36);
  return finish(c, 7);
};

// ---------------- serpent scales ----------------
/** scale pattern: returns colour + normal textures (tiles in both directions) */
export const scaleTex = () => {
  const N = 1024, cols = 16, rows = 16;
  const [c, x] = cv(N, N);
  const [, hxx] = cv(N, N);
  x.fillStyle = "#06100f";
  x.fillRect(0, 0, N, N);
  hxx.fillStyle = "#000";
  hxx.fillRect(0, 0, N, N);
  const cw = N / cols, rh = N / rows;
  const palette = ["#0e3a40", "#123f52", "#0b2e3a", "#164a4d", "#1a3550"];
  for (let r = rows; r >= -1; r--) {
    for (let q = -1; q <= cols; q++) {
      const cx = (q + (r % 2 ? 0.5 : 0)) * cw, cy = r * rh;
      const k = Math.abs((q * 7 + r * 13) | 0);
      // colour scale
      const g = x.createRadialGradient(cx, cy - rh * 0.1, 2, cx, cy, cw * 0.7);
      g.addColorStop(0, palette[k % palette.length]);
      g.addColorStop(1, "#020606");
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(cx - cw * 0.56, cy - rh * 0.2);
      x.quadraticCurveTo(cx - cw * 0.56, cy + rh * 0.95, cx, cy + rh * 1.05);
      x.quadraticCurveTo(cx + cw * 0.56, cy + rh * 0.95, cx + cw * 0.56, cy - rh * 0.2);
      x.closePath();
      x.fill();
      // gold rim
      x.strokeStyle = "rgba(214,170,90,0.85)";
      x.lineWidth = 2.2;
      x.beginPath();
      x.moveTo(cx - cw * 0.56, cy - rh * 0.2);
      x.quadraticCurveTo(cx - cw * 0.56, cy + rh * 0.95, cx, cy + rh * 1.05);
      x.quadraticCurveTo(cx + cw * 0.56, cy + rh * 0.95, cx + cw * 0.56, cy - rh * 0.2);
      x.stroke();
      // tile motif on some scales: small eight-point star
      if (rnd(k + r * 3.1) > 0.55) {
        x.save();
        x.translate(cx, cy + rh * 0.42);
        x.fillStyle = rnd(k) > 0.5 ? "rgba(225,190,110,0.9)" : "rgba(120,200,200,0.75)";
        for (let s = 0; s < 2; s++) {
          x.rotate(Math.PI / 4);
          x.fillRect(-cw * 0.12, -cw * 0.12, cw * 0.24, cw * 0.24);
        }
        x.restore();
      }
      // height: dome
      const hg = hxx.createRadialGradient(cx, cy + rh * 0.35, 1, cx, cy + rh * 0.35, cw * 0.62);
      hg.addColorStop(0, "#fff");
      hg.addColorStop(1, "#000");
      hxx.fillStyle = hg;
      hxx.beginPath();
      hxx.moveTo(cx - cw * 0.56, cy - rh * 0.2);
      hxx.quadraticCurveTo(cx - cw * 0.56, cy + rh * 0.95, cx, cy + rh * 1.05);
      hxx.quadraticCurveTo(cx + cw * 0.56, cy + rh * 0.95, cx + cw * 0.56, cy - rh * 0.2);
      hxx.closePath();
      hxx.fill();
    }
  }
  // normal map from the height field
  const hd = hxx.getImageData(0, 0, N, N).data;
  const [nc, nx] = cv(N, N);
  const out = nx.createImageData(N, N);
  const H = (i: number, j: number) => hd[(((j + N) % N) * N + ((i + N) % N)) * 4] / 255;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const dx = (H(i + 1, j) - H(i - 1, j)) * 3.2, dy = (H(i, j + 1) - H(i, j - 1)) * 3.2;
      const l = Math.hypot(dx, dy, 1);
      const o = (j * N + i) * 4;
      out.data[o] = ((-dx / l) * 0.5 + 0.5) * 255;
      out.data[o + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      out.data[o + 2] = (1 / l) * 255;
      out.data[o + 3] = 255;
    }
  nx.putImageData(out, 0, 0);
  const map = tex(c), normal = tex(nc, false);
  for (const t of [map, normal]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { map, normal };
};

// ---------------- Persian carpet ----------------
export const carpetTex = () => {
  const [c, x] = cv(1024, 1536);
  const W = 1024, H = 1536;
  x.fillStyle = "#4a0e10";
  x.fillRect(0, 0, W, H);
  const band = (inset: number, w: number, col: string) => {
    x.strokeStyle = col;
    x.lineWidth = w;
    x.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };
  band(30, 40, "#1b1d3a");
  band(70, 10, "#c9a050");
  band(100, 34, "#6a1518");
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const along = (u: number, side: number): [number, number] => (side === 0 ? [100 + u * (W - 200), 100] : side === 1 ? [W - 100, 100 + u * (H - 200)] : side === 2 ? [W - 100 - u * (W - 200), H - 100] : [100, H - 100 - u * (H - 200)]);
    for (let s = 0; s < 4; s++) {
      const [px, py] = along(t, s);
      x.fillStyle = i % 2 ? "#d7b46a" : "#2c3466";
      x.beginPath();
      x.arc(px, py, 9, 0, TAU);
      x.fill();
    }
  }
  // field flowers
  for (let i = 0; i < 260; i++) {
    const px = 150 + rnd(i) * (W - 300), py = 150 + rnd(i + 5) * (H - 300);
    x.fillStyle = ["#c9a050", "#2c3466", "#8a2a22", "#e6dcc0"][i % 4];
    x.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      x.ellipse(px + Math.cos(a) * 8, py + Math.sin(a) * 8, 6, 3, a, 0, TAU);
    }
    x.fill();
  }
  // central medallion
  x.save();
  x.translate(W / 2, H / 2);
  for (let r = 0; r < 4; r++) {
    x.fillStyle = ["#1b1d3a", "#c9a050", "#6a1518", "#e6dcc0"][r];
    const R = 330 - r * 70;
    x.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, rr = k % 2 ? R * 0.78 : R;
      x.lineTo(Math.cos(a) * rr * 0.8, Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
  }
  x.restore();
  return tex(c);
};

/** turquoise/cobalt girih tile band (repeats in U) */
export const tileTex = () => {
  const [c, x] = cv(512, 512);
  x.fillStyle = "#0d2b3a";
  x.fillRect(0, 0, 512, 512);
  const star = (cx: number, cy: number, R: number, col: string) => {
    x.fillStyle = col;
    x.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, rr = k % 2 ? R * 0.62 : R;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
  };
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const cx = i * 256, cy = j * 256;
      star(cx, cy, 110, "#e8dfc8");
      star(cx, cy, 80, "#1f6f78");
      star(cx, cy, 40, "#c9a050");
      star(cx + 128, cy + 128, 60, "#173d6e");
    }
  x.strokeStyle = "#c9a050";
  x.lineWidth = 4;
  for (let k = 0; k < 9; k++) {
    x.beginPath();
    x.moveTo(k * 64, 0);
    x.lineTo(k * 64 - 512, 512);
    x.moveTo(k * 64, 0);
    x.lineTo(k * 64 + 512, 512);
    x.stroke();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** an old manuscript page of remedies */
export const pageTex = (seed: number) => {
  const [c, x] = cv(512, 700);
  const g = x.createRadialGradient(256, 350, 50, 256, 350, 420);
  g.addColorStop(0, "#e9d8b0");
  g.addColorStop(1, "#a88a55");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 700);
  x.strokeStyle = "#8a6a2a";
  x.lineWidth = 6;
  x.strokeRect(26, 26, 460, 648);
  x.lineWidth = 2;
  x.strokeRect(38, 38, 436, 624);
  x.fillStyle = "#3a2410";
  x.font = "30px Vazir29";
  x.direction = "rtl";
  x.textAlign = "right";
  const lines = ["در شناختِ گیاهانِ درمان", "برگِ این گیاه تب را می‌بُرد", "و ریشه‌اش زهر را بی‌اثر می‌کند", "به سه روز بجوشان و بنوش"];
  lines.forEach((l, i) => x.fillText(l, 450, 90 + i * 48));
  // herb drawing
  x.strokeStyle = "#4a3a18";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(256, 640);
  x.bezierCurveTo(250 + (rnd(seed) - 0.5) * 60, 520, 270, 420, 256, 300);
  x.stroke();
  for (let i = 0; i < 7; i++) {
    const y = 600 - i * 45, s = i % 2 ? 1 : -1;
    x.fillStyle = "rgba(70,90,40,0.75)";
    x.beginPath();
    x.ellipse(256 + s * 46, y, 44, 16, s * -0.5, 0, TAU);
    x.fill();
    x.stroke();
  }
  x.fillStyle = "#8a2a1a";
  x.beginPath();
  x.arc(256, 292, 18, 0, TAU);
  x.fill();
  return tex(c);
};

/** a glowing healing leaf */
export const leafTex = () => {
  const [c, x] = cv(256, 256);
  const g = x.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#d9c46a");
  g.addColorStop(1, "#5a7a2a");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(128, 10);
  x.bezierCurveTo(230, 80, 220, 200, 128, 246);
  x.bezierCurveTo(36, 200, 26, 80, 128, 10);
  x.fill();
  x.strokeStyle = "rgba(255,240,180,0.9)";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(128, 20);
  x.lineTo(128, 240);
  for (let i = 1; i < 6; i++) {
    x.moveTo(128, 40 + i * 34);
    x.lineTo(70, 10 + i * 34);
    x.moveTo(128, 40 + i * 34);
    x.lineTo(186, 10 + i * 34);
  }
  x.stroke();
  return tex(c);
};
