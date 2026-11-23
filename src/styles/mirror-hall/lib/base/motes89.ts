// Mirror Hall · light particles that fill every world, made to read like real dust in light: very fine specks at many
// depths, visible only where the world is lit (each preset has its own light map), drifting with a slow random
// walk and twinkling as they turn; a few small lens bokeh with a soft bright rim; thin rising sparks; paper flakes
// or falling leaves. Deterministic in time; a little brighter on the kick (p.beatK).
import { hash } from "./lib89";

export type MotePreset = "room" | "moon" | "blue" | "paper" | "forest" | "window" | "floor";
type Cfg = {
  dust: number; dustCol: [number, number, number];
  drift: [number, number]; // px/s (x, y), dust and bokeh
  bokeh: number; bokehCol: [number, number, number][]; bokehSize: [number, number];
  sparks: number; sparkCol: [number, number, number];
  flakes?: number; flakeCols?: string[];
  leaves?: number;
  /** where the world is lit (0..1) in 1920×1080 design space; `ox/oy` = a light centre the director may pass */
  light: (x: number, y: number, ox: number, oy: number) => number;
};
const rad = (x: number, y: number, cx: number, cy: number, r: number) => Math.max(0, 1 - Math.hypot(x - cx, y - cy) / r);
const CFG: Record<MotePreset, Cfg> = {
  room: { dust: 520, dustCol: [255, 218, 170], drift: [3, -6], bokeh: 9, bokehCol: [[255, 196, 130], [255, 232, 200]], bokehSize: [6, 20], sparks: 14, sparkCol: [255, 210, 160], light: (x, y, ox) => 0.18 + 0.82 * Math.max(0, 1 - Math.abs(x - ox) / (260 + y * 0.35)) },
  moon: { dust: 560, dustCol: [236, 240, 248], drift: [2, -8], bokeh: 7, bokehCol: [[228, 232, 242]], bokehSize: [5, 16], sparks: 34, sparkCol: [255, 255, 255], light: (x, y, ox, oy) => 0.15 + 0.85 * Math.max(rad(x, y, ox, oy - 140, 520), 0.5 * rad(x, y, 1520, 260, 520)) },
  blue: { dust: 560, dustCol: [222, 226, 255], drift: [3, -5], bokeh: 8, bokehCol: [[170, 176, 255], [214, 200, 255]], bokehSize: [6, 18], sparks: 0, sparkCol: [230, 225, 255], light: (x, y) => {
    const l = 700 - (180 * y) / 880, r = 1150 + (230 * y) / 880;
    const inside = x > l && x < r && y < 900 ? 1 : 0;
    return 0.06 + 0.94 * inside * (1 - 0.45 * (y / 900));
  } },
  paper: { dust: 420, dustCol: [244, 236, 222], drift: [2, 7], bokeh: 4, bokehCol: [[236, 226, 210]], bokehSize: [6, 16], sparks: 0, sparkCol: [255, 255, 255], flakes: 26, flakeCols: ["#8bc6d1", "#a9d6de", "#e7dccd", "#cfc4b8"], light: (x, y) => 0.08 + 0.92 * rad(x, y, 960, -120, 980) },
  forest: { dust: 380, dustCol: [255, 238, 190], drift: [3, -2], bokeh: 10, bokehCol: [[255, 220, 140], [220, 240, 170]], bokehSize: [5, 16], sparks: 0, sparkCol: [255, 255, 255], leaves: 7, light: (x, y) => 0.25 + 0.75 * Math.max(0, 1 - y / 760) },
  window: { dust: 360, dustCol: [255, 226, 186], drift: [2, -2], bokeh: 8, bokehCol: [[255, 196, 120], [150, 186, 255]], bokehSize: [5, 15], sparks: 0, sparkCol: [255, 255, 255], light: (x, y) => (x > 300 && x < 1760 && y < 860 ? 0.85 : 0.18) },
  floor: { dust: 460, dustCol: [196, 214, 255], drift: [2, -4], bokeh: 6, bokehCol: [[170, 196, 255]], bokehSize: [5, 14], sparks: 0, sparkCol: [255, 255, 255], light: (x, y) => 0.12 + 0.88 * Math.max(0, 1 - Math.hypot((x - 1180) / 760, (y - 480) / 260)) },
};

const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
/** a slow random walk (sum of incommensurate sines) */
const walk = (t: number, s: number) => Math.sin(t * 0.37 + s * 6.1) * 0.6 + Math.sin(t * 0.81 + s * 3.7) * 0.3 + Math.sin(t * 1.73 + s * 9.2) * 0.1;

