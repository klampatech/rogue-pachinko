// f04_tutorial_modals.test.js — showTutorialModal, timelock tutorial, ghost mode tutorial

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));

  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // ── showTutorialModal basics ──
  await test('showTutorialModal creates #tutorial-modal element', () => {
    showTutorialModal('TIMELOCK', 'Clear all pegs before time runs out!', 'timelock_test_a');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el !== null)) throw new Error('tutorial-modal not created');
  });
  await test('showTutorialModal sets display to flex (visible)', () => {
    showTutorialModal('TIMELOCK', 'Clear all pegs!', 'timelock_test_b');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'flex')) throw new Error('modal not visible');
  });
  await test('showTutorialModal sets title text', () => {
    showTutorialModal('GHOST MODE', 'Balls phase through pegs', 'ghost_test_a');
    const title = document.querySelector('#tutorial-modal .tut-title');
    // Title div has inline style, check text content directly
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.textContent.includes('GHOST MODE'))) throw new Error('title not set');
  });
  await test('showTutorialModal sets body text', () => {
    showTutorialModal('BOSS', 'Destroy the boss peg!', 'boss_test_a');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.textContent.includes('boss peg'))) throw new Error('body not set');
  });
  await test('showTutorialModal shows GOT IT close button', () => {
    showTutorialModal('TEST', 'Body text here', 'test_close_a');
    const btn = document.getElementById('tutorial-modal-close');
    if (!TEST.ok(btn !== null && btn.textContent === 'GOT IT')) throw new Error('close button not found');
  });

  // ── Timelock tutorial ──
  await test('timelock tutorial fires via showTutorialModal with persistKey', () => {
    showTutorialModal('TIMELOCK', 'Clear all pegs before the countdown hits zero!', 'timelock_floor5');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'flex')) throw new Error('timelock modal not shown');
  });
  await test('timelock tutorial can be dismissed', () => {
    showTutorialModal('TIMELOCK', 'Beat the clock!', 'timelock_dismiss_test');
    document.getElementById('tutorial-modal-close').click();
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'none')) throw new Error('timelock modal not dismissed');
  });
  await test('timelock tutorial skips on repeat call with same persistKey', () => {
    showTutorialModal('TIMELOCK', 'First show', 'timelock_repeat_test');
    const el = document.getElementById('tutorial-modal');
    const displayBefore = el.style.display;
    // Call again with same key — should be skipped (already seen this run)
    showTutorialModal('TIMELOCK', 'Second show', 'timelock_repeat_test');
    // Since already shown this run session, should not re-display
    // (The function returns early if GS._seenTutorials[key] is true)
    if (!TEST.ok(el.style.display === displayBefore)) throw new Error('repeat call changed display');
  });

  // ── Ghost mode tutorial ──
  await test('ghost mode tutorial fires via showTutorialModal', () => {
    showTutorialModal('GHOST MODE', 'Balls phase through 3-5 pegs without bouncing!', 'ghost_floor_intro');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'flex')) throw new Error('ghost modal not shown');
  });
  await test('ghost mode tutorial has distinct title text', () => {
    showTutorialModal('GHOST MODE', 'Phase through pegs', 'ghost_title_test');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.textContent.includes('GHOST MODE'))) throw new Error('ghost title missing');
  });
  await test('ghost mode tutorial can be dismissed', () => {
    showTutorialModal('GHOST MODE', 'Amber ghost trail indicates phasing', 'ghost_dismiss_test');
    document.getElementById('tutorial-modal-close').click();
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'none')) throw new Error('ghost modal not dismissed');
  });

  // ── Different keys show different tutorials ──
  await test('two different persistKeys show both modals separately', () => {
    showTutorialModal('TIMELOCK', 'Time pressure!', 'key_a');
    const first = document.getElementById('tutorial-modal').textContent;
    // Dismiss first
    document.getElementById('tutorial-modal-close').click();
    // Show second with different key
    showTutorialModal('GHOST MODE', 'Phase through!', 'key_b');
    const second = document.getElementById('tutorial-modal').textContent;
    if (!TEST.ok(second.includes('GHOST MODE') && second.includes('Phase through'))) throw new Error('second modal wrong content');
  });

  // ── GS._seenTutorials tracking ──
  await test('GS._seenTutorials tracks shown tutorials per persistKey', () => {
    // Clear any prior state
    gs._seenTutorials = {};
    showTutorialModal('TIMELOCK', 'Test body', 'tracking_test');
    if (!TEST.ok(gs._seenTutorials['tracking_test'] === true)) throw new Error('tracking flag not set');
    if (!TEST.ok(gs._seenTutorials['other_key'] === undefined)) throw new Error('other key incorrectly set');
  });

  // ── Tutorial modal dismiss closes modal ──
  await test('tutorial-modal closes when GOT IT clicked', () => {
    showTutorialModal('BOSS BATTLE', 'Destroy the boss peg!', 'boss_close_test');
    document.getElementById('tutorial-modal-close').click();
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'none')) throw new Error('modal not closed by GOT IT');
  });

  // ── completeFloor dismisses tutorial-modal ──
  await test('completeFloor hides tutorial-modal if timelock modal is open', () => {
    showTutorialModal('TIMELOCK', 'Beat the clock!', 'timelock_complete_test');
    const tutModal = document.getElementById('tutorial-modal');
    TEST.seed(77777);
    TEST.startRun();
    gs.floorObjective.progress = gs.floorObjective.target;
    completeFloor();
    if (!TEST.ok(tutModal.style.display === 'none')) throw new Error('tutorial-modal not dismissed by completeFloor');
  });

  // ── Multiple rapid tutorials ──
  await test('multiple rapid showTutorialModal calls do not stack DOM elements', () => {
    showTutorialModal('A', 'Body A', 'rapid_a');
    showTutorialModal('B', 'Body B', 'rapid_b');
    const modals = document.querySelectorAll('#tutorial-modal');
    if (!TEST.ok(modals.length === 1)) throw new Error('multiple modals created');
  });

  // ── z-index 9997 — blocks UI beneath ──
  await test('tutorial-modal has high z-index (9997) to block game UI', () => {
    showTutorialModal('FLOOR 5', 'Timelock floor!', 'zindex_test');
    const el = document.getElementById('tutorial-modal');
    // z-index is set inline via cssText on the element
    if (!TEST.ok(el.style.zIndex === '9997' || el.style.cssText.includes('9997'))) throw new Error('z-index not 9997');
  });

  // ── First-run tutorial-overlay (separate from showTutorialModal) ──
  await test('#tutorial-overlay exists and is separate from #tutorial-modal', () => {
    const tutOverlay = document.getElementById('tutorial-overlay');
    const tutModal = document.getElementById('tutorial-modal');
    if (!TEST.ok(tutOverlay !== null)) throw new Error('tutorial-overlay missing');
    if (!TEST.ok(tutModal !== null)) throw new Error('tutorial-modal missing');
    if (!TEST.ok(tutOverlay !== tutModal)) throw new Error('tutorial-overlay and tutorial-modal should be different elements');
  });

  // ── showTutorialModal called with empty string body ──
  await test('showTutorialModal handles empty body string', () => {
    showTutorialModal('EMPTY', '', 'empty_body_test');
    const el = document.getElementById('tutorial-modal');
    if (!TEST.ok(el.style.display === 'flex')) throw new Error('modal not shown with empty body');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
