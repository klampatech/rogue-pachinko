# Gameplay Analysis — Slot Protocol 2.0
**Analyst:** Grover
**Session:** ~8 minutes active play (2 full runs)
**Build:** index.html (current, May 17 2026)

---

## 1. Does the game feel fun? What's the core satisfaction loop?

**Yes — but narrowly.** The core loop is solid: click to drop → ball bounces through pegs → every hit builds the chain multiplier → ball exits → repeat with 5 balls per run. The multiplier stacking (x1 → x2 → x3 → ... up to x7) is the primary source of satisfaction. Seeing `+150`, `+210`, `x3!` float up as combos build is genuinely compelling.

The **chain tension** is the hook: you're always one miss away from losing your multiplier streak, and each drop is a fresh gamble. Clearing 19 pegs in one run and watching the score climb from 0 to 2,650 felt great. The CRT visual aesthetic is strong — the scanlines, glow, glitch animations give it real personality.

**Where it falls short:** The *payoff* moments don't scale with the tension. A big combo builds anticipation, but then the ball just exits and the score ticks up by a modest amount. The "prize" for a good run is mostly just... more runs. The jackpot slots exist but feel like an afterthought.

---

## 2. Are the rules clear? What confused you?

**Not entirely.** Here's what I encountered:

- **Peg types are opaque.** I could see that orange pegs (ICE) sometimes flash red and cause something bad to happen (after 3 hits you lose a ball), but there's no label or tooltip. The green pegs (CACHE) show "+10" but I don't know what a CACHE is or why it matters. The cyan pegs look the same as regular pegs but break after 1-3 hits with no explanation.

- **What does "BREACH" mean?** The HUD shows "BREACH: 2,650" but I have no idea if that's credits, a multiplier, or something else. There's no legend. It goes up when I hit pegs but also seems to go up on its own. At end of run it shows "CONNECTION LOST" which is cool flavor but I have no idea if that's good or bad.

- **Ball count vs. lives.** I had 5 balls. After my first run I used all 5 and the run ended. But some balls seemed to "die" mid-flight (maybe hitting an ICE?) and I couldn't tell why I lost a ball without looking at the code.

- **The "DROPPING: 0/5 FRENZY!" line in the corner.** This appeared after my first run and stays on screen during menu. I have no idea what it means or why it's there. Is it something I triggered? A bug? A feature I activated?

- **Objective clarity.** "CLEAR 20 PEGS" — clear means hit once? Or destroy (for crumbling)? It wasn't obvious.

- **No explanation of payloads.** My starting loadout was "SCRAMBLER" and "TROJAN" but there's no in-game description of what they do. I had to guess: scrambler reverses direction? trojan spawns clones? Both felt like guesses.

---

## 3. Does progression make sense? (credits → shop → unlocks)

**It exists but barely matters during early play.**

I played two full runs. After the first run I had 0 credits. After the second, still 0 credits. I never understood when or how credits accumulated — the HUD shows "BREACH: X" but there's no separate "credits" counter visible in the main HUD. I found the shop button and clicked it: the shop showed items costing 50–500 credits but with 0 shown anywhere, I had no idea if I was close to affording anything.

The **ranking system** (Script Kiddie → ...) is completely opaque. The menu shows "RANK: Script Kiddie" but there's no indication of what the next rank is, how to earn it, or what it unlocks. The `unlockRank` fields exist in the PAYLOADS definitions but nothing in the UI indicates that rank gates exist.

**What I wanted:** A sense that each run was making progress — credits ticking up, a progress bar toward the next rank, something. Instead: runs felt like they existed in a loop with no memory of progress.

---

## 4. New features — implemented and working as intended?

### Ghost Ball
**Not tested** — I didn't have it in my loadout and couldn't tell from the shop whether it was locked or just not purchased.

### Cluster Ball
**Not tested** — same.

### Explosive Ball
**Not tested** — same.

### Slow-Mo Ball
**Not tested** — same.

