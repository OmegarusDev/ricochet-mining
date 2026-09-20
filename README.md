<p align="center">
  <a href="https://omegarusdev.github.io/ricochet-mining/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>Play in the browser</strong> — or install as an app from the live game page.</p>

# Ricochet Mining Co.

A pocket asteroid claim. Laser rocks until they split, haul chips to the REFINERY pad, then spend cash on the next upgrade — or buy a drill that bounces walls for free and trades hull with rocks.

## Play

Click the badge above, or open **[omegarusdev.github.io/ricochet-mining](https://omegarusdev.github.io/ricochet-mining/)**.

## Install (WebAPK / home screen)

Install from the live Pages site — not from this README. On Android Chrome that install is a WebAPK and launches **fullscreen** (status bar hidden).

1. Open [omegarusdev.github.io/ricochet-mining](https://omegarusdev.github.io/ricochet-mining/) in **Chrome** (Android) or Safari (iOS).
2. **Android:** browser menu → **Install app** / Add to Home screen.
3. **iPhone / iPad:** Share → **Add to Home Screen**.
4. **Desktop Chrome:** install icon in the address bar.

If an older home-screen icon still shows the clock, remove it and install again after this build is live. Do not stack the HTML Fullscreen API on top of the installed app — that is what brought the status bar back on other titles.

## Loop

**Laser** — tap a rock. A red bolt fires from the pad; ore drops when the rock shatters. **Drills** — paid kinetic ships. Launch cost is `$14 + $7 × drills already in play`. Walls bounce them without hull loss. Rocks trade HP. **Rebound** (Drills tab, after Elastic Plating) is hidden until it unlocks: then a wall bounce charges the next rock hit. **Haul** — gold haulers dump at the pad; unclaimed chips are dim. **Scanners** — rock cap, spawn rate, and Survey Grid (claim square size). **Claim** — sector warps. Jobs pay from the HUD **Jobs** pip, not Settings.

A new player does not need this file. Field tips cover shatter → pad → peek buy → launch. With the sheet collapsed, tips sit under the claim. With Upgrades open they overlay the field so the claim stays large.

The claim is a square from **Survey Grid**, not the screen. Drag to pan, pinch or scroll to zoom, and the top-left fit control lines the walls up with the narrow screen edges.

HUD left to right: Jobs, sector, cash, $/s, 2x, settings. Peek bar: Buy Drill (live count · cost), cheapest upgrade, Upgrades.

## Tuning

Knobs live in [`js/sim/Tuning.js`](js/sim/Tuning.js). [`balance.html`](balance.html) is the greedy yardstick (stops at sector 8). No bundler — vanilla ES6 modules, relative imports. Saves are `localStorage` key `RICOCHET_MINING_SAVE_V4`.

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Localhost skips the service worker so a stale cache cannot blank the game.

Push to `main` deploys Pages via `.github/workflows/deploy-pages.yml`.
