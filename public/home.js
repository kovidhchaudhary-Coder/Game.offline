(function initHome() {
  const frame = document.getElementById("gameHost");
  const overlay = document.getElementById("transitionOverlay");
  const buttons = Array.from(document.querySelectorAll(".game-icon"));

  function buildPayload() {
    return {
      type: "HOME_GLOBAL_STATE",
      payload: {
        currency: window.CurrencyStore.get(),
        players: window.PlayerState.get()
      }
    };
  }

  async function launchGame(gameId) {
    await window.Transitions.play(overlay);
    frame.src = `./games/${gameId}/index.html`;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      launchGame(button.dataset.game);
    });
  });

  frame.addEventListener("load", () => {
    if (frame.contentWindow) {
      frame.contentWindow.postMessage(buildPayload(), "*");
    }
  });

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "REQUEST_GLOBAL_STATE" && frame.contentWindow) {
      frame.contentWindow.postMessage(buildPayload(), "*");
    }
    if (data.type === "PATCH_PLAYER" && data.playerId && data.patch) {
      window.CurrencyStore.patchPlayer(data.playerId, data.patch);
      if (frame.contentWindow) {
        frame.contentWindow.postMessage(buildPayload(), "*");
      }
    }
  });
})();
