// Eight tiny "AI videos" drawn in code (portrait cards). Used by both films: the reel feed and preview in A,
// the tunnel walls in B. Each is draw(ctx, w, h, t) and loops smoothly; nothing comes from the user's footage.
import { rnd } from "./theme";

type Ctx = CanvasRenderingContext2D;
export type SceneFn = (c: Ctx, w: number, h: number, t: number) => void;

const TAU = Math.PI * 2;
const vgrad = (c: Ctx, h: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
};
const glow = (c: Ctx, x: number, y: number, r: number, col: string, a = 1) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = a;
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1;
};
const stars = (c: Ctx, w: number, h: number, n: number, seed: number, t: number, drift = 0) => {
  for (let i = 0; i < n; i++) {
    const x = ((rnd(seed + i) * w + t * drift * (0.3 + rnd(seed + i + 50))) % w + w) % w;
    const y = rnd(seed + i * 3.1) * h;
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
    c.globalAlpha = 0.35 + 0.65 * tw * rnd(seed + i * 7);
    c.fillStyle = "#fff";
    const s = 0.6 + rnd(seed + i * 9) * 1.6;
    c.fillRect(x, y, s, s);
  }
  c.globalAlpha = 1;
};
/** jagged silhouette band */
const ridge = (c: Ctx, w: number, base: number, amp: number, seed: number, col: string, h: number, off = 0) => {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) {
    const u = (x + off) / w;
    const y = base - amp * (0.55 * Math.sin(u * 5.1 + seed) + 0.3 * Math.sin(u * 13.7 + seed * 2) + 0.15 * Math.sin(u * 29 + seed * 3));
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fill();
};

// 0 · synth road: striped sun, mountains, moving grid
const road: SceneFn = (c, w, h, t) => {
  const hz = h * 0.56;
  c.fillStyle = vgrad(c, hz, [[0, "#0a0b1f"], [0.6, "#3a1530"], [1, "#ff7a3d"]]);
  c.fillRect(0, 0, w, hz);
  stars(c, w, hz * 0.6, 40, 3, t);
  const sr = w * 0.3;
  const sy = hz - sr * 0.35;
  c.save();
  c.beginPath();
  c.arc(w / 2, sy, sr, 0, TAU);
  c.clip();
  c.fillStyle = vgrad(c, h, [[0, "#ffe2a8"], [0.45, "#ffb36b"], [0.6, "#ff5a2e"]]);
  c.fillRect(0, sy - sr, w, sr * 2);
  c.fillStyle = "#3a1530";
  for (let i = 0; i < 6; i++) {
    const y = sy + sr * (0.05 + i * 0.16) + ((t * 14) % (sr * 0.16));
    c.fillRect(0, y, w, 2 + i * 1.6);
  }
  c.restore();
  glow(c, w / 2, sy, sr * 1.8, "rgba(255,120,60,0.45)");
  ridge(c, w, hz, h * 0.07, 1.3, "#14081a", h);
  c.fillStyle = vgrad(c, h, [[0.56, "#14081a"], [1, "#05050c"]]);
  c.fillRect(0, hz, w, h - hz);
  c.strokeStyle = "rgba(255,122,61,0.75)";
  c.lineWidth = 1.2;
  for (let i = -10; i <= 10; i++) {
    c.beginPath();
    c.moveTo(w / 2 + i * w * 0.05, hz);
    c.lineTo(w / 2 + i * w * 0.45, h);
    c.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const k = ((i + t * 1.6) % 12) / 12;
    const y = hz + (h - hz) * k * k;
    c.globalAlpha = k;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
  c.globalAlpha = 1;
};

// 1 · concert: crowd silhouettes, sweeping beams, sparks
const concert: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#05060c"], [0.6, "#1a0f14"], [1, "#2b1208"]]);
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const a = Math.sin(t * 1.6 + i * 1.7) * 0.5;
    const x0 = w * (0.1 + i * 0.2);
    const g = c.createLinearGradient(x0, 0, x0 + Math.sin(a) * h, h);
    g.addColorStop(0, i % 2 ? "rgba(255,179,107,0.55)" : "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x0 - 4, 0);
    c.lineTo(x0 + 4, 0);
    c.lineTo(x0 + Math.sin(a) * h * 0.9 + w * 0.12, h);
    c.lineTo(x0 + Math.sin(a) * h * 0.9 - w * 0.12, h);
    c.closePath();
    c.fill();
  }
  glow(c, w / 2, h * 0.62, w * 0.7, "rgba(255,122,61,0.5)", 0.6 + 0.4 * Math.abs(Math.sin(t * 4.1)));
  for (let i = 0; i < 40; i++) {
    const y = h - ((rnd(i) * h + t * (40 + rnd(i + 9) * 80)) % h);
    c.fillStyle = "rgba(255,200,140,0.9)";
    c.fillRect(rnd(i + 3) * w, y, 1.5, 1.5);
  }
  c.globalCompositeOperation = "source-over";
  // stage + performer
  c.fillStyle = "#07070a";
  c.fillRect(0, h * 0.7, w, h * 0.3);
  const px = w / 2, py = h * 0.7;
  c.beginPath();
  c.ellipse(px, py - h * 0.2, w * 0.045, w * 0.05, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(px - w * 0.08, py);
  c.lineTo(px - w * 0.05, py - h * 0.17);
  c.lineTo(px + w * 0.05, py - h * 0.17);
  c.lineTo(px + w * 0.08, py);
  c.fill();
  const arm = Math.sin(t * 4) * 0.4;
  c.lineWidth = w * 0.025;
  c.strokeStyle = "#07070a";
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(px + w * 0.04, py - h * 0.16);
  c.lineTo(px + w * 0.16, py - h * (0.26 + 0.04 * arm));
  c.stroke();
  // crowd
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.5) * (w / 16) + (rnd(i) - 0.5) * 10;
    const b = Math.max(0, Math.sin(t * 8.27 + i * 0.7)) * h * 0.012;
    const y = h * 0.86 + rnd(i + 4) * h * 0.04 - b;
    c.fillStyle = "#020203";
    c.beginPath();
    c.arc(x, y, w * 0.045, 0, TAU);
    c.fill();
    c.fillRect(x - w * 0.06, y + w * 0.03, w * 0.12, h);
    if (i % 4 === 1) {
      c.fillRect(x + w * 0.02, y - h * 0.08 - b, w * 0.018, h * 0.08);
    }
  }
};

