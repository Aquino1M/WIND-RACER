const test = require('node:test');
const assert = require('node:assert/strict');
const loot = require('../loot-system.js');

test('probabilidades do baú somam 100% e respeitam todas as faixas', () => {
  assert.equal(loot.chances.reduce((sum, item) => sum + item.percent, 0), 100);
  assert.equal(loot.rewardType(0), 'coins');
  assert.equal(loot.rewardType(0.3799), 'coins');
  assert.equal(loot.rewardType(0.38), 'upgrade');
  assert.equal(loot.rewardType(0.63), 'skin');
  assert.equal(loot.rewardType(0.80), 'boat');
  assert.equal(loot.rewardType(0.88), 'nothing');
});

test('baú entrega item elegível e converte categoria esgotada em moedas', () => {
  let values = [0.80, 0];
  const boat = loot.roll(() => values.shift(), { boat: [{ id: 'viking', name: 'DRAKKAR' }] });
  assert.equal(boat.type, 'boat');
  assert.equal(boat.id, 'viking');
  const converted = loot.roll(() => 0.7, { skin: [] });
  assert.deepEqual(converted, { type: 'coins', amount: 60, convertedFrom: 'skin' });
});

test('baú vazio não concede recompensa', () => {
  assert.deepEqual(loot.roll(() => 0.99, {}), { type: 'nothing', amount: 0 });
});

test('subir de nível cria exatamente um baú pendente', () => {
  const memory = new Map();
  global.localStorage = {
    getItem: key => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
  };
  delete require.cache[require.resolve('../progression.js')];
  const progression = require('../progression.js');
  progression.recordRace({ position: 1, coins: 0, time: 60000 });
  progression.recordRace({ position: 1, coins: 0, time: 60000 });
  assert.equal(progression.data.season.level, 2);
  assert.equal(progression.data.season.pendingChests, 1);
  assert.equal(progression.consumeChest({ type: 'nothing' }), true);
  assert.equal(progression.data.season.pendingChests, 0);
  assert.equal(progression.consumeChest({ type: 'coins' }), false);
});
