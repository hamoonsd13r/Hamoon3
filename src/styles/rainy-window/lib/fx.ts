// Rainy Window · the 2D overlay: gutter drips, the downpipe pour, splash crowns, steam, the robot's screen eyes and the
// ceiling leak. Pure function of t; drawn on a transparent canvas above the WebGL pass.
import {
  ANTENNA, CANOPY, DOWNPIPE, DRIP_FALL, DRIPS, G, G_IN, GUTTER, L, LEAK, LEAK_HIT, LEAK_T, MUG, PLATE, SCREEN, WIN,
  activeHits, eyesAt, rng, smooth,
} from "./scene";

type Cam = { x: number; y: number; z: number };
// leakPatch: ceiling colours sampled down a clean column next to the painted drop (y 712..808, every 4 px),
// used to hide the painted drop once ours lets go
export type FxIn = {
  t: number; cam: Cam; w: { a: number; b: number; c: number }; steamFrom: { x: number; y: number }; leakPatch: string[];
};

const mod = (a: number, n: number) => ((a % n) + n) % n;
const inWin = (x: number, y: number) => x > WIN.x0 && x < WIN.x1 && y > WIN.y0 && y < WIN.y1;

// fixed sparkle droplets for crowns
const CROWN = (() => {
  const r = rng(34003);
  return Array.from({ length: 64 }, () => ({ a: -Math.PI / 2 + (r() - 0.5) * 2.2, v: 0.55 + r() * 0.6, s: 0.6 + r() * 0.7 }));
})();

