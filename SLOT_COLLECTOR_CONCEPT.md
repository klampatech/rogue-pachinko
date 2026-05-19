# Slot Collector — Visual & Mechanical Concept
**Game:** Rogue-Pachinko (`~/projects/rogue-pachinko/index.html`)
**Author:** Grover (UI Pass + Creative Concept)
**Date:** 2026-05-19

---

## 1. EXISTING SYSTEM AUDIT

### Canvas Architecture
The game uses a **single canvas** (`#game-canvas`, 480×700) with HTML/CSS overlays stacked via z-index:

| Layer | Element | z-index | Purpose |
|---|---|---|---|
| 0 | `#game-canvas` | default | All game rendering |
| 1 | `#crt-overlay` | 10 | Scanline effect |
| 2 | `#game-container::before` | 11 | Vignette |
| 3 | HUD / objective / drop-zone | 20 | Game state display |
| 4 | Menu / shop / floor-complete / run-end | 90–100 | Full-screen overlays |
| 5 | Jackpot overlay | 9999 | Topmost |

**Problem:** Overlays are CSS `position: absolute` divs toggled with `display: none/flex`. This works but lacks a unified render pipeline — adding new overlay effects requires manual CSS positioning and doesn't integrate with the canvas coordinate system. A screen-layer system would unify this.

### Peg Grid Analysis

**Floor 1–2 board generation (8 rows):**
```
Row y positions: 120, 175, 230, 285, 340, 395, 450, 505
Col spacing:     60px (7 cols even rows, 6 cols odd rows)
Row offset:      0px (even), 30px (odd)
Peg radii:       5–9px depending on type
```
**Gap between last peg row (y=505) and slot zone (y=560):** 55px — no pegs, no collision. This is intentional (breathing room) but creates a dead zone.

**Floor 3–4 board generation (10 rows):**
```
Row y positions: 100, 148, 196, 244, 292, 340, 388, 436, 484, 532
Col spacing:     50px (8 cols even, 7 cols odd)
Row offset:       0px (even), 25px (odd)
```
**Gap between last peg row (y=532) and slot zone (y=560):** 28px — tighter, less dead space.

**Collision radii:** BALL_RADIUS=7. Smallest peg (fiber, r=5) → minDist=12. Largest peg (honeypot/cache, r=8–9) → minDist=15–16. Reasonable coverage.

**Ball speed:** GRAVITY=0.18/frame, MAX_VEL=14. Terminal velocity ~14 px/frame. At 60fps that's ~840 px/sec — ball crosses 480px width in ~0.57 sec. Reasonable.

### Slot Zone Layout

```
Total slots: 7
SLOT_WIDTH=64 (×6 outer) + SLOT_CENTER_WIDTH=68 (×1 center) = 450px base
SLOT_GAP=2px (×7 gaps) = 14px
Total: 464px, centered in 480px → 8px margin on each side.
```

**Slot positions (x ranges):**
- Slot 0: [0, 64] — CREDITS (amber, +50 credits)
- Slot 1: [66, 130] — AMPLIFY (cyan, +1 mult)
- Slot 2: [132, 196] — PAYLOAD (magenta, +payload)
- Slot 3: [198, 266] — CRUMBLE (red, clear 3 pegs) **[WIDER: 68px]**
- Slot 4: [268, 332] — SHIELD (green, shield next ball)
- Slot 5: [334, 398] — OVERCLOCK (purple, +grav)
- Slot 6: [400, 464] — JACKPOT (gold, +100 JP pool)

**Gap after slot 6:** x=464 to 480 → **16px unguarded edge.** Balls traveling fast can overshoot all slots entirely and fall through the side.

---

## 2. RECOMMENDED CHANGES

### A. Canvas Rendering System

Replace the current flat stacking with a **layer-based render system**:

