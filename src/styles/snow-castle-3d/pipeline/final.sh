#!/bin/bash
# Snow Castle 3D · silent picture + mix → master (BT.709, the way players expect it) and a phone copy under ~28 MB.
#   bash src/styles/snow-castle-3d/pipeline/final.sh <silent.mp4> <mix.wav> <out.mp4> [expected frames]
# 1080p → x264 crf 16; 4K (width ≥ 3000) → crf 18. The phone copy (1080p, two passes) is written next to it as *-phone.mp4.
# Remotion writes full-range BT.601 (yuvj420p): converting to TV-range BT.709 here keeps the grade's colours on every player.
# The picture is checked first: a render that lost frames must never be muxed (it once gave a "final" that was too short).
set -e
SIL="$1"; MIX="$2"; OUT="$3"; WANT="$4"
[ -f "$SIL" ] && [ -f "$MIX" ] && [ -n "$OUT" ] || { echo "usage: final.sh <silent.mp4> <mix.wav> <out.mp4> [expected frames]"; exit 1; }
NF=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$SIL" | tr -dc '0-9')
W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$SIL" | tr -dc '0-9')
if [ -n "$WANT" ] && [ "$NF" != "$WANT" ]; then echo "picture has $NF frames, expected $WANT — not muxing"; exit 1; fi
mkdir -p "$(dirname "$OUT")"
CS="scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p"
TAGS="-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv"
CRF=16; [ "$W" -ge 3000 ] && CRF=18
ffmpeg -v error -y -i "$SIL" -i "$MIX" -map 0:v:0 -map 1:a:0 -vf "$CS" -c:v libx264 -preset slow -crf $CRF -pix_fmt yuv420p $TAGS -c:a aac -b:a 256k -movflags +faststart "$OUT"
# phone: 1080p at a bitrate that lands near 27 MB whatever the length
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SIL")
KB=$(node -e "console.log(Math.max(1500, Math.floor(27*8*1024/($DUR) - 200)))")
PH="${OUT%.mp4}-phone.mp4"
LOG="$(dirname "$OUT")/.phone-pass"
PV="$CS"; [ "$W" -ge 3000 ] && PV="scale=1920:-2,$CS"
ffmpeg -v error -y -i "$SIL" -vf "$PV" -c:v libx264 -preset slow -b:v ${KB}k -pass 1 -passlogfile "$LOG" -an -f null -
ffmpeg -v error -y -i "$SIL" -i "$MIX" -map 0:v:0 -map 1:a:0 -vf "$PV" -c:v libx264 -preset slow -b:v ${KB}k -pass 2 -passlogfile "$LOG" -pix_fmt yuv420p $TAGS -c:a aac -b:a 192k -movflags +faststart "$PH"
rm -f "$LOG"*
for f in "$OUT" "$PH"; do
  ls -la "$f"
  ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,pix_fmt,color_space -of csv=p=0 "$f"
  ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "^ *I:|Peak:" | tail -2
done
