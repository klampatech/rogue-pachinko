// a00_core.test.js — Core constants and config objects

export async function runTests(TEST) {
  const tests = [], gs = TEST.getGS(), PERSIST = TEST.getPersist();
  const _gs = JSON.parse(JSON.stringify(gs));
  async function test(name, fn) {
    const t0 = performance.now();
    try { await fn(); tests.push({ name, status: 'PASS', ms: Math.round(performance.now() - t0) }); }
    catch (e) { tests.push({ name, status: 'FAIL', ms: Math.round(performance.now() - t0), err: e.message.slice(0, 200) }); }
  }

  // ── Canvas / Physics constants ──
  await test('W is positive number', () => { if (!TEST.ok(typeof W === 'number' && W > 0)) throw new Error('W not positive'); });
  await test('H is positive number', () => { if (!TEST.ok(typeof H === 'number' && H > 0)) throw new Error('H not positive'); });
  await test('BALL_RADIUS is positive number', () => { if (!TEST.ok(typeof BALL_RADIUS === 'number' && BALL_RADIUS > 0)) throw new Error('BALL_RADIUS not positive'); });
  await test('FRICTION is between 0 and 1', () => { if (!TEST.ok(FRICTION > 0 && FRICTION < 1)) throw new Error('FRICTION out of range'); });
  await test('BOUNCE_DAMPING is between 0 and 1', () => { if (!TEST.ok(BOUNCE_DAMPING > 0 && BOUNCE_DAMPING < 1)) throw new Error('BOUNCE_DAMPING out of range'); });
  await test('GRAVITY is positive number', () => { if (!TEST.ok(typeof GRAVITY === 'number' && GRAVITY > 0)) throw new Error('GRAVITY not positive'); });
  await test('MAX_VEL is positive number', () => { if (!TEST.ok(typeof MAX_VEL === 'number' && MAX_VEL > 0)) throw new Error('MAX_VEL not positive'); });

  // ── PegEvo enum values ──
  await test('PegEvo.DORMANT is defined', () => { if (!TEST.ok(PegEvo.DORMANT === 'DORMANT')) throw new Error('Missing DORMANT'); });
  await test('PegEvo.NORMAL is defined', () => { if (!TEST.ok(PegEvo.NORMAL === 'NORMAL')) throw new Error('Missing NORMAL'); });
  await test('PegEvo.GLOWING is defined', () => { if (!TEST.ok(PegEvo.GLOWING === 'GLOWING')) throw new Error('Missing GLOWING'); });
  await test('PegEvo.CHARGED is defined', () => { if (!TEST.ok(PegEvo.CHARGED === 'CHARGED')) throw new Error('Missing CHARGED'); });
  await test('PegEvo.EXPLOSIVE is defined', () => { if (!TEST.ok(PegEvo.EXPLOSIVE === 'EXPLOSIVE')) throw new Error('Missing EXPLOSIVE'); });
  await test('PegEvo.TEMP_EXPLOSIVE is defined', () => { if (!TEST.ok(PegEvo.TEMP_EXPLOSIVE === 'TEMP_EXPLOSIVE')) throw new Error('Missing TEMP_EXPLOSIVE'); });

  // ── PAYLOADS keys ──
  await test('PAYLOADS has scrambler', () => { if (!TEST.ok(PAYLOADS.scrambler)) throw new Error('Missing scrambler'); });
  await test('PAYLOADS has trojan', () => { if (!TEST.ok(PAYLOADS.trojan)) throw new Error('Missing trojan'); });
  await test('PAYLOADS has worm', () => { if (!TEST.ok(PAYLOADS.worm)) throw new Error('Missing worm'); });
  await test('PAYLOADS has ghost', () => { if (!TEST.ok(PAYLOADS.ghost)) throw new Error('Missing ghost'); });
  await test('PAYLOADS has cluster', () => { if (!TEST.ok(PAYLOADS.cluster)) throw new Error('Missing cluster'); });
  await test('PAYLOADS has slowmo', () => { if (!TEST.ok(PAYLOADS.slowmo)) throw new Error('Missing slowmo'); });
  await test('PAYLOADS has daemon', () => { if (!TEST.ok(PAYLOADS.daemon)) throw new Error('Missing daemon'); });
  await test('PAYLOADS has logicbomb', () => { if (!TEST.ok(PAYLOADS.logicbomb)) throw new Error('Missing logicbomb'); });
  await test('PAYLOADS.scrambler has name/icon/color', () => {
    const p = PAYLOADS.scrambler;
    if (!TEST.ok(p.name && p.icon && p.color)) throw new Error('scrambler missing fields');
  });

  // ── PEG_TYPES keys ──
  await test('PEG_TYPES has node', () => { if (!TEST.ok(PEG_TYPES.node)) throw new Error('Missing node'); });
  await test('PEG_TYPES has ice', () => { if (!TEST.ok(PEG_TYPES.ice)) throw new Error('Missing ice'); });
  await test('PEG_TYPES has fiber', () => { if (!TEST.ok(PEG_TYPES.fiber)) throw new Error('Missing fiber'); });
  await test('PEG_TYPES has mirror', () => { if (!TEST.ok(PEG_TYPES.mirror)) throw new Error('Missing mirror'); });
  await test('PEG_TYPES has cache', () => { if (!TEST.ok(PEG_TYPES.cache)) throw new Error('Missing cache'); });
  await test('PEG_TYPES has honeypot', () => { if (!TEST.ok(PEG_TYPES.honeypot)) throw new Error('Missing honeypot'); });
  await test('PEG_TYPES has overload', () => { if (!TEST.ok(PEG_TYPES.overload)) throw new Error('Missing overload'); });
  await test('PEG_TYPES.node has color and bounce', () => {
    const p = PEG_TYPES.node;
    if (!TEST.ok(p.color && typeof p.bounce === 'number')) throw new Error('node missing fields');
  });

  // ── SLOT_TYPES has 7 entries ──
  await test('SLOT_TYPES has 7 entries', () => { if (!TEST.ok(SLOT_TYPES.length === 7)) throw new Error('Expected 7 slot types'); });
  await test('SLOT_TYPES[0] is CREDITS', () => { if (!TEST.ok(SLOT_TYPES[0].name === 'CREDITS')) throw new Error('Slot 0 not CREDITS'); });
  await test('SLOT_TYPES[6] is JACKPOT', () => { if (!TEST.ok(SLOT_TYPES[6].name === 'JACKPOT')) throw new Error('Slot 6 not JACKPOT'); });

  // ── SHOP_ITEMS ──
  await test('SHOP_ITEMS is non-empty array', () => { if (!TEST.ok(Array.isArray(SHOP_ITEMS) && SHOP_ITEMS.length > 0)) throw new Error('SHOP_ITEMS empty'); });
  await test('SHOP_ITEMS[0] has id/cost/name', () => {
    const i = SHOP_ITEMS[0];
    if (!TEST.ok(i.id && typeof i.cost === 'number' && i.name)) throw new Error('SHOP_ITEMS[0] missing fields');
  });

  // ── REP_SHOP_ITEMS ──
  await test('REP_SHOP_ITEMS is non-empty array', () => { if (!TEST.ok(Array.isArray(REP_SHOP_ITEMS) && REP_SHOP_ITEMS.length > 0)) throw new Error('REP_SHOP_ITEMS empty'); });
  await test('REP_SHOP_ITEMS[0] has repCost', () => {
    const i = REP_SHOP_ITEMS[0];
    if (!TEST.ok(typeof i.repCost === 'number')) throw new Error('REP_SHOP_ITEMS[0] missing repCost');
  });

  // ── MASTERY_UPGRADES ──
  await test('MASTERY_UPGRADES has extraBall', () => { if (!TEST.ok(MASTERY_UPGRADES.extraBall)) throw new Error('Missing extraBall'); });
  await test('MASTERY_UPGRADES.extraBall has tiers', () => {
    if (!TEST.ok(Array.isArray(MASTERY_UPGRADES.extraBall.tiers) && MASTERY_UPGRADES.extraBall.tiers.length > 0)) throw new Error('extraBall has no tiers');
  });
  await test('MASTERY_UPGRADES.extraBall.tiers[0] has cost and effect', () => {
    const t = MASTERY_UPGRADES.extraBall.tiers[0];
    if (!TEST.ok(typeof t.cost === 'number' && t.effect)) throw new Error('tier missing cost/effect');
  });

  // ── BALL_SKINS ──
  await test('BALL_SKINS has default', () => { if (!TEST.ok(BALL_SKINS.default)) throw new Error('Missing default skin'); });
  await test('BALL_SKINS.default has name', () => { if (!TEST.ok(BALL_SKINS.default.name)) throw new Error('default skin missing name'); });
  await test('BALL_SKINS has gold', () => { if (!TEST.ok(BALL_SKINS.gold)) throw new Error('Missing gold skin'); });

  // ── ACHIEVEMENTS ──
  await test('ACHIEVEMENTS is non-empty object', () => {
    const keys = Object.keys(ACHIEVEMENTS);
    if (!TEST.ok(keys.length > 0)) throw new Error('ACHIEVEMENTS empty');
  });
  await test('ACHIEVEMENTS.firstPeg has icon/title/desc', () => {
    const a = ACHIEVEMENTS.firstPeg;
    if (!TEST.ok(a.icon && a.title && a.desc)) throw new Error('firstPeg missing fields');
  });

  // ── RANKS ──
  await test('RANKS is non-empty array', () => { if (!TEST.ok(Array.isArray(RANKS) && RANKS.length > 1)) throw new Error('RANKS too short'); });
  await test('RANKS[0].name is Script Kiddie', () => { if (!TEST.ok(RANKS[0].name === 'Script Kiddie')) throw new Error('RANKS[0] wrong'); });
  await test('RANKS[0] has repThresh', () => { if (!TEST.ok(typeof RANKS[0].repThresh === 'number')) throw new Error('RANKS[0] missing repThresh'); });

  // ── UNLOCKS ──
  await test('UNLOCKS is non-empty object', () => {
    const keys = Object.keys(UNLOCKS);
    if (!TEST.ok(keys.length > 0)) throw new Error('UNLOCKS empty');
  });
  await test('UNLOCKS has mirror_ball', () => { if (!TEST.ok(UNLOCKS.mirror_ball)) throw new Error('Missing mirror_ball'); });
  await test('UNLOCKS.mirror_ball has cat/unlockType', () => {
    const u = UNLOCKS.mirror_ball;
    if (!TEST.ok(u.cat && u.unlockType)) throw new Error('mirror_ball missing fields');
  });

  // ── C color palette ──
  await test('C.void is hex color', () => { if (!TEST.ok(C.void && C.void.startsWith('#'))) throw new Error('C.void invalid'); });
  await test('C.cyan is hex color', () => { if (!TEST.ok(C.cyan && C.cyan.startsWith('#'))) throw new Error('C.cyan invalid'); });
  await test('C.magenta is hex color', () => { if (!TEST.ok(C.magenta && C.magenta.startsWith('#'))) throw new Error('C.magenta invalid'); });

  // ── DAILY_CHALLENGES / DAILY_MODIFIERS ──
  await test('DAILY_MODIFIERS is non-empty array', () => { if (!TEST.ok(Array.isArray(DAILY_MODIFIERS) && DAILY_MODIFIERS.length > 0)) throw new Error('DAILY_MODIFIERS empty'); });
  await test('DAILY_MODIFIERS[0] has id/name/apply', () => {
    const d = DAILY_MODIFIERS[0];
    if (!TEST.ok(d.id && d.name && typeof d.apply === 'function')) throw new Error('DAILY_MODIFIERS[0] malformed');
  });

  // ── GS sanity ──
  await test('GS is object with screen property', () => { if (!TEST.ok(typeof gs === 'object' && gs.screen)) throw new Error('GS missing screen'); });
  await test('GS.floor defaults to 1 on fresh state', () => { TEST.seed(12345); TEST.returnToMenu(); if (!TEST.ok(gs.floor === 1)) throw new Error('floor not 1'); });

  // ── PegEvo enum uniqueness ──
  await test('PegEvo values are all unique strings', () => {
    const vals = Object.values(PegEvo);
    const unique = new Set(vals);
    if (!TEST.ok(unique.size === vals.length)) throw new Error('Duplicate PegEvo values');
  });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
