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

test('corrente de vento acelera dentro da faixa e respeita o alinhamento', () => {
  const current = { x: 0, z: 0, a: 0, length: 100, width: 12, strength: 14 };
  const aligned = physics.windCurrent({ x: 2, z: 10, a: 0 }, current);
  const reverse = physics.windCurrent({ x: 2, z: 10, a: Math.PI }, current);
  const outside = physics.windCurrent({ x: 30, z: 10, a: 0 }, current);
  assert.equal(aligned.inside, true);
  assert.ok(aligned.boost > reverse.boost);
  assert.ok(aligned.boost >= current.strength * 1.2);
  assert.equal(outside.inside, false);
  assert.equal(outside.boost, 0);
});

test('corrente funciona como turbo extra acima da velocidade maxima normal', () => {
  const flow = physics.windCurrent({ x: 0, z: 0, a: 0 }, { x: 0, z: 0, a: 0, length: 100, width: 20, strength: 34 });
  const result = physics.applyWindBoost(50, 50, flow, 0.5);
  assert.ok(result.speed > 50);
  assert.ok(result.speed <= 96);
  assert.ok(result.boost > 0);
});
