// AE Grid · the demo: nine tiles in a 3×3 grid (the gears are one tall pair across the middle column), centred in a
// vertical frame on the dark colour; an 8-second seamless loop. Pick the palette with the `palette` prop (P1 · P2 · P3).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arches, Discs, Gears, Hourglass, Pendulum, Stairs, Toggles, Waves } from "../lib/tiles";
import { FPS, GRID_TOP, PALETTES, TILE, darker, type PalId } from "../lib/theme";

export type GridProps = { palette?: PalId; times?: number[] };
const at = (r: number, c: number): React.CSSProperties => ({ position: "absolute", left: c * TILE, top: GRID_TOP + r * TILE });

export const Grid9: React.FC<GridProps> = ({ palette = "P2", times }) => {
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const P = PALETTES[palette];
  return (
    <AbsoluteFill style={{ background: darker(P.D) }}>
      <div style={at(0, 0)}><Arches t={t} P={P} /></div>
      <div style={at(0, 1)}><Gears t={t} P={P} /></div>
      <div style={at(0, 2)}><Hourglass t={t} P={P} /></div>
      <div style={at(1, 0)}><Discs t={t} P={P} /></div>
      <div style={at(1, 2)}><Toggles t={t} P={P} /></div>
      <div style={at(2, 0)}><Waves t={t} P={P} /></div>
      <div style={at(2, 1)}><Stairs t={t} P={P} /></div>
      <div style={at(2, 2)}><Pendulum t={t} P={P} /></div>
    </AbsoluteFill>
  );
};

/** stills at chosen times, for review */
export const LOOK = [0, 0.5, 1.0, 1.6, 2.3, 3.0, 3.6, 4.2, 5.0, 6.1, 7.0, 7.9];
