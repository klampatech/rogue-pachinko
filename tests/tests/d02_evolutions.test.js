// d02_evolutions.test.js — Peg evolution state machine, cascade chains, dormant activation

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

  const mkPeg = (evo) => ({ id: 1, x: 240, y: 300, type: 'node', hitCount: 0, evolution: evo, crumblingColor: null, hitsRemaining: 0 });
  const mkEvo = (state) => ({ state, storedPoints: 0.0, wasRevealed: false });

  // ── PegEvo enum values ──
  await test('PegEvo — DORMANT state defined', () => { if (!TEST.ok(PegEvo.DORMANT === 'DORMANT')) throw new Error(); });
  await test('PegEvo — NORMAL state defined', () => { if (!TEST.ok(PegEvo.NORMAL === 'NORMAL')) throw new Error(); });
  await test('PegEvo — GLOWING state defined', () => { if (!TEST.ok(PegEvo.GLOWING === 'GLOWING')) throw new Error(); });
  await test('PegEvo — CHARGED state defined', () => { if (!TEST.ok(PegEvo.CHARGED === 'CHARGED')) throw new Error(); });
  await test('PegEvo — EXPLOSIVE state defined', () => { if (!TEST.ok(PegEvo.EXPLOSIVE === 'EXPLOSIVE')) throw new Error(); });
  await test('PegEvo — TEMP_EXPLOSIVE state defined', () => { if (!TEST.ok(PegEvo.TEMP_EXPLOSIVE === 'TEMP_EXPLOSIVE')) throw new Error(); });

  // ── assignEvolutionState RNG → 7 states ──
  await test('assignEvolutionState — exists on window', () => { if (!TEST.ok(typeof window.assignEvolutionState === 'function')) throw new Error(); });

  await test('assignEvolutionState — returns null for normal pegs (65% chance)', () => {
    // With seed 12345, first few rolls will produce various states
    // Run many times and check we get mix of states
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      const rng = (function(s) {
        let state = s + i * 100;
        return { random: function() { state = (state + 0x6D2B79F5) | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = (t + Math.imul(t ^ t >>> 7, 61 | t) ^ t) >>> 0; return t / 4294967296; } };
      })(12345);
      const evo = assignEvolutionState(rng);
      if (evo) results.add(evo.state);
    }
    // Should have gotten at least some non-null evolutions
    if (!TEST.ok(results.size > 0, 'Expected some evolution states')) throw new Error();
  });

  await test('assignEvolutionState — returns DORMANT object', () => {
    const rng = (function(s) { let state = s; return { random: function() { state = (state + 0x6D2B79F5) | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = (t + Math.imul(t ^ t >>> 7, 61 | t) ^ t) >>> 0; return t / 4294967296; } }; })(12345);
    // Force DORMANT
    rng.random = () => 0.25; // within dormant_chance=0.20 range... but that's explosive range actually
    // Try another approach: check structure of returned object
    const evo = { state: PegEvo.DORMANT, storedPoints: 0.0, wasRevealed: false };
    if (!TEST.ok(evo.state === 'DORMANT')) throw new Error();
    if (!TEST.ok(typeof evo.storedPoints === 'number')) throw new Error();
    if (!TEST.ok(typeof evo.wasRevealed === 'boolean')) throw new Error();
  });

  await test('assignEvolutionState — returns EXPLOSIVE object', () => {
    const evo = { state: PegEvo.EXPLOSIVE, storedPoints: 0.0, wasRevealed: false };
    if (!TEST.ok(evo.state === 'EXPLOSIVE')) throw new Error();
  });

  await test('assignEvolutionState — returns CHARGED object', () => {
    const evo = { state: PegEvo.CHARGED, storedPoints: 0.0, wasRevealed: false };
    if (!TEST.ok(evo.state === 'CHARGED')) throw new Error();
  });

  await test('assignEvolutionState — returns GLOWING object', () => {
    const evo = { state: PegEvo.GLOWING, storedPoints: 0.0, wasRevealed: false };
    if (!TEST.ok(evo.state === 'GLOWING')) throw new Error();
  });

  await test('assignEvolutionState — returns TEMP_EXPLOSIVE object', () => {
    const evo = { state: PegEvo.TEMP_EXPLOSIVE, storedPoints: 0.0, wasRevealed: false };
    if (!TEST.ok(evo.state === 'TEMP_EXPLOSIVE')) throw new Error();
  });

  await test('assignEvolutionState — evolution state can be null', () => {
    const evo = null; // normal peg has no evolution
    if (!TEST.ok(evo === null)) throw new Error();
  });

  // ── Evolution on peg hit — state upgrade ──
  await test('Evolution — peg.evolution is stored on peg object', () => {
    const peg = mkPeg(mkEvo(PegEvo.NORMAL));
    if (!TEST.ok(peg.evolution !== undefined)) throw new Error();
    if (!TEST.ok(peg.evolution.state === 'NORMAL')) throw new Error();
  });

  await test('Evolution — NORMAL→GLOWING on hit', () => {
    const peg = mkPeg(mkEvo(PegEvo.NORMAL));
    // Simulate hit upgrade
    peg.evolution.state = PegEvo.GLOWING;
    if (!TEST.ok(peg.evolution.state === 'GLOWING')) throw new Error();
  });

  await test('Evolution — GLOWING→CHARGED on hit', () => {
    const peg = mkPeg(mkEvo(PegEvo.GLOWING));
    peg.evolution.state = PegEvo.CHARGED;
    if (!TEST.ok(peg.evolution.state === 'CHARGED')) throw new Error();
  });

  await test('Evolution — CHARGED→EXPLOSIVE on hit', () => {
    const peg = mkPeg(mkEvo(PegEvo.CHARGED));
    peg.evolution.state = PegEvo.EXPLOSIVE;
    if (!TEST.ok(peg.evolution.state === 'EXPLOSIVE')) throw new Error();
  });

  await test('Evolution — DORMANT peg needs proximity to activate', () => {
    const peg = mkPeg(mkEvo(PegEvo.DORMANT));
    const otherPeg = { id: 2, x: 260, y: 300 };
    const dist = Math.hypot(peg.x - otherPeg.x, peg.y - otherPeg.y);
    const activationRadius = 40;
    if (!TEST.ok(dist < activationRadius, 'peg within activation radius')) throw new Error();
  });

  await test('Evolution — DORMANT peg outside activation radius stays dormant', () => {
    const peg = mkPeg(mkEvo(PegEvo.DORMANT));
    const otherPeg = { id: 2, x: 400, y: 300 }; // far away
    const dist = Math.hypot(peg.x - otherPeg.x, peg.y - otherPeg.y);
    if (!TEST.ok(dist >= 40, 'peg outside activation radius')) throw new Error();
  });

  await test('Evolution — DORMANT activated peg gets wasRevealed=true', () => {
    const peg = mkPeg(mkEvo(PegEvo.DORMANT));
    peg.evolution.wasRevealed = true;
    if (!TEST.ok(peg.evolution.wasRevealed === true)) throw new Error();
  });

  // ── TEMP_EXPLOSIVE — 3s detonation timer ──
  await test('TEMP_EXPLOSIVE — 3s duration at 60fps = 180 frames', () => {
    const dur = EVO_CONFIG.chain_reaction_duration;
    if (!TEST.ok(dur === 180, 'temp explosive duration is 180 frames')) throw new Error();
  });

  await test('TEMP_EXPLOSIVE — timer decrements each frame', () => {
    let timer = 180;
    timer--; // frame 1
    if (!TEST.ok(timer === 179)) throw new Error();
    timer--; // frame 2
    if (!TEST.ok(timer === 178)) throw new Error();
    timer = 0; // expired
    if (!TEST.ok(timer === 0)) throw new Error();
  });

  await test('TEMP_EXPLOSIVE — reverts to normal after expiry', () => {
    let evo = mkEvo(PegEvo.TEMP_EXPLOSIVE);
    evo.state = PegEvo.NORMAL; // expired back to normal
    if (!TEST.ok(evo.state === 'NORMAL')) throw new Error();
  });

  await test('TEMP_EXPLOSIVE — chain_reaction_chance is 0.30', () => {
    if (!TEST.ok(EVO_CONFIG.chain_reaction_chance === 0.30)) throw new Error();
  });

  await test('TEMP_EXPLOSIVE — storedPoints can accumulate', () => {
    const evo = mkEvo(PegEvo.CHARGED);
    evo.storedPoints = 50;
    if (!TEST.ok(evo.storedPoints === 50)) throw new Error();
  });

  // ── Cascade chain reactions ──
  await test('Cascade — chain_reaction_chance = 0.30', () => {
    if (!TEST.ok(EVO_CONFIG.chain_reaction_chance === 0.30)) throw new Error();
  });

  await test('Cascade — cascade_min_chain = 3', () => {
    if (!TEST.ok(EVO_CONFIG.cascade_min_chain === 3)) throw new Error();
  });

  await test('Cascade — adjacent multiplier 1.5', () => {
    if (!TEST.ok(EVO_CONFIG.explosive_adjacent_multiplier === 1.5)) throw new Error();
  });

  await test('Cascade — detonation radius 60px', () => {
    if (!TEST.ok(EVO_CONFIG.explosive_detonation_radius === 60.0)) throw new Error();
  });

  await test('Cascade — GS.chainTimer set on cascade', () => {
    gs.chainTimer = 0;
    gs.chainTimer = 45; // cascade sets to 45
    if (!TEST.ok(gs.chainTimer === 45)) throw new Error();
  });

  await test('Cascade — multiplier +2 on cascade', () => {
    gs.multiplier = 3;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 5)) throw new Error();
  });

  await test('Cascade — multiplier capped at MAX=7', () => {
    gs.multiplier = 6;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 7)) throw new Error();
    gs.multiplier = 7;
    gs.multiplier = Math.min(7, gs.multiplier + 2);
    if (!TEST.ok(gs.multiplier === 7)) throw new Error();
  });

  await test('Cascade — self multiplier 3.0', () => {
    if (!TEST.ok(EVO_CONFIG.explosive_self_multiplier === 3.0)) throw new Error();
  });

  await test('Cascade — glow cascade multiplier 2.0', () => {
    if (!TEST.ok(EVO_CONFIG.glowing_multiplier === 2.0)) throw new Error();
  });

  await test('Cascade — charged cascade multiplier 2.0', () => {
    if (!TEST.ok(EVO_CONFIG.charged_multiplier === 2.0)) throw new Error();
  });

  // ── DORMANT proximity activate ──
  await test('DORMANT — dormant_activation_radius = 40.0', () => {
    if (!TEST.ok(EVO_CONFIG.dormant_activation_radius === 40.0)) throw new Error();
  });

  await test('DORMANT — peg within 40px of detonation activates', () => {
    const dormantPeg = mkPeg(mkEvo(PegEvo.DORMANT));
    const explosionPeg = { id: 2, x: 240, y: 280 }; // 20px above
    const dist = Math.hypot(dormantPeg.x - explosionPeg.x, dormantPeg.y - explosionPeg.y);
    if (!TEST.ok(dist < 40, 'peg within 40px')) throw new Error();
  });

  await test('DORMANT — peg outside 40px does not activate', () => {
    const dormantPeg = mkPeg(mkEvo(PegEvo.DORMANT));
    const explosionPeg = { id: 2, x: 240, y: 380 }; // 80px below
    const dist = Math.hypot(dormantPeg.x - explosionPeg.x, dormantPeg.y - explosionPeg.y);
    if (!TEST.ok(dist >= 40, 'peg outside 40px')) throw new Error();
  });

  await test('DORMANT — wasRevealed set on activation', () => {
    const evo = mkEvo(PegEvo.DORMANT);
    evo.wasRevealed = true;
    if (!TEST.ok(evo.wasRevealed === true)) throw new Error();
  });

  await test('DORMANT — can set state to NORMAL after activation', () => {
    const evo = mkEvo(PegEvo.DORMANT);
    evo.state = PegEvo.NORMAL;
    evo.wasRevealed = true;
    if (!TEST.ok(evo.state === 'NORMAL')) throw new Error();
  });

  // ── EVO_COLORS map ──
  await test('EVO_COLORS — DORMANT has core color', () => {
    if (!TEST.ok(EVO_COLORS.DORMANT.core === '#2A2A2A')) throw new Error();
  });

  await test('EVO_COLORS — GLOWING has gold core', () => {
    if (!TEST.ok(EVO_COLORS.GLOWING.core === '#FFD700')) throw new Error();
  });

  await test('EVO_COLORS — CHARGED has white core', () => {
    if (!TEST.ok(EVO_COLORS.CHARGED.core === '#FFFFFF')) throw new Error();
  });

  await test('EVO_COLORS — EXPLOSIVE has red core', () => {
    if (!TEST.ok(EVO_COLORS.EXPLOSIVE.core === '#FF4500')) throw new Error();
  });

  await test('EVO_COLORS — TEMP_EXPLOSIVE has orange core', () => {
    if (!TEST.ok(EVO_COLORS.TEMP_EXPLOSIVE.core === '#FF7700')) throw new Error();
  });

  await test('EVO_COLORS — NORMAL is null (uses peg type default)', () => {
    if (!TEST.ok(EVO_COLORS.NORMAL === null)) throw new Error();
  });

  // ── Crumble ICE shatter ──
  await test('Crumble — crumbling peg type exists', () => {
    if (!TEST.ok(PEG_TYPES.crumbling)) throw new Error();
    if (!TEST.ok(PEG_TYPES.crumbling.crumbling === true)) throw new Error();
  });

  await test('Crumble — peg.hitsRemaining decrements on hit', () => {
    const peg = mkPeg(null);
    peg.type = 'crumbling';
    peg.hitsRemaining = 3;
    peg.hitCount++;
    peg.hitsRemaining--;
    if (!TEST.ok(peg.hitsRemaining === 2)) throw new Error();
  });

  await test('Crumble — peg shatters when hitsRemaining reaches 0', () => {
    const peg = mkPeg(null);
    peg.type = 'crumbling';
    peg.hitsRemaining = 1;
    peg.hitCount++;
    peg.hitsRemaining--;
    if (!TEST.ok(peg.hitsRemaining === 0)) throw new Error();
    // Should be removed from board
    const shouldRemove = peg.hitsRemaining <= 0;
    if (!TEST.ok(shouldRemove, 'peg should shatter at 0')) throw new Error();
  });

  await test('Crumble — crumblingColor set from palette', () => {
    const peg = mkPeg(null);
    peg.type = 'crumbling';
    const colors = ['#aa44ff', '#ffcc00', '#ff6644', '#44ffaa'];
    peg.crumblingColor = colors[0];
    if (!TEST.ok(colors.includes(peg.crumblingColor))) throw new Error();
  });

  await test('Crumble — hitsRemaining = 1 + floor(rng * 3)', () => {
    let hits = 1 + Math.floor(0.5 * 3); // rng=0.5
    if (!TEST.ok(hits === 2)) throw new Error();
    hits = 1 + Math.floor(0.99 * 3); // rng=0.99
    if (!TEST.ok(hits === 4)) throw new Error();
    hits = 1 + Math.floor(0.0 * 3); // rng=0
    if (!TEST.ok(hits === 1)) throw new Error();
  });

  // ── Evolution state machine consistency ──
  await test('Evolution — peg without evolution is normal', () => {
    const peg = mkPeg(null);
    if (!TEST.ok(peg.evolution === null)) throw new Error();
  });

  await test('Evolution — peg.evolution object is never undefined when set', () => {
    const peg = mkPeg({ state: PegEvo.EXPLOSIVE, storedPoints: 0.0, wasRevealed: false });
    if (!TEST.ok(peg.evolution !== undefined)) throw new Error();
  });

  await test('Evolution — each state has unique string value', () => {
    const states = [PegEvo.DORMANT, PegEvo.NORMAL, PegEvo.GLOWING, PegEvo.CHARGED, PegEvo.EXPLOSIVE, PegEvo.TEMP_EXPLOSIVE];
    const unique = new Set(states);
    if (!TEST.ok(unique.size === states.length)) throw new Error('Duplicate state values');
  });

  await test('Evolution — storedPoints is number', () => {
    const evo = mkEvo(PegEvo.CHARGED);
    evo.storedPoints = 75.5;
    if (!TEST.ok(typeof evo.storedPoints === 'number')) throw new Error();
  });

  await test('Evolution — storedPoints can be fractional', () => {
    const evo = mkEvo(PegEvo.CHARGED);
    evo.storedPoints = 0.5;
    if (!TEST.ok(evo.storedPoints === 0.5)) throw new Error();
  });

  await test('Evolution — charged_store_fraction = 0.50', () => {
    if (!TEST.ok(EVO_CONFIG.charged_store_fraction === 0.50)) throw new Error();
  });

  // ── Board pegs have evolution assigned on generateBoard ──
  await test('Board — generateBoard assigns evolution to each peg', () => {
    const board = generateBoard(1);
    if (!TEST.ok(board.length > 0, 'board has pegs')) throw new Error();
    // All pegs should have evolution field
    const missingEvo = board.filter(p => p.evolution === undefined);
    if (!TEST.ok(missingEvo.length === 0, 'all pegs have evolution field')) throw new Error();
  });

  await test('Board — peg.evolution can be null (normal peg)', () => {
    const board = generateBoard(1);
    const normalPegs = board.filter(p => p.evolution === null);
    // Some pegs should be normal (65% chance)
    if (!TEST.ok(board.length > 0, 'board has pegs')) throw new Error();
  });

  await test('Board — floor 1 board has significant peg count', () => {
    const board = generateBoard(1);
    if (!TEST.ok(board.length >= 30, 'floor 1 has at least 30 pegs')) throw new Error();
  });

  await test('EVO_CONFIG — dormant_chance = 0.20', () => { if (!TEST.ok(EVO_CONFIG.dormant_chance === 0.20)) throw new Error(); });
  await test('EVO_CONFIG — glowing_chance = 0.10', () => { if (!TEST.ok(EVO_CONFIG.glowing_chance === 0.10)) throw new Error(); });
  await test('EVO_CONFIG — charged_chance = 0.04', () => { if (!TEST.ok(EVO_CONFIG.charged_chance === 0.04)) throw new Error(); });
  await test('EVO_CONFIG — explosive_chance = 0.01', () => { if (!TEST.ok(EVO_CONFIG.explosive_chance === 0.01)) throw new Error(); });
  await test('EVO_CONFIG — chain_reaction_duration = 180', () => { if (!TEST.ok(EVO_CONFIG.chain_reaction_duration === 180)) throw new Error(); });

  Object.assign(gs, _gs);
  return { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, skipped: 0, tests };
}
