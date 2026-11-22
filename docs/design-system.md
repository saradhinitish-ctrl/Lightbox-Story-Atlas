# Design system

One cascade, one token layer. The studio's look (warm paper, graphite, a single red, Instrument Serif, DM Sans, DM Mono) is defined once and everything else refers to it.

## Files
| File | Role |
|---|---|
| `css/tokens.css` | The tokens, `--ds-*`: palette, type, type scale, radii, elevation, layers, touch size, motion |
| `css/fonts.css` | `@font-face` for every family. One file per script subset in `assets/fonts/`, fetched only when a page uses it |
| `css/framework.css` | Tailwind output for the React app (layered: theme, base, components, utilities) |
| `css/*.css` | The studio's layers, in the order listed in `tools/build-css.mjs`: studio chrome, Atlas, rooms, then the phone-only layer (`field-kit.css`, last) |
| `lightbox.css`, `lightbox-app.css` | **Generated.** Do not edit. `node tools/build-css.mjs` rebuilds them (`--check` fails if they are stale) |
| `first-page.css`, `first-page.js`, `widget-entry.js` | Loaded as separate files on purpose: the native Android app substitutes its own edition of each by exact path |

`index.html` loads `lightbox.css`, then `first-page.css`, then `lightbox-app.css`. `first-page.css` sits between them because it always has; the Android app depends on that file being its own request.

## Tokens
| Group | Tokens |
|---|---|
| Graphite | `--ds-chassis`, `-2`, `-3`, `--ds-chassis-line`, `--ds-chassis-ink`, `--ds-chassis-muted` |
| Paper | `--ds-paper`, `--ds-table`, `--ds-mount`, `--ds-rule`, `--ds-rule-strong` |
| Ink | `--ds-ink`, `--ds-ink-2`, `--ds-ink-3` |
| Red (the only accent) | `--ds-red`, `--ds-red-hi`, `--ds-red-ink` (small text on paper), `--ds-red-on-dark`, `--ds-red-wash`, `--ds-red-line` |
| Darkroom wall | `--ds-wall`, `--ds-wall-2`, `--ds-wall-ink`, `--ds-wall-muted` |
| Type | `--ds-font-display`, `-ui`, `-mono`, `-frame`, `-courier`; sizes `--ds-fs-11 … 64`. Nothing is set under 11px. |
| Radius | `--ds-r-2`, `-4`, `-8`, `-14`, `-24`, `--ds-r-pill` |
| Elevation | `--ds-lift`, `--ds-lift-hi`, `--ds-print`, `--ds-sheet` |
| Layers | `--ds-z-raised 10`, `-bar 30`, `-overlay 40`, `-sheet 50`, `-modal 60`, `-toast 70` (for new code; older rules keep their numbers) |
| Space and touch | `--ds-gutter 20px`, `--ds-hit 48px`, `--ds-hit-min 44px` |
| Motion | `--ds-dur-fast 140ms`, `--ds-dur-med 300ms`, `--ds-dur-slow 460ms`, `--ds-ease`, `--ds-spring` |

`--fk-*` (Field Kit), `--lt-*` (light table) and `--lbd-*` (darkroom) are aliases of these wherever the values agreed. Use `--ds-*` in new CSS.

Half-pixel font sizes (12.5, 13.5, 15.5…) and the 15px base size of the phone shell are deliberate and inherited by whatever sits under them, so they were left as authored. Do not snap a font size that something else inherits.

## Rules for new CSS
- Colour, type, radius, shadow and motion come from tokens. No new hex values.
- No `!important`. If a rule needs it to win, fix the order or the specificity. (849 remain from earlier layers: each one was kept because removing it changed a computed style somewhere.)
- Transition and animate `transform`, `opacity` and colour only. Respect `prefers-reduced-motion`.
- Touch targets are at least 44px (48px preferred). Visible focus stays.

## Checking a CSS change
```sh
node tests/design-snapshot.mjs --out qa-artifacts/before     # 66 states: phone, tablet, desktop, public pages
# edit css/, then
node tools/build-css.mjs
node tests/design-snapshot.mjs --out qa-artifacts/after
python3 tools/design-compare.py qa-artifacts/before qa-artifacts/after --verbose
python3 tools/design-side-by-side.py qa-artifacts/before qa-artifacts/after phone-kit out.png
```
It compares computed styles and geometry of every element plus pixels, so a refactor that should change nothing can be shown to change nothing. Run `tests/field-kit-qa.mjs` and `tests/darkroom-atlas-qa.mjs` as well. (The darkroom's "smooth on a throttled CPU" check fails on software-rendered CI machines, with or without these changes.)

## What changed in the consolidation
- 18 render-blocking stylesheets became 3 (about 113 KB gzipped instead of about 2.5 MB: the old `styles.css` embedded 3.3 MB of base64 fonts).
- 7 unreferenced stylesheets and 3 superseded Story Cylinder scripts were removed.
- 625 KB of rules for classes that exist nowhere in the app were pruned (`css/framework.css` alone lost 1,700 unused utilities).
- 652 `!important` declarations proven unnecessary were dropped.
- Four parallel token systems now share one.
