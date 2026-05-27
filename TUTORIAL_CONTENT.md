# Floor 5 — Timelock Tutorial Content

## Suggested Modal Body Text

```
FLOOR 5 — TIME LOCK

On this floor you race against the clock. A timer counts down from 39 seconds — clear ALL the glowing cyan ICE PEGS before it hits zero, or you fail the floor!

Ice Pegs pulse with cyan light. They're the only objective here. Hit every single one to beat the timelock.

Ice Pegs briefly freeze your ball on contact — plan your drops carefully. Don't waste time bouncing around. Aim clean and hit those cyan pegs fast!
```

## Usage

Replace lines 5662-5669 in index.html with:

```js
showTutorialModal(
  'FLOOR 5 — TIME LOCK',
  `On this floor you race against the clock. A timer counts down from ${timeLimit} seconds — clear <span style="color:#88ccff;">ALL ICE PEGS</span> before it hits zero, or you fail!<br><br>` +
  `Ice Pegs pulse with <span style="color:#88ccff;">cyan light</span>. They're the only objective here. Hit every single one to beat the timelock.<br><br>` +
  `Ice Pegs briefly freeze your ball on contact — plan your drops carefully. Aim clean and hit those cyan pegs fast!`,
  'floor5_timelock'
);
```

## Notes

- `timeLimit` comes from `GS.floorObjective.timeLimit` (default 39)
- The modal uses `persistKey = 'floor5_timelock'` so it only shows once per run
- Cyan color (`#88ccff`) matches the ICE PEG visual style used elsewhere in the game
- Simple, direct sentences — mobile player reads at a glance
- 3 short paragraphs: what timelock is → what the objective is → how ice pegs behave
