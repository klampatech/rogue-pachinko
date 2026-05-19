# P3 Systems Spec — Rogue Pachinko

## 1. Leaderboard (Local-Only v1)

### Goal
Top 10 local high scores. No backend, no server. Stored in `localStorage` via `PERSIST.leaderboard`.

### Data Shape
```js
// PERSIST.leaderboard = [
//   { name: 'AAA', score: 48200, floor: 7, date: '2025-05-19' },
//   ...
// ]
```

### Rules
- **Max 10 entries** — oldest entry dropped when a new score qualifies
- **Qualifies** if `score > 0`
- **Duplicate names allowed** (same player can appear multiple times)
- **Sorted** descending by score; ties broken by earlier date
- Entry added **only at run-end** (game over screen), after `savePersist()` runs

### UI
- Triggered by `LEADERBOARD` button in menu
- Renders in the same overlay slot as `MASTER` / `SKINS` (reuses overlay pattern)
- Shows rank `#1`–`#10`, name, score (formatted with `toLocaleString()`), floor reached, date
- `#1` entry gets a gold highlight
- `CLEAR` button to wipe leaderboard (with confirm dialog)

### Implementation
- `addToLeaderboard(name, score, floor)` — called at run-end
- `openLeaderboard()` — renders the overlay
- Stored as JSON in `PERSIST.leaderboard`, synced in `savePersist()`
- Name entry: 3-character input (like arcade initials), shown once on game-over screen before submitting score

---

## 2. Achievements

### Goal
Track and celebrate specific accomplishments. Self-contained tracking system independent of run state.

### Data Shape
```js
// PERSIST.achievements = ['firstPeg', 'floor3', 'x5mult', ...] // array of achievement IDs earned
```

### Definition Table

| ID | Name | Description | Condition |
|----|------|-------------|-----------|
| `firstPeg` | INITIATED | First peg cleared | `totalPegsCleared >= 1` |
| `floor3` | ADVANCED OPERATIVE | Reached floor 3 | `bestFloor >= 3` |
| `floor5` | ELITE HACKER | Reached floor 5 | `bestFloor >= 5` |
| `x3mult` | ESCALATION | Hit 3× multiplier | `GS.multiplier >= 3` at any point |
| `x5mult` | OVERCLOCKED | Hit 5× multiplier | `GS.multiplier >= 5` at any point |
| `x7mult` | PROTOCOL BREACH | Hit 7× multiplier | `GS.multiplier >= 7` at any point |
| `jackpotWin` | JACKPOT | Won the jackpot | `jackpotPool >= jackpotBase && reel[0] === reel[1] === reel[2]` |
| `combo5` | CHAIN REACTION | 5 consecutive pegs | `comboCount >= 5` at any point |
| `combo10` | CASCADE FAILURE | 10 consecutive pegs | `comboCount >= 10` at any point |
| `fiftyRuns` | VETERAN | Completed 50 runs | `totalRuns >= 50` |
| `hundredRuns` | LIFETIME MEMBER | Completed 100 runs | `totalRuns >= 100` |
| `fullBoard` | COMPLETIONIST | Cleared 100% of pegs on any floor | `floorObjective.progress === floorObjective.target` |
| `allPayloads` | ARMORY | Unlocked all payloads | all payloads in `unlockedPayloads` |
| `firstContract` | CONTRACTOR | Completed first contract | `completedContracts.length >= 1` |

### Tracking
- Achievements checked in two places:
  1. **Run-end** (`endRun()` / `completeFloor()`) — for run-bound achievements (`floor3`, `floor5`, `fullBoard`)
  2. **Live during run** — for instant achievements (`firstPeg`, `x3mult`, `combo5`) checked in peg-hit / score-update handlers
- Achievements already have a `showAchievement(id)` function in the codebase — it fires a toast
- Already tracking: `showAchievement('firstPeg')`, `'x3mult'`, `'x5mult'` in existing code
- Add remaining IDs to the tracking calls

