"""Draws the white glyphs used by the app-icon shortcuts (long-press the icon).

Each is an adaptive-icon foreground: 432 px, glyph kept inside the central
safe zone. The indigo background colour is set in app.json.
Run: python3 scripts/generate_shortcut_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 432
SCALE = 4  # draw big, downsample for smooth edges
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'shortcuts'
WHITE = (255, 255, 255, 255)


def canvas():
    img = Image.new('RGBA', (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def s(v):
    return int(v * SCALE)


def save(img, name):
    img.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f'{name}.png')


def focus():
    img, d = canvas()
    # Timer ring with a play triangle inside.
    d.ellipse([s(136), s(136), s(296), s(296)], outline=WHITE, width=s(16))
    d.polygon([(s(196), s(178)), (s(196), s(254)), (s(256), s(216))], fill=WHITE)
    save(img, 'shortcut_focus')


def reflection():
    img, d = canvas()
    # Crescent moon: a full disc minus an offset disc.
    d.ellipse([s(140), s(140), s(292), s(292)], fill=WHITE)
    d.ellipse([s(186), s(116), s(326), s(256)], fill=(0, 0, 0, 0))
    save(img, 'shortcut_reflection')


def add_task():
    img, d = canvas()
    w = s(18)
    d.rounded_rectangle([s(216) - w, s(146), s(216) + w, s(286)], radius=w, fill=WHITE)
    d.rounded_rectangle([s(146), s(216) - w, s(286), s(216) + w], radius=w, fill=WHITE)
    save(img, 'shortcut_task')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    focus()
    reflection()
    add_task()
