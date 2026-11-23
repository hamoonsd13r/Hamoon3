# Hollow Moon 3D · sources

The kit ships no image or mesh for this style: `node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs` downloads them
here, and `npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts` builds the moon from the NASA map. All of it is free for
any use, commercial included.

| file (after the fetch / bake) | source | licence |
|---|---|---|
| `hdr/kloppenheim_07_puresky_{2k,8k}.hdr` | Poly Haven, «Kloppenheim 07 (Pure Sky)» | CC0 |
| `tex/moon_meteor_01_*`, `tex/moon_macro_01_*` | Poly Haven, lunar regolith scans | CC0 |
| `tex/dark_rock_02_*` | Poly Haven, «Dark Rock 02» | CC0 |
| `tex/blue_metal_plate_*` | Poly Haven, «Blue Metal Plate» | CC0 |
| `rocks/moon_rock_01…07.*` | Poly Haven, photoscanned «Moon Rock 01–07» (glTF flattened by the fetch script) | CC0 |
| `moon/*` (baked) | from the NASA Scientific Visualization Studio «CGI Moon Kit», LROC colour map (`lroc_color_poles_4k.tif`, kept in `.cache/hollow-moon-3d`) | public domain (NASA); credit appreciated: «NASA's Scientific Visualization Studio» |

The demo's sample logo (`src/styles/hollow-moon-3d/demo/logo-paths.json`) is the text «YOUR BRAND / STUDIO» set in
Inter (SIL OFL 1.1) and traced to vector paths with `tools/logo-trace.mjs`. The engravings use Chakra Petch (OFL, kit
fonts). Everything else — the ring, the hall, the armillary, the cage, the sea, the lightning — is built by code.
