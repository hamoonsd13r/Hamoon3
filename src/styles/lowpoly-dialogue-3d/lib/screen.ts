// Lowpoly Dialogue 3D · the laptop screen, drawn on a canvas every frame (→ texture on the lid). The demo app is a
// small slide deck with a practice bar; swap `drawScreen` for whatever your story needs (a chat, an editor, a map…).
// Keep the important part around canvas y 420–760: screen shots frame that band (the heads sit above the lid).
import { clamp, COL, lerp, MONO, rnd, UI } from "./theme";

export const SCREEN_W = 1600;
export const SCREEN_H = 1000;

export type ScreenState = {
  slide: number; // 0..2 — the slide shown big (fractions cross-fade to the next one)
  practice: number; // 0..1 — the practice bar slides in (timer + voice wave)
  ready: number; // 0..1 — the «Ready» pill replaces the bar
  level: number; // 0..1 — the speaker's voice (drives the wave)
  timer: number; // seconds on the practice timer
  dim: number; // 0..1 — night mode when he falls asleep
  twinkle: number; // 0..1 — extra sparkle on the star slides
};

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const starfield = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, n: number, tw: number) => {
  for (let i = 0; i < n; i++) {
    const sx = x + rnd(i * 3.1) * w, sy = y + rnd(i * 7.7) * h;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + rnd(i) * 1.6) + i)) * (0.6 + 0.4 * tw);
    const r = (0.6 + rnd(i * 5.3) * 1.8) * (w / 1236);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// Orion (normalised positions on the slide)
const ORION: [number, number, number][] = [
  [0.36, 0.2, 1.2], // Betelgeuse
  [0.62, 0.24, 0.9], // Bellatrix
  [0.45, 0.5, 0.8],
  [0.5, 0.48, 0.8],
  [0.55, 0.46, 0.8], // the belt
  [0.4, 0.8, 0.8], // Saiph
  [0.66, 0.76, 1.2], // Rigel
];
const ORION_LINES = [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]];

