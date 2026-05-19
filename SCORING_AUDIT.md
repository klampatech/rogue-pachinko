# Scoring Audit — Slot Protocol

## HOW THIS AUDIT WORKS
Three questions: Does it make sense? Does it scale? Is it fun?
Each finding labeled: ✅ WORKS | ⚠️ AWKWARD | ❌ BUG

---

## 1. DOES IT MAKE SENSE?

### Scoring Architecture — How Points Actually Work

**Peg Hit Scoring (handlePegHit, line 3385-3387):**
- Base: 50 pts (normal peg) or 200 pts (bonus peg)
- Multiplied by `GS.multiplier` (1-7) and ×3 if Frenzy active
- Ghost and Worm payloads add score but skip bounce
- Ball color = SNAPSHOTTED at drop time via `ball.dropMultiplier = GS.multiplier`

**Multiplier Behavior:**
- Increases +1 per peg hit, capped at ×7
- Resets to ×1 when `chainTimer` hits 0 (~0.5s with no peg contact)
- Chain timer is reset to 30 frames per hit
- Confusing: Ball color does NOT update as global multiplier climbs — a ball dropped at ×2 stays golden even if you hit 4 more pegs and are now at ×6

**Frenzy System:**
- Threshold: 5 combo hits
- Activates on NEXT peg hit after threshold reached
- One-shot trigger (frenzyReady → frenzyActive), then runs for 180 frames (~3s)
- ×3 multiplier to all score during frenzy

**Combo Counter:**
- Incremented on every peg hit (including ghost/worm phase-through)
- Resets to 0 after all balls finish (`GS.ballsInPlay.filter(b=>b.active).length === 0`)
- Displayed as "N/5" with FRENZY! text when ready

**Ball drop multiplier snapshot** (line 1449-1450):
`this.dropMultiplier = GS.multiplier || 1;` — ball keeps its tier color for its entire flight. Correct per spec.

---

### Slot Collector Payouts

| Slot | Effect | Points |
|------|--------|--------|
| CREDITS (0) | +50×mult breach credits | 50×mult added to score |
| AMPLIFY (1) | +1 global multiplier, chainTimer→180 | 25×mult |
| PAYLOAD (2) | +'free-ball' to inventory (cap 2), else +50×mult | 50×mult |
| CRUMBLE (3) | Clears 3 random alive pegs | 30×mult |
| SHIELD (4) | Sets GS.shieldNextBall (absorbs 1 overflow) | 40×mult |
| OVERCLOCK (5) | 1.5× gravity for 5 sec | 60×mult |
| JACKPOT (6) | +100×mult to pool | 75×mult |

Slot animations: 30 frames settle → flash → fade. JACKPOT gets a 60-frame special animation with 3 phases drawn by `drawSlots()`.

**Jackpot slot (6) is special**: Adds to the growing jackpot pool, not directly to score. JACKPOT capture animation includes screen shake (12 intensity), particle burst (20 particles × 8), and a 60-frame 3-phase animation.

---

### Jackpot System

- Pool starts at `500 × floor` (500 on floor 1, 2500 on floor 5)
- Miss spin: pool grows ×1.15
- Win: pool resets to `jackpotBase = 500 × floor`
- 3-of-a-kind: full pool × (frenzy ? 3 : 1)
- 2-of-a-kind: 20% of pool × (frenzy ? 3 : 1)
- Slot symbols: ☠ ☢ ✦ ◈ ✧ — randomized per spin

---

### Floor Completion & Run End

**Floor complete (line 4184):**
`creditGain = 50 + (floor × 20) + (multiplier × 10)`
- Floor 1: +20 credits | Floor 5: +100 credits

**Run end (line 5072):**
`creditGain = floor(breachCredits × (1 + balls × 0.1) × prestigeMult)`
- Bonus balls add 10% each to credit conversion
- Bonus only applies if you CLEARED THE FLOOR (won=true)

**Ghost mode (floorObjective.type='ghost'):**
- Progress = ice hit count (not peg clear count)
- Win condition: all balls used + ice hits === 0
- Fail: any ice peg hit
- Extra punishing: ice hit tracked separately with red flash + "⚠ ICE!" float text

---

### ⚠️ AWKWARD: AMPLIFY slot is visually/materially redundant with peg hit multiplier

When you're at ×4 multiplier and hit AMPLIFY slot:
1. Global multiplier goes to ×5
2. Float text shows "x5" in cyan
3. BUT: the ball in play was dropped at its own multiplier tier (e.g., ×2) — it still looks ×2 colored
4. The AMPLIFY bonus doesn't visually match the multiplier increase

The AMPLIFY slot gives +25 points at ×5 mult = 125 pts. A normal peg hit at ×5 = 250 pts. AMPLIFY is mathematically weak relative to just hitting pegs at high multiplier. It's useful only for the chainTimer extension (180 frames = 3 more seconds of keeping your multiplier).

---

### ❌ BUG: Slot gaps between locked/unlocked cause unpredictable overflows

