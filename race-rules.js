(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WindRaceRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const bonuses = Object.freeze([100, 80, 65, 50, 40, 30, 22, 16, 12, 8]);
  function advanceCheckpoint(cp, lap, totalLaps, trackLength) {
    if (!Number.isInteger(cp) || cp < 0 || cp >= trackLength) throw new RangeError('checkpoint inválido');
    let next = (cp + 1) % trackLength, nextLap = lap, done = false;
    if (cp === 0) { nextLap++; done = nextLap > totalLaps; }
    return { cp: next, lap: nextLap, done };
  }
  function order(racers) {
    return [...racers].sort((a, b) => a.done && b.done
      ? (a.finishOrder || 99) - (b.finishOrder || 99)
      : a.done !== b.done ? (a.done ? -1 : 1) : b.score - a.score);
  }
  function reward(position, collected) {
    const pos = Math.max(1, Math.min(10, Math.trunc(position)));
    const safeCollected = Math.max(0, Math.min(250, Math.trunc(collected)));
    return { bonus: bonuses[pos - 1], total: Math.min(350, safeCollected + bonuses[pos - 1]) };
  }
  function lobbyReady(host, players) {
    return Boolean(host && players.length >= 1 && players.every((player) => player.ready));
  }
  function upgradeCost(prices, level) {
    return Number.isInteger(level) && level >= 0 && level < prices.length ? prices[level] : null;
  }
  return Object.freeze({ bonuses, advanceCheckpoint, order, reward, lobbyReady, upgradeCost });
});
