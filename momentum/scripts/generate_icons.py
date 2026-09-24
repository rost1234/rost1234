"""Generates the Momentum app icon set in assets/ (run: python3 scripts/generate_icons.py).

Mark: three rising rounded bars and a dot ("momentum" / small steps that grow),
white on an indigo→violet gradient. Drawn at 4x and downsampled for clean edges.
Requires: pillow.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
TOP_LEFT = (91, 91, 214)  # #5B5BD6
BOTTOM_RIGHT = (139, 92, 246)  # #8B5CF6
SS = 4  # supersampling factor


def gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP_LEFT, BOTTOM_RIGHT)) + (255,)
    return img


def mark(size: int, scale: float, color=(255, 255, 255, 255)) -> Image.Image:
    """The bars + dot, centred, occupying `scale` of the canvas width."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = big * scale
    left = (big - w) / 2
    bar_w = w * 0.2
    gap = (w - 3 * bar_w) / 2
    bottom = big / 2 + w * 0.38
    heights = [w * 0.34, w * 0.54, w * 0.76]
    for i, h in enumerate(heights):
        x0 = left + i * (bar_w + gap)
        d.rounded_rectangle([x0, bottom - h, x0 + bar_w, bottom], radius=bar_w / 2, fill=color)
    # dot above the tallest bar = the next step
    r = bar_w * 0.5
    cx = left + 2 * (bar_w + gap) + bar_w / 2
    cy = bottom - heights[2] - r * 2.4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def composite(size: int, scale: float) -> Image.Image:
    base = gradient(size)
    base.alpha_composite(mark(size, scale))
    return base


if __name__ == "__main__":
    composite(1024, 0.52).convert("RGB").save(ASSETS / "icon.png")
    gradient(512).save(ASSETS / "android-icon-background.png")
    # Adaptive icons crop to the inner ~66%, so the mark stays inside that safe zone.
    mark(512, 0.42).save(ASSETS / "android-icon-foreground.png")
    mark(432, 0.42).save(ASSETS / "android-icon-monochrome.png")
    mark(1024, 0.5).save(ASSETS / "splash-icon.png")
    composite(48, 0.56).save(ASSETS / "favicon.png")
    print("icons written to", ASSETS)
