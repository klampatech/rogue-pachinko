// i02_meta_progression.test.js — Meta progression: RANKS, getPlayerRank, getRankProgress, evaluateUnlocks, UNLOCKS
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
  PERSIST.reputation = 0;
  PERSIST.lifetimeBreach = 0;

  // ── RANKS array ──────────────────────────────────────────────────
  test('RANKS is an array with at least 5 rank entries', () => {
    TEST.gt(RANKS.length, 4, 'RANKS should have at least 5 entries');
  });

  test('RANKS[0] is "Script Kiddie" (starting rank)', () => {
    TEST.is(RANKS[0].name, 'Script Kiddie', 'RANKS[0] should be Script Kiddie');
  });

  test('RANKS entries have repThresh values in ascending order', () => {
    for (let i = 1; i < RANKS.length; i++) {
      TEST.gt(RANKS[i].repThresh, RANKS[i-1].repThresh,
        `RANKS[${i}] repThresh should be greater than RANKS[${i-1}]`);
    }
  });

  test('RANKS last entry has a known name (Legend or similar)', () => {
    const lastRank = RANKS[RANKS.length - 1];
    TEST.ok(lastRank.name !== undefined, 'last rank should have a name');
    TEST.gt(lastRank.repThresh, RANKS[RANKS.length - 2].repThresh, 'last rank threshold should be highest');
  });

  // ── getPlayerRank(rep) ─────────────────────────────────────────
  test('getPlayerRank(0) returns "Script Kiddie"', () => {
    TEST.is(getPlayerRank(0), 'Script Kiddie', 'rep=0 should be Script Kiddie');
  });

  test('getPlayerRank(10000) returns "Ghost" or higher', () => {
    const rank = getPlayerRank(10000);
    TEST.ok(rank === 'Ghost' || rank === 'Phantom' || rank === 'Legend',
      `rep=10000 should be Ghost or higher, got: ${rank}`);
  });

  test('getPlayerRank(60000+) returns highest rank', () => {
    const rank = getPlayerRank(60000);
    const highestRank = RANKS[RANKS.length - 1].name;
    TEST.is(rank, highestRank, `rep=60000+ should be highest rank: ${highestRank}`);
  });

  test('getPlayerRank(500) returns "Script Kiddie+"', () => {
    TEST.is(getPlayerRank(500), 'Script Kiddie+', 'rep=500 should be Script Kiddie+');
  });

  test('getPlayerRank(1500) returns "Netrunner"', () => {
    TEST.is(getPlayerRank(1500), 'Netrunner', 'rep=1500 should be Netrunner');
  });

  test('getPlayerRank(-100) returns lowest rank (no crash on negative)', () => {
    const rank = getPlayerRank(-100);
    TEST.is(rank, 'Script Kiddie', 'negative rep should return lowest rank');
  });

  // ── getRankProgress() ──────────────────────────────────────────
  test('getRankProgress() returns number between 0-100', () => {
    const progress = getRankProgress();
    TEST.ok(progress >= 0 && progress <= 100, `progress=${progress} should be in [0,100]`);
  });

  test('getRankProgress() returns 0 at exactly rep=0', () => {
    PERSIST.reputation = 0;
    const progress = getRankProgress();
    TEST.is(progress, 0, 'rep=0 should give 0% progress');
  });

  test('getRankProgress() increases with higher reputation', () => {
    PERSIST.reputation = 500;
    const p500 = getRankProgress();
    PERSIST.reputation = 1500;
    const p1500 = getRankProgress();
    TEST.gt(p1500, p500, 'higher rep should give higher progress');
  });

  test('getRankProgress() returns 100 at max rank', () => {
    PERSIST.reputation = 100000; // way above max threshold
    const progress = getRankProgress();
    TEST.is(progress, 100, 'rep way above max should be 100%');
  });

  // ── UNLOCKS object ──────────────────────────────────────────────
  test('UNLOCKS has entries for ball types (mirror_ball, bouncer_ball, etc.)', () => {
    TEST.ok(UNLOCKS.mirror_ball !== undefined, 'mirror_ball unlock should exist');
    TEST.ok(UNLOCKS.bouncer_ball !== undefined, 'bouncer_ball unlock should exist');
  });

  test('UNLOCKS has shop slot unlocks (shop_slot_4, shop_slot_5, shop_slot_6)', () => {
    TEST.ok(UNLOCKS.shop_slot_4 !== undefined, 'shop_slot_4 should exist');
    TEST.ok(UNLOCKS.shop_slot_5 !== undefined, 'shop_slot_5 should exist');
    TEST.ok(UNLOCKS.shop_slot_6 !== undefined, 'shop_slot_6 should exist');
  });

  test('UNLOCKS entries have cat property (BALL_TYPE, SHOP_ITEM, COSMETIC, BOARD_THEME, TITLE)', () => {
    const cats = new Set();
    Object.values(UNLOCKS).forEach(u => { if (u.cat) cats.add(u.cat); });
    TEST.gt(cats.size, 1, 'UNLOCKS should have multiple category types');
  });

  test('UNLOCKS entries have unlockType: "rank", "achievement", or "prestige"', () => {
    Object.values(UNLOCKS).forEach(u => {
      TEST.ok(['rank', 'achievement', 'prestige'].includes(u.unlockType),
        `unlock ${u.id} should have valid unlockType`);
    });
  });

  // ── evaluateUnlocks() ───────────────────────────────────────────
  test('evaluateUnlocks() returns array (newlyUnlocked)', () => {
    const newly = evaluateUnlocks();
    TEST.ok(Array.isArray(newly), 'evaluateUnlocks should return an array');
  });

  test('evaluateUnlocks() with rep below all thresholds returns empty array', () => {
    PERSIST.reputation = 0;
    PERSIST.meta.unlocks = [];
    PERSIST.lifetimeBreach = 0;
    const newly = evaluateUnlocks();
    TEST.is(newly.length, 0, 'no unlocks should trigger at rep=0');
  });

  test('evaluateUnlocks() with high rep triggers rank unlocks', () => {
    PERSIST.reputation = 5000; // Netrunner+ / Ghost territory
    PERSIST.meta.unlocks = [];
    const newly = evaluateUnlocks();
    TEST.gt(newly.length, 0, 'high rep should trigger some unlocks');
  });

  test('evaluateUnlocks() does not duplicate already-owned unlocks', () => {
    PERSIST.reputation = 5000;
    // Pre-populate with all possible unlocks
    PERSIST.meta.unlocks = Object.keys(UNLOCKS).slice();
    const newly = evaluateUnlocks();
    TEST.is(newly.length, 0, 'all unlocks already owned → no new unlocks');
  });

  test('evaluateUnlocks() with achievement unlock (score_10k)', () => {
    PERSIST.reputation = 0;
    PERSIST.meta.unlocks = [];
    PERSIST.lifetimeBreach = 10000;
    const newly = evaluateUnlocks();
    // gold_ball_color unlocks via achievement at lifetimeBreach >= 10000
    const found = newly.find(id => id === 'gold_ball_color');
    TEST.ok(found !== undefined, 'lifetimeBreach>=10000 should trigger gold_ball_color unlock');
  });

  test('evaluateUnlocks() with prestige unlock condition', () => {
    PERSIST.meta.prestigeLevel = 1;
    PERSIST.meta.unlocks = [];
    const newly = evaluateUnlocks();
    // title_protocol_legend requires prestigeLevel >= 1
    const found = newly.find(id => id === 'title_protocol_legend');
    TEST.ok(found !== undefined, 'prestigeLevel=1 should trigger title_protocol_legend');
  });

  // ── UNLOCKS triggers ───────────────────────────────────────────
  test('mirror_ball unlocks at rank threshold 3 (rep >= RANKS[3].repThresh)', () => {
    const threshold = RANKS[3].repThresh; // RANKS index 3
    PERSIST.reputation = threshold;
    PERSIST.meta.unlocks = [];
    const newly = evaluateUnlocks();
    TEST.ok(newly.includes('mirror_ball'), `mirror_ball should unlock at rep >= ${threshold}`);
  });

  test('neon_ball_skin unlocks at rank 2', () => {
    const threshold = RANKS[2].repThresh;
    PERSIST.reputation = threshold;
    PERSIST.meta.unlocks = [];
    const newly = evaluateUnlocks();
    TEST.ok(newly.includes('neon_ball_skin'), `neon_ball_skin should unlock at rank 2 (rep >= ${threshold})`);
  });

  test('shop_slot_4 unlocks at rank 4', () => {
    const threshold = RANKS[4].repThresh;
    PERSIST.reputation = threshold;
    PERSIST.meta.unlocks = [];
    const newly = evaluateUnlocks();
    TEST.ok(newly.includes('shop_slot_4'), `shop_slot_4 should unlock at rank 4 (rep >= ${threshold})`);
  });

  test('neon_peg_theme unlocks at rank 6', () => {
    if (RANKS[6]) {
      const threshold = RANKS[6].repThresh;
      PERSIST.reputation = threshold;
      PERSIST.meta.unlocks = [];
      const newly = evaluateUnlocks();
      TEST.ok(newly.includes('neon_peg_theme'), `neon_peg_theme should unlock at rank 6`);
    } else {
      TEST.ok(true, 'RANKS[6] does not exist — skip');
    }
  });

  return results;
}
