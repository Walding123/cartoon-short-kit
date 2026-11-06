"""Transkrip take narasi dengan timing per kata (faster-whisper).
  node py.mjs asr.py vo/take.wav vo/take_words.json
Pakai VAD + tanpa konteks antarsegmen supaya kalimat awal tidak terlewat dan tidak berhalusinasi."""
import json, os, sys
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
m = WhisperModel(os.environ.get("KB_WHISPER", "small"), device="cpu", compute_type="int8")
segs, _ = m.transcribe(load16k(sys.argv[1]), language="id", word_timestamps=True, vad_filter=True,
                       vad_parameters={"min_silence_duration_ms": 300}, condition_on_previous_text=False)
words = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
json.dump(words, open(sys.argv[2], "w"), ensure_ascii=False)
print(len(words), "kata")
