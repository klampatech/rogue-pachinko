// i01_prestige.test.js — Prestige system: checkPrestigeEligibility, executePrestige, carry-forward
// TEST helpers: getGS()/getPersist() | seed(n)/gotoFloor(n)/startRun()/endRun
//   | setBalls(n)/setScore(n)/setCombo(n)/addCredits(n)
//   | click(sel)/type(sel,txt) | playSound(id)/stopBgm()
//   | wait(ms)/is(a,b,msg)/ok(val,msg)/gt(a,b,msg)/lt(a,b,msg)/throws(fn,msg)/equal(a,b,msg)

export async function runTests(TEST) {
  const results = { passed: 0, failed: 0, skipped: 0, errors: [] };

  function test(name, fn) {
    try {
      fn(TEST);
      results.passed++;
    } catch(e) {
      results.failed++;
      results.errors.push(name + ': ' + e.message);
    }
  }

  // Ensure PERSIST is set up
  TEST.startRun();
  PERSIST.meta = PERSIST.meta || { prestigeLevel: 0, prestigeBonus: 0, unlocks: [] };

  // ── checkPrestigeEligibility() — 80% unlocks ────────────────────
  test('checkPrestigeEligibility() returns false when unlock ratio < 80%', () => {
    // Set up 50% unlocks
    PERSIST.meta.unlocks = [];
    const totalUnlocks = Object.keys(UNLOCKS).length;
    const halfUnlocks = Math.floor(totalUnlocks / 2);
    for (let i = 0; i < halfUnlocks; i++) {
      const keys = Object.keys(UNLOCKS);
      if (keys[i]) PERSIST.meta.unlocks.push(keys[i]);
    }
    const eligible = checkPrestigeEligibility();
    TEST.ok(eligible === false, '50% unlocks should not be eligible for prestige');
  });

  test('checkPrestigeEligibility() returns true when unlock ratio >= 80%', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    const threshold = Math.ceil(totalUnlocks * 0.80);
    PERSIST.meta.unlocks = [];
    const keys = Object.keys(UNLOCKS);
    for (let i = 0; i < threshold; i++) {
      if (keys[i]) PERSIST.meta.unlocks.push(keys[i]);
    }
    const eligible = checkPrestigeEligibility();
    TEST.ok(eligible === true, '>=80% unlocks should be eligible for prestige');
  });

  test('checkPrestigeEligibility() returns false with 0 unlocks', () => {
    PERSIST.meta.unlocks = [];
    const eligible = checkPrestigeEligibility();
    TEST.ok(eligible === false, '0 unlocks should not be eligible');
  });

  test('checkPrestigeEligibility() returns true with exactly 80% unlocks', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    const exactly80 = Math.floor(totalUnlocks * 0.80);
    PERSIST.meta.unlocks = [];
    const keys = Object.keys(UNLOCKS);
    for (let i = 0; i < exactly80; i++) {
      if (keys[i]) PERSIST.meta.unlocks.push(keys[i]);
    }
    const eligible = checkPrestigeEligibility();
    TEST.ok(eligible === true, 'exactly 80% unlocks should be eligible');
  });

  test('checkPrestigeEligibility() uses META_CONFIG.prestige_unlock_threshold (0.80)', () => {
    TEST.is(META_CONFIG.prestige_unlock_threshold, 0.80, 'prestige threshold should be 0.80');
  });

  // ── executePrestige() — reset + bonus ───────────────────────────
  test('executePrestige() returns false when not eligible', () => {
    PERSIST.meta.unlocks = ['some_unlock']; // only 1 unlock
    PERSIST.meta.prestigeLevel = 0;
    const result = executePrestige();
    TEST.ok(result === false, 'executePrestige should return false when ineligible');
  });

  test('executePrestige() increments prestigeLevel when eligible', () => {
    // Set up 80%+ unlocks
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    const result = executePrestige();
    TEST.ok(result === true, 'executePrestige should return true when eligible');
    TEST.is(PERSIST.meta.prestigeLevel, 1, 'prestigeLevel should increment to 1');
  });

  test('executePrestige() increases prestigeBonus by 0.05 (META_CONFIG.prestige_payout_bonus)', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.meta.prestigeBonus = 0;
    executePrestige();
    TEST.is(PERSIST.meta.prestigeBonus, 0.05, 'prestigeBonus should be 0.05 after first prestige');
  });

  test('executePrestige() caps prestigeBonus at 0.15 (max 3 stacks of 0.05)', () => {
    // Set up 80%+ unlocks, existing bonus already at 0.15
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 3;
    PERSIST.meta.prestigeBonus = 0.15;
    executePrestige();
    TEST.is(PERSIST.meta.prestigeBonus, 0.15, 'prestigeBonus should cap at 0.15');
  });

  test('executePrestige() resets reputation to 0', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.reputation = 10000;
    executePrestige();
    TEST.is(PERSIST.reputation, 0, 'reputation should reset to 0 after prestige');
  });

  // ── Carry-forward: rep / leaderboard / mastery ─────────────────
  test('executePrestige() preserves PERSIST.leaderboard (not reset)', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.leaderboard = [{ score: 5000, name: 'TESTPLAYER' }];
    executePrestige();
    TEST.is(PERSIST.leaderboard.length, 1, 'leaderboard should be preserved after prestige');
    TEST.is(PERSIST.leaderboard[0].score, 5000, 'leaderboard entry score preserved');
  });

  test('executePrestige() preserves PERSIST.bestFloor (not reset)', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.bestFloor = 7;
    executePrestige();
    TEST.is(PERSIST.bestFloor, 7, 'bestFloor should be preserved after prestige');
  });

  test('executePrestige() preserves totalRuns (not reset)', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    PERSIST.totalRuns = 25;
    executePrestige();
    TEST.is(PERSIST.totalRuns, 25, 'totalRuns should be preserved after prestige');
  });

  test('executePrestige() preserves COSMETIC category unlocks', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    // Add some cosmetic unlocks
    PERSIST.meta.unlocks = PERSIST.meta.unlocks.filter(id => {
      const u = UNLOCKS[id];
      return u && (u.cat === 'COSMETIC' || u.cat === 'TITLE');
    });
    const cosmeticsBefore = PERSIST.meta.unlocks.length;
    executePrestige();
    TEST.is(PERSIST.meta.unlocks.length, cosmeticsBefore, 'cosmetic unlocks should be preserved');
  });

  test('executePrestige() removes GAMEPLAY unlocks (keeps cosmetics only)', () => {
    const totalUnlocks = Object.keys(UNLOCKS).length;
    // Full unlocks including gameplay items
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;
    executePrestige();
    // After prestige, only COSMETIC and TITLE unlocks should remain
    const remaining = PERSIST.meta.unlocks;
    const nonCosmetic = remaining.filter(id => {
      const u = UNLOCKS[id];
      return u && u.cat !== 'COSMETIC' && u.cat !== 'TITLE';
    });
    TEST.is(nonCosmetic.length, 0, 'non-cosmetic unlocks should be removed on prestige');
  });

  // ── Multiple prestige stacks ─────────────────────────────────────
  test('executePrestige() can be called multiple times across sessions (3 stack max)', () => {
    PERSIST.meta.prestigeBonus = 0;
    const totalUnlocks = Object.keys(UNLOCKS).length;
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice(0, Math.ceil(totalUnlocks * 0.80));
    PERSIST.meta.prestigeLevel = 0;

    // First prestige
    executePrestige();
    TEST.is(PERSIST.meta.prestigeLevel, 1, 'first prestige: level=1, bonus=0.05');
    TEST.is(PERSIST.meta.prestigeBonus, 0.05, 'first prestige bonus=0.05');

    // Second prestige
    executePrestige();
    TEST.is(PERSIST.meta.prestigeLevel, 2, 'second prestige: level=2, bonus=0.10');
    TEST.is(PERSIST.meta.prestigeBonus, 0.10, 'second prestige bonus=0.10');

    // Third prestige
    executePrestige();
    TEST.is(PERSIST.meta.prestigeLevel, 3, 'third prestige: level=3, bonus=0.15');
    TEST.is(PERSIST.meta.prestigeBonus, 0.15, 'third prestige bonus=0.15');
  });

  return results;
}
