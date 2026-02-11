(function initBattleship() {
  const SIZE = 8;
  const SHIPS = [
    [10, 11, 12],
    [35, 43, 51],
    [58, 59]
  ];

  const localState = { selectedPlayers: 1, difficulty: "easy" };
  let globalState = null;
  let aiTimer = null;

  const menu = document.getElementById("menu");
  const running = document.getElementById("running");
  const result = document.getElementById("result");
  const board = document.getElementById("board");
  const statusLabel = document.getElementById("status");
  const resultText = document.getElementById("resultText");
  const playersLabel = document.getElementById("playersLabel");
  const difficultyInput = document.getElementById("difficulty");

  function show(state) {
    menu.classList.toggle("hidden", state !== "menu");
    running.classList.toggle("hidden", state !== "running");
    result.classList.toggle("hidden", state !== "result");
  }

  function renderBoard(shots) {
    board.innerHTML = "";
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const div = document.createElement("div");
      div.className = "cell";
      if (shots.hit.has(i)) {
        div.classList.add("hit");
        div.textContent = "X";
      } else if (shots.miss.has(i)) {
        div.classList.add("miss");
        div.textContent = "•";
      }
      board.appendChild(div);
    }
  }

  function createShotState() {
    return { tried: new Set(), hit: new Set(), miss: new Set() };
  }

  function isHit(index) {
    return SHIPS.some((ship) => ship.includes(index));
  }

  function sunkShips(hitSet) {
    return SHIPS.filter((ship) => ship.every((cell) => hitSet.has(cell))).length;
  }

  function easyPick(tried) {
    let index = Math.floor(Math.random() * SIZE * SIZE);
    while (tried.has(index)) {
      index = Math.floor(Math.random() * SIZE * SIZE);
    }
    return index;
  }

  function inBounds(from, to, direction) {
    if (to < 0 || to >= SIZE * SIZE) return false;
    if (direction === 1 || direction === -1) {
      return Math.floor(from / SIZE) === Math.floor(to / SIZE);
    }
    return true;
  }

  function createNormalAi() {
    const directions = [-SIZE, 1, SIZE, -1];
    return {
      lead: null,
      direction: null,
      frontier: null,
      pick(tried) {
        if (this.lead !== null && this.direction !== null) {
          const next = this.frontier + this.direction;
          if (inBounds(this.frontier, next, this.direction) && !tried.has(next)) {
            return next;
          }
          const reverse = this.direction * -1;
          const retry = this.lead + reverse;
          if (inBounds(this.lead, retry, reverse) && !tried.has(retry)) {
            this.direction = reverse;
            this.frontier = this.lead;
            return retry;
          }
          this.direction = null;
          this.frontier = null;
        }

        if (this.lead !== null) {
          for (const direction of directions) {
            const idx = this.lead + direction;
            if (inBounds(this.lead, idx, direction) && !tried.has(idx)) {
              this.direction = direction;
              this.frontier = this.lead;
              return idx;
            }
          }
          this.lead = null;
        }

        return easyPick(tried);
      },
      onShot(index, wasHit, justSunk) {
        if (justSunk) {
          this.lead = null;
          this.direction = null;
          this.frontier = null;
          return;
        }

        if (wasHit) {
          if (this.lead === null) {
            this.lead = index;
            this.frontier = index;
          } else if (this.direction !== null) {
            this.frontier = index;
          }
          return;
        }

        if (this.direction !== null) {
          this.direction = this.direction * -1;
          this.frontier = this.lead;
        }
      }
    };
  }

  function runMatch() {
    show("running");
    const shots = createShotState();
    const totalShips = SHIPS.length;
    const ai = createNormalAi();
    let turns = 0;
    let previousSunk = 0;

    function finish() {
      clearInterval(aiTimer);
      show("result");
      const reward = 12;
      resultText.textContent = `Match ended in ${turns} turns. Reward +${reward} for Player 1.`;
      window.parent.postMessage(
        {
          type: "PATCH_PLAYER",
          playerId: "p1",
          patch: { currency: (globalState?.currency?.players?.p1?.currency || 0) + reward }
        },
        "*"
      );
    }

    aiTimer = setInterval(() => {
      turns += 1;
      const index = localState.difficulty === "normal" ? ai.pick(shots.tried) : easyPick(shots.tried);
      shots.tried.add(index);

      const hit = isHit(index);
      if (hit) {
        shots.hit.add(index);
      } else {
        shots.miss.add(index);
      }

      const sunk = sunkShips(shots.hit);
      const justSunk = sunk > previousSunk;
      previousSunk = sunk;

      if (localState.difficulty === "normal") {
        ai.onShot(index, hit, justSunk);
      }

      renderBoard(shots);
      statusLabel.textContent = `Turns: ${turns} | Hits: ${shots.hit.size} | Ships sunk: ${sunk}/${totalShips}`;

      if (sunk >= totalShips || turns > 80) {
        finish();
      }
    }, 180);
  }

  document.getElementById("startBtn").addEventListener("click", runMatch);
  document.getElementById("backBtn").addEventListener("click", () => show("menu"));
  difficultyInput.addEventListener("change", () => {
    localState.difficulty = difficultyInput.value === "normal" ? "normal" : "easy";
  });

  window.UIHelpers.bindPlayerSlider(
    document.getElementById("playerTrack"),
    document.getElementById("playerKnob"),
    (players) => {
      localState.selectedPlayers = players;
      playersLabel.textContent = `Players: ${players}`;
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
