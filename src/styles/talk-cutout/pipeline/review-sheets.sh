#!/usr/bin/env bash
# Talk Cutout · review the RENDERED film (the real test: stills miss per-frame bugs): frame-accurate contact sheets, one
# frame every STEP seconds (the seek is BEFORE -i, so each label is the frame's real film time — a `fps=2` filter
# sheet lands 0.2–0.5 s off its label and on beats), 5×4 per sheet at 270 px wide. For a critic: hand it these sheets
# AND re-check every number it gives on a full-size frame (critics measure from tiny tiles and are often wrong).
#   bash review-sheets.sh <video.mp4> <outDir> [step=0.5]
set -euo pipefail
V=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); O=$2; STEP=${3:-0.5}
FONT=$(cd "$(dirname "$0")/../../../.." && pwd)/public/fonts/ChakraPetch-Medium.ttf
mkdir -p "$O/f"
cd "$O"
cp -f "$FONT" label.ttf
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V" | tr -d ',\r')
i=0
for t in $(awk -v d="$DUR" -v s="$STEP" 'BEGIN { for (x = 0.05; x < d - 0.02; x += s) printf "%.2f\n", x }'); do
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf "scale=270:-2,drawtext=fontfile=label.ttf:text='${t}s':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4,format=yuvj420p" "f/$(printf %03d $i).jpg"
  i=$((i + 1))
done
for s in $(seq 0 $(( (i - 1) / 20 ))); do
  n=$(( i - s * 20 )); [ $n -gt 20 ] && n=20
  ffmpeg -v error -y -start_number $((s * 20)) -i "f/%03d.jpg" -frames:v 1 -vf "tile=5x4:nb_frames=$n:padding=4:color=0x202020" "sheet-$((s + 1)).jpg"
done
rm -f label.ttf
echo "$i frames → $(ls sheet-*.jpg | tr '\n' ' ')"
