(function initNeoRush() {
  let globalState = null;
  let timer = null;
  let count = 10;

  const menu = document.getElementById("menu");
  const running = document.getElementById("running");
  const result = document.getElementById("result");
  const startBtn = document.getElementById("startBtn");
  const backBtn = document.getElementById("backBtn");
  const label = document.getElementById("playerCountLabel");
  const runtimeLabel = document.getElementById("runtimeLabel");
  const resultText = document.getElementById("resultText");

  const localState = { selectedPlayers: 1 };

  function show(state) {
    menu.classList.toggle("hidden", state !== "menu");
    running.classList.toggle("hidden", state !== "running");
    result.classList.toggle("hidden", state !== "result");
  }

  function endRun() {
    clearInterval(timer);
    show("result");
    const players = localState.selectedPlayers;
    const reward = players === 2 ? 16 : 10;
    resultText.textContent = `Finished. Reward: +${reward} for Player 1.`;
    window.parent.postMessage({
      type: "PATCH_PLAYER",
      playerId: "p1",
      patch: {
        currency: (globalState?.currency?.players?.p1?.currency || 0) + reward
      }
    }, "*");
  }

  function runGame() {
    show("running");
    count = 10;
    runtimeLabel.textContent = `Timer: ${count}`;
    clearInterval(timer);
    timer = setInterval(() => {
      count -= 1;
      runtimeLabel.textContent = `Timer: ${count}`;
      if (count <= 0) endRun();
    }, 400);
  }

  startBtn.addEventListener("click", runGame);
  backBtn.addEventListener("click", () => show("menu"));

  window.UIHelpers.bindPlayerSlider(
    document.getElementById("playerTrack"),
    document.getElementById("playerKnob"),
    (players) => {
      localState.selectedPlayers = players;
      label.textContent = `Players: ${players}`;
    }
  );

  window.addEventListener("message", (event) => {
    if (event.data?.type === "HOME_GLOBAL_STATE") {
      globalState = event.data.payload;
    }
  });

  window.parent.postMessage({ type: "REQUEST_GLOBAL_STATE" }, "*");
  show("menu");
})();
