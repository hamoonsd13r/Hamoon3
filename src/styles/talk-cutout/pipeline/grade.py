# Talk Cutout · step 3a: a NATURAL grade for her footage (the accepted taste: «the background stays hers, the light
# looks natural, the face gets almost nothing»). Subject and background are graded through a soft matte with nearly the
# same values — a stronger split would show a seam wherever the matte is unsure (raised hands, sleeves at the frame
# edge). A touch of contrast, the wall a hair calmer so the face reads first, a faint vignette. Writes g_*.jpg (the
# graded frame) and a_*.png (the soft matte used, for level.py).
#   python -I grade.py still <look|all> <frame.jpg> <matte.png> <out_{look}.jpg>   (compare looks on one frame)
#   python -I grade.py clip <look> <framesDir> <mattesDir> <outDir> [first last]
# Frames without a matte (she is off screen) are copied as they are.
import glob, os, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage

LOOKS = {
    # as shot: one gentle grade for the whole frame, a faint vignette (the safe default)
    "natural": dict(feather=16, subj=dict(slope=1.01, curve=0.03, sat=1.0), bg=dict(slope=1.0, curve=0.03, sat=1.0, dim=1.0), vig=0.12),
    # the wall a touch calmer and darker so the face reads first (light curtains, busy walls)
    "natural-calm": dict(feather=16, subj=dict(slope=1.01, curve=0.03, sat=1.0), bg=dict(slope=0.985, curve=0.03, sat=0.92, dim=0.985), vig=0.12),
    # a saturated wall (royal blue, violet): calmer still, the skin untouched
    "natural-strong-wall": dict(feather=14, subj=dict(slope=1.012, curve=0.03, sat=1.0), bg=dict(slope=0.985, curve=0.04, sat=0.88, dim=0.975), vig=0.12),
}


def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0


def luma(x):
    return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722


def scurve(x, amt, pivot=0.45):
    if amt == 0:
        return x
    k = 1 + amt * 3
    a = np.clip(x, 1e-4, 1 - 1e-4)
    return np.where(a < pivot, pivot * (a / pivot) ** k, 1 - (1 - pivot) * ((1 - a) / (1 - pivot)) ** k)


def layer(x, g):
    y = np.clip(x * g.get("slope", 1.0), 0, 1)
    y = scurve(y, g.get("curve", 0))
    L = luma(y)[..., None]
    y = L + (y - L) * g.get("sat", 1.0)
    return np.clip(y * g.get("dim", 1.0), 0, 1)


def radial(h, w, cx, cy, rx, ry, power):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - cx) / rx) ** 2 + ((yy / h - cy) / ry) ** 2)
    return np.clip(1 - d, 0, 1) ** power


def render(look, x, m):
    L = LOOKS[look]
    h, w = m.shape
    mt = ndimage.gaussian_filter(np.clip((m - 0.12) / 0.88, 0, 1), 1.2)
    mm = ndimage.gaussian_filter(mt, L["feather"])
    out = layer(x, L["subj"]) * mm[..., None] + layer(x, L["bg"]) * (1 - mm[..., None])
    v = 1 - L["vig"] * (1 - radial(h, w, 0.5, 0.42, 0.95, 0.85, 0.8))
    return np.clip(out * v[..., None], 0, 1), mt


def save(a, p, q=95):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(p, quality=q, subsampling=0)


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "still":
        look, fp, mp, out = sys.argv[2:6]
        x, m = load(fp), np.asarray(Image.open(mp).convert("L"), dtype=np.float32) / 255.0
        for lk in (list(LOOKS) if look == "all" else [look]):
            o, _ = render(lk, x, m)
            save(o, out.replace("{look}", lk))
            print(lk, "->", out.replace("{look}", lk))
    elif mode == "clip":
        look, fd, md, od = sys.argv[2:6]
        first = int(sys.argv[6]) if len(sys.argv) > 6 else 0
        last = int(sys.argv[7]) if len(sys.argv) > 7 else 10 ** 9
        os.makedirs(od, exist_ok=True)
        for f in sorted(glob.glob(os.path.join(fd, "f_*.jpg"))):
            n = int(os.path.basename(f)[2:7])
            if n < first or n > last:
                continue
            g = os.path.join(od, f"g_{n:05d}.jpg")
            if os.path.exists(g):
                continue
            mp = os.path.join(md, f"m_{n:05d}.png")
            if not os.path.exists(mp):
                shutil.copyfile(f, g)  # off screen / no matte: untouched
                continue
            o, mt = render(look, load(f), np.asarray(Image.open(mp).convert("L"), dtype=np.float32) / 255.0)
            save(o, g)
            Image.fromarray((mt * 255 + 0.5).astype(np.uint8)).save(os.path.join(od, f"a_{n:05d}.png"))
            if n % 60 == 0:
                print(look, n, flush=True)
        print("done", flush=True)
