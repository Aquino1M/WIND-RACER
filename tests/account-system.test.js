const test = require('node:test');
const assert = require('node:assert/strict');
const account = require('../account-system.js');

test('normaliza nickname de conta de forma determinística', () => {
  assert.equal(account.normalizeNickname('  Capitão_Aquino! '), 'capitao_aquino');
  assert.equal(account.accountEmail('AQUINO_10'), 'aquino_10@players.wind-racer.invalid');
});

test('valida nickname e senha sem aceitar formato ambíguo', () => {
  assert.match(account.nicknameError('ab'), /3 caracteres/);
  assert.match(account.nicknameError('nome com espaço'), /somente/);
  assert.equal(account.nicknameError('piloto_01'), '');
  assert.match(account.passwordError('1234567'), /8 caracteres/);
  assert.equal(account.passwordError('barco-vento-2026'), '');
});

test('limita e apresenta nível junto do nickname', () => {
  assert.equal(account.level(0), 1);
  assert.equal(account.level(1200), 999);
  assert.equal(account.tag('AQUINO', 27), 'AQUINO  ·  NV.27');
});
