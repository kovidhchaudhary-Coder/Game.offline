let rootEl = null;

function ensureConfigShape(config) {
  if (!config || !config.wallet || !config.outfits) {
    console.warn('battleship config mismatch, using defaults');
    return { players: [{ id: 'P1' }], wallet: { coins: 0 }, outfits: { p1: 'default', p2: 'default' }, settings: { graphics: 'high' } };
  }
  return config;
}

function createBoard() {
  return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'unknown'));
}

function key([r, c]) {
  return `${r},${c}`;
}

function inBounds(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function neighbors([r, c]) {
  return [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].filter(([nr, nc]) => inBounds(nr, nc));
}

export function aiNextShot(state) {
  const available = (coord) => !state.shots.has(key(coord));

  if (state.mode === 'normal' && state.target.length) {
    while (state.target.length) {
      const candidate = state.target.shift();
      if (available(candidate)) return candidate;
    }
  }

  const candidates = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (!available([r, c])) continue;
      if (state.mode !== 'normal' || (r + c) % 2 === 0) candidates.push([r, c]);
    }
  }

  if (!candidates.length) return [0, 0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function aiProcessResult(state, coord, hit, sunk) {
  const [r, c] = coord;
  const shotKey = key(coord);
  state.shots.add(shotKey);
  state.grid[r][c] = hit ? 'hit' : 'miss';

  if (hit) {
    state.hitCluster.push(coord);

    if (state.mode === 'normal') {
      const cluster = state.hitCluster;
      if (cluster.length >= 2) {
        const [a, b] = cluster;
        const horizontal = a[0] === b[0];
        const sorted = [...cluster].sort((x, y) => horizontal ? x[1] - y[1] : x[0] - y[0]);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const forward = horizontal ? [last[0], last[1] + 1] : [last[0] + 1, last[1]];
        const backward = horizontal ? [first[0], first[1] - 1] : [first[0] - 1, first[1]];
        state.target = [forward, backward].filter(([nr, nc]) => inBounds(nr, nc));
      } else {
        state.target = neighbors(coord);
      }
    }
  }

  if (!hit && state.mode === 'normal' && state.hitCluster.length === 1) {
    const origin = state.hitCluster[0];
    state.target = neighbors(origin);
  }

  if (sunk) {
    for (const [hr, hc] of state.hitCluster) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = hr + dr;
          const nc = hc + dc;
          if (!inBounds(nr, nc)) continue;
          if (state.grid[nr][nc] === 'unknown') state.grid[nr][nc] = 'miss';
        }
      }
    }
    state.hitCluster = [];
    state.target = [];
  }
}

export async function start({ root, config, hooks }) {
  rootEl = root;
  const cfg = ensureConfigShape(config);
  const mode = cfg.players.length === 2 ? 'local2p' : 'normal';
  const ai = {
    mode: mode === 'local2p' ? 'easy' : 'normal',
    grid: createBoard(),
    shots: new Set(),
    hitCluster: [],
    target: []
  };

  const ships = new Set(['1,1', '1,2', '1,3', '4,5', '5,5']);
  const sunkTrack = new Set();

  root.innerHTML = `<div class="card"><h3>Battleship (${mode})</h3><div id="bs-log" style="height:220px;overflow:auto;white-space:pre-line"></div>
    <div style="margin-top:8px"><button id="bs-shot" class="primary">AI Shot</button> <button id="bs-end" class="secondary">End Match</button></div></div>`;

  const log = document.getElementById('bs-log');
  const append = (x) => {
    log.textContent += `${x}\n`;
    log.scrollTop = log.scrollHeight;
  };

  let sunkShips = 0;

  document.getElementById('bs-shot').onclick = () => {
    const shot = aiNextShot(ai);
    const k = key(shot);
    const hit = ships.has(k);

    if (hit) sunkTrack.add(k);
    const sunk = hit && sunkTrack.size % 3 === 0;

    aiProcessResult(ai, shot, hit, sunk);
    append(`${hit ? 'Hit' : 'Miss'} at ${k}`);

    if (sunk) {
      sunkShips += 1;
      append('Ship sunk.');
      hooks.earn?.(50);
    }
  };

  document.getElementById('bs-end').onclick = () => {
    const reward = sunkShips > 1 ? 500 : 100;
    hooks.earn?.(reward);
    append(`Match end reward +${reward}`);
  };
}

export function stop() {
  if (rootEl) rootEl.innerHTML = '';
}
