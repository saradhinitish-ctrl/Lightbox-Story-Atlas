# Writing rooms: the Spark, World Building, Field notes

The three places where writers answer questions about their story. Each one has its own room, and all three share the Light Table materials (paper, grid, red grease pencil, slate, edge print).

| Area | Room | Component |
|---|---|---|
| Story Foundation | **The spark**: eight takes, one question at a time, on a slate, with a film strip and a contact sheet | `export-tools/overrides/components/development-sheet.tsx` |
| Characters | **The casting session**: polaroid headshot, nine questions in three acts | `export-tools/overrides/components/planning-sheet.tsx` (`PlanningSheet`) |
| Locations | **The location recce**: 2.39:1 viewfinder, a live scene heading, eight questions | same |
| Objects | **The evidence tag**: manila card with a ruler, a typewritten log, eight questions | same |
| Research notes | **The field notebook**: dot-grid page, kind stamp, source, why it matters, the next question, thread status | same (`FieldNoteSheet`), mounted from `editorFor()` in `writing-studio.tsx` for text documents inside the Research section |

Styles: `writing-rooms.css` (loaded after `beat-table.css`). Classes are prefixed `.lbs` (spark), `.lbw` (world) and `.lbn` (notes).

## Shared behaviour
- Answers are written in borderless, auto-growing fields (`LbxText`) on ruled lines that scroll with the text.
- A director's note appears under an answer once it has six or more words; **Another note** cycles through the alternatives.
- Keyboard: ⌘/Ctrl+Enter goes to the next question, ⌘/Ctrl+Shift+Enter to the previous one. In the spark, ←/→/Home/End move along the strip. In a field note, Enter moves from the title to the source to the note.
- Motion: only transform, opacity and colour animate, except the spark's one-off focus pull on a new question. `prefers-reduced-motion` turns off every animation and transition in all three rooms.
- Phones: one column. The spark strip scrolls sideways, and the world index is hidden (the questions are inline).

## Data
Nothing is renamed, moved or removed, so no migration is needed. Saved work opens as before.

| Area | Keys |
|---|---|
| Spark | `development.seed`, `world`, `conflict`, `premise`, `theme`, `tone`, `logline`, `questions`: the same eight keys. The Atlas card still reads `premise` and `logline` |
| Character | `profile.role`, `want`, `voice`, `obstacle`, `relationships`, `fear`, `background`, `change` (existing; the old "Additional details" are now asked in place) + **`profile.secret`** (new) |
| Location | `profile.context`, `appearance`, `atmosphere`, `purpose`, `continuity`, `practical`, `references` (existing) + **`profile.history`** (new for locations) |
| Object | `profile.appearance`, `ownership`, `history`, `purpose`, `continuity`, `practical`, `references` (existing) + **`profile.moment`** (new) |
| Field note | **`research.kind`**, `research.source`, `research.why`, `research.next`, `research.status` (all new). The note's text stays in `html` |

Free writing (the spark's "margins", a profile's "loose pages", a field note's body) is still the document's `html`, so search, compile and Export PDF read exactly what they read before. Structured answers were never part of compile and still aren't.

The name of a profile or note is edited in place and is the document `title`. Clearing it restores `Untitled character / location / prop / note`.

## Rebuilding `script.js`
As described in `beat-timeline.md`, a fresh build pulls older library versions than the deployed bundle. So these changes were applied as a patch to the **app-code tail** of the deployed `script.js` (from `// components/development-sheet.tsx` to the end):

1. `node export-tools/build-portable.mjs --scripts-only` with the original overrides, giving the base build.
2. The same command with these changes, giving the new build.
3. `diff -u` of the two tails, applied with `patch` to the deployed tail. The deployed library head is kept byte for byte.
4. Check that every new top-level name in the tail is not declared at the top level of the deployed head.

To keep the shared React bindings (`import_react18`, `import_jsx_runtime19`, …) from being renumbered, these modules import React as a namespace (`import * as LbxReact from 'react'`) rather than adding named imports, and they add no new modules or icons.

## Verified
- Data saved by the production build (all eight foundation answers, every character, location and object field including the old "Additional details", free notes, a research note) shows up in the new rooms: 39 of 39 values.
- Export PDF of the draft and of a selected research note gives the same text and page count as production. The foundation exports exactly as before: it is saved with "Include in compile" off, so the selected-document export is unavailable for it in both builds.
- `tests/story-cylinder-qa.mjs` passes 8/8.
- Desktop (1440px) and phone (390px): no horizontal overflow. No console errors. Reduced motion: no animation or transition in any room.
