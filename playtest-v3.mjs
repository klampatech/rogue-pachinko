import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5174';
const OUT_DIR = '/home/kyle/squad-output/rogue-pachinko-playtest-v3';

mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    agent: 'elmo',
    tests: {},
    new_bugs_found: [],
    summary: ''
  };

  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  async function screenshot(name) {
    try {
      await page.screenshot({ path: `/tmp/elmo-fail-${name}.png` });
    } catch(e) {}
  }

  async function dismissTutorial() {
    await page.evaluate(() => {
      const t = document.getElementById('tutorial-overlay');
      if (t && t.style.display !== 'none') {
        t.style.display = 'none';
        if (typeof PERSIST !== 'undefined') PERSIST.hasSeenTutorial = true;
      }
    });
    await page.waitForTimeout(100);
  }

  // === TEST 1: CONTINUE Button (P0/P2) ===
  try {
    await page.goto(BASE_URL, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Start game
    await page.evaluate(() => { document.getElementById('start-btn')?.click(); });
    await page.waitForTimeout(800);
    await dismissTutorial();
    
    const gsScreenAfterStart = await page.evaluate(() => typeof GS !== 'undefined' ? GS.screen : 'undef');
    
    // Open shop
    await page.evaluate(() => { document.getElementById('shop-btn')?.click(); });
    await page.waitForTimeout(500);
    
    const shopActive = await page.evaluate(() => document.getElementById('shop-overlay')?.classList.contains('active'));
    
    // Click CONTINUE
    await page.evaluate(() => { document.getElementById('shop-continue-btn')?.click(); });
    await page.waitForTimeout(300);
    
    const shopAfterCont = await page.evaluate(() => document.getElementById('shop-overlay')?.classList.contains('active'));
    
    // Test 4 iterations
    let failures = 0;
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => { document.getElementById('shop-btn')?.click(); });
      await page.waitForTimeout(400);
      
      const before = await page.evaluate(() => 
        document.getElementById('shop-overlay')?.classList.contains('active')
      );
      
      await page.evaluate(() => { document.getElementById('shop-continue-btn')?.click(); });
      await page.waitForTimeout(250);
      
      const after = await page.evaluate(() => 
        document.getElementById('shop-overlay')?.classList.contains('active')
      );
      
      if (after === before) failures++;
    }
    
    results.tests.p0_continue_button = {
      result: failures === 0 ? 'PASS' : 'FAIL',
      evidence: `Shop closed on ${4-failures}/4 clicks. GS.screen after start: ${gsScreenAfterStart}, Shop opened: ${shopActive}, Closed after CONTINUE: ${!shopAfterCont}`
    };
  } catch (e) {
    results.tests.p0_continue_button = { result: 'FAIL', evidence: e.message };
    await screenshot('p0');
  }

  // === TEST 2: Leaderboard Leak (P1/P3) ===
  consoleErrors.length = 0;
  try {
    await page.goto(BASE_URL, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => { document.getElementById('start-btn')?.click(); });
    await page.waitForTimeout(800);
    await dismissTutorial();
    
    const lbLeaking = await page.evaluate(() => {
      const lb = document.getElementById('leaderboard-overlay');
      return lb && !lb.classList.contains('hidden') && lb.style.display !== 'none';
    });
    
    for (let i = 0; i < 12; i++) {
      await page.evaluate((xPos) => {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          canvas.dispatchEvent(new MouseEvent('click', { clientX: rect.left + xPos, clientY: rect.top + 80, bubbles: true }));
        }
      }, 120 + (i * 25));
      await page.waitForTimeout(700);
    }
    
    await page.waitForTimeout(1500);
    
    const lbAfterPlay = await page.evaluate(() => {
      const lb = document.getElementById('leaderboard-overlay');
      return lb && !lb.classList.contains('hidden') && lb.style.display !== 'none';
    });
    
    const floorCompleteVisible = await page.evaluate(() => {
      const fc = document.getElementById('floor-overlay');
      return fc && fc.classList.contains('active');
    });
    
    results.tests.p1_leaderboard_leak = {
      result: lbLeaking ? 'FAIL' : 'PASS',
      evidence: lbLeaking ? 'Leaderboard visible at start of run' : 'No leaderboard leak at game start'
    };
    
    results.tests.p3_leaderboard_during_floor_complete = {
      result: floorCompleteVisible ? (lbAfterPlay ? 'FAIL' : 'PASS') : 'SKIP',
      evidence: floorCompleteVisible 
        ? (lbAfterPlay ? 'Leaderboard leaking during floor complete overlay' : 'Floor complete shown cleanly') 
        : 'Floor not completed within test window'
    };
  } catch (e) {
    results.tests.p1_leaderboard_leak = { result: 'FAIL', evidence: e.message };
    results.tests.p3_leaderboard_during_floor_complete = { result: 'FAIL', evidence: e.message };
    await screenshot('p1_p3');
  }

  // === TEST 3: endRun(false) TDZ (P4) ===
  consoleErrors.length = 0;
  try {
    await page.goto(BASE_URL, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => { document.getElementById('start-btn')?.click(); });
    await page.waitForTimeout(800);
    await dismissTutorial();
    
    await page.evaluate(() => {
      try { if (typeof endRun === 'function') endRun(false); } catch(e) { console.error(e.message); }
    });
    await page.waitForTimeout(600);
    
    const relevantErrors = consoleErrors.filter(e => 
      e.includes('isNewHighScore') || e.includes('TDZ') || e.includes('ReferenceError')
    );
    
    results.tests.p4_endrun_tdz = {
      result: relevantErrors.length === 0 ? 'PASS' : 'FAIL',
      evidence: relevantErrors.length > 0 
        ? `Errors: ${relevantErrors.join(' | ')}` 
        : 'No TDZ/ReferenceError on endRun(false)'
    };
  } catch (e) {
    results.tests.p4_endrun_tdz = { result: 'FAIL', evidence: e.message };
    await screenshot('p4');
  }

  // === TEST 4: Full Run Progression ===
  consoleErrors.length = 0;
  try {
    await page.goto(BASE_URL, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => { document.getElementById('start-btn')?.click(); });
    await page.waitForTimeout(800);
    await dismissTutorial();
    
    for (let i = 0; i < 15; i++) {
      await page.evaluate((xPos) => {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          canvas.dispatchEvent(new MouseEvent('click', { clientX: rect.left + xPos, clientY: rect.top + 80, bubbles: true }));
        }
      }, 100 + Math.random() * 280);
      await page.waitForTimeout(500);
    }
    
    const shopOk = await page.evaluate(() => !!document.getElementById('shop-btn'));
    const noErrors = consoleErrors.filter(e => e.includes('Error') || e.includes('Exception')).length === 0;
    
    results.tests.full_run_progression = {
      result: (shopOk && noErrors) ? 'PASS' : 'FAIL',
      evidence: `Shop HUD present: ${shopOk}, No JS errors: ${noErrors}`
    };
  } catch (e) {
    results.tests.full_run_progression = { result: 'FAIL', evidence: e.message };
    await screenshot('full_run');
  }

  // === TEST 5: Shop Mid-Floor ===
  consoleErrors.length = 0;
  try {
    await page.goto(BASE_URL, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => { document.getElementById('start-btn')?.click(); });
    await page.waitForTimeout(800);
    await dismissTutorial();
    
    await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', { clientX: rect.left + 240, clientY: rect.top + 120, bubbles: true }));
      }
    });
    await page.waitForTimeout(400);
    
    await page.evaluate(() => { document.getElementById('shop-btn')?.click(); });
    await page.waitForTimeout(200);
    
    await page.evaluate(() => { document.getElementById('shop-continue-btn')?.click(); });
    await page.waitForTimeout(200);
    const firstClose = !(await page.evaluate(() => {
      const s = document.getElementById('shop-overlay');
      return s && s.classList.contains('active');
    }));
    
    await page.evaluate(() => { document.getElementById('shop-btn')?.click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.getElementById('shop-continue-btn')?.click(); });
    await page.waitForTimeout(200);
    const secondClose = !(await page.evaluate(() => {
      const s = document.getElementById('shop-overlay');
      return s && s.classList.contains('active');
    }));
    
    results.tests.shop_mid_floor = {
      result: (firstClose && secondClose) ? 'PASS' : 'FAIL',
      evidence: `First close: ${firstClose}, Second close: ${secondClose}`
    };
  } catch (e) {
    results.tests.shop_mid_floor = { result: 'FAIL', evidence: e.message };
    await screenshot('shop_mid');
  }

  const outPath = `${OUT_DIR}/elmo.json`;
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('DONE. Results at', outPath);
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });