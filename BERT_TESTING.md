# BERT Play-Test Report: Rogue Pachinko
**Updated:** May 18, 2026
**Tester:** Bert
**Game:** Slot Protocol (rogue-pachinko)
**URL:** `http://localhost:8765/index.html` | `file:///home/kyle/projects/rogue-pachinko/index.html`
**File:** `/home/kyle/projects/rogue-pachinko/index.html` (~4,484 lines, ~169KB)

---

## Executive Summary

Core loop is functional and correct. The ball-economy design is intentional — no free refills, 5 balls per run — but the UX creates a deceptive "stuck" sensation because the failure feels abrupt and unexplained. This is the #1 issue to address. Everything else is minor polish.

---

## Critical: Ball Refill Investigation

### What actually happens

**Starting balls:** 5 per run (set in `startNewRun()`, line 3784). No per-floor refill.

**Ball drain rate observed:**
- Each ball takes ~8–12 seconds to exit the board (gravity pachinko, bounces off pegs)
- In automated drop testing: 2 balls cleared in ~8 seconds of real time
- Floor 1 (56 pegs, clear 20 to complete) — a skilled/lucky player might clear in 1–2 balls; a normal player uses 3–4

**When balls hit 0:**

The game checks in the main loop (line 4289):
```
if (GS.ballsInPlay.length === 0 && GS.balls <= 0 && GS.screen === 'playing')
```
Then:
- **Objective complete** → `completeFloor()` → floor-clear overlay → shop → next floor
- **Objective NOT complete** → `endRun(false)` → run-end overlay with stats

This is **correct by design**. The resource pressure is intentional. The game ends when you run out of balls before completing the objective.

### Why Kyle felt "stuck"

Because `endRun(false)` fires silently — no explicit "GAME OVER" message beyond the run-end overlay. The player sees the run-end screen but may not realize the run was deliberately ended due to ball depletion. The transition from "1 ball left, barely trying" to "back at menu" happens in one frame with no intermediate state.

### Current shop ball options (not helpful mid-fail)

| Item | Cost | Type | Effect |
|---|---|---|---|
| EXTRA BALL | 300 credits | Permanent upgrade | +1 starting ball each run |
| MULTI-DROP | 400 credits | Permanent upgrade | Drop 2 balls simultaneously |

There is **no consumable ball purchase** — no way to spend credits during a failing run to restore balls.

### The EMERGENCY BALL Fix (Recommended)

Add to `SHOP_ITEMS`:
```javascript
{ id: 'emergency_ball', type: 'consumable', name: 'EMERGENCY BALL', icon: '⚡', cost: 40, desc: '+1 ball mid-run — use it!' }
```

And in `buyItem()` at line 3152, handle the consumable case:
```javascript
if (item.type === 'consumable') {
  if (id === 'emergency_ball') GS.balls++;
  // deduct cost, close shop, return to playing
  return;
}
```

This gives players a 40-credit safety valve without breaking economy — a player who wastes balls can recover once, at a cost that matters.

### Ball count HUD

The HUD shows 5 dots at the bottom-left. Each dot represents one ball. When all 5 are gone, the dots are empty (`.empty` CSS class applied at line 2757). This is working correctly.

---

## Verified Working Features

