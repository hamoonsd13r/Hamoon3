# Talk Cutout · privacy-clean a screenshot / screen-recording frame of YOUR OWN stats before it goes on screen: blur the
# channel name, every avatar, every video title and thumbnail (each one finds the channel in a search); keep the numbers
# sharp; cover the phone's own status bar (clock, VPN, carrier) with a plain bar of the page colour. Pixelate + a strong
# gaussian with feathered edges (a plain blur of large text can stay readable). Then ×2 lanczos + a light unsharp, so
# the camera can push in on it. Label the result on screen as «آمار واقعی کانال خودم» (or «نمونه» for a sample).
#   python -I studio-blur.py <in.png|dir> <boxes.json> <out.png|dir> [--test] [--statusbar 112] [--scale 2]
#   boxes.json: [{"box": [x0, y0, x1, y1], "kind": "rect" | "ellipse"}, …]   (pixels of the input)
#   --test: draw the boxes in red instead (check them on one frame first)
import argparse, glob, json, os
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("inp")
ap.add_argument("boxes")
ap.add_argument("out")
ap.add_argument("--test", action="store_true")
ap.add_argument("--statusbar", type=int, default=0, help="height (px) of the phone status bar to cover")
ap.add_argument("--scale", type=float, default=2.0)
A = ap.parse_args()
BOXES = json.load(open(A.boxes))


def blur(im, box, kind, px=7, sigma=9):
    x0, y0, x1, y1 = box
    reg = im.crop(box)
    w, h = reg.size
    b = reg.resize((max(1, w // px), max(1, h // px)), Image.BILINEAR).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(sigma))
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    (d.ellipse if kind == "ellipse" else lambda r, fill: d.rounded_rectangle(r, radius=12, fill=fill))((1, 1, w - 2, h - 2), fill=255)
    im.paste(b, (x0, y0), m.filter(ImageFilter.GaussianBlur(2.2)))


def clean(src):
    im = Image.open(src).convert("RGB")
    if A.test:
        d = ImageDraw.Draw(im)
        for b in BOXES:
            (d.ellipse if b.get("kind") == "ellipse" else d.rectangle)(b["box"], outline=(255, 0, 0), width=3)
        return im
    for b in BOXES:
        blur(im, tuple(b["box"]), b.get("kind", "rect"))
    if A.statusbar:
        c = im.getpixel((im.width // 2, A.statusbar + 4))
        ImageDraw.Draw(im).rectangle((0, 0, im.width, A.statusbar), fill=c)
    big = im.resize((int(im.width * A.scale), int(im.height * A.scale)), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))


if os.path.isdir(A.inp):
    os.makedirs(A.out, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(A.inp, "*.png")) + sorted(glob.glob(os.path.join(A.inp, "*.jpg")))):
        clean(f).save(os.path.join(A.out, os.path.splitext(os.path.basename(f))[0] + ".png"))
else:
    clean(A.inp).save(A.out)
print("done ->", A.out)