```javascript
// ─── LAYER SYSTEM ──────────────────────────────────────────
const LAYERS = {
  BACKGROUND: 0,   // static grid, static decor
  BOARD:      1,   // pegs, static elements
  BALLS:     2,   // ball rendering
  FX:        3,   // particles, shockwaves, float texts
  SLOTS:     4,   // slot collector visual
  HUD:       5,   // overlay HUD elements (optional — may stay DOM)
  OVERLAY:   6,   // menu, shop, floor-complete, run-end
};
```

Each layer is a function `drawLayer(context, time)` called each frame. This lets the game:
- Toggle entire layers on/off instantly (no CSS display toggling)
- Apply layer-wide effects (shake, blur, flash) without DOM manipulation
- Add screen transitions (fade between menu and game)
- Render multiple "views" by swapping layer visibility

**Implementation:** Add a `layers` object with visibility flags, an `activeScreen` string, and a `draw()` function that iterates `LAYERS` in order. All current `drawX()` calls route through this.

### B. Peg Density Fix (Ball Bouncing)

**Problem:** Floor 1–2 has 55px row spacing, creating large vertical gaps. Balls can pass through without hitting anything.

**Fix:** Increase peg count by adding a mid-gap row between existing rows in floor 1-2:

```
OLD: row at y=120, next at y=175 (spacing 55)
NEW: rows at y=120 and y=147 (spacing 27), then at y=175
```

