// 11 · Pixel Art — a 144×256 sunset beach, every pixel placed by code at 12 fps: dithered sky with a glow halo,
// layered clouds, distant islands, a sailboat, a striped setting sun and its shimmering column, a swaying palm with
// coconuts, an umbrella, a crab, two players and a beach ball, a spinning coin HUD and an RPG title box.
import React, { useLayoutEffect, useRef } from "react";
import { PH, PW, hash, stepT } from "../theme";
import { Frame, type PosterProps } from "../kit";

const CW = 144, CH = 256;
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const SKY = ["#140C33", "#2B1752", "#5A2470", "#9C3374", "#D9506A", "#F2854A", "#FFC163"].map(hex);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const GLYPH: Record<string, string[]> = {
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  I: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"],
  X: ["X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  T: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
  S: [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
  C: [".XXXX", "X....", "X....", "X....", "X....", "X....", ".XXXX"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  U: ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  "0": [".XXX.", "X...X", "X..XX", "X.X.X", "XX..X", "X...X", ".XXX."],
  "1": ["..X..", ".XX..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
  "2": [".XXX.", "X...X", "....X", "...X.", "..X..", ".X...", "XXXXX"],
  "3": ["XXXX.", "....X", "....X", ".XXX.", "....X", "....X", "XXXX."],
  "4": ["...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."],
  "5": ["XXXXX", "X....", "XXXX.", "....X", "....X", "X...X", ".XXX."],
  "6": [".XXX.", "X....", "X....", "XXXX.", "X...X", "X...X", ".XXX."],
  "7": ["XXXXX", "....X", "...X.", "..X..", ".X...", ".X...", ".X..."],
  "8": [".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."],
  "9": [".XXX.", "X...X", "X...X", ".XXXX", "....X", "....X", ".XXX."],
  x: ["...", "X.X", ".X.", "X.X", "..."],
  "♥": [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."],
  "▶": ["X..", "XX.", "XXX", "XX.", "X.."],
};
// sprites: letters → colours
const SPR: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  cloud: { rows: ["........WWWW..........", "....WWWWWWWWWW...WWW..", "..WWWWWWWWWWWWWWWWWWW.", ".WWWWWWWWWWWWWWWWWWWWW", "LLLLLWWWWWWWWWWWWLLLLL", "..LLLLLLLLLLLLLLLLLL.."], pal: { W: "#F7B5C9", L: "#C46A93" } },
  cloud2: { rows: ["....WWW.......", "..WWWWWWW.WW..", "WWWWWWWWWWWWWW", ".LLLLLLLLLLLL."], pal: { W: "#E89AB4", L: "#A9567E" } },
  boat: { rows: ["....W......", "...WWw.....", "..WWWww....", ".WWWWwww...", "WWWWWwwww..", "....M......", "HHHHHHHHHHH", ".HHHHHHHHH."], pal: { W: "#FFF1DE", w: "#F2C9A8", M: "#2A1A2E", H: "#3B1E35" } },
  umbrella: { rows: ["......RRR......", "...RRWWWRRWW...", ".RRWWWRRRWWWRR.", "RWWWRRRRRRWWWRR", ".......P.......", ".......P.......", ".......P.......", ".......P.......", ".......P.......", ".......P......."], pal: { R: "#E8413C", W: "#FFF1DE", P: "#3B1E35" } },
  towel: { rows: ["BBBBBBBBBB", "YYYYYYYYYY", "BBBBBBBBBB"], pal: { B: "#3A7BD5", Y: "#FFD15C" } },
  crab: { rows: ["R.....R", ".RRRRR.", "RR.R.RR", ".R...R."], pal: { R: "#E8413C" } },
  crab2: { rows: [".R...R.", ".RRRRR.", "RR.R.RR", "R.....R"], pal: { R: "#E8413C" } },
  coconut: { rows: [".BB.", "BBBB", ".BB."], pal: { B: "#5A3424" } },
  coin0: { rows: [".YYY.", "YyYYY", "YyYYY", "YyYYY", ".YYY."], pal: { Y: "#FFD15C", y: "#FFF1B0" } },
  coin1: { rows: ["..Y..", ".YyY.", ".YyY.", ".YyY.", "..Y.."], pal: { Y: "#FFD15C", y: "#FFF1B0" } },
  coin2: { rows: ["..Y..", "..Y..", "..Y..", "..Y..", "..Y.."], pal: { Y: "#E0A93A" } },
};

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, x: number, y: number, col: string, w = 1, h = 1) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
const spr = (c: Ctx, name: string, x: number, y: number, flip = false) => {
  const s = SPR[name];
  s.rows.forEach((row, r) => Array.from(row).forEach((ch, q) => {
    const col = s.pal[ch];
    if (col) px(c, x + (flip ? row.length - 1 - q : q), y + r, col);
  }));
};
const text = (c: Ctx, s: string, x: number, y: number, col: string, k = 1, drop?: (i: number) => number) => {
  let cx = x;
  Array.from(s).forEach((ch, i) => {
    const g = GLYPH[ch];
    if (g) {
      const dy = drop ? drop(i) : 0;
      if (dy > -900) g.forEach((row, r) => Array.from(row).forEach((v, q) => v === "X" && px(c, cx + q * k, y + r * k + dy, col, k, k)));
      cx += (g[0].length + 1) * k;
    } else cx += 4 * k;
  });
};
const textW = (s: string, k = 1) => Array.from(s).reduce((w, ch) => w + ((GLYPH[ch]?.[0].length ?? 3) + 1) * k, 0) - k;

const draw = (c: Ctx, t: number) => {
  const im = c.createImageData(CW, CH);
  const d = im.data;
  const sunX = 72, sunY = 146 + t * 2.4, sunR = 27, HOR = 158;
  const put = (x: number, y: number, rgb: number[]) => {
    const o = (y * CW + x) * 4;
    d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
  };
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const b = BAYER[(y % 4) * 4 + (x % 4)];
      if (y < HOR) {
        // sky bands, lifted by the sun's halo
        const halo = Math.max(0, 1 - Math.hypot((x - sunX) * 0.8, y - sunY) / 70);
        const v = Math.min(6, Math.max(0, (y / HOR) * 6.6 - 0.3 + halo * 1.6));
        put(x, y, SKY[Math.min(6, Math.floor(v + b - 0.5 + 0.5))]);
      } else if (y < 204) {
        const v = (y - HOR) / 46;
        put(x, y, v + b * 0.5 < 0.32 ? hex("#2E6E86") : v + b * 0.5 < 0.7 ? hex("#1C4D66") : hex("#13344D"));
      } else {
        const v = (y - 204) / 52;
        put(x, y, b < 0.22 + v * 0.2 ? hex("#C9824E") : b > 0.93 ? hex("#F7C894") : hex("#E9A86A"));
      }
    }
  c.putImageData(im, 0, 0);
  // stars in the high sky
  for (let i = 0; i < 22; i++) {
    const sx = Math.floor(hash(i * 3.7) * CW), sy = 22 + Math.floor(hash(i * 9.1) * 40);
    if (hash(i * 5.3 + Math.floor(t * 4)) > 0.3) px(c, sx, sy, i % 3 ? "#FFE39B" : "#FFFFFF");
  }
  // clouds, two depths
  spr(c, "cloud", ((t * 3) % (CW + 40)) - 30, 84);
  spr(c, "cloud", ((t * 3 + 90) % (CW + 40)) - 30, 64);
  spr(c, "cloud2", ((t * 6 + 40) % (CW + 30)) - 20, 112);
  // sun: striped lower half
  for (let y = -sunR; y <= sunR; y++) {
    const yy = Math.round(sunY + y);
    if (yy >= HOR) continue;
    if (y > 1 && (y + Math.floor(t * 6)) % 5 >= 3) continue;
    const w = Math.round(Math.sqrt(sunR * sunR - y * y));
    px(c, sunX - w, yy, y < -10 ? "#FFF1B0" : y < 4 ? "#FFD15C" : "#FFB347", w * 2, 1);
  }
  // distant islands on the horizon
  for (let x = 0; x < CW; x++) {
    const h1 = x < 40 ? Math.max(0, 6 - Math.abs(x - 20) * 0.3) : x > 104 ? Math.max(0, 8 - Math.abs(x - 126) * 0.35) : 0;
    if (h1 > 0) px(c, x, HOR - Math.round(h1), "#3B1E45", 1, Math.round(h1));
  }
  px(c, 0, HOR, "#FFB35C", CW, 1);
  // sea shimmer + the sun's column
  for (let r = 0; r < 15; r++) {
    const y = 161 + r * 3;
    const off = Math.floor(t * 8 * (1 + (r % 3) * 0.4)) + r * 7;
    for (let x = -16; x < CW; x += 16) px(c, ((x + off) % (CW + 16)) - 8, y, r < 6 ? "#7FD3C9" : "#4FA3B0", 2 + (r % 2), 1);
    const w = 26 - r * 1.3 + (hash(r + Math.floor(t * 12)) - 0.5) * 6;
    if (w > 2) px(c, sunX - w / 2, y + 1, r % 2 ? "#FFB35C" : "#FFE39B", w, 1);
  }
  // the sailboat crossing
  spr(c, "boat", 150 - ((t * 9) % 190), 150);
  // shore foam line
  for (let x = 0; x < CW; x += 2) if (hash(x + Math.floor(t * 6)) > 0.25) px(c, x, 203 + (hash(x * 1.3) > 0.5 ? 1 : 0), "#F5E8D0");
  for (let x = 0; x < CW; x += 3) if (hash(x * 2.1 + Math.floor(t * 4)) > 0.6) px(c, x, 206, "#F5E8D0");
  // palm (left): trunk, coconuts, fronds
  for (let i = 0; i < 96; i++) {
    const y = 246 - i, x = 14 + Math.pow(i / 96, 2) * 22;
    px(c, x, y, i % 6 < 3 ? "#3B1E2E" : "#2A1A2E", 4, 1);
  }
  const sway = Math.sin(t * 3) * 0.1;
  [[-2.7, 1], [-2.1, 1], [-1.45, 0.9], [-0.75, 1], [-0.1, 0.9], [0.5, 0.7]].forEach(([a0, l], k) => {
    for (let i = 0; i < 32 * l; i++) {
      const a = a0 + sway * (1 + i / 40) + (i / 32) * (k < 3 ? 0.75 : -0.55);
      const x = 38 + Math.cos(a) * i, y = 150 + Math.sin(a) * i + (i * i) / 55;
      px(c, x, y, "#1E1029", 2, 2);
      if (i % 4 === 0) px(c, x + Math.sin(a) * 3, y + 2, "#1E1029", 1, 3);
    }
  });
  spr(c, "coconut", 35, 152);
  spr(c, "coconut", 39, 154);
  // umbrella + towel
  spr(c, "umbrella", 104, 206);
  spr(c, "towel", 108, 236);
  // crab scuttling
  const cx = 60 + Math.sin(t * 1.5) * 14;
  spr(c, Math.floor(t * 8) % 2 ? "crab" : "crab2", cx, 244);
  // net + players + ball
  px(c, 75, 214, "#2A1A2E", 1, 24);
  for (let y = 214; y < 224; y += 2) px(c, 69, y, "#F5E8D0", 13, 1);
  const ph = t % 2, dir = ph < 1 ? 1 : -1, u = ph % 1;
  const bx = dir > 0 ? 50 + u * 50 : 100 - u * 50, by = 212 - Math.sin(u * Math.PI) * 54;
  const jump1 = ph < 0.18 ? Math.sin((ph / 0.18) * Math.PI) * 8 : 0;
  const jump2 = ph >= 1 && ph < 1.18 ? Math.sin(((ph - 1) / 0.18) * Math.PI) * 8 : 0;
  const player = (x: number, j: number, shirt: string, hair: string) => {
    const y = 238 - j;
    px(c, x - 3, 238, "rgba(60,30,30,0.35)", 8, 1); // shadow
    px(c, x - 1, y - 18, hair, 6, 2);
    px(c, x - 1, y - 16, "#F2B48C", 6, 4);
    px(c, x + 3, y - 15, "#2A1A2E");
    px(c, x - 2, y - 12, shirt, 8, 6);
    px(c, x - 2, y - 12, "rgba(255,255,255,0.25)", 2, 6);
    px(c, x - 4, y - 15, "#F2B48C", 2, 5);
    px(c, x + 6, y - 15, "#F2B48C", 2, 5);
    px(c, x - 1, y - 6, "#1D1240", 6, 2);
    px(c, x - 1, y - 4, "#F2B48C", 2, 4);
    px(c, x + 3, y - 4, "#F2B48C", 2, 4);
  };
  player(48, jump1, "#FF5A5A", "#2A1A2E");
  player(98, jump2, "#4DA3FF", "#7A3E1D");
  px(c, bx - 2, 238, "rgba(60,30,30,0.3)", 4, 1);
  px(c, bx - 1, by - 1, "#FFFFFF", 3, 3);
  px(c, bx - 1, by, "#FF5A5A", 3, 1);
  // birds
  [0, 1, 2].forEach((i) => {
    const x = ((t * 14 + i * 34) % (CW + 20)) - 10, y = 52 + i * 7, f = Math.floor(t * 6 + i) % 2;
    px(c, x, y, "#140C33"); px(c, x - 1, y - f, "#140C33"); px(c, x + 1, y - f, "#140C33"); px(c, x - 2, y - 1 + f, "#140C33"); px(c, x + 2, y - 1 + f, "#140C33");
  });
  // HUD
  text(c, "1UP", 4, 4, "#FF5A5A");
  text(c, String(4600 + Math.floor(t * 12) * 10).padStart(6, "0"), 4, 13, "#FFFFFF");
  text(c, "♥♥♥", 118, 5, "#FF5A5A");
  spr(c, ["coin0", "coin1", "coin2", "coin1"][Math.floor(t * 8) % 4], 116, 13);
  text(c, "x12", 123, 13, "#FFFFFF");
  // the RPG title box: drops in, letters land one by one
  const boxIn = Math.min(1, Math.max(0, t / 0.18));
  const bw = 88, bh = 34, bx0 = 28, by0 = Math.round(-40 + boxIn * 66);
  px(c, bx0 - 1, by0 - 1, "#FFF1DE", bw + 2, bh + 2);
  px(c, bx0, by0, "#140C33", bw, bh);
  px(c, bx0 + 1, by0 + 1, "#2B1752", bw - 2, 1);
  const drop = (i: number) => {
    const at = 0.12 + i * 0.045;
    if (t < at) return -999;
    const u2 = Math.min(1, (t - at) / 0.16);
    return Math.round(-(1 - u2) * 12);
  };
  text(c, "PIXEL", bx0 + (bw - textW("PIXEL", 2)) / 2, by0 + 4, "#FFD15C", 2, drop);
  text(c, "ART", bx0 + (bw - textW("ART", 2)) / 2 + 0, by0 + 20, "#FFFFFF", 1, (i) => drop(i + 5));
  if (t > 0.6 && Math.floor(t * 2.5) % 2 === 0) {
    const s = "PRESS START";
    text(c, s, (CW - textW(s)) / 2 + 4, 226 + 22, "#FFF1DE");
    text(c, "▶", (CW - textW(s)) / 2 - 2, 248, "#FFD15C");
  }
};

export const Pixel: React.FC<PosterProps> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const ts = stepT(t, 12);
  useLayoutEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) draw(c, ts);
  }, [ts]);
  return (
    <Frame bg="#140C33">
      <canvas ref={ref} width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, imageRendering: "pixelated" }} />
      {/* soft CRT scanlines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 5px)", pointerEvents: "none" }} />
    </Frame>
  );
};
