#!/usr/bin/env python3
"""Render the Lit Spine brand mark for Lightbox's web and install icons."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
INK = (24, 25, 22, 255)
LIME = (198, 255, 0, 255)


def mark(size, rounded=True):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    radius = round(size * 94 / 512)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=INK)
    left = round(size * 367 / 512)
    right = round(size * 385 / 512)
    top = round(size * 105 / 512)
    bottom = round(size * 407 / 512)
    draw.rectangle((left, top, right, bottom), fill=LIME)
    return image


icons = ROOT / "app-icons"
icons.mkdir(exist_ok=True)
for size in (48, 96, 180, 192, 512):
    mark(size).save(icons / f"lit-spine-{size}.png", optimize=True)

mark(1024).save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
maskable = Image.new("RGBA", (512, 512), INK)
maskable.alpha_composite(mark(392), (60, 60))
maskable.convert("RGB").save(icons / "lit-spine-maskable-512.png", optimize=True)
mark(180).convert("RGB").save(ROOT / "apple-touch-icon.png", optimize=True)

brand = ROOT / "original-source/public/brand"
brand.mkdir(parents=True, exist_ok=True)
for size in (96, 180, 192, 512):
    mark(size).save(brand / f"lit-spine-{size}.png", optimize=True)
