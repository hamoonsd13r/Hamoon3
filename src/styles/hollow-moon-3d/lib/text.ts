// Hollow Moon 3D · lettering. The brand's logo (vector paths from tools/logo-trace.mjs, see brand.ts) becomes a
// signed-distance texture, so its edges stay crisp at any distance and its bevels can be shaded; small inscriptions
// (the brand's words in Chakra Petch, OFL, between graduation marks) become ordinary coverage strips.
import * as THREE from "three";
import { LOGO } from "./brand";

/** exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), in place on a w×h grid */
function edt(f: Float32Array, w: number, h: number) {
  const n = Math.max(w, h), d = new Float32Array(n), v = new Int32Array(n), z = new Float32Array(n + 1), g = new Float32Array(n);
  const pass = (off: number, stride: number, len: number) => {
    for (let i = 0; i < len; i++) g[i] = f[off + i * stride];
    let k = 0;
    v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < len; q++) {
      let s = 0;
      for (;;) {
        const p = v[k];
        s = (g[q] + q * q - (g[p] + p * p)) / (2 * q - 2 * p);
        if (s > z[k]) break;
        k--;
      }
      k++;
      v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      const p = v[k];
      d[q] = (q - p) * (q - p) + g[p];
    }
    for (let i = 0; i < len; i++) f[off + i * stride] = d[i];
  };
  for (let x = 0; x < w; x++) pass(x, w, h);
  for (let y = 0; y < h; y++) pass(y * w, 1, w);
}

/** signed distance (pixels, positive inside) of a coverage mask */
function sdf(alpha: Uint8ClampedArray, w: number, h: number, channel: number) {
  const INF = 1e12, a = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const inside = alpha[i * 4 + channel] > 127;
    a[i] = inside ? INF : 0; // distance to the nearest outside pixel
    b[i] = inside ? 0 : INF; // distance to the nearest inside pixel
  }
  edt(a, w, h);
  edt(b, w, h);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const cov = alpha[i * 4 + channel] / 255;
    // anti-aliased edge pixels know their own sub-pixel distance; the rest take the pixel-centre distance
    out[i] = cov > 0.02 && cov < 0.98 ? cov - 0.5 : a[i] > 0 ? Math.sqrt(a[i]) - 0.5 : -(Math.sqrt(b[i]) - 0.5);
  }
  return out;
}

export type WordTex = { tex: THREE.DataTexture; w: number; h: number; pad: number; scale: number; spread: number; aspect: number };

/** R = the main mark, G = its accent; value = signed distance in logo units / spread, as half floats */
export function makeWordmark(W = 2048, spreadPx = 42): WordTex {
  const L = LOGO.main, pad = Math.round(W * 0.035);
  const s = (W - 2 * pad) / (L.x1 - L.x0);
  const H = Math.ceil((L.y1 - L.y0) * s + 2 * pad);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, pad - L.x0 * s, pad - L.y0 * s);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#f00";
  ctx.fill(new Path2D(LOGO.paths.main), "evenodd");
  ctx.fillStyle = "#0f0";
  if (LOGO.paths.accent) ctx.fill(new Path2D(LOGO.paths.accent), "evenodd");
  const img = ctx.getImageData(0, 0, W, H).data;
  const dl = sdf(img, W, H, 0), dr = sdf(img, W, H, 1);
  const data = new Uint16Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = ((H - 1 - y) * W + x) * 4; // first row of the texture = bottom of the wordmark
    data[o] = THREE.DataUtils.toHalfFloat(Math.max(-1, Math.min(1, dl[i] / spreadPx)));
    data[o + 1] = THREE.DataUtils.toHalfFloat(Math.max(-1, Math.min(1, dr[i] / spreadPx)));
    data[o + 3] = 15360;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, w: W, h: H, pad, scale: s, spread: spreadPx, aspect: W / H };
}

let fontReady: Promise<void> | null = null;
/** font: file name → URL (the kit's public/fonts, e.g. f => staticFile(`fonts/${f}`)) */
export function loadFonts(font: (file: string) => string) {
  if (!fontReady) {
    fontReady = (async () => {
      for (const [w, f] of [["600", "ChakraPetch-SemiBold.ttf"], ["700", "ChakraPetch-Bold.ttf"], ["500", "ChakraPetch-Medium.ttf"]] as const) {
        const face = new FontFace("HMInscr", `url(${font(f)})`, { weight: w });
        await face.load();
        document.fonts.add(face);
      }
    })();
  }
  return fontReady;
}

/** a strip of engraving for the armillary rings and trims: the name between graduation marks. White = engraved. */
export function makeInscription(W = 4096, H = 256, words: string[] = ["YOUR BRAND"], seed = 1): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  // ruler along both edges: a mark every 1/360 of the strip, longer every 5, longest every 10
  for (let i = 0; i < 360; i++) {
    const x = (i / 360) * W, len = i % 10 === 0 ? 0.2 : i % 5 === 0 ? 0.14 : 0.08;
    ctx.fillRect(x - 1, 0, 2.2, H * len);
    ctx.fillRect(x - 1, H * (1 - len), 2.2, H * len);
  }
  ctx.fillRect(0, H * 0.235, W, 2.5);
  ctx.fillRect(0, H * 0.765 - 2.5, W, 2.5);
  // the name, repeated; a small lozenge between repeats
  const n = 6;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let k = 0; k < n; k++) {
    const cx = ((k + 0.5) / n) * W;
    if (!words.length) {
      // ornament: a ring, a crescent and a star between rows of dots
      const r0 = H * 0.15;
      ctx.lineWidth = H * 0.028;
      for (const dx of [-0.9, 0, 0.9]) {
        ctx.beginPath(); ctx.arc(cx + dx * H, H * 0.5, r0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + dx * H, H * 0.5, r0 * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = -9; i <= 9; i++) { if (Math.abs(i) < 1) continue; ctx.beginPath(); ctx.arc(cx + i * H * 0.16 * 1.9, H * 0.5, H * 0.018, 0, Math.PI * 2); ctx.fill(); }
      continue;
    }
    const word = words[(k + seed) % words.length];
    // a long name is set smaller so it keeps clear of the lozenges between repeats (≤ 74 % of its slot)
    let fs = H * 0.33, sp = H * 0.11;
    ctx.font = `700 ${Math.round(fs)}px HMInscr`;
    const chars = [...word];
    let widths = chars.map((c) => ctx.measureText(c).width);
    let total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    const room = (W / n) * 0.74;
    if (total > room) {
      const q = room / total;
      fs *= q; sp *= q;
      ctx.font = `700 ${Math.round(fs)}px HMInscr`;
      widths = chars.map((c) => ctx.measureText(c).width);
      total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    }
    let x = cx - total / 2;
    chars.forEach((c, i) => { ctx.fillText(c, x + widths[i] / 2, H * 0.515); x += widths[i] + sp; });
    const lx = ((k + 1) / n) * W;
    ctx.save();
    ctx.translate(lx, H * 0.5);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-H * 0.045, -H * 0.045, H * 0.09, H * 0.09);
    ctx.restore();
    ctx.fillRect(lx - H * 0.42, H * 0.5 - 1.2, H * 0.26, 2.4);
    ctx.fillRect(lx + H * 0.16, H * 0.5 - 1.2, H * 0.26, 2.4);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
