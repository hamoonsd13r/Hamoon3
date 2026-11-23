#!/usr/bin/env bash
# Talk Cutout · the music's loudness in the PHONE band (above 200 Hz: what a phone speaker actually plays). Compare it
# with the version the user last approved, not with integrated LUFS: a bass-heavy song once measured fine and was
# «اصلاً شنیده نمی‌شه» on a phone (it sat 11 dB lower in this band). Accepted beds sat at about −38 LUFS here (with
# her voice at −21); a song that is busy in the speech band may need to sit lower (check margin.mjs).
#   bash phone-band.sh <music stem.wav> [other.wav …]
for f in "$@"; do
  I=$(ffmpeg -hide_banner -nostats -i "$f" -af "highpass=f=200,highpass=f=200,ebur128" -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
  echo "$f · phone band (>200 Hz): $I LUFS"
done
