# Lightbox Story Cylinder — November 3, 2026

## Production integration
The static web application's existing React workspace, screenplay editor, local IndexedDB storage and exports are preserved. A deferred presentation-only script loads after the portable application. It finds the original Story Atlas cards and arranges them as independent, flat cards on an invisible CSS 3D cylinder. Scrolling, touch gestures, drag and keyboard arrow navigation rotate the deck. Clicking a card produces a flip/expand transition, then invokes the original React action so the actual workspace opens. A Back to cylinder button restores Atlas navigation.

Original design backup branch: `backup/pre-cylinder-2026-11-03` (head `4572269769c6111ace0d1dc7ad20605ff88de395`).

## Scope and limits
This modifies presentation and navigation only. It does not introduce a new database or rewrite any editor. The animation temporarily represents the card flipping into the workspace; the native editor takes over after the transition. Browsers without `DecompressionStream` retain the original Atlas. Reduced-motion preference disables flip animations. The mobile design uses narrower cards. Native Android widgets and APKs are unchanged.

## Rollback
To restore the exact former design, revert the commit that adds `story-cylinder.js` and its deferred `index.html` reference, or redeploy the backup branch. Do not delete or clear site storage.
