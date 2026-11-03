# Lightbox Story Cylinder VI — performance and rendering refinement

Updated November 3, 2026. Production branch: main.

## Changes
- Preserves five original React Atlas cards: World Building, Research & Exploration, Screenplay, Visual Language, Story Foundation; no additional cards.
- All five cards follow a shared cylindrical arc. Each face is projected onto seven clipped 3D tangent slices (35 copies total, reduced from 55). Geometry pitch is 21.8 degrees, shared curved-face radius retained.
- White studio background, lavender elliptical opening, shell fascia, nuanced ambient lighting, depth and soft floor contact shadows are retained; rendering fidelity is not intentionally reduced.
- Animation updates use time-based smoothing and target-only display changes rather than triggering full HTML rechecks on every frame. Content updates are refreshed when the original React card changes, not when the internal HUD animates.
- Card activation delegates to the existing React components. World Building Characters / Locations / Objects buttons work as native workspace actions. Returning to Atlas restores the chosen card.

## Local QA and performance
Fresh Chromium tests passed at widths 320, 375, 390, 768, 1200, 1440 and 1920px with no horizontal overflow, five cards, 35 facets, and no uncaught JavaScript errors. Real side-card pointer click, World→Locations, arrow input, trackpad-style horizontal wheel input, pointer drag, keyboard, return navigation and original React card-content refresh passed.
In the test harness, animation-related Chrome TaskDuration for three rotations decreased from roughly 1.11 seconds to 0.142 seconds. This is a local synthetic comparison and not a guarantee of production device performance.

## Scope and rollback
Changed: story-cylinder.js, story-cylinder.css, index.html cache-bust references (?v=6) and this document. No change to React application bundle, editors, project data, IndexedDB, imports/exports or Android package.
Previous production SHA: `93ec630061814f482a5cc4486a12351ef6db4ae4`.
Backup: `backup/pre-optimized-story-cylinder-v6-2026-11-03`.
To restore, revert v6 commit without clearing local data.
