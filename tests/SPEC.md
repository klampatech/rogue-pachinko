# Rogue Pachinko — Full Test Suite Specification

## Goal

Create a complete automated browser test suite (`/home/kyle/projects/rogue-pachinko/tests/`) with FULL coverage of every UI interaction, game state, feature, function, power-up, and edge case in the Rogue Pachinko game.

**Principle:** Tests must be deterministic, self-contained, and able to run in isolation. No tests that depend on manual play or random board generation without seeding.

---

## Architecture

```
rogue-pachinko/tests/
├── index.html          # Test runner (loads game + tests in isolated iframe)
├── tests/
│   ├── a00_core.test.js        # Constants, config objects, global state integrity
│   ├── a01_persistence.test.js # localStorage load/save, PERSIST/GS init
│   ├── a02_game_flow.test.js   # startNewRun, startFloor, completeFloor, endRun, returnToMenu
│   ├── b01_ball_physics.test.js # Ball class physics (gravity, bounce, velocity, exit)
│   ├── b02_drop_mechanics.test.js # canDrop, dropX, previewArc, simulatePreviewArc, dropBall
│   ├── b03_collision.test.js   # checkCollisions, handlePegHit, resolveBallExit
│   ├── b04_peg_types.test.js    # Each peg type behavior: Node, ICE, Fiber, Mirror, Cache, Honeypot, Overload
│   ├── c01_slot_collector.test.js # getSlotForX, isSlotUnlocked, triggerSlotCollected, triggerOverflow
│   ├── c02_jackpot.test.js      # initJackpotSlots, jackpot session guard, spin/stop logic
│   ├── d01_payloads.test.js     # Each payload: Scrambler, Trojan, Worm, Ghost, Cluster, SlowMo, Daemon, LogicBomb
│   ├── d02_evolutions.test.js   # Peg evo states, cascade, detonation, dormant activation
│   ├── d03_multipliers.test.js  # Chain timer, cascade multipliers (x1→x2→x3→x5→x7), OVERLOAD state
│   ├── e01_shop.test.js         # openShop, buyItem, buyRepItem, applyUpgrade, closeShop
│   ├── e02_mastery.test.js      # Mastery tree, purchaseMasteryUpgrade, applyMasteryUpgrades
│   ├── e03_skins.test.js        # openSkinsScreen, selectBallSkin, equip/unequip
│   ├── e04_leaderboard.test.js  # openLeaderboard, submitHighScore, setLbFilter, clear, persistence
│   ├── e05_achievements.test.js # Trigger each achievement, showAchievement, toast display
│   ├── f01_hud.test.js          # updateHUD, updateMultiplierDisplay, updateObjectiveBar, updateChainTimerBar
│   ├── f02_overlay_screens.test.js # All overlay open/close (floor-complete, shop, runend, mastery, skins, leaderboard, achievements)
│   ├── f03_buttons.test.js      # Every button element: startBtn, dailyBtn, resetBtn, shopBtn, masteryBtn, skinsBtn, etc.
│   ├── f04_tutorial_modals.test.js # showTutorialModal, timelock tutorial, ghost mode tutorial
│   ├── g01_audio.test.js        # getAudioCtx, initBgmTracks, playBgm, stopBgm, fadeBgmOut, playSound
│   ├── g02_visual_effects.test.js # screenShake, screenFlash, particles, fragments, shockwaves, floatTexts, spawnFloatText
│   ├── g03_rendering.test.js    # drawPegs, drawBallDropZone, render, drawBackground, drawSlots
│   ├── h01_board_generation.test.js # generateBoard (seeded), pairTeleportPegs, setupObjective, daily mode
│   ├── h02_daily_challenge.test.js # getDailySeed, getDailyModifiers, applyDailyModifiers, daily leaderboard
│   ├── h03_timelock.test.js     # TIMELOCK objective: countdown timer, all-pegs-cleared check
│   ├── h04_ghosts.test.js      # Ghost peg mode: freeze, amber tint, ghost HUD
│   ├── h05_boss.test.js        # BOSS objective: HP bar, peg destruction tracking
│   ├── i01_prestige.test.js    # checkPrestigeEligibility, executePrestige, carry-forward
│   ├── i02_meta_progression.test.js # RANKS, getPlayerRank, evaluateUnlocks, UNLOCKS
│   ├── j01_known_bugs.test.js  # Regression suite for known bugs:
│   │                             # p0-continue-button-stuck
│   │                             # p1-leaderboard-leak
│   │                             # p2-continue-multi-click
│   │                             # p3-leaderboard-during-floor-complete
│   │                             # p4-endrun-tdz
│   └── k01_edge_cases.test.js   # Zero balls, zero score, all pegs cleared, slot unlock edge cases
```

---

## Test Runner Spec (`index.html`)

