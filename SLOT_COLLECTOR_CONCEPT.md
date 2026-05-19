# Slot Collector Visual & Mechanical Concept
## rogue-pachinko — Task 2 of 3

---

## 1. Existing Slot System

The game already has 7 slots with working collector mechanics:

| Slot | Type | Effect | Visual |
|------|------|--------|--------|
| 0 | CREDITS | +50×mult credits | Amber `#ffaa00` |
| 1 | AMPLIFY | +1 multiplier, +3s chain | Cyan `#00f0ff` |
| 2 | PAYLOAD | +free-ball to inventory | Magenta `#ff00aa` |
| 3 | CRUMBLE | destroy 3 random pegs | Green `#00ff88` |
| 4 | SHIELD | next ball gets shield bubble | White `#ffffff` |
| 5 | OVERCLOCK | 1.5× gravity, 5s | Purple `#aa44ff` |
| 6 | JACKPOT | +100×mult to pool | Gold `#ffd700` |

Layout: slots drawn along the bottom (y=560+), 7 slots with 2px gaps, slot 3 (CRUMBLE) is 2× wider (center slot). Each slot has 3D bucket depth drawn with gradients — back wall, side walls, floor, rim glow, shimmer sweep, label, and icon.

The slot zone is already visually rich. The problem isn't missing graphics — it's that the slots feel like passive containers rather than an active scoring system. The fix is mechanical, not cosmetic.

---

## 2. Visual Design: Slot Zone

### Current State
3D bucket depth illusion with gradient back walls, side wall strips, rim glow, shimmer sweep, slot labels and icons.

### Proposed Enhancements (additive, no breaking changes)

**A. Slot Landing Flash**
When a ball enters a slot, the slot's rim brightens to full opacity for 0.3s, then decays back to ambient. Color matches slot type. This makes slot captures feel reactive and satisfying.

**B. Slot Animation: Ball Settle**
On capture, a brief particle burst rises from the slot floor (slot color, 8 particles, 0.4s). The captured ball shrinks and fades at the slot center. Already partially implemented via `GS.slotAnimations` but can be enhanced.

**C. Slot Type Color Accent on HUD**
When a slot is highlighted by the drop-preview (see §4), the `#multiplier-display` gains a subtle ring in that slot's color, hinting at the pending reward.

