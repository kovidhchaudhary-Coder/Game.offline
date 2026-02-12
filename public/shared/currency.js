(function initCurrency(global) {
  const STORAGE_KEY = "KOVIDHE_GLOBAL_STATE";

  const defaultState = {
    players: {
      p1: { currency: 0, outfit: "default", theme: "classic" },
      p2: { currency: 0, outfit: "default", theme: "classic" }
    },
    unlocks: { difficulty: ["easy"] }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = clone(defaultState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw);
      return {
        ...clone(defaultState),
        ...parsed,
        players: {
          ...clone(defaultState.players),
          ...(parsed.players || {})
        }
      };
    } catch (_error) {
      const seed = clone(defaultState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  function writeState(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function patchPlayer(playerId, patch) {
    const state = readState();
    state.players[playerId] = { ...(state.players[playerId] || {}), ...patch };
    writeState(state);
    return state;
  }

  global.CurrencyStore = {
    key: STORAGE_KEY,
    get: readState,
    set: writeState,
    patchPlayer
  };
})(window);
