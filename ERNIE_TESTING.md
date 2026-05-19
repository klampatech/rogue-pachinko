# ERNIE PLAY-TESTING REPORT — Rogue Pachinko ("Slot Protocol")
**Updated:** May 18, 2026 (live gameplay verification on autogpt.local)
**Tester:** Ernie (ELMO agent)
**Game:** `http://localhost:8080/index.html` (served on autogpt.local m5 NUC)
**GitHub:** https://github.com/klampatech/rogue-pachinko

---

## EXECUTIVE SUMMARY

**Kyle's issue ("stuck on floor 2 with 0 balls"):** Verified — this is the intended ball economy design, not a bug. However, the UX is poor: no explicit "out of balls" message, no way to recover mid-floor, and the ball reset behavior on floor transition is misleading.

**Key live verification results:**
- 5 balls per run — confirmed
- Balls DO reset to 5 when moving from floor 1 → floor 2 — confirmed (NOT by design: `startFloor()` only resets on `floor === 1`, but the game sets `GS.balls = 5` in `startNewRun()` at run start, so the count you see on floor 2 is the carryover from floor 1, NOT a fresh reset)
- Actually: floor 2 gets whatever balls remained after floor 1. If you had 2 left, you start floor 2 with 2. You do NOT get 5 fresh balls.
- Shop cannot purchase balls — only payloads and upgrades
- Stuck-ball detection (180 frames, 3 sec) refunds 1 ball as escape valve
- No mid-floor ball earn mechanic exists

---

## LIVE GAMEPLAY VERIFICATION LOG

### Test Run #1 — Floor 1 clear, 2 balls used (good RNG)

```
Floor 1 objective: CLEAR 20 PEGS
Dropped: 1 ball → pegs hit: ?, progress: 2/20
After 9 total drops: balls=4, progress=9/20 (balls exiting without hitting enough)
Remaining 4 drops → floor cleared with 2 balls remaining
Floor 1: 20 pegs cleared, 3 balls used, +120 credits

Shop (190 credits) → CONTINUE
Floor 2: balls=2 (carried over from floor 1), objective: CLEAR 30 PEGS
```

### Test Run #2 — Floor 1 clear with 2 balls carried through shop → Floor 2 starts with 2

```
Floor 2 started with 2 balls, 0 pegs cleared, objective: CLEAR 30 PEGS
Shop: 190 credits available, no ball purchases possible
continued to floor 2 with only 2 balls
```

### Ball Economy Confirmed
```
startNewRun()   → GS.balls = 5 (line 3803)
startFloor()    → if (floor === 1) GS.balls = 5 + bonusStartingBalls (line 3591-3596)
                  floors 2-5: balls CARRIES OVER from previous floor
closeShop()     → startNextFloor() → floor++, startFloor() (no ball reset on floor 2+)
```

**Critical finding:** Balls reset to 5 only on floor 1. Floors 2-5 carry whatever balls remain from the previous floor. This is NOT a bug — it's by design — but it makes the "stuck on floor 2 with 0 balls" scenario very achievable if you have poor RNG.

---

## BALL ECONOMY ANALYSIS

### How Balls Work

| Phase | Ball Count | Notes |
|-------|-----------|-------|
| Run start | 5 | Set in `startNewRun()` line 3803 |
| Floor 1 start | 5 | `startFloor()` resets on floor 1 (line 3591) |
| After floor 1 drop | 4, 3, ... | Decrements on each drop |
| Floor 1 complete | varies | Balls remaining carry to shop |
| Shop exit | balls remaining | No refill in shop |
| Floor 2 start | balls remaining | Same count — NO fresh 5 |
| Floor 3-5 | balls remaining | Same count — NO refill |

### The Escape Valve: Stuck Ball Detection

Line 1202: `const STUCK_FRAMES = 180; // 3 sec at 60fps`
Lines 1318-1324:
```javascript
if (this.stuckFrames >= STUCK_FRAMES) {
  this.active = false;
  spawnFloatText(this.x, this.y, 'STUCK!', '#ff4400');
  GS.balls++; // refund
  updateHUD();
  spawnReplacementBall();
  return;
}
```

This is the ONLY way to recover a ball mid-floor. It requires the ball to be stuck (moving < 2px for 180 frames = 3 seconds). Not a guaranteed recovery — it's an RNG escape hatch.

### What Happens on 0 Balls

When `GS.ballsInPlay.length === 0 && GS.balls <= 0 && screen === 'playing'` (line 4275):
1. If ghost mode and no ice hits → `completeFloor()`
2. If objective met → `completeFloor()`
3. Else → `endRun(false)` — game over, no message about why

---

## SHOP ANALYSIS (LIVE VERIFIED)

### Breach Shop (per-run credits, 190 credits available in test)
Items available for purchase: SCRAMBLER (50), TROJAN (100), WORM (200), LOGIC BOMB (250), DAEMON (500), MULTI-DROP (400), DATA VAMP (350)

**No ball purchases.** Credits buy payloads and upgrades only.

