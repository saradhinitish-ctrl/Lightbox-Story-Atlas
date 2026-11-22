#!/usr/bin/env python3
"""Compare two snapshot folders written by tests/design-snapshot.mjs.

    python3 tools/design-compare.py qa-artifacts/before qa-artifacts/after [--verbose]

Reports, per state: the share of pixels that changed, and how many elements changed computed style
or geometry. Exit status is 1 when anything differs, so it can gate a refactor.
"""
import json, re, sys
from pathlib import Path

import numpy as np
from PIL import Image

NUM = re.compile(r'-?\d*\.?\d+(?:e-?\d+)?')


def same(x, y, tol=0.3):
    """Equal, allowing sub-pixel / animation-phase noise in numbers (tol px or opacity)."""
    if isinstance(x, dict) and isinstance(y, dict):
        return set(x) == set(y) and all(same(x[k], y[k], tol) for k in x)
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(same(a, b, tol) for a, b in zip(x, y))
    if isinstance(x, (int, float)) and isinstance(y, (int, float)):
        return abs(x - y) <= tol
    if isinstance(x, str) and isinstance(y, str):
        if x == y:
            return True
        if NUM.sub('#', x) != NUM.sub('#', y):
            return False
        return all(abs(float(a) - float(b)) <= tol for a, b in zip(NUM.findall(x), NUM.findall(y)))
    return x == y


args = [a for a in sys.argv[1:] if not a.startswith('--')]
verbose = '--verbose' in sys.argv
if len(args) != 2:
    sys.exit(__doc__)
before, after = Path(args[0]), Path(args[1])
names = sorted({p.stem for p in before.glob('*.png')} | {p.stem for p in after.glob('*.png')})
bad = 0
print(f"{'state':34} {'pixels':>9} {'elements':>9}  note")
for name in names:
    pb, pa = before / f'{name}.png', after / f'{name}.png'
    if not (pb.exists() and pa.exists()):
        print(f'{name:34} {"-":>9} {"-":>9}  missing on one side'); bad += 1; continue
    a = np.asarray(Image.open(pb).convert('RGB')).astype(int)
    b = np.asarray(Image.open(pa).convert('RGB')).astype(int)
    if a.shape != b.shape:
        print(f'{name:34} {"size":>9} {"-":>9}  {a.shape} vs {b.shape}'); bad += 1; continue
    changed = (np.abs(a - b).max(axis=2) > 8)
    pix = changed.mean() * 100
    sb, sa = json.loads((before / f'{name}.json').read_text()), json.loads((after / f'{name}.json').read_text())
    note = ''
    diffs = []
    if len(sb) != len(sa):
        note = f'element count {len(sb)} -> {len(sa)}'
        diffs = [None] * abs(len(sb) - len(sa))
    else:
        for i, (x, y) in enumerate(zip(sb, sa)):
            if not same(x, y):
                keys = sorted(k for k in set(x) | set(y) if not same(x.get(k), y.get(k)))
                diffs.append((i, x['t'], keys))
    if pix > 0.4 or diffs:
        bad += 1
    print(f'{name:34} {pix:8.3f}% {len(diffs):9d}  {note}')
    if verbose:
        for d in diffs[:12]:
            if d: print('      ', d[1][:70], d[2][:8])
print('\nIDENTICAL' if not bad else f'\n{bad} state(s) differ')
sys.exit(1 if bad else 0)
