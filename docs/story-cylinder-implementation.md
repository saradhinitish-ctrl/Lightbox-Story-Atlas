# Lightbox Story Cylinder v2 — November 3, 2026

## What changed
The compressed Story Cylinder loader was replaced by a readable, editable JavaScript runtime and separate CSS stylesheet. Both are linked directly from `index.html`. Six independent cards on an invisible vertical cylindrical arrangement use a consistent 60-degree angular step and CSS 3D perspective. The layout has ground contact shading and card depth.

## Native functionality and controls
Cards open the native React workspace controls, not replica screens: screenplay, story foundation, research, visual language, sequence/beat timeline, and characters/locations/objects. Horizontal trackpad gestures, pointer dragging, arrow navigation, snapping and reduced motion are supported. Opening uses a card-to-workspace presentation overlay; returning via the Back to Story Cylinder action preserves the previously selected angle.

## Preserved data
`script.js` (portable React app), `styles.css`, original source files, IndexedDB persistence, editors and export routines are unchanged. Android artifacts are unchanged. No migrations or data deletion.

## Verification
Local Chromium/Playwright harness tested rendering at 320, 375, 768, 1440 and 1920px without horizontal overflow; click-to-open, return, restored position, dragging without accidental click, wheel rotation, arrow navigation and target handoff. JavaScript syntax and CSS parsing passed. The harness is not a full React+IndexedDB end-to-end test; test the live application and persistence before declaring complete production QA.

## Rollback
Pre-v2 main SHA: `ba38ecbeb740809ca704ed2c4708c4e5587e0cc3`.
Backup branch: `backup/pre-story-cylinder-v2-2026-11-03`.
Older backup: `backup/pre-cylinder-2026-11-03`.
Revert this commit to restore the immediately preceding experience. Do not delete browser site storage.
