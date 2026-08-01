const test = require('node:test');
const assert = require('node:assert/strict');
const upgrades = require('../upgrade-system.js');

test('normaliza todos os nove upgrades e bloqueia valores corrompidos', () => {
  const result = upgrades.normalize({ speed: '3', accel: NaN, draft: -4, turn: 99, hull: {}, capacity: 2.8, regen: 'ruim', magnet: 1, coins: 5 });
  assert.deepEqual(result, { speed: 3, accel: 0, draft: 0, turn: 5, hull: 0, capacity: 2, regen: 0, magnet: 1, coins: 5 });
});

test('cada upgrade modifica somente seu atributo de corrida', () => {
  const base = upgrades.effects({});
  const expected = {
    speed: ['speedBonus', 2], accel: ['accelBonus', 3], draft: ['draftBonus', 1.8],
    turn: ['turnBonus', 0.09], hull: ['resistanceBonus', 4], capacity: ['maxTurbos', 4],
    regen: ['regenSeconds', 18], magnet: ['magnetRadius', 10], coins: ['coinMultiplier', 2],
  };
  for (const [id, [field, value]] of Object.entries(expected)) {
    const effect = upgrades.effects({ [id]: 1 });
    assert.equal(effect[field], value, `${id} não aplicou ${field}`);
    assert.ok(Number.isFinite(effect[field]));
  }
  assert.equal(base.maxTurbos, 3);
  assert.equal(base.regenSeconds, 22);
});

test('regeneração nunca produz NaN e fica mais rápida até o limite', () => {
  assert.deepEqual(upgrades.regen(NaN, { regen: 'inválido' }, NaN, 1, 3), { duration: 22, elapsed: 0, percent: 0 });
  assert.equal(upgrades.regen(2.5, { regen: 5 }, 10, 1, 3).percent, 50);
  assert.equal(upgrades.regen(99, { regen: 5 }, 10, 3, 3).percent, 100);
});

test('progressão de nível 0 a 5 é válida para todos os upgrades', () => {
  const increasing = ['speedBonus', 'accelBonus', 'draftBonus', 'turnBonus', 'resistanceBonus', 'maxTurbos', 'magnetRadius', 'coinMultiplier'];
  const fields = { speed: 'speedBonus', accel: 'accelBonus', draft: 'draftBonus', turn: 'turnBonus', hull: 'resistanceBonus', capacity: 'maxTurbos', magnet: 'magnetRadius', coins: 'coinMultiplier' };
  for (const [id, field] of Object.entries(fields)) {
    const values = Array.from({ length: 6 }, (_, level) => upgrades.effects({ [id]: level })[field]);
    assert.ok(values.every(Number.isFinite), `${id} gerou valor inválido`);
    assert.ok(values.every((value, index) => index === 0 || value > values[index - 1]), `${id} não melhora por nível`);
  }
  const regen = Array.from({ length: 6 }, (_, level) => upgrades.effects({ regen: level }).regenSeconds);
  assert.deepEqual(regen, [22, 18, 14, 10, 6, 5]);
  assert.ok(increasing.every((field) => Number.isFinite(upgrades.effects({})[field])));
});
