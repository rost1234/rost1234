"""Render a score (usage: run_score.py <ccgm>/lib check|play|make <score.json> [--out file.ogg])
with GuySten's Claude-Code-Game-Master orchestra, plus the parts in extra_parts.py."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extra_parts import setup  # noqa: E402

_, arrangement = setup(sys.argv.pop(1))
arrangement.main()
