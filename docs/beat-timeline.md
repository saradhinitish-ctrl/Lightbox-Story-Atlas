# Beat timeline — the planning table

The Beat timeline is a reel laid on the light table with index cards beneath it.

## Layout
| Part | What it shows | Notes |
|---|---|---|
| Heading | World / draft, title, one line of purpose, Save beats | Save status sits next to the button |
| The reel | Running time, and the film as a strip of frames | Each frame is as wide as its scene's screen time and tinted by its emotional beat. Story tension is drawn as a solid line, character pressure as a dashed one. Unwritten scenes are hatched. Click a frame to jump to its card; hovering a card lights its frame |
| Scene board | Index cards in a responsive grid | One character filter. "Screenplay order" appears only once the board has been reordered |
| Card | Number, slug line, beat title, summary, emotional beat, tension, pressure, run time, cast | Characters, props, location, move earlier/later and delete are under **Details** |

Reorder by dragging a card's grip, with the arrow keys on a focused grip, or with Earlier / Later under Details (for touch screens).

## Run time
`export-tools/overrides/lib/scene-runtime.ts`. A scene is timed from what is written in it:

| Element | Screen time |
|---|---|
| Dialogue | words ÷ 2.6 (≈155 spoken words a minute), at least 0.8 s, plus 0.3 s |
| Action, shots | (wrapped lines + 1) × 60/54 s: one Courier page of 54 lines ≈ 1 minute |
| Scene heading | 2 s |
| Parenthetical | 0.8 s |
| Transition | 1 s |
| Character cue | 0 s |

Page length is shown in eighths of a page, as on a breakdown sheet. Times under a minute show seconds (`8 s`, `1 min 05 s`).

A scene with nothing written below its heading cannot be timed. It uses the planned time typed on its card (labelled **planned**), or a one-minute **placeholder** until one is set. The reel's running time says how much of the total comes from pages and how much is planned.

## Data
Unchanged. Beats are still stored in `project.sceneBeats` with the same fields. `minutes` now holds the planned time of an unwritten scene (seconds are stored as fractions of a minute). A `minutes` value saved on a scene that now has pages is kept but no longer used, because the pages decide its time.

## Files
- `export-tools/overrides/components/beat-timeline.tsx`: the component (overrides `original-source/components/beat-timeline.tsx`, which is left byte for byte)
- `export-tools/overrides/lib/scene-runtime.ts`: the estimate
- `beat-table.css`: the styles, all under `.btl`, loaded after the theme
- `script.js`: the bundle

## Rebuilding script.js
`node export-tools/build-portable.mjs --scripts-only` installs today's library versions from the lockfile, which are older than the libraries in the deployed bundle (for example lucide-react 1.31 against 1.66). To change only the Beat timeline, build once without and once with the change, and apply the difference between those two builds to the deployed `script.js`. The bundled lucide icon is called `Trash` in the deployed bundle and `Trash2` in a fresh build.
