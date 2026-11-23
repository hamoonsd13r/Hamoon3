// Canvas textures for the C sets: a woven Persian medallion carpet, star-and-cross glazed tiles (+ normal map),
// a window lattice (moonlight cookie) and the night sky behind it.
import * as THREE from "three";
import { rnd } from "../lib";

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
type C2 = CanvasRenderingContext2D;

/** a palmette / flower head */
const palmette = (x: C2, s: number, a: string, b: string) => {
  x.fillStyle = a;
  x.beginPath();
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI / 2 + (k - 3) * 0.38;
    x.ellipse(Math.cos(ang) * s * 0.55, Math.sin(ang) * s * 0.55, s * 0.42, s * 0.16, ang, 0, TAU);
  }
  x.fill();
  x.fillStyle = b;
  x.beginPath();
  x.ellipse(0, -s * 0.1, s * 0.3, s * 0.36, 0, 0, TAU);
  x.fill();
};
const rosette = (x: C2, s: number, a: string, b: string) => {
  x.fillStyle = a;
  x.beginPath();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * TAU;
    x.ellipse(Math.cos(ang) * s * 0.5, Math.sin(ang) * s * 0.5, s * 0.36, s * 0.2, ang, 0, TAU);
  }
  x.fill();
  x.fillStyle = b;
  x.beginPath();
  x.arc(0, 0, s * 0.3, 0, TAU);
  x.fill();
};

