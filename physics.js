(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const profiles = {
    sloop: { weight: 1, grip: 4.8, drift: 0.12 }, catamaran: { weight: 0.92, grip: 5.4, drift: 0.08 },
    racer: { weight: 0.82, grip: 4.2, drift: 0.18 }, trimaran: { weight: 0.88, grip: 5.8, drift: 0.07 },
    caravel: { weight: 1.35, grip: 3.4, drift: 0.22 }, viking: { weight: 1.45, grip: 3.1, drift: 0.25 },
    baleeira: { weight: 1.18, grip: 4.1, drift: 0.15 }, bigdog: { weight: 1.7, grip: 2.8, drift: 0.28 },
    solar: { weight: 1.08, grip: 4.5, drift: 0.13 },
  };
  const profile = (type) => profiles[type] || profiles.sloop;
  function advance(racer, dt, windX = 0, windZ = 0) {
    const p = profile(racer.spec?.type);
    const desiredX = Math.sin(racer.a) * racer.spd;
    const desiredZ = Math.cos(racer.a) * racer.spd;
    const response = Math.min(1, dt * p.grip);
    racer.vx = Number.isFinite(racer.vx) ? racer.vx + (desiredX - racer.vx) * response : desiredX;
    racer.vz = Number.isFinite(racer.vz) ? racer.vz + (desiredZ - racer.vz) * response : desiredZ;
    const sailForce = Math.min(1.8, Math.abs(racer.spd) / 35) / p.weight;
    racer.vx += windX * sailForce * dt;
    racer.vz += windZ * sailForce * dt;
    const lateralX = racer.vx - desiredX;
    const lateralZ = racer.vz - desiredZ;
    racer.vx -= lateralX * Math.min(1, dt * (1 / p.drift));
    racer.vz -= lateralZ * Math.min(1, dt * (1 / p.drift));
    return { dx: racer.vx * dt, dz: racer.vz * dt, lean: Math.hypot(lateralX, lateralZ) * 0.008 };
  }
  function collisionSpeed(speed, type, resistance = 0, obstacleWeight = 1) {
    const p = profile(type);
    const loss = Math.max(0.08, Math.min(0.55, (0.34 * obstacleWeight) / p.weight - resistance * 0.008));
    return -speed * loss;
  }
  function boatCollision(a, b) {
    const pa = profile(a.spec?.type), pb = profile(b.spec?.type), total = pa.weight + pb.weight;
    return { a: Math.max(0.58, 1 - 0.3 * pb.weight / total), b: Math.max(0.58, 1 - 0.3 * pa.weight / total) };
  }
  function windCurrent(racer, current) {
    const dx = racer.x - current.x, dz = racer.z - current.z;
    const fx = Math.sin(current.a), fz = Math.cos(current.a), along = dx * fx + dz * fz;
    const side = dx * fz - dz * fx, aligned = Math.max(0, Math.cos(racer.a - current.a));
    const inside = Math.abs(along) <= current.length / 2 && Math.abs(side) <= current.width;
    return { inside, aligned, boost: inside ? current.strength * (0.35 + aligned * 0.65) : 0, lateral: inside ? -side * 0.08 : 0 };
  }
  return Object.freeze({ profile, advance, collisionSpeed, boatCollision, windCurrent });
});
