#!/bin/bash
# NFP-Alvana: copy ALL of this text into the "Setup script" box
# of your cloud environment (claude.ai/code > cloud icon > gear
# next to the environment > Setup script). It installs the video
# tools once and the result is cached, so sessions start fast.
# Safe to re-run; it never stops a session.
# Every line is short (no line wraps when copied from the PDF).
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null 2>&1
P="ffmpeg unzip libnss3 libdbus-1-3 libatk1.0-0 libasound2t64"
P="$P libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1"
P="$P libxdamage1 libgbm1 libcups2 libcairo2 libpango-1.0-0"
P="$P libatk-bridge2.0-0 fonts-noto-color-emoji fonts-noto-core"
P="$P fonts-dejavu-core"
apt-get install -y -qq --no-install-recommends $P >/dev/null 2>&1 || true
# Chrome Headless Shell for Remotion (the version 4.0.528 is tested with)
V=149.0.7790.0
D=/opt/nfp
Z=chrome-headless-shell-linux64
U=https://storage.googleapis.com/chrome-for-testing-public/$V/linux64
if [ ! -x $D/$Z/chrome-headless-shell ]; then
  mkdir -p $D &&
    curl -fsSL -o /tmp/chs.zip "$U/$Z.zip" &&
    unzip -q -o /tmp/chs.zip -d $D &&
    echo "$V" > $D/chrome-version || true
  rm -f /tmp/chs.zip
fi
# Remotion's official skill for Claude (correct Remotion code), optional
S="remotion-dev/skills --skill remotion-best-practices"
npx -y skills add $S -g -a claude-code -y --copy >/dev/null 2>&1 || true
exit 0
