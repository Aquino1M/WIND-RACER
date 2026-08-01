(function () {
  'use strict';
  const KEY = 'windRacerProgression';
  const today = () => new Date().toISOString().slice(0, 10);
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; }
  }
  let data = load();
  data.stats = data.stats || { races: 0, wins: 0, podiums: 0, bestTime: null, coins: 0 };
  data.season = data.season || { id: 'TEMPORADA-1', xp: 0, level: 1 };
  data.challenges = data.challenges?.date === today() ? data.challenges : {
    date: today(),
    items: [
      { id: 'race', label: 'Complete 3 regatas', goal: 3, value: 0, reward: 35 },
      { id: 'coins', label: 'Colete 75 moedas', goal: 75, value: 0, reward: 45 },
      { id: 'podium', label: 'Chegue ao pódio', goal: 1, value: 0, reward: 60 },
    ],
  };
  const persist = () => localStorage.setItem(KEY, JSON.stringify(data));
  function recordRace(result) {
    const s = data.stats;
    s.races++; s.wins += result.position === 1 ? 1 : 0; s.podiums += result.position <= 3 ? 1 : 0;
    s.coins += result.coins || 0; s.bestTime = s.bestTime == null ? result.time : Math.min(s.bestTime, result.time);
    const values = { race: 1, coins: result.coins || 0, podium: result.position <= 3 ? 1 : 0 };
    let reward = 0;
    data.challenges.items.forEach((challenge) => {
      const wasDone = challenge.value >= challenge.goal;
      challenge.value = Math.min(challenge.goal, challenge.value + values[challenge.id]);
      if (!wasDone && challenge.value >= challenge.goal) reward += challenge.reward;
    });
    data.season.xp += 20 + Math.max(0, 11 - result.position) * 3;
    data.season.level = 1 + Math.floor(data.season.xp / 100);
    persist();
    return reward;
  }
  function saveGhost(track, samples) { localStorage.setItem(`windRacerGhost:${track}`, JSON.stringify(samples.slice(-12000))); }
  function getGhost(track) { try { return JSON.parse(localStorage.getItem(`windRacerGhost:${track}`) || '[]'); } catch { return []; } }
  function tutorialSeen() { return localStorage.getItem('windRacerTutorial') === '1'; }
  function completeTutorial() { localStorage.setItem('windRacerTutorial', '1'); }
  window.WindProgression = Object.freeze({ data, recordRace, saveGhost, getGhost, tutorialSeen, completeTutorial });
})();
