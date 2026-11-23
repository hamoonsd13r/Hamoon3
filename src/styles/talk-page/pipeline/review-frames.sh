#!/bin/bash
# Talk Page · frames to review a finished edit (yourself, or one fresh critic): sheets of full frames every N s and of
# the lower band every N/2 s, plus full-size stills at the times you name. Every tile is an exact seek to its own
# time and labelled with it (a drawtext pts label after -ss/fps runs 0.3–0.7 s off — don't trust those).
# Judge sizes and positions on the full stills, never on a 300 px tile.
# usage: bash src/styles/talk-page/pipeline/review-frames.sh <final.mp4> <out-dir> [every=3] [OV_Y=1190] [t1 t2 …]
set -e
V="$1"; OUT="$2"; N="${3:-3}"; OVY="${4:-1190}"
[ -f "$V" ] && [ -n "$OUT" ] || { echo "usage: review-frames.sh <final.mp4> <out-dir> [every] [OV_Y] [times…]"; exit 1; }
shift $(( $# < 4 ? $# : 4 ))
mkdir -p "$OUT/tiles"; rm -f "$OUT"/tiles/*.jpg
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V" | tr -d '\r ,')
HB=$((1920 - OVY))
tile() { # $1 time, $2 crop filter or "", $3 out
  ffmpeg -v error -y -ss "$1" -i "$V" -frames:v 1 -vf "${2}scale=${4:-360}:-1,drawtext=text='$1 s':x=8:y=8:fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.6" -q:v 3 "$3" 2>/dev/null
}
i=0; for t in $(seq 0.5 "$N" "$DUR"); do i=$((i + 1)); tile "$t" "" "$OUT/tiles/full_$(printf %03d $i).jpg"; done
ffmpeg -v error -y -i "$OUT/tiles/full_%03d.jpg" -vf "tile=8x4:padding=4" -start_number 1 "$OUT/full-sheet-%02d.jpg" 2>/dev/null
H=$(node -e "console.log(Number('$N')/2)")
i=0; for t in $(seq 0.3 "$H" "$DUR"); do i=$((i + 1)); tile "$t" "crop=1080:$HB:0:$OVY," "$OUT/tiles/band_$(printf %03d $i).jpg" 540; done
ffmpeg -v error -y -i "$OUT/tiles/band_%03d.jpg" -vf "tile=4x6:padding=4" -start_number 1 "$OUT/band-sheet-%02d.jpg" 2>/dev/null
for t in "$@"; do ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -q:v 3 "$OUT/f$t.jpg" 2>/dev/null; done
ls "$OUT"
