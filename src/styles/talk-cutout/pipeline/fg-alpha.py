# Talk Cutout · step 3: a STEADY, SOLID alpha for her cut-out (talk_fg.webm). The raw isnet matte gives sleeves and
# hair 0.2–0.5 and that value jumps from frame to frame: anything behind her then «blinks» through her clothes (the
# user saw it: «پر پر میکنه»). Here:
#   core = matte > 0.6 · body = matte > 0.38, opened (thin lines go) · only components touching the core are kept ·
#   holes smaller than --holes px filled · (mode wall) she is also «everything that is NOT the wall colour»
#   (e.g. a violet wall: b − g ≥ 0.17; measure a wall patch and a sleeve patch on one still first) — this recovers sleeves isnet misses ·
#   (--band y0-y1) inside a fixed band (a sofa/bench edge) a column is hers only if she is just above AND below it ·
#   pass 2: a 3-frame temporal median INSIDE each take (never across a cut), then a 1.1 px feather.
# Then CHECK it at full frame rate (qc-flicker.py) — a contact sheet never shows flicker.
#   python -I fg-alpha.py <mattesDir> <outDir> --takes takes.json [--frames framesDir --wall b-g:0.12:0.22]
#                         [--band 1760-1840] [--holes 40000] [--workers 12]
#   → <outDir>/hard/h_*.png (pass 1) and <outDir>/fa_*.png (the alpha to encode)
import argparse, json, os
from multiprocessing import Pool
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("mattes")
ap.add_argument("out")
ap.add_argument("--takes", required=True)
ap.add_argument("--frames", default=None, help="the frames (f_*.jpg), needed for --wall")
ap.add_argument("--wall", default=None, help="ch:lo:hi - wall = smoothstep(lo, hi, ch); ch = b-g | r-g | g-r | b-r | sat")
ap.add_argument("--band", default=None, help="y0-y1: a fixed band of furniture behind her")
ap.add_argument("--holes", type=int, default=40000)
ap.add_argument("--workers", type=int, default=12)
A = ap.parse_args()
TK = json.load(open(A.takes))
TAKES = TK["takes"]
N = TK["frames"]
HARD = os.path.join(A.out, "hard")
_first = next((f for f in sorted(os.listdir(A.mattes)) if f.startswith("m_")), None)
SHAPE = Image.open(os.path.join(A.mattes, _first)).size[::-1] if _first else (1920, 1080)


def take_of(i):
    for k, (a, b) in TAKES.items():
        if a <= i <= b:
            return k
    return f"x{i}"


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def channel(x, ch):
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    return {"b-g": b - g, "r-g": r - g, "g-r": g - r, "b-r": b - r, "sat": x.max(-1) - x.min(-1)}[ch]


def hard(i):
    o = f"{HARD}/h_{i:05d}.png"
    if os.path.exists(o):
        return i
    p = f"{A.mattes}/m_{i:05d}.png"
    if not os.path.exists(p):
        Image.fromarray(np.zeros((1, 1), np.uint8)).save(o)  # off screen: an empty marker (resized at pass 2)
        return i
    m = np.asarray(Image.open(p).convert("L"), dtype=np.float32) / 255.0
    core = m > 0.6
    body = ndimage.binary_opening(m > 0.38, iterations=2)
    if A.wall:
        ch, lo, hi = A.wall.split(":")
        x = np.asarray(Image.open(f"{A.frames}/f_{i:05d}.jpg").convert("RGB"), dtype=np.float32) / 255.0
        her = smooth(float(lo), float(hi), channel(x, ch)) < 0.5
        if A.band:
            y0, y1 = (int(v) for v in A.band.split("-"))
            ya, yb = max(0, y0 - 3), min(her.shape[0] - 1, y1 + 3)
            her[y0:y1 + 1] = (her[ya] & her[yb])[None, :]
        her = ndimage.binary_opening(her, iterations=2)
        body = body | her
    lab, _ = ndimage.label(body | core)
    keep = np.unique(lab[core])
    body = np.isin(lab, keep[keep > 0])
    holes = ndimage.binary_fill_holes(body) & ~body
    hl, hn = ndimage.label(holes)
    if hn:
        sizes = ndimage.sum(holes, hl, range(1, hn + 1))
        body |= np.isin(hl, np.where(sizes < A.holes)[0] + 1)
    Image.fromarray(body.astype(np.uint8) * 255).save(o)
    return i


def soft(i):
    o = f"{A.out}/fa_{i:05d}.png"
    if os.path.exists(o):
        return i
    if not os.path.exists(f"{A.mattes}/m_{i:05d}.png"):
        Image.fromarray(np.zeros(SHAPE, np.uint8)).save(o)  # off screen: fully transparent
        return i
    ids = [j for j in (i - 1, i, i + 1) if 0 <= j < N and take_of(j) == take_of(i) and os.path.exists(f"{A.mattes}/m_{j:05d}.png")]
    st = np.stack([np.asarray(Image.open(f"{HARD}/h_{j:05d}.png").convert("L")) > 127 for j in ids])
    a = (st.sum(0) * 2 > len(ids)) if len(ids) == 3 else st[ids.index(i)]
    a = ndimage.gaussian_filter(a.astype(np.float32), 1.1)
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(o)
    return i


if __name__ == "__main__":
    os.makedirs(HARD, exist_ok=True)
    with Pool(A.workers) as p:
        list(p.imap_unordered(hard, range(N), chunksize=8))
        print("pass 1 done", flush=True)
        list(p.imap_unordered(soft, range(N), chunksize=8))
    print("done", N, "->", A.out)
