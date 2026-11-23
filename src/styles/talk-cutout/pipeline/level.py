# Talk Cutout · step 4: steady light across her takes AND inside each take (phones re-expose constantly; the accepted
# rule: «نور بین برداشت‌ها ثابت بماند»). Per frame: the wall's luminance (rows y0–y1, weighted by 1 − alpha) is held at
# its median over all takes (full strength) and her skin (a face box per take, inside the matte, a skin rule) at its
# median at 75 % strength (so head turns still read); both smoothed inside the take (never across a cut), with each
# take's white-balance ratio (clamped ±4 %). Subject and background get their own gain through the softened matte.
# Frames of her own light leak or fade: --leave (as graded) or --hold (take the gains of a reference frame of the same
# take: without it, a fade to black gets brightened ×1.14).
#   python -I level.py <gradedDir (g_*.jpg + a_*.png)> <outDir> --takes takes.json [--face face.json] [--rows 80-900]
#                      [--leave 69-77,…] [--hold 1296-1348:1295,…] [--workers 12]
#   face.json: {"A": [y0, y1, x0, x1], "*": [y0, y1, x0, x1]}  (frame px; measure it on a still of each take)
import argparse, json, os, shutil
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("graded")
ap.add_argument("out")
ap.add_argument("--takes", required=True)
ap.add_argument("--face", default=None)
ap.add_argument("--rows", default="80-900", help="the wall rows to measure (above her shoulders mostly)")
ap.add_argument("--leave", default="", help="frame ranges left as graded (her own light leak)")
ap.add_argument("--hold", default="", help="a-b:ref - frames a..b take the gains of frame ref (her fade to black)")
ap.add_argument("--workers", type=int, default=12)
A = ap.parse_args()

TK = json.load(open(A.takes))
TAKES = {k: tuple(v) for k, v in TK["takes"].items()}
N = TK["frames"]
FACE = json.load(open(A.face)) if A.face else {}
Y0, Y1 = (int(v) for v in A.rows.split("-"))
rng = lambda s: [tuple(int(v) for v in r.split("-")) for r in s.split(",") if r]
LEAVE = rng(A.leave)
HOLD = [(tuple(int(v) for v in r.split(":")[0].split("-")), int(r.split(":")[1])) for r in A.hold.split(",") if r]


def take_of(i):
    for k, (a, b) in TAKES.items():
        if a <= i <= b and not any(x <= i <= y for x, y in LEAVE):
            return k
    return None


