(function (global) {
  const KEY = 'kovidhe_save';
  const defaults = {
    coins: 0,
    outfits: { p1: 'default', p2: 'default' },
    highscore: 0,
    owned: ['default'],
    settings: { volume: 0.8, graphics: 'high' }
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      ...defaults,
      ...src,
      outfits: { ...defaults.outfits, ...(src.outfits || {}) },
      settings: { ...defaults.settings, ...(src.settings || {}) },
      owned: Array.from(new Set([...(defaults.owned), ...((src.owned || []))]))
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return normalize(raw);
    } catch {
      return cloneDefaults();
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(normalize(state || {})));
  }

  function addCurrency(_playerId, amount) {
    const s = loadState();
    if (!Number.isFinite(amount)) return s;
    s.coins = Math.max(0, s.coins + amount);
    saveState(s);
    return s;
  }

  global.CurrencyStore = { KEY, loadState, saveState, addCurrency };
})(window);
