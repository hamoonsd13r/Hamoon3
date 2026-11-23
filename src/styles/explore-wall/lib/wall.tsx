// Explore Wall · the world: an endless Instagram-style reels grid, flown over by a 3D camera. Cells are 304 × 540
// with a 6 px gutter (Instagram's grid). Each cell shows a tile: YOUR reel covers (`ImgTile`) or covers drawn in
// code (`CodeTile`, the demo). `hi(col,row)` lifts a cell toward the lens with an accent ring and dims the rest.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, accentA, clamp, fmtV, hash } from "./theme";

export const CELL = { w: 304, h: 540, g: 6 };
export const cellX = (col: number) => col * (CELL.w + CELL.g);
export const cellY = (row: number) => row * (CELL.h + CELL.g);
export const cellCenter = (col: number, row: number) => ({ x: cellX(col) + CELL.w / 2, y: cellY(row) + CELL.h / 2 });
export const wallSize = (cols: number, rows: number) => ({ w: cols * (CELL.w + CELL.g) - CELL.g, h: rows * (CELL.h + CELL.g) - CELL.g });

export type Tile = { views: number; title?: string; hue?: number; kind?: number; img?: string };

/** Instagram's eye + count, re-set in crisp type at the corner of a tile */
export const Views: React.FC<{ v: number; size?: number; style?: React.CSSProperties }> = ({ v, size = 26, style }) => (
  <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", alignItems: "center", gap: size * 0.3, padding: `${size * 0.18}px ${size * 0.38}px`, borderRadius: size * 0.5, background: "rgba(0,0,0,0.45)", fontFamily: F.ui, fontWeight: 750, fontSize: size, color: "#fff", direction: "ltr", ...style }}>
    <svg width={size * 0.95} height={size * 0.95} viewBox="0 0 24 24">
      <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="#fff" strokeWidth={2.2} />
      <circle cx={12} cy={12} r={3.6} fill="#fff" />
    </svg>
    {fmtV(v)}
  </div>
);

/** a reel cover drawn in code: a graded colour field, one bold shape, a two-line title (the demo's covers) */
export const CodeTile: React.FC<{ tile: Tile; w?: number; h?: number }> = ({ tile, w = CELL.w, h = CELL.h }) => {
  const hue = tile.hue ?? 20, k = tile.kind ?? 0;
  // graded, cinematic colour (never candy-bright): mid-dark field, one lighter accent shape
  const l = 26 + 10 * ((k * 7) % 3) / 2;
  const a = `hsl(${hue} 38% ${l}%)`, b = `hsl(${(hue + 35) % 360} 34% 9%)`, hi = `hsl(${(hue + 25) % 360} 70% 66%)`;
  return (
    <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", background: `linear-gradient(160deg, ${a}, ${b})` }}>
      <svg width={w} height={h} viewBox="0 0 304 540" style={{ position: "absolute", inset: 0 }}>
        {k % 5 === 0 ? <circle cx={200} cy={170} r={86} fill={hi} opacity={0.9} /> : null}
        {k % 5 === 1 ? <path d="M0 330 L90 210 L160 290 L230 170 L304 280 L304 540 L0 540 Z" fill="rgba(0,0,0,0.35)" /> : null}
        {k % 5 === 2 ? <g>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-40 + i * 80} y={-60} width={34} height={700} fill={hi} opacity={0.18} transform="rotate(18 152 270)" />)}</g> : null}
        {k % 5 === 3 ? <g><circle cx={152} cy={220} r={70} fill="rgba(0,0,0,0.42)" /><path d="M60 420 Q152 260 244 420 Z" fill="rgba(0,0,0,0.42)" /><circle cx={152} cy={220} r={70} fill="none" stroke={hi} strokeWidth={4} opacity={0.7} /></g> : null}
        {k % 5 === 4 ? <g>{Array.from({ length: 7 }, (_, i) => <rect key={i} x={24 + i * 38} y={330 - 40 * Math.abs(Math.sin(i * 1.7 + hue))} width={26} height={40 + 40 * Math.abs(Math.sin(i * 1.7 + hue))} rx={6} fill={hi} opacity={0.8} />)}</g> : null}
      </svg>
      {tile.title ? (
        <div style={{ position: "absolute", right: 18, left: 18, top: h * 0.6, direction: "rtl", fontFamily: F.fa, fontSize: Math.min(44, w * 0.145), lineHeight: 1.15, color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.55)" }}>{tile.title}</div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 70%, rgba(0,0,0,0.45))" }} />
    </div>
  );
};

