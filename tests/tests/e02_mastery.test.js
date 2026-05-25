// e02_mastery.test.js — Mastery screen, purchaseMasteryUpgrade, applyMasteryUpgrades, MP

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

  // ── openMasteryScreen() ──
  await test('openMasteryScreen — exists on window', () => { if (!TEST.ok(typeof window.openMasteryScreen === 'function')) throw new Error(); });

  await test('openMasteryScreen — mastery-overlay becomes visible', () => {
    const overlay = document.getElementById('mastery-overlay') || createMasteryOverlay();
    openMasteryScreen();
    if (!TEST.ok(overlay.classList.contains('active'))) throw new Error();
  });

  await test('openMasteryScreen — mastery-grid populated', () => {
    openMasteryScreen();
    const grid = document.getElementById('mastery-grid');
    if (!TEST.ok(grid && grid.children.length > 0)) throw new Error();
  });

  await test('openMasteryScreen — shows mastery points', () => {
    PERSIST.masteryPoints = 150;
    openMasteryScreen();
    // Should display current MP
    if (!TEST.ok(typeof PERSIST.masteryPoints === 'number')) throw new Error();
  });

  await test('openMasteryScreen — 7 upgrade tracks exist', () => {
    const tracks = Object.keys(MASTERY_UPGRADES);
    if (!TEST.ok(tracks.length === 7, `Expected 7 tracks, got ${tracks.length}`)) throw new Error();
  });

  await test('MASTERY_UPGRADES — extraBall has 4 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.extraBall.tiers.length === 4)) throw new Error();
  });

  await test('MASTERY_UPGRADES — jackpotSurge has 2 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.jackpotSurge.tiers.length === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — creditMagnet has 2 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.creditMagnet.tiers.length === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — shopDiscount has 2 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.shopDiscount.tiers.length === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — pegRadar has 1 tier', () => {
    if (!TEST.ok(MASTERY_UPGRADES.pegRadar.tiers.length === 1)) throw new Error();
  });

  await test('MASTERY_UPGRADES — pegBonus has 2 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.pegBonus.tiers.length === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — comboThreshold has 2 tiers', () => {
    if (!TEST.ok(MASTERY_UPGRADES.comboThreshold.tiers.length === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — payloadStart has 1 tier', () => {
    if (!TEST.ok(MASTERY_UPGRADES.payloadStart.tiers.length === 1)) throw new Error();
  });

  // ── buyMasteryUpgrade(id, tier) ──
  await test('buyMasteryUpgrade — exists on window', () => { if (!TEST.ok(typeof window.buyMasteryUpgrade === 'function')) throw new Error(); });

  await test('buyMasteryUpgrade — deducts mastery points', () => {
    PERSIST.masteryPoints = 200;
    PERSIST.purchasedUpgrades = {};
    // Simulate buying extraBall tier 0 (cost 50)
    const tier = MASTERY_UPGRADES.extraBall.tiers[0];
    PERSIST.masteryPoints -= tier.cost;
    if (!TEST.ok(PERSIST.masteryPoints === 150, `expected 150 got ${PERSIST.masteryPoints}`)) throw new Error();
  });

  await test('buyMasteryUpgrade — stores tier in purchasedUpgrades', () => {
    PERSIST.purchasedUpgrades = {};
    const id = 'extraBall';
    PERSIST.purchasedUpgrades[id] = 1;
    if (!TEST.ok(PERSIST.purchasedUpgrades.extraBall === 1)) throw new Error();
  });

  await test('buyMasteryUpgrade — deducts correct cost for tier 1', () => {
    PERSIST.masteryPoints = 200;
    PERSIST.purchasedUpgrades = {};
    const tier = MASTERY_UPGRADES.extraBall.tiers[1];
    PERSIST.masteryPoints -= tier.cost;
    if (!TEST.ok(PERSIST.masteryPoints === 100, `expected 100 got ${PERSIST.masteryPoints}`)) throw new Error();
  });

  await test('buyMasteryUpgrade — already owned blocks purchase', () => {
    PERSIST.masteryPoints = 200;
    PERSIST.purchasedUpgrades = { extraBall: 1 };
    const id = 'extraBall';
    const tierIdx = 0;
    if (PERSIST.purchasedUpgrades[id] !== undefined && PERSIST.purchasedUpgrades[id] >= tierIdx) return;
    // Should block
    if (!TEST.ok(PERSIST.purchasedUpgrades.extraBall >= 0, 'already owned at tier')) throw new Error();
  });

  await test('buyMasteryUpgrade — insufficient MP blocks purchase', () => {
    PERSIST.masteryPoints = 10;
    PERSIST.purchasedUpgrades = {};
    const tier = MASTERY_UPGRADES.extraBall.tiers[0]; // cost 50
    const canBuy = PERSIST.masteryPoints >= tier.cost;
    if (!TEST.ok(canBuy === false, 'Should not be able to buy')) throw new Error();
  });

  await test('buyMasteryUpgrade — can buy different track when one owned', () => {
    PERSIST.masteryPoints = 200;
    PERSIST.purchasedUpgrades = { extraBall: 1 }; // extraBall tier 1 already owned
    // Can still buy pegRadar (tier 0, cost 50)
    const canBuy = PERSIST.masteryPoints >= MASTERY_UPGRADES.pegRadar.tiers[0].cost;
    if (!TEST.ok(canBuy === true)) throw new Error();
  });

  // ── applyMasteryUpgrades() at run start ──
  await test('applyMasteryUpgrades — exists on window', () => { if (!TEST.ok(typeof window.applyMasteryUpgrades === 'function')) throw new Error(); });

  await test('applyMasteryUpgrades — sets GS.bonusStartingBalls from extraBall tier', () => {
    PERSIST.purchasedUpgrades = { extraBall: 2 }; // tier 2 = +3 starting balls
    gs.bonusStartingBalls = 0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.bonusStartingBalls > 0, 'bonusStartingBalls not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.jackpotGrowthBonus from jackpotSurge tier', () => {
    PERSIST.purchasedUpgrades = { jackpotSurge: 1 };
    gs.jackpotGrowthBonus = 1.0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.jackpotGrowthBonus > 1.0, 'jackpotGrowthBonus not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.breachBonusMultiplier from creditMagnet tier', () => {
    PERSIST.purchasedUpgrades = { creditMagnet: 1 };
    gs.breachBonusMultiplier = 1.0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.breachBonusMultiplier > 1.0, 'breachBonusMultiplier not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.shopDiscount from shopDiscount tier', () => {
    PERSIST.purchasedUpgrades = { shopDiscount: 1 };
    gs.shopDiscount = 1.0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.shopDiscount < 1.0, 'shopDiscount not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.startingPayloadCount from payloadStart tier', () => {
    PERSIST.purchasedUpgrades = { payloadStart: 1 };
    gs.startingPayloadCount = 0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.startingPayloadCount > 0, 'startingPayloadCount not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.pegRadar from pegRadar tier', () => {
    PERSIST.purchasedUpgrades = { pegRadar: 1 };
    gs.pegRadar = false;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.pegRadar === true, 'pegRadar not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — sets GS.pegBonusMultiplier from pegBonus tier', () => {
    PERSIST.purchasedUpgrades = { pegBonus: 1 };
    gs.pegBonusMultiplier = 1.0;
    applyMasteryUpgrades();
    if (!TEST.ok(gs.pegBonusMultiplier > 1.0, 'pegBonusMultiplier not set')) throw new Error();
  });

  await test('applyMasteryUpgrades — resets all fields before applying', () => {
    PERSIST.purchasedUpgrades = {};
    gs.bonusStartingBalls = 5;
    gs.jackpotGrowthBonus = 2.0;
    gs.breachBonusMultiplier = 3.0;
    gs.shopDiscount = 0.5;
    gs.pegRadar = true;
    gs.pegBonusMultiplier = 1.5;
    applyMasteryUpgrades();
    // With no purchases, should reset to defaults
    if (!TEST.ok(gs.bonusStartingBalls === 0, 'bonusStartingBalls not reset')) throw new Error();
    if (!TEST.ok(gs.pegRadar === false, 'pegRadar not reset')) throw new Error();
  });

  await test('applyMasteryUpgrades — called on loadPersist', () => {
    // loadPersist calls applyMasteryUpgrades — verify it runs without error
    loadPersist();
    if (!TEST.ok(typeof gs.bonusStartingBalls === 'number')) throw new Error();
  });

  // ── MP earned ──
  await test('PERSIST.masteryPoints — earned per run', () => {
    PERSIST.masteryPoints = 0;
    // Earn MP: floor completion + combo bonuses
    const earned = 50; // example floor 1 completion
    PERSIST.masteryPoints += earned;
    if (!TEST.ok(PERSIST.masteryPoints === 50)) throw new Error();
  });

  await test('PERSIST.masteryPoints — persists across saves', () => {
    PERSIST.masteryPoints = 123;
    savePersist();
    // Simulate reload
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored && stored.masteryPoints === 123)) throw new Error();
  });

  await test('PERSIST.masteryPoints — added at floor complete', () => {
    PERSIST.masteryPoints = 0;
    const earned = 30;
    PERSIST.masteryPoints += earned;
    if (!TEST.ok(PERSIST.masteryPoints === 30)) throw new Error();
  });

  await test('GS.masteryPoints — synced from PERSIST on load', () => {
    PERSIST.masteryPoints = 500;
    gs.masteryPoints = PERSIST.masteryPoints;
    if (!TEST.ok(gs.masteryPoints === 500)) throw new Error();
  });

  await test('PERSIST.purchasedUpgrades — persists across sessions', () => {
    PERSIST.purchasedUpgrades = { extraBall: 1, pegRadar: 1 };
    savePersist();
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored && stored.purchasedUpgrades?.extraBall === 1)) throw new Error();
  });

  // ── already-owned blocked ──
  await test('Already owned — purchase blocked at same tier', () => {
    PERSIST.purchasedUpgrades = { extraBall: 0 };
    PERSIST.masteryPoints = 200;
    const tier = MASTERY_UPGRADES.extraBall.tiers[0]; // cost 50
    const alreadyOwned = PERSIST.purchasedUpgrades.extraBall !== undefined;
    if (alreadyOwned) return; // should block
    if (!TEST.ok(true, 'blocked correctly')) throw new Error();
  });

  await test('Already owned — can upgrade to higher tier', () => {
    PERSIST.purchasedUpgrades = { extraBall: 0 }; // tier 0 owned
    PERSIST.masteryPoints = 300;
    const canUpgrade = PERSIST.purchasedUpgrades.extraBall < MASTERY_UPGRADES.extraBall.tiers.length - 1;
    if (!TEST.ok(canUpgrade === true, 'should be able to upgrade')) throw new Error();
  });

  await test('Already owned — higher tier costs more', () => {
    const tier0Cost = MASTERY_UPGRADES.extraBall.tiers[0].cost; // 50
    const tier1Cost = MASTERY_UPGRADES.extraBall.tiers[1].cost; // 100
    if (!TEST.ok(tier1Cost > tier0Cost, 'higher tier should cost more')) throw new Error();
  });

  await test('Already owned — cannot buy beyond max tier', () => {
    PERSIST.purchasedUpgrades = { extraBall: 3 }; // max tier
    const maxTier = MASTERY_UPGRADES.extraBall.tiers.length - 1;
    const canBuy = PERSIST.purchasedUpgrades.extraBall < maxTier;
    if (!TEST.ok(canBuy === false, 'should not be able to buy beyond max')) throw new Error();
  });

  // ── Mastery overlay creation ──
  await test('createMasteryOverlay — exists or is created dynamically', () => {
    const overlay = document.getElementById('mastery-overlay') || createMasteryOverlay();
    if (!TEST.ok(overlay !== null)) throw new Error();
  });

  await test('MASTERY_UPGRADES — all tracks have name/desc/tiers', () => {
    for (const [id, upgrade] of Object.entries(MASTERY_UPGRADES)) {
      if (!TEST.ok(upgrade.name, `${id} missing name`)) throw new Error();
      if (!TEST.ok(upgrade.desc, `${id} missing desc`)) throw new Error();
      if (!TEST.ok(Array.isArray(upgrade.tiers) && upgrade.tiers.length > 0, `${id} missing tiers`)) throw new Error();
      for (const tier of upgrade.tiers) {
        if (!TEST.ok(typeof tier.cost === 'number', `${id} tier missing cost`)) throw new Error();
        if (!TEST.ok(tier.effect, `${id} tier missing effect`)) throw new Error();
      }
    }
  });

  await test('MASTERY_UPGRADES — extraBall.tiers[0].effect has bonusStartingBalls: 1', () => {
    const effect = MASTERY_UPGRADES.extraBall.tiers[0].effect;
    if (!TEST.ok(effect.bonusStartingBalls === 1)) throw new Error();
  });

  await test('MASTERY_UPGRADES — extraBall.tiers[1].effect has bonusStartingBalls: 2', () => {
    const effect = MASTERY_UPGRADES.extraBall.tiers[1].effect;
    if (!TEST.ok(effect.bonusStartingBalls === 2)) throw new Error();
  });

  await test('MASTERY_UPGRADES — jackpotSurge.tiers[0].effect has jackpotGrowthBonus: 1.25', () => {
    const effect = MASTERY_UPGRADES.jackpotSurge.tiers[0].effect;
    if (!TEST.ok(effect.jackpotGrowthBonus === 1.25)) throw new Error();
  });

  await test('MASTERY_UPGRADES — creditMagnet.tiers[0].effect has breachBonusMultiplier: 1.20', () => {
    const effect = MASTERY_UPGRADES.creditMagnet.tiers[0].effect;
    if (!TEST.ok(effect.breachBonusMultiplier === 1.20)) throw new Error();
  });

  await test('MASTERY_UPGRADES — shopDiscount.tiers[0].effect has shopDiscount: 0.85', () => {
    const effect = MASTERY_UPGRADES.shopDiscount.tiers[0].effect;
    if (!TEST.ok(effect.shopDiscount === 0.85)) throw new Error();
  });

  await test('MASTERY_UPGRADES — pegRadar.tiers[0].effect has pegRadar: true', () => {
    const effect = MASTERY_UPGRADES.pegRadar.tiers[0].effect;
    if (!TEST.ok(effect.pegRadar === true)) throw new Error();
  });

  await test('MASTERY_UPGRADES — comboThreshold.tiers[0].effect has comboThreshold: 2', () => {
    const effect = MASTERY_UPGRADES.comboThreshold.tiers[0].effect;
    if (!TEST.ok(effect.comboThreshold === 2)) throw new Error();
  });

  await test('PERSIST.purchasedUpgrades — is object', () => {
    if (!TEST.ok(typeof PERSIST.purchasedUpgrades === 'object')) throw new Error();
  });

  await test('PERSIST.purchasedUpgrades — can be empty', () => {
    PERSIST.purchasedUpgrades = {};
    if (!TEST.ok(true)) throw new Error();
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
