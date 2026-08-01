(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindLoot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const chances = Object.freeze([
    { type: 'coins', label: 'MOEDAS', percent: 38 },
    { type: 'upgrade', label: 'UPGRADE', percent: 25 },
    { type: 'skin', label: 'SKIN', percent: 17 },
    { type: 'boat', label: 'BARCO', percent: 8 },
    { type: 'nothing', label: 'SEM PRÊMIO', percent: 12 },
  ]);
  const pick = (items, random) => items.length ? items[Math.min(items.length - 1, Math.floor(random() * items.length))] : null;
  function rewardType(value) {
    const roll = Math.max(0, Math.min(0.999999, Number(value) || 0));
    let cursor = 0;
    for (const chance of chances) {
      cursor += chance.percent / 100;
      if (roll < cursor) return chance.type;
    }
    return 'nothing';
  }
  function roll(random = Math.random, inventory = {}) {
    const type = rewardType(random());
    if (type === 'nothing') return { type, amount: 0 };
    if (type === 'coins') return { type, amount: 30 + Math.floor(random() * 61) };
    const candidate = pick(inventory[type] || [], random);
    if (candidate) return { type, ...candidate };
    return { type: 'coins', amount: 60, convertedFrom: type };
  }
  return Object.freeze({ chances, rewardType, roll });
});
