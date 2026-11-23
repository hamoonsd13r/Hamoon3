# Toon3D — attribution

## From the MIT template (see `LICENSE`, copyright its author)
`lib/base/` is the picture base of the open-source skill **claude-animated-shorts** (github.com/mromidev/claude-animated-shorts,
MIT): `toon.ts` (2D character cards), `cards.ts` (the card pool, actors and effect cards: the generic first part of the
template's `cast.ts`), `cardshade.ts`, `shade.ts` (two-tone world shading), `ink.ts` (outline pass), `lensblur.ts`
(depth of field + grain), `grade.ts`, `lights.ts`, `paint.ts` (canvas painters), `build.ts` (merged-mesh builders).
Adaptations: Remotion/three versions of the kit (plain postprocessing composer instead of the R3F `<EffectComposer>`,
which drew an empty canvas), more character items, hats and expressions, OFL fonts, the template film's own story,
crowd and town scenes removed. The template's reference frames and contact sheets (of another channel's videos) are
NOT included and must never be redistributed.

## Our own (this kit)
- `lib/kit/` — the film's clock (narration words -> shots, captions, cues), the camera grammar and caption-safe framing
  presets, the film component (post chain, dissolves, captions, Look / framing QA / plan passes).
- `lib/sea/` — the sea world (toon sea with a big wave and an oil slick, two ships, rain, lightning, the galley set, the
  cast and their outfits) and `lib/theme.ts`.
- `demo/` — the neutral demo film (story, sample word timing, script).
- `pipeline/` — plan check, stills, framing QA, render, splice, mixer, sound script, loudness master, voice helpers.

## Assets
No images, audio or video ship with this style: every texture is painted in code (canvas), the characters are drawn in
code, the caption font is Lalezar (OFL, `public/fonts/Lalezar-Regular.ttf`). The demo's sound script uses the kit's
free libraries (Kenney CC0, `public/sfx-lib` synthesized).
