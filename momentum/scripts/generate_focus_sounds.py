"""Generates the focus-sound loops in assets/sounds/ (run: python3 scripts/generate_focus_sounds.py).

Every loop is built in the frequency domain, so the signal is periodic by
construction and repeats with no click at the loop point. Fixed seed =>
reproducible files. Requires numpy.
"""
import wave
from pathlib import Path

import numpy as np

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"
rng = np.random.default_rng(20260924)


def colored_noise(seconds: float, exponent: float) -> np.ndarray:
    """Noise whose power falls as 1/f**exponent (0 = white, 1 = pink, 2 = brown)."""
    n = int(RATE * seconds)
    freqs = np.fft.rfftfreq(n, 1 / RATE)
    spectrum = rng.normal(size=freqs.size) + 1j * rng.normal(size=freqs.size)
    scale = np.ones_like(freqs)
    scale[1:] = freqs[1:] ** (-exponent / 2)
    scale[0] = 0  # no DC offset
    scale[freqs < 20] = 0  # nothing below hearing range (keeps brown noise from rumbling speakers)
    signal = np.fft.irfft(spectrum * scale, n)
    return signal / np.max(np.abs(signal))


def write_wav(name: str, channels: np.ndarray, peak: float) -> None:
    """channels: shape (samples,) or (samples, 2); peak: 0..1 headroom."""
    data = np.clip(channels * peak, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as f:
        f.setnchannels(1 if pcm.ndim == 1 else 2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())
    print(f"{name}: {(OUT / name).stat().st_size // 1024} KB")


def binaural(seconds: float, carrier: float, beat: float) -> np.ndarray:
    """Left ear `carrier` Hz, right ear `carrier + beat` Hz over a soft pink-noise bed.

    Both tones complete whole cycles over the loop, so it is seamless too.
    """
    t = np.arange(int(RATE * seconds)) / RATE
    bed = colored_noise(seconds, 1.0) * 0.35
    left = 0.6 * np.sin(2 * np.pi * carrier * t) + bed
    right = 0.6 * np.sin(2 * np.pi * (carrier + beat) * t) + bed
    stereo = np.stack([left, right], axis=1)
    return stereo / np.max(np.abs(stereo))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write_wav("white-noise.wav", colored_noise(15, 0.0), peak=0.5)
    write_wav("pink-noise.wav", colored_noise(15, 1.0), peak=0.6)
    write_wav("brown-noise.wav", colored_noise(15, 2.0), peak=0.7)
    # 200 Hz / 240 Hz => 40 Hz "gamma" beat. 10 s loop => whole cycles for both tones.
    write_wav("binaural-40hz.wav", binaural(10, carrier=200.0, beat=40.0), peak=0.5)
