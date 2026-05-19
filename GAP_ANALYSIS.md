# Gap Analysis — Slot Protocol 2.0 Implementation
**Date:** May 17, 2026
**Compared against:** `UPGRADE_SPEC.md` (v1.0)
**File audited:** `index.html`

---

## Executive Summary

All 7 upgrades from the spec are coded into `index.html`. However, **3 upgrades are dead on arrival** due to a critical syntax error (orphaned `switch`/`case` block), and several others are partially implemented or have wiring gaps.

**Severity:**
- 🔴 Critical: Syntax error prevents 3 payloads from functioning
- 🟡 Moderate: Missing wiring / wrong behavior in 4 features
- 🟢 Minor: Polish / UX gaps in 2 features

---

## 🔴 CRITICAL — Syntax Error

### Orphaned `switch`/`case` Block (Lines 1373–1430)

**What it is:** A block of code containing `case 'cluster':`, `case 'explosive':`, and `case 'slowmo':` that appears after a closing `}` (line 1433) inside `handlePegHit()`, but has **no parent `switch` statement**.

**Why it breaks:** JavaScript cannot parse `case` labels outside of a `switch` statement. The browser encounters `case 'cluster':` at line 1374 with no `switch (` preceding it, throws `"Unexpected token 'case'"`, and stops parsing the script entirely.

**Effect:** This orphaned block is **dead code** — it can never execute. As a direct consequence:

- **Cluster Ball** — never splits on peg contact (payload initialized but handler is unreachable)
- **Explosive Ball** — never triggers radius blast (payload initialized but handler is unreachable)
- **Slow-Mo Ball** — never ends on peg contact (GS.timeScale stays 0.5 for the rest of the run after any slow-mo ball is dropped)

**Fix required:** Delete lines 1373–1430 entirely. Move the cluster/explosive/slowmo collision logic into valid conditional blocks within `handlePegHit()` (see Implementation section below).

---

## 🟡 MODERATE — Wrong / Incomplete

### 1. Explosive Ball — Dead Code (same orphaned block issue)

**Spec requirement:** On any peg contact, explode all pegs within 80px radius, award 50 flat per peg destroyed, trigger screen shake + radial particle burst. Can only explode once per ball.

**Implementation:** The explosive payload IS initialized correctly (`ball.explosiveTriggered = false` at line 1510), but the collision handler lives in the orphaned switch block (lines 1392–1419) and is unreachable. Nothing happens on peg contact.

**Fix:** Add explosive logic as a `ball.payloads.includes('explosive') && !ball.explosiveTriggered` check inside `handlePegHit()`, before or after existing peg-type effects.

---

### 2. Slow-Mo Ball — TimeScale Leak

**Spec requirement:** On peg contact, slow-mo ends and GS.timeScale returns to 1.0 immediately. Ball resumes normal velocity.

**Implementation:** `GS.timeScale = 0.5` is set on drop (line 1503) — correct. The slow-mo end handler (inside the orphaned block, lines 1421–1429) sets `GS.timeScale = 1.0` on peg contact — but it's unreachable dead code. Result: after dropping a slow-mo ball, all subsequent balls in the run move at 0.5× speed indefinitely.

**Fix:** Add `if (ball.slowmoActive) { ball.slowmoActive = false; GS.slowmoBall = null; GS.timeScale = 1.0; }` in a valid location within `handlePegHit()`.

---

### 3. Cluster Ball — Split Never Fires + Wrong Mini-Ball Physics

**Spec requirement:**
- Split into 3 mini-balls on first peg contact (not on drop)
- Mini-balls: 5px radius, 1.3× velocity, no payloads, no gravity (continue on trajectory)
- All mini-balls must exit before next ball drops

**Implementation (broken):**
- Cluster payload IS initialized (`ball.clusterSplit = false`, `ball.miniBalls = []` at lines 1506–1508) — correct
- But the split trigger lives in the orphaned block (lines 1374–1391) — unreachable, split never fires
- Mini-ball physics applies full GRAVITY (line 756: `mb.vy += GRAVITY`) — wrong per spec (should continue linearly, no gravity)
- Mini-ball radius not set separately — uses whatever is drawn (parent ball is 7px)

**Fix:**
1. Add cluster split trigger in `handlePegHit()` as `if (ball.payloads.includes('cluster') && !ball.clusterSplit)` on first peg contact
2. Remove `mb.vy += GRAVITY` from mini-ball update loop — they should continue on their angle vector
3. Set mini-ball radius explicitly to 5 (spec: `radius: 5`)

---

