# Talk Cutout · step 2: a person matte for every frame where she is on screen (rembg, model isnet-general-use, local,
# CPU). Split the work over 2 processes (worker 0 and 1) — two run well side by side on one machine.
# Needs: pip install rembg onnxruntime pillow numpy scipy  (the model downloads once to ~/.u2net, or set U2NET_HOME)
#   python -I matte.py <framesDir> <mattesDir> [worker=0] [workers=1] [ranges=a-b,c-d]   → m_00000.png (0–255)
#   (ranges: only the frames where she is on screen; the full-screen sections need no matte)
import glob, os, sys, time
from PIL import Image
from rembg import new_session, remove

src, out = sys.argv[1], sys.argv[2]
wk = int(sys.argv[3]) if len(sys.argv) > 3 else 0
nw = int(sys.argv[4]) if len(sys.argv) > 4 else 1
rng = [tuple(int(v) for v in r.split("-")) for r in sys.argv[5].split(",")] if len(sys.argv) > 5 else None
os.makedirs(out, exist_ok=True)
sess = new_session("isnet-general-use")
files = [f for f in sorted(glob.glob(os.path.join(src, "f_*.jpg"))) if rng is None or any(a <= int(os.path.basename(f)[2:7]) <= b for a, b in rng)][wk::nw]
t0 = time.time()
for i, f in enumerate(files):
    o = os.path.join(out, "m_" + os.path.splitext(os.path.basename(f))[0][2:] + ".png")
    if os.path.exists(o):
        continue  # resumable
    m = remove(Image.open(f).convert("RGB"), session=sess, only_mask=True, post_process_mask=False)
    m.save(o)
    if i % 25 == 0:
        print(f"w{wk} {i + 1}/{len(files)} {time.time() - t0:.1f}s", flush=True)
print("done", wk, len(files), f"{time.time() - t0:.1f}s", flush=True)
