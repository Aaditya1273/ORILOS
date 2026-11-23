#!/usr/bin/env bash
# Refresh the landing-page clip reel from finished ORILOS clips (CC-licensed sources only).
#   scripts/reel.sh "Credit one|Credit two" clip1.mp4 clip2.mp4 …
# Cuts 6-second, muted, 360x640 loops (at 0 s, 9 s and 18 s while the clip is long enough) into public/reel/ and writes reel.json.
set -euo pipefail
credits="$1"; shift
out="$(dirname "$0")/../public/reel"
rm -rf "$out" && mkdir -p "$out"
n=0; items=()
for src in "$@"; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  for at in 0 9 18; do
    awk "BEGIN{exit !($at + 6 <= $dur)}" || continue
    n=$((n + 1)); f=$(printf 'r%02d' "$n")
    ffmpeg -loglevel error -y -ss "$at" -t 6 -i "$src" -an -vf "scale=360:640,fps=30" \
      -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart "$out/$f.mp4"
    ffmpeg -loglevel error -y -ss 0.5 -i "$out/$f.mp4" -frames:v 1 -q:v 5 "$out/$f.jpg"
    items+=("{\"src\":\"/reel/$f.mp4\",\"poster\":\"/reel/$f.jpg\"}")
  done
done
python3 - "$credits" "$out/reel.json" "${items[@]}" <<'PY'
import json, sys
credits, path, *items = sys.argv[1:]
json.dump({"credits": credits.split("|"), "clips": [json.loads(i) for i in items]}, open(path, "w"))
PY
du -sh "$out"/*.mp4 | sort -h | tail -3
