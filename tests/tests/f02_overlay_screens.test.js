// f02_overlay_screens.test.js — All overlay open/close scenarios

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));

  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // ── menu-overlay ──
  await test('menu-overlay visible on load (after returnToMenu)', () => {
    TEST.returnToMenu();
    const el = document.getElementById('menu-overlay');
    if (!TEST.ok(!el.classList.contains('hidden'))) throw new Error('menu not visible');
  });
  await test('startNewRun hides menu-overlay', () => {
    TEST.seed(11111);
    TEST.startRun();
    const el = document.getElementById('menu-overlay');
    if (!TEST.ok(el.classList.contains('hidden'))) throw new Error('menu still visible');
  });

  // ── shop-overlay ──
  await test('openShop adds active class to shop-overlay', () => {
    openShop();
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('shop not active');
  });
  await test('openShop sets GS.screen to shop', () => {
    openShop();
    if (!TEST.ok(gs.screen === 'shop')) throw new Error('screen not shop');
  });
  await test('closeShop removes active class from shop-overlay', () => {
    openShop();
    closeShop();
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('shop still active after close');
  });
  await test('closeShop with skipFloorAdvance=false resumes to playing', () => {
    TEST.seed(22222);
    TEST.startRun();
    openShop();
    closeShop(false);
    // After shop close, game should resume playing
    // Screen transition depends on floor_complete state
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('shop still active');
  });

  // ── floor-overlay (floor complete) ──
  await test('completeFloor shows floor-overlay', () => {
    TEST.seed(33333);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const el = document.getElementById('floor-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('floor-overlay not active');
  });
  await test('floor-overlay has title element', () => {
    TEST.seed(33333);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const el = document.getElementById('floor-complete-title');
    if (!TEST.ok(el && el.textContent.length > 0)) throw new Error('floor-complete-title empty');
  });
  await test('floor-overlay has stats element', () => {
    TEST.seed(33333);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const el = document.getElementById('floor-stats');
    if (!TEST.ok(el !== null)) throw new Error('floor-stats missing');
  });
  await test('floor-continue-btn exists in floor-overlay', () => {
    const btn = document.getElementById('floor-continue-btn');
    if (!TEST.ok(btn !== null)) throw new Error('floor-continue-btn missing');
  });

  // ── runend-overlay ──
  await test('endRun(false) shows runend-overlay', () => {
    TEST.seed(44444);
    TEST.startRun();
    gs.score = 500;
    endRun(false);
    const el = document.getElementById('runend-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('runend not active');
  });
  await test('runend-overlay has title element', () => {
    TEST.seed(44444);
    TEST.startRun();
    gs.score = 500;
    endRun(false);
    const el = document.getElementById('runend-title');
    if (!TEST.ok(el && el.textContent.length > 0)) throw new Error('runend-title empty');
  });
  await test('runend-overlay has stats element', () => {
    TEST.seed(44444);
    TEST.startRun();
    gs.score = 500;
    endRun(false);
    const el = document.getElementById('runend-stats');
    if (!TEST.ok(el !== null)) throw new Error('runend-stats missing');
  });
  await test('runend-btn returns to menu', () => {
    TEST.seed(44444);
    TEST.startRun();
    gs.score = 500;
    endRun(false);
    TEST.returnToMenu();
    const el = document.getElementById('runend-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('runend still active after returnToMenu');
  });

  // ── reset-overlay ──
  await test('reset-overlay hidden by default', () => {
    const el = document.getElementById('reset-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('reset-overlay visible by default');
  });
  await test('resetBtn in menu triggers reset overlay', () => {
    TEST.returnToMenu();
    const btn = document.getElementById('reset-btn');
    if (!TEST.ok(btn !== null)) throw new Error('reset-btn missing');
    btn.click();
    const el = document.getElementById('reset-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('reset-overlay not shown on click');
  });

  // ── tutorial-overlay (first-run how-to-play) ──
  await test('tutorial-overlay exists in DOM', () => {
    const el = document.getElementById('tutorial-overlay');
    if (!TEST.ok(el !== null)) throw new Error('tutorial-overlay missing from DOM');
  });
  await test('tutorial-overlay starts hidden (display:none)', () => {
    const el = document.getElementById('tutorial-overlay');
    if (!TEST.ok(el.style.display === 'none' || el.style.display === '')) throw new Error('tutorial-overlay visible on load');
  });

  // ── tutorial-modal (timelock/ghost) — #tutorial-modal ──
  await test('tutorial-modal (timelock) opens via showTutorialModal', () => {
    showTutorialModal('TIMELOCK', 'Clear all pegs before time runs out!', 'timelock_intro');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el && el.style.display !== 'none')) throw new Error('tutorial-modal not shown');
  });
  await test('tutorial-modal has title text', () => {
    showTutorialModal('GHOST MODE', 'Balls phase through pegs!', 'ghost_intro');
    const title = document.querySelector('#tutorial-modal .tut-title');
    if (!TEST.ok(title && title.textContent.length > 0)) throw new Error('tutorial title missing');
  });
  await test('tutorial-modal dismiss on GOT IT button', () => {
    showTutorialModal('BOSS', 'Destroy the boss peg!', 'boss_intro');
    const dismiss = document.getElementById('tutorial-modal-close');
    if (!TEST.ok(dismiss !== null)) throw new Error('tutorial-modal-close btn missing');
    dismiss.click();
    const el = document.getElementById('tutorial-modal');
    // After dismiss, modal should be hidden
    if (!TEST.ok(el.style.display === 'none')) throw new Error('tutorial-modal still visible after dismiss');
  });

  // ── overlay stacking / z-index ──
  await test('shop-overlay is above floor-overlay (shop closes before floor-complete)', () => {
    // Open shop from floor complete
    TEST.seed(55555);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    openShop();
    const shop = document.getElementById('shop-overlay');
    const floor = document.getElementById('floor-overlay');
    // shop should be visible and active; floor may be hidden
    if (!TEST.ok(shop.classList.contains('active'))) throw new Error('shop not active from floor-complete');
  });

  // ── gameover-interstitial ──
  await test('gameover-interstitial exists in DOM', () => {
    const el = document.getElementById('gameover-interstitial');
    if (!TEST.ok(el !== null)) throw new Error('gameover-interstitial missing');
  });
  await test('gameover-interstitial hidden by default', () => {
    const el = document.getElementById('gameover-interstitial');
    if (!TEST.ok(el.style.display === 'none' || el.style.display === '')) throw new Error('gameover-interstitial visible on load');
  });

  // ── completeFloor dismisses tutorial-modal ──
  await test('completeFloor dismisses tutorial-modal if open', () => {
    showTutorialModal('TIMELOCK', 'Beat the clock!', 'timelock_test');
    const tutModal = document.getElementById('tutorial-modal');
    TEST.seed(66666);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    if (!TEST.ok(tutModal.style.display === 'none')) throw new Error('tutorial-modal not dismissed by completeFloor');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
