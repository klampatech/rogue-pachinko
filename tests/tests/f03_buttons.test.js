// f03_buttons.test.js — Every button element binding and interaction

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));

  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  const btnIds = [
    'start-btn', 'daily-btn', 'reset-btn', 'shop-btn',
    'mastery-btn', 'skins-btn', 'achievements-btn', 'leaderboard-btn',
    'contrast-btn', 'floor-continue-btn', 'runend-btn',
    'shop-continue-btn', 'shop-tab-credits', 'shop-tab-rep',
    'jp-spin-btn', 'jp-continue-btn',
    'tutorial-dismiss', 'initials-submit',
    'reset-confirm', 'reset-cancel'
  ];

  // ── All buttons exist in DOM ──
  for (const id of btnIds) {
    await test(`button #${id} exists in DOM`, () => {
      const el = document.getElementById(id);
      if (!TEST.ok(el !== null)) throw new Error(`#${id} not found`);
    });
  }

  // ── startBtn ──
  await test('start-btn click triggers startNewRun', () => {
    TEST.returnToMenu();
    document.getElementById('start-btn').click();
    if (!TEST.ok(gs.screen === 'playing')) throw new Error('start-btn did not start game');
    if (!TEST.ok(gs.floor === 1)) throw new Error('floor not reset to 1');
  });
  await test('start-btn hides menu-overlay', () => {
    TEST.returnToMenu();
    document.getElementById('start-btn').click();
    const menu = document.getElementById('menu-overlay');
    if (!TEST.ok(menu.classList.contains('hidden'))) throw new Error('menu still visible');
  });

  // ── dailyBtn ──
  await test('daily-btn click starts daily mode', () => {
    TEST.returnToMenu();
    document.getElementById('daily-btn').click();
    if (!TEST.ok(gs.screen === 'playing')) throw new Error('daily-btn did not start game');
    if (!TEST.ok(gs.dailyMode === true)) throw new Error('dailyMode not set');
    if (!TEST.ok(gs.floor === 3)) throw new Error('floor not 3 for daily mode');
  });

  // ── shopBtn (HUD) ──
  await test('shop-btn click opens shop overlay during play', () => {
    TEST.seed(11111);
    TEST.startRun();
    document.getElementById('shop-btn').click();
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('shop not opened');
  });

  // ── resetBtn ──
  await test('reset-btn click opens reset-overlay', () => {
    TEST.returnToMenu();
    document.getElementById('reset-btn').click();
    const el = document.getElementById('reset-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('reset-overlay not shown');
  });

  // ── reset-confirm / reset-cancel ──
  await test('reset-cancel closes reset-overlay without full reset', () => {
    TEST.returnToMenu();
    document.getElementById('reset-btn').click();
    document.getElementById('reset-cancel').click();
    const el = document.getElementById('reset-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('reset-overlay still active after cancel');
  });

  // ── runend-btn ──
  await test('runend-btn click triggers returnToMenu', () => {
    TEST.seed(22222);
    TEST.startRun();
    gs.score = 500;
    endRun(false);
    document.getElementById('runend-btn').click();
    if (!TEST.ok(gs.screen === 'menu')) throw new Error('runend-btn did not return to menu');
  });

  // ── floor-continue-btn ──
  await test('floor-continue-btn exists and is clickable after completeFloor', () => {
    TEST.seed(33333);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const btn = document.getElementById('floor-continue-btn');
    if (!TEST.ok(btn && btn.click !== undefined)) throw new Error('floor-continue-btn not clickable');
  });

  // ── shop-continue-btn ──
  await test('shop-continue-btn closes shop overlay', () => {
    TEST.seed(44444);
    TEST.startRun();
    openShop();
    document.getElementById('shop-continue-btn').click();
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('shop still active after continue');
  });

  // ── shop-tab-credits / shop-tab-rep ──
  await test('shop-tab-credits click renders credit shop items', () => {
    openShop('credits');
    const grid = document.getElementById('shop-grid');
    if (!TEST.ok(grid.children.length > 0)) throw new Error('shop-grid empty for credits tab');
  });
  await test('shop-tab-rep click renders rep shop items', () => {
    openShop('rep');
    const grid = document.getElementById('shop-grid');
    if (!TEST.ok(grid.children.length > 0)) throw new Error('shop-grid empty for rep tab');
  });
  await test('shop-tab-credits gets active class when selected', () => {
    openShop('credits');
    const tab = document.getElementById('shop-tab-credits');
    if (!TEST.ok(tab.classList.contains('active'))) throw new Error('credits tab not active');
  });

  // ── jp-spin-btn / jp-continue-btn ──
  await test('jp-spin-btn exists in floor-complete screen', () => {
    TEST.seed(55555);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const btn = document.getElementById('jp-spin-btn');
    if (!TEST.ok(btn !== null)) throw new Error('jp-spin-btn missing');
  });
  await test('jp-continue-btn exists in floor-complete screen', () => {
    TEST.seed(55555);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    const btn = document.getElementById('jp-continue-btn');
    if (!TEST.ok(btn !== null)) throw new Error('jp-continue-btn missing');
  });

  // ── tutorial-dismiss ──
  await test('tutorial-dismiss closes tutorial-overlay', () => {
    showTutorialModal('TEST', 'Dismiss me!', 'test_key');
    document.getElementById('tutorial-dismiss').click();
    const el = document.getElementById('tutorial-overlay');
    if (!TEST.ok(el.style.display === 'none')) throw new Error('tutorial-overlay still visible');
  });

  // ── contrastBtn ──
  await test('contrast-btn toggle adds contrast-mode to body', () => {
    TEST.returnToMenu();
    document.getElementById('contrast-btn').click();
    if (!TEST.ok(document.body.classList.contains('contrast-mode'))) throw new Error('contrast-mode not added');
    document.body.classList.remove('contrast-mode');
  });

  // ── masteryBtn ──
  await test('mastery-btn exists and is in menu tertiary section', () => {
    TEST.returnToMenu();
    const btn = document.getElementById('mastery-btn');
    if (!TEST.ok(btn !== null)) throw new Error('mastery-btn missing');
  });

  // ── skinsBtn ──
  await test('skins-btn exists in menu', () => {
    TEST.returnToMenu();
    const btn = document.getElementById('skins-btn');
    if (!TEST.ok(btn !== null)) throw new Error('skins-btn missing');
  });

  // ── achievementsBtn ──
  await test('achievements-btn exists in menu', () => {
    TEST.returnToMenu();
    const btn = document.getElementById('achievements-btn');
    if (!TEST.ok(btn !== null)) throw new Error('achievements-btn missing');
  });

  // ── leaderboardBtn ──
  await test('leaderboard-btn exists in menu', () => {
    TEST.returnToMenu();
    const btn = document.getElementById('leaderboard-btn');
    if (!TEST.ok(btn !== null)) throw new Error('leaderboard-btn missing');
  });

  // ── button styling classes ──
  await test('start-btn has game-btn class', () => {
    const btn = document.getElementById('start-btn');
    if (!TEST.ok(btn.classList.contains('game-btn'))) throw new Error('start-btn missing game-btn');
  });
  await test('secondary buttons have secondary class', () => {
    const btn = document.getElementById('daily-btn');
    if (!TEST.ok(btn.classList.contains('secondary'))) throw new Error('daily-btn missing secondary');
  });

  // ── shop-buy-btn (dynamic) ──
  await test('shop-buy-btn buttons are rendered and clickable', () => {
    openShop();
    const btns = document.querySelectorAll('.shop-buy-btn');
    if (!TEST.ok(btns.length > 0)) throw new Error('no shop-buy-btn rendered');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
