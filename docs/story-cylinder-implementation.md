# Lightbox Story Cylinder III — November 3, 2026

## Cinematic five-card redesign
The app's five ORIGINAL Story Atlas panels are the only cards on the carousel: Screenplay, Story Foundation, Research & Exploration, Visual Language, and World Building. The cylinder copies the markup/content of the existing React cards (and refreshes it as the source React UI changes) instead of inventing additional panels. Cards are separately mounted and spaced at 72° around an invisible vertical cylindrical axis.

Each panel is portrait-oriented (approximately twice as tall as wide). The dark editorial stage, subtle horizon, realistic ground contact shadows and restrained lighting provide a more vertical, cinematic presence. Existing card content (premise, screenplay preview, research notes, visual scenes and Characters/Locations/Objects buttons) remains visible.

## Real workspace interactions
The clones delegate opening through the ORIGINAL React controls, not replacement editors: Screenplay, Foundation, Research, Visual and World Building's Characters/Locations/Objects. Beat Timeline is still available through the original scene reel and the main app, but no separate sixth cylinder card has been created. One bottom Story Cylinder arrow control navigates between the five panels. Side card clicks, pointer dragging, touch input, horizontal wheel/trackpad scrolling, keyboard arrows, momentum/snapping and a return-to-cylinder action are supported. Selected angle is restored when the native React Atlas remounts.

## Scope
Only `story-cylinder.js`, `story-cylinder.css`, `index.html` cache-busting references, and this document changed. The bundled React application, screenplay editor, IndexedDB persistence, project data, imports/exports, Android APKs and widgets were not modified. No migrations.

## Verification
Local Chromium smoke tests passed at widths 320, 375, 390, 768, 1440 and 1920 px with five original cards and no reported overflow or JS errors. Local interaction tests passed mouse clicking on side card, World→Locations on mobile, dragging without accidental opening, horizontal wheel, keyboard arrow, native navigation, return and restored position. This is a browser **harness** using representative React controls, not a comprehensive end-to-end production IndexedDB test. Check deployment and verify production separately.

## Rollback
Pre-v3 main commit: `102eb6466e9d527ae823bb4b4e674d35b0683f45`.
Immutable backup branch: `backup/pre-cinematic-five-card-v3-2026-11-03`.
To restore it, revert this v3 commit. Do NOT clear local site storage.
