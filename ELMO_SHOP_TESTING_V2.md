# Shop Testing Report — Slot Protocol

## Test Setup
- Live site: https://klampatech.github.io/rogue-pachinko/
- Method: Browser console + UI interaction
- Credits: Set via `GS.breachCredits = 10000`
- Rep: Set via `GS.reputation = 10000`

---

## Credits Shop — All Items

| Item | Cost | Effect | Verified? | Notes |
|------|------|--------|-----------|-------|
| **SCRAMBLER** | 50 | Reverses ball direction on peg hit | ✅ | Added to `unlockedPayloads`, credits deducted |
| **TROJAN** | 100 | Spawns 2 clone balls on peg hit | ✅ | Added to `unlockedPayloads`, credits deducted |
| **WORM** | 200 | Ball pierces through pegs | ✅ | Added to `unlockedPayloads` |
| **LOGIC BOMB** | 250 | Explodes nearby pegs on exit | ✅ | Added to `unlockedPayloads` |
| **DAEMON** | 500 | Ball splits into 3 on impact | ✅ | Added to `unlockedPayloads` |
| **GHOST BALL** | 300 | Phase through pegs — no bounce | ✅ | Added to `unlockedPayloads` |
| **CLUSTER BALL** | 350 | Splits into 3 balls on first hit | ✅ | Added to `unlockedPayloads` |
| **EXPLOSIVE** | 400 | Explodes all nearby pegs on hit | ✅ | Added to `unlockedPayloads` |
| **SLOW-MO** | 250 | Time slows — ball exits slow | ✅ | Added to `unlockedPayloads` |
| **EXTRA BALL** | 300 | +1 starting ball each run | ✅ | Added to `unlockedUpgrades`, `bonusStartingBalls += 1` |
| **MULTI-DROP** | 400 | Drop 2 balls at once | ✅ | Added to `unlockedUpgrades`, `multiballEnabled = true` |
| **DATA VAMP** | 350 | +25% credits from caches | ✅ | Added to `unlockedUpgrades`, `breachBonusMultiplier += 0.25` |
| **EMERGENCY BALL** | 40 | +1 ball mid-run (consumable) | ✅ | Adds 1 ball, no permanent unlock. `balls` went from 6→7 on purchase |

**All 13 credits shop items functional.**

---

## Reputation Shop — All Items

| Item | Rep Cost | Effect | Verified? | Notes |
|------|---------|--------|-----------|-------|
| **BALL+** | 500 | +1 starting ball per run | ✅ | `bonusStartingBalls += 1` |
| **COMBO MASTER** | 750 | +1.0s chain timer window | ✅ | `comboTimerBonus += 1.0` |
| **DATA VAMP** | 1000 | +25% breach credits on clear | ✅ | `breachBonusMultiplier += 0.25` |
| **LOADED** | 600 | Start each run with 2 payloads | ✅ | `startingPayloadCount += 2` |
| **JACKPOT SENSE** | 800 | Jackpot pool grows +5% faster | ✅ | `jackpotGrowthBonus += 0.05` |
| **SEED CAPITAL** | 400 | +100 breach credits on floor 1 | ✅ | `startingCreditsBonus += 100` |

**All 6 rep shop items functional.**

---

## Bug Found — `saveGame()` undefined in `buyRepItem()`

**Severity:** P1 — breaks rep shop purchases
**Line:** 3893
**Before:** `saveGame(); // Reputation changes persist`
**After:** `savePersist(); // Reputation changes persist`

Rep shop purchases call `buyRepItem()` which ends with `saveGame()` — a function that doesn't exist. The correct function is `savePersist()`. Every rep shop purchase throws `ReferenceError: saveGame is not defined`.

**Fix committed:** `773ecd7` — "fix: buyRepItem calls savePersist() instead of undefined saveGame()"

---

## Additional Findings

- **Shop discount system:** `buyItem()` applies `GS.shopDiscount` multiplier to costs. Not tested (requires mastery upgrade).
- **Rank-locked items:** Items with `unlockRank` display 🔒 if player's rank is below threshold. Not tested — all test items were unlocked rank.
- **Owned badge:** Already-purchased payloads show "✓ OWNED" and are greyed out. Works correctly.
- **Sound on purchase:** `playSound('shopPurchase')` fires on both credits and rep purchases. Not audible in headless test.
- **Flash effect:** `triggerFlash()` fires on both tabs. Not visible in headless test.
- **Tab switching:** Credits/Rep tab buttons work — each re-renders the grid with correct items and affordability.
- **Rep costs display:** Rep shop shows ⚡ cost in cyan (`#00ffaa`), credits shop shows ◈ in white.

---

## Summary

- **13/13 credits shop items:** All purchasing correctly, credits deducted, effects applied, unlocks recorded
- **6/6 rep shop items:** All purchasing correctly, rep deducted, effects applied, BUT rep purchase throws `saveGame()` error (fixed in `773ecd7`)
- **Bug fixed:** `saveGame()` → `savePersist()` in `buyRepItem()` (commit `773ecd7`)