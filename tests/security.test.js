const test = require('node:test');
const assert = require('node:assert/strict');
const security = require('../security.js');

test('nickname remove HTML e preserva nomes válidos', () => {
  assert.equal(security.nickname('<img src=x> Aquino'), 'img srcx Aquino');
  assert.equal(security.nickname('  Capitão   José  '), 'Capitão José');
  assert.equal(security.nickname('<script>'), 'script');
});

test('pacotes inválidos e posições absurdas são rejeitados', () => {
  assert.equal(security.validPacket({ type: 'state', id: 'a', x: 0, z: 0, a: 0, spd: 30, cp: 1, lap: 1, score: 2 }), true);
  assert.equal(security.validPacket({ type: 'state', id: 'a', x: 99999, z: 0, a: 0, spd: 30, cp: 1, lap: 1, score: 2 }), false);
  assert.equal(security.validPacket({ type: 'finishResult', id: 'host', playerId: 'player', finishOrder: 1, score: 44 }), true);
  assert.equal(security.validPacket({ type: 'finishResult', id: 'host', playerId: 'player', finishOrder: 0, score: 44 }), false);
  assert.equal(security.validPacket({ type: 'hack', id: 'a' }), false);
});
