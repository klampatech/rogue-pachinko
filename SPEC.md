# Rogue-Pachinko: "Slot Protocol"

## Concept & Vision

**Slot Protocol** is a cyberpunk hacker fantasy where you're a rogue netrunner dropping data packets through a corrupted network grid to breach vaults. Each drop is a "penetration attempt" — pachinko balls become virus payloads, pegs become firewalls and ICE (Intrusion Countermeasures Electronics), and the jackpot becomes cracking the main vault. The game feels like watching a neon-lit hack sequence from a 90s cyberpunk film — tense, rhythmic, and visually electric.

The twist: **every ball carries a "load"** — a small payload of data that can mutate, combine with other payloads mid-flight, and trigger cascading breaches. The board reconfigures between runs, creating a true rogue-like experience where adaptation matters more than memorization.

---

## Core Loop

```
[BREACH INITIATED] → Drop Ball → Physics Cascade → Payload Resolution → 
→ Score / Breach Bonus → Dungeon Shop → Upgrade / Choose Path → [Next Floor]
```

1. **Drop Phase**: Player aims and drops a ball (virus payload) from the top
2. **Cascade Phase**: Ball bounces through procedurally-placed pegs, triggering effects on contact
3. **Resolution Phase**: Ball exits bottom or gets caught — resolve bonuses, triggers, payloads
4. **Breach Phase**: Clear floor objectives → unlock next floor or boss
5. **Shop Phase**: Between floors, spend "breach credits" on upgrades, payloads, and board modifiers

Each **floor** is a distinct board configuration with unique hazards and objectives. **5 floors per run**, culminating in a boss vault breach.

---

## Win Conditions & Failure

- **Win (Full Breach)**: Complete all 5 floors — crack the Main Vault
- **Partial Win**: Reach any floor — cash out breach credits into persistent upgrades
- **Hard Fail**: Zero balls remaining and cannot earn more within the floor
- **Meta-Progression**: Credits persist across runs, unlocking permanent upgrades and payload templates

---

## Progression Systems

### 1. Breach Credits (Currency)
- Earned per floor clear and via bonus multipliers
- Spent in the **NetShop** between floors
- **Cash-out**: When you wipe, credits convert to permanent **Reputation**

### 2. Reputation (Meta-Currency)
- Persistent across all runs
- Unlocks: new payload types, board modifiers, starting ball count upgrades, passive abilities
- Displayed as a "hacktivist rank" — Script Kiddie → Netrunner → Ghost → Legend

### 3. Payload System (Core Uniqueness)
Each ball carries a **Payload** — a data package that modifies behavior:

| Payload | Effect on Contact | Rarity |
|---|---|---|
| **Scrambler** | Reverses ball direction briefly | Common |
| **Trojan** | Next peg hit spawns a clone ball | Uncommon |
| **Worm** | Ball pierces through pegs without bouncing | Rare |
| **Logic Bomb** | Pegs explode in a radius on exit | Rare |
| **Daemon** | Ball splits into 3 on impact | Legendary |

Payloads can be **stacked** — a ball can carry 2 payloads. Some combinations are synergistic.

### 4. Floor Objectives
- **Standard Breach**: Clear X pegs or collect enough data fragments
- **Ghost Mode**: Clear without hitting any ICE (orange pegs)
- **Time Lock**: Clear within a time limit
- **Vault Boss**: Single large target at bottom — must hit X times to break open

### 5. Peg Types
| Peg Type | Color | Behavior |
|---|---|---|
| **Node** | Cyan | Standard bounce, drops data fragments |
| **ICE** | Orange | Hard bounce, -1 ball if hit 3x in one drop |
| **Fiber** | Purple | Ball slides along surface |
| **Mirror** | White | Reflects ball trajectory |
| **Data Cache** | Gold | Collect for bonus credits |
| **Honeypot** | Red | Trap — ends ball early, steals one payload |
| **Overload** | Magenta | Explodes, destroys adjacent pegs |

---

## Game Mechanics

### Ball Physics
- Gravity: constant downward acceleration (0.15 units/frame)
- Bounce: coefficient of restitution 0.65 on normal pegs
- Friction: slight horizontal drag (0.99 per frame)
- Max velocity cap to prevent tunneling

### Aiming System
- Mouse/touch position relative to top of board defines drop column
- Dotted preview line shows approximate first bounce
- Hold to charge power (affects initial velocity)
- Release to drop

### Cascade Multipliers
- Chain hits within 0.5s increase multiplier (x1 → x2 → x3 → x5 → x7)
- Multiplier resets on ball exit or timeout
- Multipliers apply to all scoring for that ball

### Breach Bonus
- Each floor has a **clear threshold** (e.g., 5000 points or 30 pegs)
- Exceeding threshold adds bonus balls to next floor
- Under threshold: lose one ball from reserve

### Ball Reserve
- Start each run with 5 balls
- Cannot purchase balls mid-run — must earn them via performance
- Balls remaining at run end = **bonus multiplier** on credit conversion

---

## HTML Canvas / CSS Structure

### Single File Architecture
```
index.html
├── <style> — All CSS (no external dependencies)
├── <canvas id="game"> — Main rendering surface
├── <div id="ui"> — Overlaid HUD (score, balls, floor)
├── <div id="shop"> — Modal NetShop interface
└── <script> — Game engine (~1500-2000 lines)
```

### Canvas Layers
1. **Background Layer**: Animated grid, scanlines, CRT curvature effect
2. **Board Layer**: Pegs, hazard zones, drop zone indicator
3. **Ball Layer**: Active balls with trail effects
4. **Particle Layer**: Sparks, data fragments, explosions
5. **FX Layer**: Screen shake, flash effects, chromatic aberration

