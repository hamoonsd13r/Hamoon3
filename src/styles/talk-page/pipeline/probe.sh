#!/bin/bash
# Talk Page · step 1 — what is this talk video? Streams, size, fps, rotation, HDR or not, length, voice loudness.
# usage: bash src/styles/talk-page/pipeline/probe.sh <talk.mov>
# Phones write several streams (HEVC + metadata + Dolby Vision…): every script here uses only 0:v:0 and 0:a:0.
# color_transfer arib-std-b67 (HLG) or smpte2084 (PQ) = HDR → proxy.sh / final.sh convert to SDR BT.709 themselves.
set -e
SRC="$1"
[ -f "$SRC" ] || { echo "usage: probe.sh <talk.mov>"; exit 1; }
echo "== streams"
ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,pix_fmt,color_transfer,color_primaries,channels,sample_rate -of compact=p=0:nk=0 "$SRC"
echo "== rotation (phones store portrait as landscape + a rotation)"
ffprobe -v error -select_streams v:0 -show_entries stream_side_data=rotation -of csv=p=0 "$SRC" || true
echo "== duration"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC"
echo "== voice loudness (first audio track)"
ffmpeg -nostats -i "$SRC" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | head -3
