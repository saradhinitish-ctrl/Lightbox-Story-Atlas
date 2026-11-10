# Field Kit: Lightbox on a phone

On a desk, Lightbox is the studio's lit table. On a phone it is the kit a filmmaker carries on a recce: paper above, a graphite instrument under the thumb. Field Kit is a separate, phone-only layer over the same app. It adds no features and stores nothing; it re-houses what the desktop already does so that every room and tool is within reach of one thumb.

It applies at 767px and narrower (the line the app itself uses for its phone layout). Desktop and tablet are untouched.

## What you see
| Part | What it does |
|---|---|
| **The bar** | A graphite bar docked to the bottom edge, above the home indicator. Four stops (Atlas, Develop, Visuals, Kit) and, in the middle, the red key: **Write**. A red grease-pencil mark slides to the stop you are on. Tapping the stop you are already on scrolls its room back to the top. It replaces the floating "Workspace" pill and the floating "← Story Atlas" button. |
| **The kit** | The last stop opens a sheet with everything else: the rooms (Sequence, Breakdown, Research, Pitch), the world (Characters, Locations, Objects, with live counts) and the studio's tools (Find anything, World library, Switch or start a world, Export screenplay, Settings, Studio menu). |
| **Sheets** | Everything secondary rises from the bottom as a paper sheet with a grab handle: the kit, every dialog, the studio menu, the world library, document actions and the screenplay tools. Drag the kit, a dialog or the library down by its head, or flick it, and it goes. |
| **The top slate** | The world's name, set as a title (tap to switch worlds), with search and save. The library and menu buttons moved into the kit. On the first-run screen, where there is no bar, the menu button stays. |
| **The keyboard** | While you type, the bar slides away so the page keeps its room, and sheets sit on top of the keyboard. |

## The title sequence
On a phone the app opens like film running through a gate. A strip of 35mm travels up the screen; three frames pass in the dark (the page, a world, the frame); the fourth registers, the lamp strikes behind it, and "Lightbox." is circled in grease pencil. Then the view pushes in through the lit frame to the app. About 3.4 seconds; a tap anywhere skips it; none with reduced motion. Wider screens keep the original opening. Files: `title-sequence.css`, `title-sequence.js` (loaded synchronously before the app so it paints first).

## The print in hand
A phone has no hover, so prints on the Atlas line used to stay undeveloped until tapped. Now the print hanging at the centre of the screen lifts and develops as you swipe along the line, and the others keep a half-developed image. This is a small, phone-only branch in `story-cylinder-v9.js` (`nearest()`); wider screens never enter it.

## Material
The rooms carry the darkroom with them. The world's sections (Characters, Locations, Objects, Research) and Visual language open under a dark title card with the red safelight and grain. Below it, cards are prints on a line: card stock with paper fibres, a wooden peg, a slight tilt, and a settle as they arrive. Sheets (kit, dialogs, library, menu) are fibred paper. The library's sections are tiles with counts. Tokens: `--fk-room`, `--fk-noise`, `--fk-fibre`, `--fk-print`, `--fk-wall-ink`, `--fk-wall-muted`.

## Tokens
All custom properties are defined on `html.fk` in `field-kit.css`.

| Group | Tokens |
|---|---|
| Graphite | `--fk-chassis #18181A`, `--fk-chassis-2`, `--fk-chassis-line`, `--fk-chassis-ink #EEECE7` (15.0:1), `--fk-chassis-muted #A9A6A0` (7.3:1) |
| Paper | `--fk-paper #FAF9F5`, `--fk-table`, `--fk-mount`, `--fk-rule`, `--fk-rule-strong` |
| Ink | `--fk-ink #1C1B19` (16.3:1 on paper), `--fk-ink-2`, `--fk-ink-3 #67635B` (5.7:1) |
| Red, the only accent | `--fk-red #D4301F`, `--fk-red-ink #B3261A` for small text on paper (6.2:1), `--fk-red-on-dark #F2624F` on graphite (5.6:1) |
| Type | `--fk-display` Instrument Serif (titles), `--fk-ui` DM Sans (interface), `--fk-mono` DM Mono (labels), `--fk-frame` Big Shoulders Display (frame numbers). All already shipped with the app. |
| Space and shape | `--fk-gutter 20px`, radii `--fk-r-s 8px` / `--fk-r-m 14px` / `--fk-r-l 24px` (sheets), `--fk-hit 48px` (minimum touch target) |
| Layout | `--fk-bar 64px`, `--fk-band` (bar plus bottom safe area; 0 when there is no bar or while typing), `--fk-top 52px`, `--fk-safe-t`, `--fk-safe-b`, `--fk-kb` (keyboard height, set by the script) |
| Motion | `--fk-fast 140ms` (press), `--fk-med 300ms`, `--fk-slow 460ms` (sheets, the mark), `--fk-ease`, `--fk-spring` (a soft spring with about 3% overshoot) |

## Components
`fk-bar` / `fk-stop` / `fk-mark`, `fk-sheet` (grab, head, body) with `fk-veil`, `fk-room` (numbered tile), `fk-chip` (count), `fk-tool` (row). The app's own `dialog.dialog`, `.application-menu-popover`, `.binder`, `.menu-host > .dropdown` and `.script-more-popover` are restyled into the same sheet.

## Touch, motion, accessibility
- Targets are at least 48px. Small fields are 16px so iOS does not zoom on focus. Tap highlight is off; every control has its own pressed state. A light haptic tick on Android.
- Only `transform`, `opacity` and colour are transitioned. `prefers-reduced-motion` turns off every transition and animation in this layer and the haptic.
- The kit is a modal dialog: the app behind it is `inert`, focus is trapped and returns to where it was, Escape closes it. The bar is a `nav`; the current stop has `aria-current="page"`.
- Safe areas: the top slate, the bar and every sheet pad for the notch and the home indicator.

## How it works
`field-kit.js` adds `html.fk` at phone width and removes everything it added above it. Every rule in `field-kit.css` is inside one `@media (max-width: 767px)` block and starts with `html.fk`, so without the script the previous phone layout still works.

The app has no public router, so the kit presses controls React already renders: the workspace switcher's six destinations, entries of "Go anywhere" by label, and the library's section buttons. While it does, `html.fk-quiet` hides those intermediate surfaces. Counts are read from `window.LightboxStudio.project()`. Nothing is written.

Two phone bugs in the previous layout are fixed along the way: the screenplay "more tools" menu and the document actions menu opened off-screen (a blurred toolbar was trapping them), and the library's close button sat under the header.

## Files
| File | Role |
|---|---|
| `field-kit.css` | Tokens, the bar, sheets, the kit, and the phone treatment of the app's dialogs, menus, library and room headers |
| `field-kit.js` | The bar and kit, navigation, sheet gestures, keyboard awareness |
| `tests/field-kit-qa.mjs` | Browser checks at 360, 390 and 430px, first run, reduced motion, and a desktop comparison with and without the layer |

## Tests
```sh
PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/field-kit-qa.mjs
```
80 checks. On desktop (1440px) every element of the writing room computes to the same box and style with and without the two files.

Not covered by these checks: real iOS and Android keyboards (the keyboard logic uses `visualViewport`, which headless Chromium does not exercise), the Android app's WebView, and screen readers.
