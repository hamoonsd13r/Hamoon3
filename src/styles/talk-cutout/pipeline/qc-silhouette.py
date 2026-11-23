# Talk Cutout · where things can go (measure BEFORE you place cards): per take, her head top (min / p10 / median) and,
# for each 100 px band of rows, the left-most and right-most x of her silhouette. The free places are then:
#   the band above her head (y 226 → head top − 14), the wall beside her face (x outside her extent at y 300–700),
#   the space her raised hand has just left (check the take's frames every 0.1 s). Frame px BEFORE her punch-in:
#   when the camera pushes in (×1.03…1.05 about her face) her head top rises on screen — keep the pushes ≤ 1.035
#   while something sits in the band above her head.
# A matte that takes in the sofa or a raised hand's sleeve is wrong there: nothing goes below such a line.
#   python -I qc-silhouette.py <dir of m_*.png or fa_*.png> --takes takes.json [--prefix m_] [--step 3]
import argparse, json, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("dir")
ap.add_argument("--takes", required=True)
ap.add_argument("--prefix", default="m_")
ap.add_argument("--step", type=int, default=3)
A = ap.parse_args()
TK = json.load(open(A.takes))
for k, (a, b) in TK["takes"].items():
    tops, L, R = [], {}, {}
    for i in range(a, b + 1, A.step):
        p = os.path.join(A.dir, f"{A.prefix}{i:05d}.png")
        if not os.path.exists(p):
            continue
        m = np.asarray(Image.open(p).convert("L"), dtype=np.float32) / 255 > 0.5
        rows = np.where(m.sum(1) > 6)[0]
        if not len(rows):
            continue
        tops.append(rows.min())
        for y in range(200, m.shape[0] - 100, 100):
            cols = np.where(m[y:y + 100].any(0))[0]
            if len(cols):
                L.setdefault(y, []).append(cols.min())
                R.setdefault(y, []).append(cols.max())
    if not tops:
        print(f"take {k}: no matte frames")
        continue
    print(f"take {k} (frames {a}-{b}): head top min {min(tops)} | p10 {int(np.percentile(tops, 10))} | median {int(np.median(tops))}")
    print("   rows: her x extent  " + "  ".join(f"{y}:{min(L[y])}-{max(R[y])}" for y in sorted(L)))
