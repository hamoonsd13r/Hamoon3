#!/bin/bash
# Talk Page · the mix: the talk's own voice + the music bed at ONE fixed gain.
#   voice  — untouched: no compressor, no EQ, no denoise, no dynamic loudnorm. Only an optional STATIC gain (TARGET, e.g.
#            -16 → measured once, applied as one number, ±10 dB at most) and a −1 dBFS safety limiter (phone voices peak
#            near 0 dBFS).
#   music  — the steady bed from tools/music-steady.mjs, ONE fixed gain G (dB), a static presence dip at 2.5 kHz (−4 dB)
#            so words stay clear. No ducking, no sidechain, no automation.
# usage: bash src/styles/talk-page/pipeline/mix.sh <talk.mov> <bed.wav> <work-dir> [G=-20] [TARGET=keep|-16]
# → <work-dir>/mix.wav (voice + music) · voice.wav (voice only, same gain and limiter = the "no music" version for
#   finalize --nomusic) · stem-voice.wav + stem-music.wav (for tools/word-margin.mjs) — then prints their loudness.
# Pick G so every word stays ≥ ~10 dB over the music in the speech band:
#   node tools/word-margin.mjs work/stem-voice.wav work/stem-music.wav work/stt.json
# (G ≈ −18 … −22; the music stem lands near −33 … −37 LUFS under a −15 … −17 LUFS voice). «A bit lower» = ~−2 dB.
set -e
TALK="$1"; MUSIC="$2"; OUT="$3"; G="${4:--20}"; TARGET="${5:-keep}"
[ -f "$TALK" ] && [ -f "$MUSIC" ] && [ -n "$OUT" ] || { echo "usage: mix.sh <talk.mov> <bed.wav> <work-dir> [G] [TARGET]"; exit 1; }
mkdir -p "$OUT"
DUR=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$TALK" | tr -d '\r ,')
VI=$(ffmpeg -nostats -i "$TALK" -map 0:a:0 -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
if [ "$TARGET" = "keep" ]; then VG=0; else VG=$(node -e "console.log(Math.max(-10, Math.min(10, ($TARGET) - ($VI))).toFixed(1))"); fi
echo "voice ${VI} LUFS → static gain ${VG} dB · music gain ${G} dB · ${DUR} s"
LIM="alimiter=limit=0.891:attack=2:release=60:level=disabled"
ffmpeg -v error -y -i "$TALK" -i "$MUSIC" -filter_complex "
[0:a:0]aresample=48000,aformat=channel_layouts=stereo,volume=${VG}dB,asplit=3[v][vo][vs];
[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${DUR},volume=${G}dB,equalizer=f=2500:width_type=o:w=1.4:g=-4,asplit=2[md][ms];
[v][md]amix=inputs=2:normalize=0:duration=first,${LIM}[out];
[vo]${LIM}[voice]" \
  -map "[out]" -c:a pcm_s24le "$OUT/mix.wav" -map "[voice]" -c:a pcm_s24le "$OUT/voice.wav" \
  -map "[vs]" -c:a pcm_s24le "$OUT/stem-voice.wav" -map "[ms]" -c:a pcm_s24le "$OUT/stem-music.wav"
for f in "$OUT/mix.wav" "$OUT/stem-music.wav"; do
  echo "== $f"
  ffmpeg -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | head -3
done
echo "music in the phone band (> 200 Hz) — compare with your last accepted edit:"
ffmpeg -nostats -i "$OUT/stem-music.wav" -af highpass=f=200,ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
