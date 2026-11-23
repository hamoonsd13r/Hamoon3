// Living Codex · procedural textures made once per tab (parchment, limestone relief, clay) and
// noise masks for dissolves / melts (a small alpha PNG per frame, scaled up as a CSS mask → soft edges).
import type { CSSProperties } from "react";
import { fbm, vnoise } from "./theme";

const cache = new Map<string, string>();
const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
};

/** aged parchment: warm paper, fibres, foxing spots, darker edges */
export const parchmentURL = (seed = 1) => {
  const key = `parch${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 300, H = 400;
  const c = canvas(W, H);
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 70, y / 70, 4, seed);
      const fib = vnoise(x / 1.5, y / 40, seed + 9) * 0.5 + vnoise(x / 30, y / 1.2, seed + 3) * 0.5;
      const fox = Math.max(0, fbm(x / 22, y / 22, 3, seed + 50) - 0.64) * 1.6;
      const ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
      const edge = Math.min(1, Math.min(ex, ey) * 9);
      let v = 0.78 + (n - 0.5) * 0.28 + (fib - 0.5) * 0.06 - fox * 0.35;
      v *= 0.55 + 0.45 * Math.pow(edge, 0.6);
      const i = (y * W + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, 236 * v + 8));
      img.data[i + 1] = Math.max(0, Math.min(255, 214 * v - 4));
      img.data[i + 2] = Math.max(0, Math.min(255, 168 * v - 18));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL("image/jpeg", 0.9);
  cache.set(key, url);
  return url;
};

/** lit limestone relief (pitted, chisel-marked), dark; light from the upper left */
export const stoneURL = (seed = 2, W = 960, H = 540, tone: [number, number, number] = [150, 132, 108], scale = 1, o: { relief?: number; chisel?: number; pits?: number } = {}) => {
  const { relief = 60, chisel = 0.08, pits = 1.2 } = o;
  const key = `stone${seed}_${W}_${H}_${tone.join(",")}_${scale}_${relief}_${chisel}_${pits}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = canvas(W, H);
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  const hgt = new Float32Array((W + 1) * (H + 1));
  const asp = W / H;
  for (let y = 0; y <= H; y++) {
    for (let x = 0; x <= W; x++) {
      const u = (x / W) * 4.5 * asp * scale, v = (y / H) * 4.5 * scale;
      let h = fbm(u, v, 5, seed) * 1.0;
      // chisel strokes: anisotropic noise
      h += (vnoise(u * 9, v * 1.2, seed + 7) - 0.5) * chisel;
      // pits
      const p = vnoise(u * 14, v * 14, seed + 21);
      if (p > 0.82) h -= (p - 0.82) * pits;
      hgt[y * (W + 1) + x] = h;
    }
  }
  const L = [-0.55, -0.6, 0.58];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i0 = y * (W + 1) + x;
      const dx = (hgt[i0 + 1] - hgt[i0]) * relief, dy = (hgt[i0 + W + 1] - hgt[i0]) * relief;
      const nl = Math.hypot(dx, dy, 1);
      const lam = Math.max(0, (-dx * L[0] - dy * L[1] + L[2]) / nl);
      const ao = 0.6 + 0.4 * hgt[i0];
      const v = (0.25 + 0.75 * lam) * ao;
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, tone[0] * v);
      img.data[i + 1] = Math.min(255, tone[1] * v);
      img.data[i + 2] = Math.min(255, tone[2] * v);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL("image/jpeg", 0.88);
  cache.set(key, url);
  return url;
};

// ── noise masks ────────────────────────────────────────────────────────────────────────────────
const fields = new Map<string, Float32Array>();
/** a cached fbm field in [0,1] */
export const noiseField = (W: number, H: number, seed: number, freq = 5) => {
  const key = `${W}_${H}_${seed}_${freq}`;
  let f = fields.get(key);
  if (!f) {
    f = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = fbm((x / W) * freq, (y / H) * freq * (H / W), 4, seed);
    fields.set(key, f);
  }
  return f;
};

let maskCanvas: HTMLCanvasElement | null = null;
/**
 * alpha mask as a PNG data URL: alpha = 1 where (noise + bias(x,y)) > th (kept), soft over `soft`.
 * bias(x, y) gets normalised coords. `edge` = return only a band around the threshold (for glowing edges).
 */
export const maskURL = (o: { W?: number; H?: number; seed?: number; freq?: number; th: number; soft?: number; bias?: (x: number, y: number) => number; edge?: number; invert?: boolean }) => {
  const { W = 192, H = 108, seed = 5, freq = 5, th, soft = 0.04, bias, edge = 0, invert = false } = o;
  const f = noiseField(W, H, seed, freq);
  if (!maskCanvas) maskCanvas = canvas(W, H);
  if (maskCanvas.width !== W || maskCanvas.height !== H) { maskCanvas.width = W; maskCanvas.height = H; }
  const g = maskCanvas.getContext("2d")!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = f[y * W + x] + (bias ? bias(x / W, y / H) : 0);
      let a: number;
      if (edge > 0) { const d = Math.abs(v - th) / edge; a = Math.max(0, 1 - d * d); }
      else { const k = Math.min(1, Math.max(0, (v - th + soft) / (2 * soft))); a = k * k * (3 - 2 * k); if (invert) a = 1 - a; }
      const i = (y * W + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return maskCanvas.toDataURL("image/png");
};
/** CSS for a data-URL mask stretched over the element */
export const maskCSS = (url: string): CSSProperties => ({
  WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
});
