# Talk Cutout · step 3 check: flicker of the cut-out's alpha AT FULL FRAME RATE (a contact sheet never shows it).
# Counts single-frame outlier pixels (a pixel that differs from both neighbours while the neighbours agree) inside each
# window where something sits behind her, never across a take cut; writes a heat map per window (where it flickers).
# A good alpha: a few thousand outlier pixels per window at most, none on her sleeves/hair edge in the heat map.
# (A raw isnet matte: ~200k. The steady alpha of fg-alpha.py with a wall rule: ~5k.)
#   python -I qc-flicker.py <alphaDir (fa_*.png)> --takes takes.json [--win a-b,c-d (frames)] [--prefix fa_] [--heat outDir]
import argparse, json, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("alpha")
ap.add_argument("--takes", required=True)
ap.add_argument("--win", default="", help="frame windows to check (default: every take)")
ap.add_argument("--prefix", default="fa_")
ap.add_argument("--heat", default=None)
A = ap.parse_args()
TK = json.load(open(A.takes))
fps = TK.get("fps", 30)
cuts = set()
for a, b in TK["takes"].values():
    cuts.add(a)
    cuts.add(b + 1)
wins = [tuple(int(v) for v in w.split("-")) for w in A.win.split(",") if w] or [tuple(v) for v in TK["takes"].values()]
M = lambda i: np.asarray(Image.open(os.path.join(A.alpha, f"{A.prefix}{i:05d}.png")).convert("L")) > 127
for a, b in wins:
    tot, worst, heat = 0, [], None
    for n in range(a + 1, b):
        if n in cuts or (n + 1) in cuts:
            continue
        p, c, q = M(n - 1), M(n), M(n + 1)
        o = (c != p) & (c != q) & (p == q)
        heat = o.astype(np.int32) if heat is None else heat + o
        k = int(o.sum())
        tot += k
        worst.append((k, n))
    worst.sort(reverse=True)
    print(f"{a / fps:6.2f}-{b / fps:6.2f} s  outlier px {tot:8d}   worst " + ", ".join(f"f{n}:{k}" for k, n in worst[:5]))
    if A.heat and heat is not None:
        os.makedirs(A.heat, exist_ok=True)
        h = (np.clip(heat / max(1, heat.max()), 0, 1) * 255).astype(np.uint8)
        Image.fromarray(h).resize((h.shape[1] // 4, h.shape[0] // 4)).save(os.path.join(A.heat, f"heat_{a}.png"))