/** Persian medallion carpet: madder field with dense scrollwork, indigo medallion and corners, borders. Mirrored 4 ways. */
export const carpetC = () => {
  const W = 1024, H = 1536;
  const [c, x] = cv(W, H);
  const field = "#5a1414", ink = "#1c1f3a", ivory = "#c9b48a", gold = "#a87a32", blue = "#2c3b62", green = "#2f4a3a", rose = "#8a3a2c";
  // ---- one quadrant, then mirrored ----
  const [q, qx] = cv(W / 2, H / 2);
  qx.fillStyle = field;
  qx.fillRect(0, 0, W / 2, H / 2);
  // scrolling vines: arabesque spirals with leaves and flowers (structured, low contrast)
  qx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const px = 70 + rnd(i * 3.3) * (W / 2 - 80), py = 70 + rnd(i * 7.1 + 1) * (H / 2 - 80);
    const r0 = 24 + rnd(i * 1.7) * 30, dir = rnd(i) > 0.5 ? 1 : -1;
    qx.strokeStyle = rnd(i * 5.5) > 0.5 ? "rgba(201,180,138,0.55)" : "rgba(168,122,50,0.6)";
    qx.lineWidth = 3;
    qx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * TAU * 1.3 * dir + rnd(i) * TAU;
      const rr = r0 * (1 - (k / 40) * 0.75);
      const xx = px + Math.cos(a) * rr, yy = py + Math.sin(a) * rr;
      if (k === 0) qx.moveTo(xx, yy);
      else qx.lineTo(xx, yy);
    }
    qx.stroke();
    // leaves on the vine
    for (let k = 0; k < 3; k++) {
      const a = rnd(i * 9 + k) * TAU;
      qx.save();
      qx.translate(px + Math.cos(a) * r0 * 0.9, py + Math.sin(a) * r0 * 0.9);
      qx.rotate(a + 1.2);
      qx.fillStyle = k % 2 ? green : blue;
      qx.beginPath();
      qx.ellipse(0, 0, 11, 4.5, 0, 0, TAU);
      qx.fill();
      qx.restore();
    }
  }
  // flower heads on a loose lattice
  for (let j = 0; j < 7; j++)
    for (let i = 0; i < 5; i++) {
      const px = 50 + i * 100 + (j % 2) * 50, py = 50 + j * 105;
      qx.save();
      qx.translate(px, py);
      qx.rotate(((i + j) % 4) * (Math.PI / 2));
      if ((i + j) % 2) palmette(qx, 22, ivory, rose);
      else rosette(qx, 16, gold, blue);
      qx.restore();
    }
  // corner spandrel (indigo) with its own flowers — at the quadrant's outer corner
  qx.fillStyle = ink;
  qx.beginPath();
  qx.moveTo(0, 0);
  qx.lineTo(330, 0);
  qx.bezierCurveTo(300, 90, 200, 120, 160, 180);
  qx.bezierCurveTo(120, 240, 90, 330, 0, 380);
  qx.closePath();
  qx.fill();
  qx.strokeStyle = gold;
  qx.lineWidth = 5;
  qx.stroke();
  for (let i = 0; i < 9; i++) {
    qx.save();
    qx.translate(30 + rnd(i * 2.1) * 180, 30 + rnd(i * 4.3) * 180);
    rosette(qx, 9 + rnd(i) * 6, i % 2 ? ivory : gold, rose);
    qx.restore();
  }
  // half of the central medallion sits at the quadrant's inner corner
  qx.save();
  qx.translate(W / 2, H / 2);
  const lob = (R: number, col: string) => {
    qx.fillStyle = col;
    qx.beginPath();
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * TAU;
      const rr = R * (1 + 0.12 * Math.cos(a * 8));
      qx.lineTo(Math.cos(a) * rr * 0.72, Math.sin(a) * rr);
    }
    qx.closePath();
    qx.fill();
  };
  lob(250, gold);
  lob(238, ink);
  lob(170, ivory);
  lob(160, "#3a1a18");
  lob(80, gold);
  lob(70, blue);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    qx.save();
    qx.translate(Math.cos(a) * 120 * 0.72, Math.sin(a) * 120);
    qx.rotate(a + Math.PI / 2);
    palmette(qx, 18, ivory, rose);
    qx.restore();
  }
  // pendant toward the end of the carpet
  qx.fillStyle = ink;
  qx.beginPath();
  qx.moveTo(-40, -250);
  qx.lineTo(0, -340);
  qx.lineTo(40, -250);
  qx.fill();
  qx.restore();
  // mirror the quadrant into four
  const put = (sx: number, sy: number) => {
    x.save();
    x.translate(sx < 0 ? W : 0, sy < 0 ? H : 0);
    x.scale(sx, sy);
    x.drawImage(q, 0, 0);
    x.restore();
  };
  put(1, 1);
  put(-1, 1);
  put(1, -1);
  put(-1, -1);
  // borders: guard stripes + main border with a repeating flower chain
  const band = (inset: number, w: number, col: string) => {
    x.strokeStyle = col;
    x.lineWidth = w;
    x.strokeRect(inset + w / 2, inset + w / 2, W - inset * 2 - w, H - inset * 2 - w);
  };
  band(0, 22, "#2a1210");
  band(22, 8, ivory);
  band(30, 70, ink);
  band(100, 8, gold);
  band(108, 16, "#3a1a18");
  band(124, 6, ivory);
  const chain = (u: number, side: number): [number, number] => {
    const L = side % 2 ? H - 130 : W - 130;
    const t = 65 + u * L;
    return side === 0 ? [t, 65] : side === 1 ? [W - 65, t] : side === 2 ? [W - t, H - 65] : [65, H - t];
  };
  for (let s = 0; s < 4; s++) {
    const n = s % 2 ? 22 : 15;
    for (let i = 0; i <= n; i++) {
      const [px, py] = chain(i / n, s);
      x.save();
      x.translate(px, py);
      x.rotate((s * Math.PI) / 2);
      if (i % 2) palmette(x, 22, ivory, rose);
      else rosette(x, 16, gold, blue);
      x.restore();
    }
  }
  // soften (woven, not printed), then knots, wear and pile
  const [s2, sx] = cv(W, H);
  sx.filter = "blur(1.2px)";
  sx.drawImage(c, 0, 0);
  const img = sx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const o = (j * W + i) * 4;
      const knot = ((i % 3) === 0 ? 0.9 : 1) * ((j % 3) === 0 ? 0.92 : 1);
      const wear = 1 + 0.18 * (Math.sin(i * 0.011 + j * 0.004) * Math.sin(j * 0.009 - i * 0.003)) + (rnd(i * 13.1 + j * 7.7) - 0.5) * 0.14;
      const k = knot * wear;
      d[o] = Math.min(255, d[o] * k);
      d[o + 1] = Math.min(255, d[o + 1] * k);
      d[o + 2] = Math.min(255, d[o + 2] * k);
    }
  sx.putImageData(img, 0, 0);
  return tex(s2);
};