**D. Overflow Zone Warning**
The overflow zone (below slots, y=620+) currently has no visual. Add a subtle diagonal stripe pattern (#1a1a2e) that pulses red when a ball is in danger of missing all slots (last 20% of arc prediction). Low priority.

---

## 3. Mechanical Design: How Slots Should Feel

### Core Philosophy
Slots are not random rewards — they are the strategic payoff layer. The player aims to land in specific slots based on their current state (multiplier, payloads, floor objective). The slot system should reward aim and punish blind drops.

### Slot Tiers

**Tier 1 — Common (slots 0, 2, 4, 5)**
Basic bonuses: credits, free-ball, shield, overclock. Good for sustaining a run but not game-changing.

**Tier 2 — Strategic (slot 1 — AMPLIFY)**
This is the most important slot. Landing AMPLIFY at x6 multiplier vs x2 multiplier is dramatically different. The current AMPLIFY mechanic (`+1 mult, +3s chain`) undervalues high-multiplier situations because the chain extension is small relative to the risk. **Proposed fix:** AMPLIFY at x5 or higher also triggers a brief "AMPLIFY READY" screen flash with a cascade animation, and adds a `+25 * mult` point bonus. This makes high-multiplier AMPLIFY landings feel huge.

**Tier 3 — jackpot (slot 6 — JACKPOT)**
The tension builder. Current: +100×mult to pool. **Proposed:** On JACKPOT capture, the slot flashes with a radial burst, the pool amount grows visibly, and a "+JP" float text appears. The pool carries across floors, creating a persistent tension reward.

**Tier 4 — boss (slot 3 — CRUMBLE)**
2× wider center slot. Destroys 3 pegs and advances floor objective progress. Already the most visually distinct. No change needed.

### Slot Interactions with Existing Systems

**Peg Clearing → Slot Targeting**
The `simulatePreviewArc()` function already exists and computes the ball's predicted path. The landing slot highlight (now implemented in this pass) means the player can SEE which slot their drop will hit before committing. This closes the "blind drop" UX gap.

**Multiplier → Slot Value**
Slot payouts already use `GS.frenzyActive ? GS.multiplier * 2 : GS.multiplier`. At x7 multiplier with frenzy, slot values scale to 21× base. The AMPLIFY boost (proposed above) adds further incentive to maintain high multipliers.

**Payload Slots → Slot Strategy**
The 2 payload slots in the HUD (`payload-slot-0`, `payload-slot-1`) display current payloads. Players with a `cluster` payload might want to aim for CRUMBLE (slot 3) to trigger chain reactions. This is already implicit but could be made more visible with a subtle tooltip on hover/touch-hold.

**Frenzy Mode → Slot Urgency**
During frenzy (×3 all scoring), slot captures are triple-weighted. The `updateMultiplierDisplay()` shows `xhigh` (×4+) and `xmax` (×6+) classes — during frenzy, add a pulsing "FRENZY" badge to the HUD to reinforce the value of continued play.

---

## 4. Slot Aim Guidance (FIX APPLIED)

**Problem:** Balls fall into slots with no feedback on where they'll land until they land.

**Fix (implemented):** When the drop-preview arc is visible (player hovering/dragging before drop), the predicted landing slot is highlighted with a semi-transparent fill (`slot.color + '22'`) and a border (`slot.color + '66'`). This shows at a glance: "your drop will land in the AMPLIFY slot" or "you'll hit JACKPOT". Low cognitive load, high information density.

The highlight draws only when:
- `GS.screen === 'playing'`
- `previewArc.length > 0` (arc actively simulating)
- Ball predicted to reach `SLOT_START_Y`

The highlight uses `getSlotForX()` which is already correct and has the slot-6 edge fix (slot 6 extends to canvas edge, no unguarded margin).

---

## 5. Ghost Mode Slot Behavior

Ghost floor (floor 3) has no peg objective — the goal is "don't hit ice pegs." Slots still function during ghost mode. This is consistent: slots provide sustain bonuses that help the player finish the floor. No change needed.

The ghost indicator (new in this pass: `#ghost-indicator` top-left, shows ❄️❄️💀 pip display with remaining/total) makes the ghost objective visible at all times.

---

## 6. Overflow (Missed Slot) Behavior

When a ball's predicted arc ends below the slot zone without hitting a slot (`getSlotForX()` returns -1), the ball falls through the overflow zone. Currently: nothing visual happens. **Proposed:** A brief red flash on the overflow strip and a "-1 BALL" float text at the overflow center. Not a penalty to ball count (overflow is not a ball loss), just visual confirmation that the ball was wasted.

---

## 7. Implementation Summary

### Changes Applied (this pass)

1. **Chain Timer Bar** (`#chain-timer-bar`)
   - New div under multiplier display, top-right
   - 80px × 3px depleting bar, cyan → orange when ≤8 frames
   - Shows when ball is active and multiplier > ×1
   - Updated every frame in game loop

2. **Ghost Indicator** (`#ghost-indicator`)
   - New div top-left, shows on floor 3 only
   - Displays `GHOST ❄️❄️ 2/2` format with 💀 for hits taken
   - Turns orange when 1 hit remaining (danger state)

3. **Ghost Mode Recovery**
   - Changed from "0 ice hits = pass" to "≤2 ice hits = pass, 3 = fail"
   - Max hits configurable via `maxIceHits` in objective setup
   - Visual feedback: first two ice hits show "⚠ ICE! (1 left)" / "⚠ ICE! (0 left)"; third hit shows "⚠ TOO MANY ICE!" with stronger effects

4. **Slot Aim Guidance** (preview arc slot highlight)
   - Dashed arc now highlights the predicted landing slot
   - Semi-transparent fill + border in slot's color
   - Shows only while arc is actively simulating

### Remaining Design Work (outside scope of this pass)
- AMPLIFY point bonus at high multiplier (design decision)
- Overflow zone visual feedback
- Frenzy badge on HUD during frenzy
- Payload tooltip on slot hover/touch-hold

---

## 8. File Modifications

| Change | Location | Description |
|--------|----------|-------------|
| Chain timer bar CSS | line ~545 | New `#chain-timer-bar` and `#chain-timer-bar-fill` styles |
| Ghost indicator CSS | line ~568 | New `#ghost-indicator` styles |
| Chain timer HTML | line ~730 | New `<div id="chain-timer-bar"><div id="chain-timer-bar-fill"></div></div>` |
| Ghost indicator HTML | line ~732 | New `<div id="ghost-indicator"></div>` |
| `updateChainTimerBar()` | line ~4066 | New function: updates bar fill and danger state |
| `updateGhostHUD()` | line ~5903 | New function: builds ❄️💀 pip display |
| Ghost ice hit fix | line ~3397 | Allow ≤2 ice hits instead of 0; show remaining count |
| Ghost fail fix | line ~5858 | Check `<= maxHits` instead of `=== 0` |
| Ghost reset | line ~5021 | Reset `GS.ghostModeIceHits` and call `updateGhostHUD()` in `startFloor()` |
| Slot aim guidance | line ~1429 | Preview arc now highlights predicted landing slot with color fill+border |