# Lightbox Story Cylinder IV — November 3, 2026

## Horizontal cinema on white
User-approved horizontal cylinder direction: five native React Atlas cards are copied into an independent, studio-lit carousel, with a pure white backdrop, delicate lavender elliptical inner rim, softly blended grounded shadows, elegant serif type and the screenplay in the featured dark/acid-lime center position. The five surfaces are Story World Building, Research & Exploration, Screenplay, Visual Language, and Story Foundation. There is no sixth cylinder card.

## Real content and workspaces
The native React Atlas remains mounted and is the source for card content, scene counts, notes, manuscript preview, and World Building's Characters / Locations / Objects controls. Each card delegates activations to existing original controls, retaining the real workspace and projects. Navigation supports arrows, Mac horizontal trackpad/wheel, dragging and keyboard. Return from workspace preserves cylinder focus. No databases, editors or app source bundles were altered.

## QA
Local Chromium test harness passed responsive widths 320, 375, 390, 768, 1200, 1440 and 1920 with zero horizontal overflow and exactly five cards. Interaction tests passed original workspace actions (including World Locations), actual side-card pointer click, horizontal wheel, drag without accidental open, keyboard navigation, return with selected index restored. Local test harness is representative, not a substitute for live production IndexedDB testing.

## Files changed
Only story-cylinder.js, story-cylinder.css, index.html references (?v=4), and this note. All other application files and persistent state remain unchanged.

## Rollback
Pre-v4 commit: `9449d1dcb3d835e36d027001eede965964f578f0`.
Backup: `backup/pre-white-cinematic-cylinder-v4-2026-11-03`.
To restore, revert the v4 commit. Do not clear stored projects or local storage.
