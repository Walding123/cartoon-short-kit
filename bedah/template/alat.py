"""Pembantu lintas OS (Mac & Windows) untuk skrip Python proyek: lokasi ffmpeg mesin skill (dari engine/alat.json)."""
import json, os, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WIN = sys.platform == "win32"


def _engine():
    try:
        return (HERE / "node_modules").resolve(strict=True).parent
    except OSError:
        return Path.home() / ".claude" / "skills" / "animantra-vector" / "engine"


def ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    eng = _engine()
    try:
        p = json.loads((eng / "alat.json").read_text(encoding="utf-8")).get("ffmpeg")
        if p and Path(p).exists():
            return p
    except (OSError, ValueError):
        pass
    p = eng / ("ffmpeg.exe" if WIN else "ffmpeg")
    if p.exists():
        return str(p)
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()
