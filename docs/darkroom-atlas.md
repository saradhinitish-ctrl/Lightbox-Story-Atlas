# The Atlas as a darkroom

The Atlas is a darkroom under a red safelight. The five stages of a project are prints pegged to one twine line strung across the room, in the order the work grows:

**01 The Spark → 02 The World → 03 Research → 04 The Screenplay → 05 Visual Language**

It replaces the light table (rack-focus cards) and the 3D cylinder ("Classic view"). It is the only Atlas now.

## What you see
| Part | What it does |
|---|---|
| **The line** | Aged cotton twine tied to two screw eyes at the walls, sagging gently under five wooden pegs. The line runs through each peg's groove. |
| **The prints** | One photograph per stage, made from the project's real work: the premise under a single light, a contact sheet of the people, places and objects, index cards on cork, page one of the screenplay, and the reference frames over the colour script. The bottom border carries the frame number, the stage and a status line. |
| **Development** | The more work a stage has, the more developed its print: denser and sharper. A stage with nothing in it is blank photo paper with only a faint latent image. Hovering or focusing a print develops it for a moment into what it could become. |
| **The select** | The stage you touched last is boxed in red grease pencil, with its frame number circled, the way an editor marks a contact sheet. |
| **The developer tray** | On the bench below the line, the one print still in the chemicals: where you stopped writing. **Continue Scene NN** goes straight back to the exact character (**Start Scene 01** with nothing written). |
| **Opening a stage** | Click a print and the peg lets go. The print comes off the line and up into focus, then the stage's own room opens. The World print opens Characters; its border has **CHAR. / LOC. / OBJ.** for Locations and Objects. |
| Kept | The heading (editable project name, logline), Pitch view, search, Export PDF, the dock, the top bar and the **← STORY ATLAS** button in the rooms. |

## The air
Everything hanging in the room moves in the same air, sampled by one function (`airAt`):
- **Breeze:** two octaves of smooth noise that drift across the room, with a slow "breathing" swell. Idle sway stays well under 1.5°.
- **Gusts:** every 11–24 s a gust travels along the line from one side, crossing the room in about five seconds. It reaches each print in turn; the test measures each print peaking about 0.9 s after the one before it.
- **The cursor:** moving the mouse leaves a gentle wake (decaying puffs of air). A fast flick throws a small gust in the direction of the flick.
- **Visible air:** dust motes carried by the same air, bright where they cross the safelight's beam, so you see the wind before the prints move.

## The physics
- **Thread:** a verlet rope pinned at both walls. Each peg is a heavy point on it. The rope's length is found by bisection so that it sags gently at any size. A taut, weighted line barely moves along the wall; what a real clothesline does is swing out from the wall and back. That is a damped wave along the rope (`z`), driven by air pushing into the room and drawn in perspective. Pegs, prints and shadows follow it.
- **Prints:** each is a damped pendulum hanging from its peg. It is pushed by the air at its centre of pressure (relative to its own motion) and by its peg's movement, and it pulls back on the peg. Each print has its own period (1.95–2.5 s), damping, weight and sail, so no two move in unison. A second spring lets the lower edge of the paper flutter, and a third twists the sheet slightly.
- **Hover and focus:** springs for lift (toward the viewer), tilt toward the cursor and a deeper, softer shadow. On release they settle back with a damped swing; nothing snaps.

## Motion and performance
- One `requestAnimationFrame` loop drives the whole room, with a fixed 1/120 s physics step. Per frame the DOM changes only `transform` and `opacity`. The line and the dust are drawn on canvases: the line on a band just tall enough for it, the dust by clearing only where it was drawn last frame. The safelight's beam, the wall's grain and its soft edges are drawn once per resize.
- The loop stops while the tab is hidden or the Atlas is off-screen. The scroll position and the line's box are read once per frame, before any write.
- Shadows are box-shadows painted once; no blur is animated. Classes are only touched when they change, which also stopped a feedback loop in the old Atlas code: re-adding a class woke its MutationObserver every frame.
- **Reduced motion:** the air is still and the loop never runs. Prints hang where the line holds them, a hover lifts a print gently (CSS, 0.35 s) and develops it, and a click opens the room after a short fade, with no flight.
- **Measured** (`tests/darkroom-atlas-qa.mjs`): 95% of frames under 34 ms on a 4× throttled CPU with a gust and the cursor moving. The tab is hidden: 0 frames.

## Responsive
- **980 px and wider:** all five prints on one line, sized to the room.
- **Narrower:** one line that scrolls sideways along the wall, with snap points at each print. It opens on the print you are working on, and a print that gets keyboard focus scrolls into view. The tray stays on the bench. There is no horizontal page overflow at 320–1920 px.

## Accessibility
- Every print is a button in the line's order (01 → 05, the World's three tabs after its print, then Continue). Its name says the stage, its status, whether it is marked, and where it goes. Keyboard focus is treated like hover.
- Text on the wall uses the paper white `#F1E5DA` (16:1), the muted `#C2AB9F` (9.2:1) and, for small red text, `#F2624F` (5.9:1 even where the safelight is brightest). Captions on the prints are dark ink on paper: 10:1 for the stage and 5.9:1 for the status, under the red cast. Continue is white on `#D4301F` (4.95:1).

## Data
Nothing new is stored. Everything is read through the existing bridge, `window.LightboxStudio` (`project()`, `scenes()`, `timing()`, `spot()`, `referenceInScene()`, `continueWriting()`). Rooms open through the native Atlas controls that React still renders, hidden, behind the darkroom: `onFoundation`, `onSection('characters' | 'locations' | 'props' | 'research')`, `onWrite`, `onMoodboard()`.

| Stage | Read from | Development (0–1) |
|---|---|---|
| 01 The Spark | the foundation's eight takes (`development.*`); premise, else logline | takes answered ÷ 8 |
| 02 The World | characters, locations, objects (not in the bin) | 0.15 + 0.5 × kinds present ÷ 3 + 0.35 × min(1, total ÷ 9) |
| 03 Research | field notes and `research.status` | 0.15 + 0.6 × min(1, notes ÷ 6) + 0.25 × followed-up share |
| 04 The Screenplay | scenes, scenes written, page time, the remembered caret | 0.12 + 0.48 × written share + 0.4 × min(1, written minutes ÷ 10) |
| 05 Visual Language | `project.moodboard`: image frames, palette colours, scene boards | 0.15 + 0.5 × boards share (or 0.25 × min(1, refs ÷ 4) with no scenes) + 0.35 × min(1, refs ÷ 12) |

Empty stages are 0. **The select** goes to the stage whose nodes were updated last. Reference cards carry no timestamp, so Visual Language is chosen when the project changed after every node did. Ties go to the Screenplay if there is a remembered writing spot, else to the first stage in the line. With nothing written anywhere, the Spark is marked.

## Files
| File | Role |
|---|---|
| `story-cylinder-v9.js` | The darkroom (the file keeps its old name so no entry point changes): data, pictures, air, rope, prints, drawing, pull-off, the back button |
| `atlas-light-table.css` | The darkroom's styles (likewise the old name) |
| `tests/darkroom-atlas-qa.mjs` | Browser checks for all of the above and for the rooms (research board, film frames, pitch, search, export) |

`window.LightboxDarkroom` offers a read-only `state()`, `gust(dir, amp)` and `calm(seconds)` for the tests.

## Tests
```sh
PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/darkroom-atlas-qa.mjs
```
CI runs it on pull requests (`.github/workflows/story-cylinder-v7-qa.yml`).
