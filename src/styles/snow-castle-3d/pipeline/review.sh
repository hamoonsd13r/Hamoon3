#!/bin/bash
# Snow Castle 3D · review material from a rendered file: one exact frame every half second, labelled with its true time,
# tiled 4 × 4 per sheet, plus full-size frames at the seconds you name. Read the sheets, then the full frames.
#   bash src/styles/snow-castle-3d/pipeline/review.sh <video.mp4> <outDir> ["1.2 15 30 38"]
# (fps=2 on a whole file samples late and mislabels; every frame here is seeked to its own time.)
set -e
V="$1"; O="$2"; FULL="$3"
[ -f "$V" ] && [ -n "$O" ] || { echo "usage: review.sh <video.mp4> <outDir> [\"t1 t2 …\"]"; exit 1; }
mkdir -p "$O/f" "$O/full"
FONT=""; [ -f public/fonts/ChakraPetch-Medium.ttf ] && FONT="public/fonts/ChakraPetch-Medium.ttf"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
END=$(node -e "console.log(Math.floor(($DUR - 0.05) * 2) / 2)")
i=0
for t in $(seq 0 0.5 "$END"); do
  n=$(printf "%03d" $i)
  LBL=""; [ -n "$FONT" ] && LBL=",drawtext=fontfile=$FONT:text='$t':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=3"
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf "scale=480:-2$LBL,format=yuvj420p" -q:v 3 "$O/f/$n.jpg"
  i=$((i+1))
done
k=0
for s in $(seq 0 16 $((i-1))); do
  ffmpeg -v error -y -start_number $s -i "$O/f/%03d.jpg" -frames:v 1 -vf "tile=4x4:padding=3:color=0x202020" -q:v 3 "$O/sheet$k.jpg" 2>/dev/null || true
  k=$((k+1))
done
for t in $FULL; do ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -q:v 2 "$O/full/t$t.jpg"; done
ls "$O"
