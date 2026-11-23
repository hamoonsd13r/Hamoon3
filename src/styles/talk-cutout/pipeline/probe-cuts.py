# Talk Cutout · step 1: find the takes of the speaker's video. Jump cuts = spikes of the mean frame difference (frames
# downscaled to 108×192); black frames = mean luma < 12 (a black frame between two takes must never show: TalkSrc.skip;
# black frames at the start: TalkSrc.start = the first lit frame). Writes takes.json for level.py, fg-alpha.py and the
# QC tools: {"fps", "frames", "black": [...], "cuts": [...], "takes": {"A": [a, b], "B": …}} (frame numbers).
# Her own light leaks / fades are short takes of their own: give them a name and leave them as graded (level.py --leave).
#   python -I probe-cuts.py <framesDir with f_00000.jpg …> [--fps 30] [--thr 6] [--out takes.json]
import argparse, glob, json, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("frames")
ap.add_argument("--fps", type=float, default=30)
ap.add_argument("--thr", type=float, default=6.0, help="minimum frame difference of a cut (also >= 3 x the median)")
ap.add_argument("--out", default=None)
a = ap.parse_args()

fs = sorted(glob.glob(os.path.join(a.frames, "f_*.jpg")))
if not fs:
    raise SystemExit("no f_*.jpg frames in " + a.frames)
prev, diffs, black = None, [], []
for i, f in enumerate(fs):
    x = np.asarray(Image.open(f).convert("L").resize((108, 192), Image.BILINEAR), dtype=np.float32)
    if x.mean() < 12:
        black.append(i)
    if prev is not None:
        diffs.append((i, float(np.abs(x - prev).mean())))
    prev = x
v = np.array([d for _, d in diffs])
med = float(np.median(v))
cuts = [i for i, d in diffs if d > max(a.thr, med * 3)]
# takes: lit stretches between cuts and black frames
bounds = sorted(set([0] + cuts + [len(fs)]))
takes, k = {}, 0
for s, e in zip(bounds[:-1], bounds[1:]):
    lit = [i for i in range(s, e) if i not in black]
    if len(lit) < 3:
        continue
    name = chr(65 + k) if k < 26 else f"T{k}"
    takes[name] = [lit[0], lit[-1]]
    k += 1
out = {"fps": a.fps, "frames": len(fs), "black": black, "cuts": cuts, "takes": takes}
p = a.out or os.path.join(a.frames, "takes.json")
json.dump(out, open(p, "w"), indent=1)
print(f"{len(fs)} frames | median diff {med:.2f} | {len(cuts)} cuts | {len(black)} black frames -> {p}")
for n, (s, e) in takes.items():
    print(f"  take {n}: frames {s}-{e}  ({s / a.fps:.2f}-{e / a.fps:.2f} s)")
if black:
    print("  black:", black[:12], "..." if len(black) > 12 else "")