This doubles peg density in the vertical without changing horizontal layout. Equivalent change for all rows. Keep floor 3-4 unchanged (they're already denser at 48px).

**Alternatively:** Add "pin field" — many tiny 3px pegs in the gap zone that deflect but don't score. Cheap visual and mechanical density.

### C. Slot Gap Fix

**Problem:** 16px unguarded zone on the right edge (x=464–480).

**Fix:** Extend slot 6 to fill the remaining width:
```javascript
// In getSlotForX():
if (x >= pos && x < pos + w + extraMargin) return i;
// Or: make slot 6 be 80px wide instead of 64
```

Or add invisible "wall" pegs at x=464 and x=16 that redirect balls back into the slot zone without scoring.

### D. Visual Tightening

**CRT overlay:** Already present at z-index 10 with scanlines + vignette. Works fine.

**Peg glows:** Currently `shadowBlur = 8 * pulse` — quite bright. Tone down to 4-5px to prevent "glow blobs" that bleed into each other at close proximity.

**Ball trails:** Excellent (ghost phasing, chromatic aberration, cluster balls). Keep.

---

## 3. SLOT COLLECTOR — DETAILED CONCEPT

### Visual Design

**Slot zone position:** y=560 to y=610 (50px deep)
**7 slots across 480px** with 2px gaps and 8px side margins.

Each slot rendered as a **neon pocket**:
- Background: `#0d0d1a` (dark indigo)
- Border: 1px solid slot color at 35% opacity (unlocked), `#444455` at 12% (locked)
- Label: slot name in 7px Courier New top-left corner
- Icon: single character centered (C, A, P, X, S, O, J)
- Shimmer: 2px sweep light traveling down the slot every 3 seconds
- JACKPOT slot: pulsing gold glow animation (sin wave, 4Hz)

**Slot animations on capture:**
1. Ball "settles" — ball position animates toward slot center over 15 frames
2. Border flashes bright (slot color, full opacity) for 15 frames
3. Ball fades out while rising slightly
4. Particles burst upward (10 particles, slot color)
5. Float text appears above slot (e.g. "+50 CR", "x2", "SHIELD READY")

**Locked slots:** Display "--" centered, border dim at 12% opacity. On ball capture: spawnFloatText "LOCKED" in `#666666`.

### Slot Effects (Existing, Documented)

| Slot | Name | Color | Effect | Points |
|---|---|---|---|---|
| 0 | CREDITS | `#ffaa00` | +50 × multiplier breach credits | 50 × mult |
| 1 | AMPLIFY | `#00f0ff` | +1 to current multiplier, extend chain 3s | 25 × mult |
| 2 | PAYLOAD | `#ff00aa` | Add "free-ball" to payload inventory (max 2) | 50 × mult or +payload |
| 3 | CRUMBLE | `#ff4444` | Destroy 3 random pegs with particles + screen shake | 30 × mult |
| 4 | SHIELD | `#00ff88` | Queue shield — next ball gets protective bubble | 40 × mult |
| 5 | OVERCLOCK | `#aa44ff` | 1.5× gravity for 5 seconds | 60 × mult |
| 6 | JACKPOT | `#ffd700` | Add 100 × multiplier to JP pool, big shake | 75 × mult |

**Frenzy interaction:** When `GS.frenzyActive` is true, multiplier is doubled for slot scoring (e.g. AMPLIFY x3 becomes x6 effective).

### Floor Unlock Progression

| Floor | Slots Unlocked |
|---|---|
| 1 | CREDITS (0), AMPLIFY (1), JACKPOT (6) |
| 2 | +PAYLOAD (2) |
| 3 | +SHIELD (4) |
| 4 | +CRUMBLE (3) |
| 5 | +OVERCLOCK (5) + Boss vault board |

This creates progressive complexity — early floors simple, later floors full 7-slot strategic depth.

### Interaction with Existing Mechanics

- **Peg clearing:** CRUMBLE slot can clear pegs that contribute to floor objective progress (already implemented)
- **Payload slots:** PAYLOAD slot adds to `GS.payloadInventory`, displayed in `#payload-display` at bottom (already implemented)
- **Jackpot:** JACKPOT slot adds to `GS.jackpotPool`, shown in HUD `#jackpot-display`
- **Jackpot spin:** Triggered via `doSpin()` in jackpot overlay — separate from slot collector
- **Multiplier:** AMPLIFY slot and multiplier system already connected
- **Chain timer:** AMPLIFY extends `GS.chainTimer` by 180 frames (3 sec) — already connected

---

## 4. IMPLEMENTATION CHECKLIST

### Phase 1: Canvas Layer System (Foundation)
- [ ] Add `layers` object with visibility flags per screen
- [ ] Add `drawLayers()` that iterates `LAYERS` in order
- [ ] Route all existing `drawX()` calls through layer system
- [ ] Add `setActiveScreen(name)` that toggles layer visibility
- [ ] Migrate HUD to canvas or keep DOM — decision: keep DOM for simplicity, migrate if more complex effects needed

### Phase 2: Peg Density Pass
- [ ] Analyze floor 1–2 row spacing (55px → reduce to 40px with mid-rows)
- [ ] Verify no overlap at peg edges (collision radius + spacing must leave gap)
- [ ] Test: launch 10 balls, count how many hit at least 3 pegs — target 90%+ hit rate

### Phase 3: Slot Gap Fix
- [ ] Extend slot 6 width to fill x=464–480
- [ ] Add deflector pegs at side edges (x=0 and x=480) to redirect stray balls

### Phase 4: Slot Visual Polish
- [ ] Verify shimmer animation in `drawSlots()` (already present, check timing)
- [ ] Add JACKPOT pulse glow if not already rendering (line 2019–2028 already has this)
- [ ] Tune shadowBlur on pegs: 8 → 5 for tighter look

---

## 5. UNRESOLVED QUESTIONS

1. **Slot hit detection:** When ball x is between slots (gap zones), it falls through. Should we add a "catch" behavior that snaps to nearest slot? Current behavior is intentional but may feel unfair when a ball trickles down a gap at the edge.

2. **Jackpot interaction:** JACKPOT slot adds to JP pool, but the JP spin is a separate overlay. Should landing in JACKPOT slot also have a chance to trigger an instant mini-spin?

3. **Overlay vs. canvas:** Menu, shop, and overlays are DOM-based. Migrating to canvas would give full control over transitions but requires significant refactor. Recommend keeping DOM for these — they're not performance-critical.

---

*End of concept document. Ready for implementation.*