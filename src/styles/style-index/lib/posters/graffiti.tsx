// 18 · Graffiti — a real piece, sprayed live on a brick wall: the fill blooms through the mist, a thick black outline
// with a 3-D block shadow follows, white highlights flick on, tapered drips keep running; the writer stands in front
// with his can up and sprays the ART'26 tag in a puff of mist; a slow dolly over the bricks and a passing car light
// keep the wall alive. Redrawn from time every frame.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Img, continueRender, delayRender } from "remotion";
import { F, PH, PW, ease, hash, mix, ramp, tween } from "../theme";
import { Frame, Grain, Vignette, ar, img, type PosterProps } from "../kit";

const WORD = "GRAFFITI", ANG = (-7 * Math.PI) / 180, CX = 360, CY = 430;
// the writer (GRA-02, trimmed, seen from behind): 560 wide, his nozzle at image (300, 26)
const AW = 560, AH = AW * ar("GRA-02"), AK = AW / 1536, AX = 250, AY = 640, NX = AX + 300 * AK, NY = AY + 26 * AK;
const FILL: [number, string][] = [[0, "#FFD23F"], [0.35, "#FF8A1F"], [0.65, "#FF3D7F"], [1, "#B24BFF"]];
const BLOCK = "#2A0E3A";

const mk = () => {
  const c = document.createElement("canvas");
  c.width = PW;
  c.height = PH;
  return c;
};
const inWord = (c: CanvasRenderingContext2D) => {
  c.translate(CX, CY);
  c.rotate(ANG);
};
/** the spray path over the word (word space), u 0→1 */
const canAt = (u: number, half: number) => [mix(-half, half, u), Math.sin(u * Math.PI * 16) * 70 - 46] as const;
const toScreen = (x: number, y: number) => [CX + x * Math.cos(ANG) - y * Math.sin(ANG), CY + x * Math.sin(ANG) + y * Math.cos(ANG)] as const;