def ref_frame(i):
    for (a, b), r in HOLD:
        if a <= i <= b:
            return r
    return i if take_of(i) else None


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def measure(i):
    g = np.asarray(Image.open(f"{A.graded}/g_{i:05d}.jpg").convert("RGB"), dtype=np.float32)
    a = np.asarray(Image.open(f"{A.graded}/a_{i:05d}.png").convert("L"), dtype=np.float32) / 255.0
    w = (1 - a[Y0:Y1]) ** 2
    wall = (g[Y0:Y1] * w[..., None]).sum((0, 1)) / max(1.0, w.sum())
    y0, y1, x0, x1 = FACE.get(take_of(i), FACE.get("*", [g.shape[0] // 5, g.shape[0] * 2 // 5, g.shape[1] // 3, g.shape[1] * 2 // 3]))
    box, ab = g[y0:y1, x0:x1], a[y0:y1, x0:x1]
    r, gg, b = box[..., 0], box[..., 1], box[..., 2]
    L = lum(box)
    m = (ab > 0.9) & (r > 95) & (gg > 40) & (b > 20) & (r > gg) & (gg > b) & ((r - gg) > 12) & ((box.max(-1) - box.min(-1)) > 15) & (L > 80) & (L < 245)
    sk = box[m]
    if len(sk) > 500:
        Ls = lum(sk)
        lo, hi = np.percentile(Ls, 25), np.percentile(Ls, 75)
        s = sk[(Ls >= lo) & (Ls <= hi)].mean(0)
    else:
        s = np.array([np.nan] * 3)
    return [float(v) for v in wall] + [float(v) for v in s] + [int(m.sum())]


def apply(job):
    i, gs, gb = job
    src = f"{A.graded}/g_{i:05d}.jpg"
    if gs is None or not os.path.exists(f"{A.graded}/a_{i:05d}.png"):
        shutil.copyfile(src, f"{A.out}/g_{i:05d}.jpg")
        return i
    x = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32)
    al = np.asarray(Image.open(f"{A.graded}/a_{i:05d}.png").convert("L").filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)[..., None] / 255.0
    k = al * np.array(gs, np.float32) + (1 - al) * np.array(gb, np.float32)
    Image.fromarray(np.clip(x * k + 0.5, 0, 255).astype(np.uint8)).save(f"{A.out}/g_{i:05d}.jpg", quality=95, subsampling=0)
    return i


if __name__ == "__main__":
    os.makedirs(A.out, exist_ok=True)
    lit = [i for i in range(N) if take_of(i) and os.path.exists(f"{A.graded}/a_{i:05d}.png")]
    with Pool(A.workers) as p:
        st = dict(zip(lit, p.map(measure, lit, chunksize=8)))
    wall = {i: np.array(st[i][0:3]) for i in lit}
    skin = {i: (np.array(st[i][3:6]) if st[i][6] >= 2000 else np.array([np.nan] * 3)) for i in lit}
    wL = {i: float(lum(wall[i])) for i in lit}
    sL = {i: float(lum(skin[i])) for i in lit}
    tW = float(np.nanmedian([wL[i] for i in lit]))
    tS = float(np.nanmedian([sL[i] for i in lit]))
    tWc = np.nanmedian([wall[i] / wL[i] for i in lit], 0)
    tSc = np.nanmedian([skin[i] / sL[i] for i in lit if not np.isnan(sL[i])], 0)

    def sm(d, i, r):
        v = [d[j] for j in range(i - r, i + r + 1) if j in d and take_of(j) == take_of(i) and not np.isnan(d[j])]
        return float(np.mean(v)) if v else np.nan

    swL = {i: sm(wL, i, 10) for i in lit}
    ssL = {i: sm(sL, i, 12) for i in lit}
    chb, chs = {}, {}
    for k in TAKES:
        fr = [i for i in lit if take_of(i) == k]
        if not fr:
            continue
        m = np.nanmean([ssL[i] for i in fr]) if any(not np.isnan(ssL[i]) for i in fr) else tS
        for i in fr:
            if np.isnan(ssL[i]):
                ssL[i] = m
        cw = np.nanmedian([wall[i] / wL[i] for i in fr], 0)
        ok = [i for i in fr if not np.isnan(sL[i])]
        cs = np.nanmedian([skin[i] / sL[i] for i in ok], 0) if len(ok) > 10 else tSc
        chb[k] = np.clip(tWc / cw, 0.96, 1.04)
        chs[k] = np.clip(tSc / cs, 0.96, 1.04)
        print(f"take {k}: {len(fr)} frames | wall L {np.median([wL[i] for i in fr]):.1f} | skin L {np.nanmedian([sL[i] for i in fr]):.1f}")
    gains = {}
    for i in lit:
        k = take_of(i)
        gb = np.clip(tW / swL[i], 0.88, 1.14) * chb[k]
        gs = np.clip((tS / ssL[i]) ** 0.75, 0.9, 1.12) * chs[k]
        gains[i] = (gs.tolist(), gb.tolist())
    jobs = []
    for i in range(N):
        r = ref_frame(i)
        if not os.path.exists(f"{A.graded}/g_{i:05d}.jpg"):
            continue
        jobs.append((i, *gains[r]) if r in gains else (i, None, None))
    with Pool(A.workers) as p:
        p.map(apply, jobs, chunksize=10)
    print(f"levelled {len(jobs)} frames | targets wall {tW:.1f} skin {tS:.1f}")
