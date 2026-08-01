(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindNetworkSmoothing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  function step(current, target, dt, now = performance.now()) {
    const age = Math.max(0, Math.min(0.22, (now - (target.receivedAt || now)) / 1000));
    const predictedX = target.x + Math.sin(target.a) * target.spd * age;
    const predictedZ = target.z + Math.cos(target.a) * target.spd * age;
    const dx = predictedX - current.x, dz = predictedZ - current.z, distance = Math.hypot(dx, dz);
    const alpha = 1 - Math.exp(-Math.max(0, dt) * (distance > 35 ? 12 : 8));
    const maxStep = Math.max(1.5, Math.abs(target.spd) * dt * 2 + 1);
    const movement = Math.min(distance, distance * alpha, maxStep);
    const ratio = distance > 0 ? movement / distance : 0;
    return {
      x: current.x + dx * ratio,
      z: current.z + dz * ratio,
      a: current.a + angleDiff(current.a, target.a) * Math.min(1, dt * 10),
      predictedX,
      predictedZ,
    };
  }

  return Object.freeze({ step });
});
