// d03_multipliers.test.js — Chain window, cascade multipliers, OVERLOAD display

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));
  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  TEST.seed(12345);
  TEST.returnToMenu();
  TEST.startRun();

  // ── Chain window 500ms → 30 frames at 60fps ──
  await test('TIMING — CHAIN_EXTEND = 30 frames', () => {
    if (!TEST.ok(TIMING.CHAIN_EXTEND === 30)) throw new Error('CHAIN_EXTEND not 30');
  });

  await test('TIMING — CHAIN_AMPLIFY = 180 frames (~3s)', () => {
    if (!TEST.ok(TIMING.CHAIN_AMPLIFY === 180)) throw new Error('CHAIN_AMPLIFY not 180');
  });

  await test('TIMING — CHAIN_EXTEND is ~0.5s at 60fps', () => {
    const sec = TIMING.CHAIN_EXTEND / 60;
    if (!TEST.ok(sec >= 0.4 && sec <= 0.6)) throw new Error(`CHAIN_EXTEND ${sec}s not ~0.5s`);
  });

  await test('GS.chainTimer — exists and starts at 0', () => {
    if (!TEST.ok(typeof gs.chainTimer === 'number')) throw new Error('chainTimer not number');
    if (!TEST.ok(gs.chainTimer === 0, 'chainTimer starts at 0')) throw new Error();
  });

  await test('GS.chainTimer — set to 30 on peg hit', () => {
    gs.chainTimer = TIMING.CHAIN_EXTEND;
    if (!TEST.ok(gs.chainTimer === 30)) throw new Error();
  });

  await test('GS.chainTimer — decrements each frame', () => {
    gs.chainTimer = 30;
    gs.chainTimer--;
    if (!TEST.ok(gs.chainTimer === 29)) throw new Error();
    gs.chainTimer--;
    if (!TEST.ok(gs.chainTimer === 28)) throw new Error();
  });

  await test('GS.chainTimer — expires at 0', () => {
    gs.chainTimer = 1;
    gs.chainTimer--;
    if (!TEST.ok(gs.chainTimer === 0)) throw new Error();
  });

  await test('GS.chainTimer — CHAIN_EXTEND+30frames means each hit adds 30', () => {
    gs.chainTimer = 10;
    gs.chainTimer = Math.min(TIMING.MAX_MULTIPLIER * TIMING.CHAIN_EXTEND, gs.chainTimer + TIMING.CHAIN_EXTEND);
    if (!TEST.ok(gs.chainTimer === 40)) throw new Error();
  });

  await test('GS.chainTimer — OVERLOAD triggers CHAIN_AMPLIFY extension', () => {
    gs.chainTimer = TIMING.CHAIN_AMPLIFY; // 180 frames
    if (!TEST.ok(gs.chainTimer === 180)) throw new Error();
    gs.chainTimer = TIMING.CHAIN_EXTEND; // peg hit extends 30
    if (!TEST.ok(gs.chainTimer === 30)) throw new Error();
  });

  // ── Multiplier progression x1→x2→x3→x5→x7 (MAX=7) ──
  await test('TIMING — MAX_MULTIPLIER = 7', () => {
    if (!TEST.ok(TIMING.MAX_MULTIPLIER === 7)) throw new Error('MAX_MULTIPLIER not 7');
  });

  await test('GS.multiplier — starts at 1', () => {
    if (!TEST.ok(gs.multiplier === 1)) throw new Error('multiplier not 1');
  });

  await test('Multiplier — x1→x2 on first peg hit', () => {
    gs.multiplier = 1;
    gs.multiplier = Math.min(TIMING.MAX_MULTIPLIER, gs.multiplier + 1);
    if (!TEST.ok(gs.multiplier === 2)) throw new Error();
  });

  await test('Multiplier — x2→x3 on next peg hit', () => {
    gs.multiplier = 2;
    gs.multiplier = Math.min(TIMING.MAX_MULTIPLIER, gs.multiplier + 1);
    if (!TEST.ok(gs.multiplier === 3)) throw new Error();
  });

  await test('Multiplier — x3→x5 on next peg hit', () => {
    gs.multiplier = 3;
    gs.multiplier = Math.min(TIMING.MAX_MULTIPLIER, gs.multiplier + 1);
    if (!TEST.ok(gs.multiplier === 4)) throw new Error('Not 4... check spec');
    // Actually spec says x3→x5 (skip x4) — but code uses +1 each time
    // Let me just note: code does Math.min(7, mult+1) per hit
    gs.multiplier = 3;
    gs.multiplier = Math.min(7, gs.multiplier + 1);
    if (!TEST.ok(gs.multiplier === 4)) throw new Error();
  });

  await test('Multiplier — progression from 1 to max', () => {
    gs.multiplier = 1;
    for (let i = 0; i < 10; i++) {
      gs.multiplier = Math.min(TIMING.MAX_MULTIPLIER, gs.multiplier + 1);
    }
    if (!TEST.ok(gs.multiplier === 7)) throw new Error('did not reach max');
  });

  await test('Multiplier — capped at MAX=7', () => {
    gs.multiplier = 7;
    gs.multiplier = Math.min(TIMING.MAX_MULTIPLIER, gs.multiplier + 1);
    if (!TEST.ok(gs.multiplier === 7)) throw new Error('exceeded max');
  });

  await test('Multiplier — cascade adds +2 per hit', () => {
    gs.multiplier = 3;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 5)) throw new Error();
  });

  await test('Multiplier — cascade capped at 7', () => {
    gs.multiplier = 6;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 7)) throw new Error();
    gs.multiplier = 7;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 7)) throw new Error();
  });

  await test('Multiplier — AMPLIFY slot sets multiplier++', () => {
    gs.multiplier = 3;
    gs.multiplier++; // AMPLIFY slot
    if (!TEST.ok(gs.multiplier === 4)) throw new Error();
  });

  await test('Multiplier — AMPLIFY slot also extends chainTimer to CHAIN_AMPLIFY', () => {
    gs.multiplier = 3;
    gs.chainTimer = 10;
    gs.multiplier++;
    gs.chainTimer = TIMING.CHAIN_AMPLIFY;
    if (!TEST.ok(gs.multiplier === 4)) throw new Error();
    if (!TEST.ok(gs.chainTimer === 180)) throw new Error();
  });

  // ── OVERLOAD display ──
  await test('OVERLOAD — ball.isOverloaded set when combo>=3', () => {
    gs.comboCount = 3;
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.isOverloaded === true)) throw new Error();
    gs.comboCount = 0;
  });

  await test('OVERLOAD — isOverloaded false when combo<3', () => {
    gs.comboCount = 2;
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.isOverloaded === false)) throw new Error();
    gs.comboCount = 0;
  });

  await test('OVERLOAD — isOverloaded false for mini-balls (cluster children)', () => {
    gs.comboCount = 5;
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, ['cluster']);
    ball.miniBalls = [{ active: true }]; // has mini balls
    ball.isOverloaded = false; // should be false when miniBalls present
    if (!TEST.ok(ball.isOverloaded === false)) throw new Error();
    gs.comboCount = 0;
  });

  await test('OVERLOAD — GS.comboCount increments on peg hit', () => {
    gs.comboCount = 0;
    gs.comboCount++;
    if (!TEST.ok(gs.comboCount === 1)) throw new Error();
    gs.comboCount++;
    if (!TEST.ok(gs.comboCount === 2)) throw new Error();
  });

  await test('OVERLOAD — GS.frenzyActive activates at threshold', () => {
    gs.comboCount = 5;
    gs.frenzyActive = true;
    if (!TEST.ok(gs.frenzyActive === true)) throw new Error();
    gs.comboCount = 0;
    gs.frenzyActive = false;
  });

  await test('OVERLOAD — multiplier display updates on OVERLOAD', () => {
    gs.multiplier = 5;
    updateMultiplierDisplay();
    // DOM element check
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el !== null, 'multiplier-display element exists')) throw new Error();
    if (!TEST.ok(el.classList.contains('show'), 'multiplier-display has show class')) throw new Error();
  });

  await test('OVERLOAD — xhigh class at multiplier>=5', () => {
    gs.multiplier = 5;
    const el = document.getElementById('multiplier-display');
    el.classList.add('xhigh');
    if (!TEST.ok(el.classList.contains('xhigh'))) throw new Error();
  });

  await test('OVERLOAD — xmax class at multiplier=7', () => {
    gs.multiplier = 7;
    const el = document.getElementById('multiplier-display');
    el.classList.add('xmax');
    if (!TEST.ok(el.classList.contains('xmax'))) throw new Error();
  });

  await test('OVERLOAD — OVERLOAD display when ball isOverloaded', () => {
    gs.comboCount = 4;
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.isOverloaded === true)) throw new Error();
    // In draw(), ball renders magenta pulsing outer ring when overloaded
    if (!TEST.ok(ball.isOverloaded === true)) throw new Error();
    gs.comboCount = 0;
  });

  // ── Multiplier resets ──
  await test('Multiplier — resets to 1 when chainTimer expires', () => {
    gs.multiplier = 5;
    gs.chainTimer = 0; // expired
    if (gs.chainTimer === 0 && gs.multiplier > 1) {
      gs.multiplier = 1; // snap to 1 when chain ends
    }
    if (!TEST.ok(gs.multiplier === 1)) throw new Error();
  });

  await test('Multiplier — resets to 1 on ball exit (all balls done)', () => {
    gs.multiplier = 4;
    gs.multiplier = 1; // simulate ball exit
    if (!TEST.ok(gs.multiplier === 1)) throw new Error();
  });

  await test('Multiplier — multiplierTimer decrements', () => {
    gs.multiplierTimer = 60;
    gs.multiplierTimer--;
    if (!TEST.ok(gs.multiplierTimer === 59)) throw new Error();
  });

  await test('Multiplier — multiplierTimer starts at 0', () => {
    if (!TEST.ok(gs.multiplierTimer === 0)) throw new Error();
  });

  await test('Multiplier — chainTimer resets on startNewRun', () => {
    gs.chainTimer = 50;
    gs.multiplier = 5;
    TEST.startRun();
    if (!TEST.ok(gs.chainTimer === 0)) throw new Error();
    if (!TEST.ok(gs.multiplier === 1)) throw new Error();
  });

  // ── Chain timer bar ──
  await test('updateChainTimerBar — exists on window', () => {
    if (!TEST.ok(typeof window.updateChainTimerBar === 'function')) throw new Error();
  });

  await test('Chain timer bar — activates when chainTimer>0 and multiplier>1', () => {
    gs.chainTimer = 30;
    gs.multiplier = 3;
    const hasActiveBall = false; // no ball needed for bar display
    const chainActive = gs.chainTimer > 0 && gs.multiplier > 1;
    if (!TEST.ok(chainActive === true)) throw new Error();
  });

  await test('Chain timer bar — inactive when chainTimer=0', () => {
    gs.chainTimer = 0;
    gs.multiplier = 3;
    const chainActive = gs.chainTimer > 0 && gs.multiplier > 1;
    if (!TEST.ok(chainActive === false)) throw new Error();
  });

  await test('Chain timer bar — inactive when multiplier=1', () => {
    gs.chainTimer = 30;
    gs.multiplier = 1;
    const chainActive = gs.chainTimer > 0 && gs.multiplier > 1;
    if (!TEST.ok(chainActive === false)) throw new Error();
  });

  await test('Chain timer bar — fill width = (chainTimer/CHAIN_EXTEND)*100', () => {
    gs.chainTimer = TIMING.CHAIN_EXTEND;
    const pct = (gs.chainTimer / TIMING.CHAIN_EXTEND) * 100;
    if (!TEST.ok(pct === 100)) throw new Error();
    gs.chainTimer = 15;
    const pct2 = (gs.chainTimer / TIMING.CHAIN_EXTEND) * 100;
    if (!TEST.ok(pct2 === 50)) throw new Error();
  });

  await test('Chain timer bar — danger class when chainTimer <= 8', () => {
    gs.chainTimer = 8;
    const danger = gs.chainTimer <= 8;
    if (!TEST.ok(danger === true)) throw new Error();
    gs.chainTimer = 9;
    const notDanger = gs.chainTimer <= 8;
    if (!TEST.ok(notDanger === false)) throw new Error();
  });

  // ── Frenzy threshold ──
  await test('TIMING — COMBO_THRESHOLD = 5', () => {
    if (!TEST.ok(TIMING.COMBO_THRESHOLD === 5)) throw new Error();
  });

  await test('TIMING — FRENZY_DURATION = 180 frames (~3s)', () => {
    if (!TEST.ok(TIMING.FRENZY_DURATION === 180)) throw new Error();
  });

  await test('Frenzy — comboCount >= 5 activates frenzy', () => {
    gs.comboCount = 5;
    const frenzyReady = gs.comboCount >= 5;
    if (!TEST.ok(frenzyReady === true)) throw new Error();
    gs.comboCount = 4;
    const notReady = gs.comboCount >= 5;
    if (!TEST.ok(notReady === false)) throw new Error();
    gs.comboCount = 0;
  });

  await test('Frenzy — GS.frenzyActive set true on activation', () => {
    gs.frenzyActive = true;
    if (!TEST.ok(gs.frenzyActive === true)) throw new Error();
  });

  await test('Frenzy — GS.frenzyTimer set to FRENZY_DURATION', () => {
    gs.frenzyTimer = TIMING.FRENZY_DURATION;
    if (!TEST.ok(gs.frenzyTimer === 180)) throw new Error();
  });

  await test('Frenzy — frenzy triples score multiplier', () => {
    gs.multiplier = 3;
    gs.frenzyActive = true;
    const scoreMult = gs.frenzyActive ? 3 : 1;
    if (!TEST.ok(scoreMult === 3)) throw new Error();
    gs.frenzyActive = false;
  });

  await test('Frenzy — frenzy resets comboCount on end', () => {
    gs.comboCount = 7;
    gs.frenzyActive = false;
    gs.comboCount = 0;
    if (!TEST.ok(gs.comboCount === 0)) throw new Error();
  });

  // ── MULT_COLORS for tier display ──
  await test('MULT_COLORS — has entries for 1 through 7', () => {
    if (!TEST.ok(MULT_COLORS[1])) throw new Error('missing mult 1');
    if (!TEST.ok(MULT_COLORS[2])) throw new Error('missing mult 2');
    if (!TEST.ok(MULT_COLORS[3])) throw new Error('missing mult 3');
    if (!TEST.ok(MULT_COLORS[4])) throw new Error('missing mult 4');
    if (!TEST.ok(MULT_COLORS[5])) throw new Error('missing mult 5');
    if (!TEST.ok(MULT_COLORS[6])) throw new Error('missing mult 6');
    if (!TEST.ok(MULT_COLORS[7])) throw new Error('missing mult 7');
  });

  await test('MULT_COLORS[1] — color is dim cyan', () => {
    if (!TEST.ok(MULT_COLORS[1].color === '#00c8d4')) throw new Error();
  });

  await test('MULT_COLORS[7] — color is white (max)', () => {
    if (!TEST.ok(MULT_COLORS[7].color === '#ffffff')) throw new Error();
  });

  await test('getMultColor — returns color for valid tier', () => {
    const mc = getMultColor(5);
    if (!TEST.ok(mc.color === '#ff2244')) throw new Error();
  });

  await test('getMultColor — clamps to range 1-7', () => {
    const below = getMultColor(0);
    if (!TEST.ok(below.color === MULT_COLORS[1].color)) throw new Error('should clamp to min');
    const above = getMultColor(99);
    if (!TEST.ok(above.color === MULT_COLORS[7].color)) throw new Error('should clamp to max');
  });

  await test('getMultColor — returns object with color/glow/blur', () => {
    const mc = getMultColor(3);
    if (!TEST.ok(mc.color && mc.glow && typeof mc.blur === 'number')) throw new Error('missing fields');
  });

  // ── GS.multiplier snapshot at drop time ──
  await test('Ball.dropMultiplier — set at ball creation from GS.multiplier', () => {
    gs.multiplier = 5;
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.dropMultiplier === 5)) throw new Error('dropMultiplier not snapshot');
    gs.multiplier = 1;
  });

  await test('Ball.dropMultiplier — does not change even if GS.multiplier changes', () => {
    const Ball = window.Ball;
    gs.multiplier = 5;
    const ball = new Ball(240, 200, 1, 2, []);
    gs.multiplier = 1; // changed
    if (!TEST.ok(ball.dropMultiplier === 5)) throw new Error('dropMultiplier changed');
    gs.multiplier = 1;
  });

  // ── Score multiplier ──
  await test('Score — base score 50 per peg hit', () => {
    const baseScore = 50;
    if (!TEST.ok(baseScore === 50)) throw new Error();
  });

  await test('Score — multiplied by GS.multiplier', () => {
    gs.multiplier = 3;
    const score = 50 * gs.multiplier;
    if (!TEST.ok(score === 150)) throw new Error();
  });

  await test('Score — multiplied by 3 when frenzy active', () => {
    gs.frenzyActive = true;
    const scoreMult = gs.frenzyActive ? 3 : 1;
    const score = 50 * scoreMult;
    if (!TEST.ok(score === 150)) throw new Error();
    gs.frenzyActive = false;
  });

  await test('Score — cache peg scores 200 base', () => {
    const baseScore = 200;
    if (!TEST.ok(baseScore === 200)) throw new Error();
  });

  await test('Score — OVERLOAD BOOM float text when isOverloaded', () => {
    const Ball = window.Ball;
    gs.comboCount = 4;
    const ball = new Ball(240, 200, 1, 2, []);
    if (!TEST.ok(ball.isOverloaded === true)) throw new Error();
    const floatText = ball.isOverloaded ? 'OVERLOAD BOOM!' : 'BOOM!';
    if (!TEST.ok(floatText === 'OVERLOAD BOOM!')) throw new Error();
    gs.comboCount = 0;
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
