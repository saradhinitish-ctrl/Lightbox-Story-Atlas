# Depth in the app

The Atlas is a room with three depths: the far wall (the safelight's pool of light on it), the lamp that hangs nearer, and the prints in your hands. They now answer you at different rates, so the room has depth without a single extra layer to paint.

## What moves
| Layer | Moves by | Driven by |
|---|---|---|
| Wall light (`.lbd-beam`, inside the clipped `.lbd-wall`) | up to 1.2% of the room's width (at least 6px) | the sideways swipe along the line (phone), the cursor (desk), a tilt of the phone (where the browser offers the sensor freely) |
| Safelight (`.lbd-lamp`) | 1.7× the wall | the same |
| Prints | their own physics (`story-cylinder-v9.js`): pendulums, air, lift, tilt toward the cursor | unchanged |

It is a `translate` on two elements per frame, each write cached so nothing is touched when the value has not changed. The wall's canvas slides inside a clipped box, so the room can never grow a sideways scroll (`tests/depth-qa.mjs` checks both extremes on a desk and a phone).

Under reduced motion none of it moves. The tilt listener never asks for permission: on iOS, which wants a prompt, the event never arrives and the swipe and cursor do the work.

## Layers on a phone
While the kit is open (`html.fk-kit-open`), the studio behind it steps back to 95.5% with the same spring the sheet rises on, the way a sheet sits over a page. The bar, sheet and veil are siblings of `#root`, so only the studio scales. It is `scale` on one composited layer, off under reduced motion.

## Cost
Measured on a phone profile while swiping the line: p95 frame under 22 ms (`tests/depth-qa.mjs`). The darkroom's own loop is unchanged and still stops while the tab is hidden or the Atlas is off screen.
