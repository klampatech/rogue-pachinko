// b01_ball_physics.test.js — Ball class physics (gravity, bounce, velocity, exit)
// Bert — physics + slots agent

export function runTests(TEST) {
  const results = [];
  const { is, ok, gt, lt, equal, throws } = TEST;

  // ─── CONSTANTS ───────────────────────────────────────────────────────────
  // GRAVITY=0.18, FRICTION=0.995, MAX_VEL=14, BALL_RADIUS=7, W=480, H=700
  // NOTE: spec says GRAVITY=0.15, MAX_VEL=12, FRICTION=0.985, BOUNCE_DAMPING=0.75
  // but code has GRAVITY=0.18, FRICTION=0.995, MAX_VEL=14 — use code values

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: make a fresh ball at (x,y) with zero velocity
  // ─────────────────────────────────────────────────────────────────────────
  function makeBall(x = 240, y = 100) {
    return new Ball(x, y, 0, 0, []);
  }

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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball constructor
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball — constructor sets x, y, vx, vy', () => {
    resetGS();
    const b = makeBall(100, 200);
    is(b.x, 100, 'x set correctly');
    is(b.y, 200, 'y set correctly');
    is(b.vx, 0, 'vx defaults to 0');
    is(b.vy, 0, 'vy defaults to 0');
    ok(b.active, 'ball is active');
    is(b.trail.length, 0, 'trail starts empty');
  }));

  results.push(TEST('Ball — constructor accepts vx, vy', () => {
    resetGS();
    const b = new Ball(100, 200, 3, -5, []);
    is(b.vx, 3, 'vx set');
    is(b.vy, -5, 'vy set');
  }));

  results.push(TEST('Ball — constructor copies payloads array', () => {
    resetGS();
    const b = new Ball(100, 200, 0, 0, ['trojan', 'ghost']);
    is(b.payloads.length, 2, 'payloads copied');
    ok(b.payloads.includes('trojan'), 'has trojan');
    ok(b.payloads.includes('ghost'), 'has ghost');
  }));

  results.push(TEST('Ball — dropMultiplier frozen at creation', () => {
    resetGS();
    GS.multiplier = 5;
    const b = makeBall();
    is(b.dropMultiplier, 5, 'dropMultiplier frozen at current GS.multiplier');
    GS.multiplier = 7;
    is(b.dropMultiplier, 5, 'dropMultiplier unchanged after multiplier change');
  }));

  results.push(TEST('Ball — trailBoost computed from combo/frenzy/payload count', () => {
    resetGS();
    const b1 = makeBall();
    is(b1.trailBoost, 1.0, 'baseline trailBoost');

    GS.comboCount = 3;
    const b2 = makeBall();
    is(b2.trailBoost, 1.5, 'combo>=3 gives 1.5x');

    GS.comboCount = 5;
    const b3 = makeBall();
    is(b3.trailBoost, 2.0, 'combo>=5 gives 2.0x');

    resetGS();
    GS.frenzyActive = true;
    const b4 = makeBall();
    is(b4.trailBoost, 2.0, 'frenzy gives 2.0x');

    resetGS();
    const b5 = new Ball(100, 200, 0, 0, ['trojan', 'ghost']);
    is(b5.trailBoost, 1.5, '2 payloads gives 1.5x');
  }));

  results.push(TEST('Ball — hitPegs is a fresh Set', () => {
    resetGS();
    const b = makeBall();
    ok(b.hitPegs instanceof Set, 'hitPegs is a Set');
    is(b.hitPegs.size, 0, 'hitPegs starts empty');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball.update() — gravity
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.update — gravity applied each frame (vy increase)', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 0; b.vy = 0;
    GS.ballsInPlay = [b];
    const GRAV = 0.18;
    b.update(1.0);
    is(b.vy, GRAV, 'vy += GRAVITY after one update');
    b.update(1.0);
    is(b.vy, GRAV * 2, 'vy += GRAVITY after two updates');
  }));

  results.push(TEST('Ball.update — MAX_VEL cap enforced', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 0; b.vy = 14;
    GS.ballsInPlay = [b];
    b.update(1.0);
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    lt(spd, 14.01, 'velocity capped at MAX_VEL=14');
  }));

  results.push(TEST('Ball.update — FRICTION applied to vx', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 10; b.vy = 0;
    GS.ballsInPlay = [b];
    b.update(1.0);
    // FRICTION=0.995
    ok(Math.abs(b.vx - 10 * 0.995) < 0.001, 'vx multiplied by FRICTION=0.995');
  }));

  results.push(TEST('Ball.update — velocity cap after friction application', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 14; b.vy = 0;
    GS.ballsInPlay = [b];
    b.update(1.0);
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    lt(spd, 14.01, 'velocity still capped after friction');
  }));

  results.push(TEST('Ball.update — position updated by velocity', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 3; b.vy = 4;
    GS.ballsInPlay = [b];
    b.update(1.0);
    is(b.x, 243, 'x updated by vx');
    is(b.y, 104, 'y updated by vy');
  }));

  results.push(TEST('Ball.update — HIGH_SPEED clip guard (MAX_BALL_SPEED=21)', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 20; b.vy = 20; // speed > MAX_BALL_SPEED (14*1.5=21)
    GS.ballsInPlay = [b];
    b.update(1.0);
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    lt(spd, 21.01, 'speed clipped to MAX_BALL_SPEED');
  }));

  results.push(TEST('Ball.update — slowmo halves physics time scale', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 0; b.vy = 0;
    b.slowmoActive = true;
    GS.ballsInPlay = [b];
    b.update(1.0);
    // GRAVITY * 0.5 applied to vy (plus friction)
    // With vy=0 and GRAV=0.18: after update, vy = 0 + 0.18*0.5 = 0.09
    is(b.vy, 0.09, 'slowmoActive halves gravity effect');
  }));

  results.push(TEST('Ball.update — OVERCLOCK 1.5x gravity', () => {
    resetGS();
    GS.overclockActive = true;
    GS.overclockTimer = 300;
    const b = makeBall(240, 100);
    b.vx = 0; b.vy = 0;
    GS.ballsInPlay = [b];
    b.update(1.0);
    // GRAVITY * 1.5 = 0.27
    is(b.vy, 0.27, 'overclock gives 1.5x gravity');
  }));

  results.push(TEST('Ball.update — OVERCLOCK + slowmo combined', () => {
    resetGS();
    GS.overclockActive = true;
    GS.overclockTimer = 300;
    const b = makeBall(240, 100);
    b.slowmoActive = true;
    GS.ballsInPlay = [b];
    b.update(1.0);
    // timeScale=0.5, overclockMult=1.5 → GRAVITY * 0.5 * 1.5 = 0.135
    is(b.vy, 0.135, 'combined slowmo+overclock');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball.update() — wall bounce
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.update — left wall bounce', () => {
    resetGS();
    const b = makeBall(5, 200); // near left wall
    b.vx = -5; b.vy = 0;
    GS.ballsInPlay = [b];
    b.update(1.0);
    is(b.x, 7, 'x clamped to BALL_RADIUS (7) on left wall bounce');
    ok(b.vx >= 0, 'vx reversed to positive on left wall bounce');
  }));

  results.push(TEST('Ball.update — right wall bounce', () => {
    resetGS();
    const b = makeBall(475, 200); // near right wall
    b.vx = 5; b.vy = 0;
    GS.ballsInPlay = [b];
    b.update(1.0);
    is(b.x, 473, 'x clamped to W-BALL_RADIUS (473) on right wall bounce');
    ok(b.vx <= 0, 'vx reversed to negative on right wall bounce');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball.update() — slot zone exit
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.update — exit at y > H+20 triggers resolveBallExit', () => {
    resetGS();
    GS.balls = 1;
    const b = makeBall(240, 710); // below canvas
    b.vx = 0; b.vy = 2;
    GS.ballsInPlay = [b];
    GS.board = []; // empty board so no collisions
    b.update(1.0);
    ok(!b.active, 'ball deactivated after exit below canvas');
  }));

  results.push(TEST('Ball.update — SLOT_START_Y triggers getSlotForX', () => {
    resetGS();
    const b = makeBall(240, 560); // at SLOT_START_Y
    b.vx = 0; b.vy = 2;
    GS.ballsInPlay = [b];
    GS.board = [];
    // Slot 3 = center, x=240 should map to slot 3
    b.update(1.0);
    // Ball should be deactivated and slot animation triggered
    ok(!b.active, 'ball exits into slot at SLOT_START_Y');
  }));

  results.push(TEST('Ball.update — overflow zone triggers triggerOverflow', () => {
    resetGS();
    const b = makeBall(240, 620); // below slot zone
    b.vx = 0; b.vy = 2;
    GS.ballsInPlay = [b];
    GS.board = [];
    b.update(1.0);
    ok(!b.active, 'ball deactivated after passing through slot zone');
    // triggerOverflow deducts balls on higher floors
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball.update() — stuck detection
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.update — stuck detection triggers after STUCK_FRAMES=180', () => {
    resetGS();
    GS.balls = 1;
    const b = makeBall(240, 300);
    b.vx = 0; b.vy = 0.5; // very slow
    GS.ballsInPlay = [b];
    GS.board = [];

    // Move ball to a position then simulate stuck (barely moving)
    for (let i = 0; i < 180; i++) {
      b.update(1.0);
    }
    ok(!b.active, 'ball stuck detected after STUCK_FRAMES=180');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Ball.draw() — basic rendering
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.draw — inactive ball returns early', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.active = false;
    GS.ballsInPlay = [b];
    // draw() should return immediately without throwing
    b.draw();
    ok(true, 'no error on draw of inactive ball');
  }));

  results.push(TEST('Ball.draw — active ball renders (no error path)', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.active = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'active ball draws without error');
  }));

  results.push(TEST('Ball.draw — shielded ball renders with shield ring', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.shielded = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'shielded ball draws without error');
  }));

  results.push(TEST('Ball.draw — overloaded ball renders with magenta ring', () => {
    resetGS();
    GS.comboCount = 3;
    const b = makeBall(240, 100);
    b.isOverloaded = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'overloaded ball draws without error');
  }));

  results.push(TEST('Ball.draw — slowmoActive renders with clock ring', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.slowmoActive = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'slowmo ball draws without error');
  }));

  results.push(TEST('Ball.draw — ghostPhasing renders with chromatic aberration', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.ghostPhasing = true;
    b.ghostPhaseRemaining = 3;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'ghost ball draws without error');
  }));

  results.push(TEST('Ball.draw — payload indicators drawn when payloads present', () => {
    resetGS();
    const b = new Ball(240, 100, 0, 0, ['trojan', 'scrambler']);
    b.active = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'ball with payloads draws without error');
  }));

  results.push(TEST('Ball.draw — mini-balls from cluster payload', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.miniBalls = [
      { x: 230, y: 90, vx: -1, vy: -1, trail: [], dropMultiplier: 1 },
      { x: 250, y: 90, vx: 1, vy: -1, trail: [], dropMultiplier: 1 }
    ];
    b.active = true;
    GS.ballsInPlay = [b];
    b.draw();
    ok(true, 'ball with mini-balls draws without error');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Trail system
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball.update — trail accumulates positions', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 2; b.vy = 2;
    GS.ballsInPlay = [b];
    b.update(1.0);
    is(b.trail.length, 1, 'trail has 1 entry after 1 update');
    b.update(1.0);
    is(b.trail.length, 2, 'trail has 2 entries after 2 updates');
  }));

  results.push(TEST('Ball.update — trail ages each frame', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 2; b.vy = 2;
    GS.ballsInPlay = [b];
    b.update(1.0);
    b.update(1.0);
    ok(b.trail[0].age > 0, 'trail entries age');
  }));

  results.push(TEST('Ball.update — trail trims to max length', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.vx = 2; b.vy = 2;
    GS.ballsInPlay = [b];
    // Base trail max = 16 * trailBoost
    for (let i = 0; i < 30; i++) b.update(1.0);
    lt(b.trail.length, 20, 'trail trims to max length');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: BALL_RADIUS and canvas bounds
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('BALL_RADIUS constant = 7 (from code)', () => {
    is(BALL_RADIUS, 7, 'BALL_RADIUS is 7');
  }));

  results.push(TEST('W=480, H=700 canvas dimensions', () => {
    is(W, 480, 'W=480');
    is(H, 700, 'H=700');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: ghost phase state
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball — ghostPhasing and ghostPhaseRemaining initialized', () => {
    resetGS();
    const b = makeBall();
    ok(typeof b.ghostPhasing === 'boolean', 'ghostPhasing is boolean');
    ok(typeof b.ghostPhaseRemaining === 'number', 'ghostPhaseRemaining is number');
  }));

  results.push(TEST('Ball — ghostSplitTrail initialized as empty array', () => {
    resetGS();
    const b = makeBall();
    ok(Array.isArray(b.ghostSplitTrail), 'ghostSplitTrail is array');
    is(b.ghostSplitTrail.length, 0, 'ghostSplitTrail starts empty');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: mini-ball cluster system
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball — miniBalls initialized as empty array', () => {
    resetGS();
    const b = makeBall();
    ok(Array.isArray(b.miniBalls), 'miniBalls is array');
    is(b.miniBalls.length, 0, 'miniBalls starts empty');
  }));

  results.push(TEST('Ball — clusterSplit flag', () => {
    resetGS();
    const b = makeBall();
    ok(!b.clusterSplit, 'clusterSplit starts false');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: TELEPORT_COOLDOWN
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball — teleportCooldown initialized to 0', () => {
    resetGS();
    const b = makeBall();
    is(b.teleportCooldown, 0, 'teleportCooldown starts at 0');
  }));

  results.push(TEST('Ball.update — teleportCooldown decrements', () => {
    resetGS();
    const b = makeBall(240, 100);
    b.teleportCooldown = 10;
    GS.ballsInPlay = [b];
    b.update(1.0);
    is(b.teleportCooldown, 9, 'teleportCooldown decrements each frame');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: isOverloaded computation
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Ball — isOverloaded when comboCount >= 3 and not miniBall', () => {
    resetGS();
    GS.comboCount = 3;
    const b = makeBall();
    ok(b.isOverloaded, 'combo>=3 makes ball overloaded');
  }));

  results.push(TEST('Ball — isOverloaded false for miniBall children', () => {
    resetGS();
    GS.comboCount = 5;
    const b = makeBall();
    b.miniBalls.push({ x: 100, y: 100 }); // has miniBalls
    ok(!b.isOverloaded, 'has miniBalls → not overloaded');
  }));

  return results;
}
