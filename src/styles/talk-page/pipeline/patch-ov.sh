#!/bin/bash
# Talk Page · fix a few seconds without re-rendering the whole band: render only frames FROM..TO and splice them into
# the existing ProRes (every ProRes frame is a keyframe, so head and tail are cut with a stream copy). Seconds, not minutes.
# usage: bash src/styles/talk-page/pipeline/patch-ov.sh <CompId> <out/ov.mov> <from> <to> [entry=src/index.ts] [public-dir]
#   frames of the OVERLAY composition (30 fps): t = 41.2 s → frame 1236
# Keeps the old file as <ov>.bak.mov and checks the frame count.
set -e
ID="$1"; OV="$2"; FROM="$3"; TO="$4"; ENTRY="${5:-src/index.ts}"; PUB="$6"
[ -f "$OV" ] && [ -n "$TO" ] || { echo "usage: patch-ov.sh <CompId> <ov.mov> <from> <to> [entry] [public-dir]"; exit 1; }
DIR=$(dirname "$OV"); B=$(basename "$OV" .mov)
TOTAL=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$OV" | tr -dc '0-9')
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$OV" | tr -d '\r ,')
npx remotion render "$ENTRY" "$ID" "$DIR/$B-part.mov" --frames="$FROM-$TO" --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --concurrency=${CONC:-6} --muted --log=error ${PUB:+--public-dir="$PUB"}
LIST="$DIR/$B-list.txt"; : > "$LIST"
if [ "$FROM" -gt 0 ]; then
  ffmpeg -v error -y -i "$OV" -map 0:v:0 -frames:v "$FROM" -c copy "$DIR/$B-head.mov"
  echo "file '$B-head.mov'" >> "$LIST"
fi
echo "file '$B-part.mov'" >> "$LIST"
NEXT=$((TO + 1))
if [ "$NEXT" -lt "$TOTAL" ]; then
  # seek half a frame past the first frame we keep: the input seek lands on that keyframe exactly
  SS=$(node -e "const [n,d]='$FPS'.split('/').map(Number); console.log(((Number('$NEXT') + 0.5) * (d || 1) / n).toFixed(6))")
  ffmpeg -v error -y -ss "$SS" -i "$OV" -map 0:v:0 -c copy "$DIR/$B-tail.mov"
  echo "file '$B-tail.mov'" >> "$LIST"
fi
ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -c copy "$DIR/$B-new.mov"
GOT=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$DIR/$B-new.mov" | tr -dc '0-9')
if [ "$GOT" != "$TOTAL" ]; then echo "frame count $GOT ≠ $TOTAL — kept the old file; check $DIR/$B-new.mov"; exit 1; fi
mv "$OV" "$DIR/$B.bak.mov" && mv "$DIR/$B-new.mov" "$OV"
rm -f "$DIR/$B-head.mov" "$DIR/$B-tail.mov" "$DIR/$B-part.mov" "$LIST"
echo "patched frames $FROM–$TO · $GOT frames · old file: $DIR/$B.bak.mov"
