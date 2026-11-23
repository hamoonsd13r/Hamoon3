// The robot's screen-face (canvas → texture) and its chest core light (a neutral ring, no logo).
import { clamp, HUD, lerp } from "./theme";

export const FACE_W = 640;
export const FACE_H = 392;

export type Face = {
  mood: "neutral" | "happy" | "sad" | "curious" | "wide" | "search" | "think" | "soft" | "alarm" | "heart";
  blink: number; // 0 open … 1 closed
  lookX: number; // −1 … 1
  lookY: number; // −1 … 1
  talk: number; // 0 … 1 mouth opening
  t: number; // time (for animated moods)
  k?: number; // mood amount 0..1 (cross-fade from neutral)
  label?: string; // for "alarm"
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

const GLOW = "#FFF1E4";

export function drawFace(ctx: CanvasRenderingContext2D, f: Face) {
  const Wc = FACE_W, Hc = FACE_H;
  ctx.clearRect(0, 0, Wc, Hc);
  // faint scanlines + vignette inside the visor
  const g = ctx.createRadialGradient(Wc / 2, Hc / 2, 20, Wc / 2, Hc / 2, Wc * 0.62);
  g.addColorStop(0, "rgba(40,30,30,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Wc, Hc);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < Hc; y += 6) ctx.fillRect(0, y, Wc, 2);

  ctx.save();
  ctx.shadowColor = "rgba(255,200,160,0.85)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = GLOW;
  ctx.strokeStyle = GLOW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const k = f.k ?? 1;
  const ox = f.lookX * 34, oy = f.lookY * 22;
  const ex = [Wc * 0.31 + ox, Wc * 0.69 + ox];
  const ey = Hc * 0.42 + oy;
  const EW = 104, EH = 112;
  const open = 1 - clamp(f.blink);

  const eyeRect = (cx: number, w: number, h: number, dy = 0) => {
    const hh = Math.max(6, h * open);
    rr(ctx, cx - w / 2, ey - hh / 2 + dy, w, hh, Math.min(22, hh / 2));
    ctx.fill();
  };

  if (f.mood === "search") {
    // a spinner of 8 dots where the eyes were + a scanning bar
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + f.t * 5.2;
      const ph = ((i / n + f.t * 0.83) % 1);
      ctx.globalAlpha = 0.25 + 0.75 * ph;
      for (const cx of ex) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 34, ey + Math.sin(a) * 34, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (f.mood === "think") {
    for (const [i, cx] of ex.entries()) eyeRect(cx + 16, EW * 0.9, EH * 0.55, -26 + i * 0);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.t * 7 - i * 0.9));
      ctx.beginPath();
      ctx.arc(Wc * 0.42 + i * 40, Hc * 0.82, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (f.mood === "happy" || f.mood === "heart") {
    // ^ ^ arcs
    ctx.lineWidth = 22;
    for (const cx of ex) {
      ctx.beginPath();
      ctx.arc(cx, ey + 26, 46, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    if (f.mood === "heart") {
      ctx.globalAlpha = k;
      const s = 1 + 0.08 * Math.sin(f.t * 9);
      ctx.save();
      ctx.translate(Wc / 2, Hc * 0.8);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.bezierCurveTo(-34, -6, -18, -34, 0, -16);
      ctx.bezierCurveTo(18, -34, 34, -6, 0, 18);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  } else if (f.mood === "alarm") {
    // a small clock + the label (e.g. MON 12:00)
    const cx = Wc / 2, cy = Hc * 0.36, R = 62;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    const shake = Math.sin(f.t * 40) * 0.08 * clamp(1 - (f.t % 2.2) / 0.5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(shake);
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -R * 0.68);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -R * 0.68);
    ctx.stroke();
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * R * 0.78, cy - R * 0.86, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `600 64px ${HUD}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.label ?? "12:00", cx, Hc * 0.8);
  } else {
    // eye shapes per mood
    let lw = EW, lh = EH, rw = EW, rh = EH, tiltL = 0, tiltR = 0;
    if (f.mood === "curious") { rh = lerp(EH, EH * 1.25, k); lh = lerp(EH, EH * 0.62, k); rw = lerp(EW, EW * 1.1, k); }
    if (f.mood === "wide") { lw = rw = lerp(EW, EW * 1.3, k); lh = rh = lerp(EH, EH * 1.45, k); }
    if (f.mood === "soft") { lh = rh = lerp(EH, EH * 0.38, k); }
    if (f.mood === "sad") { tiltL = -0.28 * k; tiltR = 0.28 * k; lh = rh = lerp(EH, EH * 0.8, k); }
    const one = (cx: number, w: number, h: number, tilt: number) => {
      ctx.save();
      ctx.translate(cx, ey);
      ctx.rotate(tilt);
      const hh = Math.max(6, h * open);
      rr(ctx, -w / 2, -hh / 2, w, hh, Math.min(24, hh / 2));
      ctx.fill();
      // sad: cut the inner-top corner with a dark wedge (droopy brows)
      if (f.mood === "sad" && k > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(-w, -hh / 2 - 4);
        ctx.lineTo(w, -hh / 2 - 4);
        ctx.lineTo(w, -hh / 2 + hh * 0.42 * k * (tilt > 0 ? 0.1 : 1));
        ctx.lineTo(-w, -hh / 2 + hh * 0.42 * k * (tilt > 0 ? 1 : 0.1));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };
    one(ex[0], lw, lh, tiltL);
    one(ex[1], rw, rh, tiltR);
    if (f.mood === "wide") {
      for (const [i, cx] of ex.entries()) {
        const s = (0.6 + 0.4 * Math.sin(f.t * 9 + i * 2)) * k;
        ctx.save();
        ctx.fillStyle = "#000";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx + lw * 0.22, ey - lh * 0.22, 13 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // mouth: a small bar that opens with the voice (hidden in moods that use the lower area)
  if (f.mood !== "alarm" && f.mood !== "think" && f.mood !== "heart" && f.mood !== "search") {
    const mo = clamp(f.mood === "wide" ? Math.max(f.talk, 0.55 * k) : f.talk);
    const mw = lerp(70, 92, mo), mh = lerp(14, 52, mo);
    const my = Hc * 0.8 + oy * 0.4;
    rr(ctx, Wc / 2 - mw / 2 + ox * 0.5, my - mh / 2, mw, mh, Math.min(14, mh / 2));
    ctx.fill();
  }
  ctx.restore();
}

export const CHEST = 512;
/** the core light on the chest: a soft amber glow, a thin ring of three rotating arcs and eight dots; `pulse` 0..1
 *  brightens it (voice, a moment of joy), `spin` turns the arcs (working). Neutral on purpose: no brand mark. */
export function drawCore(ctx: CanvasRenderingContext2D, t: number, pulse: number, spin = 0) {
  const S = CHEST, cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S);
  const p = Math.min(1.4, Math.max(0, pulse));
  const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, S * 0.44);
  glow.addColorStop(0, `rgba(255,214,160,${0.6 + 0.3 * Math.min(1, p)})`);
  glow.addColorStop(0.4, `rgba(255,160,80,${0.16 + 0.18 * Math.min(1, p)})`);
  glow.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = "rgba(255,170,90,1)";
  ctx.shadowBlur = 18 + 26 * p;
  // three arcs
  ctx.rotate(spin + t * 0.25);
  ctx.lineCap = "round";
  ctx.lineWidth = S * 0.035;
  ctx.strokeStyle = "#FFD7A8";
  for (let i = 0; i < 3; i++) {
    const a0 = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.3, a0 + 0.18, a0 + (Math.PI * 2) / 3 - 0.18);
    ctx.stroke();
  }
  // eight dots on an inner ring
  ctx.rotate(-2 * (spin + t * 0.25));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = S * (0.017 + 0.006 * Math.sin(t * 3 + i * 0.8) * p);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * S * 0.2, Math.sin(a) * S * 0.2, r, 0, Math.PI * 2);
    ctx.fillStyle = "#FFE4C4";
    ctx.fill();
  }
  // bright centre
  ctx.beginPath();
  ctx.arc(0, 0, S * (0.07 + 0.012 * p), 0, Math.PI * 2);
  ctx.fillStyle = "#FFF6EC";
  ctx.fill();
  ctx.restore();
}
