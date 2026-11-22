# The Lightbox hero

The centrepiece of the public site (`about.html`). A slab of opal glass glows under a red safelight; five film frames, one for each stage of a project (the spark, the world, research, the screenplay, visual language), float above it as layered transparencies. The pointer tilts the scene, and scrolling lifts the frames apart into an exploded view.

It is pure CSS 3D: about 35 elements, no WebGL, no image. Only `transform` and `opacity` change. Measured at a steady 60 fps on a phone profile, including with the CPU throttled 4×.

## Files
| File | Role |
|---|---|
| `css/hero.css` | The scene. Every size is in container units (`--u` = 1cqw), so it scales with its panel; `--tx`, `--ty` (lean) and `--lift` (0 resting, 1 exploded) are the only knobs |
| `hero.js` | Pointer and scroll, written to those three variables from one `requestAnimationFrame` loop; fallbacks |
| `about.html` | The markup (`[data-lbx]`) |
| `tests/hero-qa.mjs` | 27 checks: live behaviour, every fallback, pause off screen, tap targets, no sideways scroll, no external requests |

## Behaviour
- **Pointer:** the scene leans up to 9° toward it. A dragging finger does the same on a phone (`touch-action: pan-y`, so vertical scrolling still works).
- **Scroll:** the scene starts in its resting pose wherever it sits (beside the headline on a desk, just below the fold on a phone) and lifts as it travels up the screen.
- **Idle:** it breathes a little so the table feels lit.
- **Cost:** the loop runs only while the hero is on screen and the tab is visible.

## Static fallback
The same markup holds one fixed pose (`.is-static`) with no loop, no looping animation and no dust. It is chosen when:
- the visitor prefers reduced motion;
- Save-Data is on, the connection is 2G, the device reports 2 GB of memory or fewer, or it has 2 cores or fewer;
- the browser cannot do `transform-style: preserve-3d` (the frames lay out flat);
- or the first second of frames comes in slow: the scene stands down by itself.

Nothing about the visitor is stored.
