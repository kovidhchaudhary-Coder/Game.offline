const SAVE_KEY = 'kovidhe_save';
const defaultSave = {
  coins: 0,
  outfits: { p1: 'default', p2: 'default' },
  highscore: 0,
  owned: ['default'],
  settings: { volume: 0.8, graphics: 'high' }
};

const shopItems = [
  { id: 'outfit-neon', label: 'Neon Outfit', type: 'outfit', price: 2000, rarity: 'epic' },
  { id: 'face-smile', label: 'Face Decal', type: 'face', price: 500, rarity: 'common' },
  { id: 'skin-abyss', label: 'Board Skin', type: 'board', price: 800, rarity: 'rare' },
  { id: 'power-pack', label: 'Powerup Pack', type: 'power', price: 300, rarity: 'rare' }
];

let currentModule = null;
let playerMode = 1;
const walletView = document.getElementById('wallet-view');
const launcher = document.getElementById('launcher');
const gameScene = document.getElementById('game-scene');
const gameRoot = document.getElementById('game-root');
const overlay = document.getElementById('overlay');
const loadingScreen = document.getElementById('loading-screen');
const loadingTitle = document.getElementById('loading-title');
const loadingSubtitle = document.getElementById('loading-subtitle');

function normalizeSave(parsed = {}) {
  return {
    ...defaultSave,
    ...parsed,
    outfits: { ...defaultSave.outfits, ...(parsed.outfits || {}) },
    settings: { ...defaultSave.settings, ...(parsed.settings || {}) },
    owned: Array.from(new Set([...(defaultSave.owned), ...((parsed.owned || []))]))
  };
}

function loadSave() {
  try {
    return normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
  } catch {
    return normalizeSave();
  }
}

function saveAll(next) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(next)));
}

function updateWalletUI() {
  walletView.textContent = `Coins: ${loadSave().coins}`;
}

function creditCoins(amount) {
  if (!Number.isFinite(amount)) return;
  const s = loadSave();
  s.coins = Math.max(0, s.coins + amount);
  saveAll(s);
  updateWalletUI();
}

function playerConfig() {
  const save = loadSave();
  return {
    players: playerMode === 2
      ? [{ id: 'P1', input: 'keyboard1' }, { id: 'P2', input: 'keyboard2' }]
      : [{ id: 'P1', input: 'keyboard1' }],
    wallet: { coins: save.coins },
    outfits: save.outfits,
    settings: save.settings
  };
}

function showLoading(title = 'Preparing experience…', subtitle = 'Please wait while we lock things in.') {
  loadingTitle.textContent = title;
  loadingSubtitle.textContent = subtitle;
  loadingScreen.classList.remove('hidden');
  loadingScreen.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
  loadingScreen.classList.add('hidden');
  loadingScreen.setAttribute('aria-hidden', 'true');
}

async function loadGame(name) {
  if (currentModule?.stop) currentModule.stop();

  if (name === 'shop') return openShop();
  if (name === 'settings') return openSettings();

  const map = {
    neo_rush: () => import('/js/neo_rush.js'),
    battleship: () => import('/js/battleship.js')
  };

  const loader = map[name];
  if (!loader) return;

  showLoading(`Launching ${name === 'neo_rush' ? 'NEO Rush' : 'Battleship'}…`, 'Warming up assets for a smooth lock-in.');
  const minDelay = new Promise((resolve) => setTimeout(resolve, 750));

  try {
    const modulePromise = loader();
    currentModule = await modulePromise;
    launcher.classList.remove('active');
    gameScene.classList.add('active');

    await Promise.all([
      currentModule.start({
        root: gameRoot,
        config: playerConfig(),
        hooks: { earn: creditCoins, openShop }
      }),
      minDelay
    ]);
  } catch (error) {
    console.error('Failed to start module:', error);
    backLauncher();
  } finally {
    hideLoading();
  }
}

function backLauncher() {
  currentModule?.stop?.();
  currentModule = null;
  gameRoot.innerHTML = '';
  gameScene.classList.remove('active');
  launcher.classList.add('active');
  updateWalletUI();
}

function modal(html, onBind) {
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
  onBind?.();
}

function closeModal() {
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '';
}

function buyItem(item) {
  const s = loadSave();
  if (s.owned.includes(item.id)) return;
  if (s.coins < item.price) return alert('Not enough coins');

  s.coins -= item.price;
  s.owned.push(item.id);
  if (item.type === 'outfit') {
    s.outfits.p1 = item.id;
    s.outfits.p2 = item.id;
  }

  saveAll(s);
  updateWalletUI();
}

function openShop() {
  const html = `<h2>Shop</h2>
    <div class="list">
      ${shopItems.map((i) => `<div class="item"><span>${i.label} (${i.rarity})</span><button data-buy="${i.id}">${i.price}</button></div>`).join('')}
    </div>
    <div style="margin-top:8px"><button id="close-shop" class="secondary">Close</button></div>`;

  modal(html, () => {
    document.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.onclick = () => {
        const item = shopItems.find((i) => i.id === btn.dataset.buy);
        if (!item) return;
        if (!confirm(`Buy ${item.label} for ${item.price}?`)) return;
        buyItem(item);
        openShop();
      };
    });

    document.getElementById('close-shop').onclick = closeModal;
  });
}

function openSettings() {
  const s = loadSave();
  modal(`<h2>Settings</h2>
    <label>Volume <input id="set-volume" type="range" min="0" max="1" step="0.1" value="${s.settings.volume}" /></label>
    <label>Graphics
      <select id="set-graphics">
        <option ${s.settings.graphics === 'low' ? 'selected' : ''}>low</option>
        <option ${s.settings.graphics === 'med' ? 'selected' : ''}>med</option>
        <option ${s.settings.graphics === 'high' ? 'selected' : ''}>high</option>
      </select>
    </label>
    <div style="margin-top:8px"><button id="save-settings" class="primary">Save</button></div>`, () => {
    document.getElementById('save-settings').onclick = () => {
      const next = loadSave();
      next.settings.volume = Number(document.getElementById('set-volume').value);
      next.settings.graphics = document.getElementById('set-graphics').value;
      saveAll(next);
      closeModal();
    };
  });
}

function bindPlayerUI() {
  const slider = document.getElementById('player-slider');
  const mode = document.getElementById('player-mode');
  slider.oninput = () => {
    playerMode = Number(slider.value) >= 50 ? 2 : 1;
    mode.textContent = playerMode === 2 ? '2 Players' : '1 Player';
  };

  const token = document.querySelector('.token');
  token.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', token.dataset.token));

  document.querySelectorAll('.slot').forEach((slot) => {
    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      document.querySelectorAll('.slot').forEach((s) => s.classList.remove('active'));
      slot.classList.add('active');
      slot.textContent = `${slot.dataset.slot} ✓`;
    });
  });
}

document.querySelectorAll('.app-icon').forEach((btn) => {
  btn.onclick = () => loadGame(btn.dataset.app);
});

document.getElementById('back-launcher').onclick = backLauncher;
document.getElementById('pause-btn').onclick = () => {
  modal('<h2>Paused</h2><button id="resume" class="primary">Resume</button><button id="pause-shop" class="secondary">Shop</button>', () => {
    document.getElementById('resume').onclick = closeModal;
    document.getElementById('pause-shop').onclick = openShop;
  });
};

bindPlayerUI();
updateWalletUI();