### Structure
```html
<!-- Isolated: inject game via srcdoc or blob URL so tests don't pollute global scope -->
<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; background: #0a0a0a; color: #00f0ff; }
  #results { position: fixed; top: 0; right: 0; width: 320px; height: 100vh; overflow-y: auto; background: #111; border-left: 1px solid #333; padding: 12px; }
  #game-frame { margin-right: 320px; width: calc(100vw - 320px); height: 100vh; border: none; }
  .pass { color: #00ff88; } .fail { color: #ff4444; } .skip { color: #ffaa00; }
  .suite { color: #ff00aa; font-weight: bold; margin-top: 16px; }
  .test { padding: 2px 0 2px 12px; }
</style></head>
<body>
<iframe id="game-frame" sandbox="allow-scripts allow-same-origin"></iframe>
<div id="results">
  <h3>Test Results</h3>
  <div id="output"></div>
</div>
<script type="module">
// Test runner — loads game blob, exposes GS/PERSIST/ball/payload globals
// Auto-discovers tests/test-*.js files and runs them in sequence
// Reports pass/fail/skip counts per suite and total
// Saves result to localStorage under key 'rogue-pachinko-test-results'
// Supports ?seed=N to force daily seed; ?floor=N to start at specific floor
</script>
</body></html>
```

### Runner Requirements
- Load the game via `srcdoc` blob so GS/PERSIST globals are accessible from tests
- Expose a `TEST` helper object: `{ seed(n), gotoFloor(n), setBalls(n), setScore(n), injectPayload(type), triggerPegHit(x,y), wait(ms), click(id), type(id,text), getState(), getPersist() }`
- Auto-discover and run all `tests/tests/*.test.js` files
- Output format: `[SUITE] test name ... PASS|FAIL|SKIP (Xms)`
- Summary at end: `{total, passed, failed, skipped}`
- `?floor=N` parameter to jump to specific floor for targeted testing
- `?seed=N` to force a specific board RNG seed

---

## Test Naming Convention

Each test file exports a function `runTests(TEST) → { passed, failed, skipped, errors[] }`

Test format (Jest-style comments acceptable as plain JS):
```js
// test: "SlotCollector — getSlotForX maps x to correct slot index"
async function test(t) {
  const result = getSlotForX(240); // center of slot 3 (index 3)
  t.is(result, 3, 'x=240 should map to slot index 3');
}
```

---

## Implementation Instructions Per Agent

### Elmo → `a*` + `f*` files (core + UI overlays + buttons)
Files: `tests/index.html`, `tests/tests/a00_core.test.js`, `a01_persistence.test.js`, `a02_game_flow.test.js`, `f01_hud.test.js`, `f02_overlay_screens.test.js`, `f03_buttons.test.js`, `f04_tutorial_modals.test.js`
Focus: Constants/config integrity, persistence cycle, game state transitions, HUD updates, every overlay open/close, every button binding, tutorial modals.

### Bert → `b*` + `c*` files (physics + slots)
Files: `tests/tests/b01_ball_physics.test.js`, `b02_drop_mechanics.test.js`, `b03_collision.test.js`, `b04_peg_types.test.js`, `c01_slot_collector.test.js`, `c02_jackpot.test.js`
Focus: Ball physics (gravity/bounce/friction/maxVel), drop aim + preview arc, collision resolution per peg type, slot mapping/unlock/collect/overflow, jackpot session guard + spin.

### Ernie → `d*` + `e*` files (payloads + economy)
Files: `tests/tests/d01_payloads.test.js`, `d02_evolutions.test.js`, `d03_multipliers.test.js`, `e01_shop.test.js`, `e02_mastery.test.js`, `e03_skins.test.js`, `e04_leaderboard.test.js`, `e05_achievements.test.js`
Focus: Each payload's init + effect + cleanup, peg evolution states + cascade chains, cascade multiplier progression, shop purchase flow + currencies, mastery tree purchases, ball skin selection, leaderboard CRUD, achievement triggers.

### Grover → `g*` + `h*` + `i*` + `j*` + `k*` files (audio/vis + board modes + meta + known bugs + edge)
Files: `tests/tests/g01_audio.test.js`, `g02_visual_effects.test.js`, `g03_rendering.test.js`, `h01_board_generation.test.js`, `h02_daily_challenge.test.js`, `h03_timelock.test.js`, `h04_ghosts.test.js`, `h05_boss.test.js`, `i01_prestige.test.js`, `i02_meta_progression.test.js`, `j01_known_bugs.test.js`, `k01_edge_cases.test.js`
Focus: Audio play/stop/fade, particles/shockwaves/floatTexts, rendering correctness, board seeding + daily challenge, timelock/ghost/boss objective modes, prestige flow, rank/unlock meta-progression, regression tests for all 5 known bugs, zero-balls/all-pegs-cleared edge cases.

---

## Coverage Standards

### For Each Test File:
1. **Setup** — seed RNG, set initial GS state, inject TEST helpers
2. **Act** — call function or trigger interaction
3. **Assert** — use `t.is(actual, expected, msg)`, `t.gt()`, `t.lt()`, `t.ok()`, `t.throws(fn)`
4. **Teardown** — restore original GS/PERSIST state

### Must Cover:
- **Happy path** — normal intended behavior
- **Error path** — invalid inputs, null values, out-of-bounds
- **Edge cases** — 0 balls, 0 score, empty board, all pegs cleared, simultaneous ball exits
- **Persistence** — what persists across page reloads
- **RNG seeding** — any random behavior must be seeded for reproducibility
- **Known bugs** — regression tests for all 5 documented bugs (P0–P4)
- **State transitions** — all valid state→state transitions and invalid ones

### Must NOT:
- Hard-code timing assumptions (check state, not duration)
- Require manual interaction to proceed
- Rely on CSS text content for assertions (use JS state)
- Leave global state polluted
