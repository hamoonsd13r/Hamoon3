// Hollow Moon 3D · the look in tokens. The world itself is photoreal (real night sky, scanned lunar rock, gold, bronze)
// and keeps its own colours; the brand lives in the logo and its accent. Put your brand colour in `accent`.
export type RGB = [number, number, number];

export type Theme = {
  /** the accent part of the logo (a dot, a slash, a mark) and its letters on the great ring: sRGB hex */
  accent: number;
  /** the polished front faces of the logo letters (linear RGB; gold by default, try [0.95, 0.95, 0.97] for silver) */
  metal: RGB;
  /** the sides and bevels of the letters (linear RGB) */
  metalSide: RGB;
};

/** the accepted film's gold, with the kit's default accent (orange on black) in place of a brand colour */
export const THEME: Theme = {
  accent: 0xff5a1f,
  metal: [1.0, 0.77, 0.42],
  metalSide: [1.0, 0.72, 0.31],
};

/** sRGB hex → linear RGB (what the shaders and the light math use) */
export function hexToLinear(hex: number, k = 1): RGB {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0] * k, c[1] * k, c[2] * k];
}
