# Ricochet Mining Co.

A pocket asteroid claim. Tap rocks until they split, haul chips to the REFINERY pad, then spend cash on the next upgrade — or launch a probe that banks walls for free and trades hull with rocks.

Open [`index.html`](index.html) locally, or the GitHub Pages URL for this repo. It is a PWA: Add to Home Screen / WebAPK works; `sw.js` cache-firsts assets (`ricochet-v18`) and network-firsts navigations.

## Loop (four verbs)

**Mine** — tap until a rock shatters. Ore drops on the break. **Launch** — paid kinetic birds; walls charge them (BANKED), rocks exchange HP. **Haul** — gold drones dump at the pad; unclaimed chips are dim. **Claim** — density, spawn, and sector warps. Jobs pay from the HUD pip, not Settings.

A new player does not need this file. Field tips cover shatter → pad → peek buy → launch. The claim is a fixed square from the sector, not the screen; drag to pan, pinch or scroll to zoom, and the top-left fit control lines the walls up with the narrow screen edges.

## Tuning

Knobs live in [`js/sim/Tuning.js`](js/sim/Tuning.js). [`balance.html`](balance.html) is the greedy yardstick (stops at sector 8). No bundler — vanilla ES6 modules, relative imports.
