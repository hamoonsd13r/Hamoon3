// Hollow Moon 3D · the film as a Remotion component: one WebGL canvas driven by the engine (a pure function of film
// time). It plays silent; the sound (your song from its offset + a synthesised storm) is built by
// pipeline/build-audio.cjs and muxed with ffmpeg afterwards.
// The moon is baked data (~150 MB) that the kit cannot ship: until pipeline/fetch-assets.mjs and pipeline/bake.mts have
// run, every frame shows the two commands instead of a broken render.
// `times` / `cams` (Style-HollowMoon3D-Look) map each frame to any film second or a free camera, for review stills.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Engine, type MoonAssets } from "../lib/engine";
import type { Theme } from "../lib/theme";
import { FILM, FPS } from "./film";

/** where the style's sky, textures, rocks and baked moon live (public/styles/hollow-moon-3d) */
export const ASSET_BASE = "styles/hollow-moon-3d";

/** cams: [px, py, pz, tx, ty, tz, fov, focus?, aper?] per frame (null = the film's own camera) */
export type FilmProps = { times?: number[]; cams?: (number[] | null)[]; dbg?: string; ss?: number; theme?: Partial<Theme> };

const NotReady: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #2a1606 0%, #0b0705 46%, #030303 100%)", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#f3e6d0" }}>
    <div style={{ width: 1320, padding: "56px 64px", border: "1px solid rgba(255,140,60,0.45)", borderRadius: 18, background: "rgba(0,0,0,0.35)" }}>
      <div style={{ fontSize: 30, letterSpacing: "0.3em", color: "#ff8a3d", marginBottom: 28 }}>HOLLOW MOON 3D · ASSETS NOT BUILT YET</div>
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs
        <br />
        npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts
      </div>
      <div style={{ fontSize: 22, lineHeight: 1.6, marginTop: 28, opacity: 0.7 }}>
        Poly Haven sky, textures and scanned rocks (CC0) + the NASA LROC moon map: about 135 MB to download, about 280 MB in
        public/styles/hollow-moon-3d after the bake (about a minute on the CPU, 2 GB of RAM). Then render again.
      </div>
    </div>
  </AbsoluteFill>
);

export const HollowMoonVideo: React.FC<FilmProps> = ({ times, cams, dbg, ss, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] ?? 0 : frame / FPS;
  const ref = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Promise<Engine> | null>(null);
  // the manifest once the assets are built · false = not built yet (placeholder) · null = still asking
  const [ready, setReady] = useState<MoonAssets | false | null>(null);
  const [probe] = useState(() => delayRender("hollow-moon assets.json"));
  useLayoutEffect(() => {
    fetch(staticFile(`${ASSET_BASE}/assets.json`))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((a: MoonAssets | null) => {
        setReady(a && a.ready ? a : false);
        continueRender(probe);
      });
  }, [probe]);
  useLayoutEffect(() => {
    if (!ready) return;
    const h = delayRender(`hollow-moon t=${t.toFixed(3)}`, { timeoutInMilliseconds: 290000 });
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    (async () => {
      if (!eng.current) {
        const brand = theme ? { ...FILM.brand, theme: { ...FILM.brand.theme, ...theme } } : FILM.brand;
        eng.current = Engine.create(ref.current!, {
          W: width, H: height, ss: ss ?? (width >= 3000 ? 1 : 2), url: (p) => staticFile(`${ASSET_BASE}/${p}`), font: (f) => staticFile(`fonts/${f}`),
          film: { ...FILM, brand }, assets: ready, dbg,
        });
      }
      const e = await eng.current;
      const c = cams?.[Math.min(frame, cams.length - 1)];
      const t0 = performance.now();
      e.frame(t, c ? { p: [c[0], c[1], c[2]], t: [c[3], c[4], c[5]], fov: c[6] ?? 35, focus: c[7], aper: c[8] } : undefined);
      e.r.getContext().finish();
      if (frame < 3 || dbg?.includes("stats")) console.log(`[hollow-moon] frame ${frame} t=${t.toFixed(2)} ${(performance.now() - t0).toFixed(0)} ms ${JSON.stringify(e.stats)}`);
      finish();
    })().catch((err) => {
      console.error("[hollow-moon] " + (err?.stack ?? err));
      cancelRender(err);
    });
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, frame, ready]);
  if (ready === false) return <NotReady />;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={width} height={height} style={{ width, height }} />
    </AbsoluteFill>
  );
};