### Crumbling Pegs
**Partially visible but broken?** I could see some cyan pegs that had small dots below them (the hit counter), and occasionally one would break with a "SHATTER!" message. But I couldn't tell if it was a crumbling peg or just a regular peg being destroyed. The visual indicator (dots below peg) was too small to read during fast gameplay. Also: crumbling pegs awarding 0 points felt bad — they look like regular pegs but punish you for hitting them. This creates a *negative* feedback loop where hitting a crumbling peg actively hurts your score.

### Seismic Pegs
**Working but underwhelming.** Magenta pegs hit hard and triggered visible screen shake + spark burst. The "+100" text floated up. This was the most satisfying of the new peg types to interact with — it actually felt "seismic." But I only noticed it when I happened to hit one; there's no aura or idle animation that tells you "this peg is seismic" before you hit it.

### Jackpot Slots
**Broken UX.** The slot machine appears in the floor-complete overlay but you have to manually click "SPIN" — the game doesn't prompt you or indicate this is expected. On my first run (floor 1 complete), the slot machine showed but I sat there for 10+ seconds wondering if something was supposed to happen automatically. Then I noticed the SPIN button and clicked it. The reels spun (left→center→right with delays, good), stopped, and... nothing happened. I got no match. I clicked CONTINUE and went to floor 2.

**The 3x match didn't fire for me in two completions.** I don't know if that's bad luck or broken. The jackpot was 500 × floor = 500 credits on floor 1 — that would've been huge. But I never saw it trigger.

### Frenzy Mode
**Confused me more than it thrilled me.** The spec says "clear 5 pegs in a single drop" triggers Frenzy. I don't think I triggered it in my session, or if I did, I couldn't tell. The text "FRENZY!" appears in the corner of the menu screen (see above) which made me think I had triggered something persistent. But there's no visual feedback during gameplay that says "FRENZY READY" or "FRENZY ACTIVE." The HUD multiplier display is just a tiny `x1` text in the corner — barely visible.

---

## 5. What's missing, broken, or confusing?

### Critical UX Issues

1. **Combo counter shows "DROPPING: 0/5" always.** It's frozen at 0. During a run where I'm hitting 19 pegs, it never updates from 0. This means the player has no idea they're 5 hits away from Frenzy. The Frenzy mechanic is effectively invisible.

2. **Multiplier display is too subtle.** `x1` in the corner is nearly invisible during fast gameplay. You only notice it when you're already paying close attention. The spec calls for a prominent multiplier badge — this is critical to the "combo feels powerful" experience.

3. **Jackpot spin is non-obvious.** The floor-complete overlay shows the slot machine and just... waits. You have to notice and click SPIN yourself. There's no animation prompting you, no "SPIN TO WIN" prompt, nothing.

4. **HUD shows "BREACH" but credits are something else.** The number in the HUD (called "BREACH") increments constantly during play, but the shop has a separate "breach credits" counter. I couldn't tell if my HUD score was credits, points, or both.

5. **FRENZY! text on the menu screen is unexplained.** It appears below "DROPPING: 0/5" and I have no idea if this is a bug, a leftover from a previous run, or a persistent state I should understand.

6. **Crumbling pegs feel like a trap.** They look like regular cyan pegs but give 0 points. There's no visual language distinguishing them before you hit them (the hit counter dots are too small to read at speed). You feel *punished* for hitting the wrong peg, which is the opposite of satisfying.

### Gameplay Issues

7. **No sense of progression between runs.** Ranks exist in the menu but never update. Credits are invisible during play. After 2 runs, I had no feeling that I'd made progress toward anything.

8. **Payload descriptions in shop are one-line and cryptic.** "Phase through 3-5 pegs" for Ghost is good. "Explode radius" for Explosive is OK. But there's no tooltips, no "how this feels" description, no comparison to other options.

9. **Rank unlock gates are invisible.** I don't know what rank I'm working toward or what I need to do to get there. The unlock system could be completely removed and I wouldn't notice — nothing indicates it's active.

