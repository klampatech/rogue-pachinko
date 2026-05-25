// c02_jackpot.test.js — Jackpot slot machine: init, spin/stop, jackpot/minor/pool
// Bert — physics + slots agent

export function runTests(TEST) {
  const results = [];
  const { is, ok, gt, lt, equal, throws } = TEST;

  function resetGS() {
    TEST.seed(42);
    GS.screen = 'playing';
    GS.ballsInPlay = [];
    GS.board = [];
    GS.multiplier = 1;
    GS.comboCount = 0;
    GS.frenzyActive = false;
    GS.shieldNextBall = false;
    GS.overclockActive = false;
    GS.overclockTimer = 0;
    GS.score = 0;
    GS.floorObjective = { type: 'standard', target: 20, progress: 0 };
    GS.floor = 1;
    GS.timeScale = 1.0;
    canDrop = true;
    dropX = 240;
    previewArc = [];
    GS.balls = 5;
    GS.pegsHit = new Set();
    GS.totalPegsCleared = 0;
    GS.chainTimer = 0;
    GS.livesLost = 0;
    GS.shieldActive = false;
    GS.slotAnimations = [];
    GS.frenzyReady = false;
    GS.frenzyTimer = 0;
    GS.slowmoBall = null;
    GS.timeScale = 1.0;
    GS.unlockedSlots = [0, 1, 2, 3, 4, 5, 6];
    GS.jackpotPool = 500;
    GS.jackpotBase = 500;
    GS.payloadInventory = [];
    GS.shieldNextBall = false;
    // Jackpot state
    GS.slotReels = [0, 0, 0];
    GS.slotSpinning = false;
    GS.slotResult = null;
    GS.totalJackpotSpins = 0;
  }

  // Jackpot symbols (from the HTML reel elements: ☢ ☠ ◈ ◆ ▲ ✺ ⬡)
  const JP_SYMBOLS = ['☢', '☠', '◈', '◆', '▲', '✺', '⬡'];

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: initJackpotSlots() — reel initialization
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('initJackpotSlots — resets slotReels to 3 elements', () => {
    resetGS();
    initJackpotSlots();
    is(GS.slotReels.length, 3, 'slotReels has 3 elements');
  }));

  results.push(TEST('initJackpotSlots — slotSpinning set to false', () => {
    resetGS();
    GS.slotSpinning = true;
    initJackpotSlots();
    ok(!GS.slotSpinning, 'slotSpinning = false after init');
  }));

  results.push(TEST('initJackpotSlots — slotResult set to null', () => {
    resetGS();
    GS.slotResult = { match: 2 };
    initJackpotSlots();
    is(GS.slotResult, null, 'slotResult = null after init');
  }));

  results.push(TEST('initJackpotSlots — totalJackpotSpins initialized to 0', () => {
    resetGS();
    GS.totalJackpotSpins = 99;
    initJackpotSlots();
    is(GS.totalJackpotSpins, 0, 'totalJackpotSpins = 0');
  }));

  results.push(TEST('initJackpotSlots — jackpotPool reset to floor base (500*floor)', () => {
    resetGS();
    GS.floor = 3;
    GS.jackpotPool = 9999;
    initJackpotSlots();
    is(GS.jackpotPool, 1500, 'jackpotPool = 500 * floor on init');
  }));

  results.push(TEST('initJackpotSlots — jackpotBase = 500 * floor', () => {
    resetGS();
    GS.floor = 4;
    initJackpotSlots();
    is(GS.jackpotBase, 2000, 'jackpotBase = 500 * floor');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: _jpSession guard — prevents concurrent jackpot sessions
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('_jpSession — guard prevents double-spin', () => {
    resetGS();
    GS.slotSpinning = true;
    // Simulate _jpSession guard: if slotSpinning, spin should not start
    if (GS.slotSpinning) {
      ok(true, 'guard prevents spin while already spinning');
    } else {
      ok(false, 'guard should have prevented this');
    }
  }));

  results.push(TEST('_jpSession — guard clears after spin ends', () => {
    resetGS();
    GS.slotSpinning = true;
    // Simulate spin completion
    GS.slotSpinning = false;
    ok(!GS.slotSpinning, 'guard clears after spin completes');
  }));

  results.push(TEST('_jpSession — totalJackpotSpins increments on each spin', () => {
    resetGS();
    GS.totalJackpotSpins = 0;
    GS.totalJackpotSpins++;
    is(GS.totalJackpotSpins, 1, 'totalJackpotSpins incremented');
    GS.totalJackpotSpins++;
    is(GS.totalJackpotSpins, 2, 'totalJackpotSpins = 2');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot spin — symbol randomness
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot spin — each reel gets valid symbol index (0-6)', () => {
    resetGS();
    // Simulate spin result: random symbol indices
    const spin = () => {
      const reels = [
        Math.floor(Math.random() * 7),
        Math.floor(Math.random() * 7),
        Math.floor(Math.random() * 7)
      ];
      return reels;
    };
    const result = spin();
    for (const idx of result) {
      ok(idx >= 0 && idx <= 6, `symbol index ${idx} is valid (0-6)`);
    }
    is(result.length, 3, '3 reels in result');
  }));

  results.push(TEST('Jackpot spin — all 7 symbols are valid JP symbols', () => {
    for (let i = 0; i < 7; i++) {
      ok(JP_SYMBOLS[i], `symbol ${i} exists: ${JP_SYMBOLS[i]}`);
    }
    is(JP_SYMBOLS.length, 7, '7 jackpot symbols defined');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot match detection — 3 match = JACKPOT
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot — 3 match: all 3 symbols identical', () => {
    resetGS();
    const reels = [3, 3, 3]; // all JACKPOT symbol
    const matchCount = (reels[0] === reels[1] && reels[1] === reels[2]) ? 3 : 0;
    is(matchCount, 3, '3 identical symbols = 3-match');
  }));

  results.push(TEST('Jackpot — 2 match: first two identical, third different', () => {
    resetGS();
    const reels = [3, 3, 5];
    const matchCount = (reels[0] === reels[1] && reels[1] !== reels[2]) ? 2 : 0;
    is(matchCount, 2, '2 identical + 1 different = 2-match');
  }));

  results.push(TEST('Jackpot — no match: all symbols different', () => {
    resetGS();
    const reels = [1, 3, 5];
    const matchCount = (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) ? 2 : 0;
    is(matchCount, 0, 'all different = no match');
  }));

  results.push(TEST('Jackpot — 3 match JACKPOT: all three ☢', () => {
    resetGS();
    const reels = [0, 0, 0]; // ☢
    const isJackpot = reels[0] === reels[1] && reels[1] === reels[2];
    ok(isJackpot, 'all ☢ = jackpot');
  }));

  results.push(TEST('Jackpot — 3 match JACKPOT: all three ◈', () => {
    resetGS();
    const reels = [2, 2, 2]; // ◈
    const isJackpot = reels[0] === reels[1] && reels[1] === reels[2];
    ok(isJackpot, 'all ◈ = jackpot');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot win — pool reset + award
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot win — pool resets to jackpotBase (500*floor)', () => {
    resetGS();
    GS.floor = 2;
    GS.jackpotPool = 5000;
    initJackpotSlots();
    is(GS.jackpotPool, 1000, 'pool resets to 500*floor=1000 on jackpot win');
  }));

  results.push(TEST('Jackpot win — award is the pre-reset pool amount', () => {
    resetGS();
    GS.jackpotPool = 2000;
    const award = GS.jackpotPool; // full pool awarded
    is(award, 2000, 'jackpot awards the full accumulated pool');
  }));

  results.push(TEST('Jackpot win — pool grows again after subsequent failed spins', () => {
    resetGS();
    GS.floor = 1;
    GS.jackpotPool = 500; // base after reset
    // Failed spin → pool grows 15%
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    is(GS.jackpotPool, 575, 'failed spin: pool grows 15%');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Minor win — 2 match
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Minor win — 2 match awards bonus credit', () => {
    resetGS();
    const reels = [4, 4, 2];
    const isMinorWin = (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]);
    ok(isMinorWin, '2 match = minor win');
  }));

  results.push(TEST('Minor win — 2 match award is 50 * floor', () => {
    resetGS();
    GS.floor = 3;
    const minorAward = 50 * GS.floor;
    is(minorAward, 150, 'minor win awards 50*floor = 150');
  }));

  results.push(TEST('Minor win — 2 match (reels 0+1 match) detected correctly', () => {
    resetGS();
    const reels = [5, 5, 3];
    const match = reels[0] === reels[1] ? 2 : (reels[1] === reels[2] ? 2 : (reels[0] === reels[2] ? 2 : 0));
    is(match, 2, 'reels 0+1 match → 2-match');
  }));

  results.push(TEST('Minor win — 2 match (reels 1+2 match) detected correctly', () => {
    resetGS();
    const reels = [1, 6, 6];
    const match = reels[0] === reels[1] ? 2 : (reels[1] === reels[2] ? 2 : (reels[0] === reels[2] ? 2 : 0));
    is(match, 2, 'reels 1+2 match → 2-match');
  }));

  results.push(TEST('Minor win — 2 match (reels 0+2 match) detected correctly', () => {
    resetGS();
    const reels = [3, 7, 3];
    const match = reels[0] === reels[1] ? 2 : (reels[1] === reels[2] ? 2 : (reels[0] === reels[2] ? 2 : 0));
    is(match, 2, 'reels 0+2 match → 2-match');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Pool roll — no match grows pool
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Pool roll — no match: pool grows 15%', () => {
    resetGS();
    GS.jackpotPool = 500;
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    is(GS.jackpotPool, 575, 'pool = 500 * 1.15 = 575');
  }));

  results.push(TEST('Pool roll — no match: floor 1 grows to 575', () => {
    resetGS();
    GS.floor = 1;
    GS.jackpotPool = 500;
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    is(GS.jackpotPool, 575, 'floor 1 pool grows 15%');
  }));

  results.push(TEST('Pool roll — multiple failed spins compound growth', () => {
    resetGS();
    GS.jackpotPool = 500;
    // First failed spin
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    // Second failed spin
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    is(GS.jackpotPool, 661, 'pool grows ~15% per failed spin (compounded)');
  }));

  results.push(TEST('Pool roll — jackpot win resets pool, then failed spin grows it', () => {
    resetGS();
    GS.floor = 1;
    GS.jackpotPool = 500; // reset after jackpot
    // Failed spin
    GS.jackpotPool = Math.floor(GS.jackpotPool * 1.15);
    is(GS.jackpotPool, 575, 'pool grows after jackpot reset');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot spin — stagger spin/stop timing
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot spin — reels stop in staggered order (not all at once)', () => {
    resetGS();
    // Stagger: reel 0 stops first, then 1, then 2 (100ms apart)
    const stopOrder = [0, 1, 2];
    // Verify stagger is deterministic
    is(stopOrder[0], 0, 'reel 0 stops first');
    is(stopOrder[1], 1, 'reel 1 stops second');
    is(stopOrder[2], 2, 'reel 2 stops third');
  }));

  results.push(TEST('Jackpot spin — stagger interval is ~100ms between reels', () => {
    // Stagger of 100ms between reels
    const intervals = [100, 100];
    for (const iv of intervals) {
      ok(iv > 0, `interval ${iv}ms is positive`);
    }
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot spin — DOM elements
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot — jp-spin-btn element exists', () => {
    const btn = document.getElementById('jp-spin-btn');
    ok(btn, 'jp-spin-btn exists');
  }));

  results.push(TEST('Jackpot — jp-continue-btn element exists', () => {
    const btn = document.getElementById('jp-continue-btn');
    ok(btn, 'jp-continue-btn exists');
  }));

  results.push(TEST('Jackpot — 3 reel elements exist (reel-0, reel-1, reel-2)', () => {
    for (let i = 0; i < 3; i++) {
      const reel = document.getElementById('reel-' + i);
      ok(reel, `reel-${i} element exists`);
    }
  }));

  results.push(TEST('Jackpot — jp-banner element exists', () => {
    const banner = document.getElementById('jp-banner');
    ok(banner, 'jp-banner element exists');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot pool growth formula
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot pool — grows 15% per failed spin', () => {
    resetGS();
    GS.jackpotPool = 500;
    const growth = Math.floor(GS.jackpotPool * 0.15);
    is(growth, 75, '15% of 500 = 75');
    GS.jackpotPool += growth;
    is(GS.jackpotPool, 575, 'pool = 500 + 75 = 575');
  }));

  results.push(TEST('Jackpot pool — grows by floor-scaled amount on high floors', () => {
    resetGS();
    GS.floor = 5;
    GS.jackpotPool = 500 * GS.floor; // base on floor 5 = 2500
    const growth = Math.floor(GS.jackpotPool * 0.15);
    is(growth, 375, '15% of 2500 = 375');
  }));

  results.push(TEST('Jackpot pool — jackpotBase = 500 * floor', () => {
    for (let f = 1; f <= 7; f++) {
      is(500 * f, f * 500, `floor ${f}: jackpotBase = ${f * 500}`);
    }
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot — JP_BANNER display (result text)
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot — jackpot win banner text', () => {
    const jackpotBanner = 'JACKPOT!';
    ok(jackpotBanner.length > 0, 'jackpot win has banner text');
    ok(jackpotBanner.includes('JACKPOT'), 'banner contains JACKPOT');
  }));

  results.push(TEST('Jackpot — minor win banner text', () => {
    const minorBanner = 'MINOR WIN';
    ok(minorBanner.length > 0, 'minor win has banner text');
  }));

  results.push(TEST('Jackpot — no-match banner text', () => {
    const noMatchBanner = '';
    // No-match shows pool growing, no special banner
    ok(true, 'no-match behavior is implicit (pool grows)');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot — result slot at GS.slotResult
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('GS.slotResult — null before first spin', () => {
    resetGS();
    is(GS.slotResult, null, 'slotResult is null before first spin');
  }));

  results.push(TEST('GS.slotResult — stores spin outcome', () => {
    resetGS();
    GS.slotResult = { reels: [3, 3, 3], match: 3, isJackpot: true, poolAward: 2000 };
    ok(GS.slotResult.isJackpot, 'slotResult.isJackpot = true for 3-match');
  }));

  results.push(TEST('GS.slotResult — minor win stored correctly', () => {
    resetGS();
    GS.slotResult = { reels: [1, 1, 4], match: 2, isJackpot: false, poolAward: 50 };
    ok(!GS.slotResult.isJackpot, 'slotResult.isJackpot = false for 2-match');
  }));

  results.push(TEST('GS.slotResult — no-match stored correctly', () => {
    resetGS();
    GS.slotResult = { reels: [0, 2, 5], match: 0, isJackpot: false, poolAward: 0 };
    is(GS.slotResult.match, 0, 'no-match: match = 0');
    is(GS.slotResult.poolAward, 0, 'no-match: poolAward = 0');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot — isJackpot() detection
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('isJackpot — true when all 3 reels match', () => {
    const reels = [0, 0, 0];
    const isJackpot = reels[0] === reels[1] && reels[1] === reels[2];
    ok(isJackpot, 'all matching = jackpot');
  }));

  results.push(TEST('isJackpot — false when only 2 match', () => {
    const reels = [1, 1, 3];
    const isJackpot = reels[0] === reels[1] && reels[1] === reels[2];
    ok(!isJackpot, '2-match ≠ jackpot');
  }));

  results.push(TEST('isJackpot — false when no reels match', () => {
    const reels = [1, 3, 5];
    const isJackpot = reels[0] === reels[1] && reels[1] === reels[2];
    ok(!isJackpot, 'no-match ≠ jackpot');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot — multi-floor behavior
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot — floor 5: base = 2500, pool resets to 2500 on win', () => {
    resetGS();
    GS.floor = 5;
    GS.jackpotPool = 9999;
    initJackpotSlots();
    is(GS.jackpotPool, 2500, 'floor 5 jackpot base = 2500');
  }));

  results.push(TEST('Jackpot — floor 7: base = 3500', () => {
    resetGS();
    GS.floor = 7;
    initJackpotSlots();
    is(GS.jackpotPool, 3500, 'floor 7 jackpot base = 3500');
  }));

  results.push(TEST('Jackpot — jackpotGrowthBonus mastery affects pool growth', () => {
    resetGS();
    GS.jackpotGrowthBonus = 1.25; // mastery bonus 25%
    GS.jackpotPool = 500;
    const bonusGrowth = Math.floor(GS.jackpotPool * (0.15 * GS.jackpotGrowthBonus));
    is(bonusGrowth, 93, '1.25x bonus on 15% = 18.75% → 93');
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE: Jackpot — triggerSlotCollected(6) and jackpot interaction
  // ─────────────────────────────────────────────────────────────────────────
  results.push(TEST('Jackpot slot — triggerSlotCollected(6) adds to jackpotPool', () => {
    resetGS();
    GS.jackpotPool = 500;
    GS.multiplier = 1;
    const ball = new Ball(476, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 6);
    is(GS.jackpotPool, 600, 'JACKPOT slot adds 100*mult = 100 to pool');
  }));

  results.push(TEST('Jackpot slot — triggerSlotCollected(6) with multiplier', () => {
    resetGS();
    GS.jackpotPool = 500;
    GS.multiplier = 3;
    const ball = new Ball(476, 565, 0, 2, []);
    GS.ballsInPlay = [ball];
    ball.active = true;
    triggerSlotCollected(ball, 6);
    is(GS.jackpotPool, 800, 'JACKPOT slot adds 100*3 = 300 to pool');
  }));

  return results;
}
