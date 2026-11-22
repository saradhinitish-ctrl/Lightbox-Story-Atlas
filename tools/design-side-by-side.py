#!/usr/bin/env python3
"""python3 tools/design-side-by-side.py before_dir after_dir state [out.png]  — before | after | changed pixels."""
import sys
import numpy as np
from PIL import Image
b, a, name = sys.argv[1:4]
out = sys.argv[4] if len(sys.argv) > 4 else f'{name}-compare.png'
x, y = Image.open(f'{b}/{name}.png').convert('RGB'), Image.open(f'{a}/{name}.png').convert('RGB')
d = np.abs(np.asarray(x).astype(int) - np.asarray(y).astype(int)).max(axis=2) > 8
m = np.asarray(y).copy(); m[d] = [255, 0, 80]
w, h = x.size
canvas = Image.new('RGB', (w * 3 + 40, h), (60, 60, 60))
canvas.paste(x, (0, 0)); canvas.paste(y, (w + 20, 0)); canvas.paste(Image.fromarray(m), (2 * w + 40, 0))
canvas.save(out)
