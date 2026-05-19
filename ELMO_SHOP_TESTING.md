# Elmo Shop Testing Report — Slot Protocol
**Tester:** Elmo
**Date:** May 18, 2026
**Build:** `main` branch, commit `7565aad`

---

## Full Findings Table

| Item | Description | Works? | Code Evidence | Notes |
|------|-------------|--------|---------------|-------|
| **SCRAMBLER** | Reverses ball direction on hit | ❌ **NO** | No `case 'scrambler'` anywhere in codebase. No reversal logic. Not in `PAYLOADS` def, not in GS init. | **Dead weight in shop** — zero code path exists |
| **WORM** | Ball pierces through pegs | ✅ **YES** | `wormPiercing` flag, `checkCollisions` handler (line 2368), skips bounce via `return` at line 2385, float text `WORM N/N`, end condition, worm particle color | **Was wrongly flagged broken** — corrected after code review. Full implementation exists and is correct |
| **TROJAN** | Spawns 2 clone balls on hit | ❌ **NO** | `cloneSpawned` flag exists in Ball constructor (line 1278) but no spawn code. No `case 'trojan'` handler anywhere | Flag set, no clones created. Needs `case 'trojan'` in `checkCollisions` to spawn 2 clones |
| **DAEMON** | Ball splits into 3 on impact | ❌ **NO** | Comment at line 2724 says "already handled in update via clones" — but no such code exists. No `case 'daemon'` handler | Needs `case 'daemon'` in `checkCollisions` to split ball into 3 |
| **GHOST BALL** | Phase through pegs — no bounce | ❌ **NO** | `ghostPhasing` flag + RGB chromatic aberration trail renders (line 1422-1437). Physics NOT disabled — ball still bounces normally | Needs handler in `checkCollisions` to set `peg.hitCount++` and return without bounce when `ghostPhasing` is active |
| **LOGIC BOMB** | Explodes nearby pegs on exit | ✅ **YES** | `ball.payloads.includes('logicbomb')` at line 2707 in `resolveBallExit`. Explodes pegs within 80px radius on ball exit, particles + progress | Working correctly |
| **CLUSTER BALL** | Splits into 3 balls on first hit | ✅ **YES** | `case 'cluster'` in `checkCollisions` (line 2494). Spawns 3 mini-balls, particles, float text, flash, shake | Working correctly |
| **EXPLOSIVE** | Explodes all nearby pegs on hit | ✅ **YES** | `case 'explosive'` in `checkCollisions` (line 2523). 80px blast radius destroys nearby pegs, particles, flash, shake | Working correctly |
| **SLOW-MO** | Time slows — ball exits slow | ✅ **YES** | `case 'slowmo'` in `checkCollisions` (line 2580). Sets `GS.timeScale = 0.5`, triggers float text on end | Working correctly |
| **EXTRA BALL** | +1 starting ball each run | ⚠ Partially | Adds to `bonusStartingBalls` which increments `GS.balls` each run. But only one purchase allowed (upgrade type, not consumable) | Works as upgrade but one-shot — no repeat purchase |
| **MULTI-DROP** | Drop 2 balls at once | ⚠ Unknown | `multiball` flag exists but drop code at line 2867 may only spawn one ball. Not tested in session | Needs verification — code path unclear |
| **DATA VAMP** | +25% credits from caches | ✅ **YES** | `breachBonusMultiplier` applied at line 2628 (`Math.floor(10 * GS.multiplier * (GS.breachBonusMultiplier || 1.0))`). Caches pay more | Works |
| **EMERGENCY BALL** | +1 ball mid-run (40 credits) | ✅ **YES** | Consumable handler in `buyItem()` adds +1 to `GS.balls`, float text + flash, button stays active | Working, repeatable purchase |

---

## Corrected WORM Assessment

Initial test was flawed — WORM actually WORKS. Evidence:
- Ball constructor (line 1282): `this.wormPiercing = false`, `this.wormPierceCount = 0`, `this.wormMaxPierces = 0`
- `dropBall()` (line 2881): `if (p === 'worm') { ball.wormPiercing = true; ball.wormPierceCount = 0; ball.wormMaxPierces = 4 + Math.floor(Math.random() * 4); }`
- `checkCollisions` (line 2368): WORM payload branch — skips bounce (returns early at line 2385), increments pierce count, spawns green particles, float text shows `WORM 1/5`, `WORM END` when max reached
- Ball correctly continues through pegs without bouncing for 4-7 pierces

**Correction noted.** WORM was incorrectly flagged as broken in the earlier partial table. It is fully functional.

---

## Broken Payloads Requiring Implementation

### SCRAMBLER — Needs complete implementation
**Location:** None — does not exist
**What it needs:**
1. Add to `PAYLOADS` def (currently missing from the PAYLOADS object entirely):
   ```javascript
   scrambler: { name: 'SCRAMBLER', icon: '◎', color: '#ffee00', desc: 'Reverse direction', rarity: 'common', cost: 50 }
   ```
