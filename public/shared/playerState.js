(function initPlayerState(global) {
  const defaults = {
    selectedPlayers: 1,
    activePlayerId: "p1"
  };

  let runtime = { ...defaults };

  function get() {
    return { ...runtime };
  }

  function setPlayers(count) {
    runtime.selectedPlayers = count === 2 ? 2 : 1;
  }

  function setActive(playerId) {
    runtime.activePlayerId = playerId === "p2" ? "p2" : "p1";
  }

  global.PlayerState = {
    get,
    setPlayers,
    setActive
  };
})(window);
