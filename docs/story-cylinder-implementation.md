# Lightbox Story Cylinder V — physically curved surfaces

Updated November 3, 2026.

## Geometry and visual system
The carousel keeps the user-approved white studio-lit rendering, purple ellipse, acid-lime screenplay accent and grounded shadows, but now positions and bends five genuine Story Atlas cards around a common circle. Each of the five cards uses eleven 3D strips with perspective, depth and rotation derived from the same cylindrical radius. A subtle shell connects the silhouette visually without replacing the cards with an image. This is a CSS/JavaScript implementation, not a raster mockup.

Five original sections only: World Building, Research & Exploration, Screenplay, Visual Language, Story Foundation. Original React Atlas markup is the source of displayed card content. No sixth card and no replacement editor.

## Interaction and stability
Existing React controls perform all workspace opening, including original World Building Characters/Locations/Objects. Rotation supports pointer drag, horizontal trackpad/wheel, arrows and keyboard controls. The original Atlas remounts on return; the selected card is preserved and React data changes update all 11 surface strips.

## Local QA
Chromium smoke checks passed on viewports 320, 375, 390, 768, 1200, 1440, 1920 without horizontal overflow. Local tests passed native React workspace navigation, real click on World→Locations and on side cards, drag without accidental opening, wheel, keyboard, returning to Atlas and live card-content synchronization after changes. No uncaught browser JS errors. These are harness checks, not a complete live production IndexedDB/persistence audit.

## Scope and rollback
Changed files: `story-cylinder.js`, `story-cylinder.css`, `index.html` reference versions (?v=5), and this document. The React bundle, editors, IndexedDB data, projects, imports/exports, and other site functions were not modified.

Previous production SHA: `21ccdf532efec9981d7d4ee088b5da97aeb4f946`.
Backup branch: `backup/pre-physically-curved-cylinder-v5-2026-11-03`.
Revert the v5 commit to roll back. Do not clear site storage.
