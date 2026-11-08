# The Light Table — Lightbox theme

A lightbox is the lit table where film is laid out to be judged. The app is that table.

| Element | Meaning | Where |
|---|---|---|
| Opal surface with grain, grid and a soft lamp glow | The lit table | Behind every view |
| Graphite chassis with a measuring rule | The table's frame | Header, dock, toasts, Android download |
| White slide mounts with an inner window | Your work laid on the table | Story Foundation prompts, cards, dialogs |
| Frame numbers (`01A`, `02A`…) in film-edge orange | Edge print on motion-picture film | Foundation prompts, labels, cylinder counter |
| Red grease-pencil circle, underline and tick | A choice marked on a contact sheet | Current workspace, welcome headline, chosen template |
| Tape strips | A sheet held down on the table | Dialogs, the Android card |
| Sprocket strip | A frame on a strip of film | Beat timeline cards |
| Lamp flicker | The table switching on | Opening titles (off for reduced motion) |

## Tokens
Table `#EFEDE7`, mount `#FFFFFF`, ink `#1C1B19`, chassis `#18181A`, grease pencil `#D4301F` (text `#B3261A`), film edge `#E2692B` (text `#A4451A`).

## Type
Instrument Serif (titles), DM Sans (interface), DM Mono (edge print and labels), Big Shoulders Display (frame numbers). The first three are the cylinder's own fonts, so the cylinder sits in the theme natively.

## Files
- `light-table.css`: the design. Loaded last.
- `light-table-surfaces.css`: GENERATED. It re-inks the older layers' lime and lavender as grease-pencil red and film-edge orange. Rebuild with `(cd export-tools && npm install) && node tools/build-light-table.mjs`.
- `assets/fonts/big-shoulders-display-latin-wght-normal.woff2` (SIL OFL 1.1).

## Untouched, and verified
- **Story Cylinder:** a computed-style diff of all 143 card elements at 1440px and 390px shows 0 differences, and `tests/story-cylinder-qa.mjs` passes 8/8. Only the table, the title and the frame controls around it changed. The lime accents inside the cards are part of the cylinder and were left alone.
- **Screenplay page:** a computed-style diff shows 0 differences.