### CSS Aesthetic
- **Background**: Deep void black (#0a0a0f) with subtle grid lines
- **Primary Accent**: Electric cyan (#00f0ff)
- **Secondary Accent**: Hot magenta (#ff00aa)
- **Warning**: Amber (#ffaa00)
- **Danger**: Crimson (#ff2244)
- **Font**: Monospace system font (Courier New / monospace fallback) — hacker terminal aesthetic
- **CRT Effect**: CSS `filter: contrast(1.05) saturate(1.1)` + scanline overlay div
- **Animations**: All via CSS keyframes for performance; JS only for game logic

### UI Layout
```
┌─────────────────────────────────────────┐
│ FLOOR 3/5    ⚡ 12,450    ●●●○○  [SHOP] │  ← HUD bar
├─────────────────────────────────────────┤
│                                         │
│     [Procedurally generated board]      │
│                                         │
│     · · · · · · · · · · · ·            │  ← Pegs
│       · · · · · · · · · ·              │
│         · · · · · · · ·                │
│            ◉ ◉ ◉ ◉ ◉                   │  ← Ball drop zone
│                                         │
└─────────────────────────────────────────┘
```

### Visual Effects
- **Ball trail**: Fading afterimages in cyan with bloom
- **Peg hits**: Circular burst of sparks, brief glow pulse
- **Multiplier pop**: "x3" text floats up and fades
- **Breach clear**: Full-screen flash, "BREACH SUCCESSFUL" glitch text
- **Honeypot trigger**: Screen inverts briefly, static noise burst

---

## State Management

### Game States
```
MENU → PLAYING → FLOOR_COMPLETE → SHOP → PLAYING → ... → RUN_END → MENU
```

### Core State Object
```javascript
const gameState = {
  screen: 'menu',           // menu | playing | shop | floor_complete | run_end
  floor: 1,                 // 1-5
  totalScore: 0,            // Lifetime score (persists)
  breachCredits: 0,         // Floor currency
  reputation: 0,            // Meta-currency
  rank: 'Script Kiddie',    // Player title
  
  balls: 5,                 // Current ball reserve
  ballsInPlay: [],          // Active ball objects
  multiplier: 1,            // Current cascade multiplier
  
  currentPayloads: [],      // [payload1, payload2] on next ball
  collectedPayloads: [],    // Inventory for next drop
  
  board: {},                // Current floor peg configuration
  floorObjective: {},       // Current floor goal
  floorProgress: 0,         // Progress toward objective
  
  unlockedPayloads: ['scrambler', 'trojan'],
  unlockedUpgrades: [],
  
  runHistory: []            // Last N runs for stats
};
```

### Persistence
- `localStorage` for reputation, rank, unlocked items, statistics
- Run state NOT persisted (true rogue-like — each run is fresh)

### Board Generation (Procedural)
- Floor 1-2: Simple grid with standard pegs, generous spacing
- Floor 3-4: Add ICE and hazard pegs, tighter spacing
- Floor 5: Boss vault — large central target surrounded by obstacles
- Peg positions seeded from floor number + slight random variance
- At least one guaranteed path to bottom exists (validated on generation)

### Physics Loop (60fps target)
```
update():
  for each ball:
    apply gravity
    check peg collisions
    resolve bounce / payload
    check bounds
    update multiplier timer
    
  update particles
  check floor objective
  check ball exit conditions

render():
  clear canvas
  draw background grid
  draw pegs with glow states
  draw balls with trails
  draw particles
  draw UI overlay
  apply post-processing (CRT effect via CSS)
```

### Collision Detection
- Circle-circle for ball-peg (radius-based)
- Sweep detection for fast-moving balls (prevent tunneling)
- Bottom boundary detection for ball exit

---

## Component Inventory

### Ball
- **Default**: Cyan circle, 8px radius, glowing aura
- **With Payload**: Small icon indicator orbiting ball
- **Trail**: 8-frame afterimage, fading opacity
- **Impact**: Spark burst, brief white flash

### Peg (per type)
- **Idle**: Subtle pulse animation (opacity oscillation)
- **Hit**: Bright flash, ripple ring expanding outward
- **Destroyed** (Overload): Explosion particles, peg removed
- **ICE hit counter**: 3 small dots below peg, fill on each hit

### UI Button
- **Default**: Cyan border, transparent fill, monospace text
- **Hover**: Fill transitions to cyan at 20% opacity, text brightens
- **Active**: Brief invert (cyan bg, dark text), click sound
- **Disabled**: Gray border and text, no hover effect

### Shop Item Card
- **Available**: Cyan border, payload/upgrade icon, name, cost
- **Owned**: Magenta border, checkmark overlay
- **Unaffordable**: Dimmed, cost shown in red
- **Hover**: Glow intensifies, slight scale up (1.02x)

### Floor Objective Bar
- **Progress**: Left-to-right fill bar below HUD
- **Near completion**: Bar pulses amber
- **Complete**: Bar turns gold, "BREACH" label flashes

---

## Audio Design (Visual Indicators as Fallback)
Since browser audio requires user interaction, all game events have strong visual feedback:
- Ball drop: Drop zone flashes
- Peg hit: Spark + peg glow pulse
- Multiplier up: Screen edge flashes cyan
- Ball exit: Exit zone flashes
- Floor clear: Full-screen glitch effect + "BREACH" text
- Honeypot: Screen invert + static noise overlay
- Game over: Screen desaturates, "CONNECTION LOST" text

---

## File Structure
```
rogue-pachinko/
├── SPEC.md (this file)
└── index.html (complete game — single file)
```

The index.html contains everything: CSS in `<style>`, canvas markup, and all JavaScript game logic inline. No external dependencies — open directly in any modern browser.
