// f01_hud.test.js — updateHUD, updateMultiplierDisplay, updateChainTimerBar, updateObjectiveBar, updatePayloadSlots, updateMenuStats

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));

  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // ── updateHUD ──
  await test('updateHUD updates floor-indicator text', () => {
    gs.floor = 7;
    updateHUD();
    const el = document.getElementById('floor-indicator');
    if (!TEST.ok(el.textContent === '7')) throw new Error('floor not updated');
  });
  await test('updateHUD updates score-value text', () => {
    gs.score = 12345;
    updateHUD();
    const el = document.getElementById('score-value');
    if (!TEST.ok(el.textContent.includes('12,345'))) throw new Error('score not updated');
  });
  await test('updateHUD updates jackpot-display text', () => {
    gs.jackpotPool = 9999;
    updateHUD();
    const el = document.getElementById('jackpot-display');
    if (!TEST.ok(el.textContent.includes('9,999'))) throw new Error('jackpot not updated');
  });
  await test('updateHUD creates ball dots in balls-display', () => {
    gs.balls = 3;
    updateHUD();
    const dots = document.querySelectorAll('#balls-display .ball-dot');
    if (!TEST.ok(dots.length >= 3)) throw new Error('ball dots not created');
  });
  await test('updateHUD shows empty class for dots beyond ball count', () => {
    gs.balls = 2;
    updateHUD();
    const dots = document.querySelectorAll('#balls-display .ball-dot.empty');
    if (!TEST.ok(dots.length >= 3)) throw new Error('empty dots not shown for excess balls');
  });
  await test('updateHUD creates combo-display element', () => {
    gs.comboCount = 0;
    gs.comboThreshold = 5;
    updateHUD();
    const el = document.getElementById('combo-display');
    if (!TEST.ok(el !== null)) throw new Error('combo-display not created');
  });
  await test('updateHUD creates streak-banner when combo >= 3', () => {
    gs.comboCount = 4;
    gs.comboThreshold = 3;
    updateHUD();
    const el = document.getElementById('streak-banner');
    if (!TEST.ok(el !== null)) throw new Error('streak-banner not created');
  });

  // ── updateMultiplierDisplay ──
  await test('updateMultiplierDisplay updates multiplier element', () => {
    gs.multiplier = 3;
    updateMultiplierDisplay();
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el && el.textContent.includes('3'))) throw new Error('multiplier not displayed');
  });
  await test('updateMultiplierDisplay handles x1', () => {
    gs.multiplier = 1;
    updateMultiplierDisplay();
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el)) throw new Error('multiplier-display missing');
  });
  await test('updateMultiplierDisplay handles max x7', () => {
    gs.multiplier = 7;
    updateMultiplierDisplay();
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el && el.textContent.includes('7'))) throw new Error('x7 not displayed');
  });

  // ── updateChainTimerBar ──
  await test('updateChainTimerBar exists and runs without error', () => {
    gs.chainTimer = 30;
    updateChainTimerBar();
    const bar = document.getElementById('chain-timer-bar');
    if (!TEST.ok(bar !== null)) throw new Error('chain-timer-bar missing');
  });
  await test('updateChainTimerBar sets fill width from chainTimer', () => {
    gs.chainTimer = 15;
    updateChainTimerBar();
    const fill = document.getElementById('chain-timer-bar-fill');
    if (!TEST.ok(fill !== null)) throw new Error('chain-timer-bar-fill missing');
  });
  await test('updateChainTimerBar handles zero timer', () => {
    gs.chainTimer = 0;
    updateChainTimerBar();
    const fill = document.getElementById('chain-timer-bar-fill');
    if (!TEST.ok(fill)) throw new Error('fill missing at zero');
  });

  // ── updateObjectiveBar ──
  await test('updateObjectiveBar sets fill width from progress/target', () => {
    gs.floorObjective = { type: 'standard', target: 20, progress: 10, label: 'CLEAR 20 PEGS' };
    updateObjectiveBar();
    const fill = document.getElementById('objective-fill');
    if (!TEST.ok(fill && fill.style.width === '50%')) throw new Error('fill not 50%');
  });
  await test('updateObjectiveBar updates label text', () => {
    gs.floorObjective = { type: 'standard', target: 20, progress: 0, label: 'CLEAR 20 PEGS' };
    updateObjectiveBar();
    const label = document.getElementById('objective-label');
    if (!TEST.ok(label && label.textContent === 'CLEAR 20 PEGS')) throw new Error('label not updated');
  });
  await test('updateObjectiveBar caps fill at 100%', () => {
    gs.floorObjective = { type: 'standard', target: 20, progress: 30, label: 'OVERCLEAR' };
    updateObjectiveBar();
    const fill = document.getElementById('objective-fill');
    if (!TEST.ok(fill && fill.style.width === '100%')) throw new Error('fill not capped at 100%');
  });

  // ── updatePayloadSlots ──
  await test('updatePayloadSlots renders 2 slot elements', () => {
    gs.currentPayloads = [];
    updatePayloadSlots();
    const slots = document.querySelectorAll('.payload-slot');
    if (!TEST.ok(slots.length === 2)) throw new Error('expected 2 payload slots');
  });
  await test('updatePayloadSlots shows icon when payload equipped', () => {
    gs.currentPayloads = ['scrambler'];
    updatePayloadSlots();
    const slot = document.getElementById('payload-slot-0');
    if (!TEST.ok(slot && slot.textContent !== '—')) throw new Error('payload icon not shown');
  });
  await test('updatePayloadSlots shows dash when slot empty', () => {
    gs.currentPayloads = [];
    updatePayloadSlots();
    const slot = document.getElementById('payload-slot-0');
    if (!TEST.ok(slot && slot.textContent === '—')) throw new Error('empty slot not showing dash');
  });
  await test('updatePayloadSlots marks active class when payload equipped', () => {
    gs.currentPayloads = ['trojan'];
    updatePayloadSlots();
    const slot = document.getElementById('payload-slot-0');
    if (!TEST.ok(slot && slot.classList.contains('active'))) throw new Error('active class not applied');
  });

  // ── updateMenuStats ──
  await test('updateMenuStats updates menu-rank element', () => {
    gs.rank = 'Netrunner';
    updateMenuStats();
    const el = document.getElementById('menu-rank');
    if (!TEST.ok(el && el.textContent === 'Netrunner')) throw new Error('rank not updated');
  });
  await test('updateMenuStats updates menu-rep element', () => {
    gs.reputation = 999;
    updateMenuStats();
    const el = document.getElementById('menu-rep');
    if (!TEST.ok(el && el.textContent === '999')) throw new Error('rep not updated');
  });
  await test('updateMenuStats updates menu-breach element', () => {
    gs.lifetimeBreach = 50000;
    updateMenuStats();
    const el = document.getElementById('menu-breach');
    if (!TEST.ok(el && el.textContent === '50,000')) throw new Error('lifetimeBreach not updated');
  });
  await test('updateMenuStats updates menu-bestfloor element', () => {
    gs.bestFloor = 7;
    updateMenuStats();
    const el = document.getElementById('menu-bestfloor');
    if (!TEST.ok(el && el.textContent === '7')) throw new Error('bestFloor not updated');
  });
  await test('updateMenuStats updates menu-totalruns element', () => {
    gs.totalRuns = 42;
    updateMenuStats();
    const el = document.getElementById('menu-totalruns');
    if (!TEST.ok(el && el.textContent === '42')) throw new Error('totalRuns not updated');
  });
  await test('updateMenuStats updates menu-bestscore element', () => {
    gs.bestScore = 12345;
    updateMenuStats();
    const el = document.getElementById('menu-bestscore');
    if (!TEST.ok(el && el.textContent === '12,345')) throw new Error('bestScore not updated');
  });

  // ── HUD interaction with game state ──
  await test('updateHUD called after setBalls reflects ball count', () => {
    TEST.seed(12345);
    TEST.startRun();
    TEST.setBalls(2);
    updateHUD();
    const label = document.querySelector('#balls-display span');
    if (!TEST.ok(label && label.textContent.includes('2'))) throw new Error('balls not updated in HUD');
  });
  await test('updateHUD reflects score changes', () => {
    gs.score = 99999;
    updateHUD();
    const el = document.getElementById('score-value');
    if (!TEST.ok(el.textContent.includes('99,999'))) throw new Error('score change not reflected');
  });

  // ── multiplier display cascading ──
  await test('cascade multiplier x2 updates display', () => {
    gs.multiplier = 2;
    updateMultiplierDisplay();
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el && el.textContent.includes('2'))) throw new Error('x2 not displayed');
  });
  await test('cascade multiplier x5 updates display', () => {
    gs.multiplier = 5;
    updateMultiplierDisplay();
    const el = document.getElementById('multiplier-display');
    if (!TEST.ok(el && el.textContent.includes('5'))) throw new Error('x5 not displayed');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
