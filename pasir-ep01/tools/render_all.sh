#!/usr/bin/env bash
# Full pipeline: video frames (parallel headless Chromium workers) -> audio -> subtitles -> final MP4.
# usage: bash tools/render_all.sh [workers=3]
set -euo pipefail
cd "$(dirname "$0")/.."
W=${1:-3}
TOTAL=$(node -e "import('./src/timeline.js').then(m=>console.log(Math.round(m.TOTAL*m.FPS)))")
mkdir -p output/parts output/logs
node tools/export_timeline.mjs
python3 audio/sound_design.py &
APID=$!
pids=()
for i in $(seq 0 $((W-1))); do
  A=$(( TOTAL * i / W )); B=$(( TOTAL * (i+1) / W ))
  node render/render.mjs --range $A:$B --out output/parts/p$i.mp4 > output/logs/p$i.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
wait $APID
: > output/parts/list.txt; for i in $(seq 0 $((W-1))); do echo "file 'p$i.mp4'" >> output/parts/list.txt; done
ffmpeg -y -v error -f concat -safe 0 -i output/parts/list.txt -c copy output/video_nosub.mp4
node tools/make_subs.mjs; node tools/make_voice_script.mjs
ffmpeg -y -v error -i output/video_nosub.mp4 -i output/audio/mix_novo.wav \
  -vf "ass=output/subtitle.ass" -af "loudnorm=I=-18:TP=-1.5:LRA=16" \
  -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest output/final_video.mp4
cp output/final_video.mp4 final_video.mp4
echo "DONE: final_video.mp4"
