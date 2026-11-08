"""Generates the Light Table's material textures into assets/textures/.

Every texture is built from band-limited noise made in the Fourier domain, so it
tiles seamlessly at its own size. They are greyscale around a neutral middle
grey (or near-white for multiply), meant to be blended over a base colour so
they lighten and darken at once and leave the average tone, and therefore text
contrast, unchanged.

  table   opal acrylic diffuser: slow uneven mottling plus clumped grain.
          Film grain forms in clumps at several sizes; uniform per-pixel noise
          reads as damage instead of texture, so the grain is modulated.
  vellum  translucent drafting film / tracing paper: cloudy "formation" (the
          uneven density of fibre flocs) with faint fibres and tooth.
  mount   white card stock of a slide mount: fine tooth and a few fibres.
  chassis graphite powder-coat with a faint brushed grain along its length.
  tape    paper masking tape: crepe crinkles across the strip, warm beige.

Run from the repository root:  python3 tools/make-light-table-textures.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "textures"


def band(n, lo, hi, seed, aniso=(1.0, 1.0), h=None):
    """Periodic noise with energy between radial frequencies lo..hi (cycles per tile)."""
    h = h or n
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((h, n))
    fy = np.fft.fftfreq(h)[:, None] * h * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n * aniso[0]
    r = np.sqrt(fx * fx + fy * fy)
    # Soft-edged band-pass so there is no ringing.
    mask = np.clip((r - lo) / max(lo * .5, 1), 0, 1) * np.clip((hi - r) / max(hi * .25, 1), 0, 1)
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * mask))
    return (out - out.mean()) / (out.std() + 1e-9)


def save_grey(arr, name, size_note):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "L").convert("RGB")
    path = OUT / name
    img.save(path, "WEBP", quality=82, method=6)
    print(f"{name:22s} {size_note:10s} {path.stat().st_size/1024:6.1f} KB")


def fibres(n, count, seed, length=(6, 22), width=1):
    """Short, gently curved fibres on a transparent layer (returns -1..1 field)."""
    rng = np.random.default_rng(seed)
    layer = Image.new("L", (n * 3, n * 3), 128)
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.uniform(n, 2 * n, 2)
        a = rng.uniform(0, np.pi)
        L = rng.uniform(*length)
        bend = rng.uniform(-.35, .35)
        pts = []
        for t in np.linspace(0, 1, 6):
            ang = a + bend * t
            pts.append((x + np.cos(ang) * L * t, y + np.sin(ang) * L * t))
        tone = 128 + int(rng.choice([-1, 1]) * rng.uniform(25, 70))
        d.line(pts, fill=tone, width=width)
    layer = layer.filter(ImageFilter.GaussianBlur(.6))
    a = np.asarray(layer, dtype=np.float32)
    # Fold the 3x canvas back onto one tile so fibres wrap across edges.
    tile = np.zeros((n, n), np.float32)
    for i in range(3):
        for j in range(3):
            tile += a[i * n:(i + 1) * n, j * n:(j + 1) * n] - 128
    return tile / 128


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # Opal table: slow mottling of an uneven diffuser + clumped grain.
    n = 512
    mottle = band(n, 1, 6, 11) * .7 + band(n, 4, 16, 14) * .3
    clump = band(n, 10, 60, 12)
    # Wide band = grains of many sizes; modulation = they gather in clumps.
    grain = (band(n, 45, 256, 13) * .7 + band(n, 20, 70, 15) * .3) * (0.5 + 0.5 * np.tanh(1.2 * clump))
    # Soft-light is gentle on near-white, so the amplitudes are generous.
    table = 128 + 13.0 * mottle + 24.0 * grain
    save_grey(table, "table-opal.webp", f"{n}px")

    # Vellum: cloudy formation, faint fibres, fine tooth.
    # Paper formation is roughly 1/f: big soft clouds with smaller flocs inside them.
    formation = band(n, 2, 6, 21) * .55 + band(n, 6, 18, 24) * .3 + band(n, 18, 48, 25) * .15
    vellum = 128 + 20.0 * formation + 8.0 * band(n, 60, 256, 22) + 46.0 * fibres(n, 1400, 23, (8, 26))
    save_grey(vellum, "vellum.webp", f"{n}px")

    # Slide-mount card stock, for multiply on white: near-white with a fine tooth.
    m = 256
    tooth = band(m, 70, 120, 31) * .6 + band(m, 20, 50, 32) * .4
    mount = 251 + 3.2 * tooth + 9.0 * np.minimum(fibres(m, 140, 33, (4, 12)), 0)
    save_grey(mount, "mount.webp", f"{m}px")

    # Chassis: powder-coat speckle and a faint brushed grain running horizontally.
    speckle = band(n, 120, 250, 41)
    brushed = band(n, 1, 160, 42, aniso=(10.0, 1.0))   # long in x, varying in y
    chassis = 128 + 10.0 * speckle + 6.0 * brushed + 4.0 * band(n, 3, 12, 43)
    save_grey(chassis, "chassis.webp", f"{n}px")

    # Masking tape: crepe crinkles across the strip, baked in colour with alpha.
    tw, th = 256, 64
    crepe = band(tw, 18, 60, 51, aniso=(1.0, 6.0), h=th)    # varies along x, smooth in y
    fine = band(tw, 60, 120, 52, h=th)
    v = crepe * 9 + fine * 4
    base = np.array([231, 223, 199], np.float32)
    rgb = np.clip(base[None, None, :] + v[..., None], 0, 255).astype(np.uint8)
    alpha = np.clip(214 + crepe * 10, 170, 240).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, alpha]), "RGBA").save(OUT / "tape.webp", "WEBP", quality=86, method=6)
    print(f"{'tape.webp':22s} {'256x64':10s} {(OUT/'tape.webp').stat().st_size/1024:6.1f} KB")


if __name__ == "__main__":
    main()
