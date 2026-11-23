// Snow Castle 3D · the film as a Remotion component: one WebGL canvas driven by the engine (a pure function of film
// time). It plays silent; the score is rendered by pipeline/make-music.cjs and muxed with ffmpeg afterwards.
// `times` / `cams` (Style-SnowCastle3D-Look) map each frame to any film second or a free camera, for review stills.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Engine, type SnowAssets } from "../lib/engine";
import type { Theme } from "../lib/theme";
import { FILM, FPS } from "./film";

/** where the style's textures and sky live (public/styles/snow-castle-3d) */
export const ASSET_BASE = "styles/snow-castle-3d";
/** shipped = 1k textures and the 2k sky; after `node src/styles/snow-castle-3d/pipeline/fetch-assets.mjs` = 2k + 8k sky */
const FALLBACK: SnowAssets = { env: "hdr/overcast_soil_puresky_2k.hdr", bg: "hdr/overcast_soil_puresky_2k.hdr", tex: "1k" };

/** cams: [px, py, pz, tx, ty, tz, fov, focus?, aper?] per frame (null = the film's own camera) */
export type FilmProps = { times?: number[]; cams?: (number[] | null)[]; dbg?: string; ss?: number; theme?: Partial<Theme> };

export const SnowCastleVideo: React.FC<FilmProps> = ({ times, cams, dbg, ss, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] ?? 0 : frame / FPS;
  const ref = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Promise<Engine> | null>(null);
  useLayoutEffect(() => {
    const h = delayRender(`snow-castle t=${t.toFixed(3)}`, { timeoutInMilliseconds: 290000 });
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    (async () => {
      if (!eng.current) {
        eng.current = (async () => {
          const assets: SnowAssets = await fetch(staticFile(`${ASSET_BASE}/assets.json`))
            .then((r) => (r.ok ? r.json() : FALLBACK))
            .catch(() => FALLBACK);
          return Engine.create(ref.current!, {
            W: width, H: height, ss: ss ?? (width >= 3000 ? 1 : 2), url: (p) => staticFile(`${ASSET_BASE}/${p}`),
            film: FILM, assets, theme, dbg,
          });
        })();
      }
      const e = await eng.current;
      const c = cams?.[Math.min(frame, cams.length - 1)];
      const t0 = performance.now();
      e.frame(t, c ? { p: [c[0], c[1], c[2]], t: [c[3], c[4], c[5]], fov: c[6] ?? 35, focus: c[7], aper: c[8] } : undefined);
      e.r.getContext().finish();
      if (frame < 3 || dbg?.includes("stats")) console.log(`[snow-castle] frame ${frame} t=${t.toFixed(2)} ${(performance.now() - t0).toFixed(0)} ms ${JSON.stringify(e.stats)}`);
      finish();
    })().catch((err) => {
      console.error("[snow-castle] " + (err?.stack ?? err));
      cancelRender(err);
    });
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, frame]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={width} height={height} style={{ width, height }} />
    </AbsoluteFill>
  );
};