// 2 · space: ringed planet, moon, drifting stars
const space: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#02030a"], [1, "#0b1020"]]);
  c.fillRect(0, 0, w, h);
  stars(c, w, h, 90, 11, t, 6);
  glow(c, w * 0.8, h * 0.15, w * 0.6, "rgba(90,120,200,0.25)");
  const px = w * 0.5, py = h * 0.52, r = w * 0.34;
  const ring = (back: boolean) => {
    c.save();
    c.translate(px, py);
    c.rotate(-0.35);
    c.beginPath();
    if (back) c.ellipse(0, 0, r * 1.75, r * 0.4, 0, Math.PI, TAU);
    else c.ellipse(0, 0, r * 1.75, r * 0.4, 0, 0, Math.PI);
    c.strokeStyle = "rgba(255,200,150,0.75)";
    c.lineWidth = r * 0.12;
    c.stroke();
    c.strokeStyle = "rgba(255,230,200,0.35)";
    c.lineWidth = r * 0.04;
    c.stroke();
    c.restore();
  };
  ring(true);
  const g = c.createRadialGradient(px - r * 0.4, py - r * 0.4, r * 0.1, px, py, r);
  g.addColorStop(0, "#ffd8a8");
  g.addColorStop(0.5, "#d9662e");
  g.addColorStop(1, "#2a0d06");
  c.fillStyle = g;
  c.beginPath();
  c.arc(px, py, r, 0, TAU);
  c.fill();
  c.save();
  c.clip();
  c.globalAlpha = 0.25;
  for (let i = 0; i < 7; i++) {
    c.fillStyle = i % 2 ? "#ffefd8" : "#5a1c08";
    c.fillRect(px - r, py - r + i * r * 0.3 + Math.sin(t + i) * 3, r * 2, r * 0.1);
  }
  c.restore();
  c.globalAlpha = 1;
  ring(false);
  const ma = t * 0.9;
  const mx = px + Math.cos(ma) * r * 1.6, my = py + Math.sin(ma) * r * 0.45 - r * 0.5;
  c.fillStyle = "#cfd6e4";
  c.beginPath();
  c.arc(mx, my, r * 0.09, 0, TAU);
  c.fill();
  glow(c, px, py, r * 1.5, "rgba(255,140,80,0.18)");
};

