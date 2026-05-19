# Code Review — Slot Protocol (rogue-pachinko/index.html)
Date: 2025-05-19
Auditor: Bert

---

## Section 4: Architecture Review

### 1. Organization — Good, has clear section headers

The file uses consistent `// ─── SECTION NAME` dividers as a table of contents. Rough map:

| Section | Lines | Purpose |
|---|---|---|
| CSS / Styles | 1–627 | All styles, animations, HUD, overlays |
| HTML body | 628–886 | DOM elements (game-container, overlays) |
| Constants & Palette | 887–901 | Color C object |
| Game State (GS) | 901–962 | Mutable runtime state |
| Persistent State | 962–1022 | PERSIST object |
| Daily Challenge | 1007–1059 | Seeded modifiers, date-based |
| Meta-Progression | 1061–1236 | UNLOCKS catalog, rank functions, prestige |
| Peg/Payload Defs | 1316–1355 | Configuration constants |
| Slot Collector | 1355–1983 | Slots, overflow, animations |
| Peg Evolution | 1476–1516 | EVO_CONFIG, PegEvo enum, assignEvolutionState |
| Ball Class | 1516–1862 | Ball constructor, methods |
| Particle System | 1862–1983 | Particles, fragments, shockwaves |
| Float Text | 2453–2505 | Floating damage/score text |
| Audio System | 2539–2650 | BGM, SFX, playSound, playBgm |
| Board Generation | 3077–3300 | generateBoard, peg layouts, teleports |
| Collision & Hit | 3298–3819 | checkCollisions, handlePegHit, ball physics |
| Explosive/Dormant | 3853–3983 | detonateExplosivePeg, checkDormantActivation |
| HUD & UI | 4165–4306 | updateHUD, updateMultiplierDisplay, shop |
| Shop System | 4550–4728 | openShop, buyItem, buyRepItem |
| Screens | 4781–5126 | Mastery, Skins, Leaderboard, Achievements |
| Run Management | 5144–5483 | startFloor, completeFloor, endRun, startNewRun |
| Rendering | 5504–5904 | drawBackground, drawPegs, drawBallDropZone, render |
| Game Loop | 5967–6126 | update() and gameLoop() |

**Good:** Comment headers make navigation easy. Related constants are grouped. Constants and data are clearly separated from logic.
**Bad:** HTML body (628–886) is 258 lines of raw HTML in the middle of a JS file. CSS also embedded. Should split into separate files in a real project.

---

### 2. Abstractions — Decent, but `handlePegHit` is a monolith

**Ball class** (lines 1516–1862) — well done. Ball is a proper object with `update()`, `draw()`, and behavior fields. Clean encapsulation.

**Peg types** — `PEG_TYPES` lookup is clean. Each peg type has `color`, `bounce`, `radius`, `bonus` — consistent shape.

**Global mutable state** (`GS`, `PERSIST`) — functional but creates coupling. Every function reads `GS` directly; no accessor abstraction. This is acceptable for a game of this size but means the state shape is implicit throughout.

**Update functions** — `updateHUD()` rebuilds the entire DOM from scratch every frame (lines 4166–4231). No diffing, no DOM reuse beyond the `id` lookups. Works but expensive.

---

### 3. Duplication — Two clear cases

**Case 1: Ghost payload and Worm payload scoring block (lines 3349–3385)**

Ghost block (3349–3360):
```javascript
GS.comboCount++;
checkFrenzy();
GS.score += (pegDef.bonus ? 200 : 50) * GS.multiplier * (GS.frenzyActive ? 3 : 1);
GS.floorObjective.progress++;
GS.totalPegsCleared++;
GS.chainTimer = 30;
GS.multiplier = Math.min(7, GS.multiplier + 1);
updateMultiplierDisplay();
peg.hitCount++;
updateHUD();
updateObjectiveBar();
return;
```

Worm block (3375–3385): Identical 11-line block except for variable names (`ball.ghostPhaseRemaining` vs `ball.wormPierceCount`) and label text. The only substantive difference is the pierce/phase counter decrement logic at the start. Everything else — combo, score, progress, chain, multiplier, HUD — is copy-paste.

