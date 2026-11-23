// Hall-only canvas textures: serpent scales (hall snakes + the queen's tile scales), mist, reflection streaks,
// water rings and the hall silhouettes (queen, seated Jamasp) as channel masks for the rim shader in hall-sil.ts.
import * as THREE from "three";
import { rnd } from "../lib";

const TAU = Math.PI * 2;
const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
};
const tex = (c: HTMLCanvasElement, srgb = true, wrap = false) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** normal map (OpenGL convention) from a greyscale height canvas; wraps at the edges */
const normalFrom = (hc: HTMLCanvasElement, strength: number) => {
  const W = hc.width, H = hc.height;
  const hd = hc.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const [nc, nx] = cv(W, H);
  const out = nx.createImageData(W, H);
  const h = (i: number, j: number) => hd[(((j + H) % H) * W + ((i + W) % W)) * 4] / 255;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const dx = (h(i + 1, j) - h(i - 1, j)) * strength, dy = (h(i, j + 1) - h(i, j - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const o = (j * W + i) * 4;
      out.data[o] = (-dx / l * 0.5 + 0.5) * 255;
      out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255;
      out.data[o + 2] = (1 / l) * 255;
      out.data[o + 3] = 255;
    }
  nx.putImageData(out, 0, 0);
  return tex(nc, false, true);
};

type ScaleCell = { q: number; r: number; u: number; v: number };
/**
 * Overlapping scales on a W×H tile that wraps both ways. X = along the body (u, head → tail), Y = around (v, 0 = spine).
 * paint() gives each scale its colour; the height canvas gets a dome per scale and a groove at its free edge.
 */
const scaleSheet = (W: number, H: number, cols: number, rows: number, colour: (c: ScaleCell) => { fill: string; edge: string; edgeW: number; rough: number; metal: number; star?: string }, belly?: (v: number) => boolean) => {
  const [c, x] = cv(W, H);
  const [hc, hx] = cv(W, H);
  const [rc, rx] = cv(W, H);
  x.fillStyle = "#050807";
  x.fillRect(0, 0, W, H);
  hx.fillStyle = "#000";
  hx.fillRect(0, 0, W, H);
  rx.fillStyle = "rgb(0,200,0)";
  rx.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  const shape = (g: CanvasRenderingContext2D, cx: number, cy: number, sw: number, sh: number) => {
    g.beginPath();
    g.moveTo(cx - sw * 0.55, cy - sh * 0.62);
    g.bezierCurveTo(cx + sw * 0.15, cy - sh * 0.66, cx + sw * 0.62, cy - sh * 0.3, cx + sw * 0.66, cy);
    g.bezierCurveTo(cx + sw * 0.62, cy + sh * 0.3, cx + sw * 0.15, cy + sh * 0.66, cx - sw * 0.55, cy + sh * 0.62);
    g.closePath();
  };
  // tail-side scales first so the head-side ones overlap them (as on a real snake)
  for (let q = cols; q >= -1; q--)
    for (let r = -1; r <= rows; r++) {
      const cx = (q + (r % 2 ? 0.5 : 0)) * cw, cy = (r + 0.5) * rh;
      const u = ((((q + (r % 2 ? 0.5 : 0)) / cols) % 1) + 1) % 1, v = ((((r + 0.5) / rows) % 1) + 1) % 1;
      const isBelly = belly?.(v);
      const sw = isBelly ? cw * 0.9 : cw * 1.25, sh = isBelly ? rh * 1.05 : rh * 1.18;
      const st = colour({ q: ((q % cols) + cols) % cols, r: ((r % rows) + rows) % rows, u, v });
      for (const ox of [-W, 0, W])
        for (const oy of [-H, 0, H]) {
          const px = cx + ox, py = cy + oy;
          if (px < -cw * 2 || px > W + cw * 2 || py < -rh * 2 || py > H + rh * 2) continue;
          // colour
          const g = x.createRadialGradient(px - sw * 0.1, py - sh * 0.15, 1, px, py, sw * 0.75);
          g.addColorStop(0, st.fill);
          g.addColorStop(1, shade(st.fill, 0.55));
          x.fillStyle = g;
          shape(x, px, py, sw, sh);
          x.fill();
          if (st.star) {
            x.save();
            x.translate(px + sw * 0.06, py);
            x.fillStyle = st.star;
            x.beginPath();
            for (let k = 0; k < 16; k++) {
              const a = (k / 16) * TAU, rr = (k % 2 ? 0.13 : 0.3) * Math.min(sw, sh);
              x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            x.closePath();
            x.fill();
            x.restore();
          }
          x.strokeStyle = st.edge;
          x.lineWidth = st.edgeW;
          shape(x, px, py, sw, sh);
          x.stroke();
          // height: dome, groove at the rim
          const hg = hx.createRadialGradient(px - sw * 0.12, py, 1, px, py, sw * 0.72);
          hg.addColorStop(0, "#f0f0f0");
          hg.addColorStop(0.7, "#808080");
          hg.addColorStop(1, "#202020");
          hx.fillStyle = hg;
          shape(hx, px, py, sw, sh);
          hx.fill();
          hx.strokeStyle = "#000";
          hx.lineWidth = 2;
          hx.stroke();
          // roughness (G) / metalness (B)
          rx.fillStyle = `rgb(0,${Math.round(st.rough * 255)},${Math.round(st.metal * 255)})`;
          shape(rx, px, py, sw, sh);
          rx.fill();
          if (st.metal < 0.5 && st.edgeW > 1.5) {
            rx.strokeStyle = "rgb(0,125,255)";
            rx.lineWidth = st.edgeW;
            rx.stroke();
          }
        }
    }
  return { map: tex(c, true, true), normal: normalFrom(hc, 2.6), rm: tex(rc, false, true) };
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * k, g = ((n >> 8) & 255) * k, b = (n & 255) * k;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

/** the hall serpents: near-black olive/teal flanks, bronze dorsal diamonds with fine gold edges, pale belly scutes */
export const snakeSkin = () => {
  const W = 1024, H = 384, cols = 24, rows = 22;
  const vd = (v: number) => Math.min(v, 1 - v); // 0 on the spine, 0.5 on the belly
  return scaleSheet(W, H, cols, rows, ({ q, r, u, v }) => {
    const d = vd(v);
    const k = rnd(q * 31 + r * 7);
    if (d > 0.36) return { fill: k > 0.5 ? "#6d5a3a" : "#5e4e33", edge: "rgba(20,14,8,0.9)", edgeW: 2, rough: 0.45, metal: 0 };
    // dorsal chain of diamonds, three per tile
    const a = Math.abs(((u * 3) % 1) - 0.5) * 2; // 1 at diamond centre
    const inD = d * 5.2 < a - 0.12;
    const onEdge = !inD && d * 5.2 < a + 0.1;
    if (inD) return { fill: k > 0.6 ? "#3a2614" : "#2f1f11", edge: "rgba(120,90,40,0.55)", edgeW: 1.4, rough: 0.32, metal: 0 };
    if (onEdge) return { fill: "#9a7836", edge: "rgba(210,170,90,0.9)", edgeW: 1.6, rough: 0.25, metal: 0.6 };
    const side = d > 0.22 && rnd(q + r * 13) > 0.82;
    return { fill: side ? "#20403c" : k > 0.5 ? "#13231f" : "#0f1b18", edge: "rgba(70,110,95,0.55)", edgeW: 1.2, rough: 0.3, metal: 0 };
  }, (v) => Math.min(v, 1 - v) > 0.36);
};

/** the queen: glazed tile scales — turquoise and cobalt with gold borders, gold medallion stars along the spine */
export const tileSkin = () => {
  // W/H = body length per tile / circumference (≈ 2 m / 4 m) so the motifs stay round on the body
  const W = 512, H = 1024, cols = 14, rows = 20;
  const vd = (v: number) => Math.min(v, 1 - v);
  return scaleSheet(W, H, cols, rows, ({ q, r, u, v }) => {
    const d = vd(v);
    const k = rnd(q * 17 + r * 5);
    if (d > 0.38) return { fill: k > 0.5 ? "#8a6a34" : "#7a5c2c", edge: "rgba(40,26,10,0.9)", edgeW: 3, rough: 0.32, metal: 0.6 };
    // spine medallions: a cobalt diamond with a cream star, twice per tile
    const a = Math.abs(((u * 2) % 1) - 0.5) * 2;
    const med = d * 3.6 + (1 - a) * 0.85 < 0.6;
    if (med) return { fill: d < 0.06 ? "#1a3a78" : "#132c66", edge: "rgba(214,170,85,1)", edgeW: 4, rough: 0.34, metal: 0, star: d < 0.06 && a > 0.8 ? "#b8a880" : undefined };
    // a cream-and-gold girdle band every tile, cobalt rings beside it
    const col = q % 7;
    if (col === 0 && d < 0.36) return { fill: "#a08e66", edge: "rgba(205,160,80,1)", edgeW: 3.5, rough: 0.36, metal: 0, star: "rgba(20,48,110,0.95)" };
    if ((col === 1 || col === 6) && d < 0.36) return { fill: "#173c80", edge: "rgba(205,160,80,1)", edgeW: 3.5, rough: 0.34, metal: 0 };
    const star = rnd(q * 3 + r * 11) > 0.62 ? "rgba(176,160,120,0.95)" : undefined;
    return { fill: k > 0.55 ? "#127277" : k > 0.2 ? "#0e6268" : "#0b525c", edge: "rgba(210,165,80,1)", edgeW: 3.5, rough: 0.34, metal: 0, star };
  }, (v) => Math.min(v, 1 - v) > 0.38);
};

/** soft mist puff that is fully transparent at its border */
export const mistTex = (seed = 0) => {
  const [c, x] = cv(256, 256);
  for (let i = 0; i < 40; i++) {
    const a = rnd(i + seed * 50) * TAU, rr = Math.sqrt(rnd(i * 3 + seed)) * 70;
    const px = 128 + Math.cos(a) * rr * 1.25, py = 128 + Math.sin(a) * rr * 0.75, r = 20 + rnd(i + 9 + seed) * 42;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  // fade the border to zero
  const d = x.getImageData(0, 0, 256, 256);
  for (let j = 0; j < 256; j++)
    for (let i = 0; i < 256; i++) {
      const r = Math.hypot((i - 128) / 128, (j - 128) / 128);
      const f = 1 - smooth(0.55, 0.98, r);
      d.data[(j * 256 + i) * 4 + 3] *= f;
    }
  x.putImageData(d, 0, 0);
  return tex(c);
};

/** vertical light streak (a lamp's reflection smeared on wet stone) */
export const streakTex = () => {
  const [c, x] = cv(64, 256);
  const d = x.createImageData(64, 256);
  for (let j = 0; j < 256; j++)
    for (let i = 0; i < 64; i++) {
      const u = (i - 32) / 32, v = j / 255;
      const a = Math.exp(-u * u * 9) * (1 - smooth(0.15, 1, v)) * smooth(0, 0.06, v) * (0.75 + 0.25 * Math.sin(v * 70 + Math.sin(v * 13) * 3));
      const o = (j * 64 + i) * 4;
      d.data[o] = d.data[o + 1] = d.data[o + 2] = 255;
      d.data[o + 3] = Math.max(0, Math.min(255, a * 255));
    }
  x.putImageData(d, 0, 0);
  return tex(c);
};

/** a thin ring (water ripple) */
export const ringTex = () => {
  const [c, x] = cv(256, 256);
  const g = x.createRadialGradient(128, 128, 60, 128, 128, 126);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.72, "rgba(255,255,255,0)");
  g.addColorStop(0.86, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return tex(c);
};

// ---------------- silhouettes as channel masks: R = solid body, G = translucent hair/veil, B = gold / glowing accents ----------------
export type Mask = { map: THREE.Texture; aspect: number };
const maskCanvas = (w: number, h: number) => {
  const [c, x] = cv(w, h);
  x.fillStyle = "#000";
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "lighter";
  return [c, x] as const;
};
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
const R = "rgb(255,0,0)", G = (k: number) => `rgb(0,${Math.round(k * 255)},0)`, B = (k: number) => `rgb(0,0,${Math.round(k * 255)})`;

/** Shahmaran from the hips up: tall crown, hair framing her face and falling over her shoulders, open arms with long
 *  sheer sleeves, a veil spreading behind her like wings, jewelled belt where the woman becomes the serpent.
 *  1280×1536; the bottom edge is where the coils take over. */
export const queenMask = (): Mask => {
  const W = 1280, H = 1536;
  const [c, x] = maskCanvas(W, H);
  const cx = 640;
  const lift = [0, 30];
  // --- sheer veil (G, faint) from the crown to the wrists, falling to the hips like wings ---
  x.fillStyle = G(0.22);
  x.beginPath();
  x.moveTo(cx - 70, 430);
  x.bezierCurveTo(cx - 250, 560, cx - 420, 760, cx - 560, 880);
  x.bezierCurveTo(cx - 600, 1080, cx - 560, 1300, cx - 470, 1480);
  x.bezierCurveTo(cx - 250, 1520, cx + 250, 1520, cx + 470, 1480);
  x.bezierCurveTo(cx + 560, 1300, cx + 600, 1080, cx + 560, 880);
  x.bezierCurveTo(cx + 420, 760, cx + 250, 560, cx + 70, 430);
  x.fill();
  x.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 5;
    x.strokeStyle = G(0.1 + 0.1 * rnd(i * 3));
    x.lineWidth = 18 + rnd(i) * 22;
    x.beginPath();
    x.moveTo(cx + s * (90 + k * 60), 470);
    x.bezierCurveTo(cx + s * (260 + k * 90), 700, cx + s * (420 + k * 60), 900, cx + s * (440 + k * 30), 1440);
    x.stroke();
  }
  // --- long sleeves (G) hanging from the open arms ---
  for (const s of [-1, 1]) {
    const L = lift[s > 0 ? 1 : 0];
    x.fillStyle = G(0.5);
    x.beginPath();
    x.moveTo(cx + s * 250, 860);
    x.bezierCurveTo(cx + s * 330, 930, cx + s * 420, 980 - L, cx + s * 520, 930 - L * 2);
    x.bezierCurveTo(cx + s * 545, 1020, cx + s * 540, 1150, cx + s * 500, 1250 - L);
    x.bezierCurveTo(cx + s * 470, 1270, cx + s * 430, 1220, cx + s * 400, 1150);
    x.bezierCurveTo(cx + s * 360, 1080, cx + s * 300, 1010, cx + s * 250, 960);
    x.closePath();
    x.fill();
    x.strokeStyle = G(0.3);
    x.lineWidth = 10;
    for (let f = 0; f < 3; f++) {
      x.beginPath();
      x.moveTo(cx + s * (430 + f * 30), 990 - L - f * 15);
      x.bezierCurveTo(cx + s * (450 + f * 25), 1080, cx + s * (440 + f * 20), 1170, cx + s * (425 + f * 25), 1230);
      x.stroke();
    }
  }
  // --- hair falling over the shoulders and down her back (G, denser) ---
  x.fillStyle = G(0.6);
  x.beginPath();
  x.moveTo(cx - 80, 470);
  x.bezierCurveTo(cx - 170, 560, cx - 190, 700, cx - 240, 820);
  x.bezierCurveTo(cx - 290, 960, cx - 270, 1120, cx - 300, 1260);
  x.bezierCurveTo(cx - 200, 1230, cx + 200, 1230, cx + 300, 1260);
  x.bezierCurveTo(cx + 270, 1120, cx + 290, 960, cx + 240, 820);
  x.bezierCurveTo(cx + 190, 700, cx + 170, 560, cx + 80, 470);
  x.fill();
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1, k = rnd(i * 7);
    x.strokeStyle = G(0.4 + 0.25 * rnd(i));
    x.lineWidth = 4 + rnd(i + 4) * 7;
    x.beginPath();
    x.moveTo(cx + s * (120 + k * 40), 600);
    x.bezierCurveTo(cx + s * (230 + k * 40), 820, cx + s * (300 + k * 30), 1050, cx + s * (310 + k * 40), 1240 + k * 120);
    x.stroke();
  }
  // --- solid body (R) ---
  x.fillStyle = R;
  x.strokeStyle = R;
  // hair framing the face (solid near the head), merging with head and neck
  x.beginPath();
  x.moveTo(cx - 84, 470);
  x.bezierCurveTo(cx - 128, 520, cx - 132, 610, cx - 120, 680);
  x.bezierCurveTo(cx - 140, 740, cx - 190, 780, cx - 214, 830);
  x.lineTo(cx + 214, 830);
  x.bezierCurveTo(cx + 190, 780, cx + 140, 740, cx + 120, 680);
  x.bezierCurveTo(cx + 132, 610, cx + 128, 520, cx + 84, 470);
  x.fill();
  x.save();
  x.translate(cx, 568);
  x.beginPath();
  x.ellipse(0, 0, 64, 86, 0, 0, TAU);
  x.fill();
  x.restore();
  // torso: sloping shoulders, bust, narrow waist, hips flaring into the serpent body
  x.beginPath();
  x.moveTo(cx - 70, 752);
  x.bezierCurveTo(cx - 150, 770, cx - 215, 780, cx - 238, 830);
  x.bezierCurveTo(cx - 250, 880, cx - 228, 960, cx - 205, 1010);
  x.bezierCurveTo(cx - 175, 1080, cx - 150, 1130, cx - 152, 1180);
  x.bezierCurveTo(cx - 156, 1260, cx - 190, 1330, cx - 220, 1400);
  x.lineTo(cx - 228, H);
  x.lineTo(cx + 228, H);
  x.lineTo(cx + 220, 1400);
  x.bezierCurveTo(cx + 190, 1330, cx + 156, 1260, cx + 152, 1180);
  x.bezierCurveTo(cx + 150, 1130, cx + 175, 1080, cx + 205, 1010);
  x.bezierCurveTo(cx + 228, 960, cx + 250, 880, cx + 238, 830);
  x.bezierCurveTo(cx + 215, 780, cx + 150, 770, cx + 70, 752);
  x.fill();
  // arms: open and a little raised, palms up
  const arm = (s: number, L: number) => {
    limb(x, [[cx + s * 222, 830], [cx + s * 300, 930], [cx + s * 372, 1010 - L]], 64);
    limb(x, [[cx + s * 372, 1010 - L], [cx + s * 450, 980 - L * 1.4], [cx + s * 520, 925 - L * 2]], 48);
    x.save();
    x.translate(cx + s * 548, 900 - L * 2);
    x.rotate(s * -2.2);
    x.beginPath();
    x.ellipse(0, 0, 25, 42, 0, 0, TAU);
    x.fill();
    for (let f = 0; f < 4; f++) {
      x.lineWidth = 10;
      x.beginPath();
      x.moveTo(-13 + f * 9, 30);
      x.lineTo(-17 + f * 11, 72 + (f === 1 || f === 2 ? 8 : 0));
      x.stroke();
    }
    x.restore();
  };
  arm(-1, lift[0]);
  arm(1, lift[1]);
  // crown (R + B): band, nine spires, the middle one tallest, jewels on the tips
  const crown = () => {
    x.fillRect(cx - 84, 452, 168, 30);
    for (let i = 0; i < 9; i++) {
      const px = cx - 76 + i * 19, ph = i === 4 ? 210 : 70 + (4 - Math.abs(i - 4)) * 28 - (i % 2) * 22;
      x.beginPath();
      x.moveTo(px - 9.5, 458);
      x.lineTo(px - 2, 458 - ph * 0.85);
      x.lineTo(px, 458 - ph);
      x.lineTo(px + 2, 458 - ph * 0.85);
      x.lineTo(px + 9.5, 458);
      x.fill();
      x.beginPath();
      x.arc(px, 458 - ph - 7, i === 4 ? 13 : 7, 0, TAU);
      x.fill();
    }
  };
  crown();
  x.fillStyle = B(1);
  crown();
  // --- gold (B): armlets, bracelets, the jewelled belt (no necklace: under glowing eyes it reads as a smile) ---
  x.strokeStyle = B(0.9);
  x.fillStyle = B(1);
  for (const s of [-1, 1]) {
    const L = lift[s > 0 ? 1 : 0];
    x.lineWidth = 12;
    x.beginPath();
    x.moveTo(cx + s * 268, 862);
    x.lineTo(cx + s * 300, 908);
    x.stroke();
    x.beginPath();
    x.moveTo(cx + s * 492, 930 - L * 1.9);
    x.lineTo(cx + s * 506, 962 - L * 1.9);
    x.stroke();
  }
  x.lineWidth = 14;
  x.beginPath();
  x.moveTo(cx - 160, 1250);
  x.quadraticCurveTo(cx, 1300, cx + 160, 1250);
  x.stroke();
  x.lineWidth = 7;
  for (let k = -3; k <= 3; k++) {
    x.beginPath();
    x.moveTo(cx + k * 40, 1278 - Math.abs(k) * 3);
    x.lineTo(cx + k * 40, 1330 - Math.abs(k) * 6);
    x.stroke();
  }
  return { map: tex(c, false), aspect: W / H };
};

/** the grown Jamasp seen from behind, sitting cross-legged, head raised to the queen; the open book in his lap is
 *  hidden by his body, only its light spills out at his sides (B) */
export const scholarMask = (): Mask => {
  const W = 512, H = 512;
  const [c, x] = maskCanvas(W, H);
  x.fillStyle = R;
  x.strokeStyle = R;
  // head tilted back, a wrapped turban with its cloth tail
  x.beginPath();
  x.ellipse(256, 146, 38, 44, 0.12, 0, TAU);
  x.fill();
  x.beginPath();
  x.ellipse(254, 112, 56, 38, -0.08, 0, TAU);
  x.fill();
  x.beginPath();
  x.ellipse(250, 88, 44, 28, -0.15, 0, TAU);
  x.fill();
  x.fillRect(234, 176, 44, 44);
  // robe: rounded shoulders, broad back, settling onto the crossed legs
  x.beginPath();
  x.moveTo(160, 240);
  x.bezierCurveTo(190, 208, 322, 208, 352, 240);
  x.bezierCurveTo(378, 300, 376, 380, 380, 424);
  x.lineTo(132, 424);
  x.bezierCurveTo(136, 380, 134, 300, 160, 240);
  x.fill();
  x.beginPath(); // elbows just showing
  x.ellipse(146, 340, 24, 42, -0.15, 0, TAU);
  x.ellipse(366, 340, 24, 42, 0.15, 0, TAU);
  x.fill();
  x.beginPath(); // knees and robe hem
  x.ellipse(256, 438, 214, 46, 0, 0, TAU);
  x.fill();
  x.beginPath();
  x.ellipse(256, 466, 238, 28, 0, 0, TAU);
  x.fill();
  // turban tail and shawl edge catch the light (G)
  x.strokeStyle = G(0.55);
  x.lineCap = "round";
  x.lineWidth = 14;
  x.beginPath();
  x.moveTo(214, 112);
  x.bezierCurveTo(196, 160, 200, 210, 192, 260);
  x.stroke();
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(166, 244);
  x.bezierCurveTo(146, 320, 140, 390, 126, 452);
  x.stroke();
  // the book light spilling past his sides (B)
  x.fillStyle = B(1);
  for (const sx of [-1, 1]) {
    x.beginPath();
    x.ellipse(256 + sx * 150, 416, 30, 11, sx * -0.25, 0, TAU);
    x.fill();
  }
  return { map: tex(c, false), aspect: W / H };
};

/** the queen seen from behind (last shot): hair down her back, sheer veil, arms lowered, crown spires against the light */
export const queenBackMask = (): Mask => {
  const W = 1280, H = 1536;
  const [c, x] = maskCanvas(W, H);
  const cx = 640;
  // veil (faint) from the crown down her back
  x.fillStyle = G(0.28);
  x.beginPath();
  x.moveTo(cx - 80, 440);
  x.bezierCurveTo(cx - 240, 620, cx - 330, 1000, cx - 360, 1500);
  x.lineTo(cx + 360, 1500);
  x.bezierCurveTo(cx + 330, 1000, cx + 240, 620, cx + 80, 440);
  x.fill();
  // solid: head, neck, shoulders, arms down
  x.fillStyle = R;
  x.strokeStyle = R;
  x.beginPath();
  x.ellipse(cx, 566, 70, 92, 0, 0, TAU);
  x.fill();
  x.fillRect(cx - 44, 620, 88, 150);
  x.beginPath();
  x.moveTo(cx - 70, 752);
  x.bezierCurveTo(cx - 150, 770, cx - 215, 780, cx - 238, 830);
  x.bezierCurveTo(cx - 250, 900, cx - 220, 990, cx - 190, 1060);
  x.bezierCurveTo(cx - 160, 1150, cx - 160, 1260, cx - 210, 1400);
  x.lineTo(cx - 222, H);
  x.lineTo(cx + 222, H);
  x.lineTo(cx + 210, 1400);
  x.bezierCurveTo(cx + 160, 1260, cx + 160, 1150, cx + 190, 1060);
  x.bezierCurveTo(cx + 220, 990, cx + 250, 900, cx + 238, 830);
  x.bezierCurveTo(cx + 215, 780, cx + 150, 770, cx + 70, 752);
  x.fill();
  for (const s of [-1, 1]) {
    limb(x, [[cx + s * 226, 830], [cx + s * 268, 980], [cx + s * 286, 1110]], 60);
    limb(x, [[cx + s * 286, 1110], [cx + s * 300, 1230], [cx + s * 316, 1330]], 46);
    x.beginPath();
    x.ellipse(cx + s * 322, 1372, 24, 44, s * 0.15, 0, TAU);
    x.fill();
  }
  // hair: a dense fall down the back (solid core, translucent strands at the edge)
  x.beginPath();
  x.moveTo(cx - 72, 520);
  x.bezierCurveTo(cx - 150, 640, cx - 200, 900, cx - 175, 1240);
  x.bezierCurveTo(cx - 90, 1300, cx + 90, 1300, cx + 175, 1240);
  x.bezierCurveTo(cx + 200, 900, cx + 150, 640, cx + 72, 520);
  x.fill();
  x.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1, k = rnd(i * 5);
    x.strokeStyle = G(0.4 + 0.2 * rnd(i));
    x.lineWidth = 5 + rnd(i + 2) * 7;
    x.beginPath();
    x.moveTo(cx + s * (60 + k * 40), 560);
    x.bezierCurveTo(cx + s * (170 + k * 40), 760, cx + s * (215 + k * 50), 1000, cx + s * (190 + k * 60), 1300 + k * 80);
    x.stroke();
  }
  x.strokeStyle = R;
  // crown from behind
  const crown = () => {
    x.fillRect(cx - 84, 450, 168, 30);
    for (let i = 0; i < 9; i++) {
      const px = cx - 76 + i * 19, ph = i === 4 ? 210 : 70 + (4 - Math.abs(i - 4)) * 28 - (i % 2) * 22;
      x.beginPath();
      x.moveTo(px - 9.5, 458);
      x.lineTo(px, 458 - ph);
      x.lineTo(px + 9.5, 458);
      x.fill();
    }
  };
  x.fillStyle = R;
  crown();
  x.fillStyle = B(0.8);
  crown();
  x.strokeStyle = B(0.8);
  x.lineWidth = 14;
  x.beginPath();
  x.moveTo(cx - 175, 1250);
  x.quadraticCurveTo(cx, 1290, cx + 175, 1250);
  x.stroke();
  return { map: tex(c, false), aspect: W / H };
};
