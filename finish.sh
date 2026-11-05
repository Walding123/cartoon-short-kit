#!/bin/bash
# finish.sh "Title" : loudness (one linear gain to -14 LUFS + -1 dBFS limiter), encode, QA
set -e
TITLE="$1"; OUT="out/${2:-penisilin}.mp4"
I=$(ffmpeg -hide_banner -i work/mix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14-($I),2))")
echo "mix integrated $I LUFS -> gain $G dB"
ffmpeg -y -v error -i work/mix.wav -af "volume=${G}dB,alimiter=limit=0.78:attack=1:release=60:level=disabled,aresample=48000" -c:a pcm_s16le work/master.wav
ffmpeg -y -v error -framerate 30 -i frames/f%04d.jpg -i work/master.wav \
  -vf "scale=1080:1920:flags=lanczos,ass=work/subs.ass,format=yuv420p" -c:v libx264 -preset veryfast -crf 17 -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest -metadata title="$TITLE" "$OUT"
echo "--- QA"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
ffmpeg -hide_banner -i "$OUT" -vf "freezedetect=n=0.0008:d=0.4,blackdetect=d=0.1:pix_th=0.05" -an -f null - 2>&1 | grep -E "freeze_(start|duration)|black_start" || echo "no freezes/black"
python3 - "$OUT" <<'PY'
import subprocess,sys
from PIL import Image
f=sys.argv[1]; ims=[]
for i in range(24):
    t=0.5+i*(75.5/24)
    raw=subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',f,'-frames:v','1','-vf','scale=180:320','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    ims.append(Image.frombytes('RGB',(180,320),raw))
S=Image.new('RGB',(180*12,640))
for i,im in enumerate(ims): S.paste(im,((i%12)*180,(i//12)*320))
S.save('out/qa_sheet.jpg',quality=88)
PY