// 3 · neon city at night with rain and reflections
const city: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#04050b"], [0.55, "#121426"], [1, "#05060a"]]);
  c.fillRect(0, 0, w, h);
  const base = h * 0.66;
  for (let layer = 0; layer < 3; layer++) {
    const n = 7 + layer * 3;
    for (let i = 0; i < n; i++) {
      const bw = (w / n) * (0.8 + rnd(i + layer * 20) * 0.4);
      const x = (i / n) * w + ((t * (4 + layer * 6)) % (w / n)) - w / n;
      const bh = h * (0.18 + rnd(i * 3 + layer) * (0.35 - layer * 0.08));
      c.fillStyle = ["#0d0f1c", "#090a14", "#050509"][layer];
      c.fillRect(x, base - bh, bw - 3, bh);
      for (let yy = base - bh + 8; yy < base - 6; yy += 9) {
        for (let xx = x + 4; xx < x + bw - 8; xx += 8) {
          const r = rnd(Math.floor(xx * 0.7 + yy * 3.3 + layer * 99));
          if (r > 0.86) {
            c.fillStyle = r > 0.97 ? "#ffb36b" : "rgba(255,200,150,0.55)";
            c.fillRect(xx, yy, 3, 4);
          }
        }
      }
    }
  }
  // street + reflection
  c.fillStyle = "#06070c";
  c.fillRect(0, base, w, h - base);
  c.save();
  c.globalAlpha = 0.35;
  c.translate(0, base * 2);
  c.scale(1, -1);
  c.drawImage(c.canvas, 0, 0, c.canvas.width, c.canvas.height * (base / h), 0, 0, w, base);
  c.restore();
  glow(c, w * 0.3, base - h * 0.05, w * 0.4, "rgba(255,122,61,0.35)");
  c.strokeStyle = "rgba(200,210,255,0.35)";
  c.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const x = rnd(i) * w;
    const y = ((rnd(i + 7) * h + t * 900) % (h + 40)) - 40;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 4, y + 22);
    c.stroke();
  }
};

