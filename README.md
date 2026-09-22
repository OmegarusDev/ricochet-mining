<p align="center">
  <a href="https://omegarusdev.github.io/ricochet-mining/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>Play in the browser</strong> — or install as an app from the live game page.</p>

# Ricochet Mining Co.

A pocket asteroid claim. Laser rocks until they break, haul shards to the REFINERY pad, then spend cash on upgrades — or buy a drill that bounces walls for free and wears down on rocks.

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

**Laser** — tap a rock. A red bolt fires from the pad; **2 shards** drop when the rock breaks. Laser Power starts at **5 damage**; Faster Shots starts at **2.00 s**. **Drills** — you start with **0** slots. **Drill Slot** (20 levels) adds one each. Stock drills deal **5 damage** and have **20 health** (+5% per Tougher Drill). Commons start at **20 HP**. The first launch is **$10**; each drill already in play doubles the fee. Walls bounce them without costing health. Rocks hit back with their own punch (Harder Hits and Softer Wear are separate). **Rebound** (Drills tab, after Bouncy Armor) is hidden until it unlocks: then a wall bounce charges the next rock hit. **Haul** — gold haulers dump at the pad; unclaimed shards are dim. A hauler closer to the pad than to new ore finishes the dump first. **Payday** — Richness adds more shards; Better Pay makes each shard worth more; Rarer Rocks (Survey) biases fancy types. **2x** on the HUD speeds the whole sim. **Survey** — more rocks, rocks sooner, and Bigger Field (the claim square; deliberately expensive). **Claim** — sector warps and Keep Forever upgrades. Tap an upgrade card (not Buy) to read exactly what it does.

New players get a welcome, then **Jobs**. The first jobs are: test your laser, destroy an asteroid, unload at the refinery, look around, buy an upgrade, buy a drill slot, launch a drill, bounce a wall, mine 5 more rocks, buy a second slot, fly two drills at once. After the last job, a congratulations tip closes the tutorial. After that, Jobs is a rotating board of three jobs. Jobs pay from the HUD **Jobs** pip, not Settings. **Replay tips** in Settings repeats the field tips, not the payouts.

A new player does not need this file. With the sheet collapsed, tips sit under the claim. With Upgrades open they overlay the field so the claim stays large.

The field is a square from **Bigger Field**, not the screen. Drag to pan, pinch or scroll to zoom, and double-tap the field to re-centre.

HUD left to right: Jobs, sector, cash with $/s under it, 2x, settings. Bottom bar: Buy Drill (live count · cost), cheapest upgrade, Upgrades.

## Tuning

Knobs live in [`js/sim/Tuning.js`](js/sim/Tuning.js). [`balance.html`](balance.html) is the greedy yardstick (stops at sector 8). No bundler — vanilla ES6 modules, relative imports. Saves are `localStorage` key `RICOCHET_MINING_SAVE_V4`.

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Localhost skips the service worker so a stale cache cannot blank the game.

Push to `main` deploys Pages via `.github/workflows/deploy-pages.yml`.
