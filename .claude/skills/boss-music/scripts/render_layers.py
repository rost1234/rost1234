"""Render a looping stage as stems for the layered player (player/layered-player.js).

    render_layers.py <ccgm>/lib <score.json> --id stage1 --out-dir DIR [--manifest DIR/manifest.json]

Every stem has the same length and loop point, so they play in sample-accurate step and
sum back to the full mix. Which part goes to which layer:
  - a lead line and its doubles (the tune)          -> "melody"
  - parts the score lists in "layers": {"rhythm": [...], "melody": [...]}
  - everything else                                  -> "bed"
The stems share one gain (the one the full mix is mastered with), so their balance is
the score's. A score without "loop": true renders as a single one-shot file (a cue).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extra_parts import setup  # noqa: E402

LAYERS = ("bed", "rhythm", "melody")
BEATS_PER_BAR = {"4/4": 4, "3/4": 3, "2/4": 2, "6/8": 2}   # (6/8: its tempo counts dotted quarters)


def main() -> None:
    lib = sys.argv.pop(1)
    ap = argparse.ArgumentParser()
    ap.add_argument("score")
    ap.add_argument("--id", required=True, help="the stage's or cue's id in the manifest (stage1, rise, victory)")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--manifest", help="add or replace this entry in a manifest.json")
    ap.add_argument("--name", help="the name the player shows (default: the score's title)")
    ap.add_argument("--to", help="a rise: the stage it leads into")
    a = ap.parse_args()
    orchestra, arrangement = setup(lib)
    import numpy as np
    import soundfile as sf

    spec = json.loads(Path(a.score).read_text(encoding="utf-8"))
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rate = orchestra.RATE
    name = a.name or str(spec.get("title", a.id)).split(" - ")[-1]
    meter = (spec.get("tune") or {}).get("meter", "4/4")
    tempo = float(spec["tempo"])
    bar_s = BEATS_PER_BAR.get(meter, 4) * 60.0 / tempo

    if not spec.get("loop"):                                   # a cue: one file
        audio, rate = arrangement.render(spec)
        f = out / f"{a.id}.ogg"
        _write_ogg(f, np.asarray(audio, dtype="float32"), rate)
        entry = {"id": a.id, "name": name, "file": f.name, "seconds": round(len(audio) / rate, 4),
                 "bpm": tempo, "beatsPerBar": BEATS_PER_BAR.get(meter, 4), "barSeconds": round(bar_s, 6)}
        if spec.get("lands_at") is not None:                  # a rise: where the next stage starts
            entry["landsAt"] = round(float(spec["lands_at"]) * 60.0 / tempo, 4)
        if a.to:
            entry["to"] = a.to
        _manifest(a, "cues", entry)
        print(f"{f} ({entry['seconds']:.1f}s)")
        return

    lay = spec.get("layers") or {}
    named = {p: k for k in ("rhythm", "melody") for p in lay.get(k, [])}

    def layer_of(group: str) -> str:
        part, colon, _ = group.partition(":")
        if colon:
            return "melody"                                    # a lead line or a double of one
        return named.get(part, "bed")

    score, seconds, _ = arrangement.build(spec)
    mix = spec.get("mix") or {}
    dry = orchestra.play_layers(score, seconds + 3.0, layer_of, orchestra.SF2, rate, mix)
    at = arrangement.loop_start(spec, rate) or 0
    loop_at = int(round(seconds * rate))

    # The gain the full mix is mastered with, applied to every stem.
    Dry = orchestra._dry_type()
    n = max(len(x) for x in dry.values())
    total = np.zeros((n, 2), dtype="float32").view(Dry)
    total.send = np.zeros((n, 2), dtype="float32")
    for x in dry.values():
        total[:len(x)] += x
        total.send[:len(x)] += getattr(x, "send", None) if getattr(x, "send", None) is not None else x
    wet_full = orchestra.hall(total, rate, loop_at=loop_at, loop_from=at)
    mastered = orchestra.master(wet_full, rate, loop=True, loop_from=at)
    rms = lambda y: float(np.sqrt(np.mean(np.square(np.asarray(y, dtype="float64")))))
    gain = rms(mastered) / max(rms(wet_full), 1e-12)

    files = {}
    for k in LAYERS:
        x = dry.get(k)
        if x is None:
            continue
        wet = orchestra.hall(x, rate, loop_at=loop_at, loop_from=at) * gain
        wet = np.clip(np.asarray(wet, dtype="float32")[:len(mastered)], -0.999, 0.999)
        f = out / f"{a.id}-{k}.ogg"
        _write_ogg(f, wet, rate)
        files[k] = f.name
    entry = {"id": a.id, "name": name, "layers": files, "seconds": round(len(mastered) / rate, 4),
             "loopStart": round(at / rate, 4), "bpm": tempo, "beatsPerBar": BEATS_PER_BAR.get(meter, 4),
             "barSeconds": round(bar_s, 6)}
    _manifest(a, "stages", entry)
    print(json.dumps(entry, indent=1))


def _write_ogg(path: Path, audio, rate: int) -> None:
    """WAV through ffmpeg to Ogg Vorbis (libsndfile's Vorbis writer crashes on long files)."""
    import subprocess
    import tempfile
    import soundfile as sf
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "x.wav"
        sf.write(str(wav), audio, rate, subtype="FLOAT")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-c:a", "libvorbis",
                        "-q:a", "6", str(path)], check=True)


def _manifest(a, kind: str, entry: dict) -> None:
    if not a.manifest:
        return
    p = Path(a.manifest)
    m = json.loads(p.read_text(encoding="utf-8")) if p.is_file() else {
        "title": "", "intensities": {"calm": ["bed"], "tense": ["bed", "rhythm"], "full": ["bed", "rhythm", "melody"]},
        "stages": [], "cues": []}
    m[kind] = [e for e in m.get(kind, []) if e["id"] != entry["id"]] + [entry]
    p.write_text(json.dumps(m, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
