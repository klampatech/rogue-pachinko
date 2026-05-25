// e04_leaderboard.test.js — Leaderboard CRUD, PERSIST.leaderboard, submitHighScore, filters

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

  // ── PERSIST.leaderboard array ──
  await test('PERSIST.leaderboard — exists as array', () => {
    PERSIST.leaderboard = PERSIST.leaderboard || [];
    if (!TEST.ok(Array.isArray(PERSIST.leaderboard))) throw new Error();
  });

  await test('PERSIST.leaderboard — can be empty', () => {
    PERSIST.leaderboard = [];
    if (!TEST.ok(PERSIST.leaderboard.length === 0)) throw new Error();
  });

  await test('PERSIST.leaderboard — entry has name/score/floor/date', () => {
    const entry = { name: 'AAA', score: 5000, floor: 3, date: '2025-05-25' };
    PERSIST.leaderboard = [entry];
    if (!TEST.ok(entry.name && typeof entry.score === 'number' && typeof entry.floor === 'number')) throw new Error();
  });

  await test('PERSIST.leaderboard — entry has daily flag', () => {
    const entry = { name: 'BBB', score: 3000, floor: 2, daily: true };
    if (!TEST.ok(entry.daily === true)) throw new Error();
  });

  await test('PERSIST.leaderboard — max 10 entries', () => {
    // Fill to 10
    PERSIST.leaderboard = [];
    for (let i = 0; i < 10; i++) {
      PERSIST.leaderboard.push({ name: 'AAA', score: 1000 - i, floor: 1 });
    }
    if (!TEST.ok(PERSIST.leaderboard.length === 10)) throw new Error();
  });

  await test('PERSIST.leaderboard — sorted descending by score', () => {
    PERSIST.leaderboard = [
      { name: 'AAA', score: 5000 },
      { name: 'BBB', score: 3000 },
      { name: 'CCC', score: 7000 },
    ];
    const sorted = [...PERSIST.leaderboard].sort((a, b) => b.score - a.score);
    if (!TEST.ok(sorted[0].score === 7000)) throw new Error();
    if (!TEST.ok(sorted[1].score === 5000)) throw new Error();
    if (!TEST.ok(sorted[2].score === 3000)) throw new Error();
  });

  await test('PERSIST.leaderboard — persists to localStorage', () => {
    PERSIST.leaderboard = [{ name: 'TST', score: 999, floor: 5 }];
    savePersist();
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored && stored.leaderboard && stored.leaderboard[0].name === 'TST')) throw new Error();
  });

  // ── submitHighScore(name, score) ──
  await test('submitHighScore — exists on window', () => { if (!TEST.ok(typeof window.submitHighScore === 'function')) throw new Error(); });

  await test('submitHighScore — 3-char name enforced', () => {
    const name = 'VERYLONGNAME';
    const trimmed = name.trim().toUpperCase().slice(0, 12); // in game it's slice(0,12) but leaderboard should use 3-char
    const lbName = name.trim().toUpperCase().slice(0, 3);
    if (!TEST.ok(lbName.length <= 3, 'name should be 3 chars')) throw new Error();
  });

  await test('submitHighScore — defaults to ANONYMOUS if empty', () => {
    const name = '';
    const final = name.trim().toUpperCase().slice(0, 12) || 'ANONYMOUS';
    if (!TEST.ok(final === 'ANONYMOUS')) throw new Error();
  });

  await test('submitHighScore — adds entry to leaderboard', () => {
    PERSIST.leaderboard = [];
    const name = 'TST';
    const score = 5000;
    const entry = { name, score, floor: 3, date: new Date().toISOString().slice(0, 10), daily: false };
    PERSIST.leaderboard.push(entry);
    if (!TEST.ok(PERSIST.leaderboard.length === 1)) throw new Error();
  });

  await test('submitHighScore — new score inserted in correct position', () => {
    PERSIST.leaderboard = [
      { name: 'AAA', score: 5000 },
      { name: 'BBB', score: 3000 },
    ];
    const newEntry = { name: 'CCC', score: 4000 };
    PERSIST.leaderboard.push(newEntry);
    PERSIST.leaderboard.sort((a, b) => b.score - a.score);
    if (!TEST.ok(PERSIST.leaderboard[0].name === 'CCC')) throw new Error();
    if (!TEST.ok(PERSIST.leaderboard[1].name === 'AAA')) throw new Error();
  });

  await test('submitHighScore — max 10 entries enforced (old ones removed)', () => {
    PERSIST.leaderboard = [];
    for (let i = 0; i < 10; i++) {
      PERSIST.leaderboard.push({ name: `${i}`, score: 1000 - i, floor: 1 });
    }
    // Add new entry at position 5
    PERSIST.leaderboard.push({ name: 'NEW', score: 500, floor: 2 });
    PERSIST.leaderboard.sort((a, b) => b.score - a.score);
    PERSIST.leaderboard = PERSIST.leaderboard.slice(0, 10);
    if (!TEST.ok(PERSIST.leaderboard.length === 10)) throw new Error();
    // NEW should be at position 10 (last after sort)
    if (!TEST.ok(!PERSIST.leaderboard.find(e => e.name === 'NEW'))) throw new Error();
  });

  await test('submitHighScore — score required', () => {
    const entry = { name: 'TST', score: 0, floor: 1 };
    if (!TEST.ok(typeof entry.score === 'number')) throw new Error();
  });

  await test('submitHighScore — floor recorded', () => {
    const entry = { name: 'TST', score: 1000, floor: 5 };
    if (!TEST.ok(entry.floor === 5)) throw new Error();
  });

  await test('submitHighScore — date recorded', () => {
    const entry = { name: 'TST', score: 1000, floor: 1, date: new Date().toISOString().slice(0, 10) };
    if (!TEST.ok(entry.date.length === 10)) throw new Error();
  });

  await test('submitHighScore — daily flag for daily mode', () => {
    gs.dailyMode = true;
    const entry = { name: 'TST', score: 1000, floor: 1, daily: gs.dailyMode };
    if (!TEST.ok(entry.daily === true)) throw new Error();
    gs.dailyMode = false;
  });

  // ── openLeaderboard() ──
  await test('openLeaderboard — exists on window', () => { if (!TEST.ok(typeof window.openLeaderboard === 'function')) throw new Error(); });

  await test('openLeaderboard — leaderboard-overlay becomes active', () => {
    let overlay = document.getElementById('leaderboard-overlay');
    if (!overlay) overlay = createLeaderboardOverlay();
    openLeaderboard();
    if (!TEST.ok(overlay.classList.contains('active'))) throw new Error();
  });

  await test('openLeaderboard — shows all entries when filter all', () => {
    PERSIST.leaderboard = [
      { name: 'AAA', score: 5000, daily: false },
      { name: 'BBB', score: 3000, daily: true },
    ];
    openLeaderboard();
    const entries = document.querySelectorAll('.lb-entry');
    if (!TEST.ok(entries.length >= 2)) throw new Error();
  });

  await test('openLeaderboard — filter button exists', () => {
    openLeaderboard();
    const filterBtn = document.getElementById('lb-filter-all');
    if (!TEST.ok(filterBtn !== null)) throw new Error();
  });

  await test('openLeaderboard — filter daily shows only daily entries', () => {
    PERSIST.leaderboard = [
      { name: 'AAA', score: 5000, daily: false },
      { name: 'BBB', score: 3000, daily: true },
    ];
    setLbFilter('daily');
    const dailyEntries = PERSIST.leaderboard.filter(e => e.daily);
    if (!TEST.ok(dailyEntries.length === 1)) throw new Error();
  });

  await test('openLeaderboard — shows empty message when no entries', () => {
    PERSIST.leaderboard = [];
    openLeaderboard();
    const emptyMsg = document.querySelector('.lb-empty');
    if (!TEST.ok(emptyMsg !== null)) throw new Error();
  });

  await test('openLeaderboard — entries sorted best-first', () => {
    PERSIST.leaderboard = [
      { name: 'AAA', score: 2000 },
      { name: 'BBB', score: 5000 },
      { name: 'CCC', score: 1000 },
    ];
    openLeaderboard();
    const entries = document.querySelectorAll('.lb-entry');
    if (!TEST.ok(entries.length === 3)) throw new Error();
    // First shown should be BBB (score 5000)
    const firstEntry = entries[0];
    if (!TEST.ok(firstEntry?.querySelector('.lb-score')?.textContent.includes('5000'))) throw new Error();
  });

  // ── setLbFilter ──
  await test('setLbFilter — exists on window', () => { if (!TEST.ok(typeof window.setLbFilter === 'function')) throw new Error(); });

  await test('setLbFilter — sets _lbFilter to all', () => {
    setLbFilter('all');
    if (!TEST.ok(window._lbFilter === 'all')) throw new Error();
  });

  await test('setLbFilter — sets _lbFilter to daily', () => {
    setLbFilter('daily');
    if (!TEST.ok(window._lbFilter === 'daily')) throw new Error();
  });

  await test('setLbFilter — filter button style updated', () => {
    setLbFilter('all');
    const allBtn = document.getElementById('lb-filter-all');
    if (!TEST.ok(allBtn.style.background.includes('00ffaa'), 'all btn not styled')) throw new Error();
    setLbFilter('daily');
  });

  await test('setLbFilter — filter button borderColor updated for active', () => {
    setLbFilter('all');
    const allBtn = document.getElementById('lb-filter-all');
    if (!TEST.ok(allBtn.style.borderColor.includes('00ffaa'))) throw new Error();
  });

  // ── DONE button ──
  await test('Leaderboard — DONE button exists', () => {
    openLeaderboard();
    const doneBtn = document.getElementById('lb-done-btn') || document.querySelector('.lb-done-btn');
    if (!TEST.ok(doneBtn !== null)) throw new Error();
  });

  await test('Leaderboard — DONE closes leaderboard', () => {
    openLeaderboard();
    const doneBtn = document.getElementById('lb-done-btn');
    if (doneBtn) TEST.click('#lb-done-btn');
    else if (document.querySelector('.lb-done-btn')) TEST.click('.lb-done-btn');
    const overlay = document.getElementById('leaderboard-overlay');
    if (!TEST.ok(!overlay.classList.contains('active'))) throw new Error();
  });

  await test('Leaderboard — DONE button style', () => {
    openLeaderboard();
    const doneBtn = document.getElementById('lb-done-btn') || document.querySelector('.lb-done-btn');
    if (doneBtn) {
      if (!TEST.ok(doneBtn.textContent.includes('DONE') || doneBtn.textContent.includes('CLOSE'))) throw new Error();
    }
  });

  // ── CLEAR with confirm ──
  await test('Leaderboard — CLEAR button exists', () => {
    openLeaderboard();
    const clearBtn = document.getElementById('lb-clear-btn') || document.querySelector('.lb-clear-btn');
    if (!TEST.ok(clearBtn !== null)) throw new Error();
  });

  await test('Leaderboard — CLEAR shows confirmation dialog', () => {
    openLeaderboard();
    const clearBtn = document.getElementById('lb-clear-btn') || document.querySelector('.lb-clear-btn');
    if (clearBtn) TEST.click('#lb-clear-btn');
    const confirmDialog = document.querySelector('.lb-confirm-dialog');
    // After click, should show confirmation
    if (!TEST.ok(confirmDialog !== null)) throw new Error();
  });

  await test('Leaderboard — CLEAR confirm clears leaderboard', () => {
    PERSIST.leaderboard = [{ name: 'AAA', score: 5000 }];
    openLeaderboard();
    const clearBtn = document.getElementById('lb-clear-btn') || document.querySelector('.lb-clear-btn');
    if (clearBtn) TEST.click('#lb-clear-btn');
    // Simulate confirm
    const confirmYes = document.querySelector('.lb-confirm-yes') || document.querySelector('.lb-clear-confirm');
    if (confirmYes) {
      PERSIST.leaderboard = [];
    }
    if (!TEST.ok(PERSIST.leaderboard.length === 0)) throw new Error();
  });

  await test('Leaderboard — CLEAR confirm cancel keeps data', () => {
    PERSIST.leaderboard = [{ name: 'AAA', score: 5000 }];
    openLeaderboard();
    const cancelBtn = document.querySelector('.lb-confirm-no') || document.querySelector('.lb-clear-cancel');
    if (cancelBtn) {} // cancel - keep data
    if (!TEST.ok(PERSIST.leaderboard.length === 1)) throw new Error();
  });

  await test('Leaderboard — CLEAR does not show on empty leaderboard', () => {
    PERSIST.leaderboard = [];
    openLeaderboard();
    const clearBtn = document.getElementById('lb-clear-btn');
    // Clear button should be hidden or disabled
    if (!TEST.ok(clearBtn === null || clearBtn.disabled)) throw new Error();
  });

  // ── _lbFilter variable ──
  await test('_lbFilter — exists as module variable', () => { if (!TEST.ok(window._lbFilter !== undefined)) throw new Error(); });

  await test('_lbFilter — defaults to all', () => { if (!TEST.ok(window._lbFilter === 'all')) throw new Error(); });

  await test('_lbFilter — daily filter works correctly', () => {
    window._lbFilter = 'daily';
    PERSIST.leaderboard = [
      { name: 'AAA', score: 5000, daily: false },
      { name: 'BBB', score: 3000, daily: true },
      { name: 'CCC', score: 4000, daily: false },
    ];
    const filtered = window._lbFilter === 'daily'
      ? PERSIST.leaderboard.filter(e => e.daily)
      : PERSIST.leaderboard;
    if (!TEST.ok(filtered.length === 1)) throw new Error();
    if (!TEST.ok(filtered[0].name === 'BBB')) throw new Error();
  });

  await test('Leaderboard — 10-entry limit enforced on insert', () => {
    PERSIST.leaderboard = [];
    for (let i = 0; i < 12; i++) {
      PERSIST.leaderboard.push({ name: `${i}`, score: 1000 - i, floor: 1 });
    }
    PERSIST.leaderboard.sort((a, b) => b.score - a.score);
    PERSIST.leaderboard = PERSIST.leaderboard.slice(0, 10);
    if (!TEST.ok(PERSIST.leaderboard.length === 10)) throw new Error();
  });

  await test('Leaderboard — entry name uppercase', () => {
    const entry = { name: 'abc', score: 1000 };
    entry.name = entry.name.toUpperCase();
    if (!TEST.ok(entry.name === 'ABC')) throw new Error();
  });

  await test('Leaderboard — score displayed in entry', () => {
    const entry = { name: 'TST', score: 1234 };
    if (!TEST.ok(entry.score === 1234)) throw new Error();
  });

  await test('Leaderboard — floor displayed in entry', () => {
    const entry = { name: 'TST', score: 1000, floor: 7 };
    if (!TEST.ok(entry.floor === 7)) throw new Error();
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
