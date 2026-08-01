(function () {
  'use strict';
  let samples = [], cooldown = 0;
  function update(dt, mode, quality, change) {
    if (mode !== 'auto' || dt <= 0 || dt > 0.2) return;
    samples.push(1 / dt);
    if (samples.length < 180) return;
    const fps = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    samples = [];
    if (cooldown > 0) { cooldown--; return; }
    if (fps < 38 && quality !== 'low') { change(quality === 'high' ? 'medium' : 'low'); cooldown = 2; }
    else if (fps > 56 && quality !== 'high') { change(quality === 'low' ? 'medium' : 'high'); cooldown = 3; }
  }
  window.WindPerformance = Object.freeze({ update });
})();