| Feature | Status | Notes |
|---|---|---|
| Ball drop (click/tap) | ✅ Working | `dropBall()` decrements `GS.balls`, guards against `balls <= 0` |
| Ball physics | ✅ Working | Balls bounce, exit bottom, physics loop runs at 60fps |
| Floor objective (clear N pegs) | ✅ Working | `peg.hitCount` tracked per peg, `floorObjective.progress` incremented |
| Floor completion → `completeFloor()` | ✅ Working | Credits awarded, floor overlay shown, `initJackpotSlots()` called |
| Jackpot slot machine | ✅ Working | 3-reel spinner, progressive jackpot, minor win (2-of-a-kind), reroll logic |
| Shop opens after floor clear | ✅ Working | `floor-continue-btn` → `openShop()` → `shop-overlay` active |
| Buying shop items | ✅ Working | Items deducted from credits, added to `GS.unlockedPayloads` |
| Shop → continue to next floor | ✅ Working | `closeShop()` → `startNextFloor()` → `startFloor()` |
| Ball count HUD dots | ✅ Working | 5 dots, empty dots when `i >= GS.balls` |
| Run-end screen (win) | ✅ Working | `endRun(true)` — full stats, rank display, meta-progression |
| Run-end screen (loss) | ✅ Working | `endRun(false)` — called when balls=0 and objective incomplete |
| New run from menu | ✅ Working | `startNewRun()` resets everything, `startFloor()` begins floor 1 |
| Persistent localStorage | ✅ Working | `PERSIST` object saves stats, rank, reputation across sessions |
| Peg Evolution (Spec 1) | ✅ Code wired | State machine in `handlePegHit()`, visual rendering in `drawPegs()`, dormant activation in game loop |
| Meta-Progression (Spec 6) | ✅ Code wired | `evaluateUnlocks()` called in `endRun()`, unlocks shown on run-end screen, prestige button bound |
| Expression-based unlocks | ✅ Working | Rep floors, total pegs, boss kills, combo milestones all checked |
| Rank progression | ✅ Working | 7 ranks (Script Kiddie → Legend), rank-up fanfare on run end |

---

## Minor Issues

### 1. Menu DOM shows "RUN COMPLETE" text on load
When localStorage has a saved run that ended, the DOM snapshot shows `StaticText "RUN COMPLETE"` in the canvas area even from the menu screen. The canvas overlay renders correctly on top, so this is visual-only and not gameplay-affecting.

### 2. Shop is mandatory between all floors
There is no "skip shop" button. Even with 0 credits, players must click through the shop overlay. This is fine once but noticeable across 5 floors.

### 3. `localStorage.clear()` doesn't fully reset `PERSIST` on the menu
The menu stats (RANK, REPUTATION, LIFETIME BREACH) reload from localStorage on page load. Clearing localStorage mid-session requires a full reload to re-initialize `PERSIST`. Not a bug, just an edge case.

### 4. No in-game ball purchase — EMERGENCY BALL gap
Documented in Critical section above.

---

## Ball Economy — Quantified

| Scenario | Balls Used | Pegs Cleared | Outcome |
|---|---|---|---|
| Very lucky 1-ball clear | 1 | 20+ | Floor complete → shop → floor 2 |
| Normal floor 1 clear | 2–4 | 20–56 | Floor complete or run end |
| Unlucky/bad aim | 5 | ~20–30 | Run ends, floor incomplete |
| Floor 2+ (30+ pegs) | 3–5 | varies | Likely run end unless skilled |

The math works out: floor 1 has 56 pegs, needs 20. An average player clearing ~50% of pegs per ball will clear floor 1 with 2–3 balls left for floor 2. Floor 2 requires 30 pegs — harder. By floor 3 (40+ pegs needed), a player who hasn't improved their aim will run out of balls.

**Design verdict:** Ball economy is tight but fair IF the player is actually aiming (clicking strategically, not just dropping). The "stuck on floor 2" scenario is realistic for a player who drops randomly and doesn't understand the physics.

---

## Test Environment

- **File:** `/home/kyle/projects/rogue-pachinko/index.html` (4,484 lines, 168KB)
- **HTTP Server:** `python3 -m http.server 8765` serving `/home/kyle/projects/rogue-pachinko/`
- **Browser:** Headless Chromium via Hermes browser tool
- **JS Syntax:** Valid (verified via Node.js `new Function()` parse — 3,726 JS lines)
- **Tested paths:** Menu → floor 1 → floor complete → shop → floor 2 (manual + automated state checks)

---

## Recommended Priority Fixes

1. **EMERGENCY BALL** — consumable shop item, 40 credits, +1 ball mid-run (highest impact)
2. **"OUT OF BALLS" interstitial** — when balls=0 and objective incomplete, show a 1.5s "NO BALLS LEFT" warning before `endRun(false)` fires, so the failure mode feels intentional
3. **Add ball counter text** next to the dots: "3 BALLS" label so the count is unmissable