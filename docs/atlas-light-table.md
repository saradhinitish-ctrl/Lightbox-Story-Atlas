# The Atlas as a light table

The Atlas home screen is a status screen, not a menu: the dock already lists every room. It is a dim room with one lit card, and that card is the light source.

## What you see
| Part | What it does |
|---|---|
| **Rack focus** | The centred card is sharp, full size and backlit. Neighbours sit smaller and dimmer, a little desaturated, with a 1.5px static blur. Hover a neighbour and its light comes up. Click a neighbour to bring it into focus; click the lit card to go in. Swipe, drag, horizontal wheel, the arrows and the arrow keys all still work. |
| **Continue card** (the Screenplay) | The last 3–4 lines you wrote, laid out like the page, with a red caret where you stopped. The scene heading and number, a reel of the film (one frame per scene, as long as its screen time; written scenes inked, the current one red), the scene's page length and run time. One button, **Continue Scene NN**, reopens the full screenplay with the caret on the exact character. **Enter writing room** stays as a quieter link. With nothing written it reads **Start Scene 01**. |
| **Live status line** | One line on every card: characters · locations · objects; notes · open threads; scene boards started; foundation takes answered (of 8); and the sequence on the Screenplay card (scenes written, run time, beats shaped). |
| **Push-in** | Going into a room, the lit card grows to fill the workspace and becomes the room (View Transitions, shared element). |
| **Classic view** | The toggle beside the arrows brings back the 3D Story Cylinder exactly as it was. The choice is kept in this browser. |
| Kept | The slate, registration marks, grid paper, coffee ring, tally, edge print, the dark chrome, the cream paper, the fonts, the red accent, the `03 / 05` counter and arrows, Pitch View, search, Export PDF. |

## In the rooms
| Room | Detail |
|---|---|
| **Field Notes** (Research) | A research board: your notes pinned as index cards (kind, title, the first lines, thread status, word count, Open). Drag a card, or move it with the arrow keys (Shift for bigger steps). **Tie** a red string between two notes. Notes that share a keyword get a lighter dashed thread. **Board / Cards** switches back to the original card grid; List and Arrange still work. On touch screens, pick a card up by its pinned head so the rest of it still scrolls the page. |
| **Visual Language** | Scene-board frames get sprocket holes and an edge code made up from the project: `SWEET DRIFT ◆ SC 02 ◆ TK 03 ◆ 0042+08` (title, scene, take = references on that board, and the footage at the head of the scene in feet+frames at 24 fps, 16 frames a foot). No film-stock names. Film details appear only here. |

## Motion and performance
- Per frame only `transform` and `opacity` change. The neighbour blur is a class that switches (it never tweens), on two elements at most; the table's contact shadows no longer use a blur filter.
- Push-in: only the clicked card carries `view-transition-name: lbx-push`, and only until the old view is captured; the room's `<main>` takes the name for the new view, so the name is never on two elements. The dark top chrome is its own layer during the push so it does not wash out. The browser animates the group's size as part of the shared-element morph.
- The push is skipped on a heavy page: Save-Data, 2 or fewer cores, 2 GB or less memory, slow frames while the table was moving, a long task in the last 1.5 s, or more than 6,000 elements. Without the View Transitions API, nothing changes.
- Reduced motion: no slides. The table fades to the new card (0.2 s), the push becomes a 0.18 s cross-fade. `styles.css` turns every animation off for reduced motion, so the one fade is reinstated explicitly.
- No autoplay, no auto-advance, no blinking caret.
- Measured: 95% of frames under 34 ms while navigating on a 4× throttled CPU (`tests/atlas-light-table-qa.mjs`).

## Data
Nothing is renamed or migrated.

| What | Where |
|---|---|
| Where you stopped writing | `localStorage['lightbox.atlas.spot:<projectId>']`: document id, scene key, block within the scene, caret offset. This browser only; not project data. |
| Light table or Classic view | `localStorage['lightbox.atlas.layout']` (`classic` or absent) |
| Board or Cards in Field Notes | `localStorage['lightbox.research.view']` |
| A note's place on the board | The note's existing `x` / `y` (the same fields the corkboard's Arrange view uses) and `order` (reading order: top to bottom, left to right) |
| A red string | `fields['research.links']` on the note: comma-separated note ids |

Board edits go through the app's `changeProject` with a checkpoint, so they can be undone, are saved like any edit and are in backups. Export PDF is byte-identical to before for the same project (only the PDF timestamp differs).

## Files
| File | Role |
|---|---|
| `story-cylinder-v9.js` | The Atlas: rack focus (`paintRack`), live status and the continue card (`liveData`, `continueParts`), push-in (`pushIn`, `heavyPage`), the Classic toggle. The cylinder code is unchanged and runs in Classic view. |
| `atlas-light-table.css` | The light table: room, backlight, neighbours, continue card, status lines, push-in, reduced motion |
| `research-board.js` | The research board |
| `film-frames.js` | Edge codes on Visual Language frames |
| `light-table-rooms.css` | Research board and film frames |
| `script.js` | The bridge (below), spot tracking, the research board host |
| `export-tools/overrides/components/writing-studio.tsx` | The same changes in source form |
| `tests/atlas-light-table-qa.mjs` | Browser checks for all of the above |

### The bridge
`window.LightboxStudio`, set by the Studio component in `script.js`:

`project()`, `scenes()`, `timing(scene)`, `formatDuration`, `formatEighths`, `referenceInScene` (read-only), `spot()`, `continueWriting(spot)`, `openNode(id)`, `placeNotes([{id, x, y, order}])`, `linkNotes(a, b)`. The Studio dispatches `lightbox:project` on `document` when the project or view changes.

The bundle was patched by hand in its app-code tail, as with the earlier rooms (see `writing-rooms.md`), and the same code is in `writing-studio.tsx`. No new modules or imports were added to the bundle: it reuses `scenesForDraft`, `sceneTiming`, `formatDuration`, `formatEighths`, `referenceInScene`, `compileNodes` and `inTrash`, which were already in scope.

## Tests
```sh
PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/atlas-light-table-qa.mjs
PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/story-cylinder-qa.mjs   # Classic view
```
