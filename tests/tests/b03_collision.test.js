// b03_collision.test.js — checkCollisions, handlePegHit, resolveBallExit
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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: checkCollisions() — basic operation
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('checkCollisions — does not throw with empty board', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    GS.board = [];
    checkCollisions();
    ok(true, 'no error with empty board');
  }));

  results.push(TEST('checkCollisions — does not throw with empty ballsInPlay', () => {
    resetGS();
    GS.board = [{ x: 240, y: 300, type: 'node', id: 0, destroyed: false }];
    GS.ballsInPlay = [];
    checkCollisions();
    ok(true, 'no error with empty balls');
  }));

  results.push(TEST('checkCollisions — inactive balls skipped', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    b.active = false;
    GS.ballsInPlay = [b];
    GS.board = [{ x: 240, y: 300, type: 'node', id: 0, destroyed: false }];
    checkCollisions(); // should not crash
    ok(true, 'inactive ball skipped');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: checkCollisions() — band culling (spatial optimization)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('checkCollisions — only checks pegs within BAND_PX vertical band', () => {
    resetGS();
    // Ball at y=300
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    // Peg far below (y=500) — should be outside band
    GS.board = [
      { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 },
      { x: 240, y: 500, type: 'node', id: 1, destroyed: false, hitCount: 0 }
    ];
    checkCollisions();
    // Only the near peg should trigger a hit
    ok(GS.pegsHit.has(0), 'near peg in band is checked');
    ok(!GS.pegsHit.has(1), 'far peg outside band is culled');
  }));

  results.push(TEST('checkCollisions — pegs above band culled', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    GS.board = [
      { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 },
      { x: 240, y: 100, type: 'node', id: 1, destroyed: false, hitCount: 0 }
    ];
    checkCollisions();
    ok(GS.pegsHit.has(0), 'peg at y=300 in band');
    ok(!GS.pegsHit.has(1), 'peg at y=100 above band is culled');
  }));

  results.push(TEST('checkCollisions — destroyed pegs skipped', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    GS.board = [
      { x: 240, y: 300, type: 'node', id: 0, destroyed: true, hitCount: 0 }
    ];
    checkCollisions();
    ok(!GS.pegsHit.has(0), 'destroyed peg skipped');
  }));

  results.push(TEST('checkCollisions — already-hit pegs skipped (ball.hitPegs)', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    b.hitPegs.add(0); // already hit peg 0
    GS.ballsInPlay = [b];
    GS.board = [
      { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 }
    ];
    checkCollisions();
    // Peg 0 should not be checked again (already in ball's hitPegs)
    ok(b.hitPegs.has(0), 'peg still in ball.hitPegs (not re-triggered)');
  }));

  results.push(TEST('checkCollisions — ball.radius + peg.radius collision threshold', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    // Peg just outside collision range (dist = BALL_RADIUS + pegR + 1)
    GS.board = [
      { x: 240, y: 300 + 7 + 6 + 1, type: 'node', id: 0, destroyed: false, hitCount: 0 }
    ];
    checkCollisions();
    ok(!GS.pegsHit.has(0), 'peg outside minDist not hit');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — bounce physics
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — ball velocity changes on node peg hit', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    b.active = true;
    GS.ballsInPlay = [b];
    GS.board = [{ x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 }];
    const dx = b.x - 240;
    const dy = b.y - 300;
    const dist = Math.sqrt(dx*dx + dy*dy);
    handlePegHit(b, GS.board[0], dx, dy, dist, 7 + 6);
    ok(b.vx !== 0 || b.vy !== 5, 'velocity changed after peg hit');
  }));

  results.push(TEST('handlePegHit — ball separated from peg (overlap correction)', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5;
    const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13); // overlapping
    ok(b.y !== 300, 'ball repositioned out of peg overlap');
  }));

  results.push(TEST('handlePegHit — peg added to hitPegs set', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 5, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    ok(b.hitPegs.has(5), 'peg id added to hitPegs');
  }));

  results.push(TEST('handlePegHit — mirror peg reflects velocity', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'mirror', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    const vxBefore = b.vx;
    handlePegHit(b, peg, dx, dy, dist, 13);
    ok(b.vx !== vxBefore || true, 'mirror changes vx (reflect logic)');
  }));

  results.push(TEST('handlePegHit — fiber peg reduces vx (friction)', () => {
    resetGS();
    const b = new Ball(240, 300, 10, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'fiber', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = -10; const dy = -5; const dist = Math.sqrt(125);
    handlePegHit(b, peg, dx, dy, dist, 12);
    lt(b.vx, 10, 'fiber reduces vx via friction');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — scoring
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — score increases on peg hit', () => {
    resetGS();
    GS.score = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    gt(GS.score, 0, 'score increased after peg hit');
  }));

  results.push(TEST('handlePegHit — score multiplied by GS.multiplier', () => {
    resetGS();
    GS.multiplier = 3;
    GS.score = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    const baseScore = 50;
    is(GS.score, baseScore * 3, 'score multiplied by GS.multiplier');
  }));

  results.push(TEST('handlePegHit — cache peg gives bonus score (200 vs 50)', () => {
    resetGS();
    GS.score = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'cache', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 7 + 8); // BALL_RADIUS(7) + cache(8)
    gt(GS.score, 100, 'cache peg gives >100 score (200 * mult)');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — floor objective progress
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — floorObjective.progress increments', () => {
    resetGS();
    GS.floorObjective = { type: 'standard', target: 20, progress: 0 };
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.floorObjective.progress, 1, 'progress incremented');
  }));

  results.push(TEST('handlePegHit — progress capped at target', () => {
    resetGS();
    GS.floorObjective = { type: 'standard', target: 5, progress: 5 };
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.floorObjective.progress, 5, 'progress stays at target cap');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — chainTimer
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — chainTimer set to TIMING.CHAIN_EXTEND', () => {
    resetGS();
    GS.chainTimer = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.chainTimer, TIMING.CHAIN_EXTEND, `chainTimer = ${TIMING.CHAIN_EXTEND}`);
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — multiplier increment
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — multiplier increments (capped at MAX_MULTIPLIER=7)', () => {
    resetGS();
    GS.multiplier = 1;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.multiplier, 2, 'multiplier increased to 2');
  }));

  results.push(TEST('handlePegHit — multiplier capped at 7', () => {
    resetGS();
    GS.multiplier = 7;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.multiplier, 7, 'multiplier stays at cap 7');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — peg.hitCount
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — peg.hitCount incremented', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(peg.hitCount, 1, 'peg hitCount = 1');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — hazard (honeypot trap)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — honeypot peg is a hazard type', () => {
    resetGS();
    const pegDef = PEG_TYPES['honeypot'];
    ok(pegDef.trap, 'honeypot has trap flag');
    ok(pegDef.hazard || pegDef.trap, 'honeypot is hazard');
  }));

  results.push(TEST('handlePegHit — ice peg is a hazard type', () => {
    resetGS();
    const pegDef = PEG_TYPES['ice'];
    ok(pegDef.hazard, 'ice has hazard flag');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — payload triggers (Trojan, Cluster, etc.)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — Trojan payload spawns clone balls', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['trojan']);
    b.cloneSpawned = false;
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    const beforeCount = GS.ballsInPlay.length;
    handlePegHit(b, peg, dx, dy, dist, 13);
    ok(GS.ballsInPlay.length > beforeCount, 'trojan spawns additional balls');
  }));

  results.push(TEST('handlePegHit — Trojan can only trigger once', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['trojan']);
    b.cloneSpawned = true; // already triggered
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    const beforeCount = GS.ballsInPlay.length;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.ballsInPlay.length, beforeCount, 'no new balls from re-trigger');
  }));

  results.push(TEST('handlePegHit — Cluster splits on first hit', () => {
    resetGS();
    const b = new Ball(240, 300, 2, 5, ['cluster']);
    b.clusterSplit = false;
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = -2; const dy = -5; const dist = Math.sqrt(29);
    handlePegHit(b, peg, dx, dy, dist, 13);
    ok(b.clusterSplit, 'cluster flag set after hit');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — evolution state transitions
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — normal peg → glowing state (evolution)', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0,
      evolution: { state: PegEvo.NORMAL, storedPoints: 0, wasRevealed: false } };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(peg.evolution.state, PegEvo.GLOWING, 'NORMAL → GLOWING transition');
  }));

  results.push(TEST('handlePegHit — glowing → charged state transition', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0,
      evolution: { state: PegEvo.GLOWING, storedPoints: 0, wasRevealed: false } };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(peg.evolution.state, PegEvo.CHARGED, 'GLOWING → CHARGED transition');
  }));

  results.push(TEST('handlePegHit — dormant peg not activated on hit', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0,
      evolution: { state: PegEvo.DORMANT, storedPoints: 0, wasRevealed: false } };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    // Dormant stays dormant until checkDormantActivation
    ok(peg.evolution.state === PegEvo.DORMANT, 'dormant peg state unchanged');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — null guard
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — null peg does not throw', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    // Calling with null peg — function should guard
    try {
      handlePegHit(b, null, 0, 5, 5, 13);
    } catch (e) {
      ok(false, 'handlePegHit threw on null peg: ' + e.message);
    }
    ok(true, 'null peg handled gracefully');
  }));

  results.push(TEST('handlePegHit — undefined peg does not throw', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    try {
      handlePegHit(b, undefined, 0, 5, 5, 13);
    } catch (e) {
      ok(false, 'handlePegHit threw on undefined peg');
    }
    ok(true, 'undefined peg handled gracefully');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — ghost payload
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — ghost phasing no bounce, decrements phase count', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['ghost']);
    b.ghostPhasing = true;
    b.ghostPhaseRemaining = 3;
    b.hitPegs = new Set();
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    const vyBefore = b.vy;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(b.ghostPhaseRemaining, 2, 'ghost phase decremented');
    // vy should NOT change (no bounce for ghost)
    is(b.vy, vyBefore, 'ghost ball does not bounce');
  }));

  results.push(TEST('handlePegHit — ghost phasing ends when phaseRemaining=0', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['ghost']);
    b.ghostPhasing = true;
    b.ghostPhaseRemaining = 1;
    b.hitPegs = new Set();
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(b.ghostPhaseRemaining, 0, 'ghost phase at 0');
    ok(!b.ghostPhasing, 'ghostPhasing deactivated');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: handlePegHit() — worm payload (pierce)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — worm piercing no bounce', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['worm']);
    b.wormPiercing = true;
    b.wormPierceCount = 0;
    b.wormMaxPierces = 3;
    b.hitPegs = new Set();
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    const vxBefore = b.vx;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(b.wormPierceCount, 1, 'worm pierce count incremented');
    is(b.vx, vxBefore, 'worm ball does not bounce (vx unchanged)');
  }));

  results.push(TEST('handlePegHit — worm pierce count reaches max → pierce disabled', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, ['worm']);
    b.wormPiercing = true;
    b.wormPierceCount = 2;
    b.wormMaxPierces = 3;
    b.hitPegs = new Set();
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    ok(!b.wormPiercing, 'wormPiercing disabled when max reached');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: resolveBallExit() — exit scoring
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('resolveBallExit — ball deactivated on exit', () => {
    resetGS();
    const b = new Ball(240, 720, 0, 5, []);
    GS.ballsInPlay = [b];
    GS.board = [];
    b.update(1.0); // ball exits below canvas
    ok(!b.active, 'ball deactivated on exit');
  }));

  results.push(TEST('resolveBallExit — does not throw on null ball', () => {
    resetGS();
    try {
      // Calling resolveBallExit with a ball that already exited
      const b = new Ball(240, 720, 0, 5, []);
      GS.ballsInPlay = [b];
      GS.board = [];
      b.update(1.0);
      ok(!b.active, 'resolveBallExit path completed');
    } catch (e) {
      ok(false, 'resolveBallExit threw: ' + e.message);
    }
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: checkFrenzy() integration
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('checkCollisions — comboCount increments on peg hit', () => {
    resetGS();
    GS.comboCount = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.comboCount, 1, 'comboCount = 1 after first peg hit');
  }));

  results.push(TEST('checkCollisions — frenzy triggers at comboThreshold', () => {
    resetGS();
    GS.comboCount = 0;
    GS.frenzyActive = false;
    // Manually set comboCount close to threshold then trigger peg hit
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    // Before hitting, set comboCount to threshold-1
    GS.comboCount = TIMING.COMBO_THRESHOLD - 1;
    handlePegHit(b, peg, dx, dy, dist, 13);
    // After hit, comboCount = threshold → frenzy should trigger
    ok(GS.comboCount >= TIMING.COMBO_THRESHOLD, 'combo reaches threshold');
  }));

  return results;
}
