// Snow Castle 3D · the look in tokens. A photoreal world has no flat palette: its colours come from the real sky
// photograph and the scanned materials. These are the few values that carry identity or taste.
// Put your brand colour on the cloth (banners, pennants) — never on the stone, the snow or the light.
export type RGB = [number, number, number];

export type Theme = {
  /** hangings on the gate turrets: main cloth and its gilded charge (sRGB hex) */
  banner: number;
  bannerTrim: number;
  /** the pennants on the spires, three cloths (linear RGB, dark: they are lit by the sky) + the stripe across them */
  pennants: [RGB, RGB, RGB];
  pennantStripe: RGB;
  /** the film grade (daylight values; the dusk part of the light clock adds to them) */
  exposure: number;
  contrast: number;
  saturation: number;
  /** split tone added to shadows / highlights (linear RGB offsets) */
  shadowTint: RGB;
  highTint: RGB;
  vignette: number;
  grain: number;
};

/** the accepted film: a cold blue-grey winter afternoon, low saturation, deep red and old gold cloth */
export const THEME: Theme = {
  banner: 0x9c2026,
  bannerTrim: 0xc9a24a,
  pennants: [
    [0.27, 0.06, 0.065],
    [0.05, 0.11, 0.26],
    [0.26, 0.17, 0.05],
  ],
  pennantStripe: [0.44, 0.4, 0.31],
  exposure: 1.14,
  contrast: 1.2,
  saturation: 0.62,
  shadowTint: [-0.012, 0.002, 0.02],
  highTint: [-0.012, 0.0, 0.014],
  vignette: 0.62,
  grain: 0.012,
};

/** sRGB hex → linear RGB (for shader uniforms), handy when you set the pennants from a brand colour */
export function hexToLinear(hex: number, k = 1): RGB {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0] * k, c[1] * k, c[2] * k];
}