### 4. Frenzy Mode — 3x Slot Multiplier Never Applied

**Spec requirement:** When player clears 5 pegs in a single drop (frenzy triggers), the **next slot result** is multiplied by 3x. Jackpot (25x) becomes 75x. Frenzy consumes on use.

**Implementation:** `GS.frenzyReady` is set to `true` when `comboCount >= 5` (line 1564). The slot machine exists and spins (lines 1651–1705). **But:** `initJackpotSlots()` never checks `GS.frenzyReady`. The bonus is always `500 * GS.floor` regardless of Frenzy state.

**Fix:** In `initJackpotSlots()`, after detecting a jackpot, apply:
```javascript
const bonus = GS.frenzyReady
  ? 500 * GS.floor * 3   // 75x on Frenzy
  : 500 * GS.floor;      // 25x normal
GS.frenzyReady = false;   // consume on use
```

---

### 5. Jackpot — Minor Win (2x Match) Not Implemented

**Spec requirement:**
- 3x match → Jackpot: 25x floor score bonus
- 2x match → Minor Win: 5x floor score bonus
- No match → No Win

**Implementation:** Only the 3x match is checked (lines 1688–1700). 2x matches result in nothing.

**Fix:** Add after the 3x check (before `jpContinueBtn`):
```javascript
if (a === b || b === c) {
  const minor = 100 * GS.floor;
  GS.breachCredits += Math.floor(minor / 10);
  // visual feedback for "close" result
}
```

---

### 6. Jackpot — Credits Go to Wrong Field

**Spec requirement:** Jackpot credits are added as **bonus breach credits**, not floor score.

**Implementation (line 1690):** `GS.score += bonus` — wrong field.

**Fix:** Change to `GS.breachCredits += Math.floor(bonus / 10)` (matches existing jackpot credit pattern on line 1691).

---

### 7. HUD Combo Counter — Never Updated

**Spec requirement:** HUD shows "DROPPING: N/5" during a drop (live combo counter). The `updateHUD()` function creates the `combo-display` element (line 1547) but never writes `comboCount` to it.

**Implementation:** Element created but `innerHTML`/`textContent` never set.

**Fix:** In `updateHUD()`, add:
```javascript
const comboEl = document.getElementById('combo-display');
if (comboEl) {
  comboEl.textContent = `DROPPING: ${GS.comboCount}/5`;
}
```

---

### 8. Unlock Ranks — Not Enforced

**Spec requirement:**
| Upgrade | Unlock Condition |
|---|---|
| Explosive Ball | Reputation rank "Script Kiddie+" |
| Slow-Mo Ball | Reputation rank "Netrunner+" |
| Ghost Ball | Reputation rank "Netrunner" |
| Cluster Ball | Reputation rank "Ghost" |

**Implementation:** `unlockRank` fields exist in the `PAYLOADS` definitions (lines 663–666) but the shop rendering logic never checks `GS.unlockedPayloads` or reputation rank against the unlock requirement. All payloads are visible regardless of player rank.

**Fix:** In shop rendering, filter items where `payload.unlockRank && !GS.unlockedPayloads.includes(payload.id)` → show as locked with a lock icon and rank requirement label.

---

## 🟢 MINOR — Polish

### 9. Crumbling Peg Colors — Spec Lists 3 Variants, Only 1 Implemented

**Spec:** Color variants: cyan (common), purple (fiber-crumble), gold (cache-crumble).

**Implementation:** `PEG_TYPES.crumbling` is defined with a single `color: '#00f0ff'` (line 678). All crumbling pegs are cyan.

**Fix:** Add color variants based on peg sub-type (fiber, cache) or random selection from `['#00f0ff', '#aa44ff', '#ffcc00']`.

---

### 10. Jackpot Spin Timing — Spec Says Left→Center→Right (200ms Delays)

**Spec:** Stop sequence: left reel → 200ms → center reel → 200ms → right reel. Gives anticipation.

**Implementation (lines 1670–1684):** Uses `[1200, 1800, 2400]` spin durations. This is close but the spec calls for discrete sequential stops with 200ms gaps, not staggered independent timers. Current implementation still produces a staggered feel but not the exact "left-to-right lock-in" the spec describes.

**Note:** This is a minor deviation — the current behavior is acceptable and achieves the same goal.

---

## Implementation Guide for Elmo's Fix

### Step 1 — Delete the Orphaned Block
Remove lines 1373–1430 (the entire `// ── CLUSTER PAYLOAD` section through the closing `}` before `function resolveBallExit`).

