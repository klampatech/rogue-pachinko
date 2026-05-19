# Slot Collector — Creative Concept v2
**Game:** Rogue-Pachinko
**Author:** Grover
**Date:** 2026-05-19
**Status:** Creative concept — for implementation review

---

## 1. THE VISION

The slot collector zone is the ** payoff moment** — every ball drop builds toward this instant. It needs to feel like standing at a cyberpunk casino counter: the slots are glowing neon pockets carved into a dark chrome housing, each one pulsing with anticipation. When a ball falls in, it's not just a scoring event — it's a **theater**.

Three pillars:
1. **Depth illusion** — slots look like 3D buckets, not flat rectangles
2. **Miss consequence** — balls that miss slots trigger a mini-penalty, making every drop feel consequential
3. **JACKPOT drama** — slot 6 feels like hitting the lottery, with a completely different capture animation

---

## 2. 3D BUCKET DEPTH ILLUSION

### Visual Construction

Each slot is rendered as a **trapezoidal pocket** — wide at the top, narrower at the bottom — giving the illusion of depth:

```
Top opening:   ═══════════════   (full slot width)
Middle:        ══════════════    (slightly inset)
Bottom floor:   ════════════      (most inset, ~85% of top width)
```

**Implementation (per slot, in `drawSlots()`):**

```
For each slot at position (pos, SLOT_Y) with width w:
  1. Draw back wall: dark gradient from slot.color at 5% → #0a0a14
     - Drawn as a polygon: top-left, top-right, bottom-right×0.85, bottom-left×0.85
  2. Draw side walls: 4px gradient strips on left/right edges
     - Left wall: linear gradient, slot.color 8% → transparent
     - Right wall: same, mirrored
  3. Draw slot floor: solid #0d0d1a with subtle inner shadow
  4. Draw rim: 1px bright line at top edge, slot.color at 40% opacity
  5. Draw back-lit glow: radial gradient from center-bottom, slot.color at 6%, 30px radius
  6. The entire bucket casts a soft shadow onto the canvas below it (ctx.shadow*)
```

**Depth cues:**
- Back wall uses `fillRect` with a `createLinearGradient` going from `slot.color` at 8% opacity at the top to `#0a0a14` at the bottom
- Inner bottom corner gets a 2px "floor shadow" — a dark arc at the bottom-center
- When a ball enters, a brief **flash from within the bucket** illuminates the back wall (slot.color at 15% for 10 frames)

**JACKPOT bucket (slot 6) is different:**
- Gold rim with 2px stroke instead of 1px
- Back wall has animated **coin shimmer** — small gold particles drifting upward inside the bucket
- Rim glow pulses at 2Hz with gold light spilling onto the board above

### Color Palette

| Element | Color | Alpha |
|---|---|---|
| Bucket back wall top | slot.color | 8% |
| Bucket back wall bottom | `#0a0a14` | — |
| Side walls | slot.color | 6% |
| Floor | `#0d0d1a` | — |
| Rim | slot.color | 40% |
| Back-lit glow | slot.color | 6% |
| JACKPOT extra rim | `#ffd700` | 60% |

---

## 3. MISS CONSEQUENCE SYSTEM

### Design Rationale

Right now, a ball that misses all slots just... falls through. This is invisible and feels unrewarding. We need a **miss penalty** that:

- Is visible and punchy
- Doesn't feel cheap (reward the player's risk)
- Has strategic weight — you WANT to hit slots

### Miss Penalty: **OVERFLOW BREACH**

When a ball reaches `y > SLOT_START_Y + SLOT_HEIGHT` without being captured (missed all 7 slots):

**Trigger:** `OVERFLOW` event — ball exits through the 2px gap zones at slot boundaries or the 16px unguarded edge (though slot 6 now extends to the edge, the gap between slots 5 and 6 is still a miss zone).

**Effect (scaled by floor):**

| Floor | Miss Penalty | Float Text |
|---|---|---|
| 1 | −1 life (if lives > 1) | `OVERFLOW −1` in `#ff4444` |
| 2 | −1 life | `OVERFLOW −1` |
| 3 | −2 lives | `BREACH −2` |
| 4 | −2 lives + 3s slow (0.5× grav) | `CRITICAL BREACH` |
| 5+ | −3 lives + reset multiplier to ×1 | `SYSTEM FAIL` |

**Visual feedback:**
1. Screen flash red at 20% opacity for 8 frames
2. Screen shake: `screenShake = 8` for 6 frames
3. Missed ball emits 8 red particles downward as it exits
4. Float text rises from the gap zone where ball exited
5. HUD life counter flashes red

**Exception:** If player has a SHIELD ready, the shield absorbs the miss — no life lost, shield consumed. Float text: `SHIELD BLOCKED` in `#00ff88`.

**Strategic implication:** The OVERFLOW penalty creates tension on the drop. Players should feel the risk of a narrow miss. This makes slot positioning meaningful and adds stakes to each ball.

### Miss Detection

In `Ball.update()`, after slot zone check:

```javascript
// Ball passed through slot zone without being captured
if (this.y > SLOT_START_Y + SLOT_HEIGHT) {
  this.active = false;
  triggerOverflow(this.x);  // new function
  return;
}
```

---

## 4. JACKPOT (Slot 6) SPECIAL ANIMATION

