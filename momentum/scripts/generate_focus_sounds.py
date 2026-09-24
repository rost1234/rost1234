"""Generates the focus-sound loops in assets/sounds/ (run: python3 scripts/generate_focus_sounds.py).

Quality choices:
- 44.1 kHz stereo, 45 s loops (long enough that the repeat isn't noticeable).
- Left/right channels are partly decorrelated so the sound feels wide and
  natural instead of sitting "inside your head".
- Every layer is built in the frequency domain (or placed circularly), so the
  loop is periodic by construction: no click, no gap at the loop point.
- All sounds are loudness-matched (RMS) so switching doesn't jump in volume.
- Encoded as Ogg Vorbis (small, gapless on Android).

Requires: numpy, soundfile.  Fixed seed => reproducible output.
"""
from pathlib import Path

import numpy as np
import soundfile as sf

RATE = 44100
SECONDS = 45
N = RATE * SECONDS
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"
TARGET_RMS_DB = -21.0
rng = np.random.default_rng(20260924)
FREQS = np.fft.rfftfreq(N, 1 / RATE)


def shaped_noise(exponent: float, low_cut: float = 25.0, high_shelf: tuple[float, float] | None = None) -> np.ndarray:
    """Periodic noise with power ~ 1/f**exponent, band-limited, optional high shelf (freq, gain_db)."""
    spectrum = rng.normal(size=FREQS.size) + 1j * rng.normal(size=FREQS.size)
    scale = np.zeros_like(FREQS)
    audible = FREQS >= low_cut
    scale[audible] = FREQS[audible] ** (-exponent / 2)
    # Soft (not brick-wall) low cut to avoid rumble on phone speakers.
    scale *= 1 / (1 + (low_cut / np.maximum(FREQS, 1)) ** 4)
    if high_shelf:
        corner, gain_db = high_shelf
        gain = 10 ** (gain_db / 20)
        scale *= 1 + (gain - 1) / (1 + (corner / np.maximum(FREQS, 1)) ** 2)
    signal = np.fft.irfft(spectrum * scale, N)
    return signal / np.sqrt(np.mean(signal**2))


def stereo(make, width: float = 0.75) -> np.ndarray:
    """Two partly decorrelated channels: shared component + independent component."""
    common, left, right = make(), make(), make()
    a = np.sqrt(1 - width)
    b = np.sqrt(width)
    return np.stack([a * common + b * left, a * common + b * right], axis=1)


def loop_envelope(period_s: float, depth: float, phase: float = 0.0) -> np.ndarray:
    """Slow swell whose period divides the loop length (so it loops cleanly)."""
    cycles = round(SECONDS / period_s)
    t = np.arange(N) / N
    return 1 - depth / 2 + (depth / 2) * np.sin(2 * np.pi * cycles * t + phase)


def rain() -> np.ndarray:
    """Soft rain: filtered noise bed + thousands of tiny droplets spread in stereo."""
    bed = stereo(lambda: shaped_noise(0.8, low_cut=120, high_shelf=(6000, -6)), width=0.9) * 0.55
    drops = np.zeros((N, 2))
    count = SECONDS * 140
    for _ in range(count):
        length = int(RATE * rng.uniform(0.004, 0.02))
        t = np.arange(length) / RATE
        tone = rng.uniform(1800, 6500)
        burst = rng.normal(size=length) * np.exp(-t * rng.uniform(250, 600)) + 0.3 * np.sin(2 * np.pi * tone * t) * np.exp(-t * 400)
        gain = rng.lognormal(mean=-2.2, sigma=0.6)
        pan = rng.uniform(0.1, 0.9)
        start = rng.integers(0, N)
        idx = (start + np.arange(length)) % N  # circular => seamless loop
        drops[idx, 0] += burst * gain * (1 - pan)
        drops[idx, 1] += burst * gain * pan
    drops /= np.sqrt(np.mean(drops**2)) + 1e-9
    return bed + drops * 0.35


def ocean() -> np.ndarray:
    """Distant waves: brown/pink noise swelling every ~9 s, drifting left↔right."""
    body = stereo(lambda: shaped_noise(1.6, low_cut=40, high_shelf=(3000, -8)), width=0.6)
    wash = stereo(lambda: shaped_noise(0.9, low_cut=300, high_shelf=(7000, -10)), width=0.9)
    swell = loop_envelope(9.0, depth=0.8) ** 2
    sway_l = loop_envelope(22.5, depth=0.4)
    sway_r = loop_envelope(22.5, depth=0.4, phase=np.pi)
    mix = body * swell[:, None] + 0.5 * wash * (swell[:, None] ** 3)
    mix[:, 0] *= sway_l
    mix[:, 1] *= sway_r
    return mix


def binaural(carrier: float, beat: float) -> np.ndarray:
    """Left `carrier` Hz, right `carrier+beat` Hz (whole cycles per loop) over a warm noise bed."""
    t = np.arange(N) / RATE
    bed = stereo(lambda: shaped_noise(1.3, low_cut=60, high_shelf=(4000, -9)), width=0.7) * 0.5
    tone_l = np.sin(2 * np.pi * carrier * t) + 0.06 * np.sin(2 * np.pi * 2 * carrier * t)
    tone_r = np.sin(2 * np.pi * (carrier + beat) * t) + 0.06 * np.sin(2 * np.pi * 2 * (carrier + beat) * t)
    return bed + 0.45 * np.stack([tone_l, tone_r], axis=1)


def master(name: str, audio: np.ndarray) -> None:
    rms = np.sqrt(np.mean(audio**2))
    audio = audio * (10 ** (TARGET_RMS_DB / 20) / rms)
    peak = np.max(np.abs(audio))
    if peak > 0.95:  # gentle safety limit
        audio = np.tanh(audio / 0.95) * 0.95
    path = OUT / f"{name}.ogg"
    sf.write(path, audio, RATE, format="OGG", subtype="VORBIS")
    print(f"{path.name}: {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.wav"):
        old.unlink()
    master("brown-noise", stereo(lambda: shaped_noise(2.0, low_cut=30, high_shelf=(2500, -4)), width=0.7))
    master("pink-noise", stereo(lambda: shaped_noise(1.0, low_cut=30, high_shelf=(8000, -4)), width=0.7))
    master("white-noise", stereo(lambda: shaped_noise(0.0, low_cut=40, high_shelf=(9000, -7)), width=0.7))
    master("rain", rain())
    master("ocean", ocean())
    # 200 Hz / 240 Hz => 40 Hz beat; both complete whole cycles in 45 s.
    master("binaural-40hz", binaural(200.0, 40.0))
