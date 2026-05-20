# Slot System Documentation

Bug #4: Document all slot types and their effects.

## Slot Type Definitions
**Source:** `index.html` lines 1389-1397

```javascript
const SLOT_TYPES = [
  { name: 'CREDITS',   color: '#ffaa00', icon: 'C', desc: '+credits'  },
  { name: 'AMPLIFY',   color: '#00f0ff', icon: 'A', desc: '+mult'     },
  { name: 'PAYLOAD',   color: '#ff00aa', icon: 'P', desc: '+payload'  },
  { name: 'CRUMBLE',   color: '#ff4444', icon: 'X', desc: 'crumble'   },
  { name: 'SHIELD',    color: '#00ff88', icon: 'S', desc: 'shield'    },
  { name: 'OVERCLOCK', color: '#aa44ff', icon: 'O', desc: 'overclock' },
  { name: 'JACKPOT',   color: '#ffd700', icon: 'J', desc: 'jackpot'   },
];
```

## Unlock Requirements
**Source:** `index.html` line 1401

```javascript
// CREDITS(0), AMPLIFY(1), PAYLOAD(2), CRUMBLE(3), SHIELD(4), OVERCLOCK(5), JACKPOT(6)
const SLOT_UNLOCK_FLOOR = [1, 1, 2, 4, 3, 5, 1];
```

| Slot | Index | Unlock Floor | Notes |
|------|-------|--------------|-------|
| CREDITS | 0 | Floor 1 | Available from start |
| AMPLIFY | 1 | Floor 1 | Available from start |
| PAYLOAD | 2 | Floor 2 | |
| SHIELD | 4 | Floor 3 | |
| CRUMBLE | 3 | Floor 4 | |
| OVERCLOCK | 5 | Floor 5 | |
| JACKPOT | 6 | Floor 1 | Available from start |

## Slot Effect Chain

### `triggerSlotCollected(ball, slotIdx)`
**Source:** `index.html` lines 2133-2197+

Called when a ball falls into a slot. Handles unlock checks, effect application, visual feedback, and scoring.

```javascript
function triggerSlotCollected(ball, slotIdx) {
  const slot = SLOT_TYPES[slotIdx];
  const mult = GS.frenzyActive ? GS.multiplier * 2 : GS.multiplier;
  // ... slot animation setup (lines 2140-2149)
  
  // Check if slot is unlocked (lines 2152-2155)
  if (!isSlotUnlocked(slotIdx)) {
    spawnFloatText(centerX, slotCenterY - 10, 'LOCKED', '#666666');
    return;
  }
  
  // Apply slot effect via switch (lines 2157-2195+)
  switch (slotIdx) { ... }
}
```

---

### Slot 0: CREDITS
**Effect Chain:** Credits gain + visual feedback

```javascript
case 0: // CREDITS: +credits (line 2163)
  GS.breachCredits += 50 * mult;   // Add credits to run total
  pts = 50 * mult;                 // Calculate points
  triggerFlash(flashColor, 0.1);   // Flash slot color
  spawnFloatText(centerX, slotCenterY - 10, `+${50 * mult} CR`, slot.color);
```

- **Effect:** Adds `50 * multiplier` to `GS.breachCredits`
- **Points:** `50 * multiplier`
- **Visual:** Orange flash + floating text showing credits gained

---

### Slot 1: AMPLIFY
**Effect Chain:** Multiplier increase + chain extension

```javascript
case 1: // AMPLIFY: +1 multiplier (line 2170)
  GS.multiplier++;                  // Increment global multiplier
  pts = 25 * mult;                  // Calculate points
  GS.chainTimer = TIMING.CHAIN_AMPLIFY; // ~3 sec chain extension (line 2173)
  triggerFlash(flashColor, 0.1);
  spawnFloatText(centerX, slotCenterY - 10, `x${GS.multiplier}`, slot.color);
  updateMultiplierDisplay();       // Refresh UI
```

- **Effect:** `GS.multiplier` increased by 1
- **Chain Extension:** `GS.chainTimer = 180` frames (~3 seconds at 60fps) - See `TIMING.CHAIN_AMPLIFY` at line 1402
- **Points:** `25 * multiplier`
- **Visual:** Cyan flash + floating text showing new multiplier value

---

### Slot 2: PAYLOAD
**Effect Chain:** Free ball inventory OR points fallback

```javascript
case 2: // PAYLOAD: add to inventory (line 2179)
  if (GS.payloadInventory.length < 2) {
    GS.payloadInventory.push('free-ball');  // Add to inventory (max 2)
    spawnFloatText(centerX, slotCenterY - 10, '+PAYLOAD', slot.color);
  } else {
    pts = 50 * mult;                         // Fallback: award points instead
    spawnFloatText(centerX, slotCenterY - 10, `+${50 * mult}`, slot.color);
  }
  triggerFlash(flashColor, 0.1);
```

- **Effect:** Adds `'free-ball'` string to `GS.payloadInventory` (capacity: 2)
- **Fallback:** If inventory full, awards `50 * multiplier` points instead
- **Points:** `50 * multiplier` (only when inventory full)
- **Visual:** Magenta flash + '+PAYLOAD' or points text

---

### Slot 3: CRUMBLE
**Effect Chain:** Peg destruction + objective progress + screen effects

