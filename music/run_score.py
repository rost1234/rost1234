"""Render a score with GuySten's Claude-Code-Game-Master orchestra, plus two extra parts
(a piano and a standard GM drum kit) added at runtime - their files are left untouched."""
import sys
from pathlib import Path

LIB = Path(sys.argv.pop(1)).resolve()
sys.path.insert(0, str(LIB))
from music import orchestra, arrangement  # noqa: E402

orchestra.PARTS["piano"] = (0, 0, 54, 104)      # GM Acoustic Grand Piano
orchestra.PARTS["drums"] = (128, 0, 64, 104)    # GM Standard Kit (kick, snare, hats, toms)
orchestra.DRUMS.add("drums")
orchestra.RANGES["piano"] = (21, 108)
orchestra.ROOM["piano"] = -22.0
orchestra.ROOM["drums"] = -24.0
arrangement.DRUMS.add("drums")
arrangement.PERCUSSIVE.update({"drums", "piano"})
arrangement.main()