// 4 · animation: a little robot character that bobs, blinks and waves
const robot: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#141a33"], [1, "#0a0d1c"]]);
  c.fillRect(0, 0, w, h);
  glow(c, w / 2, h * 0.5, w * 0.8, "rgba(255,150,80,0.25)");
  for (let i = 0; i < 14; i++) {
    const y = ((rnd(i) * h - t * 30 * (0.5 + rnd(i + 2))) % h + h) % h;
    c.globalAlpha = 0.35;
    c.fillStyle = "#ffd2a8";
    c.beginPath();
    c.arc(rnd(i + 5) * w, y, 2 + rnd(i) * 3, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
  const bob = Math.sin(t * 5) * h * 0.012;
  const cx = w / 2, cy = h * 0.5 + bob;
  const s = w * 0.36;
  // shadow
  c.fillStyle = "rgba(0,0,0,0.45)";
  c.beginPath();
  c.ellipse(cx, h * 0.8, s * 0.75, s * 0.12, 0, 0, TAU);
  c.fill();
  // body
  const round = (x: number, y: number, ww: number, hh: number, r: number, f: string) => {
    c.fillStyle = f;
    c.beginPath();
    c.roundRect(x, y, ww, hh, r);
    c.fill();
  };
  round(cx - s * 0.5, cy + s * 0.35, s, s * 0.75, s * 0.2, "#ff7a3d");
  round(cx - s * 0.42, cy + s * 0.45, s * 0.84, s * 0.12, s * 0.06, "rgba(255,255,255,0.25)");
  // waving arm
  const wv = Math.sin(t * 7) * 0.5;
  c.save();
  c.translate(cx + s * 0.5, cy + s * 0.45);
  c.rotate(-1.1 + wv);
  round(-s * 0.07, -s * 0.5, s * 0.14, s * 0.5, s * 0.07, "#e8642c");
  c.restore();
  round(cx - s * 0.62, cy + s * 0.45, s * 0.14, s * 0.45, s * 0.07, "#e8642c");
  // head
  round(cx - s * 0.6, cy - s * 0.55, s * 1.2, s * 0.85, s * 0.3, "#f5f0e6");
  round(cx - s * 0.48, cy - s * 0.43, s * 0.96, s * 0.6, s * 0.2, "#10131f");
  const blink = (t * 0.9) % 2.2 < 0.12 ? 0.15 : 1;
  c.fillStyle = "#ffb36b";
  for (const ex of [-0.2, 0.2]) {
    c.beginPath();
    c.ellipse(cx + ex * s, cy - s * 0.15, s * 0.08, s * 0.1 * blink, 0, 0, TAU);
    c.fill();
  }
  c.strokeStyle = "#ffb36b";
  c.lineWidth = s * 0.035;
  c.lineCap = "round";
  c.beginPath();
  c.arc(cx, cy - s * 0.05, s * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
  c.stroke();
  // antenna
  c.strokeStyle = "#f5f0e6";
  c.lineWidth = s * 0.04;
  c.beginPath();
  c.moveTo(cx, cy - s * 0.55);
  c.lineTo(cx + Math.sin(t * 6) * s * 0.06, cy - s * 0.78);
  c.stroke();
  glow(c, cx + Math.sin(t * 6) * s * 0.06, cy - s * 0.8, s * 0.2, "rgba(255,122,61,0.9)");
};

// 5 · cinematic desert: giant sun, dunes, a lone walker, dust
const desert: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#1a0d08"], [0.5, "#8a3a14"], [0.62, "#f0a050"], [1, "#2a1206"]]);
  c.fillRect(0, 0, w, h);
  const sx = w * 0.5, sy = h * 0.5;
  glow(c, sx, sy, w * 0.9, "rgba(255,200,120,0.5)");
  c.fillStyle = "#ffe6b8";
  c.beginPath();
  c.arc(sx, sy, w * 0.28, 0, TAU);
  c.fill();
  ridge(c, w, h * 0.66, h * 0.03, 4.2, "#5a2410", h, t * 8);
  ridge(c, w, h * 0.74, h * 0.04, 2.1, "#3a160a", h, t * 16);
  // walker on the crest
  const wx = w * 0.42 + Math.sin(t * 0.4) * 4, wy = h * 0.735;
  const st = Math.sin(t * 5);
  c.fillStyle = "#1a0904";
  c.beginPath();
  c.arc(wx, wy - h * 0.085, w * 0.018, 0, TAU);
  c.fill();
  c.fillRect(wx - w * 0.014, wy - h * 0.075, w * 0.028, h * 0.045);
  c.strokeStyle = "#1a0904";
  c.lineWidth = w * 0.012;
  c.beginPath();
  c.moveTo(wx, wy - h * 0.032);
  c.lineTo(wx + st * w * 0.02, wy);
  c.moveTo(wx, wy - h * 0.032);
  c.lineTo(wx - st * w * 0.02, wy);
  c.stroke();
  ridge(c, w, h * 0.84, h * 0.03, 7.7, "#200b04", h, t * 30);
  for (let i = 0; i < 50; i++) {
    const x = ((rnd(i) * w + t * (60 + rnd(i + 1) * 90)) % w);
    c.globalAlpha = 0.4 * rnd(i + 2);
    c.fillStyle = "#ffd9a0";
    c.fillRect(x, h * 0.55 + rnd(i + 4) * h * 0.4, 2, 1);
  }
  c.globalAlpha = 1;
  // letterbox, cinema feel
  c.fillStyle = "#000";
  c.fillRect(0, 0, w, h * 0.07);
  c.fillRect(0, h * 0.93, w, h * 0.07);
};

// 6 · forest with fog and god rays
const forest: SceneFn = (c, w, h, t) => {
  c.fillStyle = vgrad(c, h, [[0, "#20283a"], [0.5, "#4a4038"], [1, "#0b0c10"]]);
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const x = w * (0.15 + i * 0.16) + Math.sin(t * 0.5 + i) * 10;
    const g = c.createLinearGradient(x, 0, x + w * 0.3, h);
    g.addColorStop(0, "rgba(255,210,150,0.32)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + w * 0.05, 0);
    c.lineTo(x + w * 0.45, h);
    c.lineTo(x + w * 0.25, h);
    c.closePath();
    c.fill();
  }
  c.globalCompositeOperation = "source-over";
  const tree = (x: number, base: number, s: number, col: string) => {
    c.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(x, base - s * (1 - k * 0.2) - s * 0.2);
      c.lineTo(x - s * (0.18 + k * 0.06), base - s * (0.55 - k * 0.15));
      c.lineTo(x + s * (0.18 + k * 0.06), base - s * (0.55 - k * 0.15));
      c.fill();
    }
    c.fillRect(x - s * 0.02, base - s * 0.15, s * 0.04, s * 0.2);
  };
  const layers: [number, string, number][] = [[0.62, "#3b3a3e", 0.3], [0.72, "#24252b", 0.42], [0.86, "#101116", 0.6]];
  layers.forEach(([base, col, s], li) => {
    for (let i = 0; i < 9; i++) {
      const x = ((i / 8) * w * 1.2 - w * 0.1 + t * (3 + li * 7)) % (w * 1.2) - w * 0.1;
      tree(x, h * base, h * s * (0.8 + rnd(i + li * 9) * 0.4), col);
    }
    c.fillStyle = `rgba(200,190,180,${0.12 - li * 0.03})`;
    c.fillRect(0, h * base - h * 0.04, w, h * 0.08);
  });
  for (let i = 0; i < 24; i++) {
    c.globalAlpha = 0.6 * Math.abs(Math.sin(t * 2 + i));
    c.fillStyle = "#ffd28a";
    c.fillRect(rnd(i) * w + Math.sin(t + i) * 6, h * 0.5 + rnd(i + 3) * h * 0.4, 2, 2);
  }
  c.globalAlpha = 1;
};