Fix: Extract to `applyScoringEffect(ball, peg)` function.

**Case 2: `getRankProgress()` — two definitions**

- Lines 1237–1250: Meta-progression version with `RANKS` array lookup and `rep_for_first_ball_unlock` references
- Lines 5233–5244: Run-end screen version with different threshold array `[0, 500, 1500, 4000, 10000, 25000, 60000]` and different rank names `['Script Kiddie','Script Kiddie+','Netrunner',...]`

These produce different numeric outputs for the same player state. Not a crash but inconsistent and confusing. Fix: pick one version, delete the other. The line 1237 version uses the proper `RANKS` array and is the canonical definition.

---

### 4. God Functions — Three main offenders

**`handlePegHit` — ~500 lines** (lines 3320–3819)
Single function handles:
- Ghost phase-through (30 lines)
- Worm pierce-through (20 lines)
- Peg evolution state machine — 5 states, each with transitions (120+ lines)
- Bounce physics for reflect, fiber, and normal pegs (20 lines)
- Shield absorption (8 lines)
- Pierce payload (4 lines)
- Ghost objective tracking (8 lines)
- Combo/multiplier/progress tracking
- Seismic peg oscillation (6 lines)
- Crumbling peg damage and disintegration (50+ lines)
- Scoring (8 lines)

Should be split into:
- `applyPayloadEffect(ball, peg)` — ghost/worm/slowmo
- `applyEvolutionTransition(ball, peg)` — evolution state machine
- `applyBounce(ball, peg, nx, ny, dot)` — physics

**`endRun` — 147 lines** (lines 5277–5423)
Builds an entire run-end screen string with inline HTML, handles prestige calculation, rank progression, leaderboard qualification, daily challenge updates, mastery points, unlock evaluation, HTML binding for the prestige button, and overlay activation.

Should extract: `buildRunEndHTML()` and `calculateRunEndStats()`.

**`updateHUD` — ~60 lines** (lines 4165–4231)
Rebuilds ball dots, combo display, floor indicator, score, jackpot, multiplier display every frame with `innerHTML` assignments and dynamic element creation. Should have `renderBallsDisplay()` and `renderComboCounter()` helpers.

---

### 5. Tight Coupling — Widespread, structural

`GS` is accessed directly by ~80+ functions with no accessor layer:
- Adding a field to `GS` requires searching all functions to trace usage
- No encapsulation — any function can mutate any part of `GS` at any time
- Testing requires running the full game loop

Same for `PERSIST` — save/load functions exist (lines 1251, 1293), which is good, but all mutation is direct.

The `render()` function (lines 5904–5961) calls `drawBackground()`, `drawPegs()`, `drawBallDropZone()`, `drawParticles()`, `drawFragments()`, `drawShockwaves()`, `drawFloatTexts()` — well-decoupled for rendering. The concern is that `drawPegs()` (5531–5880) is itself 350 lines and handles multiple peg types internally.

---

### Summary

| Category | Rating | Notes |
|---|---|---|
| Organization | Good | Clear section headers, logical grouping |
| File structure | Mixed | Single 6K-line file — HTML/CSS/JS should split |
| Abstractions | Adequate | Ball class good, GS/PERSIST lack accessor layer |
| Duplication | Red flag | Ghost/worm block (3349/3375), getRankProgress double def |
| God functions | Red flag | handlePegHit (500L), endRun (147L), updateHUD (60L) |
| Coupling | High | GS touched everywhere — implicit contract |

---

## Priority Fixes (for iteration)

1. **Deduplicate ghost/worm payload scoring block** — extract `applyScoringEffect(ball, peg)` 
2. **Resolve `getRankProgress()` double definition** — pick line 1237 version (canonical), delete 5233 copy
3. **First pass split of `handlePegHit`** — extract `applyPayloadEffect()` + `applyEvolutionTransition()` + `applyBounce()`