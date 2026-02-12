let rafId = null;
let rootEl = null;

function ensureConfigShape(config) {
  if (!config || !config.wallet || !config.outfits) {
    console.warn('neo_rush config mismatch, using defaults');
    return { players:[{id:'P1'}], wallet:{coins:0}, outfits:{p1:'default',p2:'default'}, settings:{graphics:'high'} };
  }
  return config;
}

export async function start({ root, config, hooks }) {
  rootEl = root;
  const cfg = ensureConfigShape(config);
  const split = cfg.players.length === 2;
  root.innerHTML = `
    <div style="display:${split?'grid':'block'};grid-template-columns:1fr 1fr;gap:8px;height:62vh;">
      <canvas id="neo-c1" style="width:100%;height:100%;background:#0f1729;border:1px solid #27406a"></canvas>
      ${split ? '<canvas id="neo-c2" style="width:100%;height:100%;background:#0f1729;border:1px solid #27406a"></canvas>' : ''}
    </div>
    <div style="display:flex;gap:8px;justify-content:space-between;margin-top:8px">
      <span id="neo-score">Score: 0</span>
      <div>
        <button id="neo-replay" class="primary">Replay</button>
        <button id="neo-shop" class="secondary">Shop</button>
      </div>
    </div>`;

  let t = 0;
  let score = 0;
  const sEl = document.getElementById('neo-score');
  const c1 = document.getElementById('neo-c1');
  const ctx1 = c1.getContext('2d');
  const c2 = split ? document.getElementById('neo-c2') : null;
  const ctx2 = c2 ? c2.getContext('2d') : null;

  function drawCoinRing(ctx, width, height, phaseSeed) {
    const cx = width * 0.5; const cy = height * 0.5;
    const ringCount = 8;
    for (let i=0;i<ringCount;i++) {
      const phase = (i % ringCount) * (Math.PI*2/ringCount) + t*0.02 + phaseSeed;
      const x = cx + Math.cos(phase) * 110;
      const y = cy + Math.sin(phase) * 55;
      ctx.fillStyle = '#f7ce4a';
      ctx.beginPath(); ctx.arc(x,y,11,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8a6509';
      ctx.fillText('$', x-3, y+4);
    }
  }

  function frame() {
    [ [ctx1,c1,0], [ctx2,c2,Math.PI/6] ].forEach(([ctx,cv,seed]) => {
      if (!ctx || !cv) return;
      cv.width = cv.clientWidth; cv.height = cv.clientHeight;
      ctx.fillStyle = '#0d1a2d'; ctx.fillRect(0,0,cv.width,cv.height);
      drawCoinRing(ctx, cv.width, cv.height, seed);
      ctx.fillStyle = '#56d7ff';
      ctx.fillText(`Outfit: ${cfg.outfits.p1}`, 12, 18);
    });

    if (Math.floor(t) % 25 === 0) hooks.earn?.(50);
    score += 2;
    sEl.textContent = `Score: ${score}`;
    t += 1;
    rafId = requestAnimationFrame(frame);
  }
  frame();

  document.getElementById('neo-replay').onclick = () => {
    cancelAnimationFrame(rafId);
    start({ root, config: cfg, hooks });
  };
  document.getElementById('neo-shop').onclick = () => hooks.openShop?.();
}

export function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (rootEl) rootEl.innerHTML = '';
}
