const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../race-rules.js');

test('checkpoints avançam e a linha final conclui a última volta', () => {
  assert.deepEqual(rules.advanceCheckpoint(3, 1, 3, 11), { cp: 4, lap: 1, done: false });
  assert.deepEqual(rules.advanceCheckpoint(0, 3, 3, 11), { cp: 1, lap: 4, done: true });
});

test('ranking prioriza quem terminou e respeita ordem de chegada', () => {
  const racers = [{ name: 'B', done: false, score: 99 }, { name: 'A', done: true, finishOrder: 1, score: 20 }];
  assert.equal(rules.order(racers)[0].name, 'A');
});

test('recompensas têm limite e bônus até décimo lugar', () => {
  assert.deepEqual(rules.reward(1, 63), { bonus: 100, total: 163 });
  assert.deepEqual(rules.reward(10, 999), { bonus: 8, total: 258 });
});

test('sala exige ao menos um convidado preparado', () => {
  assert.equal(rules.lobbyReady(true, []), false);
  assert.equal(rules.lobbyReady(true, [{ ready: true }]), true);
  assert.equal(rules.lobbyReady(true, [{ ready: false }]), false);
});

test('preço do upgrade respeita nível máximo', () => {
  assert.equal(rules.upgradeCost([35, 70, 105, 150, 210], 0), 35);
  assert.equal(rules.upgradeCost([35, 70, 105, 150, 210], 5), null);
});
