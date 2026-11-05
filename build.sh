#!/bin/bash
# build.sh <folder-video> : siapkan kit untuk satu video. Folder berisi story.js, audio.py, subs.py, voice.wav
set -e
V="${1:?pakai: ./build.sh examples/penisilin}"
cat web/toonbase.js web/cast.js > web/toon.js
cp "$V/story.js" web/story.js
mkdir -p work frames out
echo "siap. render: node render.mjs frames \"0-N\" 720 1280"