// 7 · particle galaxy
const galaxy: SceneFn = (c, w, h, t) => {
  c.fillStyle = "#020205";
  c.fillRect(0, 0, w, h);
  stars(c, w, h, 60, 77, t);
  const cx = w / 2, cy = h * 0.48;
  c.globalCompositeOperation = "lighter";
  glow(c, cx, cy, w * 0.5, "rgba(255,170,100,0.55)");
  for (let i = 0; i < 700; i++) {
    const arm = i % 3;
    const d = Math.pow(rnd(i), 0.6);
    const a = arm * (TAU / 3) + d * 5.2 + t * (0.5 - d * 0.3) + (rnd(i + 3) - 0.5) * 0.5;
    const x = cx + Math.cos(a) * d * w * 0.48;
    const y = cy + Math.sin(a) * d * w * 0.48 * 0.62;
    c.fillStyle = d < 0.25 ? "rgba(255,230,190,0.9)" : rnd(i + 5) > 0.7 ? "rgba(255,140,70,0.85)" : "rgba(200,215,255,0.7)";
    const s = 0.8 + (1 - d) * 1.6;
    c.fillRect(x, y, s, s);
  }
  glow(c, cx, cy, w * 0.12, "rgba(255,240,220,0.95)");
  c.globalCompositeOperation = "source-over";
};

export const SCENES: SceneFn[] = [road, concert, space, city, robot, desert, forest, galaxy];

/** draw scene k into the whole canvas at time t (dpr-aware: canvas pixels are the coordinate space) */
export const drawScene = (c: Ctx, k: number, t: number) => {
  const { width: w, height: h } = c.canvas;
  c.save();
  c.clearRect(0, 0, w, h);
  SCENES[((k % SCENES.length) + SCENES.length) % SCENES.length](c, w, h, t);
  c.restore();
};
