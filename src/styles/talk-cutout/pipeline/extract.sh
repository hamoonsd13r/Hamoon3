#!/usr/bin/env bash
# Talk Cutout · step 0: the speaker's video → frames (f_00000.jpg …) at the film's rate (half a 50/60 fps source: 25/30)
# and her untouched voice (raw.wav). An HDR phone video (HLG/PQ, «iPhone HDR») is tone-mapped to SDR BT.709 first, or
# every frame comes out grey and flat. Her words are never edited: film time = source time.
#   bash extract.sh <video> <workDir> [fps=30]
set -euo pipefail
V=$1; W=$2; FPS=${3:-30}
mkdir -p "$W/frames" "$W/voice"
TRC=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$V" | tr -d ',\r')
VF="fps=$FPS"
if [ "$TRC" = "arib-std-b67" ] || [ "$TRC" = "smpte2084" ]; then
  echo "HDR source ($TRC): tone-mapping to SDR"
  VF="fps=$FPS,zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
fi
# the first video and audio streams only (phone files can carry extra streams)
ffmpeg -v error -y -i "$V" -map 0:v:0 -vf "$VF" -q:v 2 -start_number 0 "$W/frames/f_%05d.jpg"
ffmpeg -v error -y -i "$V" -map 0:a:0 -ac 1 -ar 48000 -c:a pcm_s16le "$W/voice/raw.wav"
echo "$(ls "$W/frames" | wc -l) frames · voice $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/voice/raw.wav") s"
