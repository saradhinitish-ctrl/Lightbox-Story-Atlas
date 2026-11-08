# Projection Room — redesign chunk 1 (theme foundation)

The room is dark; the work is lit. A warm charcoal studio with one amber light.

## Files
- `projection-room.css`: hand-written tokens, type, chrome, first page, the Atlas room, opening titles. Loaded last.
- `projection-room-surfaces.css`: GENERATED dark remap of every hard-coded light colour in the older layers, keeping each rule's selector and `!important`. Rebuild with:
  `(cd export-tools && npm install) && node tools/build-projection-room.mjs`
- `assets/fonts/`: Fraunces (display), Geist (interface), JetBrains Mono (labels). Self-hosted, SIL OFL 1.1 (licences in `THIRD_PARTY_LICENSES/`).

## Tokens
Canvas `#14120F`, panel `#1B1915`, raised `#24211C`, line `#2F2B25`, ink `#EDE6D8`, secondary `#B8AE9D`, muted `#91887A`, amber `#F2A33A`.

## What is deliberately untouched
- **Story Cylinder**: geometry, canvas, script and cards. Card variables and inherited type are pinned to their pre-redesign values. Verified by a computed-style diff of all 143 card elements at 1440px and 390px (0 differences) and by `tests/story-cylinder-qa.mjs` (8/8 viewports pass). Only the room around it (backdrop, title, arrows, dots) changed.
- **Screenplay page**: stays lit paper in Courier. Variables are pinned so the page renders as before. The only difference is the gap between pages, which now takes the dark desk colour.
- Older stylesheets are not edited, so a light mode (chunk 5) can be layered back in later.

## Known follow-ups (later chunks)
- The app icon and logo still carry the lime "Lit Spine" bar (chunk 6).
- The light theme, Warm Paper (chunk 5).
- Layout redesigns: Story Foundation (2), Visual Language (3), writing and planning screens (4).
