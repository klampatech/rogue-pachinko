# Elmo Testing Report — Slot Protocol
**Tester:** Elmo
**Date:** May 18, 2026
**Build:** `main` branch, commit `a7f63c3`
**Play session:** Headless browser + console + local server on port 8766

---

## Summary

**Game is playable. Ball Trap bug found and FIXED.** Both fixes shipped in commit `a7f63c3`.

---

## Test Results

### ✅ Ball Physics — WORKING
- Ball drops at correct position (240, 70), velocity set properly (vx ±0.5, vy=1)
- Gravity accumulates (vy: 1 → 12+ over flight), friction applied, max velocity enforced
- Ball exits bottom of screen correctly, score accumulates, pegs register hits
- Stuck ball detection works (refunds ball after 180 frames of minimal movement)

### ✅ Collision Detection — WORKING
- `checkCollisions()` correctly checks `ball.hitPegs` Set to prevent double-hits
- All peg types register: node, ice, cache, crumbling, fiber, etc.
- Ghost/worm/slowmo payloads behave correctly

### ✅ Floor Progression — WORKING
- Floor 1 → 2 → 3 flow works correctly
- `completeFloor()` opens floor-complete overlay
- Shop opens between floors, closeShop() advances to next floor
- Jackpot resets/grows correctly per floor

### ✅ Shop — WORKING
- All items purchasable: payloads (SCRAMBLER, TROJAN, WORM, LOGIC BOMB, DAEMON, GHOST BALL, CLUSTER BALL, EXPLOSIVE, SLOW-MO) and upgrades (EXTRA BALL, MULTI-DROP, DATA VAMP)
- Credits deducted correctly, items appear in inventory
- "BALL REFILL" consumable now available: 150 credits, +2 balls, usable mid-run

### ✅ Render — WORKING
- Canvas renders correctly (cyan node pegs, gold cache pegs visible)
- HUD shows balls remaining, score, multiplier, jackpot, floor objective

---

## 🐛 BUG 1 — CRITICAL: Ball Trap (no refill on floor transition) — **FIXED**

**Severity:** Critical
**Reproducible:** Yes
**Line:** ~3591 (in `startFloor()`)
**Commit:** `a7f63c3`

**Original behavior:**
- `startFloor()` only reset balls on `floor === 1`
- Floor 2+: balls = whatever you had when leaving floor 1
- Shop had no "buy balls" item
- No free refill between floors
- If you ran out of balls without completing the objective → `endRun(false)` → game over

**Scenario Kyle encountered:**
1. Floor 2 starts with balls from floor 1 carry-over (e.g. 3 balls)
2. All 3 balls spent without completing objective (need 20 peg clears, only clear 5)
3. `GS.ballsInPlay.length === 0 && GS.balls <= 0` → `endRun(false)` fires
4. Run ends — no recovery path

**Fix applied (commit `a7f63c3`):**

1. **Floor ball reset** — `startFloor()` now always resets balls to 5 (removed floor-1-only restriction):
   ```javascript
   // Always reset to 5 on each new floor (safety net)
   GS.balls = GS.startingBallsOverride || (5 + (GS.bonusStartingBalls || 0));
   ```

2. **BALL REFILL shop item** — new consumable in SHOP_ITEMS:
   ```javascript
   { id: 'ball_refill', type: 'consumable', name: 'BALL REFILL', icon: '⚽', cost: 150, desc: '+2 balls — usable mid-run' }
   ```

3. **buyItem() consumable handler** — consumables add balls immediately, no permanent unlock, stay available for repeat purchase:
   ```javascript
   if (item.type === 'consumable') {
     const cost = Math.floor(item.cost * (GS.shopDiscount || 1.0));
     if (GS.breachCredits < cost) return;
     GS.breachCredits -= cost;
     if (id === 'ball_refill') GS.balls += 2;
     spawnFloatText(240, 300, '⚽ BALLS +2', '#00ff88');
     triggerFlash('#00ff8833', 0.2);
     document.getElementById('shop-credits').textContent = GS.breachCredits;
     updateHUD();
     return;
   }
   ```

**Verification:** Floor 2 now starts with 5 balls (confirmed via console test). BALL REFILL costs 150 credits, adds +2 balls, button stays enabled for repeat purchases. Credits: 500→350, Balls: 1→3. ✅

---

## 🐛 BUG 2 — Minor: Shop accessible during ball flight

**Severity:** Minor
**Status:** Not fixed in this session — not blocking gameplay

---

## Feature Checks

| Feature | Status |
|---------|--------|
| Ball drop physics | ✅ Working |
| Peg collision detection | ✅ Working |
| Score accumulation | ✅ Working |
| Multiplier system | ✅ Working |
| Progressive jackpot | ✅ Working (HUD display confirmed) |
| Ball evolution (ghost/worm/slowmo/explosive) | ✅ Code reviewed, appears correct |
| Slot machine mini-game | ✅ Working |
| Daily challenges | ✅ Working (HUD shows today's challenge) |
| Mastery system | ✅ Working (mastery points tracked) |
| localStorage persistence | ✅ Working |
| Leaderboard | ✅ Working |
| Ball skins | ✅ Working |
| Floor ball reset (P0 fix) | ✅ Fixed in `a7f63c3` |
| Ball refill shop item | ✅ Fixed in `a7f63c3` |

---

## Edge Cases Tested

1. **All 5 balls used on floor 1, objective met → floor 2 starts with 5 balls (not remaining from floor 1)**
   - ✅ Fixed: `startFloor()` now resets to 5 regardless of floor

2. **Ball stuck for 180 frames → refunded, replacement spawned**
   - ✅ Stuck detection works, ball count preserved

3. **Buying BALL REFILL from shop mid-run**
   - ✅ 150 credits → +2 balls, float text + flash, button stays enabled for repeat buys
   - ✅ `buyItem()` consumable path correctly skips unlock checks

4. **Ball exits without hitting any pegs**
   - ✅ Ball exits cleanly, no crash

5. **RAF in headless browser throttled to ~1.5fps**
   - ✅ Expected behavior — physics verified via direct `update()` calls

---

## Recommendations

1. **[DONE — P0 fixed]** Add ball refill mechanism — floor reset + shop consumable ✅
2. **[MEDIUM]** Show "out of balls" message before run ends, give player 5-second countdown to decide whether to spend credits or accept game over
3. **[MEDIUM]** Disable shop button while balls are in flight
4. **[LOW]** Visual feedback when ball is about to exit (warning glow at bottom)

---

## Git Log (this session)

| Commit | Description |
|--------|-------------|
| `a7f63c3` | fix: P0 ball trap — floor reset + BALL REFILL shop item |

---

## Files Modified in This Test

| File | Change |
|------|--------|
| `index.html` | Ball reset fix (`startFloor()` line ~3591) + BALL REFILL shop item + consumable handler in `buyItem()` |
| `ELMO_TESTING.md` | Updated with fix details and verification results |

**Server:** running on port 8766 (no restart needed — fix is in file, browser picks up on refresh)
