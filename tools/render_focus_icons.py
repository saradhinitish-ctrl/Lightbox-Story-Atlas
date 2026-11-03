#!/usr/bin/env python3
"""Render the approved Focus Cinematic mark as stable website icon assets.

The single source of truth is /favicon.svg. This script only updates favicon
and PWA/iOS icon files; it does not alter Lightbox project or Android data.
"""
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "app-icons"
ICONS.mkdir(exist_ok=True)

# Oversampling preserves the star's sharp central points at favicon scale.
source = (ROOT / "favicon.svg").read_bytes()
raster = cairosvg.svg2png(bytestring=source, output_width=1024, output_height=1024)
base = Image.open(BytesIO(raster)).convert("RGBA")

for size in (48, 180, 192, 512):
    icon = base.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(ICONS / f"focus-cinematic-{size}.png", optimize=True)

# The legacy favicon slot is important for Google Search and browsers.
base.save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# Full-bleed maskable shortcut icon with generous visual safe zone.
maskable = Image.new("RGBA", (512, 512), "#10130d")
interior = base.resize((392, 392), Image.Resampling.LANCZOS)
maskable.alpha_composite(interior, (60, 60))
maskable.convert("RGB").save(ICONS / "focus-cinematic-maskable-512.png", optimize=True)

# iOS touch icon: preserve the native OS rounding, without white corners.
apple = Image.new("RGBA", (180, 180), "#10130d")
apple.alpha_composite(base.resize((180, 180), Image.Resampling.LANCZOS))
apple.convert("RGB").save(ROOT / "apple-touch-icon.png", optimize=True)

for path in [
    ROOT / "favicon.ico",
    ROOT / "apple-touch-icon.png",
    *sorted(ICONS.glob("focus-cinematic-*.png")),
]:
    assert path.is_file() and path.stat().st_size > 200, path
    print(path.relative_to(ROOT), path.stat().st_size, "bytes")
