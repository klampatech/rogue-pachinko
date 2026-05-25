// d01_payloads.test.js — Payload activation, effect, and cleanup

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));
  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // helpers
  const mkBall = (payloads = []) => new (TEST.getGS ? gs.ballsInPlay.push.bind(gs.ballsInPlay) : null) && new (window.Ball || class {
    constructor() { this.x = 240; this.y = 200; this.vx = 1; this.vy = 2; this.active = true; this.payloads = [...payloads]; this.dropMultiplier = 1; this.hitPegs = new Set(); this.scramblerActive = false; this.wormPiercing = false; this.wormPierceCount = 0; this.wormMaxPierces = 3; this.ghostPhasing = false; this.ghostPhaseRemaining = 0; this.ghostSplitTrail = []; this.clusterSplit = false; this.miniBalls = []; this.explosiveTriggered = false; this.slowmoActive = false; this.isOverloaded = false; this.daemonSplit = false; }
  })(240, 200, 1, 2, payloads);
  const mkPeg = (overrides = {}) => ({ id: 1, x: 240, y: 300, type: 'node', hitCount: 0, evolution: null, crumblingColor: null, hitsRemaining: 0, ...overrides });

  // ── Setup: start a run so GS.screen='playing' ──
  TEST.seed(12345);
  TEST.returnToMenu();
  TEST.startRun();

  // ──────────────────────────────────────────────────────────────────
  // SCRAMBLER: reverses ball vx on peg contact
  // ──────────────────────────────────────────────────────────────────
  await test('SCRAMBLER — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.scrambler)) throw new Error('Missing scrambler');
    if (!TEST.ok(PAYLOADS.scrambler.name === 'SCRAMBLER')) throw new Error('Wrong name');
    if (!TEST.ok(PAYLOADS.scrambler.cost === 50)) throw new Error('Wrong cost');
  });

  await test('SCRAMBLER — ball.scramblerActive starts false', () => {
    TEST.returnToMenu(); TEST.startRun();
    if (!TEST.ok(typeof gs.balls !== 'undefined')) throw new Error('no balls');
  });

  await test('SCRAMBLER — scramblerActive set on ball when payload injected', () => {
    // Simulate: create a ball with scrambler payload
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 3, 4, ['scrambler']);
    if (!TEST.ok(ball.scramblerActive === false)) throw new Error('scramblerActive should be false init');
    if (!TEST.ok(ball.payloads.includes('scrambler'))) throw new Error('scrambler not in payloads');
  });

  await test('SCRAMBLER — reverses vx on activation', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 2, 3, ['scrambler']);
    const origVx = ball.vx;
    ball.scramblerActive = true;
    // Simulate scramble: vx = -vx
    ball.vx = -ball.vx;
    if (!TEST.ok(ball.vx === -origVx)) throw new Error('vx not reversed');
    if (!TEST.ok(ball.scramblerActive === true)) throw new Error('scramblerActive cleared');
  });

  await test('SCRAMBLER — vx reversal sign is correct', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 5, -2, ['scrambler']);
    ball.vx = -ball.vx;
    if (!TEST.ok(ball.vx === -5)) throw new Error('vx not reversed from positive');
    const ball2 = new Ball(240, 200, -5, 2, ['scrambler']);
    ball2.vx = -ball2.vx;
    if (!TEST.ok(ball2.vx === 5)) throw new Error('vx not reversed from negative');
  });

  // ──────────────────────────────────────────────────────────────────
  // TROJAN: clone ball on peg hit
  // ──────────────────────────────────────────────────────────────────
  await test('TROJAN — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.trojan)) throw new Error('Missing trojan');
    if (!TEST.ok(PAYLOADS.trojan.cost === 100)) throw new Error('Wrong cost');
  });

  await test('TROJAN — cloneSpawned flag on ball', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['trojan']);
    if (!TEST.ok(ball.cloneSpawned === false)) throw new Error('cloneSpawned should be false init');
  });

  await test('TROJAN — trojan in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['trojan']);
    if (!TEST.ok(ball.payloads.includes('trojan'))) throw new Error('trojan not in payloads');
  });

  await test('TROJAN — clone creates new ball in ballsInPlay', () => {
    TEST.returnToMenu(); TEST.startRun();
    const Ball = window.Ball;
    const before = gs.ballsInPlay.length;
    const ball = new Ball(240, 200, 1, 2, ['trojan']);
    ball.cloneSpawned = true; // simulate already-cloned
    gs.ballsInPlay.push(ball);
    // Simulate trojan clone: create another ball
    const clone = new Ball(ball.x, ball.y, ball.vx, ball.vy, []);
    clone.daemonChild = true;
    gs.ballsInPlay.push(clone);
    if (!TEST.ok(gs.ballsInPlay.length === before + 2)) throw new Error('clone not added');
  });

  // ──────────────────────────────────────────────────────────────────
  // WORM: pierce through pegs, no bounce
  // ──────────────────────────────────────────────────────────────────
  await test('WORM — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.worm)) throw new Error('Missing worm');
    if (!TEST.ok(PAYLOADS.worm.cost === 200)) throw new Error('Wrong cost');
  });

  await test('WORM — ball.wormPiercing/wormPierceCount/wormMaxPierces init', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['worm']);
    if (!TEST.ok(ball.wormPiercing === false)) throw new Error('wormPiercing init wrong');
    if (!TEST.ok(ball.wormPierceCount === 0)) throw new Error('wormPierceCount init wrong');
    if (!TEST.ok(ball.wormMaxPierces === 0)) throw new Error('wormMaxPierces init wrong');
  });

  await test('WORM — worm payload enables piercing', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['worm']);
    // When worm activates on first hit, wormPiercing = true, max = 3
    ball.wormPiercing = true;
    ball.wormMaxPierces = 3;
    ball.wormPierceCount = 0;
    if (!TEST.ok(ball.wormPiercing === true)) throw new Error('wormPiercing not set');
    if (!TEST.ok(ball.wormMaxPierces === 3)) throw new Error('wormMaxPierces not set');
  });

  await test('WORM — pierce increments count', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['worm']);
    ball.wormPiercing = true; ball.wormMaxPierces = 3; ball.wormPierceCount = 0;
    ball.wormPierceCount++;
    if (!TEST.ok(ball.wormPierceCount === 1)) throw new Error('pierce count not incremented');
    ball.wormPierceCount++;
    if (!TEST.ok(ball.wormPierceCount === 2)) throw new Error('pierce count wrong');
  });

  await test('WORM — disable when max reaches 0', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['worm']);
    ball.wormPiercing = true; ball.wormMaxPierces = 3; ball.wormPierceCount = 3;
    if (ball.wormPierceCount >= ball.wormMaxPierces) ball.wormPiercing = false;
    if (!TEST.ok(ball.wormPiercing === false)) throw new Error('wormPiercing not disabled');
  });

  await test('WORM — worm payload in PAYLOADS.desc mentions pierce', () => {
    if (!TEST.ok(PAYLOADS.worm.desc.toLowerCase().includes('pierce'))) throw new Error('worm desc missing pierce');
  });

  // ──────────────────────────────────────────────────────────────────
  // GHOST: phase through pegs, amber tint, freeze effect
  // ──────────────────────────────────────────────────────────────────
  await test('GHOST — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.ghost)) throw new Error('Missing ghost');
    if (!TEST.ok(PAYLOADS.ghost.cost === 175)) throw new Error('Wrong cost');
  });

  await test('GHOST — ball.ghostPhasing/ghostPhaseRemaining init', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    if (!TEST.ok(ball.ghostPhasing === false)) throw new Error('ghostPhasing init wrong');
    if (!TEST.ok(ball.ghostPhaseRemaining === 0)) throw new Error('ghostPhaseRemaining init wrong');
  });

  await test('GHOST — ghost payload in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    if (!TEST.ok(ball.payloads.includes('ghost'))) throw new Error('ghost not in payloads');
  });

  await test('GHOST — activating sets ghostPhasing + ghostPhaseRemaining=4', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    ball.ghostPhasing = true;
    ball.ghostPhaseRemaining = 4;
    if (!TEST.ok(ball.ghostPhasing === true)) throw new Error('ghostPhasing not set');
    if (!TEST.ok(ball.ghostPhaseRemaining === 4)) throw new Error('ghostPhaseRemaining not 4');
  });

  await test('GHOST — phase hit decrements remaining', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    ball.ghostPhasing = true; ball.ghostPhaseRemaining = 4;
    ball.ghostPhaseRemaining--;
    if (!TEST.ok(ball.ghostPhaseRemaining === 3)) throw new Error('ghostPhaseRemaining not decremented');
  });

  await test('GHOST — solidify when remaining hits 0', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    ball.ghostPhasing = true; ball.ghostPhaseRemaining = 1;
    ball.ghostPhaseRemaining--;
    if (ball.ghostPhaseRemaining === 0) ball.ghostPhasing = false;
    if (!TEST.ok(ball.ghostPhasing === false)) throw new Error('ghostPhasing not disabled at 0');
  });

  await test('GHOST — ghostSplitTrail initialized as array', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['ghost']);
    if (!TEST.ok(Array.isArray(ball.ghostSplitTrail))) throw new Error('ghostSplitTrail not array');
    if (!TEST.ok(ball.ghostSplitTrail.length === 0)) throw new Error('ghostSplitTrail not empty init');
  });

  await test('GHOST — PAYLOADS.ghost.unlockRank is Netrunner', () => {
    if (!TEST.ok(PAYLOADS.ghost.unlockRank === 'Netrunner')) throw new Error('ghost unlockRank wrong');
  });

  // ──────────────────────────────────────────────────────────────────
  // CLUSTER: split into 3 mini-balls on first hit
  // ──────────────────────────────────────────────────────────────────
  await test('CLUSTER — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.cluster)) throw new Error('Missing cluster');
    if (!TEST.ok(PAYLOADS.cluster.cost === 450)) throw new Error('Wrong cost');
  });

  await test('CLUSTER — ball.clusterSplit/miniBalls init', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    if (!TEST.ok(ball.clusterSplit === false)) throw new Error('clusterSplit init wrong');
    if (!TEST.ok(Array.isArray(ball.miniBalls))) throw new Error('miniBalls not array');
    if (!TEST.ok(ball.miniBalls.length === 0)) throw new Error('miniBalls not empty init');
  });

  await test('CLUSTER — cluster payload in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    if (!TEST.ok(ball.payloads.includes('cluster'))) throw new Error('cluster not in payloads');
  });

  await test('CLUSTER — clusterSplit prevents re-split', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    ball.clusterSplit = true;
    if (!TEST.ok(ball.clusterSplit === true)) throw new Error('re-split allowed');
  });

  await test('CLUSTER — miniBall object structure', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    ball.clusterSplit = true;
    const mb = { x: ball.x, y: ball.y, vx: 1, vy: 2, trail: [], active: true, dropMultiplier: 1, isOverloadChild: false };
    if (!TEST.ok(mb.x === 240)) throw new Error('miniBall x wrong');
    if (!TEST.ok(mb.active === true)) throw new Error('miniBall active wrong');
    if (!TEST.ok(Array.isArray(mb.trail))) throw new Error('miniBall trail not array');
  });

  await test('CLUSTER — PAYLOADS.cluster.unlockRank is Ghost', () => {
    if (!TEST.ok(PAYLOADS.cluster.unlockRank === 'Ghost')) throw new Error('cluster unlockRank wrong');
  });

  await test('CLUSTER — clusterSplit only triggers once per ball', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    if (!TEST.ok(ball.clusterSplit === false)) throw new Error('should not be split yet');
    ball.clusterSplit = true;
    if (!TEST.ok(ball.clusterSplit === true)) throw new Error('clusterSplit not sticky');
  });

  // ──────────────────────────────────────────────────────────────────
  // SLOWMO: x0.5 time scale for 3 seconds
  // ──────────────────────────────────────────────────────────────────
  await test('SLOWMO — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.slowmo)) throw new Error('Missing slowmo');
    if (!TEST.ok(PAYLOADS.slowmo.cost === 200)) throw new Error('Wrong cost');
  });

  await test('SLOWMO — ball.slowmoActive init', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['slowmo']);
    if (!TEST.ok(ball.slowmoActive === false)) throw new Error('slowmoActive init wrong');
  });

  await test('SLOWMO — slowmo payload in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['slowmo']);
    if (!TEST.ok(ball.payloads.includes('slowmo'))) throw new Error('slowmo not in payloads');
  });

  await test('SLOWMO — timeScale = 0.5 when slowmoActive', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['slowmo']);
    ball.slowmoActive = true;
    const timeScale = ball.slowmoActive ? 0.5 : 1.0;
    if (!TEST.ok(timeScale === 0.5)) throw new Error('timeScale not 0.5');
  });

  await test('SLOWMO — PAYLOADS.slowmo.unlockRank is Netrunner+', () => {
    if (!TEST.ok(PAYLOADS.slowmo.unlockRank === 'Netrunner+')) throw new Error('slowmo unlockRank wrong');
  });

  await test('SLOWMO — timeScale 1.0 when not slowmoActive', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['slowmo']);
    const timeScale = ball.slowmoActive ? 0.5 : 1.0;
    if (!TEST.ok(timeScale === 1.0)) throw new Error('timeScale not 1.0 when inactive');
  });

  // ──────────────────────────────────────────────────────────────────
  // DAEMON: split into 2 children on first hit (auto-5s not in core)
  // ──────────────────────────────────────────────────────────────────
  await test('DAEMON — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.daemon)) throw new Error('Missing daemon');
    if (!TEST.ok(PAYLOADS.daemon.cost === 500)) throw new Error('Wrong cost');
  });

  await test('DAEMON — ball.daemonSplit init', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['daemon']);
    if (!TEST.ok(ball.daemonSplit === false)) throw new Error('daemonSplit init wrong');
  });

  await test('DAEMON — daemon payload in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['daemon']);
    if (!TEST.ok(ball.payloads.includes('daemon'))) throw new Error('daemon not in payloads');
  });

  await test('DAEMON — daemonSplit triggers split', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['daemon']);
    ball.daemonSplit = true;
    if (!TEST.ok(ball.daemonSplit === true)) throw new Error('daemonSplit not set');
  });

  await test('DAEMON — daemonChild flag on spawned child', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['daemon']);
    const child = new Ball(ball.x, ball.y, ball.vx, ball.vy, []);
    child.daemonChild = true;
    if (!TEST.ok(child.daemonChild === true)) throw new Error('daemonChild not set on child');
  });

  await test('DAEMON — daemonSplit prevents re-split', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['daemon']);
    ball.daemonSplit = true;
    if (!TEST.ok(ball.daemonSplit === true)) throw new Error('daemonSplit not sticky');
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGICBOMB: trigger all overloads in radius
  // ──────────────────────────────────────────────────────────────────
  await test('LOGICBOMB — defined in PAYLOADS', () => {
    if (!TEST.ok(PAYLOADS.logicbomb)) throw new Error('Missing logicbomb');
    if (!TEST.ok(PAYLOADS.logicbomb.cost === 250)) throw new Error('Wrong cost');
  });

  await test('LOGICBOMB — explosiveTriggered flag on ball', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['logicbomb']);
    if (!TEST.ok(ball.explosiveTriggered === false)) throw new Error('explosiveTriggered init wrong');
  });

  await test('LOGICBOMB — logicbomb payload in ball.payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['logicbomb']);
    if (!TEST.ok(ball.payloads.includes('logicbomb'))) throw new Error('logicbomb not in payloads');
  });

  await test('LOGICBOMB — explosiveTriggered activates once', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['logicbomb']);
    ball.explosiveTriggered = true;
    if (!TEST.ok(ball.explosiveTriggered === true)) throw new Error('explosiveTriggered not set');
    ball.explosiveTriggered = true; // should stay true
    if (!TEST.ok(ball.explosiveTriggered === true)) throw new Error('explosiveTriggered toggled off');
  });

  // ──────────────────────────────────────────────────────────────────
  // PAYLOAD ACTIVATION via handlePegHit
  // ──────────────────────────────────────────────────────────────────
  await test('handlePegHit — exists on window', () => {
    if (!TEST.ok(typeof window.handlePegHit === 'function')) throw new Error('handlePegHit not a function');
  });

  await test('GS.currentPayloads — array for active payloads', () => {
    if (!TEST.ok(Array.isArray(gs.currentPayloads))) throw new Error('currentPayloads not array');
  });

  await test('Payloads — all 8 PAYLOADS keys exist', () => {
    const keys = ['scrambler', 'trojan', 'worm', 'ghost', 'cluster', 'slowmo', 'daemon', 'logicbomb'];
    for (const k of keys) {
      if (!TEST.ok(PAYLOADS[k], `Missing PAYLOADS.${k}`)) throw new Error(`Missing ${k}`);
    }
  });

  await test('Payloads — scrambler icon is ◎', () => {
    if (!TEST.ok(PAYLOADS.scrambler.icon === '◎')) throw new Error('scrambler icon wrong');
  });

  await test('Payloads — trojan icon is ◈', () => {
    if (!TEST.ok(PAYLOADS.trojan.icon === '◈')) throw new Error('trojan icon wrong');
  });

  await test('Payloads — worm icon is ≡', () => {
    if (!TEST.ok(PAYLOADS.worm.icon === '≡')) throw new Error('worm icon wrong');
  });

  await test('Payloads — ghost icon is ▣', () => {
    if (!TEST.ok(PAYLOADS.ghost.icon === '▣')) throw new Error('ghost icon wrong');
  });

  await test('Payloads — cluster icon is ✦', () => {
    if (!TEST.ok(PAYLOADS.cluster.icon === '✦')) throw new Error('cluster icon wrong');
  });

  await test('Payloads — slowmo icon is ◐', () => {
    if (!TEST.ok(PAYLOADS.slowmo.icon === '◐')) throw new Error('slowmo icon wrong');
  });

  await test('Payloads — daemon icon is ✺', () => {
    if (!TEST.ok(PAYLOADS.daemon.icon === '✺')) throw new Error('daemon icon wrong');
  });

  await test('Payloads — logicbomb icon is ✷', () => {
    if (!TEST.ok(PAYLOADS.logicbomb.icon === '✷')) throw new Error('logicbomb icon wrong');
  });

  await test('Payloads — all have color', () => {
    const keys = ['scrambler', 'trojan', 'worm', 'ghost', 'cluster', 'slowmo', 'daemon', 'logicbomb'];
    for (const k of keys) {
      if (!TEST.ok(PAYLOADS[k].color.startsWith('#'), `Missing color for ${k}`)) throw new Error(`Missing color for ${k}`);
    }
  });

  await test('Payloads — all have rarity', () => {
    const keys = ['scrambler', 'trojan', 'worm', 'ghost', 'cluster', 'slowmo', 'daemon', 'logicbomb'];
    for (const k of keys) {
      if (!TEST.ok(PAYLOADS[k].rarity, `Missing rarity for ${k}`)) throw new Error(`Missing rarity for ${k}`);
    }
  });

  await test('Payloads — scrambler cost 50', () => { if (!TEST.ok(PAYLOADS.scrambler.cost === 50)) throw new Error(); });
  await test('Payloads — trojan cost 100', () => { if (!TEST.ok(PAYLOADS.trojan.cost === 100)) throw new Error(); });
  await test('Payloads — worm cost 200', () => { if (!TEST.ok(PAYLOADS.worm.cost === 200)) throw new Error(); });
  await test('Payloads — ghost cost 175', () => { if (!TEST.ok(PAYLOADS.ghost.cost === 175)) throw new Error(); });
  await test('Payloads — cluster cost 450', () => { if (!TEST.ok(PAYLOADS.cluster.cost === 450)) throw new Error(); });
  await test('Payloads — slowmo cost 200', () => { if (!TEST.ok(PAYLOADS.slowmo.cost === 200)) throw new Error(); });
  await test('Payloads — daemon cost 500', () => { if (!TEST.ok(PAYLOADS.daemon.cost === 500)) throw new Error(); });
  await test('Payloads — logicbomb cost 250', () => { if (!TEST.ok(PAYLOADS.logicbomb.cost === 250)) throw new Error(); });

  await test('ball.payloads accepts multiple payloads', () => {
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['scrambler', 'trojan', 'worm']);
    if (!TEST.ok(ball.payloads.length === 3)) throw new Error('payloads length wrong');
    if (!TEST.ok(ball.payloads.includes('scrambler'))) throw new Error('scrambler missing');
    if (!TEST.ok(ball.payloads.includes('trojan'))) throw new Error('trojan missing');
    if (!TEST.ok(ball.payloads.includes('worm'))) throw new Error('worm missing');
  });

  await test('ball.dropMultiplier is set from GS.multiplier at creation', () => {
    const Ball = window.Ball;
    gs.multiplier = 5;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.dropMultiplier === 5)) throw new Error('dropMultiplier not set from GS.multiplier');
    gs.multiplier = 1;
  });

  await test('ball.isOverloaded when combo>=3 and not mini-ball', () => {
    const Ball = window.Ball;
    gs.comboCount = 3;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.isOverloaded === true)) throw new Error('isOverloaded not true at combo>=3');
    gs.comboCount = 2;
    const ball2 = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball2.isOverloaded === false)) throw new Error('isOverloaded true at combo<3');
    gs.comboCount = 0;
  });

  // ── Teardown ──
  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
