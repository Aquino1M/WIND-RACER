(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindUpgrades = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const IDS = Object.freeze(['speed', 'accel', 'draft', 'turn', 'hull', 'capacity', 'regen', 'magnet', 'coins']);

  function level(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(5, Math.floor(parsed))) : 0;
  }

  function normalize(levels) {
    const source = levels && typeof levels === 'object' && !Array.isArray(levels) ? levels : {};
    return Object.fromEntries(IDS.map((id) => [id, level(source[id])]));
  }

  function normalizeTree(tree) {
    if (!tree || typeof tree !== 'object' || Array.isArray(tree)) return {};
    return Object.fromEntries(Object.entries(tree).map(([boat, levels]) => [boat, normalize(levels)]));
  }

  function effects(levels, skinRegen = 0) {
    const u = normalize(levels);
    const skin = Number.isFinite(Number(skinRegen)) ? Number(skinRegen) : 0;
    return Object.freeze({
      levels: u,
      speedBonus: u.speed * 2,
      accelBonus: u.accel * 3,
      draftBonus: u.draft * 1.8,
      turnBonus: u.turn * 0.09,
      resistanceBonus: u.hull * 4,
      maxTurbos: 3 + u.capacity,
      regenSeconds: Math.max(5, 22 - u.regen * 4 - skin * 0.3),
      magnetRadius: 7 + u.magnet * 3,
      coinMultiplier: 2 ** u.coins,
    });
  }

  function regen(elapsed, levels, skinRegen = 0, turbos = 0, maxTurbos = 3) {
    const duration = effects(levels, skinRegen).regenSeconds;
    const safeElapsed = Number.isFinite(Number(elapsed)) ? Math.max(0, Number(elapsed)) : 0;
    const complete = Number(turbos) >= Number(maxTurbos);
    return { duration, elapsed: complete ? 0 : safeElapsed, percent: complete ? 100 : Math.min(100, Math.round(safeElapsed / duration * 100)) };
  }

  return Object.freeze({ IDS, level, normalize, normalizeTree, effects, regen });
});
