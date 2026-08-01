(function () {
  'use strict';
  class AudioEngine {
    constructor(enabled = true) { this.enabled = enabled; this.context = null; }
    start() {
      if (this.context) { this.context.resume(); return; }
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.engine = this.context.createOscillator();
      this.gain = this.context.createGain();
      this.filter = this.context.createBiquadFilter();
      this.engine.type = 'sawtooth'; this.filter.type = 'lowpass'; this.filter.frequency.value = 260; this.gain.gain.value = 0;
      this.engine.connect(this.filter).connect(this.gain).connect(this.context.destination); this.engine.start();
    }
    setEnabled(value) { this.enabled = Boolean(value); if (this.enabled) this.start(); }
    update(speed, turbo, active) {
      if (!this.context) return;
      const now = this.context.currentTime;
      this.engine.frequency.setTargetAtTime(42 + Math.abs(speed) * 2.4 + (turbo ? 35 : 0), now, .05);
      this.filter.frequency.setTargetAtTime(180 + Math.abs(speed) * 16, now, .08);
      this.gain.gain.setTargetAtTime(this.enabled && active ? .045 : 0, now, .08);
    }
  }
  window.WindAudioEngine = AudioEngine;
})();