/** Kashan star-and-cross glazed tiles (turquoise / cobalt / white) for the wainscot, with a grout normal map */
export const tilesC = () => {
  const N = 512;
  const [c, x] = cv(N, N);
  const [, hx] = cv(N, N);
  x.fillStyle = "#0e2a3c";
  x.fillRect(0, 0, N, N);
  hx.fillStyle = "#fff";
  hx.fillRect(0, 0, N, N);
  const star = (ctx: C2, cx: number, cy: number, R: number) => {
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + Math.PI / 8, rr = k % 2 ? R * 0.72 : R;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  const S = N / 2;
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const cx = i * S, cy = j * S;
      // star tile (glazed white-turquoise with a cobalt centre)
      star(x, cx, cy, S * 0.46);
      x.fillStyle = "#cfd8cc";
      x.fill();
      star(x, cx, cy, S * 0.40);
      x.fillStyle = "#2a8c90";
      x.fill();
      star(x, cx, cy, S * 0.2);
      x.fillStyle = "#1a3e78";
      x.fill();
      x.fillStyle = "#c79a4a";
      x.beginPath();
      x.arc(cx, cy, S * 0.07, 0, TAU);
      x.fill();
      star(hx, cx, cy, S * 0.46);
      hx.lineWidth = 6;
      hx.strokeStyle = "#000";
      hx.stroke();
      // cross tile between stars: cobalt with a small turquoise rosette
      const ox = cx + S / 2, oy = cy + S / 2;
      x.fillStyle = "#16306a";
      x.beginPath();
      x.arc(ox, oy, S * 0.1, 0, TAU);
      x.fill();
      x.fillStyle = "#3aa0a0";
      x.beginPath();
      x.arc(ox, oy, S * 0.05, 0, TAU);
      x.fill();
    }
  // glaze irregularity
  const img = x.getImageData(0, 0, N, N);
  for (let i = 0; i < N * N; i++) {
    const k = 0.86 + 0.2 * rnd(i * 0.37 + Math.floor(i / N) * 0.011);
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
  }
  x.putImageData(img, 0, 0);
  // normal map from the grout height
  const hd = hx.getImageData(0, 0, N, N).data;
  const [nc, nx] = cv(N, N);
  const out = nx.createImageData(N, N);
  const Hh = (i: number, j: number) => hd[(((j + N) % N) * N + ((i + N) % N)) * 4] / 255;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const dx = (Hh(i + 1, j) - Hh(i - 1, j)) * 2.5, dy = (Hh(i, j + 1) - Hh(i, j - 1)) * 2.5;
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

/** a carved window lattice (girih) used as a light cookie: white openings, black wood */
export const latticeC = (fade = true, cells = 4) => {
  const N = 512;
  const [c, x] = cv(N, N);
  x.fillStyle = "#fff";
  x.fillRect(0, 0, N, N);
  x.strokeStyle = "#000";
  x.lineWidth = 9;
  const S = N / cells;
  x.lineWidth = fade ? 9 : 11;
  for (let j = 0; j <= cells; j++)
    for (let i = 0; i <= cells; i++) {
      const cx = i * S, cy = j * S;
      x.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, rr = k % 2 ? S * 0.28 : S * 0.42;
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.closePath();
      x.stroke();
      x.beginPath();
      x.moveTo(cx - S / 2, cy);
      x.lineTo(cx + S / 2, cy);
      x.moveTo(cx, cy - S / 2);
      x.lineTo(cx, cy + S / 2);
      x.stroke();
    }
  // soft edge so the projected spot fades out
  if (fade) {
    const g = x.createRadialGradient(N / 2, N / 2, N * 0.3, N / 2, N / 2, N * 0.5);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    x.fillStyle = g;
    x.fillRect(0, 0, N, N);
  }
  const t = tex(c);
  if (!fade) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** night sky seen through the window: deep blue, a few stars, the glow of the moon off to one side */
export const nightC = () => {
  const [c, x] = cv(512, 768);
  const g = x.createLinearGradient(0, 0, 0, 768);
  g.addColorStop(0, "#0a1a2e");
  g.addColorStop(1, "#1d3a55");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 768);
  const m = x.createRadialGradient(380, 180, 0, 380, 180, 420);
  m.addColorStop(0, "rgba(190,215,240,0.75)");
  m.addColorStop(0.15, "rgba(120,160,200,0.35)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = m;
  x.fillRect(0, 0, 512, 768);
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(220,235,255,${0.3 + rnd(i) * 0.6})`;
    x.fillRect(rnd(i * 3.1) * 512, rnd(i * 7.7) * 500, 1.5, 1.5);
  }
  return tex(c);
};

/** a carved wooden window screen: star-shaped openings (white) in dark wood (black); tiles in both directions */
export const screenC = (cells = 3) => {
  const N = 512;
  const [c, x] = cv(N, N);
  x.fillStyle = "#000";
  x.fillRect(0, 0, N, N);
  x.fillStyle = "#fff";
  const S = N / cells;
  const star = (cx: number, cy: number, R: number, r: number, n: number, rot: number) => {
    x.beginPath();
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * TAU + rot, rr = k % 2 ? r : R;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
  };
  for (let j = 0; j <= cells; j++)
    for (let i = 0; i <= cells; i++) {
      star(i * S, j * S, S * 0.4, S * 0.27, 8, Math.PI / 8);
      star(i * S + S / 2, j * S + S / 2, S * 0.17, S * 0.1, 4, 0);
      // small kite openings between the stars
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4;
        star(i * S + Math.cos(a) * S * 0.5, j * S + Math.sin(a) * S * 0.5, S * 0.07, S * 0.035, 4, a);
      }
    }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

// ---------------- silhouettes for the procession (adapted copy of tex.person) ----------------
const finishSil = (c: HTMLCanvasElement) => ({ map: tex(c), halo: tex(c), aspect: c.width / c.height });
const limb = (x: C2, pts: number[][], w: number) => {
  x.lineWidth = w;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.stroke();
};
/** a soldier on 512×1024 (feet at y≈1000): pointed helmet with a mail aventail, knee-length tunic, belt and sword,
 *  trousers; holding a spear (with shield) or a raised torch. step: 0 | 1 | 2 leg pose */
export const soldierC = (o: { spear?: boolean; shield?: boolean; torch?: boolean; step?: number }) => {
  const [c, x] = cv(512, 1024);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const hx = 256, hy = 196;
  // helmet: tall point, brim, mail falling to the shoulders
  x.beginPath();
  x.moveTo(hx - 56, hy - 2);
  x.quadraticCurveTo(hx - 58, hy - 80, hx - 10, hy - 118);
  x.lineTo(hx + 2, hy - 182);
  x.lineTo(hx + 12, hy - 118);
  x.quadraticCurveTo(hx + 60, hy - 80, hx + 58, hy - 2);
  x.closePath();
  x.fill();
  x.fillRect(hx - 64, hy - 14, 128, 16);
  x.beginPath();
  x.moveTo(hx - 58, hy);
  x.quadraticCurveTo(hx - 80, hy + 70, hx - 92, hy + 100);
  x.lineTo(hx + 92, hy + 100);
  x.quadraticCurveTo(hx + 80, hy + 70, hx + 58, hy);
  x.fill();
  x.beginPath();
  x.ellipse(hx, hy + 20, 42, 52, 0, 0, TAU);
  x.fill();
  // torso + tunic flaring to the knee
  x.beginPath();
  x.moveTo(hx - 100, 300);
  x.bezierCurveTo(hx - 60, 268, hx + 60, 268, hx + 100, 300);
  x.bezierCurveTo(hx + 110, 420, hx + 84, 500, hx + 80, 540);
  x.bezierCurveTo(hx + 104, 620, hx + 118, 680, hx + 124, 720);
  x.lineTo(hx - 124, 720);
  x.bezierCurveTo(hx - 118, 680, hx - 104, 620, hx - 80, 540);
  x.bezierCurveTo(hx - 84, 500, hx - 110, 420, hx - 100, 300);
  x.fill();
  // legs (three walking poses, seen from the front)
  const st = o.step ?? 0;
  const lk = st === 1 ? 26 : 0, rk = st === 2 ? 26 : 0;
  limb(x, [[hx - 46, 700], [hx - 54 + lk * 0.4, 850 - lk], [hx - 56, 985 - lk * 1.4]], 46);
  limb(x, [[hx + 46, 700], [hx + 54 - rk * 0.4, 850 - rk], [hx + 56, 985 - rk * 1.4]], 46);
  x.beginPath();
  x.ellipse(hx - 62, 992 - lk * 1.4, 38, 13, 0, 0, TAU);
  x.ellipse(hx + 62, 992 - rk * 1.4, 38, 13, 0, 0, TAU);
  x.fill();
  // belt and a sword hanging at the left hip
  x.fillRect(hx - 92, 520, 184, 18);
  limb(x, [[hx - 92, 540], [hx - 128, 760]], 12);
  // arms
  limb(x, [[hx - 90, 310], [hx - 120, 470], [hx - 106, 600]], 44);
  if (o.spear) {
    limb(x, [[hx + 90, 310], [hx + 150, 430], [hx + 150, 360]], 44);
    limb(x, [[hx + 150, 990], [hx + 150, 90]], 15);
    x.beginPath();
    x.moveTo(hx + 150, 4);
    x.quadraticCurveTo(hx + 174, 50, hx + 150, 104);
    x.quadraticCurveTo(hx + 126, 50, hx + 150, 4);
    x.fill();
  } else if (o.torch) {
    limb(x, [[hx + 90, 310], [hx + 160, 400], [hx + 150, 300]], 44);
    limb(x, [[hx + 152, 420], [hx + 166, 200]], 22);
    x.beginPath();
    x.moveTo(hx + 148, 210);
    x.lineTo(hx + 186, 210);
    x.lineTo(hx + 178, 168);
    x.lineTo(hx + 154, 168);
    x.fill();
  } else limb(x, [[hx + 90, 310], [hx + 120, 470], [hx + 106, 600]], 44);
  if (o.shield) {
    x.beginPath();
    x.arc(hx - 118, 520, 96, 0, TAU);
    x.fill();
  }
  return finishSil(c);
};

/** Jamasp, grown, seen from the front (shared spec): small wrapped turban, head bowed, tunic to mid-calf with a sash,
 *  simple trousers and sandals; hands together at the chest (holding a candle) or clasped low. 512×1024, feet at y≈1000.
 *  step: 0 | 1 | 2 leg pose */
export const jamaspC = (o: { step?: number; bow?: number; hands?: "candle" | "low" } = {}) => {
  const [c, x] = cv(512, 1024);
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const cx = 256, bow = o.bow ?? 1;
  // head, lowered and foreshortened by the bow; a compact turban wrapped around its crown
  // (bowed: the chin sinks below the line of the shoulders, so we see more turban than face)
  const hy = 120 + 50 * bow;
  x.beginPath();
  x.ellipse(cx, hy, 44, 54 - 6 * bow, 0, 0, TAU);
  x.fill();
  x.beginPath(); // turban dome, rounded and a little lopsided
  x.ellipse(cx + 3, hy - 46, 52, 40, 0.06, 0, TAU);
  x.fill();
  x.beginPath(); // the wrapped band, wider than the head
  x.ellipse(cx, hy - 26, 57, 21, -0.05, 0, TAU);
  x.fill();
  x.beginPath(); // its tucked end
  x.ellipse(cx - 40, hy - 38, 16, 24, 0.5, 0, TAU);
  x.fill();
  // shoulders a little hunched, tunic belted with a sash, flaring to mid-calf
  x.beginPath();
  x.moveTo(cx - 118, 196);
  x.bezierCurveTo(cx - 70, 158, cx + 70, 158, cx + 118, 196);
  x.bezierCurveTo(cx + 130, 270, cx + 118, 340, cx + 104, 392); // to the waist
  x.lineTo(cx + 98, 412);
  x.bezierCurveTo(cx + 118, 520, cx + 134, 680, cx + 140, 800); // skirt of the tunic
  x.lineTo(cx - 140, 800);
  x.bezierCurveTo(cx - 134, 680, cx - 118, 520, cx - 98, 412);
  x.lineTo(cx - 104, 392);
  x.bezierCurveTo(cx - 118, 340, cx - 130, 270, cx - 118, 196);
  x.fill();
  // sash: a band at the waist and its knotted end hanging at his left hip
  x.fillRect(cx - 108, 386, 216, 30);
  x.beginPath();
  x.moveTo(cx + 92, 410);
  x.lineTo(cx + 124, 560);
  x.lineTo(cx + 104, 566);
  x.lineTo(cx + 82, 418);
  x.fill();
  // arms: upper arms down the sides, forearms brought in to the chest (candle) or hanging, hands clasped low
  if ((o.hands ?? "candle") === "candle") {
    limb(x, [[cx - 104, 210], [cx - 126, 330], [cx - 44, 352]], 44);
    limb(x, [[cx + 104, 210], [cx + 126, 330], [cx + 44, 352]], 44);
  } else {
    limb(x, [[cx - 104, 210], [cx - 124, 350], [cx - 30, 470]], 42);
    limb(x, [[cx + 104, 210], [cx + 124, 350], [cx + 30, 470]], 42);
  }
  // trousers to the ankle and sandals; one leg lifted in the walking poses
  const st = o.step ?? 0;
  const lk = st === 1 ? 30 : 0, rk = st === 2 ? 30 : 0;
  limb(x, [[cx - 46, 790], [cx - 50 + lk * 0.3, 880 - lk], [cx - 52, 958 - lk * 1.3]], 52);
  limb(x, [[cx + 46, 790], [cx + 50 - rk * 0.3, 880 - rk], [cx + 52, 958 - rk * 1.3]], 52);
  x.beginPath();
  x.ellipse(cx - 56, 984 - lk * 1.3, 36, 16, 0, 0, TAU);
  x.ellipse(cx + 56, 984 - rk * 1.3, 36, 16, 0, 0, TAU);
  x.fill();
  return finishSil(c);
};

/** a four-point star glint (white, soft), for a sparkle on gold */
export const starC = () => {
  const [c, x] = cv(256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 40);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  for (const [w, h] of [[256, 6], [6, 256]]) {
    const l = x.createLinearGradient(128 - w / 2, 128 - h / 2, 128 + w / 2, 128 + h / 2);
    l.addColorStop(0, "rgba(255,255,255,0)");
    l.addColorStop(0.5, "rgba(255,255,255,0.9)");
    l.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = l;
    x.beginPath();
    x.ellipse(128, 128, w / 2, h / 2, 0, 0, TAU);
    x.fill();
  }
  return tex(c);
};

/** the dying king's profile as a shadow mask (alpha) drawn on his own plane, in metres: x in [-1.5, 0.3], y in
 *  [0.55, 1.45] (palace coordinates); head toward -x, face up: pillow, turban, brow, nose, lips, long beard, body */
export const kingShadowC = () => {
  const [c, x] = cv(1024, 512);
  x.setTransform(1024 / 1.8, 0, 0, -512 / 0.9, (1.5 * 1024) / 1.8, (1.45 * 512) / 0.9);
  x.fillStyle = "#000";
  const poly = (pts: number[][], ox = 0, oy = 0) => {
    x.beginPath();
    pts.forEach(([px, py], i) => (i ? x.lineTo(px + ox, py + oy) : x.moveTo(px + ox, py + oy)));
    x.closePath();
    x.fill();
  };
  // mattress line and pillow
  x.fillRect(-1.5, 0.55, 1.8, 0.19);
  x.beginPath();
  x.ellipse(-1.12, 0.79, 0.25, 0.075, 0, 0, TAU);
  x.fill();
  // the head in profile (same outline as the old sculpted head), with the beard spread on the chest
  const KX = -0.88, KY = 0.86;
  poly([[-0.02, -0.08], [-0.1, -0.05], [-0.115, 0.02], [-0.085, 0.072], [-0.04, 0.098], [-0.012, 0.104], [0.004, 0.097], [0.02, 0.11], [0.03, 0.13], [0.044, 0.152], [0.05, 0.14], [0.056, 0.126], [0.064, 0.113], [0.075, 0.11], [0.086, 0.104], [0.13, 0.1], [0.2, 0.082], [0.27, 0.05], [0.3, 0.028], [0.22, 0.008], [0.12, -0.01], [0.04, -0.06]], KX, KY);
  // a wrapped turban at the crown of the head
  x.beginPath();
  x.ellipse(KX - 0.1, KY + 0.035, 0.085, 0.095, 0.3, 0, TAU);
  x.fill();
  // shoulders and body under the blanket
  poly([[-0.78, 0.74], [-0.76, 0.86], [-0.62, 0.93], [-0.45, 0.965], [-0.22, 0.955], [0.0, 0.93], [0.18, 0.9], [0.3, 0.88], [0.3, 0.74]]);
  const t = new THREE.CanvasTexture(c);
  return t;
};
