# UPGRADE_SPEC.md — Rogue-Pachinko Enhancement Roadmap

**Repo:** [github.com/klampatech/rogue-pachinko](https://github.com/klampatech/rogue-pachinko)
**Last Updated:** May 18, 2026
**Status:** Post-bugfix baseline — all P0 bugs resolved, 7/7 critical issues verified fixed.

---

## Executive Summary

The game is **functionally complete and playable** — all 5 floors work, all 9 payloads are wired, jackpot and frenzy are live. But it's a proof-of-concept, not a product. This document spells out what to build next, tiered by impact and effort.

---

## P0 — Immediate Cleanups

> Things that are broken or missing that shouldn't be.

### P0-1: README.md does not exist
The repo has 0 stars, 0 forks, no description. A README is the minimum viable landing page.
- **What:** Write a `README.md` with game description, GIF demo, controls, and tech stack (single HTML file, no deps).
- **Effort:** Low. Template-based. ~50 lines.
- **Impact:** Makes the repo look alive. Could drive adoption.

### P0-2: `localStorage` persistence not wired
The `SPEC.md` describes full meta-progression (reputation, rank, unlockedPayloads, runHistory) but none of it is saved to `localStorage`. Every run starts fresh.
- **What:** Add `saveGame()` / `loadGame()` functions. Persist `GS.reputation`, `GS.rank`, `GS.unlockedPayloads`, `GS.unlockedUpgrades`, `GS.totalScore`, and a `runHistory[]` array (last 10 runs with floor reached + credits earned).
- **Effort:** Medium. ~30 lines of localStorage read/write.
- **Impact:** Makes the game feel persistent — the core rogue-like hook.

### P0-3: No end-of-run summary screen
When you run out of balls or complete floor 5, there's no summary. The game just freezes or resets silently.
- **What:** Add a `showRunEnd()` function that overlays: floors cleared, total score, credits earned, bonus balls remaining. Shows "CASH OUT" (convert credits to reputation) or "TRY AGAIN" button.
- **Effort:** Medium. Needs a new game state `run_end` and a corresponding overlay.
- **Impact:** Closure. Players need to know how they did.

---

## P1 — High Impact Features

> The next most important things to make the game feel *good*.

### P1-1: Multiplier Ball Colors
Currently all balls are the same cyan with the same trail. The cascade multiplier (x1 → x2 → x3 → x5 → x7) is invisible until you hit a peg.
- **What:** Color-code balls by current multiplier:
  - x1: Cyan (`#00f0ff`)
  - x2: Yellow (`#ffee00`)
  - x3: Orange (`#ff8800`)
  - x5: Red (`#ff2244`)
  - x7: White + bloom (`#ffffff`)
- Ball glow intensity and trail length also scale with multiplier.
- **Effort:** Low. Change ball color in `update()` based on `GS.multiplier`. Also update `GS.multiplier` correctly — it's currently not being incremented in `handlePegHit()`.
- **Impact:** The core progression loop becomes *visible*. Instant feedback.

### P1-2: Progressive Jackpot
The current jackpot pays `bonus = 500 * floor * mult` — static per floor, same every run.
- **What:** Jackpot starts at a base (e.g., 500 × floor) and **grows** by 10% each time it's NOT won. Resets to base when hit. Show the growing jackpot amount in the HUD. Make it feel like a slot machine payout that's been building.
- **Effort:** Low. Track `GS.jackpotPool` variable, increment on each slot spin that doesn't win, display in HUD.
- **Impact:** Creates anticipation. Players think "just one more run to build the jackpot."

### P1-3: Cascade Overload — combo chaining amplifies payloads
Currently payloads trigger once on first peg hit. But the game has a combo system (`comboCount`, `chainTimer`) that's visually unimpressive.
- **What:** When `GS.comboCount >= 3`, all payload effects get a **+1 tier**:
  - Cluster Ball: fires at 4 mini-balls instead of 3
  - Explosive Ball: radius increases from 80 to 120px
  - Slow-Mo Ball: duration doubles
  - Logic Bomb: chain explosion spreads to 2nd-degree neighbors
  - Ghost Ball: phase duration increases
- Add a visual indicator when "OVERLOAD" activates (screen edge glow, "OVERLOAD x3" text popup).
- **Effort:** Medium. Add tier upgrade logic in `handlePegHit()` payload switch, add visual FX.
- **Impact:** Makes combo play rewarding. High-skill players get amplified payloads.

### P1-4: Power Shop Items — permanent upgrades buyable with reputation
Currently the shop only sells payloads for `breachCredits` (floor currency). There's no way to spend `reputation` (meta-currency).
- **What:** Add a **Reputation Shop** tab in the shop overlay with permanent upgrades:
  - `Starting Balls +1` — Start with 6 balls instead of 5 (cost: 500 rep)
  - `Combo Master` — Chain timer window extended by 0.5s (cost: 750 rep)
  - `Breach Bonus` — Earn +25% breach credits per floor clear (cost: 1000 rep)
  - `Payload Starting Set` — Begin each run with 2 random payloads unlocked (cost: 600 rep)
  - `Jackpot Hunter` — Progressive jackpot grows +5% faster (cost: 800 rep)
- Display reputation in HUD (`⚡ 1,250 REP`). Reputation is earned by cashing out at run end.
- **Effort:** Medium. Add `reputationShopItems[]` array, update shop overlay to show 2 tabs (Breach Shop / Reputation Shop).
- **Impact:** The meta-progression loop closes. Players have a reason to keep playing.

### P1-5: Ball drop preview — trajectory hint
Currently you aim blindly. The ball drops and you see where it goes.
- **What:** On mouse move over the drop zone, draw a dotted arc showing the approximate first 3-4 bounces as a preview. Recalculate on mouse move. Don't show exact path — just a hint.
- **Effort:** Low. `Math.random()` placement means exact prediction isn't possible. Show a fan-shaped drop zone with 3 sample trajectories.
- **Impact:** Makes aiming feel intentional, not random. Improves game feel significantly.

---

## P2 — Polish & Delight

> Things that make the game *great* instead of just *functional*.

### P2-1: Screen shake tuning
Currently `screenShake` is applied on big events (floor clear, jackpot). But the intensity and duration are not tuned.
- **What:** Add a `shake(intensity, duration)` function with parameters. Map:
  - Peg hit: 2px, 50ms (barely noticeable)
  - Floor clear: 8px, 300ms
  - Jackpot: 15px, 500ms
  - Honeypot trigger: 10px, 200ms
  - Logic Bomb chain: 5px per chain link, cumulative
- Add `GS.screenShakeX/Y` offset applied to entire canvas transform.
- **Effort:** Low. ~15 lines.
- **Impact:** Makes every hit feel impactful. The difference between a flat game and a punchy one.

### P2-2: Particle density controls
Currently `MAX_PARTICLES = 200`. On low-end devices, this can cause stuttering.
- **What:** Add a `GS.particleQuality` setting: `high` (200 max), `medium` (100), `low` (50). Auto-detect on load based on `navigator.hardwareConcurrency` if available. Allow manual toggle in a minimal settings menu.
- **Effort:** Low. Add a cap in `updateParticles()`.
- **Impact:** Accessibility. Makes the game playable on older laptops.

### P2-3: Sound design stub — Web Audio API
The spec says audio is fallback to visual, but there's no audio at all.
- **What:** Add Web Audio API sound effects stubs:
  - Ball drop: short "whoosh" (oscillator sweep)
  - Peg hit: short "tick" (white noise burst)
  - Multiplier up: rising tone
  - Floor clear: victory chord
  - Jackpot hit: slot-machine coin cascade sound
- All sounds are short (< 200ms). Wrap in `try/catch` so they never block gameplay.
- **Effort:** Low. ~40 lines of Web Audio.
- **Impact:** The game feels "alive" even when you're not looking directly at it.

### P2-4: Combo counter HUD redesign
Currently `comboCount` is displayed in the HUD but it's small and easy to miss.
- **What:** Make the combo counter prominent — center it or give it a dedicated spot in the HUD. Show current multiplier tier with a color-coded badge. When combo is about to expire, flash the timer.
- Update `updateHUD()` to show `x3 COMBO` in large text during active combo, not just in the corner.
- **Effort:** Low. CSS changes to HUD positioning.
- **Impact:** The core skill expression — chain hits — becomes visible and satisfying.

### P2-5: Jackpot Slots animation
The slot reels (`reels[0].textContent`, `reels[1].textContent`, `reels[2].textContent`) are shown but there's no spin animation — they just snap to the result.
- **What:** On `startSlots()`: 3 reels spin for 1.5s with rapid random cycling, then decelerate and land on the result (ease-out). Each reel lands staggered (0.3s apart). Add a "SPINNING..." state with blur effect on reels.
- **Effort:** Medium. CSS animation + JS timer orchestration.
- **Impact:** The jackpot is the biggest payoff in the game — it deserves ceremony.

---

## P3 — Feature Gaps from SPEC.md

> Things in the original spec that were never implemented.

### P3-1: Worm Payload (ball pierces through pegs)
SPEC.md lists "Worm" as a payload: "Ball pierces through pegs without bouncing."
- **What:** Add `case 'worm':` in `handlePegHit()` that sets `ball.bouncesRemaining = 0` and `ball.piercing = true`. Pegs hit in piercing mode still trigger scoring/progress but no bounce physics applied.
- **Effort:** Low. ~10 lines.
- **Impact:** Adds variety to payload play. Makes Worm a distinct strategic choice.

### P3-2: Ghost Mode floor objective
SPEC.md describes a "Ghost Mode" objective: "Clear without hitting any ICE (orange pegs)."
- **What:** Add `floorObjective.type = 'ghost'` in `generateBoard()` for floor 3+. When triggered: `objective.target = pegs.filter(p => p.type !== 'ice').length`. Win condition becomes "hit 0 ICE pegs." Add ghost mode HUD indicator.
- **Effort:** Medium. Needs objective type checking in `checkFloorComplete()`.
- **Impact:** Adds a new strategic layer. Players must navigate carefully, not just slam balls through.

### P3-3: Honeypot peg visual warning
The honeypot (red trap peg) ends the ball early and steals a payload. Players can't tell it's a honeypot until they hit it.
- **What:** Add a "trap" indicator — honeypot pegs pulse more aggressively than other pegs, with a subtle red glow halo. Add a `isHoneypot` property that triggers a warning flash when a ball gets within 2× peg radius.
- **Effort:** Low. Add visual flair to `drawPegs()` for honeypot type.
- **Impact:** Honypot becomes a deliberate risk/reward choice, not a surprise trap.

### P3-4: Time Lock floor objective
SPEC.md mentions "Time Lock: Clear within a time limit." Never implemented.
- **What:** Add `floorObjective.type = 'timelock'` and `floorObjective.timeLimit = 60` (seconds). Track elapsed time in `update()`. If `timeRemaining <= 0`, trigger early end. Show countdown timer in HUD.
- **Effort:** Medium. Needs timer tracking, HUD element, and win/lose condition logic.
- **Impact:** Another objective type that changes strategy. Rush vs. methodical.

### P3-5: ICE peg hit counter display
SPEC.md says "ICE — Hard bounce, -1 ball if hit 3x in one drop." Currently ICE pegs track hits but there's no visual display of 0/3 hits.
- **What:** Show 3 small dots below each ICE peg. Each hit fills a dot (cyan → filled). On 3rd hit: flash red, reduce `GS.balls` by 1, show "-1 BALL" float text.
- **Effort:** Low. Draw 3 small circles under ICE pegs in `drawPegs()`, update state on hit.
- **Impact:** Makes ICE a visible threat to monitor, not a surprise.

### P3-6: Run history screen
SPEC.md says `runHistory[]` tracks last N runs.
- **What:** Add a "STATS" button on the main menu. Shows: total runs, floors cleared average, best floor, total reputation earned, best jackpot. Data persisted in `localStorage`.
- **Effort:** Medium. Needs a new `stats` overlay and `renderStats()` function.
- **Impact:** Gives players a sense of progression across sessions. "I've done 47 runs and my best is floor 4."

---

## Implementation Priority Order

```
P0-1  README.md                           (Low effort, high visibility)
P0-2  localStorage persistence            (Medium effort, core loop closer)
P0-3  End-of-run summary screen           (Medium effort, closure)
P1-1  Multiplier ball colors             (Low effort, instant game feel)
P1-2  Progressive jackpot                 (Low effort, retention hook)
P1-5  Ball drop trajectory preview        (Low effort, intentional aiming)
P2-4  Combo counter HUD redesign          (Low effort, skill visibility)
P2-5  Jackpot slots animation             (Medium effort, payoff ceremony)
P1-4  Reputation shop (permanent upgrades)(Medium effort, meta-progression loop)
P1-3  Cascade Overload (payload tiers)   (Medium effort, skill amplification)
P2-1  Screen shake tuning                 (Low effort, impact feel)
P3-5  ICE peg hit counter display         (Low effort, threat visibility)
P3-1  Worm payload                        (Low effort, payload variety)
P2-2  Particle density controls           (Low effort, accessibility)
P2-3  Web Audio sound stubs               (Low effort, aliveness)
P3-3  Honeypot visual warning             (Low effort, risk/reward clarity)
P3-2  Ghost Mode objective                (Medium effort, objective variety)
P3-4  Time Lock objective                 (Medium effort, objective variety)
P3-6  Run history / stats screen          (Medium effort, long-term retention)
```

---

## Current File Inventory

| File | Lines | Status |
|------|-------|--------|
| `index.html` | ~2,931 | Game engine — fully playable, all P0 bugs fixed |
| `SPEC.md` | 295 | Design doc — current spec |

**Missing:**
- `README.md` ← P0-1
- `UPGRADE_SPEC.md` ← this file

---

*End of UPGRADE_SPEC.md*