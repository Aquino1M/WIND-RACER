const test = require('node:test');
const assert = require('node:assert/strict');
const smoothing = require('../network-smoothing.js');

test('barco remoto se aproxima sem teleportar em um unico quadro', () => {
  const next = smoothing.step({ x: 0, z: 0, a: 0 }, { x: 40, z: 0, a: 0, spd: 30, receivedAt: 1000 }, 1 / 60, 1080);
  assert.ok(next.x > 0 && next.x < 10);
  assert.ok(next.z > 0 && next.z < next.predictedZ);
});

test('previsao compensa apenas uma janela curta de latencia', () => {
  const next = smoothing.step({ x: 0, z: 0, a: 0 }, { x: 0, z: 10, a: 0, spd: 50, receivedAt: 1000 }, 1 / 60, 2000);
  assert.equal(next.predictedZ, 21);
});