`SLOT_UNLOCK_FLOOR = [1, 1, 2, 4, 3, 5, 1]` means:
- Floor 1: Slots 0, 1, 6 unlocked (CREDITS, AMPLIFY, JACKPOT)
- Slots 2 (PAYLOAD), 3 (CRUMBLE), 4 (SHIELD), 5 (OVERCLOCK) are **locked** — balls passing through those x-ranges trigger OVERFLOW

This is the core "collector mechanism" gap you're fixing in the UI pass. Locked slot gaps don't act like gutters — they trigger the same OVERFLOW penalty as completely missing all slots. On floor 1, a ball falling in the x-range of the locked PAYLOAD slot (slots 2) gets PENALIZED like it fell through a crack in the floor. This is punishing and un-fun.

**Fix needed**: Locked slots should act as neutral gutters (no penalty, no reward) not overflow triggers. Currently `getSlotForX()` returns an index regardless of locked status, and `triggerSlotCollected()` checks `isSlotUnlocked()` AFTER the slot animation is queued.

---

### ❌ BUG: Multiplier decay is invisible — no countdown indicator

`chainTimer` at 30 frames (~0.5s) decays in `update()`. When it hits 0, multiplier snaps to 1. There's:
- No UI element showing chain timer or decay progress
- No audio cue or warning
- The multiplier display only shows the current value, not its remaining "shelf life"

You only know multiplier is about to reset when you see it drop from x3 to x1 with no explanation. Compare this to the combo counter showing "N/5" — that's good. The chain timer should have something similar.

---

## 2. DOES IT SCALE WELL?

### Score scaling per floor

| Floor | Objective | Max base pts | Max w/ ×7+Frenzy |
|-------|-----------|-------------|-----------------|
| 1 | 20 pegs | 1,000 | 42,000 |
| 2 | 20 pegs | 1,000 | 42,000 |
| 3 | 20 pegs | 1,000 | 42,000 |
| 4 | 20 pegs | 1,000 | 42,000 |
| 5 | 20 pegs | 1,000 | 42,000 |

Base peg score is the same every floor. Scaling comes from:
- Multiplier climbs faster if board is denser (more pegs to hit = more multiplier opportunities)
- Jackpot base: 500 → 1000 → 1500 → 2000 → 2500
- Overflow penalties get worse: -1 → -1 → -2 → -2 → -3 lives

**Peg density scaling works**: Floors 1-2 get 55px row spacing (now 40px after UI fix), floors 3-4 get 48px. More pegs = more opportunities to build and maintain multiplier.

**Issue**: Score per peg is FLAT. Clearing 20 pegs on floor 1 at ×1 multiplier = 1,000 points. Clearing 20 pegs on floor 5 at ×1 multiplier = still 1,000 points. The floor number doesn't meaningfully change how much each peg is worth. The challenge comes from tighter peg spacing (more hazard) and worse overflow penalties, not from score inflation.

This may be intentional (roguelike: skill matters more than progression), but it makes "progressing" feel like surviving longer, not getting more powerful.

---

### Jackpot scaling

- Pool: `floor × 500` base
- Failed spin: ×1.15 to pool
- Win: resets to base

The jackpot carries across floors — each failed spin makes the next one more tempting. This is good tension design. However, the payout is in `breachCredits` (shop currency), not score. The score display never shows "jackpot bonus added" — you only see the credit number go up in the shop. The visual feedback is `spawnFloatText(centerX, slotCenterY-10, `JP+${100*mult}`, slot.color)` but the pool number in the HUD only updates via `updateHUD()` which reads `GS.jackpotPool`.

---

### Slot unlock pacing

| Floor | Unlocked Slots |
|-------|---------------|
| 1 | 0 (CREDITS), 1 (AMPLIFY), 6 (JACKPOT) |
| 2 | +2 (PAYLOAD) |
| 3 | +4 (SHIELD) |
| 4 | +3 (CRUMBLE) |
| 5 | +5 (OVERCLOCK) |

This is a nice progression — first floor you have simple binary choices (credits or amplify), by floor 5 you have all 7. But PAYLOAD unlocking at floor 2 when you have a 2-slot inventory cap (and only 'free-ball' as starting payload option) means PAYLOAD slot often just gives +50×mult because inventory is full.

---

## 3. IS IT FUN?

### ✅ WORKS: Satisfying peg feedback
- Particle burst + float text on every peg hit
- Multiplier tier color clearly communicates ball power
- Milestone toasts at 50/100/150/200 pegs with screen flash
- "▲" float text on peg evolution (NORMAL→GLOWING→CHARGED→EXPLOSIVE)

### ✅ WORKS: Combo counter visible progress
- "N/5" combo display always visible
- "✦ FRENZY! ✦" text when ready, pulsing gold banner
- Chain timer extension is felt (you notice the multiplier "lasts longer" after hitting AMPLIFY slot)

### ✅ WORKS: Jackpot tension
- Pool grows with each failed spin (×1.15)
- 3-phase slot animation is visually striking
- "CLOSE! +N" for 2-of-a-kind gives partial reward (20% of pool) — better than nothing

