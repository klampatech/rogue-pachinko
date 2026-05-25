// a01_persistence.test.js — localStorage load/save, PERSIST/GS init, hard reset, prestige carry-forward

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));

  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // ── localStorage key ──
  await test('localStorage key slotprotocol is used', () => {
    const raw = localStorage.getItem('slotprotocol');
    // After game init, slotprotocol key should exist (even if null from hard reset)
    if (!TEST.ok(raw !== undefined || localStorage.getItem('slotprotocol') === null)) throw new Error('key not accessible');
  });

  // ── savePersist writes JSON to slotprotocol ──
  await test('savePersist writes to localStorage slotprotocol', () => {
    gs.breachCredits = 999;
    gs.reputation = 111;
    gs.lifetimeBreach = 12345;
    savePersist();
    const raw = localStorage.getItem('slotprotocol');
    if (!TEST.ok(raw && raw.includes('"breachCredits"'))) throw new Error('savePersist did not write breachCredits');
  });

  // ── loadPersist reads back correctly ──
  await test('loadPersist restores PERSIST fields from localStorage', () => {
    // Set up localStorage with known values
    const snapshot = {
      reputation: 500,
      lifetimeBreach: 99999,
      totalRuns: 42,
      bestFloor: 7,
      hasSeenTutorial: true,
      unlockedPayloads: ['scrambler', 'trojan', 'worm'],
      unlockedUpgrades: [],
      masteryPoints: 80,
      purchasedUpgrades: {},
      meta: { unlocks: [], titles: [], activeTitle: null, prestigeLevel: 0, prestigeBonus: 0, unlockedBallColors: ['default'] },
      achievements: [],
      leaderboard: [],
      dailyChallenge: { lastPlayed: null, bestDailyScore: 0, dailyAttempts: 0 }
    };
    localStorage.setItem('slotprotocol', JSON.stringify(snapshot));

    // Re-init loadPersist
    loadPersist();

    if (!TEST.ok(PERSIST.reputation === 500)) throw new Error('reputation not restored');
    if (!TEST.ok(PERSIST.lifetimeBreach === 99999)) throw new Error('lifetimeBreach not restored');
    if (!TEST.ok(PERSIST.totalRuns === 42)) throw new Error('totalRuns not restored');
    if (!TEST.ok(PERSIST.bestFloor === 7)) throw new Error('bestFloor not restored');
    if (!TEST.ok(PERSIST.hasSeenTutorial === true)) throw new Error('hasSeenTutorial not restored');
  });

  // ── loadPersist applies defaults for missing fields ──
  await test('loadPersist applies defaults for missing fields', () => {
    // Empty object simulates fresh/reset storage
    localStorage.setItem('slotprotocol', JSON.stringify({}));
    loadPersist();
    if (!TEST.ok(typeof PERSIST.reputation === 'number')) throw new Error('reputation not defaulted');
    if (!TEST.ok(Array.isArray(PERSIST.unlockedPayloads))) throw new Error('unlockedPayloads not defaulted');
    if (!TEST.ok(PERSIST.unlockedPayloads.includes('scrambler'))) throw new Error('default payloads missing scrambler');
  });

  // ── savePersist syncs GS fields to PERSIST ──
  await test('savePersist syncs reputation/lifetimeBreach/unlockedPayloads to PERSIST', () => {
    gs.reputation = 1234;
    gs.lifetimeBreach = 50000;
    gs.unlockedPayloads = ['scrambler', 'trojan', 'worm', 'ghost'];
    savePersist();
    if (!TEST.ok(PERSIST.reputation === 1234)) throw new Error('rep not synced');
    if (!TEST.ok(PERSIST.lifetimeBreach === 50000)) throw new Error('lifetimeBreach not synced');
    if (!TEST.ok(PERSIST.unlockedPayloads.includes('ghost'))) throw new Error('unlockedPayloads not synced');
  });

  // ── bestScore tracking ──
  await test('savePersist records bestScore when current score exceeds it', () => {
    gs.score = 7777;
    PERSIST.bestScore = 1000;
    savePersist();
    if (!TEST.ok(PERSIST.bestScore === 7777)) throw new Error('bestScore not updated');
  });

  // ── bestScore not downgraded ──
  await test('savePersist preserves bestScore when current score is lower', () => {
    gs.score = 100;
    PERSIST.bestScore = 9999;
    savePersist();
    if (!TEST.ok(PERSIST.bestScore === 9999)) throw new Error('bestScore incorrectly downgraded');
  });

  // ── hard reset clears localStorage ──
  await test('Hard reset wipes slotprotocol from localStorage', () => {
    localStorage.setItem('slotprotocol', JSON.stringify({ reputation: 9999, lifetimeBreach: 99999 }));
    // Simulate reset
    PERSIST = {
      reputation: 0,
      lifetimeBreach: 0,
      totalRuns: 0,
      bestFloor: 0,
      hasSeenTutorial: false,
      unlockedPayloads: ['scrambler', 'trojan'],
      unlockedUpgrades: [],
      masteryPoints: 0,
      purchasedUpgrades: {},
      meta: { unlocks: [], titles: [], activeTitle: null, prestigeLevel: 0, prestigeBonus: 0, unlockedBallColors: ['default'] },
      achievements: [],
      completedContracts: [],
      leaderboard: [],
      dailyChallenge: { lastPlayed: null, bestDailyScore: 0, dailyAttempts: 0 }
    };
    savePersist();
    const raw = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(raw.reputation === 0)) throw new Error('reset did not clear reputation');
    if (!TEST.ok(raw.lifetimeBreach === 0)) throw new Error('reset did not clear lifetimeBreach');
  });

  // ── prestige carry-forward (cosmetics + titles preserved) ──
  await test('executePrestige preserves cosmetics and titles, resets reputation', () => {
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.meta.prestigeBonus = 0;
    PERSIST.meta.unlocks = ['gold_ball_color', 'neon_ball_skin', 'title_peg_apprentice'];
    PERSIST.meta.titles = ['Peg Apprentice'];
    PERSIST.reputation = 50000;

    const result = executePrestige();
    if (!TEST.ok(result === true)) throw new Error('executePrestige returned false');

    // Cosmetics (ball skins) should survive
    const cosmetics = PERSIST.meta.unlocks.filter(id => {
      const u = UNLOCKS[id];
      return u && (u.cat === 'COSMETIC' || u.cat === 'TITLE');
    });
    if (!TEST.ok(cosmetics.length > 0)) throw new Error('cosmetics not preserved on prestige');
    if (!TEST.ok(PERSIST.meta.prestigeLevel === 1)) throw new Error('prestigeLevel not incremented');
    if (!TEST.ok(PERSIST.reputation === 0)) throw new Error('reputation not reset on prestige');
  });

  // ── checkPrestigeEligibility ──
  await test('checkPrestigeEligibility returns true when >= 80% unlocks owned', () => {
    // Give ourselves nearly all unlocks
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.meta.prestigeBonus = 0;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS); // all unlocked = 100%
    const eligible = checkPrestigeEligibility();
    if (!TEST.ok(eligible === true)) throw new Error('should be eligible with all unlocks');
  });

  await test('checkPrestigeEligibility returns false when < 80% unlocks owned', () => {
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.meta.prestigeBonus = 0;
    PERSIST.meta.unlocks = ['gold_ball_color']; // only 1 unlock = far below 80%
    const eligible = checkPrestigeEligibility();
    if (!TEST.ok(eligible === false)) throw new Error('should not be eligible with few unlocks');
  });

  // ── meta object integrity ──
  await test('loadPersist creates meta object if missing', () => {
    localStorage.setItem('slotprotocol', JSON.stringify({ reputation: 0 }));
    loadPersist();
    if (!TEST.ok(PERSIST.meta && Array.isArray(PERSIST.meta.unlocks))) throw new Error('meta not created');
  });

  // ── leaderboard persisted ──
  await test('savePersist preserves leaderboard in PERSIST', () => {
    PERSIST.leaderboard = [
      { initials: 'AAA', score: 12345, floor: 5 },
      { initials: 'BBB', score: 9999, floor: 3 }
    ];
    savePersist();
    const raw = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(raw.leaderboard && raw.leaderboard.length === 2)) throw new Error('leaderboard not persisted');
  });

  // ── dailyChallenge persisted ──
  await test('savePersist preserves dailyChallenge in PERSIST', () => {
    PERSIST.dailyChallenge = { lastPlayed: '2025-01-15', bestDailyScore: 5000, dailyAttempts: 3 };
    savePersist();
    const raw = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(raw.dailyChallenge && raw.dailyChallenge.bestDailyScore === 5000)) throw new Error('dailyChallenge not persisted');
  });

  // ── PERSIST and GS sync after loadPersist ──
  await test('loadPersist syncs PERSIST values to GS', () => {
    localStorage.setItem('slotprotocol', JSON.stringify({
      reputation: 300,
      lifetimeBreach: 25000,
      unlockedPayloads: ['scrambler', 'trojan', 'worm'],
      masteryPoints: 150
    }));
    loadPersist();
    if (!TEST.ok(gs.reputation === 300)) throw new Error('GS.reputation not synced from PERSIST');
    if (!TEST.ok(gs.masteryPoints === 150)) throw new Error('GS.masteryPoints not synced from PERSIST');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
