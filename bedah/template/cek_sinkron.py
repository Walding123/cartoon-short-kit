"""Cek sinkron subtitle: waktu kata hasil ASR dari video final vs waktu kata subtitle (words.json + offset pembuka).
  node py.mjs cek_sinkron.py video_kecil.mp4 [offset_pembuka=1.2]
Ideal: selisih median ≈ 0,00 s."""
import json, os, re, subprocess, sys, difflib, statistics, tempfile
from pathlib import Path
from faster_whisper import WhisperModel
def load16k(path):
    """Audio apa pun -> numpy float32 16 kHz mono lewat ffmpeg mesin skill (tanpa PyAV)."""
    import subprocess, tempfile, wave, numpy as np
    from pathlib import Path
    tmp = Path(tempfile.gettempdir()) / "_kb16k.wav"
    from alat import ffmpeg
    subprocess.run([ffmpeg(), "-y", "-loglevel", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", str(tmp)], check=True)
    with wave.open(str(tmp)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
HERE = Path(__file__).parent
vid = sys.argv[1]; off = float(sys.argv[2]) if len(sys.argv) > 2 else 1.2
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
m = WhisperModel(os.environ.get("KB_WHISPER", "small"), device="cpu", compute_type="int8")
segs, _ = m.transcribe(load16k(vid)[:16000 * 45], language='id', word_timestamps=True, vad_filter=True, condition_on_previous_text=False)
asr = [(norm(w.word), w.start) for s in segs for w in s.words]
sub = [(norm(w['w']), w['s'] + off) for w in json.load(open(HERE / 'words.json'))['words'] if w['s'] + off < 45]
sm = difflib.SequenceMatcher(None, [a for a, _ in asr], [b for b, _ in sub], autojunk=False)
d = [sub[j][1] - asr[i][1] for tg, i1, i2, j1, j2 in sm.get_opcodes() if tg == 'equal' for i, j in zip(range(i1, i2), range(j1, j2))]
print(f"{len(d)} kata cocok, selisih median {statistics.median(d):+.2f} s (subtitle − suara)")
