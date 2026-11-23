#!/usr/bin/env bash
# Talk Cutout · step 7: her own voice, CLEANED, never edited (no cuts, no tempo, no pitch: film time = source time).
# highpass 75 Hz · light denoise · −2 dB of mud at 240 Hz · +1.8 dB presence at 3.3 kHz · de-ess · a GENTLE compressor
# (ratio 2) · a soft downward expander that keeps the room tail low. NO echo, NO reverb, no heavy compression: a harder
# chain once lifted the room's echo tail by 4.5 dB and the user heard «اکو». Measure the tails after (40–160 ms and
# 160–300 ms after each word end should be lower than in the raw file, never higher).
#   bash voice.sh <raw.wav> <out.wav>
set -euo pipefail
IN=$1; OUT=$2
ffmpeg -v error -y -i "$IN" -af "highpass=f=75,afftdn=nf=-30:nr=6:tn=1,equalizer=f=240:t=q:w=1.1:g=-2,equalizer=f=3300:t=q:w=1.0:g=1.8,deesser=i=0.35:m=0.5:f=0.5:s=o,acompressor=threshold=-23dB:ratio=2:attack=12:release=180:makeup=1.5,agate=mode=downward:range=0.4:threshold=0.012:ratio=2:attack=4:release=140" -ar 48000 -ac 2 "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | head -2