2. Add handler in `checkCollisions` — on peg hit, reverse `ball.vx`:
   ```javascript
   case 'scrambler':
     if (!ball.scramblerActive) {
       ball.scramblerActive = true;
       ball.vx *= -1;
       spawnFloatText(ball.x, ball.y - 10, 'SCRAMBLED!', '#ffee00');
       spawnParticles(ball.x, ball.y, '#ffee00', 6, 2);
     }
     break;
   ```
3. Add `this.scramblerActive = false` to Ball constructor

### TROJAN — Needs clone spawn implementation
**Current state:** `cloneSpawned` flag exists, no spawn code
**What it needs:** Add to `checkCollisions`:
```javascript
case 'trojan':
  if (!ball.cloneSpawned) {
    ball.cloneSpawned = true;
    for (let i = 0; i < 2; i++) {
      const clone = new Ball(ball.x, ball.y, (Math.random() - 0.5) * 4, ball.vy * 0.8, []);
      clone.cloneBall = true;
      clone.dropMultiplier = ball.dropMultiplier;
      GS.ballsInPlay.push(clone);
    }
    spawnFloatText(ball.x, ball.y - 15, 'TROJAN!', '#ff00aa');
    spawnParticles(ball.x, ball.y, '#ff00aa', 10, 3);
  }
  break;
```

### DAEMON — Needs split implementation
**Current state:** Comment only, no handler
**What it needs:** Add to `checkCollisions`:
```javascript
case 'daemon':
  if (!ball.daemonSplit) {
    ball.daemonSplit = true;
    for (let i = 0; i < 2; i++) {
      const angle = (i === 0) ? -0.4 : 0.4;
      const speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
      const newBall = new Ball(
        ball.x, ball.y,
        Math.cos(Math.atan2(ball.vy, ball.vx) + angle) * speed,
        Math.sin(Math.atan2(ball.vy, ball.vx) + angle) * speed,
        []
      );
      newBall.daemonChild = true;
      newBall.dropMultiplier = ball.dropMultiplier;
      GS.ballsInPlay.push(newBall);
    }
    spawnFloatText(ball.x, ball.y - 15, 'DAEMON SPLIT!', '#aa44ff');
    triggerFlash('#aa44ff33', 0.2);
  }
  break;
```

### GHOST — Needs physics disable
**Current state:** `ghostPhasing` flag + RGB trail renders, but ball bounces normally
**What it needs:** In `checkCollisions` WORM section logic (line 2368), add ghost check before normal bounce:
```javascript
// Ghost: phase through — count hits, then revert to normal at 0
if (ball.ghostPhasing && ball.ghostPhaseRemaining > 0) {
  ball.ghostPhaseRemaining--;
  peg.hitCount++;
  GS.floorObjective.progress++;
  GS.score += 25 * GS.multiplier;
  spawnParticles(peg.x, peg.y, '#ff88ff', 4, 2);
  if (ball.ghostPhaseRemaining === 0) {
    ball.ghostPhasing = false;
    spawnFloatText(ball.x, ball.y - 15, 'GHOST END', '#ff88ff');
  }
  GS.comboCount++;
  checkFrenzy();
  GS.chainTimer = 30;
  GS.multiplier = Math.min(7, GS.multiplier + 1);
  updateMultiplierDisplay();
  return; // skip bounce
}
```

---

## How Payload Activation Works

1. Buy payload → `buyItem()` adds `id` to `GS.unlockedPayloads` array (permanent unlock)
2. At run start (line 4102-4107), `GS.startingPayloadCount > 0` → randomly picks N payloads from `unlockedPayloads` and pushes them to `GS.currentPayloads[]`
3. On `dropBall()` (line 2871), `new Ball(x, y, vx, vy, [...GS.currentPayloads])` passes payloads to Ball constructor
4. Ball constructor stores in `this.payloads[]`
5. In `checkCollisions` (line 2491-2498), `for (const payload of ball.payloads)` switch handles each payload's activation on peg contact
6. `GS.currentPayloads` is cleared after ball drop (line 2901) — only one payload activation per drop

**Issue:** Only 1 payload activates per ball drop (line 2901 clears `currentPayloads`). If player owns multiple payloads, only the first one in `currentPayloads` is used per drop. This is a design limitation, not a bug.

---

## Fix Priority

| Priority | Item | Effort | Fix |
|----------|------|--------|-----|
| P0 | SCRAMBLER | Small | Complete implementation — no code exists |
| P0 | TROJAN | Small | Add clone spawn handler in `checkCollisions` |
| P0 | DAEMON | Small | Add split handler in `checkCollisions` |
| P0 | GHOST | Small | Add physics disable in collision branch |
| P1 | MULTI-DROP verify | Medium | Check if `dropBall` actually drops 2 balls |

**WORM was wrong** — it works. Corrected.
**LOGIC BOMB** works (but only triggers on ball exit, not on peg hit).