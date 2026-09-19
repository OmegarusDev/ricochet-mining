import { StorageManager } from './engine/StorageManager.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { GameEngine } from './engine/GameEngine.js';
import { UIManager } from './ui/UIManager.js';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err) => {
    console.warn('Service worker registration failed.', err);
  });
}

function boot() {
  const startWorker = () => setTimeout(registerServiceWorker, 500);
  if (document.readyState === 'complete') {
    startWorker();
  } else {
    window.addEventListener('load', startWorker);
  }

  const { state, offline } = StorageManager.load();
  state.settings.gameSpeed = Number(state.settings.gameSpeed) || 1;
  state.settings.sfxVolume = Number.isFinite(Number(state.settings.sfxVolume))
    ? Number(state.settings.sfxVolume)
    : 0.7;

  const sound = new SoundEngine();
  sound.setVolume(state.settings.sfxVolume);
  sound.ensureContext();
  sound.attachUnlock();

  const canvas = document.getElementById('game-canvas');
  const engine = new GameEngine({ canvas, state, sound });
  const ui = new UIManager(engine);
  globalThis.__rmc = { engine, ui };

  if (offline) {
    ui.showOffline(offline);
    engine.markDirty();
  }

  let last = performance.now();
  let uiAcc = 0;
  let saveAcc = 0;
  let saveTimer = 0;

  function persist() {
    StorageManager.save(state);
    engine.dirty = false;
  }

  engine.onChange = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 150);
  };

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    try {
      engine.update(dt);
      engine.draw();
    } catch (err) {
      console.error('Game loop error', err);
    }

    uiAcc += dt;
    if (uiAcc >= 0.05) {
      uiAcc = 0;
      try {
        ui.update();
      } catch (err) {
        console.error('UI update error', err);
      }
    }

    saveAcc += dt;
    if (saveAcc >= 1) {
      saveAcc = 0;
      if (engine.dirty) {
        persist();
      }
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      persist();
    }
  });
  window.addEventListener('pagehide', persist);

  requestAnimationFrame(frame);
}

try {
  boot();
} catch (err) {
  console.error(err);
  const box = document.createElement('pre');
  box.id = 'boot-error';
  box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:50;background:#1e293b;color:#f8fafc;padding:12px;border:1px solid #ef4444;border-radius:8px;white-space:pre-wrap;';
  box.textContent = 'Boot error: ' + (err && err.message ? err.message : String(err));
  document.body.appendChild(box);
}
