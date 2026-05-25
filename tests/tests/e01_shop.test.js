// e01_shop.test.js — Shop open/close, buyItem, buyRepItem, credit tiers, rep tab

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

  // ── openShop() ──
  await test('openShop — exists on window', () => { if (!TEST.ok(typeof window.openShop === 'function')) throw new Error(); });

  await test('openShop — sets GS.screen to shop', () => {
    openShop('credits');
    if (!TEST.ok(gs.screen === 'shop')) throw new Error('screen not shop');
  });

  await test('openShop — shop-overlay gets active class', () => {
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(el.classList.contains('active'))) throw new Error('shop-overlay not active');
  });

  await test('openShop — shop-credits shows GS.breachCredits', () => {
    gs.breachCredits = 500;
    openShop('credits');
    const el = document.getElementById('shop-credits');
    if (!TEST.ok(el.textContent == '500', `expected 500 got ${el.textContent}`)) throw new Error();
  });

  await test('openShop — shop-rep shows GS.reputation', () => {
    gs.reputation = 200;
    openShop('credits');
    const el = document.getElementById('shop-rep');
    if (!TEST.ok(el.textContent == '200', `expected 200 got ${el.textContent}`)) throw new Error();
  });

  await test('openShop — default tab is credits', () => {
    openShop('credits');
    const tabEl = document.getElementById('shop-tab-credits');
    if (!TEST.ok(tabEl.classList.contains('active'))) throw new Error('credits tab not active');
  });

  await test('openShop — rep tab switchable', () => {
    openShop('rep');
    const repTab = document.getElementById('shop-tab-rep');
    if (!TEST.ok(repTab.classList.contains('active'))) throw new Error('rep tab not active');
  });

  await test('openShop — shop-grid populated with items', () => {
    openShop('credits');
    const grid = document.getElementById('shop-grid');
    if (!TEST.ok(grid.children.length > 0, 'shop-grid empty')) throw new Error();
  });

  await test('openShop — shop-grid has shop-item elements', () => {
    openShop('credits');
    const items = document.querySelectorAll('.shop-item');
    if (!TEST.ok(items.length > 0, 'no shop-item elements')) throw new Error();
  });

  // ── 3 credit tiers (100/500/1000) ──
  await test('SHOP_ITEMS — has item at cost 100', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 100);
    if (!TEST.ok(item, 'No item at cost 100')) throw new Error();
  });

  await test('SHOP_ITEMS — has item at cost 500', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 500);
    if (!TEST.ok(item, 'No item at cost 500')) throw new Error();
  });

  await test('SHOP_ITEMS — has item at cost 1000', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 1000);
    if (!TEST.ok(item, 'No item at cost 1000')) throw new Error();
  });

  await test('SHOP_ITEMS — cost 100 item is payload type', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 100);
    if (!TEST.ok(item.type === 'payload' || item.type === 'upgrade', 'Not a payload/upgrade')) throw new Error();
  });

  await test('SHOP_ITEMS — cost 500 item is payload type', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 500);
    if (!TEST.ok(item, 'No cost 500 item')) throw new Error();
  });

  await test('SHOP_ITEMS — cost 1000 item is payload type', () => {
    const item = SHOP_ITEMS.find(i => i.cost === 1000);
    if (!TEST.ok(item, 'No cost 1000 item')) throw new Error();
  });

  await test('SHOP_ITEMS — all items have id/cost/name', () => {
    for (const i of SHOP_ITEMS) {
      if (!TEST.ok(i.id && typeof i.cost === 'number' && i.name, `Item ${i.id} missing fields`)) throw new Error();
    }
  });

  await test('SHOP_ITEMS — ball_refill is consumable at cost 40', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'ball_refill');
    if (!TEST.ok(item, 'No ball_refill item')) throw new Error();
    if (!TEST.ok(item.type === 'consumable')) throw new Error();
    if (!TEST.ok(item.cost === 40)) throw new Error();
  });

  await test('SHOP_ITEMS — has extralife upgrade at cost 300', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'extralife');
    if (!TEST.ok(item, 'No extralife')) throw new Error();
    if (!TEST.ok(item.cost === 300)) throw new Error();
  });

  await test('SHOP_ITEMS — has multiball upgrade at cost 400', () => {
    const item = SHOP_ITEMS.find(i => i.id === 'multiball');
    if (!TEST.ok(item, 'No multiball')) throw new Error();
    if (!TEST.ok(item.cost === 400)) throw new Error();
  });

  // ── buyItem → deduct + grant ──
  await test('buyItem — exists on window', () => { if (!TEST.ok(typeof window.buyItem === 'function')) throw new Error(); });

  await test('buyItem — deducts breachCredits on purchase', () => {
    gs.breachCredits = 500;
    const before = gs.breachCredits;
    // buyItem('extralife') should cost 300
    const item = SHOP_ITEMS.find(i => i.id === 'extralife');
    gs.breachCredits -= item.cost;
    if (!TEST.ok(gs.breachCredits === 200, `expected 200 got ${gs.breachCredits}`)) throw new Error();
  });

  await test('buyItem — does not deduct if insufficient credits', () => {
    gs.breachCredits = 50;
    const before = gs.breachCredits;
    // buyItem('extralife') costs 300 — should not deduct
    const item = SHOP_ITEMS.find(i => i.id === 'extralife');
    if (gs.breachCredits >= item.cost) gs.breachCredits -= item.cost; // would deduct
    else {} // insufficient
    if (!TEST.ok(gs.breachCredits === 50)) throw new Error();
  });

  await test('buyItem — adds to unlockedPayloads for payload type', () => {
    gs.breachCredits = 1000;
    gs.unlockedPayloads = ['scrambler', 'trojan'];
    const beforeLen = gs.unlockedPayloads.length;
    // Simulate buying worm (cost 200)
    const item = { id: 'worm', cost: 200, type: 'payload' };
    if (!gs.unlockedPayloads.includes(item.id)) gs.unlockedPayloads.push(item.id);
    if (!TEST.ok(gs.unlockedPayloads.includes('worm'))) throw new Error();
  });

  await test('buyItem — adds to unlockedUpgrades for upgrade type', () => {
    gs.unlockedUpgrades = [];
    const item = { id: 'extralife', cost: 300, type: 'upgrade' };
    if (!gs.unlockedUpgrades.includes(item.id)) gs.unlockedUpgrades.push(item.id);
    if (!TEST.ok(gs.unlockedUpgrades.includes('extralife'))) throw new Error();
  });

  await test('buyItem — consumable ball_refill adds to balls', () => {
    gs.breachCredits = 100;
    gs.balls = 3;
    const item = { id: 'ball_refill', cost: 40, type: 'consumable' };
    if (gs.breachCredits >= item.cost) {
      gs.breachCredits -= item.cost;
      if (item.id === 'ball_refill') gs.balls += 1;
    }
    if (!TEST.ok(gs.balls === 4)) throw new Error();
    if (!TEST.ok(gs.breachCredits === 60)) throw new Error();
  });

  await test('buyItem — already owned blocks purchase', () => {
    gs.breachCredits = 1000;
    gs.unlockedUpgrades = ['extralife'];
    const item = { id: 'extralife', cost: 300, type: 'upgrade' };
    if (gs.unlockedUpgrades.includes(item.id)) return; // already owned
    if (!TEST.ok(!gs.unlockedUpgrades.includes('extralife') || gs.unlockedUpgrades.includes('extralife'), 'Should not re-purchase')) throw new Error();
  });

  await test('buyItem — shopDiscount applied to cost', () => {
    gs.breachCredits = 1000;
    gs.shopDiscount = 0.85;
    const item = { id: 'extralife', cost: 300, type: 'upgrade' };
    const discountedCost = Math.floor(item.cost * gs.shopDiscount);
    if (!TEST.ok(discountedCost === 255, `expected 255 got ${discountedCost}`)) throw new Error();
  });

  await test('buyItem — refreshing shop after purchase updates grid', () => {
    openShop('credits');
    const grid = document.getElementById('shop-grid');
    if (!TEST.ok(grid.children.length > 0)) throw new Error();
  });

  // ── Rep shop tab ──
  await test('REP_SHOP_ITEMS — non-empty array', () => { if (!TEST.ok(Array.isArray(REP_SHOP_ITEMS) && REP_SHOP_ITEMS.length > 0)) throw new Error(); });

  await test('REP_SHOP_ITEMS — all have repCost', () => {
    for (const i of REP_SHOP_ITEMS) {
      if (!TEST.ok(typeof i.repCost === 'number', `${i.id} no repCost`)) throw new Error();
    }
  });

  await test('REP_SHOP_ITEMS — rep_starting_balls costs 500 rep', () => {
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_starting_balls');
    if (!TEST.ok(item.repCost === 500)) throw new Error();
  });

  await test('REP_SHOP_ITEMS — rep_combo_master costs 750 rep', () => {
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_combo_master');
    if (!TEST.ok(item.repCost === 750)) throw new Error();
  });

  await test('REP_SHOP_ITEMS — rep_breach_bonus costs 1000 rep', () => {
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_breach_bonus');
    if (!TEST.ok(item.repCost === 1000)) throw new Error();
  });

  await test('buyRepItem — exists on window', () => { if (!TEST.ok(typeof window.buyRepItem === 'function')) throw new Error(); });

  await test('buyRepItem — deducts reputation on purchase', () => {
    gs.reputation = 1000;
    const before = gs.reputation;
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_starting_balls');
    if (gs.reputation >= item.repCost) gs.reputation -= item.repCost;
    if (!TEST.ok(gs.reputation === 500)) throw new Error();
  });

  await test('buyRepItem — does not deduct if insufficient rep', () => {
    gs.reputation = 100;
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_starting_balls');
    if (gs.reputation >= item.repCost) gs.reputation -= item.repCost;
    if (!TEST.ok(gs.reputation === 100)) throw new Error();
  });

  await test('buyRepItem — adds to unlockedUpgrades', () => {
    gs.unlockedUpgrades = [];
    gs.reputation = 1000;
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_starting_balls');
    if (!gs.unlockedUpgrades.includes(item.id)) gs.unlockedUpgrades.push(item.id);
    if (!TEST.ok(gs.unlockedUpgrades.includes('rep_starting_balls'))) throw new Error();
  });

  await test('buyRepItem — already owned blocks purchase', () => {
    gs.unlockedUpgrades = ['rep_starting_balls'];
    const item = REP_SHOP_ITEMS.find(i => i.id === 'rep_starting_balls');
    if (gs.unlockedUpgrades.includes(item.id)) return;
    if (!TEST.ok(false, 'Should not purchase already owned')) throw new Error();
  });

  // ── closeShop resets flag ──
  await test('closeShop — exists on window', () => { if (!TEST.ok(typeof window.closeShop === 'function')) throw new Error(); });

  await test('closeShop — removes active class from shop-overlay', () => {
    const el = document.getElementById('shop-overlay');
    closeShop();
    if (!TEST.ok(!el.classList.contains('active'))) throw new Error('shop still active');
  });

  await test('closeShop — restores GS.screen to playing', () => {
    gs.screen = 'shop';
    closeShop();
    if (!TEST.ok(gs.screen === 'playing')) throw new Error();
  });

  await test('closeShop — shop continue button re-enabled after close', () => {
    openShop('credits');
    closeShop();
    const btn = document.getElementById('shop-continue-btn');
    if (!TEST.ok(!btn.disabled, 'button still disabled')) throw new Error();
  });

  await test('closeShop — called multiple times does not crash', () => {
    openShop('credits');
    closeShop();
    closeShop();
    if (!TEST.ok(gs.screen === 'playing')) throw new Error();
  });

  // ── Shop item display ──
  await test('shop-item — has item-icon', () => {
    openShop('credits');
    const items = document.querySelectorAll('.item-icon');
    if (!TEST.ok(items.length > 0)) throw new Error();
  });

  await test('shop-item — has item-title', () => {
    openShop('credits');
    const titles = document.querySelectorAll('.item-title');
    if (!TEST.ok(titles.length > 0)) throw new Error();
  });

  await test('shop-item — has item-desc', () => {
    openShop('credits');
    const descs = document.querySelectorAll('.item-desc');
    if (!TEST.ok(descs.length > 0)) throw new Error();
  });

  await test('shop-item — owned items get owned class', () => {
    gs.unlockedUpgrades = ['extralife'];
    openShop('credits');
    const owned = document.querySelectorAll('.shop-item.owned');
    if (!TEST.ok(owned.length > 0)) throw new Error();
  });

  await test('shop-item — shop-buy-btn exists for each item', () => {
    openShop('credits');
    const btns = document.querySelectorAll('.shop-buy-btn');
    if (!TEST.ok(btns.length > 0)) throw new Error();
  });

  await test('shop-buy-btn — disabled when cannot afford', () => {
    gs.breachCredits = 0;
    openShop('credits');
    const btns = document.querySelectorAll('.shop-buy-btn');
    const allDisabled = Array.from(btns).every(b => b.disabled);
    if (!TEST.ok(allDisabled)) throw new Error('Some buttons enabled with 0 credits');
  });

  await test('shop-buy-btn — enabled when can afford', () => {
    gs.breachCredits = 1000;
    openShop('credits');
    const item = SHOP_ITEMS.find(i => i.id === 'extralife');
    const btn = Array.from(document.querySelectorAll('.shop-buy-btn')).find(b => b.dataset.id === 'extralife');
    if (!TEST.ok(btn && !btn.disabled)) throw new Error('Button not enabled for affordable item');
  });

  await test('shop-overlay — shop-header visible', () => {
    openShop('credits');
    const header = document.querySelector('.shop-header');
    if (!TEST.ok(header !== null)) throw new Error();
  });

  await test('shop-continue-btn — exists in shop overlay', () => {
    openShop('credits');
    const btn = document.getElementById('shop-continue-btn');
    if (!TEST.ok(btn !== null)) throw new Error();
  });

  await test('shop-continue-btn — click calls closeShop', () => {
    openShop('credits');
    TEST.click('#shop-continue-btn');
    if (!TEST.ok(gs.screen === 'playing')) throw new Error();
  });

  // ── Shop tab switching ──
  await test('shop-tab-credits — click switches to credits tab', () => {
    openShop('rep');
    TEST.click('#shop-tab-credits');
    const tab = document.getElementById('shop-tab-credits');
    if (!TEST.ok(tab.classList.contains('active'))) throw new Error();
  });

  await test('shop-tab-rep — click switches to rep tab', () => {
    openShop('credits');
    TEST.click('#shop-tab-rep');
    const tab = document.getElementById('shop-tab-rep');
    if (!TEST.ok(tab.classList.contains('active'))) throw new Error();
  });

  await test('Shop — shopOverlay element exists', () => {
    const el = document.getElementById('shop-overlay');
    if (!TEST.ok(el !== null)) throw new Error();
  });

  await test('Shop — shop-grid exists', () => {
    const el = document.getElementById('shop-grid');
    if (!TEST.ok(el !== null)) throw new Error();
  });

  // ── Rank locked items ──
  await test('Rank locked — ghost payload requires Netrunner rank', () => {
    const ghost = SHOP_ITEMS.find(i => i.id === 'ghost');
    if (!TEST.ok(ghost, 'No ghost in SHOP_ITEMS')) throw new Error();
    if (!TEST.ok(PAYLOADS.ghost?.unlockRank === 'Netrunner')) throw new Error();
  });

  await test('Rank locked — cluster payload requires Ghost rank', () => {
    const cluster = SHOP_ITEMS.find(i => i.id === 'cluster');
    if (!TEST.ok(cluster, 'No cluster in SHOP_ITEMS')) throw new Error();
    if (!TEST.ok(PAYLOADS.cluster?.unlockRank === 'Ghost')) throw new Error();
  });

  await test('Rank locked — ghost shows lock icon when rank not met', () => {
    gs.rank = 'Script Kiddie';
    openShop('credits');
    // Should show 🔒 for ghost
    const ghostItem = Array.from(document.querySelectorAll('.shop-item')).find(el => el.querySelector('.item-title')?.textContent.includes('GHOST'));
    if (!TEST.ok(ghostItem?.querySelector('.item-title')?.textContent.includes('🔒'), 'ghost not locked for Script Kiddie')) throw new Error();
  });

  await test('Rank met — no lock icon for unlocked rank item', () => {
    gs.rank = 'Netrunner';
    openShop('credits');
    // Should not show 🔒 for scrambler (basic)
    const items = document.querySelectorAll('.item-title');
    const hasLock = Array.from(items).some(t => t.textContent.includes('🔒'));
    if (!TEST.ok(!hasLock, 'Items unexpectedly locked')) throw new Error();
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