10. **Ball drop aim is imprecise.** Click anywhere on the canvas and the ball drops at that X position. But the drop zone is a narrow strip at the top and the ball spawns with a small random velocity. It feels like a slot machine pull — fine, but there's no skill expression in aiming. The ball essentially picks its own trajectory.

---

## 6. What would make it more addictive / replayable?

### Must-Have (feels broken without)

1. **Visible, updating combo counter.** The "DROPPING: N/5" display must update live during each drop. Players need to know they're building toward Frenzy.

2. **Prominent multiplier display.** Move `x1` / `x2` / etc. to a larger, animated element near the center of the board — not hidden in a corner. When you're at x5, it should feel exciting.

3. **Jackpot prompt.** After floor clear, the game should say "SPIN FOR BONUS!" or auto-trigger the slots with a countdown. Don't make the player guess they need to click SPIN.

4. **Fix the FRENZY text.** If Frenzy triggered, show "FRENZY READY!" as a float text during gameplay, not as a persistent corner decoration on the menu screen.

### Should Have (significant quality-of-life)

5. **Credits visible during play.** The HUD should show your spendable credits (GS.breachCredits) separate from score (GS.score). Each peg hit that awards credits should flash "+5c" or similar so you feel the accumulation.

6. **Rank progress indicator.** Show "Script Kiddie → Netrunner: 60% progress" on the menu. Give players something to work toward between runs.

7. **Explain peg types on first encounter.** The first time you hit an ICE peg, flash "ICE — hit 3x to trip!" as a one-time tip. First time you hit a CACHE, show "CACHE +10 credits." Tutorialize through discovery, not a manual.

8. **Differentiate crumbling pegs visually.** Make them look cracked even before you hit them. Or give them a subtle pulsing animation. Right now you can't tell them apart from regular pegs until they break, and breaking one *hurts* your score.

9. **Make jackpot matter more.** A floor 1 jackpot of 500 credits is underwhelming. Either scale it up or add a "credit streak" bonus — consecutive floor clears without dying grant escalating jackpot multipliers.

### Nice to Have (delighters)

10. **Ball trail color changes with multiplier.** At x1, cyan trail. At x3, magenta. At x5+, gold. Make high-combo states visually distinct and exciting.

11. **Screen flash on big hits.** When multiplier crosses 4, flash the screen edge briefly. When it hits 7, go bigger. The screen flash on seismic pegs (which is subtle) shows the right instinct — do it more.

12. **Sound design (or at least stronger visual audio cues).** The game is silent. Every "thunk" of a ball hitting a peg should have visual punctuation. The "virtualize the audio" approach (screen shake, flash, particles) works but needs to be more aggressive.

13. **Auto-spin slots option.** "AUTO-SPIN" toggle that automatically triggers the jackpot spin on floor clear, with a 3-second countdown showing the reels. Players who don't care can skip, players who do care get the drama.

14. **Encourage "one more run."** After run end, the menu should show: credits earned this run, rank progress toward next, and a highlighted "NEXT FLOOR" button. Remove friction between runs.

---

## Summary Scorecard

| Dimension | Rating | Notes |
|---|---|---|
| Core loop fun | 7/10 | Multiplier stacking is genuinely compelling |
| Rule clarity | 4/10 | Peg types, payload effects, and credits are opaque |
| Progression | 3/10 | Exists but invisible and un-motivating |
| New feature implementation | 5/10 | Core code is there; UX wiring is missing |
| Polish | 4/10 | Orphaned dead code; combo counter frozen; jackpot non-obvious |
| Replayability hook | 5/10 | Runs feel same-y; not enough variety or reward escalation |

**Bottom line:** The game has real bones — the core drop → chain → multiplier loop is satisfying. But the new features (Slot Protocol 2.0) are half-baked in implementation: critical UI elements are frozen or missing, the jackpot/frenzy hooks don't fire, and progression feels invisible. It's a game that *could* be addictive but currently isn't fully realized. Fix the UX wiring and it could be significantly better.

---

*End of Gameplay Analysis*