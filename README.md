# Slot Protocol

**A cyberpunk pachinko roguelike.** Drop balls through a procedurally generated board, hit pegs to build multipliers, and survive 5 floors of escalating chaos. Every run is a new board.

---

## What is this?

Slot Protocol is a single-file browser game about dropping balls through a grid of pegs, triggering chain reactions, and exploiting the slot machine between floors. It's part pachinko, part roguelike, part slot machine — built as a love letter to arcade chaos.

**Core loop:** Drop ball → hit pegs → build multiplier → survive floor → spin slot → spend credits → repeat. Die on floor 5 and start over.

---

## How to play

Open: **[klampatech.github.io/rogue-pachinko](https://klampatech.github.io/rogue-pachinko)**

### Controls
- **Click / tap** anywhere above the ball drop zone to launch a ball from that horizontal position
- Ball drops with the current multiplier active at drop time
- **Chain hits** within 1 second increment the combo counter (×2, ×3, ×4...)
- Balls cost **1 credit each** from your per-floor supply of 5

### Pegs
| Peg Type | Color | Effect |
|---|---|---|
| Node | Cyan | +1 to objective progress |
| Cache | Gold | +breach credits |
| Ice | White/blue | Freezes ball briefly |
| Crumbling | Purple/gold | Destroys after 1 hit |
| Fiber | Green | Multiplier amplifier |
| Seismic | Orange | Screen shake on hit |
| Honeypot | Magenta | Ends ball, steals payload |
| Mirror | Silver | Reflects ball back |
| Overload | Red pulse | Explodes nearby pegs |

### Payloads (9 total)
Stack up to **3 payloads** per ball by hitting PAYLOAD pegs. Each applies on peg hit:

- **Worm** — pierce through pegs, no bounce
- **Ghost** — phase through pegs without collision
- **Cluster** — splits into 6 mini-balls on peg hit
- **Explosive** — 120px radius blast chain reaction
- **Slow-mo** — time dilation for 4 seconds
- **Overclock** — 2× speed for 3 seconds
- **Shield** — absorbs one honeypot hit
- **Logic Bomb** — chains to 3 nearby pegs with lightning
- **Free Ball** — adds to ball inventory (rare)

### Cascade Overload
When combo reaches **×3 or higher**, the next payload activation goes into **OVERLOAD MODE** — amplified tier with enhanced effects, chain lightning, and visual feedback (magenta ring + screen shake).

### Slot Machine
Between floors, spin the slot machine. Three of a kind = **jackpot** (resets and pays out). Miss = **+15% to the next jackpot pool**. The pool carries across floors until you hit it. Jackpot base increases each floor (500 × floor number).

**7 slot symbols:** Credits, Amplify, Payload, Crumble, Shield, Overclock, Jackpot.

### Shop
Spend breach credits earned from Cache pegs on upgrades:
- Extra ball per floor
- Payload charge (start ball with a payload)
- Multiplier seed (start floor with higher multiplier)
- Ball speed modifications
- Persistent unlocks (new payloads + upgrades purchased once, stay forever)

---

## Game systems

### Multiplier
Starts at ×1. Every peg hit without dropping below ×1.5 speed increments the multiplier (capped at ×7). Ball color changes with multiplier tier — ×1 dim cyan, ×2 cyan, ×3 blue-white, ×4 green-white, ×5 yellow-white, ×6 orange-white, ×7 white with glow.

### Breach credits
Earned from Cache pegs. Spent in the shop. Persist across runs. Reputation score grows with lifetime breach earned.

### Floor progression
- **Floor 1:** 56 pegs, simple board, 500 credit jackpot base
- **Floor 2:** 56 pegs, introduces crumbling and ice
- **Floor 3–4:** 80 pegs, full peg variety, more hazards
- **Floor 5 (Boss):** 45 pegs, high-stakes layout, 2500 credit jackpot base

### Objectives
Each floor has a peg-clear objective (e.g., hit 20 pegs on floor 1). Completing it grants ball inventory back. Failing it (running out of balls before objective) ends the run.

### Special Floor Modes

**Standard Floors** — clear pegs to meet the target count. Nothing special.

**Timelock Mode (floors 4, 7, 10, ...)** — A countdown timer runs down from 45–60s. The HUD shows `⏱ Ns` at the top center. You win by **surviving until the timer hits zero without running out of balls**. If the timer reaches zero, the floor fails. Tip: play carefully and conserve balls — you don't need to clear all pegs, just last long enough.

**Ghost Mode (floors 7, 10, 13, ...)** — The ball phases through normal pegs but freezes on contact with **ice pegs**. You have a small ice-hit budget (2–3 hits depending on floor). Win by **depleting your ball supply without exceeding your ice-hit budget**. If you exceed the budget, the floor fails. Tip: ghost payload is excellent here — it lets you phase through pegs entirely.

**Boss Floors (every 5th floor: 5, 10, 15, ...)** — A large vault peg appears at the bottom of the board, requiring 22–60+ hits to crack. The objective bar tracks hits against it. Win by **hitting the vault enough times before running out of balls**. Tier breaches every 5 floors award bonus credits.

---

## Design

- **Aesthetic:** Terminal cyberpunk — dark background, neon accents, monospace UI elements, glitch effects
- **Platform:** Single HTML file, no dependencies, runs in any modern browser
- **Engine:** Vanilla JS + Canvas API, ~2,400 lines
- **Audio:** 5 BGM tracks mapped to game states (menu, gameplay, slot spin, game over, run end)
- **Persistence:** localStorage for run history, unlocked payloads, reputation, best floor

---

## Roadmap

### P2 — Polish (in progress)
- [ ] Particle FX pass — brighter, longer-lived, more variety
- [ ] Screen shake calibration — right intensity per peg type
- [ ] Dynamic ball trail — length scales with combo/speed
- [ ] Peg variety — more peg types, more board strategy
- [ ] Slot machine upgrade — more symbols, bigger payouts, skill element

### P3 — Systems (backlog)
- [ ] Achievement / unlock tracker
- [ ] Leaderboard (global scores)
- [ ] New Game+ mode
- [ ] Multiple board themes
- [ ] Steam workshop / community boards

---

## Why this exists

I wanted a game that felt like the slot machines in a cyberpunk mall — bright, chaotic, slightly oppressive, and impossible to walk away from. Slot Protocol is that: a pachinko board that doesn't care about you, a slot machine that always owes you money, and five floors that get harder every time you try.

Play it here: **[klampatech.github.io/rogue-pachinko](https://klampatech.github.io/rogue-pachinko)**