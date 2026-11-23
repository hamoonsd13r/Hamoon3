#!/bin/bash
# Speech Cleanup · step 1c (only when the class has a screen recording) — how busy the screen is, 5 times a second (mean
# luma change between frames, signalstats YAVG). build-cuts KEEPS a pause while the screen is busy (a video plays, the
# page scrolls: the viewer is watching) and keeps the last second of long silent screen work, so the result is seen.
# usage: bash src/styles/speech-cleanup/pipeline/screen-activity.sh <screen.mp4> <dir/screen-activity.txt>
set -e
SRC="$1"; OUT="$2"
[ -f "$SRC" ] && [ -n "$OUT" ] || { echo "usage: screen-activity.sh <screen.mp4> <dir/screen-activity.txt>"; exit 1; }
ABS=$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")
mkdir -p "$(dirname "$OUT")"
cd "$(dirname "$OUT")"
# the metadata file is written relative to its folder (a drive letter would need escaping inside the filter)
ffmpeg -v error -i "$ABS" -map 0:v:0 -vf "fps=5,scale=320:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$(basename "$OUT")" -an -f null -
grep -c YAVG "$(basename "$OUT")" | awk '{print $1 " samples (5 per second) →"}'
pwd
