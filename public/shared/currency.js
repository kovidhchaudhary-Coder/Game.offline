(function (global) {
  const KEY = 'kovidhe_save';
  const defaults = { coins: 0, outfits: { p1: 'default', p2: 'default' }, highscore: 0, owned: ['default'], settings: { volume: 0.8, graphics: 'high' } };

  function normalize(raw) {
    return {
      ...defaults,
      ...raw,
      outfits: { ...defaults.outfits, ...(raw.outfits || {}) },
      settings: { ...defaults.settings, ...(raw.settings || {}) },
      owned: Array.from(new Set([...(defaults.owned), ...((raw.owned || []))]))
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return normalize(raw);
    } catch {
      return structuredClone(defaults);
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(normalize(state || {})));
  }

  function addCurrency(playerId, amount) {
    const s = loadState();
    if (!Number.isFinite(amount)) return s;
    s.coins = Math.max(0, s.coins + amount);
    saveState(s);
    return s;
  }

  global.CurrencyStore = { KEY, loadState, saveState, addCurrency };
})(window);
