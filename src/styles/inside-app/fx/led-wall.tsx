// Inside App · effect «/led-wall»: a word or number rebuilt on a physical LED wall — a boot sparkle, then the text
// (it changes on every 8th note: e.g. years), a scan bar, a slow push; the wall straightens as the card goes full screen.
// Canvas 2D, drawn synchronously from τ (no state): one LED = one pixel of a small canvas the text is drawn into.
import React, { useLayoutEffect, useRef } from "react";
import { BEAT, F, clamp, ease, hash } from "../lib/theme";
import type { FxProps } from "../lib/types";

const COLS = 96, ROWS = 170, PITCH = 1080 / COLS;

export const makeLedWall = (frames = ["1928", "1958", "1984", "2026"], sub = "● LIVE", color: [number, number, number] = [255, 176, 72]): React.FC<FxProps> => ({ tau, full, tile }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    if (!small.current) small.current = document.createElement("canvas");
    const sm = small.current;
    sm.width = COLS;
    sm.height = ROWS;
    const sx = sm.getContext("2d", { willReadFrequently: true })!;
    // 1 · the source frame (1 px = 1 LED)
    sx.fillStyle = "#000";
    sx.fillRect(0, 0, COLS, ROWS);
    const step = BEAT.P / 2;
    const idx = Math.min(frames.length - 1, Math.floor(Math.max(0, tau - 0.25) / step));
    const boot = clamp((tau - 0.05) / 0.25);
    if (tau >= 0.25) {
      sx.fillStyle = "#fff";
      sx.font = `700 ${Math.round(COLS * 0.36)}px ${F.ui}`;
      sx.textAlign = "center";
      sx.textBaseline = "middle";
      sx.fillText(frames[idx], COLS / 2, ROWS * 0.47);
      sx.font = `600 ${Math.round(COLS * 0.08)}px ${F.mono}`;
      sx.fillText(sub, COLS / 2, ROWS * 0.66);
    }
    const img = sx.getImageData(0, 0, COLS, ROWS).data;
    // 2 · the wall
    ctx.fillStyle = "#07060A";
    ctx.fillRect(0, 0, 1080, 1920);
    const scan = ((tau * 0.9) % 1.2) - 0.1; // a soft bright bar running down
    const r = PITCH * 0.36;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * 4;
        let v = img[i] / 255;
        // boot sparkle before the text lands
        if (tau < 0.25) v = hash(x * 13 + y * 71 + Math.floor(tau * 30) * 7) > 1 - 0.18 * boot ? 0.7 : 0;
        const sc = Math.exp(-(((y / ROWS - scan) * 9) ** 2)) * 0.35;
        const flick = 0.9 + 0.1 * hash(x * 3.1 + y * 7.7 + Math.floor(tau * 24));
        const b = clamp(v * flick + sc * (v > 0 ? 0.6 : 0.12));
        const cx = x * PITCH + PITCH / 2, cy = y * PITCH + PITCH / 2;
        if (b < 0.04) {
          ctx.fillStyle = "rgba(60,48,36,.35)";
          ctx.fillRect(cx - r * 0.6, cy - r * 0.6, r * 1.2, r * 1.2);
          continue;
        }
        ctx.fillStyle = `rgb(${Math.round(color[0] * b)},${Math.round(color[1] * b)},${Math.round(color[2] * b)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [tau]);
  const tilt = 1 - ease.inOut(clamp(full));
  return (
    <div style={{ position: "absolute", inset: 0, background: "#030305", overflow: "hidden", perspective: 1800 }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1.04 + 0.03 * clamp(tau / 2)}) rotateY(${-12 * tilt}deg) rotateX(${5 * tilt}deg)`, transformOrigin: "50% 50%" }}>
        <canvas ref={ref} width={1080} height={1920} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
        {!tile && <canvas width={1} height={1} style={{ display: "none" }} />}
        {/* bloom: the same wall, blurred, added on top */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 30% at 50% 47%, rgba(${color.join(",")},.16), transparent 70%)`, mixBlendMode: "screen" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)" }} />
    </div>
  );
};
