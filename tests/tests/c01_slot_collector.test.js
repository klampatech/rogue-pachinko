// c01_slot_collector.test.js — Slot mapping, unlock, collect, overflow
// Bert — physics + slots agent

export function runTests(TEST) {
  const results = [];
  const { is, ok, gt, lt, equal, throws } = TEST;

  function resetGS() {
    TEST.seed(42);
    GS.screen = 'playing';
    GS.ballsInPlay = [];
    GS.board = [];
    GS.multiplier = 1;
    GS.comboCount = 0;
    GS.frenzyActive = false;
    GS.shieldNextBall = false;
    GS.overclockActive = false;
    GS.overclockTimer = 0;
    GS.score = 0;
    GS.floorObjective = { type: 'standard', target: 20, progress: 0 };
    GS.floor = 1;
    GS.timeScale = 1.0;
    canDrop = true;
    dropX = 240;
    previewArc = [];
    GS.balls = 5;
    GS.pegsHit = new Set();
    GS.totalPegsCleared = 0;
    GS.chainTimer = 0;
    GS.livesLost = 0;
    GS.shieldActive = false;
    GS.slotAnimations = [];
    GS.frenzyReady = false;
    GS.frenzyTimer = 0;
    GS.slowmoBall = null;
    GS.timeScale = 1.0;
    GS.unlockedSlots = [0, 1, 6];
    GS.jackpotPool = 500;
    GS.jackpotBase = 500;
    GS.payloadInventory = [];
    GS.shieldNextBall = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: getSlotForX(x) — maps x to slot index 0–6
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('getSlotForX — slot 0 (x=0..64)', () => {
    is(getSlotForX(0), 0, 'x=0 → slot 0');
    is(getSlotForX(32), 0, 'x=32 → slot 0');
    is(getSlotForX(63), 0, 'x=63 → slot 0');
  }));

  results.push(TEST('getSlotForX — slot 1 (x=66..130)', () => {
    is(getSlotForX(66), 1, 'x=66 → slot 1');
    is(getSlotForX(100), 1, 'x=100 → slot 1');
    is(getSlotForX(129), 1, 'x=129 → slot 1');
  }));

  results.push(TEST('getSlotForX — slot 2 (x=132..196)', () => {
    is(getSlotForX(132), 2, 'x=132 → slot 2');
    is(getSlotForX(160), 2, 'x=160 → slot 2');
    is(getSlotForX(195), 2, 'x=195 → slot 2');
  }));

  results.push(TEST('getSlotForX — slot 3 CENTER (x=196..264, wider)', () => {
    is(getSlotForX(196), 3, 'x=196 → slot 3');
    is(getSlotForX(230), 3, 'x=230 → slot 3');
    is(getSlotForX(264), 3, 'x=264 → slot 3');
  }));

  results.push(TEST('getSlotForX — slot 4 (x=268..332)', () => {
    is(getSlotForX(268), 4, 'x=268 → slot 4');
    is(getSlotForX(300), 4, 'x=300 → slot 4');
    is(getSlotForX(331), 4, 'x=331 → slot 4');
  }));

  results.push(TEST('getSlotForX — slot 5 (x=334..398)', () => {
    is(getSlotForX(334), 5, 'x=334 → slot 5');
    is(getSlotForX(360), 5, 'x=360 → slot 5');
    is(getSlotForX(397), 5, 'x=397 → slot 5');
  }));

  results.push(TEST('getSlotForX — slot 6 (x=400..480)', () => {
    is(getSlotForX(400), 6, 'x=400 → slot 6');
    is(getSlotForX(440), 6, 'x=440 → slot 6');
    is(getSlotForX(479), 6, 'x=479 → slot 6');
  }));

  results.push(TEST('getSlotForX — boundary at gap returns -1', () => {
    // Slots have 2px gaps between them
    is(getSlotForX(65), -1, 'x=65 is in gap between slot 0 and 1');
    is(getSlotForX(131), -1, 'x=131 is in gap between slot 1 and 2');
  }));

  results.push(TEST('getSlotForX — center x=240 maps to slot 3', () => {
    is(getSlotForX(240), 3, 'center x=240 → slot 3');
  }));

  results.push(TEST('getSlotForX — far left x=10 maps to slot 0', () => {
    is(getSlotForX(10), 0, 'x=10 → slot 0');
  }));

  results.push(TEST('getSlotForX — far right x=470 maps to slot 6', () => {
    is(getSlotForX(470), 6, 'x=470 → slot 6');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: getSlotX(slotIdx) — returns x position of slot
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('getSlotX — slot 0 starts at x=0', () => {
    is(getSlotX(0), 0, 'slot 0 x=0');
  }));

  results.push(TEST('getSlotX — slot 3 (center) position', () => {
    const sx = getSlotX(3);
    // Slot 0: 0+64+2=66; slot 1: 66+64+2=132; slot 2: 132+64+2=198; slot 3 center: 198+68+2=268
    is(sx, 268, 'slot 3 starts at x=268');
  }));

  results.push(TEST('getSlotX — slot 6 (last) position', () => {
    const sx = getSlotX(6);
    // slot 5: 334+64+2=400; slot 6: 400+68+2=470? No, last slot extends to W=480
    ok(sx >= 400, 'slot 6 starts at x >= 400');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: isSlotUnlocked(idx) — floor-gated
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('isSlotUnlocked — floor 1: slots 0,1,6 unlocked', () => {
    resetGS();
    GS.floor = 1;
    GS.unlockedSlots = [0, 1, 6];
    ok(isSlotUnlocked(0), 'slot 0 unlocked at floor 1');
    ok(isSlotUnlocked(1), 'slot 1 unlocked at floor 1');
    ok(!isSlotUnlocked(2), 'slot 2 locked at floor 1');
    ok(!isSlotUnlocked(3), 'slot 3 locked at floor 1');
    ok(!isSlotUnlocked(4), 'slot 4 locked at floor 1');
    ok(!isSlotUnlocked(5), 'slot 5 locked at floor 1');
    ok(isSlotUnlocked(6), 'slot 6 unlocked at floor 1');
  }));

  results.push(TEST('isSlotUnlocked — floor 2: slots 0,1,2,6 unlocked', () => {
    resetGS();
    GS.floor = 2;
    GS.unlockedSlots = [0, 1, 2, 6];
    ok(isSlotUnlocked(0), 'slot 0 unlocked at floor 2');
    ok(isSlotUnlocked(1), 'slot 1 unlocked at floor 2');
    ok(isSlotUnlocked(2), 'slot 2 unlocked at floor 2');
    ok(!isSlotUnlocked(3), 'slot 3 locked at floor 2');
    ok(!isSlotUnlocked(4), 'slot 4 locked at floor 2');
    ok(!isSlotUnlocked(5), 'slot 5 locked at floor 2');
    ok(isSlotUnlocked(6), 'slot 6 unlocked at floor 2');
  }));

  results.push(TEST('isSlotUnlocked — floor 3: more slots unlock', () => {
    resetGS();
    GS.floor = 3;
    GS.unlockedSlots = [0, 1, 2, 3, 6];
    ok(isSlotUnlocked(0), 'slot 0 unlocked at floor 3');
    ok(isSlotUnlocked(1), 'slot 1 unlocked at floor 3');
    ok(isSlotUnlocked(2), 'slot 2 unlocked at floor 3');
    ok(isSlotUnlocked(3), 'slot 3 unlocked at floor 3');
    ok(!isSlotUnlocked(4), 'slot 4 locked at floor 3');
    ok(!isSlotUnlocked(5), 'slot 5 locked at floor 3');
    ok(isSlotUnlocked(6), 'slot 6 unlocked at floor 3');
  }));

  results.push(TEST('isSlotUnlocked — floor 5: slot 4 unlocks', () => {
    resetGS();
    GS.floor = 5;
    GS.unlockedSlots = [0, 1, 2, 3, 4, 6];
    ok(isSlotUnlocked(4), 'slot 4 unlocked at floor 5');
  }));

  results.push(TEST('isSlotUnlocked — all slots unlocked at high floor', () => {
    resetGS();
    GS.floor = 10;
    GS.unlockedSlots = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i < 7; i++) {
      ok(isSlotUnlocked(i), `slot ${i} unlocked at floor 10`);
    }
  }));

  results.push(TEST('isSlotUnlocked — locked slot returns false', () => {
    resetGS();
    GS.unlockedSlots = [0];
    ok(!isSlotUnlocked(5), 'slot 5 locked when not in unlockedSlots');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: updateUnlockedSlots() — dynamic slot unlock
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('updateUnlockedSlots — populates GS.unlockedSlots', () => {
    resetGS();
    GS.floor = 1;
    updateUnlockedSlots();
    ok(Array.isArray(GS.unlockedSlots), 'unlockedSlots is array');
    gt(GS.unlockedSlots.length, 0, 'at least some slots unlocked');
  }));

  results.push(TEST('updateUnlockedSlots — floor 1 unlocks slots 0,1,6', () => {
    resetGS();
    GS.floor = 1;
    updateUnlockedSlots();
    ok(GS.unlockedSlots.includes(0), 'slot 0 unlocked on floor 1');
    ok(GS.unlockedSlots.includes(1), 'slot 1 unlocked on floor 1');
    ok(GS.unlockedSlots.includes(6), 'slot 6 unlocked on floor 1');
  }));

  results.push(TEST('updateUnlockedSlots — floor 6 unlocks slot 5', () => {
    resetGS();
    GS.floor = 6;
    updateUnlockedSlots();
    ok(GS.unlockedSlots.includes(5), 'slot 5 unlocked on floor 6');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: triggerSlotCollected(idx) — all 7 effects
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('triggerSlotCollected(0) — CREDITS: +50 * multiplier', () => {
    resetGS();
    GS.multiplier = 1;
    GS.score = 0;
    GS.breachCredits = 0;
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    GS.board = [];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    is(GS.breachCredits, 50, 'credits += 50 * mult');
  }));

  results.push(TEST('triggerSlotCollected(0) — CREDITS: multiplier stacks', () => {
    resetGS();
    GS.multiplier = 3;
    GS.score = 0;
    GS.breachCredits = 0;
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    is(GS.breachCredits, 150, 'credits += 50 * 3 = 150');
  }));

  results.push(TEST('triggerSlotCollected(1) — AMPLIFY: multiplier +1', () => {
    resetGS();
    GS.multiplier = 1;
    GS.chainTimer = 0;
    const ball = new Ball(268, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 1);
    is(GS.multiplier, 2, 'AMPLIFY: multiplier increased to 2');
  }));

  results.push(TEST('triggerSlotCollected(1) — AMPLIFY: chainTimer extended', () => {
    resetGS();
    GS.multiplier = 1;
    GS.chainTimer = 0;
    const ball = new Ball(268, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 1);
    is(GS.chainTimer, TIMING.CHAIN_AMPLIFY, `AMPLIFY: chainTimer = ${TIMING.CHAIN_AMPLIFY}`);
  }));

  results.push(TEST('triggerSlotCollected(1) — AMPLIFY: chainTimer = 180 (3 sec)', () => {
    resetGS();
    GS.multiplier = 1;
    const ball = new Ball(268, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 1);
    is(GS.chainTimer, 180, 'AMPLIFY extends chain to 180 frames');
  }));

  results.push(TEST('triggerSlotCollected(2) — PAYLOAD: adds to inventory', () => {
    resetGS();
    GS.payloadInventory = [];
    const ball = new Ball(134, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 2);
    ok(GS.payloadInventory.length > 0, 'PAYLOAD slot adds to inventory');
  }));

  results.push(TEST('triggerSlotCollected(2) — PAYLOAD: inventory full → score instead', () => {
    resetGS();
    GS.payloadInventory = ['trojan', 'worm'];
    GS.score = 0;
    GS.multiplier = 1;
    const ball = new Ball(134, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 2);
    gt(GS.score, 0, 'PAYLOAD when full → score bonus');
  }));

  results.push(TEST('triggerSlotCollected(3) — CRUMBLE: clears 3 pegs', () => {
    resetGS();
    GS.board = [
      { x: 100, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 },
      { x: 200, y: 300, type: 'node', id: 1, destroyed: false, hitCount: 0 },
      { x: 300, y: 300, type: 'node', id: 2, destroyed: false, hitCount: 0 },
      { x: 400, y: 300, type: 'node', id: 3, destroyed: false, hitCount: 0 }
    ];
    GS.floorObjective = { type: 'standard', target: 20, progress: 0 };
    const ball = new Ball(230, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 3);
    const destroyed = GS.board.filter(p => p.destroyed);
    is(destroyed.length, 3, 'CRUMBLE destroys 3 pegs');
  }));

  results.push(TEST('triggerSlotCollected(3) — CRUMBLE: progress incremented', () => {
    resetGS();
    GS.board = [
      { x: 100, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 },
      { x: 200, y: 300, type: 'node', id: 1, destroyed: false, hitCount: 0 },
      { x: 300, y: 300, type: 'node', id: 2, destroyed: false, hitCount: 0 }
    ];
    GS.floorObjective = { type: 'standard', target: 20, progress: 0 };
    const ball = new Ball(230, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 3);
    gt(GS.floorObjective.progress, 0, 'CRUMBLE increments floorObjective progress');
  }));

  results.push(TEST('triggerSlotCollected(4) — SHIELD: sets shieldNextBall', () => {
    resetGS();
    GS.shieldNextBall = false;
    const ball = new Ball(402, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 4);
    ok(GS.shieldNextBall, 'SHIELD sets shieldNextBall = true');
  }));

  results.push(TEST('triggerSlotCollected(5) — OVERCLOCK: activates overclock mode', () => {
    resetGS();
    GS.overclockActive = false;
    GS.overclockTimer = 0;
    const ball = new Ball(468, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 5);
    ok(GS.overclockActive, 'OVERCLOCK activates overclockActive');
    is(GS.overclockTimer, 300, 'OVERCLOCK sets timer to 300 frames (5 sec)');
  }));

  results.push(TEST('triggerSlotCollected(6) — JACKPOT: adds to pool', () => {
    resetGS();
    GS.jackpotPool = 500;
    const ball = new Ball(476, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 6);
    is(GS.jackpotPool, 600, 'JACKPOT adds 100 to pool (at mult=1)');
  }));

  results.push(TEST('triggerSlotCollected(6) — JACKPOT: multiplier stacks', () => {
    resetGS();
    GS.multiplier = 2;
    GS.jackpotPool = 500;
    const ball = new Ball(476, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 6);
    is(GS.jackpotPool, 700, 'JACKPOT adds 100 * 2 = 200 to pool');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: triggerSlotCollected — slot animations
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('triggerSlotCollected — adds to GS.slotAnimations', () => {
    resetGS();
    GS.slotAnimations = [];
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    gt(GS.slotAnimations.length, 0, 'slot animation added');
  }));

  results.push(TEST('triggerSlotCollected — ball deactivated after collect', () => {
    resetGS();
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    ok(!ball.active, 'ball deactivated after slot collection');
  }));

  results.push(TEST('triggerSlotCollected — canDrop re-enabled', () => {
    resetGS();
    canDrop = false;
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    ok(canDrop, 'canDrop re-enabled after slot collection');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: triggerOverflow() — floor penalty
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('triggerOverflow — floor 1: -1 ball', () => {
    resetGS();
    GS.livesLost = 0;
    GS.shieldActive = false;
    GS.balls = 5;
    triggerOverflow(240, 620, 1, false);
    is(GS.livesLost, 1, 'floor 1: livesLost = 1');
  }));

  results.push(TEST('triggerOverflow — floor 2: -1 ball', () => {
    resetGS();
    GS.livesLost = 0;
    GS.shieldActive = false;
    triggerOverflow(240, 620, 2, false);
    is(GS.livesLost, 1, 'floor 2: livesLost = 1');
  }));

  results.push(TEST('triggerOverflow — floor 3: -2 balls', () => {
    resetGS();
    GS.livesLost = 0;
    GS.shieldActive = false;
    triggerOverflow(240, 620, 3, false);
    is(GS.livesLost, 2, 'floor 3: livesLost = 2');
  }));

  results.push(TEST('triggerOverflow — floor 4: slowmo triggered', () => {
    resetGS();
    GS.timeScale = 1.0;
    GS.shieldActive = false;
    triggerOverflow(240, 620, 4, false);
    is(GS.timeScale, 0.5, 'floor 4: timeScale = 0.5 (slowmo)');
  }));

  results.push(TEST('triggerOverflow — floor 5+: multiplier reset + pool penalty', () => {
    resetGS();
    GS.multiplier = 5;
    GS.jackpotPool = 1000;
    GS.shieldActive = false;
    triggerOverflow(240, 620, 6, false);
    is(GS.multiplier, 1, 'floor 6+: multiplier reset to 1');
    lt(GS.jackpotPool, 1000, 'floor 6+: jackpotPool reduced');
  }));

  results.push(TEST('triggerOverflow — SHIELD absorbs overflow (no penalty)', () => {
    resetGS();
    GS.livesLost = 0;
    GS.shieldActive = true;
    triggerOverflow(240, 620, 3, true);
    is(GS.livesLost, 0, 'shield absorbs overflow: livesLost = 0');
  }));

  results.push(TEST('triggerOverflow — SHIELD consumed after use', () => {
    resetGS();
    GS.shieldActive = true;
    GS.shieldNextBall = false;
    triggerOverflow(240, 620, 1, true);
    ok(!GS.shieldActive, 'shield consumed after overflow');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: SLOT_TYPES constant — all 7 types
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('SLOT_TYPES — 7 slots defined', () => {
    is(SLOT_TYPES.length, 7, '7 slot types');
  }));

  results.push(TEST('SLOT_TYPES[0] — CREDITS', () => {
    is(SLOT_TYPES[0].name, 'CREDITS', 'slot 0 name = CREDITS');
    is(SLOT_TYPES[0].icon, 'C', 'slot 0 icon = C');
  }));

  results.push(TEST('SLOT_TYPES[1] — AMPLIFY', () => {
    is(SLOT_TYPES[1].name, 'AMPLIFY', 'slot 1 name = AMPLIFY');
    is(SLOT_TYPES[1].icon, 'A', 'slot 1 icon = A');
  }));

  results.push(TEST('SLOT_TYPES[2] — PAYLOAD', () => {
    is(SLOT_TYPES[2].name, 'PAYLOAD', 'slot 2 name = PAYLOAD');
  }));

  results.push(TEST('SLOT_TYPES[3] — CRUMBLE', () => {
    is(SLOT_TYPES[3].name, 'CRUMBLE', 'slot 3 name = CRUMBLE');
  }));

  results.push(TEST('SLOT_TYPES[4] — SHIELD', () => {
    is(SLOT_TYPES[4].name, 'SHIELD', 'slot 4 name = SHIELD');
  }));

  results.push(TEST('SLOT_TYPES[5] — OVERCLOCK', () => {
    is(SLOT_TYPES[5].name, 'OVERCLOCK', 'slot 5 name = OVERCLOCK');
  }));

  results.push(TEST('SLOT_TYPES[6] — JACKPOT', () => {
    is(SLOT_TYPES[6].name, 'JACKPOT', 'slot 6 name = JACKPOT');
    is(SLOT_TYPES[6].color, '#ffd700', 'jackpot color is gold');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: SLOT_WIDTH and SLOT_CENTER_WIDTH constants
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('SLOT_WIDTH = 64', () => {
    is(SLOT_WIDTH, 64, 'SLOT_WIDTH is 64');
  }));

  results.push(TEST('SLOT_CENTER_WIDTH = 68 (center slot is wider)', () => {
    is(SLOT_CENTER_WIDTH, 68, 'SLOT_CENTER_WIDTH is 68');
  }));

  results.push(TEST('SLOT_START_Y = 560', () => {
    is(SLOT_START_Y, 560, 'SLOT_START_Y is 560');
  }));

  results.push(TEST('SLOT_HEIGHT = 50', () => {
    is(SLOT_HEIGHT, 50, 'SLOT_HEIGHT is 50');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: frenzy slot multiplier bonus
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('triggerSlotCollected — frenzy doubles slot effect', () => {
    resetGS();
    GS.frenzyActive = true;
    GS.multiplier = 2;
    GS.breachCredits = 0;
    const ball = new Ball(32, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 0);
    // CREDITS: 50 * mult * 2 (frenzy) = 50 * 2 * 2 = 200
    is(GS.breachCredits, 200, 'frenzy doubles slot effect');
  }));

  results.push(TEST('triggerSlotCollected — frenzy with AMPLIFY gives +2', () => {
    resetGS();
    GS.frenzyActive = true;
    GS.multiplier = 2;
    const ball = new Ball(268, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 1);
    is(GS.multiplier, 4, 'frenzy AMPLIFY: mult 2→4');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: updateSlotAnimations() — animation lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('updateSlotAnimations — expires completed animations', () => {
    resetGS();
    GS.slotAnimations = [
      { slotIdx: 0, color: '#ffaa00', phase: 'settle', timer: 31, total: 30, triggered: false }
    ];
    updateSlotAnimations();
    ok(GS.slotAnimations.length === 0, 'animation expired and removed');
  }));

  results.push(TEST('updateSlotAnimations — active animation persists', () => {
    resetGS();
    GS.slotAnimations = [
      { slotIdx: 0, color: '#ffaa00', phase: 'settle', timer: 10, total: 30, triggered: false }
    ];
    updateSlotAnimations();
    is(GS.slotAnimations.length, 1, 'active animation still present');
  }));

  return results;
}
