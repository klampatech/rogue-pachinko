# Slot Collector — Design Concept
## Slot Protocol — Rogue Pachinko

---

## 1. Problem Statement

Balls fall through the bottom of the playfield and simply **vanish**. Traditional Pachinko has slots/buckets at the bottom that balls land in — this is entirely missing. The game needs a **slot collector zone** that:

- Catches balls (ends their run) with visual flair
- Provides meaningful scoring differentiation between slot types
- Integrates with existing mechanics: multiplier, peg clearing, payload slots, floor objectives, jackpot

---

## 2. Playfield Layout (Vertical Zones)

```
┌──────────────────────────────────┐
│  HUD (46px)                      │ ← top bar
├──────────────────────────────────┤
│  Objective bar (6px) + label     │ ← 52px
├──────────────────────────────────┤
│  Drop zone (60px)               │ ← 112px
│  ═══════════════════════════   │ ← peg area starts
│  PEGS (scattered, rows 1-11)     │
│                                  │ ← peg area ends ~540px
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ ← slot zone top (560px)
│  [  SLOT  COLLECTOR ZONE  ]     │ ← ~60px tall zone
│  [  7 slots across 480px  ]      │
│  ══════════════════════════════ │ ← bottom wall (H=700)
└──────────────────────────────────┘
```

**Slot zone**: y = 560 to y = 700 (140px tall, canvas ends at 700)
**Slot pocket height**: ~50px visible (ball enters from top, lands at bottom)
**Ball exit threshold**: currently `ball.y > H + 20` → will become entering a slot trigger instead

---

## 3. Slot Configuration — 7 Slots

Width: (480 - 7*2) / 7 ≈ **64px** per slot, **2px gaps**
Height: **50px** (pocket depth)

### Slot Types

| # | Name | Color | Mechanic | Points |
|---|------|-------|----------|--------|
| 0 | **CREDITS** | `#ffaa00` (amber) | Gain credits (currency) | 50 × mult |
| 1 | **AMPLIFY** | `#00f0ff` (cyan) | +1 multiplier, stackable | 25 × mult |
| 2 | **PAYLOAD** | `#ff00aa` (magenta) | Charge 1 payload slot (+1 ball per future ball) | 50 × mult |
| 3 | **CRUMBLE** | `#ff4444` (red) | Immediate floor objective: clear 3 random pegs | 30 × mult |
| 4 | **SHIELD** | `#00ff88` (green) | Next ball gets a shield bubble (survives 1 peg hit without bouncing) | 40 × mult |
| 5 | **OVERCLOCK** | `#aa44ff` (purple) | 5s of 1.5× gravity (ball falls faster, less bounce time) | 60 × mult |
| 6 | **JACKPOT** | `#ffd700` (gold) | Add 100 to Jackpot Pool | 75 × mult |

### Slot Distribution

Layout from left to right (x positions):
```
Slot 0: x=2        (credits)
Slot 1: x=68       (amplify)
Slot 2: x=134      (payload)
Slot 3: x=200      (crumble)  ← CENTER
Slot 4: x=266      (shield)
Slot 5: x=332      (overclock)
Slot 6: x=398      (jackpot)
```

**Center slot (slot 3, CRUMBLE)** is slightly wider (68px) as the default/fallback position. The outer slots are 64px.

---

## 4. Visual Design — Cyberpunk Terminal Aesthetic

### Slot Frame (per slot)
- **Border**: 1px solid with slot-type color at 60% opacity
- **Background**: `#0d0d1a` (near-black with blue tint)
- **Inner glow**: `box-shadow: inset 0 0 12px <color>33` (very subtle)
- **Corner cuts**: CSS-style chamfered corners using canvas clip paths — looks like circuit board pads

### Slot Label
- Slot name in **9px monospace**, slot-type color, top-left corner of slot
- Small icon/symbol in center: `[C]` `[A]` `[P]` `[X]` `[S]` `[O]` `[J]`

### Active State (ball in slot — animated)
When a ball enters a slot:
1. Ball falls to slot bottom with **bounce-settle animation** (2-3 bounces, 300ms total)
2. Slot border **flashes bright** (color goes to 100% opacity, 150ms)
3. **Particle burst** upward from slot (8-12 particles in slot color)
4. **Float text** rises from slot center showing points gained
5. Slot briefly pulses (box-shadow glow intensifies for 400ms)
6. Ball fades out (opacity 0→1 over 200ms after settle)