export const drawFx = (ctx: CanvasRenderingContext2D, W: number, H: number, p: FxIn) => {
  const { t, cam } = p;
  const sc = (W / PLATE.w) * cam.z;
  const X = (x: number) => (x - PLATE.w / 2 - cam.x) * sc + W / 2;
  const Y = (y: number) => (y - PLATE.h / 2 - cam.y) * sc + H / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.lineCap = "round";

  // ── splash crowns where rain hits the ground (same events as the shader's ripples)
  ctx.globalCompositeOperation = "lighter";
  for (const { h, age } of activeHits(t, 160)) {
    if (age > 0.16) continue;
    const u = age / 0.16;
    const k = h.k * h.s;
    const warm = h.x > 700 && h.y > 2200 ? 1 : 0;
    const col = warm ? "255,214,160" : "190,212,255";
    const n = 3 + ((h.x * 7) | 0) % 3;
    for (let i = 0; i < n; i++) {
      const c = CROWN[((h.x | 0) + i * 7) % CROWN.length];
      const v = c.v * 14 * k;
      const dx = Math.cos(c.a) * v * u * 1.6;
      const dy = Math.sin(c.a) * v * u * 1.6 + 30 * k * u * u;
      ctx.fillStyle = `rgba(${col},${0.55 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(X(h.x + dx), Y(h.y + dy * 0.8), Math.max(0.6, 1.3 * c.s * k * sc), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── gutter drips: a bead swells under the lip, falls, and splashes on the sidewalk
  for (const d of DRIPS) {
    const period = L / d.n;
    const local = mod(t / period + d.ph, 1) * period; // time since this drop let go
    const fall = d.yEnd === 1992 ? DRIP_FALL : Math.sqrt((2 * (d.yEnd - GUTTER.y)) / G);
    const bead = d.n < 40 ? smooth(period - 0.45, period, local) : 0;
    if (bead > 0 && d.n < 40) {
      ctx.fillStyle = `rgba(200,220,255,${0.55 * bead})`;
      ctx.beginPath();
      ctx.ellipse(X(d.x), Y(GUTTER.y + 3 + 3 * bead), 2.2 * d.size * sc * (0.6 + 0.4 * bead), 2.8 * d.size * sc * bead, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (local < fall) {
      const y = GUTTER.y + 0.5 * G * local * local;
      const v = G * local;
      const len = Math.min(120, Math.max(6, v * 0.028));
      const warm = inWin(d.x, y) ? 1 : 0;
      const g = ctx.createLinearGradient(0, Y(y - len), 0, Y(y));
      const c = warm ? "255,228,186" : "205,222,255";
      g.addColorStop(0, `rgba(${c},0)`);
      g.addColorStop(1, `rgba(${c},${warm ? 1 : 0.8})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.2, 2.7 * d.size * sc);
      ctx.beginPath();
      ctx.moveTo(X(d.x), Y(y - len));
      ctx.lineTo(X(d.x), Y(y));
      ctx.stroke();
    } else if (local < fall + 0.18) {
      const u = (local - fall) / 0.18;
      for (let i = 0; i < 4; i++) {
        const c = CROWN[(i * 11 + ((d.x | 0) % 13)) % CROWN.length];
        const v = c.v * 16 * d.size;
        ctx.fillStyle = `rgba(205,220,255,${0.6 * (1 - u)})`;
        ctx.beginPath();
        ctx.arc(X(d.x + Math.cos(c.a) * v * u * 1.5), Y(d.yEnd + Math.sin(c.a) * v * u * 1.5 + 34 * u * u), Math.max(0.7, 1.4 * c.s * sc), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── the downpipe pours onto the stones
  {
    const x0 = DOWNPIPE.x, y0 = DOWNPIPE.y;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const u = mod(i / 14 + (t / L) * Math.round(2.75 * L), 1); // whole pulses per loop
      const x = x0 - 10 * u - 2 * Math.sin(u * 9 + t * 3);
      const y = y0 + 26 * u * u + 4 * u;
      ctx.fillStyle = `rgba(190,210,250,${0.42 * (1 - u * 0.5)})`;
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), 3.6 * sc, 5.2 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const u = mod(i / 6 + (t / L) * Math.round(2 * L), 1);
      const c = CROWN[i * 5];
      ctx.fillStyle = `rgba(200,218,255,${0.5 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(X(x0 - 10 + Math.cos(c.a) * 18 * u), Y(y0 + 30 + Math.sin(c.a) * 14 * u + 20 * u * u), 1.6 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── steam from the mug (warm, soft, rising and curling)
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 9; i++) {
    const life = L / 5; // a whole number of puffs per loop keeps the seam invisible
    const n = 1;
    const u = mod(t / life + i / 9, 1);
    const age = u * life;
    const sx = p.steamFrom.x + (i % 3 - 1) * 6;
    const x = sx + Math.sin(age * 1.9 + i * 1.7) * 7 * age;
    const y = p.steamFrom.y - age * 48;
    const r = (6 + age * 10) * sc;
    const a = 0.2 * smooth(0, 0.35, age) * (1 - smooth(1.2, life, age)) * (n > 0 ? 1 : 0);
    const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r);
    g.addColorStop(0, `rgba(255,236,214,${a})`);
    g.addColorStop(1, "rgba(255,236,214,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── the ceiling leak: a drop swells on the ceiling, lets go, bursts on the umbrella, beads roll off the rim
  ctx.globalCompositeOperation = "source-over";
  {
    // the painted drop (x≈1228) is always hidden under a patch of the surrounding ceiling
    if (p.leakPatch.length) {
      const y0 = 712, step = 4;
      const g = ctx.createLinearGradient(0, Y(y0), 0, Y(y0 + step * (p.leakPatch.length - 1)));
      p.leakPatch.forEach((c, i) => g.addColorStop(i / (p.leakPatch.length - 1), c));
      ctx.save();
      ctx.filter = `blur(${Math.max(1, 2.2 * sc)}px)`;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(X(1215), Y(714), 26 * sc, 92 * sc, 8 * sc);
      ctx.fill();
      ctx.restore();
    }
    // a water drop against a warm, busy room: dark refracting rim, bright core, sharp specular
    const drop = (x: number, y: number, rx: number, ry: number, a: number) => {
      const cx = X(x), cy = Y(y), w = rx * sc, h = ry * sc;
      ctx.fillStyle = `rgba(40,28,20,${0.7 * a})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 1.12, h * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(cx + w * 0.1, cy + h * 0.3, 0, cx, cy, Math.max(w, h));
      g.addColorStop(0, `rgba(255,240,210,${a})`);
      g.addColorStop(0.6, `rgba(255,210,150,${0.75 * a})`);
      g.addColorStop(1, `rgba(120,90,60,${0.4 * a})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(cx - w * 0.34, cy - h * 0.38, Math.max(1, w * 0.32), 0, Math.PI * 2);
      ctx.fill();
    };
    // the hanging bead: grows from the start, lets go at LEAK_T.fall, a new one forms before the loop closes
    const grow = t < LEAK_T.fall ? 0.55 + 0.45 * smooth(0, LEAK_T.fall, t) : 0.55 * smooth(L - 1.6, L, t);
    if (grow > 0.02) {
      const wob = 1 + 0.07 * Math.sin(t * 21) * smooth(LEAK_T.swell, LEAK_T.fall, t);
      const r = 7.5 * grow;
      const by = 722 + 62 * grow; // the bulb hangs lower as it fills
      ctx.fillStyle = "rgba(60,40,26,0.55)";
      ctx.beginPath();
      ctx.moveTo(X(LEAK.x - 2.4), Y(716));
      ctx.quadraticCurveTo(X(LEAK.x - 1.4), Y(by - r), X(LEAK.x - r * 0.8), Y(by - r * 0.4));
      ctx.lineTo(X(LEAK.x + r * 0.8), Y(by - r * 0.4));
      ctx.quadraticCurveTo(X(LEAK.x + 1.4), Y(by - r), X(LEAK.x + 2.4), Y(716));
      ctx.closePath();
      ctx.fill();
      drop(LEAK.x, by, r / wob, r * 1.25 * wob, 1);
    }
    if (t >= LEAK_T.fall && t < LEAK_HIT) {
      const a = t - LEAK_T.fall;
      const y = LEAK.y + 0.5 * G_IN * a * a;
      const v = G_IN * a;
      const len = Math.min(46, v * 0.02);
      const g = ctx.createLinearGradient(0, Y(y - len), 0, Y(y));
      g.addColorStop(0, "rgba(255,236,205,0)");
      g.addColorStop(1, "rgba(255,240,215,0.75)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 7 * sc;
      ctx.beginPath();
      ctx.moveTo(X(LEAK.x), Y(y - len));
      ctx.lineTo(X(LEAK.x), Y(y));
      ctx.stroke();
      drop(LEAK.x, y, 7.2, 9.6, 1);
    }
    const hitY = LEAK.canopyY;
    if (t >= LEAK_HIT && t < LEAK_HIT + 0.55) {
      const u = (t - LEAK_HIT) / 0.55;
      const fl = ctx.createRadialGradient(X(LEAK.x), Y(hitY), 0, X(LEAK.x), Y(hitY), 40 * sc);
      fl.addColorStop(0, `rgba(255,246,230,${0.85 * (1 - u) * (1 - u)})`);
      fl.addColorStop(1, "rgba(255,246,230,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.arc(X(LEAK.x), Y(hitY), 40 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 12; i++) {
        const c = CROWN[i * 3 + 1];
        const ang = -Math.PI / 2 + (i - 5.5) * 0.28 + 0.25; // the canopy tilts: the spray leans right
        const v = (90 + 60 * c.v) * (0.8 + 0.2 * c.s);
        const x = LEAK.x + Math.cos(ang) * v * u * 0.55;
        const y = hitY - 2 + Math.sin(ang) * v * u * 0.55 + 210 * u * u;
        drop(x, y, 3.6 * c.s, 4.2 * c.s, 1 - u * u);
      }
    }
    // two beads slide to the rim and drop off
    for (let i = 0; i < 2; i++) {
      const t0 = LEAK_HIT + 0.1 + i * 0.24;
      const roll = smooth(t0, t0 + 0.3, t);
      const fallT = t - (t0 + 0.3);
      if (t < t0 || fallT > 0.32) continue;
      let x = LEAK.x + (CANOPY.right.x - LEAK.x) * roll;
      let y = hitY + (CANOPY.right.y - hitY) * roll;
      if (fallT > 0) {
        y = CANOPY.right.y + 0.5 * G * fallT * fallT;
        x = CANOPY.right.x + 16 * fallT;
        if (y > 1446) continue;
      }
      drop(x, y + 2, 4, 5, 1);
    }
  }

  // ── the robot's eyes on its dark screen face
  {
    const e = eyesAt(t);
    const cx = (SCREEN.x0 + SCREEN.x1) / 2 + e.look[0];
    const cy = (SCREEN.y0 + SCREEN.y1) / 2 + e.look[1];
    ctx.save();
    // clip to the screen (rounded rect)
    const x0 = X(SCREEN.x0 + 3), y0 = Y(SCREEN.y0 + 3), x1 = X(SCREEN.x1 - 3), y1 = Y(SCREEN.y1 - 3), rr = SCREEN.r * sc;
    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.arcTo(x1, y0, x1, y1, rr);
    ctx.arcTo(x1, y1, x0, y1, rr);
    ctx.arcTo(x0, y1, x0, y0, rr);
    ctx.arcTo(x0, y0, x1, y0, rr);
    ctx.closePath();
    ctx.clip();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = `rgba(255,160,70,${0.9 * e.glow})`;
    ctx.shadowBlur = 16 * sc * e.glow;
    ctx.fillStyle = "rgba(255,238,205,0.97)";
    ctx.strokeStyle = "rgba(255,238,205,0.97)";
    for (const side of [-1, 1]) {
      const ex = cx + side * 16 - 1; // eyes sit a little left: the head is turned toward the cub
      const ey = cy;
      const w = (side < 0 ? 11 : 12.5) * sc;
      if (e.mode === "normal") {
        const h = Math.max(1.5, 24 * e.open) * sc;
        ctx.beginPath();
        ctx.ellipse(X(ex), Y(ey), w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.mode === "squeeze") {
        ctx.lineWidth = 4 * sc;
        ctx.beginPath();
        ctx.moveTo(X(ex - 7), Y(ey - 4 * side * 0));
        ctx.lineTo(X(ex + 7), Y(ey + 0));
        ctx.stroke();
      } else {
        // happy arcs ^ ^
        ctx.lineWidth = 4.2 * sc;
        ctx.beginPath();
        ctx.arc(X(ex), Y(ey + 6), 8 * sc, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      }
    }
    ctx.restore();
    // antenna light pulses when it is happy
    const pulse = e.mode === "happy" ? 0.5 + 0.5 * Math.sin((t - LEAK_HIT) * 14) : 0;
    if (pulse > 0.01) {
      const g = ctx.createRadialGradient(X(ANTENNA.x), Y(ANTENNA.y), 0, X(ANTENNA.x), Y(ANTENNA.y), 26 * sc);
      g.addColorStop(0, `rgba(255,200,120,${0.55 * pulse})`);
      g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(X(ANTENNA.x), Y(ANTENNA.y), 26 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  void MUG;
};
