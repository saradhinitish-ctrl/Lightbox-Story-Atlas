# Story Cylinder VII — geometry-first studio renderer

Branch: feat/story-cylinder-v7-studio-geometry. Rollback branch: backup/story-cylinder-v6-2026-11-03. Based on production commit 74334c17887e022206395ba4d2729b4ef4d0e72f.

## Architecture
- New isolated story-cylinder-v7.js and story-cylinder-v7.css replace only the retired v6 assets in index.html.
- Exactly five original React Atlas card contents are cloned once each (5 replicas, not 35). Native React handlers remain on the original, invisible Atlas nodes; clicks call those native controls.
- Static high-DPI Canvas2D renders the backdrop, projected circular top opening, shell, front wall, lower rim and floor shadow from one shared geometric radius. It rerenders only when the stage resizes.
- The same radius, pitch and relative orbit drive five GPU-friendly card transforms. The cards are tangent HTML planes with 3D side-flanges; text remains on a single legible DOM layer instead of being duplicated into narrow strips.
- Horizontal wheel, pointer drag, arrow navigation, snapping, reduced-motion behavior and selected-index persistence are retained.
- React card-data mutations replace only the corresponding live replica.
- IndexedDB, imported/exported data, screenplay editor and app bundle are untouched.

## QA checklist (needs real-browser execution before production)
- Confirm World Building nested destinations, Screenplay, Research, Foundation and Visual Language all launch correctly.
- Confirm content updates on source card while returning to Atlas.
- Confirm click vs drag, trackpad wheel, arrow keys, reduced motion, no overflow and narrow-device readability.
- Confirm layout in Chromium/Safari at 320,375,390,768,1200,1440,1920 pixels.
- Measure frame time and inspect browser screenshots against the user's reference mockup.
- Verify Vercel production SHA if promoted to main.

The accompanying reference images were not included with the request and cannot be visually compared yet.