### ✅ WORKS: Ball color snapshot
- Clear visual tier system: dim cyan → cyan → blue-white → green-white → yellow-white → orange-white → blazing white
- Easy to see at a glance what power level you're playing at

### ⚠️ AWKWARD: Score feedback is not decomposable

You see "+200" float up. Is that:
- 50 base × 4 multiplier?
- 200 bonus peg × 1 multiplier?
- 50 × 4 × 1 (no frenzy)?

There's no breakdown. The HUD shows `GS.score.toLocaleString()` — a single running total. You can't tell your per-ball contribution until the ball finishes and you remember what multiplier you had.

**Suggestion**: Show "+N [xM]" or color-code: base points white, multiplier bonus yellow, frenzy bonus magenta.

---

### ⚠️ AWKWARD: Slot payouts are negligible at high multiplier

AMPLIFY gives 25×mult = 125 pts at ×5. One normal peg hit at ×5 = 250 pts. Slots are useful for their non-score effects (AMPLIFY's chain extension, SHIELD's overflow block, OVERCLOCK's gravity change, CRUMBLE's peg clear) not for score. The point values feel like rounding errors compared to peg chain scoring.

---

### ⚠️ AWKWARD: No audio on chain timer / multiplier about to decay

You hear peg hits, combo builds, frenzy triggers — but you never hear "your multiplier is about to reset." The chainTimer is purely visual. In a fast game with ~0.5s of chain window, you often miss the reset.

---

### ⚠️ AWKWARD: End-of-run summary is a massive stat dump

`endRun()` (line 5112) shows:
- Floor reached, All-time best floor, Total score (+ high score badge), Peg cleared, Best combo, Credits earned, Mastery points, Rank progress bar, Unlocks (N/M), Prestige info, Daily challenge badge

That's 13 distinct data points. The most important thing (how did this run feel?) is buried. The rank-up notification is good when it fires. But most players want: SCORE, COMBO, PEGS HIT as the headline.

**Suggestion**: Top 3 metrics large, rest collapsible or smaller.

---

### ❌ BUG: Ghost mode too punishing

Ghost mode: hit 0 ice pegs or you fail. But `triggerOverflow()` for floors 3-4-5 causes slowmo (floor 4) or jackpot penalty (floor 5). If you're in ghost mode and accidentally hit an ice peg, you get a red flash + "⚠ ICE!" + `ghostModeIceHits` tracked, and then you fail the objective on run end. There's no redemption arc — you can't recover from an ice hit in ghost mode.

---

### ❌ BUG: Ball drop position has no visual slot guidance

The HUD shows the 7 slot icons at the bottom, but there's no visual aid helping you aim for a specific slot. When a ball is falling, you have no indication of which slot it will land in until it does. Players can't intentionally aim for CREDITS slot vs AMPLIFY slot.

---

## SUMMARY TABLE

| Area | Verdict | Notes |
|------|---------|-------|
| Peg hit scoring clarity | ⚠️ AWKWARD | Can't decompose score feedback; ball color snapshot vs live multiplier confusing |
| Multiplier system | ✅ WORKS | Clear tier colors, combo counter visible |
| Multiplier decay warning | ❌ BUG | No countdown indicator for chain timer |
| Slot collector payouts | ⚠️ AWKWARD | Points negligible at high mult; only non-score effects feel meaningful |
| Slot gap → overflow | ❌ BUG | Locked slots trigger overflow like they're cracks in the floor |
| Jackpot system | ✅ WORKS | Good tension, carries across floors, clear win/miss states |
| Frenzy system | ✅ WORKS | Clear threshold, strong visual/audio feedback on trigger |
| Score scaling | ⚠️ AWKWARD | Flat per-peg value; floor number doesn't inflate points |
| Fun / progression | ✅ WORKS | Satisfying feedback loops, combo counter motivates chain play |
| Ghost mode | ❌ BUG | Too punishing, no recovery from accidental ice hit |
| Aim guidance for slots | ❌ BUG | No visual indication of which slot ball will land in |
| End-of-run summary | ⚠️ AWKWARD | 13 data points — too dense, burying the lead |

---

## PRIORITY FIXES

1. **Locked slot gaps → neutral gutters** (not overflow triggers). On floor 1, slots 2,3,4,5 are locked. Balls falling there should NOT penalize. Neutral pass-through.

2. **Chain timer countdown indicator**. Add a thin bar or glow under the multiplier display that depletes as chainTimer counts down. Something that says "your multiplier has ~0.3s left."

3. **Score feedback with multiplier breakdown**. "+200 [×4]" or split colors: base white, multiplier bonus yellow. So player can see what their multiplier contributed.

4. **Ghost mode recovery path**. Ice hits should count as a warning, not instant fail. Maybe 2 ice hits = fail, not 1. Or ice hit reduces jackpot pool instead of failing outright.

5. **Slot aim guide**. Draw slot boundary lines or faint indicators above each slot so players can see where to aim. Subtle — not cluttering the aesthetic.