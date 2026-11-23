# Toon3D pipeline — the commands in order

Run everything from the **project root** (the folder with `package.json`). A film = code in `src/<id>/` + a working
folder `videos/<id>/` (`dlg/`, `music/`, `audio/`, `plan/`, `look/`, `qa/`, `render/`, `final/`). Examples use `v07`.
Remotion temp files go to `out/_tmp` (delete it after a film); the render bundle is `out/toon3d-bundle`.

## 0. Reference (only for a remake of a reference short)
```bash
node tools/ref-study.mjs <ref.mp4> videos/v07/ref/study      # cuts, shot lengths, sound hits, per-shot stills, SPEC.md
node tools/ref-motion.mjs <ref.mp4> videos/v07/ref/motion.json 1080 1920   # camera move per frame (pan / zoom)
```
Write numbers, not adjectives, into SPEC.md (length, framing, move in %/frame, what happens on which word). Take the
lessons only: never copy the reference's characters, story, palette or lines; its frames are private study material.

## 1. Start the film
```bash
node src/styles/toon3d/pipeline/new-video.mjs v07            # examples/v07 (the demo, imports re-pointed) + videos/v07
```
Add the printed line to `src/Root.tsx` (`<V07Comps />` registers `V07` and `V07-Look`). Delete the demo's shots you do
not need; keep its helpers.

## 2. Script -> voice -> word timing
```bash
# videos/v07/dlg/script.txt: one sentence per line, "[delivery tags] text | pause after"
node src/styles/toon3d/pipeline/mk-lines.mjs v07 --voice <voiceId>      # -> dlg/lines.json + voices.json
node --env-file=.env tools/doc-voices.mjs videos/v07/dlg                # 4 takes per line + STT check (vo/verify.json)
node src/styles/toon3d/pipeline/expr.cjs videos/v07/dlg                 # liveliest clean take per line -> picks.json
node src/styles/toon3d/pipeline/apply-picks.mjs v07                     # picks -> lines.json "take"
node tools/doc-build-vo.mjs videos/v07/dlg videos/v07/vo.wav examples/v07/vo.json --lead 0.15 --tail 0.6 --tempo 1.1
```
`expr.cjs videos/v07/dlg 03-2,07-1` skips takes you heard wrong. Re-voicing a line moves its shots and cues (all
times are read from `vo.json` words).

## 3. Shots (examples/v07/story.ts) -> plan check -> stills -> framing QA
```bash
node src/styles/toon3d/pipeline/plan.mjs v07 V07 --mids        # seconds, no 3D: shot table, fast moves, still holds,
                                                                # jumps, short captions + one still per shot (mids/sheet.jpg)
node src/styles/toon3d/pipeline/look.mjs v07 V07 hook 0 0.5 1 2 3        # stills at any times (ranges a:b:step)
node src/styles/toon3d/pipeline/qa.mjs v07 V07                 # faces under captions / cut by the edge / hidden / under
                                                                # the phone UI, camera under water: fix = 0 before rendering
```
Every warning of `plan.md` fixed or explained; QA `fix: 0`; check every `check` on `qa/flagged.jpg`.

## 4. Render (silent)
```bash
node src/styles/toon3d/pipeline/render.mjs v07 V07 silent-v1 --concurrency 2      # videos/v07/render/silent-v1.mp4
node src/styles/toon3d/pipeline/sheet.mjs videos/v07/render/silent-v1.mp4 videos/v07/look/full --every 0.5
# fix a few shots without a full re-render:
node src/styles/toon3d/pipeline/render.mjs v07 V07 seg-a --frames=420-515
node src/styles/toon3d/pipeline/splice.mjs videos/v07/render/silent-v1.mp4 videos/v07/render/silent-v2.mp4 videos/v07/render/seg-a.mp4@420
```

## 5. Sound
```bash
# music (optional): node tools/eleven-music-plan.mjs ... -> videos/v07/music/music.mp3 (or a CC0 / licensed track)
node videos/v07/build-audio.cjs                               # stems + mix: voice, music ducked, fx on cues, beds
node src/styles/toon3d/pipeline/margin.mjs v07                # every word >= 10 dB over the bed (p10 >= 10)
node src/styles/toon3d/pipeline/master.mjs v07                # -> audio/mix-14.wav (-14 LUFS, limiter)
```
`build-audio.cjs` reads the picture's clock from `plan/plan.json` (re-run plan.mjs after any shot change).

## 6. Deliver
```bash
node tools/finalize.mjs videos/v07/render/silent-v1.mp4 videos/v07/audio/mix-14.wav videos/v07/final v07-v1 --frames <N> --cover 0.4
node src/styles/toon3d/pipeline/qa-video.mjs videos/v07/final/v07-v1.mp4    # black / white / frozen frames, cuts, silences
node tools/srt.mjs examples/v07/vo.json videos/v07/final/v07-v1.srt              # closed captions for YouTube (optional)
```
Then one fresh critic (Sonnet) with `critic-brief.md`, the sheets every 0.5 s and YOUR shot list and times; check each
claim on the full frame before fixing; fix P1 and P2 only, QA again.

## Files
| file | what |
|---|---|
| `lib.mjs` | paths, bundle, stills, sheets (env: `TOON3D_ENTRY`, `TOON3D_WORK`, `TOON3D_BUNDLE`, `TOON3D_TMP`) |
| `new-video.mjs` | copy the demo into `src/<id>` + make `videos/<id>` |
| `mk-lines.mjs`, `expr.cjs`, `apply-picks.mjs` | script -> lines.json/voices.json; liveliest clean take |
| `plan.mjs`, `look.mjs`, `qa.mjs` | plan check (no 3D), stills + sheet, framing QA |
| `render.mjs`, `splice.mjs`, `sheet.mjs`, `qa-video.mjs` | silent render, frame-exact segment replace, contact sheets, signal QA |
| `mixer.cjs`, `plancues.cjs`, `build-audio.cjs` | float mixer (place, loop, roar, hiss, musicEdit, duck, duckWords), the picture's cues + auto whooshes, the demo's sound script (template) |
| `margin.mjs`, `master.mjs` | voice-over-bed per word; -14 LUFS master for `tools/finalize.mjs` |
| `direction.md`, `critic-brief.md` | the film sheet template; the critic's brief |