/** one of YOUR reel covers (public path), cover-cropped to the cell */
export const ImgTile: React.FC<{ tile: Tile; w?: number; h?: number }> = ({ tile, w = CELL.w, h = CELL.h }) => (
  <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", background: C.ig }}>
    {tile.img ? <Img src={staticFile(tile.img)} style={{ position: "absolute", inset: 0, width: w, height: h, objectFit: "cover", maxWidth: "none" }} /> : null}
  </div>
);
export const TileView: React.FC<{ tile: Tile; w?: number; h?: number; views?: boolean }> = ({ tile, w, h, views = true }) => (
  <>
    {tile.img ? <ImgTile tile={tile} w={w} h={h} /> : <CodeTile tile={tile} w={w} h={h} />}
    {views ? <Views v={tile.views} /> : null}
  </>
);

/** a deterministic tile for any cell of an endless wall; neighbours never repeat */
export const tileFrom = (tiles: Tile[]) => {
  const cache = new Map<string, number>();
  const at = (col: number, row: number): number => {
    const key = `${col},${row}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const near = new Set<number>();
    for (const [dc, dr] of [[-1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [0, -2]]) if (col + dc >= -8 && row + dr >= -8) near.add(at(col + dc, row + dr));
    let i = Math.floor(hash(col * 12.9898 + row * 78.233) * tiles.length) % tiles.length;
    for (let k = 0; k < tiles.length && near.has(i); k++) i = (i + 7) % tiles.length;
    cache.set(key, i);
    return i;
  };
  return (col: number, row: number) => tiles[at(col, row)];
};

export type WallP = {
  cols: number; rows: number; col0?: number; row0?: number;
  tile: (col: number, row: number) => Tile;
  /** 0..1 darkening of every cell */ dim?: number;
  /** 0..1 per cell: lifts it, rings it, dims the others by hiDim */ hi?: (col: number, row: number) => number;
  hiDim?: number; blur?: number; views?: boolean;
  /** replace a cell with your own node (an empty slot, a «your reel here» card) */ cell?: (col: number, row: number) => React.ReactNode | null;
};
export const MosaicWall: React.FC<WallP> = ({ cols, rows, col0 = 0, row0 = 0, tile, dim = 0, hi, hiDim = 0.55, blur = 0, views = true, cell }) => {
  const cells: React.ReactNode[] = [];
  let any = 0;
  if (hi) for (let r = row0; r < row0 + rows; r++) for (let c = col0; c < col0 + cols; c++) any = Math.max(any, hi(c, r));
  for (let r = row0; r < row0 + rows; r++) {
    for (let c = col0; c < col0 + cols; c++) {
      const h = hi ? clamp(hi(c, r)) : 0;
      const d = clamp(dim + any * hiDim * (1 - h));
      cells.push(
        <div key={`${c},${r}`} style={{ position: "absolute", left: cellX(c), top: cellY(r), width: CELL.w, height: CELL.h, transform: h > 0 ? `translateZ(${h * 60}px) scale(${1 + h * 0.06})` : undefined, zIndex: h > 0 ? 2 : 1 }}>
          {cell?.(c, r) ?? <TileView tile={tile(c, r)} views={views} />}
          {d > 0.001 ? <div style={{ position: "absolute", inset: 0, background: `rgba(5,7,11,${d * 0.85})` }} /> : null}
          {h > 0.01 ? <div style={{ position: "absolute", inset: -3, borderRadius: 4, border: `${3 + h * 3}px solid ${C.accent}`, opacity: h, boxShadow: `0 0 ${30 * h}px ${accentA(0.55 * h)}` }} /> : null}
        </div>,
      );
    }
  }
  return <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>{cells}</div>;
};
