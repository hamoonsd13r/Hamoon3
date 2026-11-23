#!/bin/bash
# Talk Page · step 2 — a light proxy of the talk for Studio and Look stills (the final composite uses the ORIGINAL).
# Remotion copies the whole public/ folder into TEMP on every render, so never put the 4K original in public/.
# usage: bash src/styles/talk-page/pipeline/proxy.sh <talk.mov> <public/v01/talk-proxy.mp4>
# → 540 × 960, 30 fps, SDR BT.709 (HDR phone footage is tone-mapped), with its sound.
set -e
SRC="$1"; OUT="$2"
[ -f "$SRC" ] && [ -n "$OUT" ] || { echo "usage: proxy.sh <talk.mov> <public/vNN/talk-proxy.mp4>"; exit 1; }
mkdir -p "$(dirname "$OUT")"
TRC=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$SRC" | tr -d '\r ,')
FIT="scale=540:960:force_original_aspect_ratio=increase:flags=lanczos,crop=540:960"
if [ "$TRC" = "arib-std-b67" ] || [ "$TRC" = "smpte2084" ]; then
  echo "HDR ($TRC) → SDR"
  VF="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,$FIT,fps=30,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
else
  VF="$FIT,fps=30,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
fi
ffmpeg -v error -stats -y -i "$SRC" -map 0:v:0 -map 0:a:0? -vf "$VF" -c:v libx264 -preset fast -crf 26 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 96k -movflags +faststart "$OUT"
ls -la "$OUT"
