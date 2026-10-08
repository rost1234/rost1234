"""The parts this project adds to GuySten's orchestra at runtime (its files are left
untouched): a piano and a standard General MIDI drum kit."""
import sys
from pathlib import Path


def setup(lib: str):
    """Put <ccgm>/lib on the path, add the parts, and return (orchestra, arrangement)."""
    sys.path.insert(0, str(Path(lib).resolve()))
    from music import orchestra, arrangement
    if "piano" not in orchestra.PARTS:
        orchestra.PARTS["piano"] = (0, 0, 54, 104)      # GM Acoustic Grand Piano
        orchestra.PARTS["drums"] = (128, 0, 64, 104)    # GM Standard Kit (kick, snare, hats, toms)
        orchestra.DRUMS.add("drums")
        orchestra.RANGES["piano"] = (21, 108)
        orchestra.ROOM["piano"] = -22.0
        orchestra.ROOM["drums"] = -24.0
        arrangement.DRUMS.add("drums")
        arrangement.PERCUSSIVE.update({"drums", "piano"})
    return orchestra, arrangement
