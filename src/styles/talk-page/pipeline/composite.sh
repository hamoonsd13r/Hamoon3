#!/bin/bash
# Talk Page · the picture: the ORIGINAL talk (its own frame rate, usually 60 fps) + the transparent band at y = OV_Y →
# a silent near-lossless MP4 (CRF 12). Then hand it to the kit's delivery tool with the mix:
#   node tools/finalize.mjs out/v01/silent.mp4 work/mix.wav out/v01 v01 --nomusic work/voice.wav --cover 0.5 --keep-range
# (--keep-range: this picture is already TV-range BT.709 — finalize's full-range BT.601 conversion is for Remotion renders.)
#   · HDR phone footage (HLG / PQ) is tone-mapped to SDR BT.709 (libplacebo bt.2390 when available — the accepted look —
#     else zscale + hable). SDR footage is only scaled to 1080 × 1920 (cover + centre crop if the shape differs).
#   · the frames are tagged BT.709 with setparams (the -color_* flags alone leave the transfer "unknown").
# usage: bash src/styles/talk-page/pipeline/composite.sh <talk.mov> <ov.mov> <OV_Y> <out/v01/silent.mp4>
set -e
SRC="$1"; OV="$2"; OVY="$3"; OUT="$4"
[ -f "$SRC" ] && [ -f "$OV" ] && [ -n "$OVY" ] && [ -n "$OUT" ] || { echo "usage: composite.sh <talk.mov> <ov.mov> <OV_Y> <out/silent.mp4>"; exit 1; }
mkdir -p "$(dirname "$OUT")"
TRC=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$SRC" | tr -d '\r ,')
FIT="scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"
TAG="setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
run() {
  ffmpeg -v error -stats -y -i "$SRC" -i "$OV" -filter_complex "[0:v:0]$1[b];[b][1:v]overlay=0:${OVY}:format=auto,format=yuv420p,${TAG}[v]" \
    -map "[v]" -an -c:v libx264 -preset fast -crf 12 -profile:v high -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart "$OUT"
}
if [ "$TRC" = "arib-std-b67" ] || [ "$TRC" = "smpte2084" ]; then
  echo "HDR source ($TRC) → SDR BT.709"
  run "libplacebo=w=1080:h=1920:downscaler=lanczos:tonemapping=bt.2390:colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv:format=yuv420p" ||
    { echo "libplacebo unavailable (no Vulkan) → zscale"; run "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,$FIT,format=yuv420p"; }
else
  run "$FIT,format=yuv420p"
fi
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -of csv=p=0 "$OUT"