/** draw the particles over a world in 1920×1080 design space; ox/oy = a light source (e.g. the warrior) */
export function drawMotes(g: CanvasRenderingContext2D, lt: number, preset: MotePreset, amount = 1, beatK = 0, ox = 960, oy = 560) {
  const c = CFG[preset];
  const pulse = 1 + 0.45 * beatK;
  g.save();
  g.globalCompositeOperation = "lighter";
  // ---- dust: three depths (far: tiny, dim, slow; near: a little bigger and softer)
  const n = Math.round(c.dust * amount);
  for (let i = 0; i < n; i++) {
    const sd = i * 3.17 + 11;
    const depth = hash(sd + 9); // 0 far … 1 near
    const sp = 0.3 + depth * 1.2;
    const x = ((((hash(sd) * 2040 + lt * c.drift[0] * sp + walk(lt, sd) * 26 * sp) % 2040) + 2040) % 2040) - 60;
    const y = ((((hash(sd + 2) * 1160 + lt * c.drift[1] * sp + walk(lt + 40, sd) * 22 * sp) % 1160) + 1160) % 1160) - 40;
    const L = c.light(x, y, ox, oy);
    if (L < 0.03) continue;
    // a speck turns: its brightness flickers as a facet catches the light
    const tw = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(lt * (2 + 5 * hash(sd + 4)) + i * 1.7), 3);
    const r = depth < 0.85 ? 0.45 + depth * 1.1 : 1.4 + (depth - 0.85) * 9; // a few near ones are soft and larger
    const a = (depth < 0.85 ? 0.25 + 0.55 * hash(sd + 5) : 0.12) * tw * L * pulse * amount;
    if (a < 0.01) continue;
    if (r < 1.2) {
      g.fillStyle = rgba(c.dustCol, a);
      g.fillRect(x - r, y - r, r * 2, r * 2);
    } else {
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, rgba(c.dustCol, a));
      grd.addColorStop(1, rgba(c.dustCol, 0));
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // now and then a speck flashes (a glint)
    if (hash(sd + Math.floor(lt * 6)) > 0.992) {
      g.fillStyle = rgba([255, 255, 255], 0.75 * L);
      g.fillRect(x - 0.8, y - 3, 1.6, 6);
      g.fillRect(x - 3, y - 0.8, 6, 1.6);
    }
  }
  // ---- a few small lens bokeh with a soft bright rim
  for (let i = 0; i < c.bokeh * amount; i++) {
    const sd = i * 7.31 + 3;
    const x = ((hash(sd) * 2100 + lt * c.drift[0] * 0.5 + walk(lt, sd) * 40) % 2100) - 90;
    const y = ((hash(sd + 2) * 1180 + lt * c.drift[1] * 0.4 + walk(lt + 9, sd) * 30) % 1180) - 50;
    const L = c.light(x, y, ox, oy);
    const r = c.bokehSize[0] + hash(sd + 4) * (c.bokehSize[1] - c.bokehSize[0]);
    const a = (0.05 + 0.07 * hash(sd + 5)) * (0.3 + 0.7 * L) * pulse * amount;
    const col = c.bokehCol[i % c.bokehCol.length];
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, rgba(col, a * 0.55));
    grd.addColorStop(0.78, rgba(col, a * 0.75));
    grd.addColorStop(0.92, rgba(col, a * 1.15));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // ---- sparks: tiny bright points rising with a hair-thin tail
  for (let i = 0; i < c.sparks * amount; i++) {
    const sd = i * 5.71 + 29;
    const life = 2.8 + hash(sd) * 3;
    const ph = ((lt + hash(sd + 1) * life) % life) / life;
    const x = hash(sd + 2) * 1920 + Math.sin(ph * 5 + i) * 24;
    const y = 1080 - ph * (520 + hash(sd + 3) * 520);
    const L = c.light(x, y, ox, oy);
    const a = Math.sin(Math.PI * ph) * (0.3 + 0.5 * hash(sd + 4)) * (0.4 + 0.6 * L) * pulse * amount;
    g.strokeStyle = rgba(c.sparkCol, a * 0.6);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - Math.cos(ph * 5 + i) * 3, y + 10);
    g.stroke();
    g.fillStyle = rgba(c.sparkCol, a);
    g.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
  }
  g.restore();
  // ---- paper flakes (normal blending): small torn bits turning in the air
  if (c.flakes) {
    for (let i = 0; i < c.flakes * amount; i++) {
      const sd = i * 9.13 + 41;
      const x = ((hash(sd) * 2100 + lt * (6 + 14 * hash(sd + 1)) + walk(lt, sd) * 50) % 2100) - 90;
      const y = ((hash(sd + 2) * 1250 + lt * (14 + 22 * hash(sd + 3))) % 1250) - 80;
      const s = 2.5 + hash(sd + 4) * 5;
      g.save();
      g.translate(x, y);
      g.rotate(lt * (1 + 2 * hash(sd + 5)) + i);
      g.scale(1, Math.abs(Math.cos(lt * 2.2 + i)) * 0.8 + 0.2);
      g.fillStyle = c.flakeCols![i % c.flakeCols!.length];
      g.globalAlpha = (0.45 + 0.35 * hash(sd + 6)) * (0.35 + 0.65 * c.light(x, y, ox, oy));
      g.beginPath();
      g.moveTo(-s, -s * 0.6);
      g.lineTo(s * 0.8, -s * 0.8);
      g.lineTo(s, s * 0.5);
      g.lineTo(-s * 0.6, s * 0.9);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
  // ---- falling autumn leaves (normal blending)
  if (c.leaves) {
    for (let i = 0; i < c.leaves * amount; i++) {
      const sd = i * 13.7 + 5;
      const life = 6 + hash(sd) * 4;
      const ph = ((lt + hash(sd + 1) * life) % life) / life;
      const x = hash(sd + 2) * 2000 - 40 + Math.sin(ph * 9 + i) * 60 + ph * 120;
      const y = -60 + ph * 1200;
      const s = 7 + hash(sd + 3) * 8;
      g.save();
      g.translate(x, y);
      g.rotate(ph * 8 + i);
      g.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(ph * 12 + i)));
      const cols = ["#b8401c", "#d39634", "#9a3019", "#c96f26"];
      g.fillStyle = cols[i % cols.length];
      g.globalAlpha = 0.8;
      g.beginPath();
      g.moveTo(0, -s);
      g.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s);
      g.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s);
      g.fill();
      g.strokeStyle = "rgba(60,20,8,0.5)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(0, -s);
      g.lineTo(0, s);
      g.stroke();
      g.restore();
    }
  }
}
