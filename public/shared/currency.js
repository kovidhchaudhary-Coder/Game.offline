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
    try {
      localStorage.setItem(KEY, JSON.stringify(normalize(state || {})));
      return true;
    } catch {
      return false;
    }
  }

  function addCurrency(_playerId, amount) {
    const current = loadState();
    const delta = Number(amount);
    if (!Number.isFinite(delta)) return current;

    const next = { ...current, coins: Math.max(0, current.coins + delta) };
    const ok = saveState(next);
    if (!ok) {
      return current;
    }
    return next;
  }

  global.CurrencyStore = { KEY, loadState, saveState, addCurrency };
})(window);
