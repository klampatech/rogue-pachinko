import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5174';
const OUT_DIR = '/home/kyle/squad-output/rogue-pachinko-playtest-v3';
const AGENT = 'bert';

mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 520, height: 750 });

  const results = {
    agent: AGENT,
    tests: {},
    new_bugs_found: [],
    summary: ''
  };

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push('PAGEERROR: ' + err.message);
  });

  async function screenshot(name) {
    const path = `/tmp/${AGENT}-fail-${name}.png`;
    await page.screenshot({ path });
    return path;
  }

  async function getGameState() {
    return page.evaluate(() => {
      if (typeof GS === 'undefined') return { gsExists: false };
      return {
        gsExists: true,
        screen: GS.screen,
        balls: GS.balls,
        floor: GS.floor,
        inShop: !!document.getElementById('shop-overlay')?.classList.contains('active'),
        menuOverlayActive: !!document.getElementById('menu-overlay')?.classList.contains('active'),
        floorOverlayActive: !!document.getElementById('floor-overlay')?.classList.contains('active'),
        leaderboardActive: !!document.getElementById('leaderboard-overlay')?.classList.contains('active'),
      };
    });
  }

  async function startFreshRun() {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const errorsBefore = consoleErrors.length;

    // Click start button via evaluate
    await page.evaluate(() => {
      const btn = document.getElementById('start-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    const gsExists = await page.evaluate(() => typeof GS !== 'undefined').catch(() => false);

    // Dismiss tutorial
    await page.evaluate(() => {
      const tut = document.getElementById('tutorial-overlay');
      if (tut && tut.style.display !== 'none') {
        const dismiss = document.getElementById('tutorial-dismiss');
        if (dismiss) dismiss.click();
      }
    });
    await page.waitForTimeout(500);

    return gsExists;
  }

  // ===== TEST 1: CONTINUE Button (P0/P2) =====
  try {
    console.log('\n=== TEST 1: CONTINUE Button ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;

    if (!gsReady) {
      const loadError = consoleErrors.find(e => e.includes('PAGEERROR') || e.includes('Error'));
      results.tests.p0_continue_button = {
        result: 'FAIL',
        evidence: 'Game did not initialize. ' + (loadError ? 'Load error: ' + loadError : 'GS undefined after start click')
      };
      await screenshot('p0-gs-undefined');
    } else {
      const shopBtnId = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const shop = btns.find(b => b.textContent.trim() === 'SHOP' && b.id && !b.classList.contains('shop-tab'));
        return shop?.id ?? null;
      });

      let failures = 0, passes = 0;
      for (let i = 0; i < 4; i++) {
        if (shopBtnId) await page.click(`#${shopBtnId}`).catch(() => {});
        else await page.locator('button').filter({ hasText: /^SHOP$/ }).first().click().catch(() => {});
        await page.waitForTimeout(400);

        const shopBefore = (await getGameState())?.inShop ?? false;

        await page.locator('#shop-continue-btn, button:has-text("CONTINUE")').first().click().catch(() => {});
        await page.waitForTimeout(400);

        const shopAfter = (await getGameState())?.inShop ?? false;

        if (shopAfter) { failures++; console.log(`  FAIL iter ${i+1}`); }
        else { passes++; console.log(`  PASS iter ${i+1}`); }
        if (i < 3) await page.waitForTimeout(300);
      }

      results.tests.p0_continue_button = {
        result: failures === 0 ? 'PASS' : 'FAIL',
        evidence: `${passes}/4 CONTINUE clicks closed shop. ${failures > 0 ? `${failures}/4 failed.` : 'All passed.'}`
      };
      if (failures > 0) await screenshot('p0-continue');
    }
  } catch (e) {
    results.tests.p0_continue_button = { result: 'FAIL', evidence: e.message };
    await screenshot('p0-continue');
  }

  // ===== TEST 2: Leaderboard Leak (P1) =====
  try {
    console.log('\n=== TEST 2: Leaderboard Leak (P1) ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;
    if (!gsReady) { results.tests.p1_leaderboard_leak = { result: 'FAIL', evidence: 'Game did not initialize' }; }
    else {
      await page.waitForTimeout(2000);
      const lbLeaking = (await getGameState())?.leaderboardActive ?? false;
      results.tests.p1_leaderboard_leak = {
        result: lbLeaking ? 'FAIL' : 'PASS',
        evidence: lbLeaking ? 'Leaderboard active during floor play' : 'No leaderboard leak during floor play - PASS'
      };
      if (lbLeaking) await screenshot('p1-leaderboard-leak');
    }
  } catch (e) {
    results.tests.p1_leaderboard_leak = { result: 'FAIL', evidence: e.message };
    await screenshot('p1-leaderboard-leak');
  }

  // ===== TEST 3: Leaderboard during Floor Complete (P3) =====
  try {
    console.log('\n=== TEST 3: Leaderboard during Floor Complete (P3) ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;
    if (!gsReady) { results.tests.p3_leaderboard_during_floor_complete = { result: 'FAIL', evidence: 'Game did not initialize' }; }
    else {
      let floorCompleteSeen = false, lbLeaking = false;
      for (let i = 0; i < 20; i++) {
        const state = await getGameState();
        if (state?.floorOverlayActive) {
          floorCompleteSeen = true;
          lbLeaking = state?.leaderboardActive ?? false;
          console.log(`  Floor complete at drop ${i}, leaderboard: ${lbLeaking}`);
          break;
        }
        await page.evaluate(() => { if (typeof dropBall === 'function') dropBall(); });
        await page.waitForTimeout(800);
      }
      results.tests.p3_leaderboard_during_floor_complete = {
        result: floorCompleteSeen && lbLeaking ? 'FAIL' : (floorCompleteSeen ? 'PASS' : 'SKIP'),
        evidence: floorCompleteSeen ? `Floor complete. Leak: ${lbLeaking}. ${lbLeaking ? 'BUG!' : 'PASS'}` : `Floor not reached in 20 drops.`
      };
      if (floorCompleteSeen && lbLeaking) await screenshot('p3-leaderboard-floor-complete');
    }
  } catch (e) {
    results.tests.p3_leaderboard_during_floor_complete = { result: 'FAIL', evidence: e.message };
    await screenshot('p3-leaderboard-floor-complete');
  }

  // ===== TEST 4: endRun(false) TDZ (P4) =====
  try {
    console.log('\n=== TEST 4: endRun(false) TDZ (P4) ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;
    if (!gsReady) { results.tests.p4_endrun_tdz = { result: 'FAIL', evidence: 'Game did not initialize' }; }
    else {
      await page.evaluate(() => { if (typeof endRun === 'function') endRun(false); });
      await page.waitForTimeout(800);
      const tdzErrors = consoleErrors.filter(e => e.includes('isNewHighScore') || e.includes('TDZ') || e.includes('ReferenceError'));
      results.tests.p4_endrun_tdz = {
        result: tdzErrors.length > 0 ? 'FAIL' : 'PASS',
        evidence: tdzErrors.length > 0 ? `TDZ/RefError: ${tdzErrors.join('; ')}` : 'endRun(false) completed without TDZ errors.'
      };
      if (tdzErrors.length > 0) await screenshot('p4-endrun-tdz');
    }
  } catch (e) {
    results.tests.p4_endrun_tdz = { result: 'FAIL', evidence: e.message };
    await screenshot('p4-endrun-tdz');
  }

  // ===== TEST 5: Full Run Progression =====
  try {
    console.log('\n=== TEST 5: Full Run Progression ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;
    if (!gsReady) { results.tests.full_run_progression = { result: 'FAIL', evidence: 'Game did not initialize' }; }
    else {
      let lbLeak = false, floorCompleteSeen = false;
      for (let i = 0; i < 30; i++) {
        const state = await getGameState();
        if (state?.leaderboardActive && !state?.floorOverlayActive) { lbLeak = true; console.log('  LB leak'); }
        if (state?.floorOverlayActive) {
          floorCompleteSeen = true;
          console.log(`  Floor complete at drop ${i}`);
          if (state.leaderboardActive) { lbLeak = true; console.log('  LB leak during floor complete'); }
          break;
        }
        await page.evaluate(() => { if (typeof dropBall === 'function') dropBall(); });
        await page.waitForTimeout(700);
      }
      results.tests.full_run_progression = {
        result: !lbLeak ? 'PASS' : 'FAIL',
        evidence: !lbLeak ? (floorCompleteSeen ? 'No leaderboard leak. Floor progression working.' : 'No lb leak observed.') : 'Leaderboard leaked during floor transitions.'
      };
      if (lbLeak) await screenshot('p3-full-run');
    }
  } catch (e) {
    results.tests.full_run_progression = { result: 'FAIL', evidence: e.message };
    await screenshot('full-run-progression');
  }

  // ===== TEST 6: Shop Mid-Floor =====
  try {
    console.log('\n=== TEST 6: Shop Mid-Floor ===');
    const gsReady = await startFreshRun();
    consoleErrors.length = 0;
    if (!gsReady) { results.tests.shop_mid_floor = { result: 'FAIL', evidence: 'Game did not initialize' }; }
    else {
      await page.evaluate(() => { if (typeof dropBall === 'function') dropBall(); });
      await page.waitForTimeout(500);
      const shopBtnId = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const shop = btns.find(b => b.textContent.trim() === 'SHOP' && b.id && !b.classList.contains('shop-tab'));
        return shop?.id ?? null;
      });
      if (shopBtnId) await page.click(`#${shopBtnId}`).catch(() => {});
      await page.waitForTimeout(400);
      await page.locator('#shop-continue-btn, button:has-text("CONTINUE")').first().click().catch(() => {});
      await page.waitForTimeout(400);
      const s1 = await getGameState();
      const firstClosed = !(s1?.inShop ?? true);
      if (shopBtnId) await page.click(`#${shopBtnId}`).catch(() => {});
      await page.waitForTimeout(300);
      await page.locator('#shop-continue-btn, button:has-text("CONTINUE")').first().click().catch(() => {});
      await page.waitForTimeout(300);
      const s2 = await getGameState();
      const secondClosed = !(s2?.inShop ?? true);
      const works = firstClosed && secondClosed;
      results.tests.shop_mid_floor = {
        result: works ? 'PASS' : 'FAIL',
        evidence: `First close: ${firstClosed}, Second close: ${secondClosed}.`
      };
      if (!works) await screenshot('shop-mid-floor');
    }
  } catch (e) {
    results.tests.shop_mid_floor = { result: 'FAIL', evidence: e.message };
    await screenshot('shop-mid-floor');
  }

  await browser.close();

  const outPath = `${OUT_DIR}/${AGENT}.json`;
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nWritten to: ${outPath}`);
}

run().catch(e => { console.error(e); process.exit(1); });