/** one slide (i = 0 title, 1 constellation, 2 thank-you) in a box; used big and as a thumbnail */
function slide(ctx: CanvasRenderingContext2D, i: number, x: number, y: number, w: number, h: number, t: number, tw: number) {
  ctx.save();
  rr(ctx, x, y, w, h, Math.max(4, w * 0.012));
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, i === 1 ? "#060A22" : "#0B1446");
  g.addColorStop(1, i === 1 ? "#0E1640" : "#1D2B6B");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#F3F5FF";
  starfield(ctx, x, y, w, h, t, i === 1 ? 70 : 110, tw);
  const s = w / 1236;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (i === 0) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${Math.round(150 * s)}px ${UI}`;
    ctx.fillText("THE STARS", x + w / 2, y + h * 0.44);
    ctx.fillStyle = COL.glow;
    ctx.fillRect(x + w / 2 - 120 * s, y + h * 0.56, 240 * s, Math.max(2, 6 * s));
    ctx.fillStyle = "#C9D2FF";
    ctx.font = `500 ${Math.round(40 * s)}px ${UI}`;
    ctx.fillText("a 3-minute talk", x + w / 2, y + h * 0.66);
  } else if (i === 1) {
    ctx.strokeStyle = "rgba(200,214,255,0.55)";
    ctx.lineWidth = Math.max(1, 3 * s);
    for (const [a, b] of ORION_LINES) {
      ctx.beginPath();
      ctx.moveTo(x + ORION[a][0] * w, y + ORION[a][1] * h);
      ctx.lineTo(x + ORION[b][0] * w, y + ORION[b][1] * h);
      ctx.stroke();
    }
    for (const [k, [px, py, m]] of ORION.entries()) {
      const r = (10 + 8 * m) * s * (1 + 0.25 * tw * Math.abs(Math.sin(t * 3 + k)));
      const gl = ctx.createRadialGradient(x + px * w, y + py * h, 0, x + px * w, y + py * h, r * 3);
      gl.addColorStop(0, k === 0 ? "rgba(255,190,130,0.9)" : "rgba(200,220,255,0.9)");
      gl.addColorStop(1, "rgba(200,220,255,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(x + px * w - r * 3, y + py * h - r * 3, r * 6, r * 6);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x + px * w, y + py * h, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${Math.round(64 * s)}px ${UI}`;
    ctx.fillText("ORION", x + 56 * s, y + 70 * s);
    ctx.fillStyle = "#AFC0FF";
    ctx.font = `500 ${Math.round(28 * s)}px ${UI}`;
    ctx.fillText("Betelgeuse", x + ORION[0][0] * w + 30 * s, y + ORION[0][1] * h - 26 * s);
    ctx.fillText("Rigel", x + ORION[6][0] * w + 30 * s, y + ORION[6][1] * h + 30 * s);
  } else {
    const cx = x + w / 2, cy = y + h * 0.4, R = 120 * s;
    ctx.fillStyle = COL.glow;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
      const rr2 = k % 2 ? R * 0.42 : R;
      ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${Math.round(96 * s)}px ${UI}`;
    ctx.fillText("Thank you", cx, y + h * 0.72);
    ctx.fillStyle = "#C9D2FF";
    ctx.font = `500 ${Math.round(36 * s)}px ${UI}`;
    ctx.fillText("Questions?", cx, y + h * 0.84);
  }
  ctx.restore();
}

export function drawScreen(ctx: CanvasRenderingContext2D, t: number, st: ScreenState) {
  const Wc = SCREEN_W, Hc = SCREEN_H;
  ctx.clearRect(0, 0, Wc, Hc);
  ctx.fillStyle = "#0D1020";
  ctx.fillRect(0, 0, Wc, Hc);
  // window bar
  ctx.fillStyle = "#151A33";
  ctx.fillRect(0, 0, Wc, 64);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ["#4A5078", "#3C4266", "#323756"][i];
    ctx.beginPath();
    ctx.arc(34 + i * 30, 32, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(154,163,199,0.42)";
  ctx.font = `600 20px ${UI}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("stars.slides", Wc / 2, 33);
  // thumbnails
  const cur = clamp(Math.round(st.slide), 0, 2);
  for (let i = 0; i < 3; i++) {
    const x = 26, y = 96 + i * 178, w = 276, h = 155;
    slide(ctx, i, x, y, w, h, t, st.twinkle);
    ctx.lineWidth = i === cur ? 5 : 2;
    ctx.strokeStyle = i === cur ? COL.glow : "#2A3052";
    rr(ctx, x, y, w, h, 6);
    ctx.stroke();
    ctx.fillStyle = i === cur ? COL.glow : "#6B7399";
    ctx.font = `700 22px ${UI}`;
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), x + 10, y + h - 16);
  }
  // the big slide (cross-fade between whole slides)
  const X = 336, Y = 92, Wm = 1240, Hm = 698;
  const i0 = clamp(Math.floor(st.slide), 0, 2), fr = clamp(st.slide - i0);
  slide(ctx, i0, X, Y, Wm, Hm, t, st.twinkle);
  if (fr > 0.001 && i0 < 2) {
    ctx.globalAlpha = fr;
    slide(ctx, i0 + 1, X, Y, Wm, Hm, t, st.twinkle);
    ctx.globalAlpha = 1;
  }
  // bottom bar: idle tools → practice (timer + wave) → ready pill
  const by = 820;
  ctx.fillStyle = "#121630";
  rr(ctx, 336, by, Wm, 150, 18);
  ctx.fill();
  const pk = clamp(st.practice) * (1 - clamp(st.ready));
  if (pk < 0.999) {
    ctx.globalAlpha = 1 - pk;
    ctx.fillStyle = "#6B7399";
    ctx.font = `600 30px ${UI}`;
    ctx.textAlign = "left";
    ctx.fillText("3 slides  ·  ~3 min", 380, by + 75);
    ctx.globalAlpha = 1;
  }
  if (pk > 0.001) {
    ctx.globalAlpha = pk;
    const blink = Math.sin(t * 6) > -0.2 ? 1 : 0.25;
    ctx.fillStyle = `rgba(229,72,77,${blink})`;
    ctx.beginPath();
    ctx.arc(392, by + 75, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F2F4FF";
    ctx.font = `500 58px ${MONO}`;
    ctx.textAlign = "left";
    const sec = Math.max(0, Math.floor(st.timer));
    ctx.fillText(`00:${String(sec).padStart(2, "0")}`, 424, by + 78);
    // voice wave
    ctx.fillStyle = COL.glow;
    for (let i = 0; i < 40; i++) {
      const hgt = 8 + 92 * st.level * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.73 + t * 9.5))) * (0.55 + 0.45 * Math.sin(i * 0.31));
      rr(ctx, 690 + i * 18, by + 75 - hgt / 2, 10, Math.max(8, hgt), 5);
      ctx.fill();
    }
    ctx.fillStyle = "#9AA3C7";
    ctx.font = `600 28px ${UI}`;
    ctx.textAlign = "right";
    ctx.fillText("PRACTICE", Wc - 60, by + 75);
    ctx.globalAlpha = 1;
  }
  if (st.ready > 0.001) {
    const k = clamp(st.ready);
    ctx.globalAlpha = k;
    const pw = lerp(200, 420, k);
    ctx.fillStyle = COL.glow;
    rr(ctx, 336 + Wm / 2 - pw / 2, by + 35, pw, 80, 40);
    ctx.fill();
    ctx.strokeStyle = "#1A1206";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(336 + Wm / 2 - 130, by + 75);
    ctx.lineTo(336 + Wm / 2 - 108, by + 96);
    ctx.lineTo(336 + Wm / 2 - 72, by + 54);
    ctx.stroke();
    ctx.fillStyle = "#1A1206";
    ctx.font = `800 40px ${UI}`;
    ctx.textAlign = "left";
    ctx.fillText("Ready", 336 + Wm / 2 - 40, by + 77);
    ctx.globalAlpha = 1;
  }
  if (st.dim > 0.001) {
    ctx.fillStyle = `rgba(2,3,10,${0.62 * clamp(st.dim)})`;
    ctx.fillRect(0, 0, Wc, Hc);
  }
}