```javascript
case 3: { // CRUMBLE: clear 3 random pegs (line 2190)
  pts = 30 * mult;
  triggerFlash(flashColor, 0.1);
  triggerShake(6);                          // Screen shake (6 units)
  let cleared = 0;
  const alive = GS.board.filter(p => !p.destroyed);
  for (let i = 0; i < 3 && alive.length > 0; i++) {
    const idx = Math.floor(Math.random() * alive.length);
    const peg = alive.splice(idx, 1)[0];
    if (!peg.destroyed) {
      peg.destroyed = true;
      GS.floorObjective.progress++;           // Advance floor objective
      spawnParticles(peg.x, peg.y, peg.color || slot.color, 6, 3);
      cleared++;
    }
  }
  spawnFloatText(centerX, slotCenterY - 10, `CRUMBLE x${cleared}`, slot.color);
```

- **Effect:** Destroys up to 3 random non-destroyed pegs from `GS.board`
- **Objective Progress:** Increments `GS.floorObjective.progress` per peg destroyed
- **Points:** `30 * multiplier`
- **Visual:** Red flash + screen shake + particles + floating text showing count

---

### Slot 4: SHIELD
**Effect Chain:** Shield flag set for next ball

```javascript
case 4: // SHIELD: next ball gets shield bubble (line 2173)
  GS.shieldNextBall = true;              // Enable shield for next ball
  pts = 40 * mult;
  triggerFlash('#00ff8844', 0.12);      // Green-tinted flash
  spawnFloatText(centerX, slotCenterY - 10, 'SHIELD READY', slot.color);
```

- **Effect:** Sets `GS.shieldNextBall = true` - next ball spawns with shield bubble
- **Shield Behavior (overflow handler, lines 2097-2131):**
  - If `shieldActive` is true when ball misses all slots:
    - `GS.shieldActive = false`
    - `GS.shieldNextBall = false`
    - Shows 'SHIELD BLOCKED' text
    - Spawns green particles
    - No lives lost
- **Points:** `40 * multiplier`
- **Visual:** Green flash + 'SHIELD READY' floating text

---

### Slot 5: OVERCLOCK
**Effect Chain:** Gravity multiplier for current run + timed duration

```javascript
case 5: // OVERCLOCK: 1.5x gravity for current ball run (line 2180)
  GS.overclockActive = true;
  GS.overclockTimer = 300;              // 5 sec at 60fps (line 2182)
  pts = 60 * mult;
  triggerFlash('#aa44ff44', 0.15);
  spawnFloatText(centerX, slotCenterY - 10, 'OVERCLOCK!', slot.color);
```

- **Effect:** Sets `GS.overclockActive = true` with `GS.overclockTimer = 300`
- **Gravity Application (ball physics, line 1619):**
  ```javascript
  const overclockMult = (GS.overclockActive && GS.overclockTimer > 0) ? 1.5 : 1.0;
  ```
  Ball's `vy` (vertical velocity) is increased by 1.5x when this flag is active
- **Timer Decay:** `GS.overclockTimer` decremented each frame until 0, then `overclockActive` clears
- **Points:** `60 * multiplier`
- **Visual:** Purple flash + 'OVERCLOCK!' floating text

---

### Slot 6: JACKPOT
**Effect Chain:** Jackpot pool increase + special capture animation

```javascript
case 6: // JACKPOT: add to pool — special capture animation (line 2188)
  GS.jackpotPool += 100 * mult;         // Add to jackpot pool
  pts = 75 * mult;
  // Push JACKPOT capture animation (3 phases drawn by drawSlots)
  GS.slotAnimations.push({
    x: centerX,
    y: slotCenterY,
    slotIdx,
    color: '#ffd700',
    phase: 'jackpot',
    // ... animation phases
  });
```

- **Effect:** Adds `100 * multiplier` to `GS.jackpotPool`
- **Points:** `75 * multiplier`
- **Animation:** Special 3-phase jackpot capture animation drawn by `drawSlots()`
- **Visual:** Gold flash + special animation sequence

---

## Timing Constants Reference
**Source:** `index.html` lines 1400-1402

```javascript
const TIMING = {
  CHAIN_EXTEND: 30,        // frames per peg hit (~0.5s at 60fps)
  CHAIN_AMPLIFY: 180,     // AMPLIFY slot bonus extension (~3s at 60fps)
  FRENZY_DURATION: 180,   // frenzy active duration (~3s at 60fps)
};
```

## Related State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `GS.multiplier` | number | Current score multiplier (starts at 1) |
| `GS.frenzyActive` | boolean | Whether frenzy mode is active (2x multiplier bonus) |
| `GS.chainTimer` | number | Frames remaining for chain bonus |
| `GS.breachCredits` | number | Credits accumulated this run |
| `GS.payloadInventory` | array | List of 'free-ball' payloads (max 2) |
| `GS.floorObjective.progress` | number | Progress toward floor objective |
| `GS.shieldNextBall` | boolean | Next ball spawns with shield |
| `GS.shieldActive` | boolean | Current ball has active shield |
| `GS.overclockActive` | boolean | 1.5x gravity is active |
| `GS.overclockTimer` | number | Frames remaining for overclock |
| `GS.jackpotPool` | number | Accumulated jackpot value |
| `GS.slotAnimations` | array | Active slot animation objects |

## Overflow/Miss Handling
**Source:** `index.html` lines 2096-2131

When ball misses all slots, `triggerOverflow()` is called:

| Floor | Message | Lives Lost | Additional Effect |
|-------|---------|------------|-------------------|
| 1-2 | 'OVERFLOW −1' | 1 | None |
| 3 | 'BREACH −2' | 2 | None |
| 4 | 'CRITICAL BREACH' | 2 | 50% slowmo, clears `slowmoBall` |
| 5+ | 'SYSTEM FAIL' | 3 | Resets multiplier to 1, reduces jackpot pool by 20% |

**Shield absorbs overflow** - if `GS.shieldActive` is true, shield is consumed and no lives are lost.
