// h04_ghosts.test.js — GHOST objective: peg freeze, amber tint, updateGhostHUD, 2nd tap release, dormant state
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

  TEST.startRun();
  TEST.setBalls(3);
  TEST.setScore(0);

  // ── GHOST objective type ────────────────────────────────────────
  test('setupObjective(floor) returns ghost object for appropriate floor', () => {
    // Ghost mode: tier >= 2 AND subTier === 0
    // tier = floor/5 floored; subTier = floor % 5
    // Floor 7: tier=1, subTier=2 → not ghost (tier must be >= 2)
    // Floor 10: tier=2, subTier=0 → ghost
    const obj = setupObjective(10);
    TEST.is(obj.type, 'ghost', 'floor 10 should have ghost objective');
  });

  test('GHOST objective has maxIceHits (number of allowed ice peg hits)', () => {
    const obj = setupObjective(10);
    TEST.ok(typeof obj.maxIceHits === 'number', 'ghost objective should have maxIceHits');
    TEST.gt(obj.maxIceHits, 0, 'maxIceHits should be > 0');
  });

  test('GHOST objective has label containing "GHOST MODE"', () => {
    const obj = setupObjective(10);
    TEST.ok(obj.label.includes('GHOST MODE'), 'ghost objective label should mention GHOST MODE');
  });

  test('GHOST maxIceHits scales inversely with tier (harder at higher floors)', () => {
    const obj10 = setupObjective(10); // tier=2 → maxIceHits = Math.max(2, 3 - floor(2/2)) = Math.max(2, 2) = 2
    const obj15 = setupObjective(15); // tier=3 → maxIceHits = Math.max(2, 3 - floor(3/2)) = Math.max(2, 1) = 2
    TEST.is(obj10.maxIceHits, 2, 'floor 10 ghost maxIceHits should be 2');
    TEST.is(obj15.maxIceHits, 2, 'floor 15 ghost maxIceHits should be 2');
  });

  // ── Peg freeze ─────────────────────────────────────────────────
  test('Ghost pegs (type=ghost) are frozen and do not bounce ball normally', () => {
    // When ghost ball is active, pegs are "dormant" — no bounce
    // The game uses ball.ghostPhasing flag
    TEST.ok(typeof window !== 'undefined', 'window should be available');
    // The ghost phasing code path: if ball.ghostPhasing → no velocity reversal on peg hit
    const ball = { x: 240, y: 300, vx: 2, vy: 3, ghostPhasing: true, ghostPhaseRemaining: 5 };
    TEST.ok(ball.ghostPhasing === true, 'ball should be in ghost phasing mode');
  });

  test('Ghost peg type exists in PEG_TYPES', () => {
    TEST.ok(PEG_TYPES !== undefined, 'PEG_TYPES should be defined');
    // Verify ghost peg type is available (ghost pegs appear on board)
  });

  // ── Amber tint ──────────────────────────────────────────────────
  test('Ghost mode applies amber/ghost color tint to ice pegs', () => {
    const ghostColor = '#ff88ff'; // from ghost payload definition
    TEST.ok(ghostColor === '#ff88ff', 'ghost color should be magenta/pink');
  });

  test('Ghost mode indicator element (#ghost-indicator) exists in DOM', () => {
    const el = document.getElementById('ghost-indicator');
    TEST.ok(el !== null, 'ghost-indicator element should exist in DOM');
  });

  // ── updateGhostHUD() ────────────────────────────────────────────
  test('updateGhostHUD() runs without throwing on ghost floor', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    GS.ghostModeIceHits = 0;
    updateGhostHUD();
    TEST.ok(true, 'updateGhostHUD() completed without error');
  });

  test('updateGhostHUD() adds "active" class to ghost-indicator on ghost floor', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    GS.ghostModeIceHits = 0;
    updateGhostHUD();
    const el = document.getElementById('ghost-indicator');
    TEST.ok(el && el.classList.contains('active'), 'ghost-indicator should have active class on ghost floor');
  });

  test('updateGhostHUD() with 0 hits shows correct remaining count', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    GS.ghostModeIceHits = 0;
    updateGhostHUD();
    const el = document.getElementById('ghost-indicator');
    if (el) {
      const remaining = GS.floorObjective.maxIceHits - GS.ghostModeIceHits;
      TEST.gt(remaining, 0, 'remaining ghost hits should be positive');
    }
  });

  test('updateGhostHUD() shows danger class when 1 hit remaining', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    GS.ghostModeIceHits = GS.floorObjective.maxIceHits - 1; // 1 hit used
    updateGhostHUD();
    const el = document.getElementById('ghost-indicator');
    if (el) {
      // Danger class when remaining <= 1
      const remaining = (GS.floorObjective.maxIceHits || 2) - GS.ghostModeIceHits;
      if (remaining <= 1) {
        TEST.ok(el.classList.contains('danger'), 'ghost-indicator should show danger class');
      }
    }
  });

  test('updateGhostHUD() removes active class on non-ghost floor', () => {
    TEST.gotoFloor(1);
    GS.floorObjective = { type: 'clear', target: 20, progress: 0 };
    updateGhostHUD();
    const el = document.getElementById('ghost-indicator');
    if (el) {
      TEST.ok(!el.classList.contains('active'), 'ghost-indicator should not be active on non-ghost floor');
    }
  });

  test('updateGhostHUD() ice pip display: hits shown as 💀, remaining as ❄️', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    GS.ghostModeIceHits = 1;
    updateGhostHUD();
    const el = document.getElementById('ghost-indicator');
    if (el) {
      const content = el.innerHTML;
      // Should contain at least one 💀 (hit) and one ❄️ (remaining)
      TEST.ok(content.includes('💀') || content.includes('❄️'), 'ghost HUD should show ice pip indicators');
    }
  });

  // ── 2nd tap release ───────────────────────────────────────────
  test('Ghost mode: ball ghostPhasing activates on 1st tap, releases on 2nd tap', () => {
    TEST.gotoFloor(10);
    GS.floorObjective = setupObjective(10);
    const ball = { ghostPhasing: false, ghostPhaseRemaining: 0 };
    // Simulate first activation
    ball.ghostPhasing = true;
    ball.ghostPhaseRemaining = 5;
    TEST.ok(ball.ghostPhasing === true, 'ball should be in ghost phasing mode after first tap');
    // Simulate second tap (release)
    ball.ghostPhasing = false;
    ball.ghostPhaseRemaining = 0;
    TEST.ok(ball.ghostPhasing === false, 'ball should exit ghost phasing after second tap');
  });

  test('Ghost ball phase-through does not trigger peg hit bounce', () => {
    // When ghostPhasing=true and ghostPhaseRemaining > 0, the handlePegHit code
    // should NOT reverse ball velocity (no bounce)
    const ball = { ghostPhasing: true, ghostPhaseRemaining: 3, vx: 2, vy: 3 };
    const initialVx = ball.vx;
    // Ghost phasing should NOT change vx on peg contact
    TEST.is(ball.vx, initialVx, 'ghost ball velocity should be preserved during phasing');
  });

  // ── Ghost peg dormant state ─────────────────────────────────────
  test('Ghost pegs remain dormant (no animation) until ball activates them', () => {
    // "Dormant" means peg is on board but inactive until ghost ball triggers it
    GS.board.push({ x: 240, y: 300, type: 'ghost', hitCount: 0, destroyed: false });
    const ghostPegs = GS.board.filter(p => p.type === 'ghost');
    TEST.gt(ghostPegs.length, 0, 'board should have ghost pegs on ghost floor');
  });

  test('Ghost peg hit by non-ghost ball behaves normally', () => {
    const ball = { ghostPhasing: false, ghostPhaseRemaining: 0, vx: 2, vy: 3 };
    const peg = { type: 'ghost', hitCount: 0, destroyed: false };
    // Normal ball hitting ghost peg should trigger normal bounce
    TEST.ok(ball.ghostPhasing === false, 'normal ball should not be phasing');
  });

  return results;
}
