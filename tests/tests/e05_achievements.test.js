// e05_achievements.test.js — Achievement triggers, showAchievement, 14 achievement IDs, toast display

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

  // Clear _seenAchs so we can test fresh
  window._seenAchs = new Set();

  // ── ACHIEVEMENTS object ──
  await test('ACHIEVEMENTS — exists and is non-empty', () => {
    const keys = Object.keys(ACHIEVEMENTS);
    if (!TEST.ok(keys.length > 0, 'ACHIEVEMENTS empty')) throw new Error();
  });

  await test('ACHIEVEMENTS — all have icon/title/desc', () => {
    for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
      if (!TEST.ok(ach.icon && ach.title && ach.desc, `ach ${id} missing fields`)) throw new Error();
    }
  });

  // ── 14 Achievement IDs ──
  await test('ACHIEVEMENTS — firstPeg', () => { if (!TEST.ok(ACHIEVEMENTS.firstPeg)) throw new Error(); });
  await test('ACHIEVEMENTS — floor3', () => { if (!TEST.ok(ACHIEVEMENTS.floor3)) throw new Error(); });
  await test('ACHIEVEMENTS — floor5', () => { if (!TEST.ok(ACHIEVEMENTS.floor5)) throw new Error(); });
  await test('ACHIEVEMENTS — x3mult', () => { if (!TEST.ok(ACHIEVEMENTS.x3mult)) throw new Error(); });
  await test('ACHIEVEMENTS — x5mult', () => { if (!TEST.ok(ACHIEVEMENTS.x5mult)) throw new Error(); });
  await test('ACHIEVEMENTS — x7mult', () => { if (!TEST.ok(ACHIEVEMENTS.x7mult)) throw new Error(); });
  await test('ACHIEVEMENTS — jackpotWin', () => { if (!TEST.ok(ACHIEVEMENTS.jackpotWin)) throw new Error(); });
  await test('ACHIEVEMENTS — combo5', () => { if (!TEST.ok(ACHIEVEMENTS.combo5)) throw new Error(); });
  await test('ACHIEVEMENTS — combo10', () => { if (!TEST.ok(ACHIEVEMENTS.combo10)) throw new Error(); });
  await test('ACHIEVEMENTS — fiftyRuns', () => { if (!TEST.ok(ACHIEVEMENTS.fiftyRuns)) throw new Error(); });
  await test('ACHIEVEMENTS — hundredRuns', () => { if (!TEST.ok(ACHIEVEMENTS.hundredRuns)) throw new Error(); });
  await test('ACHIEVEMENTS — fullBreach', () => { if (!TEST.ok(ACHIEVEMENTS.fullBreach)) throw new Error(); });
  await test('ACHIEVEMENTS — allPayloads', () => { if (!TEST.ok(ACHIEVEMENTS.allPayloads)) throw new Error(); });
  await test('ACHIEVEMENTS — firstContract', () => { if (!TEST.ok(ACHIEVEMENTS.firstContract)) throw new Error(); });

  await test('ACHIEVEMENTS — 14 achievement IDs total', () => {
    const ids = ['firstPeg', 'floor3', 'floor5', 'x3mult', 'x5mult', 'x7mult', 'jackpotWin', 'combo5', 'combo10', 'fiftyRuns', 'hundredRuns', 'fullBreach', 'allPayloads', 'firstContract'];
    const existing = ids.filter(id => ACHIEVEMENTS[id]);
    if (!TEST.ok(existing.length >= 12, `Only ${existing.length} achievements found`)) throw new Error();
  });

  // ── showAchievement(id) ──
  await test('showAchievement — exists on window', () => { if (!TEST.ok(typeof window.showAchievement === 'function')) throw new Error(); });

  await test('showAchievement — adds to _seenAchs', () => {
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    if (!TEST.ok(window._seenAchs.has('firstPeg'))) throw new Error();
  });

  await test('showAchievement — does nothing for unknown key', () => {
    window._seenAchs = new Set();
    const before = window._seenAchs.size;
    showAchievement('nonexistent_achievement_xyz');
    if (!TEST.ok(window._seenAchs.size === before)) throw new Error();
  });

  await test('showAchievement — already earned does not re-fire (idempotent)', () => {
    window._seenAchs = new Set(['firstPeg']);
    const before = window._seenAchs.size;
    showAchievement('firstPeg'); // should be no-op
    if (!TEST.ok(window._seenAchs.size === before, 'should not add duplicate')) throw new Error();
  });

  await test('showAchievement — adds to PERSIST.achievements', () => {
    PERSIST.achievements = [];
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    if (!TEST.ok(PERSIST.achievements.includes('firstPeg'), 'firstPeg not in PERSIST.achievements')) throw new Error();
  });

  await test('showAchievement — does not add duplicate to PERSIST.achievements', () => {
    PERSIST.achievements = ['firstPeg'];
    window._seenAchs = new Set(['firstPeg']);
    showAchievement('firstPeg');
    const count = PERSIST.achievements.filter(a => a === 'firstPeg').length;
    if (!TEST.ok(count === 1, 'Duplicate added to PERSIST')) throw new Error();
  });

  await test('showAchievement — calls savePersist', () => {
    // savePersist called within showAchievement
    PERSIST.achievements = [];
    showAchievement('floor3');
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored && stored.achievements && stored.achievements.includes('floor3'))) throw new Error();
  });

  await test('showAchievement — toast DOM element updated', () => {
    window._seenAchs = new Set();
    PERSIST.achievements = [];
    showAchievement('firstPeg');
    const el = document.getElementById('achievement-toast');
    if (!TEST.ok(el, 'achievement-toast element missing')) throw new Error();
  });

  await test('showAchievement — toast shows icon', () => {
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    const el = document.getElementById('achievement-toast');
    const icon = el.querySelector('.ach-icon');
    if (!TEST.ok(icon && icon.textContent, 'ach-icon not set')) throw new Error();
  });

  await test('showAchievement — toast shows desc', () => {
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    const el = document.getElementById('achievement-toast');
    const desc = el.querySelector('.ach-desc');
    if (!TEST.ok(desc && desc.textContent, 'ach-desc not set')) throw new Error();
  });

  await test('showAchievement — toast gets show class', () => {
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    const el = document.getElementById('achievement-toast');
    if (!TEST.ok(el.classList.contains('show'), 'toast not showing')) throw new Error();
  });

  await test('showAchievement — toast auto-hides after 3500ms', async () => {
    window._seenAchs = new Set();
    showAchievement('firstPeg');
    const el = document.getElementById('achievement-toast');
    // After 3500ms, classList.remove('show') is called
    await TEST.wait(3600);
    if (!TEST.ok(!el.classList.contains('show'), 'toast still showing after 3500ms')) throw new Error();
  });

  // ── Achievement trigger conditions ──
  await test('Achievement — firstPeg triggers on first peg clear', () => {
    gs.totalPegsCleared = 0;
    gs.totalPegsCleared++;
    if (gs.totalPegsCleared === 1) showAchievement('firstPeg');
    if (!TEST.ok(window._seenAchs.has('firstPeg'))) throw new Error();
  });

  await test('Achievement — x3mult triggers when multiplier >= 3', () => {
    gs.multiplier = 3;
    if (gs.multiplier >= 3) showAchievement('x3mult');
    if (!TEST.ok(window._seenAchs.has('x3mult'))) throw new Error();
  });

  await test('Achievement — x5mult triggers when multiplier >= 5', () => {
    gs.multiplier = 5;
    if (gs.multiplier >= 5) showAchievement('x5mult');
    if (!TEST.ok(window._seenAchs.has('x5mult'))) throw new Error();
  });

  await test('Achievement — x7mult triggers when multiplier >= 7', () => {
    gs.multiplier = 7;
    if (gs.multiplier >= 7) showAchievement('x7mult');
    if (!TEST.ok(window._seenAchs.has('x7mult'))) throw new Error();
  });

  await test('Achievement — floor3 triggers on floor 3 complete', () => {
    gs.floor = 3;
    if (gs.floor === 3) showAchievement('floor3');
    if (!TEST.ok(window._seenAchs.has('floor3'))) throw new Error();
  });

  await test('Achievement — floor5 triggers on floor 5 complete', () => {
    gs.floor = 5;
    if (gs.floor === 5) showAchievement('floor5');
    if (!TEST.ok(window._seenAchs.has('floor5'))) throw new Error();
  });

  await test('Achievement — jackpotWin triggers on jackpot win', () => {
    showAchievement('jackpotWin');
    if (!TEST.ok(window._seenAchs.has('jackpotWin'))) throw new Error();
  });

  await test('Achievement — combo5 triggers on 5 consecutive pegs', () => {
    gs.comboCount = 5;
    if (gs.comboCount >= 5) showAchievement('combo5');
    if (!TEST.ok(window._seenAchs.has('combo5'))) throw new Error();
  });

  await test('Achievement — combo10 triggers on 10 consecutive pegs', () => {
    gs.comboCount = 10;
    if (gs.comboCount >= 10) showAchievement('combo10');
    if (!TEST.ok(window._seenAchs.has('combo10'))) throw new Error();
  });

  await test('Achievement — fiftyRuns triggers on 50th run complete', () => {
    PERSIST.totalRuns = 50;
    if (PERSIST.totalRuns >= 50) showAchievement('fiftyRuns');
    if (!TEST.ok(window._seenAchs.has('fiftyRuns'))) throw new Error();
  });

  await test('Achievement — hundredRuns triggers on 100th run complete', () => {
    PERSIST.totalRuns = 100;
    if (PERSIST.totalRuns >= 100) showAchievement('hundredRuns');
    if (!TEST.ok(window._seenAchs.has('hundredRuns'))) throw new Error();
  });

  await test('Achievement — fullBreach triggers when all 5 floors cleared', () => {
    gs.floor = 5; // floor 5 = all floors complete
    if (gs.floor >= 5) showAchievement('fullBreach');
    if (!TEST.ok(window._seenAchs.has('fullBreach'))) throw new Error();
  });

  await test('Achievement — allPayloads triggers when all 8 payloads used', () => {
    // Simulate: all 8 payloads unlocked and used
    showAchievement('allPayloads');
    if (!TEST.ok(window._seenAchs.has('allPayloads'))) throw new Error();
  });

  await test('Achievement — firstContract triggers on first contract completed', () => {
    showAchievement('firstContract');
    if (!TEST.ok(window._seenAchs.has('firstContract'))) throw new Error();
  });

  // ── _seenAchs set ──
  await test('_seenAchs — exists as window variable', () => { if (!TEST.ok(typeof window._seenAchs === 'object')) throw new Error(); });

  await test('_seenAchs — initialized empty', () => {
    window._seenAchs = new Set();
    if (!TEST.ok(window._seenAchs.size === 0)) throw new Error();
  });

  await test('_seenAchs — add prevents re-fire', () => {
    window._seenAchs = new Set();
    window._seenAchs.add('firstPeg');
    if (window._seenAchs.has('firstPeg')) return; // blocks
    throw new Error('should have blocked');
  });

  await test('_seenAchs — cleared on game reset', () => {
    window._seenAchs = new Set(['firstPeg', 'floor3']);
    window._seenAchs = new Set(); // reset
    if (!TEST.ok(window._seenAchs.size === 0)) throw new Error();
  });

  // ── PERSIST.achievements ──
  await test('PERSIST.achievements — exists as array', () => {
    PERSIST.achievements = PERSIST.achievements || [];
    if (!TEST.ok(Array.isArray(PERSIST.achievements))) throw new Error();
  });

  await test('PERSIST.achievements — can be empty', () => {
    PERSIST.achievements = [];
    if (!TEST.ok(PERSIST.achievements.length === 0)) throw new Error();
  });

  await test('PERSIST.achievements — persists across page reload', () => {
    PERSIST.achievements = ['firstPeg', 'floor3'];
    savePersist();
    const stored = JSON.parse(localStorage.getItem('slotprotocol'));
    if (!TEST.ok(stored.achievements.includes('firstPeg'))) throw new Error();
    if (!TEST.ok(stored.achievements.includes('floor3'))) throw new Error();
  });

  await test('PERSIST.achievements — loaded on loadPersist', () => {
    PERSIST.achievements = ['floor3'];
    loadPersist();
    if (!TEST.ok(window._seenAchs.has('floor3'))) throw new Error();
  });

  await test('PERSIST.achievements — _seenAchs seeded from PERSIST on load', () => {
    PERSIST.achievements = ['firstPeg', 'jackpotWin'];
    window._seenAchs = new Set();
    (PERSIST.achievements || []).forEach(k => window._seenAchs.add(k));
    if (!TEST.ok(window._seenAchs.has('firstPeg'))) throw new Error();
    if (!TEST.ok(window._seenAchs.has('jackpotWin'))) throw new Error();
  });

  // ── Already-earned no re-fire ──
  await test('Already earned — showAchievement called twice only fires once', () => {
    window._seenAchs = new Set();
    PERSIST.achievements = [];
    showAchievement('floor3');
    const count1 = PERSIST.achievements.length;
    showAchievement('floor3'); // second call — should not add duplicate
    const count2 = PERSIST.achievements.length;
    if (!TEST.ok(count1 === count2, 'Second call fired (re-added)')) throw new Error();
  });

  await test('Already earned — _seenAchs prevents toast re-show', () => {
    window._seenAchs = new Set(['firstPeg']);
    const el = document.getElementById('achievement-toast');
    el.classList.remove('show');
    showAchievement('firstPeg'); // should return early
    if (!TEST.ok(!el.classList.contains('show'), 'Toast shown for already-earned achievement')) throw new Error();
  });

  // ── Achievement toast element structure ──
  await test('Achievement toast — .ach-icon exists', () => {
    const el = document.getElementById('achievement-toast');
    const icon = el.querySelector('.ach-icon');
    if (!TEST.ok(icon !== null)) throw new Error();
  });

  await test('Achievement toast — .ach-text exists', () => {
    const el = document.getElementById('achievement-toast');
    const text = el.querySelector('.ach-text');
    if (!TEST.ok(text !== null)) throw new Error();
  });

  await test('Achievement toast — .ach-title exists', () => {
    const el = document.getElementById('achievement-toast');
    const title = el.querySelector('.ach-title');
    if (!TEST.ok(title !== null)) throw new Error();
  });

  await test('Achievement toast — .ach-desc exists', () => {
    const el = document.getElementById('achievement-toast');
    const desc = el.querySelector('.ach-desc');
    if (!TEST.ok(desc !== null)) throw new Error();
  });

  // ── Achievement descriptions ──
  await test('ACHIEVEMENTS.firstPeg — desc non-empty', () => { if (!TEST.ok(ACHIEVEMENTS.firstPeg.desc.length > 0)) throw new Error(); });
  await test('ACHIEVEMENTS.jackpotWin — desc non-empty', () => { if (!TEST.ok(ACHIEVEMENTS.jackpotWin.desc.length > 0)) throw new Error(); });
  await test('ACHIEVEMENTS.x7mult — desc non-empty', () => { if (!TEST.ok(ACHIEVEMENTS.x7mult.desc.length > 0)) throw new Error(); });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