### Step 2 — Add Cluster Split (in handlePegHit)
After existing peg effects, before the early-return from ghost phase:
```javascript
// ── CLUSTER PAYLOAD: split on first peg contact ─
if (ball.payloads.includes('cluster') && !ball.clusterSplit) {
  ball.clusterSplit = true;
  const baseAngle = Math.atan2(ball.vy, ball.vx);
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.3;
  const angles = [baseAngle - 0.5, baseAngle, baseAngle + 0.5];
  angles.forEach(angle => {
    ball.miniBalls.push({
      x: ball.x, y: ball.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      trail: [], active: true
    });
  });
  spawnParticles(ball.x, ball.y, '#ffffff', 15, 6);
  spawnFloatText(ball.x, ball.y - 15, 'CLUSTER!', '#ffffff');
  triggerFlash('#ffffff33', 0.15);
}
```

### Step 3 — Add Explosive Blast (in handlePegHit)
```javascript
if (ball.payloads.includes('explosive') && !ball.explosiveTriggered) {
  ball.explosiveTriggered = true;
  triggerFlash('#ff440033', 0.2);
  triggerShake(8);
  spawnFloatText(ball.x, ball.y, 'BOOM!', '#ff4400');
  for (const other of GS.board) {
    if (other.destroyed) continue;
    const edx = other.x - ball.x;
    const edy = other.y - ball.y;
    const eDist = Math.sqrt(edx * edx + edy * edy);
    if (eDist < 80) {
      other.destroyed = true;
      GS.floorObjective.progress++;
      spawnParticles(other.x, other.y, PEG_TYPES[other.type].color, 8, 3);
      GS.score += 50;
    }
  }
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    particles.push({
      x: ball.x, y: ball.y,
      vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
      color: '#ff4400', life: 1, decay: 0.05, size: 4
    });
  }
}
```

### Step 4 — Fix Slow-Mo End (in handlePegHit)
```javascript
if (ball.slowmoActive) {
  ball.slowmoActive = false;
  GS.slowmoBall = null;
  GS.timeScale = 1.0;
  spawnFloatText(ball.x, ball.y - 15, 'SLOW-MO END', '#4488ff');
}
```

### Step 5 — Fix Mini-Ball Physics
In the Ball.update() mini-ball loop, remove `mb.vy += GRAVITY;` and `mb.vx *= FRICTION;` — mini-balls should continue on their set velocity vector without gravity or friction drag.

### Step 6 — Fix Frenzy Slot Wiring
In `initJackpotSlots()` around line 1688, wrap the jackpot bonus in:
```javascript
const mult = GS.frenzyReady ? 3 : 1;
const bonus = 500 * GS.floor * mult;
GS.frenzyReady = false;
```

### Step 7 — Add Minor Win
After the 3x match block, add 2x match handler.

### Step 8 — Fix Jackpot Credits
Change `GS.score += bonus` to `GS.breachCredits += Math.floor(bonus / 10)`.

### Step 9 — Update Combo Display
In `updateHUD()`, write `comboCount` to the `#combo-display` element each frame.

---

## Summary Table

| # | Upgrade | Issue | Severity | Fix Needed |
|---|---|---|---|---|
| 1 | All | Syntax error — orphaned switch block (L1373–1430) | 🔴 Critical | Delete orphaned block |
| 2 | Explosive Ball | Dead code — handler unreachable | 🔴 Critical | Relocate to handlePegHit |
| 3 | Slow-Mo Ball | TimeScale leak — never resets to 1.0 | 🔴 Critical | Relocate end handler to handlePegHit |
| 4 | Cluster Ball | Split never fires | 🔴 Critical | Relocate to handlePegHit |
| 5 | Cluster Ball | Mini-balls use gravity (shouldn't) | 🟡 Moderate | Remove gravity from mini-ball update |
| 6 | Cluster Ball | Mini-ball radius not set to 5px | 🟡 Minor | Set explicit radius |
| 7 | Frenzy Mode | 3x slot multiplier not applied | 🟡 Moderate | Wire frenzyReady into jackpot spin |
| 8 | Jackpot Slots | 2x match (minor win) not implemented | 🟡 Moderate | Add 2x match handler |
| 9 | Jackpot Slots | Credits go to GS.score, not GS.breachCredits | 🟡 Moderate | Fix destination field |
| 10 | HUD | Combo counter never updated | 🟡 Moderate | Write comboCount to #combo-display |
| 11 | Shop | unlockRank not enforced | 🟡 Minor | Filter by unlockedPayloads |
| 12 | Crumbling | Color variants not implemented | 🟢 Minor | Add purple/gold variants |

---

*End of Gap Analysis*