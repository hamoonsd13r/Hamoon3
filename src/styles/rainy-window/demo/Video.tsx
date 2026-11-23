// Rainy Window · one static shot that loops seamlessly. The WebGL pass draws the plate, rain, ripples and glass;
// the 2D canvas on top draws drips, splashes, steam, the robot's eyes and the leak gag.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Html5Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { createGL, type FrameParams } from "../lib/gl";
import { drawFx } from "../lib/fx";
import { CUB, FPS, L, MUG, PLATE, WIN, activeHits, camAt, flicker, poseW } from "../lib/scene";

export const FILM_FRAMES = L * FPS;

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

// steam rises from wherever the mug is in the current pose
const STEAM = { a: MUG, b: { x: 1066, y: 1288 }, c: MUG };

/** audio: a path inside public/ (your loop-length music, e.g. a 4-bar cut); times: Look stills */
export type RainyWindowProps = { audio?: string; times?: number[] };

export const RainyWindow: React.FC<RainyWindowProps> = ({ audio, times }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const draw = useRef<((p: FrameParams) => void) | null>(null);
  const [handle] = useState(() => delayRender("rainy-window plates"));
  const continued = useRef(false);
  const leakPatch = useRef<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, b, c, glow] = await Promise.all(
        ["master.jpg", "sip.jpg", "smile.jpg", "glow.jpg"].map((f) => load(staticFile(`styles/rainy-window/plates/${f}`))),
      );
      if (!a || !glow || !glRef.current) throw new Error("rainy-window: missing master or glow plate (public/styles/rainy-window/plates)");
      draw.current = createGL(glRef.current, { a, b: b ?? a, c: c ?? a, glow }, PLATE);
      // ceiling colours down a clean column beside the painted drop (to hide it once our drop lets go)
      const cv = document.createElement("canvas");
      cv.width = 11;
      cv.height = 100;
      const c2 = cv.getContext("2d", { willReadFrequently: true })!;
      c2.drawImage(a, 1200, 710, 11, 100, 0, 0, 11, 100);
      const px = c2.getImageData(0, 0, 11, 100).data;
      const cols: string[] = [];
      for (let y = 2; y <= 98; y += 4) {
        let r = 0, g = 0, bl = 0;
        for (let x = 0; x < 11; x++) {
          const o = (y * 11 + x) * 4;
          r += px[o]; g += px[o + 1]; bl += px[o + 2];
        }
        cols.push(`rgb(${Math.round(r / 11)},${Math.round(g / 11)},${Math.round(bl / 11)})`);
      }
      leakPatch.current = cols;
      setReady(true);
    })();
  }, []);

  const t = times ? times[Math.min(frame, times.length - 1)] : (frame / FPS) % L;

  useLayoutEffect(() => {
    if (!ready || !draw.current || !fxRef.current) return;
    const w = poseW(t);
    const cam = camAt(t);
    const hits = activeHits(t, 96);
    const rip = new Float32Array(96 * 4);
    hits.forEach(({ h, age }, i) => {
      rip[i * 4] = h.x;
      rip[i * 4 + 1] = h.y;
      rip[i * 4 + 2] = age;
      rip[i * 4 + 3] = Math.floor(h.s * 100) * 10 + h.k;
    });
    draw.current({
      t, L, w: [w.a, w.b, w.c], breath: Math.sin((2 * Math.PI * 4 * t) / L), flick: flicker(t), cam,
      cub: [CUB.x0, CUB.y0, CUB.x1, CUB.y1], win: [WIN.x0, WIN.y0, WIN.x1, WIN.y1], rip, nRip: hits.length,
    });
    const steamFrom = {
      x: STEAM.a.x * w.a + STEAM.b.x * w.b + STEAM.c.x * w.c,
      y: STEAM.a.y * w.a + STEAM.b.y * w.b + STEAM.c.y * w.c,
    };
    drawFx(fxRef.current.getContext("2d")!, width, height, { t, cam, w, steamFrom, leakPatch: leakPatch.current });
    if (!continued.current) {
      continued.current = true;
      continueRender(handle);
    }
  }, [ready, t, width, height, handle]);

  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      <canvas ref={glRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
      <canvas ref={fxRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
      {audio && !times ? (
        <Sequence from={0} layout="none">
          <Html5Audio src={staticFile(audio)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