### Idle State
- Slots have a **subtle scan-line shimmer** — 1px horizontal line slowly sweeping top-to-bottom inside each slot, 3s loop, very dim (`opacity 0.1`)
- Slot color at 30% opacity for border
- Slight pulsing glow on JACKPOT slot to draw attention

### Locked State (progression unlock)
- Greyed out slots at game start
- Unlock condition shown in faint text below slot
- Unlock animation: border animates from grey → slot color, shimmer activates

---

## 5. Ball Entry — How It Works

### Current (before)
```javascript
// Exit bottom
if (this.y > H + 20) {
  this.active = false;
  resolveBallExit(this);
}
```

### New behavior
```javascript
// Enter slot zone (560px to 700px)
if (this.y > SLOT_ZONE_TOP) {
  const slotIndex = getSlotForX(this.x); // which of 7 slots
  if (slotIndex !== -1) {
    // Ball is captured by slot
    this.active = false;
    animateBallInSlot(this, slotIndex);
    return;
  }
  // Otherwise ball missed all slots → fell through gap → still exits
}
// Still exit if somehow past H + 20 (failsafe)
```

### Slot-to-X mapping
```javascript
const SLOT_START_Y = 560;
const SLOT_HEIGHT = 50;
const SLOT_WIDTH = 64;
const SLOT_GAP = 2;

function getSlotForX(x) {
  // Slot 0: x in [0, 64], Slot 1: [68, 132], ..., Slot 6: [398, 462]
  // Note: center slot (3) is slightly wider at 68px
  // Returns -1 if ball is in gap between slots (ball falls through → lost)
  // Gaps are only 2px — small ball (r=7) will mostly hit slot walls
}
```

---

## 6. Scoring Integration

### Points per slot (base, before multiplier)
| Slot | Base pts | Note |
|------|----------|------|
| Credits | 50 | Added as credits, not score |
| Amplify | 25 | `GS.multiplier++` |
| Payload | 50 | `GS.payloadInventory.push('free-ball')` |
| Crumble | 30 | `clearRandomPegs(3)` |
| Shield | 40 | `ball.shielded = true` on next drop |
| Overclock | 60 | `gs.gravity *= 1.5` for 5s |
| Jackpot | 75 | `GS.jackpotPool += 100` |

**Total base points per slot collection** (avg): ~55 pts × multiplier

### Interaction with existing mechanics

**Multiplier**: All slot points use current `GS.multiplier`. Amplify stacks additively (+1 each time, no cap but visual indicator saturates at x7).

**Peg clearing**: Crumble slot interacts with floor objective — it does NOT count as a peg "hit" by a ball, it just destroys pegs for the objective counter. If objective already complete, Crumble still gives points.

**Payload slots**: The existing `#payload-display` HUD at bottom (2 slots, center) shows current payload inventory. "Payload" slot in collector adds to this, capped at 2.

**Jackpot**: Jackpot slot adds 100 to the pool. The existing floor-complete slot machine uses `GS.jackpotPool`. This creates a two-layer jackpot system:
- Slot collection: small frequent additions (100 per Jackpot slot)
- Floor complete: spin for large chunk of accumulated pool

**Frenzy**: In Frenzy mode, all slot payouts are doubled (×2 applied on top of current multiplier).

---

## 7. Animation Details

### Ball-into-slot animation
```
t=0ms:    Ball enters slot top (y=SOLT_START_Y)
t=50ms:   Ball hits slot floor, bounce up 10px
t=100ms:  Ball falls back, bounce 5px
t=150ms:  Ball settles — slot border flashes
t=150ms:  Particles spawn (8 upward, arc down)
t=200ms:  Float text rises
t=350ms:  Ball opacity fade begins
t=500ms:  Ball gone, slot returns to idle
t=600ms:  Float text exits top of screen
```

### Multi-ball (multiball mode) support
- If multiple balls in slot zone simultaneously, each gets its own slot animation
- If two balls land in same slot simultaneously, second ball finds nearest adjacent slot

