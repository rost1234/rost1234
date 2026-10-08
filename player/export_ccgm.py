"""Copy a layered set into a Claude-Code-Game-Master music folder, in the shape its table
serves: flat file names prefixed with the set's name, and <set>.layers.json beside them.

    python3 player/export_ccgm.py music/clockwork-abbot/layers/manifest.json <ccgm>/music [--name horologe]

Then, at the table: bash tools/gm-table.sh music layers horologe [stage N] [--intensity calm|tense|full]
"""
import argparse
import json
import re
import shutil
from pathlib import Path


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("music_dir", help="the campaign's music/ (or the project's music/)")
    ap.add_argument("--name", help="the set's name at the table (default: the manifest's folder)")
    a = ap.parse_args()
    src = Path(a.manifest)
    man = json.loads(src.read_text(encoding="utf-8"))
    name = slug(a.name or (src.parent.parent.name if src.parent.name == "layers" else src.parent.name))
    out = Path(a.music_dir)
    out.mkdir(parents=True, exist_ok=True)

    def copy(f: str) -> str:
        to = f"{name}-{Path(f).name}"
        shutil.copyfile(src.parent / f, out / to)
        return to

    for s in man.get("stages", []):
        s["layers"] = {k: copy(f) for k, f in s["layers"].items()}
    for c in man.get("cues", []):
        c["file"] = copy(c["file"])
    (out / f"{name}.layers.json").write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{out / (name + '.layers.json')}  ->  gm-table.sh music layers {name}")


if __name__ == "__main__":
    main()
