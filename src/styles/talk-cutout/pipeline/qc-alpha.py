# Talk Cutout · step 5 check: decode the cut-out's alpha back out of talk_fg.webm and compare it frame by frame with the
# masks it was made from. Catches the two encoder bugs seen in practice: frames whose alpha decoded fully OPAQUE (the
# cut-out then covers everything behind her as a rectangle) and a DROPPED frame (the cut-out runs a frame ahead of her
# picture). Needs ffmpeg built with libvpx (the VP9 decoder that keeps alpha).
#   python -I qc-alpha.py <talk_fg.webm> <alphaDir (fa_*.png)> [--w 1080 --h 1920]
import argparse, glob, os, subprocess
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("webm")
ap.add_argument("alpha")
ap.add_argument("--w", type=int, default=1080)
ap.add_argument("--h", type=int, default=1920)
A = ap.parse_args()
masks = sorted(glob.glob(os.path.join(A.alpha, "fa_*.png")))
sw, sh = A.w // 4, A.h // 4  # compare at quarter size (fast, enough to see an opaque frame or a shift)
raw = subprocess.run(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", A.webm, "-vf", f"alphaextract,scale={sw}:{sh}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
n = len(raw) // (sw * sh)
dec = np.frombuffer(raw[: n * sw * sh], np.uint8).reshape(n, sh, sw).astype(np.float32)
print(f"decoded {n} alpha frames | {len(masks)} masks" + ("" if n == len(masks) else "   X COUNT DIFFERS: a frame was dropped or added"))
M = lambda i: np.asarray(Image.open(masks[i]).convert("L").resize((sw, sh), Image.BILINEAR), dtype=np.float32)
bad = 0
for i in range(min(n, len(masks))):
    m = M(i)
    d = float(np.abs(dec[i] - m).mean())
    opaque = dec[i].mean() > 250 and m.mean() < 200
    shifted = False
    if d > 6 and i + 1 < len(masks):
        shifted = float(np.abs(dec[i] - M(i + 1)).mean()) < d * 0.5
    if opaque or shifted or d > 12:
        bad += 1
        print(f"  frame {i}: mean |d| {d:.1f}" + ("  OPAQUE" if opaque else "") + ("  SHIFTED (matches the next mask)" if shifted else ""))
print("OK alpha matches its masks" if bad == 0 and n == len(masks) else f"X {bad} bad frames - re-encode (encode-layers.sh uses -crf 18 -b:v 0; copy the first lit frame over leading black frames)")
