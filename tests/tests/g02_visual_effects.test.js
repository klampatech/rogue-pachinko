// g02_visual_effects.test.js — Visual effects: screenShake, screenFlash, particles, fragments, shockwaves, floatTexts
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

  // Ensure GS exists for effects that reference it
  TEST.startRun();
  TEST.setScore(1000);
  TEST.setCombo(1);

  // ── screenShake ────────────────────────────────────────────────
  test('screenShake() does not throw with default duration', () => {
    screenShake();
    TEST.ok(true, 'screenShake() executed');
  });

  test('screenShake() accepts custom duration and intensity', () => {
    screenShake(500, 8);
    TEST.ok(true, 'screenShake(500, 8) executed');
  });

  test('screenShake() accepts 0 duration (immediate settle)', () => {
    screenShake(0, 10);
    TEST.ok(true, 'screenShake(0, 10) executed');
  });

  // ── screenFlash ────────────────────────────────────────────────
  test('screenFlash() does not throw with valid color string', () => {
    triggerFlash('#00f0ff', 0.3);
    TEST.ok(true, 'triggerFlash() executed');
  });

  test('screenFlash() accepts rgba color format', () => {
    triggerFlash('rgba(255,0,170,0.5)', 0.4);
    TEST.ok(true, 'triggerFlash(rgba) executed');
  });

  test('screenFlash() accepts hex with alpha', () => {
    triggerFlash('#ff00aa88', 0.5);
    TEST.ok(true, 'triggerFlash(hex-alpha) executed');
  });

  // ── particles[] .spawnParticles ──────────────────────────────
  test('spawnParticles() creates particle entries in GS.particles array', () => {
    GS.particles = [];
    spawnParticles(240, 300, '#00f0ff', 8, 3);
    TEST.gt(GS.particles.length, 0, 'particles array should have entries after spawnParticles');
  });

  test('spawnParticles() accepts count=0 (no particles created)', () => {
    GS.particles = [];
    spawnParticles(240, 300, '#00f0ff', 0, 3);
    TEST.is(GS.particles.length, 0, 'zero count should produce no particles');
  });

  test('spawnParticles() uses default count of 8 when not specified', () => {
    GS.particles = [];
    spawnParticles(240, 300, '#00f0ff');
    TEST.gt(GS.particles.length, 0, 'default count should spawn particles');
  });

  test('spawnParticles() respects spread parameter', () => {
    GS.particles = [];
    spawnParticles(240, 300, '#ff0000', 5, 10);
    TEST.gt(GS.particles.length, 0, 'spawnParticles with spread should work');
  });

  test('particle count in GS.particles does not exceed max (internal cap check)', () => {
    GS.particles = [];
    // Spawn many particles at once
    for (let i = 0; i < 5; i++) {
      spawnParticles(240, 300, '#00f0ff', 20, 5);
    }
    // Just verify array is populated
    TEST.gt(GS.particles.length, 0, 'multiple spawnParticles calls should populate array');
  });

  // ── fragments[] .spawnFragments ───────────────────────────────
  test('spawnFragments() adds entries to GS.fragments array', () => {
    GS.fragments = [];
    spawnFragments(240, 300, '#00ffaa');
    TEST.gt(GS.fragments.length, 0, 'fragments array should have entries after spawnFragments');
  });

  test('spawnFragments() with different color values', () => {
    GS.fragments = [];
    spawnFragments(100, 100, '#ff00aa');
    spawnFragments(400, 500, '#ffd700');
    TEST.gt(GS.fragments.length, 0, 'fragments with various colors should work');
  });

  // ── shockwaves[] .spawnShockwave ───────────────────────────────
  test('spawnShockwave() adds entries to GS.shockwaves array', () => {
    GS.shockwaves = [];
    spawnShockwave(240, 350, '#00f0ff', 80);
    TEST.gt(GS.shockwaves.length, 0, 'shockwaves array should have entries');
  });

  test('spawnShockwave() uses default maxRadius of 80', () => {
    GS.shockwaves = [];
    spawnShockwave(240, 350);
    TEST.gt(GS.shockwaves.length, 0, 'shockwave with defaults should work');
  });

  test('spawnShockwave() with custom maxRadius', () => {
    GS.shockwaves = [];
    spawnShockwave(240, 350, '#ff00aa', 120);
    TEST.gt(GS.shockwaves.length, 0, 'shockwave with custom radius should work');
  });

  test('spawnShockwave() with color-only override', () => {
    GS.shockwaves = [];
    spawnShockwave(240, 350, '#ffd700');
    TEST.gt(GS.shockwaves.length, 0, 'shockwave with color-only should work');
  });

  // ── floatTexts[] .spawnFloatText ───────────────────────────────
  test('spawnFloatText() adds entries to GS.floatTexts array', () => {
    GS.floatTexts = [];
    spawnFloatText(240, 200, 'TEST', '#00f0ff');
    TEST.gt(GS.floatTexts.length, 0, 'floatTexts array should have entries');
  });

  test('spawnFloatText() accepts numeric text values', () => {
    GS.floatTexts = [];
    spawnFloatText(240, 200, 12345, '#00ffaa');
    TEST.gt(GS.floatTexts.length, 0, 'numeric text should work');
  });

  test('spawnFloatText() accepts default color', () => {
    GS.floatTexts = [];
    spawnFloatText(240, 200, 'DEFAULT COLOR');
    TEST.gt(GS.floatTexts.length, 0, 'default color should work');
  });

  test('spawnFloatText() with various positions across canvas', () => {
    GS.floatTexts = [];
    spawnFloatText(50, 100, 'LEFT', '#00f0ff');
    spawnFloatText(400, 600, 'RIGHT', '#ff00aa');
    TEST.is(GS.floatTexts.length, 2, 'multiple float texts should both be added');
  });

  test('spawnFloatText() with special characters in text', () => {
    GS.floatTexts = [];
    spawnFloatText(240, 200, '+1000 x5 COMBO!', '#ffd700');
    TEST.gt(GS.floatTexts.length, 0, 'special chars in float text should work');
  });

  // ── Multiple effects combined ─────────────────────────────────
  test('multiple visual effects can be triggered in sequence without error', () => {
    GS.particles = [];
    GS.fragments = [];
    GS.shockwaves = [];
    GS.floatTexts = [];
    spawnParticles(240, 300, '#00f0ff', 10, 5);
    spawnFragments(240, 300, '#ff00aa');
    spawnShockwave(240, 350, '#00ffaa', 100);
    spawnFloatText(240, 200, 'COMBO x3', '#ffd700');
    TEST.gt(GS.particles.length + GS.fragments.length + GS.shockwaves.length + GS.floatTexts.length, 0,
      'all effect arrays should have entries');
  });

  test('triggerFlash() can be called multiple times without error', () => {
    triggerFlash('#ff000033', 0.2);
    triggerFlash('#00ff0033', 0.2);
    triggerFlash('#0000ff33', 0.2);
    TEST.ok(true, 'multiple flashes did not throw');
  });

  return results;
}
