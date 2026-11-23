#!/usr/bin/env bash
# Talk Cutout · step 5: her two layers from the SAME levelled frames, with the same colour matrix and tags (BT.601,
# smpte170m), so the cut-out decodes to exactly the colours of the picture under it (mixed tags = her body changes
# colour when the cut-out appears):
#   talk.mp4      H.264 crf 14, every frame (the picture)
#   talk_fg.webm  VP9 with alpha, CONSTANT QUALITY (-crf 18 -b:v 0). With a bitrate target (-b:v 8M) the encoder dropped
#                 the alpha of the first frames after an empty alpha (they decoded fully opaque) and even a frame.
# FIRST_LIT: the source opens on black frames → frames 0 … FIRST_LIT−1 become copies of the first lit frame (picture
# AND alpha), so the alpha stream never starts on a jump. Then run qc-alpha.py on the webm.
#   bash encode-layers.sh <levelDir (g_*.jpg)> <alphaDir (fa_*.png)> <outDir (public/vNN)> [fps=30] [FIRST_LIT=0]
set -euo pipefail
G=$1; A=$2; O=$3; FPS=${4:-30}; FIRST=${5:-0}
mkdir -p "$O"
if [ "$FIRST" -gt 0 ]; then
  for i in $(seq 0 $((FIRST - 1))); do
    cp -f "$G/g_$(printf %05d "$FIRST").jpg" "$G/g_$(printf %05d "$i").jpg"
    cp -f "$A/fa_$(printf %05d "$FIRST").png" "$A/fa_$(printf %05d "$i").png"
  done
fi
TAGS="-colorspace smpte170m -color_primaries smpte170m -color_trc smpte170m -color_range tv"
ffmpeg -v error -y -framerate "$FPS" -start_number 0 -i "$G/g_%05d.jpg" -vf "scale=out_color_matrix=bt601:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 14 -g "$FPS" $TAGS "$O/talk.mp4"
ffmpeg -v error -y -framerate "$FPS" -start_number 0 -i "$G/g_%05d.jpg" -framerate "$FPS" -start_number 0 -i "$A/fa_%05d.png" \
  -filter_complex "[0:v]scale=out_color_matrix=bt601:out_range=tv,format=yuv420p[c];[1:v]format=gray[a];[c][a]alphamerge,format=yuva420p[v]" -map "[v]" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 18 -b:v 0 -deadline good -cpu-used 4 -row-mt 1 -auto-alt-ref 0 $TAGS "$O/talk_fg.webm"
ls -la "$O/talk.mp4" "$O/talk_fg.webm"
