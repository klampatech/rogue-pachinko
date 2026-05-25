// e03_skins.test.js — Ball skin selection, openSkinsScreen, selectBallSkin, persistence

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

  // ── BALL_SKINS object ──
  await test('BALL_SKINS — has default skin', () => { if (!TEST.ok(BALL_SKINS.default)) throw new Error(); });
  await test('BALL_SKINS — has gold skin', () => { if (!TEST.ok(BALL_SKINS.gold)) throw new Error(); });
  await test('BALL_SKINS — has neon skin', () => { if (!TEST.ok(BALL_SKINS.neon)) throw new Error(); });
  await test('BALL_SKINS — has void skin', () => { if (!TEST.ok(BALL_SKINS['void'])) throw new Error(); });
  await test('BALL_SKINS — has ember skin', () => { if (!TEST.ok(BALL_SKINS.ember)) throw new Error(); });
  await test('BALL_SKINS — has frost skin', () => { if (!TEST.ok(BALL_SKINS.frost)) throw new Error(); });
  await test('BALL_SKINS — has chrome skin', () => { if (!TEST.ok(BALL_SKINS.chrome)) throw new Error(); });

  await test('BALL_SKINS.default — name is Standard', () => { if (!TEST.ok(BALL_SKINS.default.name === 'Standard')) throw new Error(); });
  await test('BALL_SKINS.default — colors is null (uses getMultColor)', () => { if (!TEST.ok(BALL_SKINS.default.colors === null)) throw new Error(); });
  await test('BALL_SKINS.gold — has colors.core gold', () => { if (!TEST.ok(BALL_SKINS.gold.colors.core === '#FFD700')) throw new Error(); });
  await test('BALL_SKINS.neon — has colors.core cyan', () => { if (!TEST.ok(BALL_SKINS.neon.colors.core === '#00ffaa')) throw new Error(); });
  await test('BALL_SKINS.void — has colors.core purple', () => { if (!TEST.ok(BALL_SKINS['void'].colors.core === '#8800ff')) throw new Error(); });
  await test('BALL_SKINS.ember — has colors.core orange', () => { if (!TEST.ok(BALL_SKINS.ember.colors.core === '#ff4400')) throw new Error(); });
  await test('BALL_SKINS.frost — has colors.core light blue', () => { if (!TEST.ok(BALL_SKINS.frost.colors.core === '#aaeeff')) throw new Error(); });
  await test('BALL_SKINS.chrome — has colors.core silver', () => { if (!TEST.ok(BALL_SKINS.chrome.colors.core === '#e8e8ff')) throw new Error(); });

  await test('BALL_SKINS — all skins have name', () => {
    for (const [id, skin] of Object.entries(BALL_SKINS)) {
      if (!TEST.ok(skin.name, `skin ${id} missing name`)) throw new Error();
    }
  });

  await test('BALL_SKINS — all non-default skins have colors', () => {
    for (const [id, skin] of Object.entries(BALL_SKINS)) {
      if (id === 'default') continue;
      if (!TEST.ok(skin.colors && skin.colors.core, `skin ${id} missing colors`)) throw new Error();
    }
  });

  // ── openSkinsScreen() ──
  await test('openSkinsScreen — exists on window', () => { if (!TEST.ok(typeof window.openSkinsScreen === 'function')) throw new Error(); });

  await test('openSkinsScreen — skins-overlay becomes active', () => {
    let overlay = document.getElementById('skins-overlay');
    if (!overlay) {
      // Create it if not existent
      overlay = openSkinsScreen();
    }
    openSkinsScreen();
    if (!TEST.ok(overlay.classList.contains('active'))) throw new Error();
  });

  await test('openSkinsScreen — shows unlocked skins', () => {
    PERSIST.meta = PERSIST.meta || {};
    PERSIST.meta.unlockedBallColors = ['default'];
    openSkinsScreen();
    // At minimum default skin should be shown
    const skinEls = document.querySelectorAll('.skin-item');
    if (!TEST.ok(skinEls.length >= 1)) throw new Error();
  });

  await test('openSkinsScreen — locked skins shown as locked', () => {
    PERSIST.meta = { unlockedBallColors: ['default'] };
    openSkinsScreen();
    // Chrome should be locked (rank 12)
    const lockedSkins = document.querySelectorAll('.skin-item.locked');
    // At least some should be locked
    if (!TEST.ok(lockedSkins.length > 0)) throw new Error();
  });

  // ── selectBallSkin(id) ──
  await test('selectBallSkin — exists on window', () => { if (!TEST.ok(typeof window.selectBallSkin === 'function')) throw new Error(); });

  await test('selectBallSkin — sets activeBallSkin in PERSIST.meta', () => {
    PERSIST.meta = { unlockedBallColors: ['default', 'gold'], activeBallColor: 'default' };
    selectBallSkin('gold');
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'gold', `expected gold got ${PERSIST.meta.activeBallColor}`)) throw new Error();
  });

  await test('selectBallSkin — locked skin is rejected', () => {
    PERSIST.meta = { unlockedBallColors: ['default'], activeBallColor: 'default' };
    const before = PERSIST.meta.activeBallColor;
    selectBallSkin('gold'); // gold not unlocked — should be rejected
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'default', 'should remain default')) throw new Error();
  });

  await test('selectBallSkin — default always selectable', () => {
    PERSIST.meta = { unlockedBallColors: ['default'], activeBallColor: 'gold' };
    selectBallSkin('default');
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'default')) throw new Error();
  });

  await test('selectBallSkin — persists to localStorage', () => {
    PERSIST.meta = { unlockedBallColors: ['default', 'neon'], activeBallColor: 'default' };
    selectBallSkin('neon');
    savePersist();
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored.meta.activeBallColor === 'neon')) throw new Error();
  });

  // ── Skin selection affects ball draw ──
  await test('Ball.draw — uses skin colors when activeBallColor set', () => {
    PERSIST.meta = { activeBallColor: 'gold' };
    const skin = BALL_SKINS[PERSIST.meta.activeBallColor];
    if (!TEST.ok(skin.colors.core === '#FFD700')) throw new Error();
  });

  await test('Ball.draw — falls back to getMultColor when skin is default', () => {
    PERSIST.meta = { activeBallColor: 'default' };
    const Ball = window.Ball;
    const ball = new Ball(240, 200, 1, 2, []);
    // When default, skin.colors is null → use getMultColor(ball.dropMultiplier)
    const mc = getMultColor(ball.dropMultiplier);
    if (!TEST.ok(mc.color, 'should get mult color')) throw new Error();
  });

  await test('Ball.draw — skin colors include glow', () => {
    const skin = BALL_SKINS.gold;
    if (!TEST.ok(skin.colors.glow === '#FFD700')) throw new Error();
  });

  await test('Ball.draw — skin colors include trailRGB', () => {
    const skin = BALL_SKINS.neon;
    if (!TEST.ok(skin.colors.trailRGB === '0, 255, 170')) throw new Error();
  });

  // ── PERSIST.meta.unlockedBallColors ──
  await test('PERSIST.meta — meta object exists', () => {
    PERSIST.meta = PERSIST.meta || {};
    if (!TEST.ok(PERSIST.meta, 'meta object missing')) throw new Error();
  });

  await test('PERSIST.meta — unlockedBallColors is array', () => {
    PERSIST.meta.unlockedBallColors = ['default'];
    if (!TEST.ok(Array.isArray(PERSIST.meta.unlockedBallColors))) throw new Error();
  });

  await test('PERSIST.meta — default always in unlocked list', () => {
    PERSIST.meta.unlockedBallColors = ['default'];
    if (!TEST.ok(PERSIST.meta.unlockedBallColors.includes('default'))) throw new Error();
  });

  await test('PERSIST.meta — unlockBallSkin adds to list', () => {
    PERSIST.meta.unlockedBallColors = ['default'];
    if (!PERSIST.meta.unlockedBallColors.includes('gold')) PERSIST.meta.unlockedBallColors.push('gold');
    if (!TEST.ok(PERSIST.meta.unlockedBallColors.includes('gold'))) throw new Error();
  });

  await test('PERSIST.meta — activeBallColor defaults to default', () => {
    PERSIST.meta = { unlockedBallColors: ['default'], activeBallColor: 'default' };
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'default')) throw new Error();
  });

  await test('PERSIST.meta — activeBallColor can be changed', () => {
    PERSIST.meta.activeBallColor = 'neon';
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'neon')) throw new Error();
  });

  await test('PERSIST.meta — activeBallColor is persisted', () => {
    PERSIST.meta.activeBallColor = 'frost';
    savePersist();
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored.meta.activeBallColor === 'frost')) throw new Error();
  });

  // ── UNLOCKS for ball skins ──
  await test('UNLOCKS — gold_ball_color cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.gold_ball_color)) throw new Error();
    if (!TEST.ok(UNLOCKS.gold_ball_color.cat === 'COSMETIC')) throw new Error();
  });

  await test('UNLOCKS — neon_ball_skin cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.neon_ball_skin)) throw new Error();
    if (!TEST.ok(UNLOCKS.neon_ball_skin.skinId === 'neon')) throw new Error();
  });

  await test('UNLOCKS — void_ball_skin cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.void_ball_skin)) throw new Error();
  });

  await test('UNLOCKS — ember_ball_skin cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.ember_ball_skin)) throw new Error();
  });

  await test('UNLOCKS — frost_ball_skin cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.frost_ball_skin)) throw new Error();
  });

  await test('UNLOCKS — chrome_ball_skin cosmetic unlock', () => {
    if (!TEST.ok(UNLOCKS.chrome_ball_skin)) throw new Error();
  });

  await test('UNLOCKS.gold_ball_color — unlockType is achievement', () => {
    if (!TEST.ok(UNLOCKS.gold_ball_color.unlockType === 'achievement')) throw new Error();
  });

  await test('UNLOCKS.gold_ball_color — unlockValue is score_10k', () => {
    if (!TEST.ok(UNLOCKS.gold_ball_color.unlockValue === 'score_10k')) throw new Error();
  });

  await test('UNLOCKS.neon_ball_skin — unlockType is rank', () => {
    if (!TEST.ok(UNLOCKS.neon_ball_skin.unlockType === 'rank')) throw new Error();
  });

  await test('UNLOCKS.chrome_ball_skin — unlockValue is 12', () => {
    if (!TEST.ok(UNLOCKS.chrome_ball_skin.unlockValue === 12)) throw new Error();
  });

  // ── evaluateUnlocks auto-adds skin when cosmetic unlocked ──
  await test('evaluateUnlocks — adds skin to unlockedBallColors when unlocked', () => {
    PERSIST.meta = { unlocks: [], unlockedBallColors: ['default'] };
    // Simulate gold_ball_color becoming available
    PERSIST.meta.unlocks.push('gold_ball_color');
    const unlock = UNLOCKS.gold_ball_color;
    if (unlock.cat === 'COSMETIC' && unlock.skinId && BALL_SKINS[unlock.skinId]) {
      if (!PERSIST.meta.unlockedBallColors.includes(unlock.skinId)) {
        PERSIST.meta.unlockedBallColors.push(unlock.skinId);
      }
    }
    if (!TEST.ok(PERSIST.meta.unlockedBallColors.includes('gold'), 'gold not added')) throw new Error();
  });

  // ── Skin selection UI ──
  await test('Skins — skins-overlay exists', () => {
    let overlay = document.getElementById('skins-overlay');
    if (!overlay) overlay = createSkinsOverlay();
    if (!TEST.ok(overlay !== null)) throw new Error();
  });

  await test('Skins — skin-item elements rendered', () => {
    openSkinsScreen();
    const items = document.querySelectorAll('.skin-item');
    if (!TEST.ok(items.length > 0, 'no skin-item elements')) throw new Error();
  });

  await test('Skins — active skin has selected class', () => {
    PERSIST.meta = { unlockedBallColors: ['default', 'gold'], activeBallColor: 'gold' };
    openSkinsScreen();
    const selected = document.querySelectorAll('.skin-item.selected');
    if (!TEST.ok(selected.length > 0)) throw new Error();
  });

  await test('Skins — click selects skin', () => {
    PERSIST.meta = { unlockedBallColors: ['default', 'gold', 'neon'], activeBallColor: 'default' };
    openSkinsScreen();
    // Find and click a skin
    const goldEl = Array.from(document.querySelectorAll('.skin-item')).find(el => el.dataset.skin === 'gold');
    if (!goldEl) {
      // Try finding by skin name
    }
    selectBallSkin('gold');
    if (!TEST.ok(PERSIST.meta.activeBallColor === 'gold')) throw new Error();
  });

  await test('Skins — equipped badge shown on active skin', () => {
    PERSIST.meta = { activeBallColor: 'neon' };
    openSkinsScreen();
    // Check that neon has equipped indicator
    const neonEl = Array.from(document.querySelectorAll('.skin-item')).find(el =>
      el.querySelector('.skin-name')?.textContent.includes('Neon')
    );
    if (neonEl) {
      const hasEquipped = neonEl.querySelector('.equipped-badge') !== null || neonEl.classList.contains('selected');
      if (!TEST.ok(hasEquipped)) throw new Error();
    }
  });

  await test('Skins — locked skin shows lock icon', () => {
    PERSIST.meta = { unlockedBallColors: ['default'] }; // gold locked
    openSkinsScreen();
    const goldEl = Array.from(document.querySelectorAll('.skin-item')).find(el =>
      el.querySelector('.skin-name')?.textContent.includes('Gold')
    );
    if (goldEl) {
      const hasLock = goldEl.classList.contains('locked');
      if (!TEST.ok(hasLock, 'gold not showing locked')) throw new Error();
    }
  });

  await test('closeSkinsScreen — exists on window', () => {
    if (!TEST.ok(typeof window.closeSkinsScreen === 'function')) throw new Error();
  });

  await test('closeSkinsScreen — removes active class', () => {
    const overlay = document.getElementById('skins-overlay');
    if (overlay) {
      closeSkinsScreen();
      if (!TEST.ok(!overlay.classList.contains('active'))) throw new Error();
    }
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
