# Slot Protocol

*A cyberpunk pachinko roguelike.*

Drop balls through a procedurally-generated board, trigger chain reactions, hit jackpots, and buy upgrades in a shop between runs. Mastery points spent on permanent upgrades create long-term progression alongside short-term run decisions.

---

## How to Play

Open `index.html` in a browser. Click **INITIATE BREACH** to start a run.

**Controls:**
- **Mouse / Touch:** Click/tap to drop a ball. Drag left/right to aim.
- **On mobile:** Tap and hold to aim, release to drop. 300ms tap delay prevents accidental drops.

**Goal:** Clear pegs to fill the progress bar. Reach floor 5 and clear the vault to complete a full breach. Runs take 2–5 minutes depending on ball management and luck.

---

## Features

- **5 floors** with increasing board complexity and new peg types
- **8 peg types** — node, ice, fiber, mirror, cache, honeypot, overload, seismic
- **12 payload types** — scrambler, trojan, worm, logic bomb, daemon, ghost, cluster, explosive, slow-mo, and more
- **Chain reactions** — explosive pegs trigger cascading explosions, ball splits spawn mini-balls
- **Peg evolution** — pegs evolve through dormant → glowing → charged → explosive states on repeated hits
- **Progressive jackpot** — grows 15% per missed spin, resets on a win
- **Reputation + rank system** — earn rep per run, unlock new payloads and upgrades at rank thresholds
- **Prestige mastery** — earn mastery points per run, spend on 6 permanent upgrades (extra balls, jackpot bonus, credit magnet, shop discount, payload start, peg radar)
- **7 ball skins** — unlocked via achievements and rank milestones
- **Daily challenges** — date-seeded modifier combinations, new challenge every day
- **Local leaderboard** — top 10 scores with name entry
- **Mobile-ready** — touch drag-to-aim, 300ms tap delay, in-bounds clamp

---

## Screenshots

```
mockups/gameplay-1.png    — Floor 1 gameplay with ball mid-flight
mockups/shop-overlay.png  — Shop screen between floors
mockups/run-end.png       — Run-end screen with stats and score entry
mockups/main-menu.png     — Main menu with all buttons
mockups/daily-challenge.png — Daily challenge mode
```

---

## Technical

Single `index.html` file — no build step, no dependencies. Works offline once loaded.

Tested in Chrome/Firefox/Safari. Mobile Safari and touch devices supported.

---

## Project

Built with a multi-agent AI coding team (BERT, ERNIE, GROVER, ELMO) running autonomously.

`github.com/klampatech/rogue-pachinko`