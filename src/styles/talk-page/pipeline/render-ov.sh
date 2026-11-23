#!/bin/bash
# Talk Page · render the paper band (only y ≥ OV_Y, transparent) → ProRes 4444 with alpha.
# Run from the project root. 30 fps is enough: ffmpeg holds each overlay frame for two frames of a 60 fps talk.
# usage: bash src/styles/talk-page/pipeline/render-ov.sh <CompId> <out/ov.mov> [entry=src/index.ts] [public-dir]
#   e.g. bash src/styles/talk-page/pipeline/render-ov.sh V01-Overlay out/v01/ov.mov
# ~0.1 s per frame on a laptop CPU (a 90 s talk ≈ 5 min with CONC=6); no GPU needed. A 90 s band is ~1 GB (ProRes).
# Set TEMP/TMP to a drive with space: Remotion copies public/ there on every render.
set -e
ID="$1"; OUT="$2"; ENTRY="${3:-src/index.ts}"; PUB="$4"
[ -n "$ID" ] && [ -n "$OUT" ] || { echo "usage: render-ov.sh <CompId> <out.mov> [entry] [public-dir]"; exit 1; }
mkdir -p "$(dirname "$OUT")"
npx remotion render "$ENTRY" "$ID" "$OUT" --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --concurrency=${CONC:-6} --muted --log=error ${PUB:+--public-dir="$PUB"}
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,nb_frames,r_frame_rate -of csv=p=0 "$OUT"
ls -la "$OUT"