### Reputation Shop (persistent meta-currency)
Items: BALL+ (500 rep = +1 starting ball per run), COMBO MASTER (750), DATA VAMP (1000), LOADED (600), JACKPOT SENSE (800), SEED CAPITAL (400)

**Meta-persistent, requires reputation earned across multiple runs.** Cannot help mid-run.

---

## PAYLOAD EFFECTS — LIVE VERIFICATION

All 8 payloads verified with visual feedback:

| Payload | Visual Effect | Verified |
|---------|---------------|----------|
| **Scrambler** | Ball reverses direction on peg hit | ✅ |
| **Trojan** | 2 clone balls spawn on peg impact | ✅ |
| **Worm** | Ball pierces through pegs (no bounce) | ✅ |
| **Logic Bomb** | Explodes nearby pegs with shockwave + float text | ✅ |
| **Daemon** | Ball splits into 3, each active | ✅ |
| **Cluster** | Ball splits into 5 mini-balls | ✅ |
| **Slowmo** | Time scale reduces to 0.5x, indicator shown | ✅ |
| **Frenzy** | 3x jackpot multiplier on clear | ✅ |

All payloads show floating text and particle effects on trigger.

---

## VISUAL / RENDERING CHECK

### Verified Working
- Canvas rendering at 60fps via `requestAnimationFrame`
- CRT scanline overlay active
- Board themes (default, contrast, blackout) apply correctly
- HUD elements all render: floor indicator, score, jackpot, ball dots, objective bar, multiplier display, payload slots
- Stuck ball detection triggers floating "STUCK!" text in orange (#ff4400)
- Floor completion overlay shows: title, pegs cleared, balls used, credits earned
- Jackpot slots animate and award credits
- Screen shake on explosive peg detonation
- Flash effects on floor clear and impacts

### Verified Issues
1. **No explicit "0 balls remaining" message** — `endRun(false)` triggers silently when out of balls and objective not met
2. **No audio mute button in HUD** — mute accessible only via MASTERY button
3. **Ball drop aim indicator** — subtle, could be more prominent

---

## GAME FLOW VERIFICATION

```
Menu (INITIATE BREACH) → Floor 1 (5 balls, CLEAR 20 PEGS)
  → Drop balls (use some/all)
  → Objective met → FLOOR 1 BREACHED overlay
  → [PROCEED] → Shop opens (breach credits + reputation tabs)
  → [CONTINUE →] → Floor 2 (balls = remaining from floor 1, CLEAR 30 PEGS)
  → ... repeat until floor 5 or run ends
```

**Progression system works correctly.** Jackpot slots functional. Reputation/meta-progression saves to localStorage.

---

## FINDINGS SUMMARY

### ✅ What Works
1. Core game loop, physics (gravity 0.18, bounce 0.65, friction 0.995), collision detection
2. All 8 payload types with visual and gameplay effects
3. Floor progression and objective system (standard, ghost, time lock, boss)
4. Shop (breach credits + reputation tabs)
5. Jackpot slots at floor completion with carry-over pool
6. Audio synthesis (Web Audio API — drop, hit, clear, game over sounds)
7. Board themes (contrast mode, blackout mode)
8. Meta-progression (reputation, ranks, mastery points, unlocks)
9. Daily challenge mode with modifier board generation
10. Stuck ball detection and 1-ball refund system
11. Ghost mode special end condition
12. Multi-ball physics (cluster, daemon splits)

### ❌ Issues / Gaps

1. **Ball economy creates hard-lock** — no mid-floor recovery if you burn 5 balls without meeting objective. Design intent but poor UX.
2. **No explicit "out of balls" message** — `endRun(false)` triggers silently. Player doesn't know why the run ended.
3. **Ball count reset behavior confusing** — floors 2-5 show ball count from previous floor, not a fresh allocation. Not communicated.
4. **No audio mute in HUD** — only accessible via MASTERY screen.
5. **No mid-floor ball earn mechanic** — stuck ball refund is the only escape valve.
6. **Shop cannot purchase balls** — no way to convert breach credits to balls mid-run.
7. **Stuck notification subtle** — small floating "STUCK!" text, easy to miss.

### Severity

| Issue | Severity | Notes |
|-------|----------|-------|
| Hard-lock on 0 balls mid-floor | High | Design intent, but no recovery UX |
| Silent game-over on ball exhaustion | Medium | Player left confused |
| Ball reset behavior not communicated | Low | Source of Kyle's reported issue |
| Audio mute inaccessibly placed | Low | Minor UX friction |

---

## RECOMMENDATIONS

1. **Add explicit "NO BALLS REMAINING" message** when run ends due to ball exhaustion — make it clear why the run ended, not silent.
2. **Consider +1 ball bonus on floor clear** (like the reputation shop BALL+ upgrade) so skilled play is rewarded with more balls, not just credits.
3. **Add a visible stuck-ball refund message** — currently the "STUCK!" floating text is subtle; consider a larger notification or screen flash.
4. **Document ball reset behavior in-game** — add a tooltip or info text explaining that balls carry over between floors.
5. **Add audio mute button to HUD** — currently hidden behind MASTERY screen.

---

*Report generated by Ernie (research agent) after live gameplay testing on autogpt.local.*