### Toast System (already exists, wire up)
```js
function showAchievement(id) {
  if (PERSIST.achievements.includes(id)) return; // already earned
  PERSIST.achievements.push(id);
  // Toast: spawnFloatText + flash + icon
  spawnFloatText(W/2, H/2, `🏆 ${ACHIEVEMENTS[id].name}`, '#ffd700');
  triggerFlash('#ffd70033', 0.3);
}
```

### UI — Achievement Screen
- Menu button: `ACHIEVEMENTS` (or inside `MASTER` screen)
- Grid of achievement cards — locked ones are dark/grayed, earned ones are bright with glow
- Each card shows: icon (emoji), name, description, "✓ EARNED" badge or "???" for locked

---

## 3. New Game+

### Goal
Define what persists across runs and what resets. Establish the meta-progression loop.

### Current State (what already exists)

`PERSIST` survives across runs. Per-run state in `GS` resets on each `startNewRun()`.

Already carried over:
- `reputation` — accumulates
- `lifetimeBreach` — accumulates
- `totalRuns` — incremented
- `bestFloor` — best floor reached (never decreases)
- `unlockedPayloads` — permanently unlocked payloads
- `unlockedUpgrades` — permanently unlocked upgrades
- `masteryPoints` — accumulated
- `purchasedUpgrades` — permanent upgrade tiers

### New Game+ Rules

**What carries over (already in PERSIST):**
- Reputation, lifetime breach
- Unlocked payloads (no longer need to re-buy)
- Mastery points + purchased mastery upgrades
- Unlocked ball colors / board themes
- Achievements (permanent)
- Leaderboard entries (permanent)

**What resets each run:**
- Floor, score, balls, multiplier
- Current payloads (need to re-buy or re-select)
- Board layout (new seed each run)
- Combo streak, frenzy state
- Jackpot pool (resets to floor-scaled base each run)

**Meta-progression: Mastery System (extend existing)**

Already exists in codebase as `PERSIST.purchasedUpgrades` + `GS.masteryPoints`. Extend with these upgrade tracks:

| Upgrade | Effect | Cost (MP) |
|---------|--------|-----------|
| STARTING_BALLS +1 | Start runs with +1 ball per tier | 100 MP |
| STARTING_BALLS +2 | — | 250 MP |
| STARTING_CREDITS +50 | Start with +50 breach credits | 100 MP |
| STARTING_CREDITS +100 | — | 250 MP |
| AUTO_PAYLOAD | Start each run with 1 random payload | 500 MP |
| JACKPOT_BOOST | +10% jackpot pool growth | 300 MP |
| PEG_BONUS | +10% score per peg | 200 MP |
| COMBO_THRESHOLD -1 | Frenzy triggers at combo ≥ 2 instead of 3 | 400 MP |

**Prestige (future, spec only — no implementation in this sprint)**

When `totalRuns >= 100` and `bestFloor >= 5`:
- Option to "Prestige" — resets reputation, mastery points, purchased upgrades
- In exchange: earn a `Prestige Level` badge that applies a permanent global multiplier to all score

---

## 4. Daily Challenge (Bonus, depends on seed system)

### Goal
One challenge per day, seeded by date. Same board layout for all players on the same day.

### Implementation
- Seed: `YYYY-MM-DD` string → hash → used as `rng` seed in `generateBoard()`
- Same layout for everyone on the same day
- Score submitted to local leaderboard with `(DAILY)` prefix in name
- `DAILY CHALLENGE` button in menu (already exists in codebase)
- Best daily score tracked in `PERSIST.dailyChallenge.bestDailyScore`
- New challenge each calendar day (date string comparison)

### Rules
- 3 balls only (fixed, not adjustable)
- No mastery upgrades apply during daily run
- Floor 3 layout only (fixed difficulty)
- On completion: show how your score compares to your best daily score
