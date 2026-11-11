#!/usr/bin/env python3
"""Render the Viewfinder brand mark for Lightbox's web, app and install icons.

The mark: an ink tile holding a lens reticle - a heavy outer ring, a fine inner
ring, a crosshair that runs past the rings, and a grease-pencil red sector
swept 120 degrees clockwise from twelve o'clock.

Strokes are weighted by the size the mark is shown at, so the fine lines of the
large icon do not vanish in a 16px favicon. Every output comes from GEOMETRY
below; edit it there and re-run:  python3 tools/render_viewfinder_icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
INK = "#18181A"
PAPER = "#EFEDE6"
RED = "#D4301F"

# All values on a 512 unit canvas, centre (256, 256).
CORNER = 102
RING_R = 168        # outer ring centreline
INNER_R = 140       # inner ring centreline
SECTOR_R = 138      # red sector radius
CROSS = 196         # crosshair half length
SWEEP = 120         # red sector, degrees clockwise from twelve o'clock

WEIGHTS = {
    # name: (outer ring, inner ring or 0 to omit, crosshair)
    "detail": (16, 5, 5),
    "compact": (30, 13, 13),
    "micro": (48, 0, 30),
}


def weight_for(display_px):
    if display_px <= 24:
        return "micro"
    if display_px <= 96:
        return "compact"
    return "detail"


def svg(weight="detail", tile=True, label="Lightbox viewfinder logo"):
    ring, inner, cross = WEIGHTS[weight]
    end = math.radians(SWEEP - 90)
    ex, ey = 256 + SECTOR_R * math.cos(end), 256 + SECTOR_R * math.sin(end)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="{label}">',
    ]
    if tile:
        parts.append(f'  <rect width="512" height="512" rx="{CORNER}" fill="{INK}"/>')
    parts.append(f'  <path d="M256 256V{256 - SECTOR_R}A{SECTOR_R} {SECTOR_R} 0 0 1 {ex:.2f} {ey:.2f}Z" fill="{RED}"/>')
    parts.append(f'  <g fill="none" stroke="{PAPER}">')
    parts.append(f'    <circle cx="256" cy="256" r="{RING_R}" stroke-width="{ring}"/>')
    if inner:
        parts.append(f'    <circle cx="256" cy="256" r="{INNER_R}" stroke-width="{inner}"/>')
    parts.append(f'    <path d="M{256 - CROSS} 256H{256 + CROSS}M256 {256 - CROSS}V{256 + CROSS}" stroke-width="{cross}"/>')
    parts.append("  </g>")
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


def mark(size, display_px=None, tile=True, background=None):
    """Raster the mark at `size` px; strokes weighted for `display_px` (default: size)."""
    ring, inner, cross = WEIGHTS[weight_for(display_px or size)]
    ss = 8
    big = size * ss
    k = big / 512
    image = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if tile:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=round(CORNER * k), fill=INK)
    c = 256 * k

    def box(r):
        return (c - r * k, c - r * k, c + r * k, c + r * k)

    draw.pieslice(box(SECTOR_R), start=-90, end=SWEEP - 90, fill=RED)

    def ring_at(r, w):
        draw.ellipse(box(r + w / 2), outline=PAPER, width=max(1, round(w * k)))

    ring_at(RING_R, ring)
    if inner:
        ring_at(INNER_R, inner)
    hw = cross * k / 2
    draw.rectangle((c - CROSS * k, c - hw, c + CROSS * k, c + hw), fill=PAPER)
    draw.rectangle((c - hw, c - CROSS * k, c + hw, c + CROSS * k), fill=PAPER)
    return image.resize((size, size), Image.LANCZOS)


def main():
    icons = ROOT / "app-icons"
    icons.mkdir(exist_ok=True)

    # Browser tab icon: bold enough for 16-32px. In-app header and welcome marks.
    (ROOT / "favicon.svg").write_text(svg("compact"))
    (icons / "viewfinder-mark.svg").write_text(svg("compact"))
    (icons / "viewfinder.svg").write_text(svg("detail"))

    for size in (48, 96, 180, 192, 512, 1024):
        mark(size).save(icons / f"viewfinder-{size}.png", optimize=True)

    ico_frames = [mark(s) for s in (16, 32, 48, 64)]
    ico_frames[-1].save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
                        append_images=ico_frames[:-1])

    # Maskable: full-bleed ink, reticle inside the 80% safe circle.
    maskable = Image.new("RGBA", (512, 512), INK)
    maskable.alpha_composite(mark(392, tile=False), (60, 60))
    maskable.convert("RGB").save(icons / "viewfinder-maskable-512.png", optimize=True)

    # iOS masks its own corners: give it a square, full-bleed tile.
    apple = Image.new("RGBA", (180, 180), INK)
    apple.alpha_composite(mark(180, tile=False))
    apple.convert("RGB").save(ROOT / "apple-touch-icon.png", optimize=True)

    brand = ROOT / "original-source/public/brand"
    if brand.is_dir():
        for size in (96, 180, 192, 512):
            mark(size).save(brand / f"viewfinder-{size}.png", optimize=True)
        (brand / "viewfinder-mark.svg").write_text(svg("compact"))
    public = ROOT / "original-source/public"
    if public.is_dir():
        (public / "favicon.svg").write_text(svg("compact"))
        for target in ("favicon.ico",):
            ico_frames[-1].save(public / target, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
                                append_images=ico_frames[:-1])
        apple.convert("RGB").save(public / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    main()
