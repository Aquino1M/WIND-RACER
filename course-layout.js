(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindCourse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Circuito fechado inspirado em Interlagos, sem cruzamentos confusos.
  const track = Object.freeze([
    { x: 0, z: 120 },
    { x: 0, z: -300 },
    { x: 140, z: -610 },
    { x: 480, z: -740 },
    { x: 850, z: -690 },
    { x: 1040, z: -420 },
    { x: 950, z: -120 },
    { x: 700, z: -10 },
    { x: 860, z: 300 },
    { x: 470, z: 470 },
    { x: 120, z: 390 },
  ]);

  function orientation(a, b, c) {
    return Math.sign((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
  }
  function intersects(a, b, c, d) {
    return orientation(a, b, c) !== orientation(a, b, d)
      && orientation(c, d, a) !== orientation(c, d, b);
  }
  function hasCrossings(points = track) {
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i], b = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j += 1) {
        if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
        const c = points[j], d = points[(j + 1) % points.length];
        if (intersects(a, b, c, d)) return true;
      }
    }
    return false;
  }

  function offCourseState(distance, elapsed = 0, dt = 0) {
    const outside = Number(distance) > laneHalfWidth - 5;
    const nextElapsed = outside ? Math.max(0, elapsed) + Math.max(0, dt) : 0;
    return { outside, elapsed: nextElapsed, teleport: outside && nextElapsed >= 5 };
  }

  const laneHalfWidth = 52;
  return Object.freeze({ name: 'CIRCUITO BRASIL', track, laneHalfWidth, hasCrossings, offCourseState });
});
