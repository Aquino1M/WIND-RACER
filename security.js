(function () {
  'use strict';

  const SAVE_VERSION = 2;
  const NICKNAME_PATTERN = /[^\p{L}\p{N} _-]/gu;

  function nickname(value, fallback = 'MARUJO') {
    const clean = String(value ?? '')
      .normalize('NFKC')
      .replace(NICKNAME_PATTERN, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);
    return clean || fallback;
  }

  function loadSave(key, defaults) {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(key) || 'null');
    } catch (error) {
      const invalid = localStorage.getItem(key);
      if (invalid) localStorage.setItem(`${key}.corrompido.${Date.now()}`, invalid.slice(0, 100000));
      localStorage.removeItem(key);
      console.warn('Save corrompido foi isolado e recriado.', error);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    return { ...defaults, ...parsed, saveVersion: SAVE_VERSION };
  }

  async function fetchJson(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const type = response.headers.get('content-type') || '';
      const data = type.includes('application/json')
        ? await response.json()
        : { error: (await response.text()).slice(0, 240) || `HTTP ${response.status}` };
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('O servidor demorou demais para responder.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function renderPlayers(container, players, myId, ownerId) {
    container.replaceChildren();
    for (const player of players) {
      const owner = player.id === ownerId;
      const ready = owner || Boolean(player.ready);
      const row = document.createElement('span');
      row.className = `${player.id === myId ? 'me ' : ''}${ready ? 'ready' : 'waiting'}`;
      const dot = document.createElement('i');
      dot.textContent = '●';
      const label = document.createTextNode(nickname(player.name));
      const state = document.createElement('small');
      state.textContent = owner ? 'DONO · PRONTO' : ready ? '✓ PREPARADO' : 'AGUARDANDO';
      row.append(dot, label, state);
      container.append(row);
    }
  }

  function renderRank(container, racers, me, leaderScore) {
    container.replaceChildren();
    racers.slice(0, 10).forEach((racer, index) => {
      const row = document.createElement('div');
      if (racer === me) row.className = 'me';
      const name = document.createElement('span');
      name.textContent = `${index + 1} ${nickname(racer.name)}`;
      const gap = document.createElement('span');
      gap.textContent = racer === me ? 'VOCÊ' : `+${(Math.max(0, leaderScore - racer.score) * 1.7).toFixed(1)}`;
      row.append(name, gap);
      container.append(row);
    });
  }

  function validPacket(packet) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return false;
    if (!['start', 'state', 'snapshot', 'coin', 'chest', 'coinAward', 'chestAward'].includes(packet.type)) return false;
    if (typeof packet.id !== 'string' || packet.id.length > 80) return false;
    if (packet.type === 'state' || packet.type === 'snapshot') {
      const numbers = ['x', 'z', 'a', 'spd', 'cp', 'lap', 'score'];
      if (numbers.some((key) => !Number.isFinite(packet[key]))) return false;
      if (Math.abs(packet.x) > 3000 || Math.abs(packet.z) > 3000 || Math.abs(packet.spd) > 150) return false;
      if (packet.cp < 0 || packet.cp > 20 || packet.lap < 1 || packet.lap > 10) return false;
    }
    return true;
  }

  const api = Object.freeze({
    SAVE_VERSION,
    nickname,
    loadSave,
    fetchJson,
    renderPlayers,
    renderRank,
    validPacket,
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else globalThis.WindSecurity = api;
})();
