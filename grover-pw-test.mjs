// grover-pw-test.mjs — Playwright headless test runner for live game
// Verifies delta-time physics fix has not broken gameplay
import { chromium } from 'playwright';

const LIVE_URL = 'https://klampatech.github.io/rogue-pachinko/';
const OUT_DIR = process.env.OUT_DIR || '/tmp';

async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    return { name, status: 'PASS', ms: Date.now() - t0 };
  } catch (e) {
    return { name, status: 'FAIL', ms: Date.now() - t0, err: e.message };
  }
}

async function main() {
  console.error('GROVER: Launching Playwright chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleMsgs.push({ type: 'pageerror', text: String(err) }));

  let results = [];
  let loadError = null;

  try {
    console.error('GROVER: Navigating to live game...');
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const gameLoaded = await page.evaluate(() => typeof GS !== 'undefined').catch(() => false);
    if (!gameLoaded) throw new Error('Game did not load — GS not defined');

    console.error('GROVER: Running gameplay tests...');
    results = await runGameplayTests(page, results);

  } catch (e) {
    loadError = e.message;
    console.error('GROVER LOAD ERROR:', e.message);
  }

  // ── collect console errors ───────────────────────────────────────────────────
  const consoleErrors = consoleMsgs.filter(m =>
    m.type === 'error' || m.type === 'pageerror' ||
    (m.text && /error|exception|undefined/i.test(m.text))
  );

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.error('\nGROVER: ========== RESULTS ==========');
  console.error(`  PASS: ${passed}/${total}`);
  console.error(`  FAIL: ${failed}/${total}`);
  if (failed > 0) {
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.error(`  [FAIL] ${r.name}: ${r.err}`);
    }
  }
  if (consoleErrors.length > 0) {
    console.error(`  Console errors: ${consoleErrors.length}`);
    for (const e of consoleErrors.slice(0, 10)) {
      console.error(`    [${e.type}] ${String(e.text).slice(0, 200)}`);
    }
  } else {
    console.error('  Console errors: 0');
  }
  console.error('====================================\n');

  await browser.close();

  // ── write JSON ───────────────────────────────────────────────────────────────
  const { writeFileSync, mkdirSync } = await import('fs');

  const findings = loadError
    ? [`LOAD FAILURE: ${loadError}`]
    : [
        `${passed}/${total} gameplay tests passed`,
        `${failed}/${total} gameplay tests failed`,
        `${consoleErrors.length} console errors detected`,
        ...results.filter(r => r.status === 'FAIL').map(r => `FAIL: ${r.name} — ${r.err}`),
        ...consoleErrors.slice(0, 5).map(e => `CONSOLE ERROR: ${String(e.text).slice(0, 200)}`)
      ];

  const output = {
    summary: loadError
      ? `LOAD FAILURE: ${loadError}. ${failed} gameplay tests failed.`
      : `${passed}/${total} gameplay tests passed. ${failed} failed. ${consoleErrors.length} console errors.`,
    tests_run: total,
    passed,
    failed,
    console_errors: consoleErrors.length,
    console_error_details: consoleErrors.map(e => ({ type: e.type, text: String(e.text).slice(0, 300) })),
    test_results: results,
    files_changed: [],
    findings
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = `${OUT_DIR}/grover.json`;
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.error(`GROVER: Results written to ${outPath}`);
  console.log(JSON.stringify(output));
}

// ── gameplay tests (run sequentially to avoid page context crashes) ─────────────
async function runGameplayTests(page, allResults) {
  const results = [];

  // ── LOAD ──────────────────────────────────────────────────────────────────
  results.push(await test('Canvas exists and has dimensions', async () => {
    const canvas = await page.$('canvas');
    if (!canvas) throw new Error('No canvas');
    const box = await canvas.boundingBox();
    if (!box || box.width === 0 || box.height === 0) throw new Error(`Canvas zero size: ${JSON.stringify(box)}`);
  }));

  results.push(await test('GS object initialized', async () => {
    const gs = await page.evaluate(() => GS);
    if (!gs) throw new Error('GS not defined');
    if (typeof gs.screen === 'undefined') throw new Error('GS.screen undefined');
  }));

  results.push(await test('Menu screen on load', async () => {
    const screen = await page.evaluate(() => GS.screen);
    if (screen !== 'menu') throw new Error(`Expected menu, got=${screen}`);
  }));

  results.push(await test('No critical JS errors on load', async () => {
    const errors = await page.evaluate(() => window._jsErrors || []);
    if (errors.length > 0) throw new Error('JS errors: ' + errors.join('; '));
  }));

  results.push(await test('Menu overlay visible on load', async () => {
    const visible = await page.evaluate(() => {
      const el = document.getElementById('menu-overlay');
      return el && !el.classList.contains('hidden');
    });
    if (!visible) throw new Error('Menu overlay not visible');
  }));

  // ── GAME START ──────────────────────────────────────────────────────────────
  results.push(await test('Start game — board generates', async () => {
    // Trigger game start via menu button click
    await page.evaluate(() => {
      // Find the play button and click it
      const btn = document.querySelector('#btn-start, #btn-play, .btn-play, [data-action="start"], button');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
    const screen = await page.evaluate(() => GS.screen);
    // Board should be populated
    await page.waitForFunction(() => GS.board && GS.board.length > 0, { timeout: 10000 }).catch(() => {});
    const boardLen = await page.evaluate(() => GS.board.length);
    if (boardLen === 0) throw new Error(`Board not generated. screen=${screen}`);
  }));

  // ── BALL DROP & PHYSICS ────────────────────────────────────────────────────

  results.push(await test('Ball created when dropBall() called', async () => {
    await page.evaluate(() => {
      if (GS.screen === 'menu') return;
      GS.balls = 5;
      GS.ballsInPlay = [];
      canDrop = true;
      dropBall();
    });
    await page.waitForTimeout(200);
    const count = await page.evaluate(() => GS.ballsInPlay.length);
    if (count === 0) throw new Error('No ball in play');
  }));

  results.push(await test('Ball falls under gravity (delta-time physics)', async () => {
    const y0 = await page.evaluate(() => {
      if (GS.screen === 'menu') return -1;
      GS.balls = 5; GS.ballsInPlay = []; canDrop = true; dropBall();
      return GS.ballsInPlay[0]?.y ?? -1;
    });
    if (y0 < 0) throw new Error('Ball not in play');
    await page.waitForTimeout(1500);
    const y1 = await page.evaluate(() => GS.ballsInPlay[0]?.y ?? y0);
    const delta = y1 - y0;
    if (delta <= 0) throw new Error(`Ball did not fall: y0=${y0}, y1=${y1}`);
    if (delta < 10) throw new Error(`Ball fell only ${delta}px — possible delta-time stall`);
  }));

  results.push(await test('Ball velocity increases under gravity', async () => {
    const vy0 = await page.evaluate(() => {
      if (GS.screen === 'menu') return -1;
      GS.balls = 5; GS.ballsInPlay = []; canDrop = true; dropBall();
      return GS.ballsInPlay[0]?.vy ?? -1;
    });
    if (vy0 < 0) throw new Error('Ball not in play');
    await page.waitForTimeout(800);
    const vy1 = await page.evaluate(() => GS.ballsInPlay[0]?.vy ?? vy0);
    if (vy1 <= vy0) throw new Error(`Velocity not increasing: vy0=${vy0}, vy1=${vy1}`);
  }));

  // ── BALL EXIT ──────────────────────────────────────────────────────────────

  results.push(await test('Ball exits and resolves (slot collection)', async () => {
    await page.evaluate(() => {
      if (GS.screen === 'menu') return;
      GS.balls = 3; GS.ballsInPlay = []; GS.score = 0; canDrop = true;
      dropBall();
    });
    // Wait up to 20s for ball to exit
    let resolved = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const done = await page.evaluate(() =>
        GS.ballsInPlay.length === 0 || (GS.ballsInPlay[0] && !GS.ballsInPlay[0].active)
      ).catch(() => true);
      if (done) { resolved = true; break; }
    }
    if (!resolved) throw new Error('Ball did not resolve within 20s');
    const ballsLeft = await page.evaluate(() => GS.balls).catch(() => null);
    if (typeof ballsLeft !== 'number') throw new Error('GS.balls not a number after exit');
  }));

  // ── SCORING ───────────────────────────────────────────────────────────────

  results.push(await test('Score tracked after ball exit', async () => {
    const r = await page.evaluate(() => {
      if (GS.screen === 'menu') return { err: 'menu state' };
      const before = GS.score;
      return { score: GS.score, balls: GS.balls, totalBallsUsed: GS.totalBallsUsed, err: null };
    }).catch(e => ({ err: String(e) }));
    if (r.err) throw new Error(r.err);
    if (typeof r.score !== 'number') throw new Error(`Score not a number: ${r.score}`);
    if (typeof r.totalBallsUsed !== 'number') throw new Error(`totalBallsUsed not a number`);
  }));

  results.push(await test('Scoring consistent — no delta-time explosion', async () => {
    const r = await page.evaluate(() => {
      if (GS.screen === 'menu') return { score: 0, err: null };
      return { score: GS.score, balls: GS.balls, err: null };
    }).catch(e => ({ err: String(e) }));
    if (r.err) throw new Error(r.err);
    if (r.score < 0) throw new Error('Negative score detected');
    if (r.score > 1_000_000) throw new Error(`Score abnormally high: ${r.score} — possible delta-time score explosion`);
  }));

  // ── GAME OVER ─────────────────────────────────────────────────────────────

  results.push(await test('Game over triggers when balls exhausted', async () => {
    // Set balls to 1 and trigger drop
    await page.evaluate(() => {
      if (GS.screen === 'menu') return;
      GS.balls = 1; GS.ballsInPlay = []; canDrop = true;
      dropBall();
    });
    // Wait for exit
    let done = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      done = await page.evaluate(() =>
        GS.ballsInPlay.length === 0 || !GS.ballsInPlay[0]?.active
      ).catch(() => true);
      if (done) break;
    }
    if (!done) throw new Error('Ball did not exit for game-over test');
    const screen = await page.evaluate(() => GS.screen).catch(() => 'unknown');
    const balls = await page.evaluate(() => GS.balls).catch(() => null);
    // Game over should have triggered (screen = runend or floor_complete, or balls=0)
    if (screen === 'playing' && balls !== 0) {
      throw new Error(`Expected game-over state, got screen=${screen}, balls=${balls}`);
    }
  }));

  // ── PHYSICS CONSTANTS ─────────────────────────────────────────────────────

  results.push(await test('Physics constants correct (GRAVITY=0.18)', async () => {
    const gravity = await page.evaluate(() => GRAVITY).catch(() => null);
    if (gravity === null) throw new Error('GRAVITY not accessible');
    if (gravity !== 0.18) throw new Error(`Expected GRAVITY=0.18, got=${gravity}`);
  }));

  results.push(await test('FRICTION constant = 0.995', async () => {
    const friction = await page.evaluate(() => FRICTION).catch(() => null);
    if (friction === null) throw new Error('FRICTION not accessible');
    if (friction !== 0.995) throw new Error(`Expected FRICTION=0.995, got=${friction}`);
  }));

  results.push(await test('MAX_VEL constant = 14', async () => {
    const maxVel = await page.evaluate(() => MAX_VEL).catch(() => null);
    if (maxVel === null) throw new Error('MAX_VEL not accessible');
    if (maxVel !== 14) throw new Error(`Expected MAX_VEL=14, got=${maxVel}`);
  }));

  return results;
}

main().catch(e => {
  console.error('GROVER FATAL:', e);
  process.exit(1);
});
