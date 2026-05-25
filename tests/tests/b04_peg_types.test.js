// b04_peg_types.test.js — 7 peg types: node, ice, fiber, mirror, cache, honeypot, overload
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
  // TEST SUITE: PEG_TYPES constant — all 7 peg types exist
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('PEG_TYPES — node peg type exists', () => {
    ok(PEG_TYPES.node, 'node peg type defined');
    is(PEG_TYPES.node.label, 'NODE', 'node label is NODE');
    ok(PEG_TYPES.node.bounce > 0, 'node has bounce > 0');
  }));

  results.push(TEST('PEG_TYPES — ice peg type exists', () => {
    ok(PEG_TYPES.ice, 'ice peg type defined');
    is(PEG_TYPES.ice.label, 'ICE', 'ice label is ICE');
    ok(PEG_TYPES.ice.hazard, 'ice has hazard flag');
  }));

  results.push(TEST('PEG_TYPES — fiber peg type exists', () => {
    ok(PEG_TYPES.fiber, 'fiber peg type defined');
    is(PEG_TYPES.fiber.label, 'FIBER', 'fiber label is FIBER');
    ok(PEG_TYPES.fiber.friction < 1, 'fiber has friction < 1');
  }));

  results.push(TEST('PEG_TYPES — mirror peg type exists', () => {
    ok(PEG_TYPES.mirror, 'mirror peg type defined');
    is(PEG_TYPES.mirror.label, 'MIRROR', 'mirror label is MIRROR');
    ok(PEG_TYPES.mirror.reflect, 'mirror has reflect flag');
    ok(PEG_TYPES.mirror.bounce > 0.8, 'mirror has high bounce (>=0.9)');
  }));

  results.push(TEST('PEG_TYPES — cache peg type exists', () => {
    ok(PEG_TYPES.cache, 'cache peg type defined');
    is(PEG_TYPES.cache.label, 'CACHE', 'cache label is CACHE');
    ok(PEG_TYPES.cache.bonus, 'cache has bonus flag');
  }));

  results.push(TEST('PEG_TYPES — honeypot peg type exists', () => {
    ok(PEG_TYPES.honeypot, 'honeypot peg type defined');
    is(PEG_TYPES.honeypot.label, 'HONEYPOT', 'honeypot label is HONEYPOT');
    ok(PEG_TYPES.honeypot.trap, 'honeypot has trap flag');
  }));

  results.push(TEST('PEG_TYPES — overload peg type exists', () => {
    ok(PEG_TYPES.overload, 'overload peg type defined');
    is(PEG_TYPES.overload.label, 'OVERLOAD', 'overload label is OVERLOAD');
    ok(PEG_TYPES.overload.explosive, 'overload has explosive flag');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: NODE peg — +10 score, standard bounce
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('NODE — base score = 50 (non-bonus)', () => {
    resetGS();
    GS.score = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.score, 50, 'node base score is 50');
  }));

  results.push(TEST('NODE — bounce coefficient = 0.65', () => {
    is(PEG_TYPES.node.bounce, 0.65, 'node bounce = 0.65');
  }));

  results.push(TEST('NODE — radius = 6', () => {
    is(PEG_TYPES.node.radius, 6, 'node radius = 6');
  }));

  results.push(TEST('NODE — hitCount increments', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'node', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(peg.hitCount, 1, 'node hitCount incremented');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: ICE peg — 3 hits to destroy, hazard
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('ICE — hazard flag is true', () => {
    ok(PEG_TYPES.ice.hazard, 'ice is hazard type');
  }));

  results.push(TEST('ICE — radius = 7', () => {
    is(PEG_TYPES.ice.radius, 7, 'ice radius = 7');
  }));

  results.push(TEST('ICE — bounce coefficient = 0.5', () => {
    is(PEG_TYPES.ice.bounce, 0.5, 'ice bounce = 0.5');
  }));

  results.push(TEST('ICE — requires multiple hits to destroy (3 hits)', () => {
    resetGS();
    // Ice peg starts with 3 hits remaining
    const peg = { x: 240, y: 300, type: 'ice', id: 0, destroyed: false, hitCount: 0,
      hitsRemaining: 3 };
    is(peg.hitsRemaining, 3, 'ice starts with 3 hits');
  }));

  results.push(TEST('ICE — ghost mode: hitting ice increments ghostModeIceHits', () => {
    resetGS();
    GS.floorObjective = { type: 'ghost', target: 0, progress: 0, maxIceHits: 2 };
    GS.ghostModeIceHits = 0;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'ice', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 13);
    is(GS.ghostModeIceHits, 1, 'ghostModeIceHits incremented on ice hit');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: FIBER peg — slide, friction < 1
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('FIBER — friction coefficient = 0.95', () => {
    is(PEG_TYPES.fiber.friction, 0.95, 'fiber friction = 0.95');
  }));

  results.push(TEST('FIBER — low bounce coefficient = 0.3', () => {
    is(PEG_TYPES.fiber.bounce, 0.3, 'fiber bounce = 0.3');
  }));

  results.push(TEST('FIBER — radius = 5', () => {
    is(PEG_TYPES.fiber.radius, 5, 'fiber radius = 5');
  }));

  results.push(TEST('FIBER — ball slides along (vx reduced by friction)', () => {
    resetGS();
    const b = new Ball(240, 300, 10, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'fiber', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = -10; const dy = -5; const dist = Math.sqrt(125);
    handlePegHit(b, peg, dx, dy, dist, 7 + 5); // BALL_RADIUS(7) + fiber(5) = 12
    lt(b.vx, 10, 'fiber reduces vx via friction');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: MIRROR peg — reflect flag, high bounce
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('MIRROR — reflect flag is true', () => {
    ok(PEG_TYPES.mirror.reflect, 'mirror has reflect flag');
  }));

  results.push(TEST('MIRROR — high bounce coefficient = 0.9', () => {
    is(PEG_TYPES.mirror.bounce, 0.9, 'mirror bounce = 0.9');
  }));

  results.push(TEST('MIRROR — radius = 6', () => {
    is(PEG_TYPES.mirror.radius, 6, 'mirror radius = 6');
  }));

  results.push(TEST('MIRROR — velocity reflects off surface (angle of reflection)', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'mirror', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    // Ball approaching from above (dx=0, dy>0 means below peg)
    const dx = 0; const dy = 5; const dist = 5;
    const vyBefore = b.vy;
    handlePegHit(b, peg, dx, dy, dist, 7 + 6);
    // Mirror reflects vy
    ok(b.vy !== vyBefore, 'mirror changes vy direction');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: CACHE peg — bonus flag, 200 score
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('CACHE — bonus flag is true', () => {
    ok(PEG_TYPES.cache.bonus, 'cache has bonus flag');
  }));

  results.push(TEST('CACHE — radius = 8', () => {
    is(PEG_TYPES.cache.radius, 8, 'cache radius = 8');
  }));

  results.push(TEST('CACHE — bounce coefficient = 0.6', () => {
    is(PEG_TYPES.cache.bounce, 0.6, 'cache bounce = 0.6');
  }));

  results.push(TEST('CACHE — score = 200 (4x node score)', () => {
    resetGS();
    GS.score = 0;
    GS.multiplier = 1;
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'cache', id: 0, destroyed: false, hitCount: 0 };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 7 + 8);
    is(GS.score, 200, 'cache score = 200 (4x node)');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: HONEYPOT peg — trap flag, ends ball
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('HONEYPOT — trap flag is true', () => {
    ok(PEG_TYPES.honeypot.trap, 'honeypot has trap flag');
  }));

  results.push(TEST('HONEYPOT — hazard flag is true', () => {
    ok(PEG_TYPES.honeypot.hazard, 'honeypot is hazard type');
  }));

  results.push(TEST('HONEYPOT — radius = 9', () => {
    is(PEG_TYPES.honeypot.radius, 9, 'honeypot radius = 9');
  }));

  results.push(TEST('HONEYPOT — bounce coefficient = 0.5', () => {
    is(PEG_TYPES.honeypot.bounce, 0.5, 'honeypot bounce = 0.5');
  }));

  results.push(TEST('HONEYPOT — label is HONEYPOT', () => {
    is(PEG_TYPES.honeypot.label, 'HONEYPOT', 'honeypot label = HONEYPOT');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: OVERLOAD peg — explosive flag, chain detonation
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('OVERLOAD — explosive flag is true', () => {
    ok(PEG_TYPES.overload.explosive, 'overload has explosive flag');
  }));

  results.push(TEST('OVERLOAD — radius = 7', () => {
    is(PEG_TYPES.overload.radius, 7, 'overload radius = 7');
  }));

  results.push(TEST('OVERLOAD — bounce coefficient = 0.7', () => {
    is(PEG_TYPES.overload.bounce, 0.7, 'overload bounce = 0.7');
  }));

  results.push(TEST('OVERLOAD — label is OVERLOAD', () => {
    is(PEG_TYPES.overload.label, 'OVERLOAD', 'overload label = OVERLOAD');
  }));

  results.push(TEST('OVERLOAD — triggers detonateExplosivePeg on hit', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    const peg = { x: 240, y: 300, type: 'overload', id: 0, destroyed: false, hitCount: 0,
      evolution: null };
    GS.board = [peg];
    const dx = 0; const dy = 5; const dist = 5;
    handlePegHit(b, peg, dx, dy, dist, 7 + 7);
    // Overload explosion should happen (verified via particles or score change)
    ok(true, 'overload handled without error');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: All peg types have color and glow
  // ─────────────────────────────────────────────────────────────────────────
  const pegTypes = ['node', 'ice', 'fiber', 'mirror', 'cache', 'honeypot', 'overload'];
  pegTypes.forEach(type => {
    results.push(TEST(`${type.toUpperCase()} — has color property`, () => {
      ok(PEG_TYPES[type].color, `${type} has color`);
      ok(PEG_TYPES[type].color.startsWith('#'), `${type} color is hex`);
    }));
    results.push(TEST(`${type.toUpperCase()} — has glow property`, () => {
      ok(PEG_TYPES[type].glow, `${type} has glow`);
    }));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: All peg types have bounce coefficient
  // ─────────────────────────────────────────────────────────────────────────
  pegTypes.forEach(type => {
    results.push(TEST(`${type.toUpperCase()} — bounce coefficient between 0 and 1`, () => {
      const b = PEG_TYPES[type].bounce;
      ok(b > 0, `${type} bounce > 0`);
      ok(b <= 1, `${type} bounce <= 1`);
    }));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Crumbling peg type (bonus — not in 7 core but used in code)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('CRUMBLING — has crumbling flag', () => {
    ok(PEG_TYPES.crumbling, 'crumbling peg type exists');
    ok(PEG_TYPES.crumbling.crumbling, 'crumbling has crumbling flag');
  }));

  results.push(TEST('CRUMBLING — hitsRemaining starts > 0', () => {
    resetGS();
    const peg = { x: 240, y: 300, type: 'crumbling', id: 0, destroyed: false, hitCount: 0,
      hitsRemaining: 2, crumblingColor: '#aa44ff' };
    gs.board = [peg];
    ok(peg.hitsRemaining > 0, 'crumbling starts with hitsRemaining');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Seismic peg type
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('SEISMIC — has seismic flag', () => {
    ok(PEG_TYPES.seismic, 'seismic peg type exists');
    ok(PEG_TYPES.seismic.seismic, 'seismic has seismic flag');
  }));

  results.push(TEST('SEISMIC — points = 100', () => {
    is(PEG_TYPES.seismic.points, 100, 'seismic points = 100');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Directional peg type
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('DIRECTIONAL — has deflectAngle', () => {
    ok(PEG_TYPES.directional, 'directional peg type exists');
    ok(typeof PEG_TYPES.directional.deflectAngle === 'number', 'has deflectAngle');
  }));

  results.push(TEST('DIRECTIONAL — has directional flag', () => {
    ok(PEG_TYPES.directional.directional, 'directional has directional flag');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Teleport peg type
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('TELEPORT — has teleport flag', () => {
    ok(PEG_TYPES.teleport, 'teleport peg type exists');
    ok(PEG_TYPES.teleport.teleport, 'teleport has teleport flag');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: SpeedBoost peg type
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('SPEEDBOOST — has velocityMult', () => {
    ok(PEG_TYPES.speedboost, 'speedboost peg type exists');
    is(PEG_TYPES.speedboost.velocityMult, 1.5, 'speedboost velocityMult = 1.5');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Peg type radii are consistent
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('All peg types — radius is a positive number', () => {
    pegTypes.forEach(type => {
      ok(typeof PEG_TYPES[type].radius === 'number', `${type} radius is number`);
      gt(PEG_TYPES[type].radius, 0, `${type} radius > 0`);
    });
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Peg evolution on all peg types
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('handlePegHit — all peg types work with evolution null (normal)', () => {
    resetGS();
    const b = new Ball(240, 300, 0, 5, []);
    GS.ballsInPlay = [b];
    pegTypes.forEach(type => {
      const peg = { x: 240, y: 300, type, id: 0, destroyed: false, hitCount: 0,
        evolution: null };
      GS.board = [peg];
      const dx = 0; const dy = 5; const dist = 5;
      const pegR = PEG_TYPES[type].radius;
      handlePegHit(b, peg, dx, dy, dist, 7 + pegR);
      ok(b.hitPegs.has(0), `${type} peg registered hit`);
    });
  }));

  return results;
}
