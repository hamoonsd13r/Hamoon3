// Mirror Hall · WORLD "moon": a figure of light with a staff on a dark rocky plain under the moon (after ref r6).
// Black and white. The figure is drawn white and bloomed; the staff tip leaves light-painting ribbons (the pose
// function evaluated back in time). Modes via p.act: fight (pose cycle on the beat), kneel, rise, leap, many.
import { clamp, hash, rng, sstep, ease } from "./lib89";
import { drawMotes } from "./motes89";

type P = Record<string, number | string | undefined>;
const num = (p: P, k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
const str = (p: P, k: string, d: string) => (typeof p[k] === "string" ? (p[k] as string) : d);
type V = [number, number];
type Pose = { head: V; neck: V; pelvis: V; sh: [V, V]; el: [V, V]; ha: [V, V]; hip: [V, V]; kn: [V, V]; ft: [V, V]; staff: [V, V] };
const lv = (a: V, b: V, k: number): V => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const lp = (x: [V, V], y: [V, V], k: number): [V, V] => [lv(x[0], y[0], k), lv(x[1], y[1], k)];
const mix = (a: Pose, b: Pose, k: number): Pose => ({
  head: lv(a.head, b.head, k), neck: lv(a.neck, b.neck, k), pelvis: lv(a.pelvis, b.pelvis, k), sh: lp(a.sh, b.sh, k), el: lp(a.el, b.el, k), ha: lp(a.ha, b.ha, k), hip: lp(a.hip, b.hip, k), kn: lp(a.kn, b.kn, k), ft: lp(a.ft, b.ft, k), staff: lp(a.staff, b.staff, k),
});
// figure space: ground at y=0 under the pelvis, ~300 tall standing; staff = [tip, butt]
export const W_POSES: Record<string, Pose> = {
  ready: { head: [10, -268], neck: [6, -238], pelvis: [0, -128], sh: [[-18, -226], [24, -228]], el: [[-50, -180], [52, -176]], ha: [[-30, -140], [70, -150]], hip: [[-12, -126], [12, -128]], kn: [[-60, -64], [56, -70]], ft: [[-96, 0], [92, 0]], staff: [[180, -260], [-150, -40]] },
  spin: { head: [0, -282], neck: [0, -250], pelvis: [0, -140], sh: [[-22, -240], [22, -240]], el: [[-70, -282], [70, -286]], ha: [[-110, -320], [112, -322]], hip: [[-12, -138], [12, -138]], kn: [[-40, -70], [44, -72]], ft: [[-70, 0], [74, 0]], staff: [[-260, -330], [264, -318]] },
  thrust: { head: [70, -232], neck: [56, -204], pelvis: [-10, -106], sh: [[38, -196], [76, -196]], el: [[110, -182], [140, -190]], ha: [[170, -170], [220, -176]], hip: [[-22, -104], [4, -108]], kn: [[-110, -50], [80, -60]], ft: [[-200, 0], [110, 0]], staff: [[420, -190], [60, -150]] },
  slash: { head: [-30, -250], neck: [-24, -220], pelvis: [0, -120], sh: [[-44, -210], [-4, -214]], el: [[-90, -160], [40, -160]], ha: [[-120, -90], [80, -96]], hip: [[-12, -118], [14, -120]], kn: [[-74, -60], [60, -56]], ft: [[-120, 0], [100, 0]], staff: [[-330, 40], [210, -170]] },
  kneel: { head: [24, -176], neck: [16, -150], pelvis: [-8, -74], sh: [[-4, -142], [34, -144]], el: [[16, -100], [54, -106]], ha: [[46, -70], [60, -86]], hip: [[-18, -72], [4, -74]], kn: [[-40, -2], [56, -40]], ft: [[-110, 0], [60, 0]], staff: [[110, -280], [60, 6]] },
  rise: { head: [0, -300], neck: [0, -268], pelvis: [0, -150], sh: [[-22, -258], [22, -258]], el: [[-34, -206], [40, -214]], ha: [[-30, -160], [50, -170]], hip: [[-12, -148], [12, -148]], kn: [[-16, -74], [16, -74]], ft: [[-30, 0], [30, 0]], staff: [[70, -420], [40, 6]] },
  leap: { head: [20, -330], neck: [14, -298], pelvis: [0, -200], sh: [[-12, -290], [30, -292]], el: [[-60, -330], [80, -300]], ha: [[-90, -380], [130, -320]], hip: [[-12, -198], [12, -200]], kn: [[-50, -150], [60, -170]], ft: [[-30, -100], [20, -120]], staff: [[-200, -460], [240, -230]] },
};
// the audience: standing, clapping (hands apart / together), no staff (it is hidden behind the body)
W_POSES.clapA = { head: [0, -296], neck: [0, -264], pelvis: [0, -148], sh: [[-22, -254], [22, -254]], el: [[-46, -214], [46, -214]], ha: [[-40, -236], [40, -236]], hip: [[-12, -146], [12, -146]], kn: [[-16, -74], [16, -74]], ft: [[-26, 0], [26, 0]], staff: [[0, -150], [0, -150]] };
W_POSES.clapB = { ...W_POSES.clapA, el: [[-38, -214], [38, -214]], ha: [[-4, -238], [4, -238]] };
W_POSES.leave = { ...W_POSES.clapA, el: [[-26, -200], [26, -200]], ha: [[-22, -160], [22, -160]] };
const FIGHT = ["ready", "spin", "thrust", "slash", "spin", "ready", "thrust", "slash"];

function poseAt(lt: number, p: P): Pose {
  const act = str(p, "act", "fight");
  if (act === "fight" || act === "many") {
    const rate = num(p, "rate", 1.84); // poses per second: one per beat at 110 bpm
    const ph = lt * rate + num(p, "phase", 0);
    const i = Math.floor(ph), k = ph - i;
    const a = W_POSES[FIGHT[((i % FIGHT.length) + FIGHT.length) % FIGHT.length]], b = W_POSES[FIGHT[(((i + 1) % FIGHT.length) + FIGHT.length) % FIGHT.length]];
    // snap: hold, then a fast move into the next pose (martial timing)
    return mix(a, b, ease.inOut(sstep(k, 0.45, 0.95)));
  }
  if (act === "kneel") return mix(W_POSES.ready, W_POSES.kneel, ease.out(clamp(num(p, "k", 1))));
  if (act === "rise") return mix(W_POSES.kneel, W_POSES.rise, ease.inOut(clamp(num(p, "k", 1))));
  if (act === "leap") return mix(W_POSES.rise, W_POSES.leap, ease.out(clamp(num(p, "k", 1))));
  if (act === "clap") {
    const ph = lt * 3.68 + num(p, "phase", 0); // eighths at 110 bpm
    return mix(W_POSES.clapA, W_POSES.clapB, 0.5 + 0.5 * Math.sin(ph * Math.PI));
  }
  if (act === "leave") return mix(W_POSES.clapA, W_POSES.leave, clamp(num(p, "k", 1)));
  return W_POSES.ready;
}

function limb(g: CanvasRenderingContext2D, a: V, b: V, ra: number, rb: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  g.beginPath();
  g.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  g.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  g.arc(b[0], b[1], rb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
  g.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  g.arc(a[0], a[1], ra, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
  g.closePath();
  g.fill();
}
export function body(g: CanvasRenderingContext2D, P0: Pose) {
  limb(g, P0.neck, P0.pelvis, 17, 14);
  g.beginPath();
  g.ellipse(P0.head[0], P0.head[1], 15, 19, 0, 0, Math.PI * 2);
  g.fill();
  limb(g, P0.neck, P0.head, 7, 7);
  for (let s = 0; s < 2; s++) {
    limb(g, P0.sh[s], P0.el[s], 8, 7);
    limb(g, P0.el[s], P0.ha[s], 7, 6);
    limb(g, P0.hip[s], P0.kn[s], 11, 8);
    limb(g, P0.kn[s], P0.ft[s], 8, 6);
  }
  limb(g, P0.staff[0], P0.staff[1], 3.2, 3.2);
}

function stars(g: CanvasRenderingContext2D, lt: number, n = 260) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 1.37) * 2400 - 240, y = hash(i * 7.91) * 620 - 60;
    const tw = 0.55 + 0.45 * Math.sin(lt * (1 + hash(i) * 3) + i);
    const r = 0.6 + hash(i * 3.3) * 1.4;
    g.fillStyle = `rgba(235,235,240,${(0.25 + 0.55 * hash(i * 2.2)) * tw})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

export async function drawMoon(g: CanvasRenderingContext2D, w: number, h: number, lt: number, p: P, cache: Map<string, unknown>, url: (s: string) => string) {
  const img = await loadImg(cache, url, "img/moon.jpg");
  const plateName = str(p, "plate", "moon-plateau");
  let plate: HTMLImageElement | null = null;
  try {
    plate = plateName === "none" ? null : await loadImg(cache, url, `img/${plateName}.jpg`);
  } catch {
    plate = null;
  }
  const s = Math.max(w / 1920, h / 1080);
  g.save();
  g.translate((w - 1920 * s) / 2, (h - 1080 * s) / 2);
  g.scale(s, s);
  const z = num(p, "zoom", 1), cx = num(p, "cx", 960), cy = num(p, "cy", 560);
  g.translate(960, 540);
  g.rotate(num(p, "roll", 0));
  g.scale(z, z);
  g.translate(-cx, -cy);
  g.fillStyle = "#020203";
  g.fillRect(-2000, -2000, 6000, 6000);
  const horizon = num(p, "horizon", 640);
  if (plate) {
    g.drawImage(plate, -40, -22, 2000, 1125);
  } else {
    stars(g, lt);
    // the moon with a soft halo
    const mx = num(p, "mx", 1420), my = num(p, "my", 300), mr = num(p, "mr", 170);
    const halo = g.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3.2);
    halo.addColorStop(0, "rgba(220,220,225,0.22)");
    halo.addColorStop(1, "rgba(220,220,225,0)");
    g.fillStyle = halo;
    g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    g.save();
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, mx - mr * 1.02, my - mr * 1.02, mr * 2.04, mr * 2.04);
    g.restore();
    // ground: the rock texture projected onto a floor plane (row by row), darkening with distance
    const rock = await loadImg(cache, url, "tex/dark_rock_02_diff.jpg");
    const fcam = 520, hcam = 1.0, tile = 2.2;
    for (let y = horizon + 1; y < 1300; y += 3) {
      const d = (hcam * fcam) / (y - horizon); // distance along the ground for this screen row
      const v = ((d / tile) % 1 + 1) % 1;
      const span = (1920 * d) / fcam / tile; // texture tiles across the row
      const sw = rock.width / span;
      const sy = v * (rock.height - 4);
      g.globalAlpha = clamp(1.4 - d * 0.09);
      g.drawImage(rock, ((lt * 0) % 1) * rock.width, sy, Math.min(rock.width, sw * 6), 3, 960 - (1920 * 6) / 2 / Math.max(1, span / 1) , y, (1920 * 6) / Math.max(1, span / 1), 3);
    }
    g.globalAlpha = 1;
    // desaturate + darken the ground
    g.save();
    g.globalCompositeOperation = "color";
    g.fillStyle = "#808080";
    g.fillRect(-1000, horizon, 4000, 1400);
    g.restore();
    const dk = g.createLinearGradient(0, horizon, 0, 1100);
    dk.addColorStop(0, "rgba(2,2,3,0.75)");
    dk.addColorStop(0.35, "rgba(2,2,3,0.35)");
    dk.addColorStop(1, "rgba(2,2,3,0.55)");
    g.fillStyle = dk;
    g.fillRect(-1000, horizon, 4000, 1400);
    const mist = g.createLinearGradient(0, horizon - 70, 0, horizon + 90);
    mist.addColorStop(0, "rgba(160,160,165,0)");
    mist.addColorStop(0.5, "rgba(160,160,165,0.18)");
    mist.addColorStop(1, "rgba(160,160,165,0)");
    g.fillStyle = mist;
    g.fillRect(-1000, horizon - 70, 4000, 160);
  }
  // the audience at the horizon: small dim figures that clap, then turn away and fade
  const aud = Math.round(num(p, "aud", 0));
  const audK = clamp(num(p, "audK", 1));
  // the figure(s) of light
  const act = str(p, "act", "fight");
  const n = act === "many" ? Math.round(num(p, "n", 7)) : 1;
  const plateGround: Record<string, number> = { "moon-plateau": 770, "moon-plateau2": 700, "moon-ground": 900 };
  const fx = num(p, "x", 900), fy = num(p, "y", plate ? plateGround[plateName] ?? 760 : horizon + 160), sc = num(p, "scale", 1);
  const items: { x: number; y: number; s: number; ph: number }[] = [];
  if (act === "none") {
    // no hero in this shot (audience only)
  } else if (n === 1) items.push({ x: fx, y: fy, s: sc, ph: 0 });
  else {
    const R = rng(31);
    const rows = Math.max(1, Math.round(Math.sqrt(n / 2)));
    let i = 0;
    for (let r = 0; r < rows && i < n; r++) {
      const per = Math.ceil(n / rows);
      const depth = rows === 1 ? 0.6 : r / (rows - 1); // 0 = far row
      for (let c = 0; c < per && i < n; c++, i++) {
        const x = 960 + (c - (per - 1) / 2) * (180 + 260 * depth) + (R() - 0.5) * 40;
        const hz = plate ? (plateName === "moon-plateau2" ? 430 : 590) : horizon;
        items.push({ x, y: hz + 40 + depth * 380, s: (0.32 + depth * 0.8) * sc, ph: R() * 6 });
      }
    }
    items.sort((a, b) => a.y - b.y);
  }
  const lay = offscreen(cache, "moon:fig", w, h);
  const lg = lay.getContext("2d")!;
  lg.setTransform(1, 0, 0, 1, 0, 0);
  lg.clearRect(0, 0, w, h);
  lg.setTransform(g.getTransform());
  if (aud > 0 && audK > 0.01) {
    const hz = plate ? (plateName === "moon-plateau2" ? 430 : 590) : horizon;
    const R = rng(77);
    for (let i = 0; i < aud; i++) {
      const x = 140 + (i + 0.5 + (R() - 0.5) * 0.4) * (1640 / aud);
      const sc0 = 0.2 + R() * 0.08;
      const leaving = audK < 1;
      const pa: P = { act: leaving ? "leave" : "clap", k: 1 - audK, phase: R() * 2 };
      lg.save();
      lg.globalAlpha = 0.55 * audK;
      lg.translate(x + (leaving ? (R() < 0.5 ? -1 : 1) * (1 - audK) * 120 : 0), hz + 22 + R() * 10);
      lg.scale(sc0, sc0);
      lg.fillStyle = "#ffffff";
      body(lg, poseAt(lt, pa));
      lg.restore();
    }
  }
  for (const it of items) {
    const pp: P = { ...p, phase: it.ph };
    // light painting: the staff's tip, middle and butt and both hands leave long thin streaks (evaluated back in time)
    const trail = num(p, "trail", 0.6);
    const steps = 36;
    const past = Array.from({ length: steps + 1 }, (_, kk) => poseAt(lt - (trail * kk) / steps, pp));
    lg.save();
    lg.translate(it.x, it.y);
    lg.scale(it.s, it.s);
    lg.lineCap = "round";
    for (let kk = steps - 1; kk >= 0; kk--) {
      const A = past[kk + 1], B = past[kk];
      const a = Math.pow(1 - kk / steps, 1.4);
      const pts: [number, number][][] = [
        [A.staff[0], B.staff[0]], [A.staff[1], B.staff[1]],
        [[(A.staff[0][0] * 2 + A.staff[1][0]) / 3, (A.staff[0][1] * 2 + A.staff[1][1]) / 3], [(B.staff[0][0] * 2 + B.staff[1][0]) / 3, (B.staff[0][1] * 2 + B.staff[1][1]) / 3]],
        [[(A.staff[0][0] + A.staff[1][0] * 2) / 3, (A.staff[0][1] + A.staff[1][1] * 2) / 3], [(B.staff[0][0] + B.staff[1][0] * 2) / 3, (B.staff[0][1] + B.staff[1][1] * 2) / 3]],
        [A.ha[0], B.ha[0]], [A.ha[1], B.ha[1]],
      ];
      pts.forEach(([u, v], j) => {
        lg.strokeStyle = `rgba(255,255,255,${(j < 2 ? 0.85 : j < 4 ? 0.45 : 0.4) * a})`;
        lg.lineWidth = (j < 2 ? 3.2 : 2) * (0.5 + 0.5 * a);
        lg.beginPath();
        lg.moveTo(u[0], u[1]);
        lg.lineTo(v[0], v[1]);
        lg.stroke();
      });
      // a faint sheet between tip and butt (the swept staff)
      lg.fillStyle = `rgba(255,255,255,${0.05 * a})`;
      lg.beginPath();
      lg.moveTo(A.staff[0][0], A.staff[0][1]);
      lg.lineTo(A.staff[1][0], A.staff[1][1]);
      lg.lineTo(B.staff[1][0], B.staff[1][1]);
      lg.lineTo(B.staff[0][0], B.staff[0][1]);
      lg.closePath();
      lg.fill();
    }
    lg.restore();
    const P0 = poseAt(lt, pp);
    lg.save();
    lg.translate(it.x, it.y);
    lg.scale(it.s, it.s);
    lg.fillStyle = "rgba(255,255,255,0.35)";
    lg.save();
    lg.filter = "blur(4px)";
    body(lg, P0);
    lg.restore();
    lg.fillStyle = "#ffffff";
    body(lg, P0);
    lg.restore();
  }
  for (const it of items) {
    const gr = g.createRadialGradient(it.x, it.y, 4, it.x, it.y, 260 * it.s);
    gr.addColorStop(0, `rgba(235,238,245,${0.42 * num(p, "glow", 1)})`);
    gr.addColorStop(0.4, `rgba(200,205,215,${0.14 * num(p, "glow", 1)})`);
    gr.addColorStop(1, "rgba(200,205,215,0)");
    g.save();
    g.globalCompositeOperation = "screen";
    g.translate(it.x, it.y);
    g.scale(1, 0.32);
    g.translate(-it.x, -it.y);
    g.fillStyle = gr;
    g.fillRect(it.x - 300 * it.s, it.y - 300 * it.s, 600 * it.s, 600 * it.s);
    g.restore();
  }
  g.restore();
  // composite: glow (blurred copies) + the sharp figure
  g.save();
  g.globalCompositeOperation = "lighter";
  g.filter = "blur(42px)";
  g.globalAlpha = 0.8;
  g.drawImage(lay, 0, 0);
  g.filter = "blur(16px)";
  g.globalAlpha = 0.9;
  g.drawImage(lay, 0, 0);
  g.filter = "blur(5px)";
  g.globalAlpha = 0.9;
  g.drawImage(lay, 0, 0);
  g.filter = "none";
  g.globalAlpha = 1;
  g.drawImage(lay, 0, 0);
  g.restore();
  g.save();
  g.translate((w - 1920 * s) / 2, (h - 1080 * s) / 2);
  g.scale(s, s);
  drawMotes(g, lt, "moon", num(p, "motes", 1), num(p, "beatK", 0), fx, fy);
  g.restore();
  // grain + vignette
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.6)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

/** one warrior (or a row of them) on a transparent square, feet at 92 % height — the billboard texture in 3D */
export function drawWarriorSprite(g: CanvasRenderingContext2D, w: number, h: number, lt: number, p: P, cache: Map<string, unknown>) {
  g.clearRect(0, 0, w, h);
  const lay = offscreen(cache, `moon:spr:${w}x${h}`, w, h);
  const lg = lay.getContext("2d")!;
  lg.setTransform(1, 0, 0, 1, 0, 0);
  lg.clearRect(0, 0, w, h);
  const sc = (h * 0.8) / 340;
  lg.translate(w / 2, h * 0.92);
  lg.scale(sc, sc);
  // light painting: the staff sweeps a continuous ribbon (quads between successive staff positions), the hands
  // leave thin streaks; brightest at the newest edge
  const trail = num(p, "trail", 0.5);
  const steps = 28;
  const past = Array.from({ length: steps + 1 }, (_, k) => poseAt(lt - (trail * k) / steps, p));
  for (let k = steps - 1; k >= 0; k--) {
    const A = past[k + 1], B = past[k];
    const a = Math.pow(1 - k / steps, 1.6);
    lg.fillStyle = `rgba(255,255,255,${0.32 * a})`;
    lg.beginPath();
    lg.moveTo(A.staff[0][0], A.staff[0][1]);
    lg.lineTo(A.staff[1][0], A.staff[1][1]);
    lg.lineTo(B.staff[1][0], B.staff[1][1]);
    lg.lineTo(B.staff[0][0], B.staff[0][1]);
    lg.closePath();
    lg.fill();
    // the staff tips draw bright lines
    lg.strokeStyle = `rgba(255,255,255,${0.75 * a})`;
    lg.lineWidth = 3 + 3 * a;
    lg.lineCap = "round";
    lg.beginPath();
    lg.moveTo(A.staff[0][0], A.staff[0][1]);
    lg.lineTo(B.staff[0][0], B.staff[0][1]);
    lg.moveTo(A.staff[1][0], A.staff[1][1]);
    lg.lineTo(B.staff[1][0], B.staff[1][1]);
    lg.stroke();
    for (let s = 0; s < 2; s++) {
      lg.strokeStyle = `rgba(255,255,255,${0.35 * a})`;
      lg.lineWidth = 2.5;
      lg.beginPath();
      lg.moveTo(A.ha[s][0], A.ha[s][1]);
      lg.lineTo(B.ha[s][0], B.ha[s][1]);
      lg.stroke();
    }
  }
  lg.fillStyle = "#ffffff";
  body(lg, poseAt(lt, p));
  g.save();
  g.globalCompositeOperation = "lighter";
  g.filter = "blur(10px)";
  g.globalAlpha = 0.7;
  g.drawImage(lay, 0, 0);
  g.filter = "blur(3px)";
  g.globalAlpha = 0.8;
  g.drawImage(lay, 0, 0);
  g.filter = "none";
  g.globalAlpha = 1;
  g.drawImage(lay, 0, 0);
  g.restore();
}

function offscreen(cache: Map<string, unknown>, key: string, w: number, h: number) {
  let c = cache.get(key) as HTMLCanvasElement | undefined;
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    cache.set(key, c);
  }
  return c;
}
export async function loadImg(cache: Map<string, unknown>, url: (s: string) => string, path: string) {
  const key = `img:${path}`;
  let im = cache.get(key) as HTMLImageElement | Promise<HTMLImageElement> | undefined;
  if (!im) {
    im = new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`image ${path}`));
      i.src = url(path);
    });
    cache.set(key, im);
  }
  const r = await im;
  cache.set(key, r);
  return r;
}