### Overclock gravity effect
```
When Overclock slot collected:
- GS.gravity temporarily = 0.27 (1.5× normal 0.18)
- Slot zone effect: for the NEXT ball only, gravity is 1.5× until ball exits
- Visual: purple tint overlay on playfield while Overclock active
- HUD: "OVERCLOCK" text flashes in purple
- Duration: 5 seconds or until ball exits, whichever first
- Graceful return to normal gravity
```

---

## 8. Sound Design (suggested cues)

| Event | Sound |
|-------|-------|
| Ball enters ANY slot | Soft metallic "clink" — different pitch per slot type |
| Amplify slot | Rising tone (synth arpeggio) |
| Jackpot slot | Golden chime cascade |
| Crumble slot | Crunch/glass break |
| Shield slot | Energy shield activate (whoosh) |
| Overclock slot | Engine rev / digital whine |
| Payload slot | Loading beep (data transfer) |

---

## 9. Unlocking Slots — Progression

Initially, only **CREDITS (0)**, **AMPLIFY (1)**, **JACKPOT (6)** are unlocked.

| Floor Reached | Unlock |
|---------------|--------|
| Floor 1 | CREDITS, AMPLIFY, JACKPOT (default) |
| Floor 2 | PAYLOAD slot |
| Floor 3 | SHIELD slot |
| Floor 4 | CRUMBLE slot |
| Floor 5 | OVERCLOCK slot |
| All floors cleared | All slots always unlocked |

Slot unlock animation: border traces around slot frame in the slot's color, then shimmer activates.

---

## 10. Edge Cases & Miss Conditions

**Ball misses all slots**: Falls through the 2px gap between slots (or at extreme edges). Feels bad — but this is realistic: Pachinko has losing gaps. Make gaps only 2px so skillful positioning can avoid them.

**Ball lands exactly on slot wall**: Bounces off the slot top edge back into play for a brief moment, then falls again — natural pachinko behavior. The wall collision angle determines where it goes.

**All slots full of balls simultaneously**: Queue system — each ball gets a slot assignment at entry time, balls animate in sequence with 50ms stagger.

**0 balls remaining**: Slots still trigger but show "NO BALLS" in the slot instead of animation. No penalty, just flavor.

---

## 11. Implementation Notes

### Constants to add
```javascript
const SLOT_COUNT = 7;
const SLOT_START_Y = 560;    // top of slot zone
const SLOT_HEIGHT = 50;      // pocket depth
const SLOT_WIDTH = 64;       // regular slot
const SLOT_CENTER_WIDTH = 68; // center slot (slightly wider)
const SLOT_GAP = 2;
const SLOT_ZONE_BOTTOM = H;  // canvas bottom
```

### Data structure
```javascript
const GS = {
  // ... existing ...
  unlockedSlots: ['credits', 'amplify', 'jackpot'],  // grows with floor
  slotAnimations: [],  // active slot VFX
  overclockActive: false,
  overclockTimer: 0,
  shieldNextBall: false,  // queued shield from shield slot
}
```

### Integration points
- `Ball.update()`: replace `if (this.y > H + 20)` bottom-exit with slot zone check
- `Ball.draw()`: add slot-zone glow effect when entering slot zone
- `resolveBallExit()`: becomes `slotCollected(ball, slotIndex)` with slot-specific effects
- Add new `drawSlots()` called from main render loop
- Add slot-activation particle effects via existing `spawnParticles` pattern

---

## 12. Summary

The Slot Collector is a **7-slot zone** at the bottom of the playfield that replaces the current "ball falls into void" behavior. Each slot type has a distinct color, mechanic, and visual identity within the cyberpunk aesthetic. The system:

1. **Ends ball runs** with satisfying visual/audio feedback
2. **Differentiates risk/reward** — center Crumble is hardest to hit but triggers objective progress; outer slots are easier but less powerful
3. **Integrates with all major systems** — multiplier, payloads, jackpot, floor objective, frenzy
4. **Unlocks progressively** — keeps early-game simple, adds depth as player advances
5. **Feels cyberpunk** — circuit-board aesthetic, scan-line shimmer, glitch-style float text

---

*Tagging <@1489001162509123789> — Task 2 done. Slot Collector concept written to ~/projects/rogue-pachinko/SLOT_COLLECTOR_CONCEPT.md*