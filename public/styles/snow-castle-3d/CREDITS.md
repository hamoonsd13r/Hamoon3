# Snow Castle 3D · sources

Everything here is CC0 (public domain dedication): free for any use, commercial included, no attribution required.

| file | source | licence |
|---|---|---|
| `hdr/overcast_soil_puresky_2k.hdr` | Poly Haven, «Overcast Soil (Pure Sky)», polyhaven.com/a/overcast_soil_puresky | CC0 |
| `tex/castle_wall_slates_*` | Poly Haven, «Castle Wall Slates» | CC0 |
| `tex/stone_brick_wall_001_*` | Poly Haven, «Stone Brick Wall 001» | CC0 |
| `tex/roof_slates_03_*` | Poly Haven, «Roof Slates 03» | CC0 |
| `tex/dark_rock_02_*` | Poly Haven, «Dark Rock 02» | CC0 |
| `tex/weathered_planks_*` | Poly Haven, «Weathered Planks» | CC0 |
| `tex/pine_bark_*` | Poly Haven, «Pine Bark» | CC0 |
| `tex/snow_02_nor_gl.jpg` | Poly Haven, «Snow 02» (normal map only) | CC0 |

The kit ships the textures at 1k (re-encoded JPEG, 4:4:4) and the sky at 2k, so the demo plays at once.
`node src/styles/snow-castle-3d/pipeline/fetch-assets.mjs` replaces them with the 2k textures and adds the 8k sky
(the accepted film); it rewrites `assets.json`, which tells the engine which sky file to show.

Everything else in the picture — the castle, the rock, the trees, the snow, the water, the lights — is built by code.
The score is synthesised by `pipeline/make-music.cjs` (no samples).
