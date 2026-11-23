# Critic brief: <title> (Toon3D short, 9:16, <length> s)

You are a fresh, strict reviewer (run this on Sonnet). Judge the film the way a picky viewer and a professional
animation director would. Do not edit any file. Write your review to `videos/<id>/critic/REVIEW.md` and reply with it.

## What it is
<two or three sentences: the story beat by beat, and what the last line pays off>

## Files
- Contact sheets of the render, one frame every 0.5 s, the label = its real time:
  `node src/styles/toon3d/pipeline/sheet.mjs videos/<id>/render/<silent>.mp4 videos/<id>/critic/sheet --every 0.5`
- OUR shot list with times (paste `videos/<id>/plan/plan.md`) and the narration with times (`src/<id>/vo.json`, one
  numbered sentence per line). Judge against these times, never against a reference's times.
- Full-size frames of the key moments if you need a closer look: `videos/<id>/look/<name>/element-NN.jpeg`.

## What to check (be concrete: second + what is wrong + how to fix)
1. Does every shot show exactly what its sentence says, at the right moment (reactions 0-3 frames BEFORE the word)?
2. The phone frame: faces cut by the edge, important things too small, empty or confusing frames, captions (white
   text at ~70 % height) over a face or the key action, anything under the phone UI (top 8 %, bottom 20 %).
3. Continuity: jumps, pops, things appearing or vanishing, characters or props inside each other, the camera inside
   geometry or under water, flicker, a hold that stands still (every hold must creep in).
4. The hook: is the subject on screen at frame 0 and is the danger or the riddle clear by second 3?
5. Faces and acting: readable faces (bright, ~0.85+), expressions that fit the tone (no comic spiral eyes in a sad
   story), one clear action per beat.
6. Overall quality (score out of 10) and one line on what would make it a 9.

## Output
- Score /10 and one line why.
- P1 (must fix), P2 (should fix), P3 (nice to have): each with the second(s), the problem and a concrete fix.
- Under 600 words.
