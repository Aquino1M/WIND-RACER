const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../physics.js');

test('barco pesado perde menos velocidade na colisão', () => {
  const light = Math.abs(physics.collisionSpeed(50, 'racer', 0));
  const heavy = Math.abs(physics.collisionSpeed(50, 'bigdog', 0));
  assert.ok(heavy < light);
});

test('avanço aplica inércia e vento sem gerar valores inválidos', () => {
  const racer = { a: 0, spd: 40, vx: 0, vz: 0, spec: { type: 'sloop' } };
  const motion = physics.advance(racer, 1 / 60, 2, 0);
  assert.ok(Number.isFinite(motion.dx) && Number.isFinite(motion.dz));
  assert.ok(motion.dz > 0);
});