export const Graffiti: React.FC<PosterProps> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const c = useMemo(() => (typeof document === "undefined" ? null : { mask: mk(), paint: mk(), fill: mk(), tex: mk() }), []);
  // the wall, also in the canvas (for the paint's texture)
  const [wall, setWall] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender("graffiti wall"));
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      setWall(im);
      continueRender(handle);
    };
    im.src = img("GRA-01");
  }, [handle]);
  // the letters: sized to 88 % of the width, drawn once into a mask; drip starts found from it
  const geo = useMemo(() => {
    if (!c) return null;
    const m = c.mask.getContext("2d")!;
    let size = 200;
    m.font = `${size}px ${F.sedgwick}`;
    size = Math.floor((size * PW * 0.86) / m.measureText(WORD).width);
    m.clearRect(0, 0, PW, PH);
    m.save();
    inWord(m);
    m.font = `${size}px ${F.sedgwick}`;
    m.textAlign = "center";
    m.fillStyle = "#fff";
    m.fillText(WORD, 0, size * 0.32);
    m.restore();
    const data = m.getImageData(0, 0, PW, PH).data;
    const drips: { x: number; y: number; len: number; w: number; at: number }[] = [];
    for (let k = 0; k < 14; k++) {
      const x = Math.round(64 + k * 44 + hash(k * 3.3) * 18);
      for (let y = PH - 1; y > 300; y--) {
        if (data[(y * PW + x) * 4 + 3] > 200) {
          drips.push({ x, y: y - 3, len: 26 + hash(k * 7.1) * 120, w: 7 + hash(k * 2.3) * 6, at: 0.3 + (x / PW) * 0.3 + hash(k) * 0.12 });
          break;
        }
      }
    }
    return { size, drips, half: (PW * 0.86) / 2 };
  }, [c]);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !c || !geo) return;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, PW, PH);
    const u = ramp(t, 0.0, 0.46);
    // 1) painted region: soft dabs along the zigzag so far
    const p = c.paint.getContext("2d")!;
    p.clearRect(0, 0, PW, PH);
    const N = 260;
    for (let i = 0; i <= N * u; i++) {
      const [x, y] = canAt(i / N, geo.half);
      const [sx, sy] = toScreen(x, y);
      const r = 92;
      const gr = p.createRadialGradient(sx, sy, 0, sx, sy, r);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      p.fillStyle = gr;
      p.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    // 2) fill = gradient ∩ letters ∩ painted
    const f = c.fill.getContext("2d")!;
    f.globalCompositeOperation = "source-over";
    f.clearRect(0, 0, PW, PH);
    const lg = f.createLinearGradient(40, 0, 680, 0);
    FILL.forEach(([o, col]) => lg.addColorStop(o, col));
    f.fillStyle = lg;
    f.fillRect(0, 0, PW, PH);
    // two-tone fade inside each letter (darker bottom)
    const vg = f.createLinearGradient(0, CY - geo.size * 0.5, 0, CY + geo.size * 0.4);
    vg.addColorStop(0, "rgba(255,255,255,0.25)");
    vg.addColorStop(0.5, "rgba(255,255,255,0)");
    vg.addColorStop(1, "rgba(40,0,60,0.35)");
    f.fillStyle = vg;
    f.fillRect(0, 0, PW, PH);
    f.globalCompositeOperation = "destination-in";
    f.drawImage(c.mask, 0, 0);
    f.drawImage(c.paint, 0, 0);
    f.globalCompositeOperation = "source-over";
    const word = (ctx: CanvasRenderingContext2D, fn: () => void) => {
      ctx.save();
      inWord(ctx);
      ctx.font = `${geo.size}px ${F.sedgwick}`;
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      fn();
      ctx.restore();
    };
    // 3) overspray halo, block shadow, outline (left to right), the fill, highlights
    const ou = tween(t, 0.2, 0.62, ease.inOut);
    g.save();
    g.beginPath();
    g.rect(0, 0, mix(-60, PW + 60, ou), PH);
    g.clip();
    word(g, () => {
      g.shadowColor = "rgba(255,90,120,0.3)";
      g.shadowBlur = 10;
      g.strokeStyle = "rgba(255,90,120,0.16)";
      g.lineWidth = 26;
      g.strokeText(WORD, 0, geo.size * 0.32);
      g.shadowBlur = 0;
      for (let k = 12; k > 0; k--) {
        g.fillStyle = BLOCK;
        g.fillText(WORD, k * 1.4, geo.size * 0.32 + k * 1.6);
      }
      g.strokeStyle = "#0B0710";
      g.lineWidth = 22;
      g.strokeText(WORD, 0, geo.size * 0.32);
    });
    g.restore();
    g.drawImage(c.fill, 0, 0);
    // the bricks show through the paint: the fill multiplied by the wall, laid back over it
    if (wall) {
      const tx = c.tex.getContext("2d")!;
      tx.globalCompositeOperation = "source-over";
      tx.clearRect(0, 0, PW, PH);
      tx.drawImage(c.fill, 0, 0);
      tx.globalCompositeOperation = "multiply";
      tx.drawImage(wall, -66, 0, 853, 1280);
      tx.globalCompositeOperation = "destination-in";
      tx.drawImage(c.fill, 0, 0);
      tx.globalCompositeOperation = "source-over";
      g.globalAlpha = 0.5;
      g.drawImage(c.tex, 0, 0);
      g.globalAlpha = 1;
    }
    word(g, () => {
      g.save();
      g.beginPath();
      g.rect(-PW, -PH, mix(0, PW * 2, ou), PH * 2);
      g.clip();
      g.strokeStyle = "#0B0710";
      g.lineWidth = 6;
      g.strokeText(WORD, 0, geo.size * 0.32);
      g.restore();
    });
    // tapered drips, still running
    for (const d of geo.drips) {
      const k = tween(t, d.at, d.at + 5.2, (x) => 1 - Math.pow(1 - x, 1.6));
      if (k <= 0) continue;
      const L = d.len * k;
      const col = d.x < 200 ? "#FFB12C" : d.x < 380 ? "#FF6A3A" : d.x < 520 ? "#FF3D7F" : "#B24BFF";
      g.fillStyle = col;
      // a paint drip: full width where it leaves the letter, a narrower neck, a heavy rounded drop at the end
      g.beginPath();
      g.moveTo(d.x - d.w / 2 - 2, d.y - 2);
      g.quadraticCurveTo(d.x - d.w * 0.32, d.y + L * 0.5, d.x - d.w * 0.26, d.y + L);
      g.lineTo(d.x + d.w * 0.26, d.y + L);
      g.quadraticCurveTo(d.x + d.w * 0.32, d.y + L * 0.5, d.x + d.w / 2 + 2, d.y - 2);
      g.fill();
      g.beginPath();
      g.ellipse(d.x, d.y + L + d.w * 0.2, d.w * 0.46, d.w * 0.58, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.beginPath();
      g.ellipse(d.x - d.w * 0.15, d.y + L + d.w * 0.05, d.w * 0.12, d.w * 0.2, 0, 0, Math.PI * 2);
      g.fill();
    }
    // highlights: a few curved glints on the letters' shoulders, two sparkles that twinkle
    const sh = tween(t, 0.5, 0.7);
    if (sh > 0) {
      g.strokeStyle = "rgba(255,255,255,0.95)";
      g.fillStyle = "#fff";
      g.lineCap = "round";
      [0.06, 0.33, 0.6, 0.86].forEach((k, i) => {
        const [x, y] = toScreen(-geo.half + k * geo.half * 2, -geo.size * (0.3 + (i % 2) * 0.05));
        g.lineWidth = 7;
        g.beginPath();
        g.arc(x + 18, y + 16, 20, Math.PI * 1.08, Math.PI * (1.08 + 0.42 * sh));
        g.stroke();
        g.beginPath();
        g.arc(x + 30, y - 2, 3.6 * sh, 0, Math.PI * 2);
        g.fill();
      });
    }
    // mist: a fresh cloud at the nozzle while spraying, fine overspray everywhere it passed
    for (let i = 0; i < 360; i++) {
      const [ox, oy] = canAt(hash(i * 1.37) * u, geo.half);
      const [qx, qy] = toScreen(ox, oy);
      const a = hash(i * 7.7) * Math.PI * 2, r = 70 + hash(i * 3.1) * 70;
      g.fillStyle = `rgba(255,${80 + Math.floor(hash(i) * 120)},120,${0.16 * hash(i * 9.3)})`;
      g.fillRect(qx + Math.cos(a) * r, qy + Math.sin(a) * r, 2, 2);
    }
    if (t < 0.5) {
      const [cx, cy] = canAt(u, geo.half);
      const [sx, sy] = toScreen(cx, cy);
      const fr = Math.floor(t * 30);
      for (let i = 0; i < 220; i++) {
        const a = hash(i + fr * 13) * Math.PI * 2, r = Math.pow(hash(i * 2.1 + fr), 2) * 90;
        g.fillStyle = `rgba(255,255,255,${0.32 * hash(i * 5 + fr)})`;
        g.fillRect(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 2, 2);
      }
    }
  }, [t, c, geo, wall]);

  const dolly = mix(1.1, 1.0, ease.out(ramp(t, 0, 4))), pan = mix(-24, 10, ramp(t, 0, 4));
  const car = ((t * 0.35 + 0.15) % 1) * 1600 - 400;
  return (
    <Frame bg="#4A2A22">
      <div style={{ position: "absolute", inset: 0, transform: `scale(${dolly}) translateX(${pan}px)`, transformOrigin: "50% 45%" }}>
        <Img src={img("GRA-01")} style={{ position: "absolute", left: -66, top: 0, width: 853, height: 1280, maxWidth: "none", filter: "brightness(0.8) contrast(1.06)" }} />
        <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }} />
        {/* the tag, sprayed last */}
        <div style={{ position: "absolute", left: NX - 262, top: NY - 70, fontFamily: F.marker, fontSize: 86, color: "#fff", transform: "rotate(-9deg)", clipPath: `inset(-30% 0 -30% ${100 - 100 * tween(t, 0.52, 0.9)}%)`, textShadow: "0 0 3px rgba(255,255,255,0.7), 0 0 14px rgba(255,255,255,0.25)" }}>ART&apos;26</div>
        <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
          <path transform={`translate(0, ${CY - 600})`} d="M180,360 L200,300 L230,340 L260,286 L286,340 L318,300 L334,362 Z" stroke="#FF5C8A" strokeWidth={9} fill="none" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tween(t, 0.56, 0.8)} />
        </svg>
        {/* mist puffing from his nozzle while he tags */}
        <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
          {t > 0.5 && t < 1.1
            ? Array.from({ length: 70 }, (_, i) => {
                const fr = Math.floor(t * 30), a = Math.PI + (hash(i * 3.1) - 0.5) * 0.9, r = Math.pow(hash(i * 1.7 + fr * 0.13), 0.7) * 120;
                return <circle key={i} cx={NX + Math.cos(a) * r - 8} cy={NY + Math.sin(a) * r * 0.6} r={1.2 + hash(i) * 1.6} fill="#fff" opacity={0.35 * hash(i * 5 + fr) * (1 - ramp(t, 0.9, 1.1))} />;
              })
            : null}
        </svg>
      </div>
      {/* the writer, in front of the wall, can up */}
      <div style={{ position: "absolute", left: AX, top: AY, width: AW, height: AH, transformOrigin: "60% 100%", transform: `rotate(${Math.sin(t * 2.6) * 0.7}deg)`, filter: "brightness(0.82) contrast(1.05) drop-shadow(-8px 10px 14px rgba(0,0,0,0.45))" }}>
        <Img src={img("GRA-02")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
      {/* a car passing in the street: a soft light band sweeping the wall */}
      <div style={{ position: "absolute", top: 0, bottom: 0, width: 380, left: car, background: "linear-gradient(90deg, rgba(255,214,150,0), rgba(255,214,150,0.14), rgba(255,214,150,0))", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", left: 40, top: 1200, fontFamily: F.marker, fontSize: 28, letterSpacing: "0.16em", color: "rgba(255,255,255,0.88)", opacity: tween(t, 0.45, 0.75) }}>STREET · SPRAY · WALLS</div>
      <Vignette amt={0.55} />
      <Grain t={t} amt={0.08} />
    </Frame>
  );
};