### The Moment

When a ball lands in JACKPOT, it should feel like **winning the lottery**. The normal slot animation (settle → flash → fade) is the baseline. JACKPOT gets an entirely different sequence:

### JACKPOT Capture Sequence (60 frames total)

**Phase 1 — The Grab (frames 0–15):**
- Ball is pulled toward slot center (normal settle behavior)
- As ball approaches floor, the bucket's **gold inner glow intensifies** — shadowBlur ramps from 8 → 25
- Bucket rim flares white for 5 frames at full opacity

**Phase 2 — The Flash (frames 15–25):**
- Full-bucket flash: white-gold radial gradient from center, opacity 0 → 0.7 → 0
- Screen flash: `rgba(255, 215, 0, 0.25)` for 4 frames
- Screen shake: `screenShake = 12` (bigger than normal slots)
- **Particle explosion:** 20 gold particles burst upward with high velocity (vy: −8 to −15), some with small star shapes
- Jackpot pool increments with visible counter animation (counting up rapidly to new total)

**Phase 3 — The Afterglow (frames 25–60):**
- Bucket returns to pulsing state but **10% brighter** than before
- JACKPOT label pulses faster (6Hz instead of 4Hz) for 2 seconds
- A **gold ripple** expands outward from the slot — a ctx.arc that grows from radius 0 to 80px, stroke `#ffd700` at 30% opacity, then fades
- If jackpot pool > 500, a brief **"JP READY"** indicator flashes in the HUD

**Special case — JACKPOT at max pool (1000+):**
- The flash is white instead of gold
- The ripple is replaced by a **screen-wide gold sweep** (horizontal gradient from left to right)
- Camera (screenShake) oscillates: `sin(t * 0.5) * 8` for 20 frames
- Audio cue: (future) jackpot fanfare trigger

### JACKPOT Visual Constants

```javascript
const JP_PULSE_HZ = 4;        // normal idle pulse
const JP_CAPTURE_HZ = 6;      // faster pulse after capture
const JP_SHAKE = 12;          // screen shake on capture
const JP_PARTICLES = 20;      // gold particle burst
const JP_GLOW_MAX = 25;       // max shadowBlur during capture
const JP_RIPPLE_MAX_R = 80;   // ripple expansion radius
```

---

## 5. SLOT ZONE POLISH

### Ambient Animation (always running)

Each unlocked slot has a **low-frequency ambient pulse** — the rim brightness oscillates on a slow sine wave, each slot slightly out of phase with its neighbors:

```javascript
// In drawSlots(), for each unlocked slot:
const phaseOffset = i * 0.4;  // radians — each slot offset by 0.4π
const ambient = 0.25 + Math.sin(time * 1.5 + phaseOffset) * 0.1;
// Use 'ambient' as the rim alpha instead of the flat 0.35
```

This creates a "breathing" effect across the slot row — it looks alive even when idle.

### Slot Entry Glow

When a ball's `y` is within 80px above the slot zone, the **nearest slot** (based on ball's x) starts a "tracking" glow — the rim brightens to 60% and the inner glow intensifies:

```javascript
if (ball.active && ball.y > SLOT_START_Y - 80 && ball.y < SLOT_START_Y) {
  const nearestSlot = getSlotForX(ball.x);
  if (nearestSlot === i) {
    // Draw "incoming" glow
    ctx.shadowColor = slot.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = slot.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.strokeRect(pos + 1, SLOT_Y + 1, w - 2, SLOT_H - 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
```

This gives the player **visual feedback about where the ball is heading** before it lands.

### Shimmer Revisited

The current shimmer (2px sweep light every 3 seconds) is good but could be faster and more visible. Change to:
- 3px wide gradient sweep
- 2-second loop
- Alpha: 0.1 (currently 0.07) — slightly more visible

---

## 6. IMPLEMENTATION PRIORITY

| # | Change | Effort | Impact | Priority |
|---|---|---|---|---|
| 1 | 3D bucket depth illusion | Medium | High | P1 |
| 2 | Miss consequence (OVERFLOW) | Low | High | P1 |
| 3 | JACKPOT special animation | Medium | High | P1 |
| 4 | Ambient slot pulse | Low | Medium | P2 |
| 5 | Slot entry tracking glow | Low | Medium | P2 |
| 6 | Shimmer speed-up | Low | Low | P3 |
| 7 | JACKPOT max-pool mega-flash | Low | Medium | P2 |

**P1 items** should be implemented together as the core payoff experience. P2/P3 are polish.

---

## 7. CODE REFERENCE

Key functions to modify:
- `drawSlots()` — add bucket depth, ambient pulse, entry glow
- `Ball.update()` — add miss detection after slot zone check
- `triggerSlotCollected()` — add JACKPOT special branch
- `triggerOverflow()` — new function for miss penalty
- `spawnFloatText()` — already exists, use for OVERFLOW text

Existing constants to leverage:
- `SLOT_START_Y = 560`, `SLOT_HEIGHT = 50`
- `SLOT_TYPES[i].color`, `SLOT_TYPES[i].icon`
- `screenShake` and `GS.multiplier`
- `GS.jackpotPool`, `GS.lives`, `GS.shieldActive`

---

*End of creative concept. Ready for implementation planning.*
