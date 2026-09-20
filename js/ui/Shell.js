import {
  GROUP_BLURBS,
  SECTORS,
  UPGRADE_DEFS,
  groupedUpgrades,
  isUnlocked,
  requirementText,
  sectorUnlockNeed,
  upgradeCost
} from './Upgrades.js';
import { formatCredits, formatDuration } from '../world/Engine.js';
import { StorageManager } from '../engine/StorageManager.js';
import { isStandaloneDisplay } from '../pwa.js';

const HOLD_MS = 2200;
const TAB_LABELS = {
  tap: 'Mine',
  fleet: 'Launch',
  haul: 'Haul',
  sector: 'Claim'
};

const LOOP_BUYS = new Set([
  'tap_damage',
  'tap_rate',
  'asteroid_max',
  'asteroid_spawn_rate',
  'drone_damage',
  'drone_max_count',
  'collector_max',
  'collector_speed',
  'unload_speed'
]);

export class Shell {
  constructor(engine) {
    this.engine = engine;
    this.activeTab = 'tap';
    this.sheetOpen = window.matchMedia('(min-width: 900px)').matches;
    this.jobsPanel = false;
    this.holdTimer = 0;
    this.holding = false;
    this.installEvent = null;
    this._treesBuilt = false;
    this._openedForPick = false;
    this.els = {
      credits: document.getElementById('stat-credits'),
      rate: document.getElementById('stat-rate'),
      sectorBadge: document.getElementById('sector-badge'),
      deploy: document.getElementById('btn-deploy'),
      canvasWrap: document.getElementById('canvas-wrap'),
      canvas: document.getElementById('game-canvas'),
      resetView: document.getElementById('btn-reset-view'),
      app: document.getElementById('app'),
      shop: document.getElementById('shop'),
      handle: document.getElementById('sheet-handle'),
      sheetLabel: document.getElementById('sheet-label'),
      nextBuy: document.getElementById('btn-next-buy'),
      peekJob: document.getElementById('peek-job'),
      jobBtn: document.getElementById('btn-jobs'),
      jobPip: document.getElementById('job-pip'),
      tap: document.getElementById('tab-tap'),
      fleet: document.getElementById('tab-fleet'),
      haul: document.getElementById('tab-haul'),
      sector: document.getElementById('tab-sector'),
      jobs: document.getElementById('jobs-board'),
      sheetBody: document.getElementById('sheet-body'),
      volume: document.getElementById('sfx-volume'),
      volumeValue: document.getElementById('sfx-volume-value'),
      speed: document.getElementById('game-speed'),
      haptics: document.getElementById('set-haptics'),
      numbers: document.getElementById('set-numbers'),
      motion: document.getElementById('set-motion'),
      ledger: document.getElementById('stat-ledger'),
      tapFill: document.getElementById('tap-meter-fill'),
      offlineModal: document.getElementById('offline-modal'),
      offlineSummary: document.getElementById('offline-summary'),
      offlineDismiss: document.getElementById('offline-dismiss'),
      dangerModal: document.getElementById('danger-modal'),
      resetModal: document.getElementById('reset-modal'),
      expandModal: document.getElementById('expand-modal'),
      saveModal: document.getElementById('save-modal'),
      saveArea: document.getElementById('save-area'),
      holdFill: document.getElementById('hold-fill'),
      holdBtn: document.getElementById('btn-hold-reset'),
      eventBanner: document.getElementById('event-banner'),
      toastStack: document.getElementById('toast-stack'),
      coach: document.getElementById('coach-mark'),
      coachTitle: document.getElementById('coach-title'),
      coachBody: document.getElementById('coach-body'),
      install: document.getElementById('btn-install'),
      installHelp: document.getElementById('install-help'),
      installHelpClose: document.getElementById('install-help-close'),
      settingsBtn: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      settingsClose: document.getElementById('settings-close')
    };
    this._bind();
    this.renderUpgrades(true);
    this.renderSectors();
    this.syncSettings();
    this._applySheet();
    this.observeCanvas();
    this.update();
  }

  observeCanvas() {
    const observer = new ResizeObserver(() => this.fitCanvas());
    observer.observe(this.els.canvasWrap);
    window.addEventListener('resize', () => this.fitCanvas());
    this.fitCanvas();
  }

  fitCanvas() {
    const rect = this.els.canvasWrap.getBoundingClientRect();
    if (rect.width < 32 || rect.height < 32) {
      return;
    }
    const reset = this.engine.fitNeeded === true;
    this.engine.fitNeeded = false;
    this.engine.resizeCanvas(rect.width, rect.height, { reset });
  }

  _bind() {
    this.els.deploy.addEventListener('click', () => {
      this.engine.sound.unlock();
      this.engine.deployDrone(false);
      this.update();
    });

    const canvas = this.els.canvas;
    this._bindFieldCamera(canvas);
    canvas.style.touchAction = 'none';

    this.els.resetView.addEventListener('click', () => {
      this.engine.fitNeeded = true;
      this.fitCanvas();
      this.engine.resetView();
    });

    this._bindSheetHandle();

    this.els.nextBuy.addEventListener('click', (event) => this._onBuy(event));

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
    });

    this.els.tap.addEventListener('click', (event) => this._onBuy(event));
    this.els.fleet.addEventListener('click', (event) => this._onBuy(event));
    this.els.haul.addEventListener('click', (event) => this._onBuy(event));
    this.els.sector.addEventListener('click', (event) => this._onBuy(event) || this._onExpand(event));
    this.els.jobs.addEventListener('click', (event) => {
      if (event.target.closest('[data-jobs-back]')) {
        this.jobsPanel = false;
        this._applySheet();
        return;
      }
      this._onClaim(event);
    });
    this.els.peekJob.addEventListener('click', (event) => this._onClaim(event));

    this.els.jobBtn.addEventListener('click', () => {
      this.sheetOpen = true;
      this.jobsPanel = true;
      this._applySheet();
      this.els.jobs.scrollIntoView({ block: 'start' });
    });

    this.els.volume.addEventListener('input', () => {
      const value = Number(this.els.volume.value);
      this.engine.state.settings.sfxVolume = value;
      this.engine.sound.setVolume(value);
      this.els.volumeValue.textContent = `${Math.round(value * 100)}%`;
      this.engine.markDirty();
    });
    this.els.speed.addEventListener('change', () => {
      this.engine.state.settings.gameSpeed = Number(this.els.speed.value);
      this.engine.markDirty();
    });
    this.els.haptics.addEventListener('change', () => {
      this.engine.state.settings.haptics = this.els.haptics.checked;
      this.engine.markDirty();
    });
    this.els.numbers.addEventListener('change', () => {
      this.engine.state.settings.damageNumbers = this.els.numbers.checked;
      this.engine.markDirty();
    });
    this.els.motion.addEventListener('change', () => {
      this.engine.state.settings.reducedMotion = this.els.motion.checked;
      this.engine.markDirty();
    });

    const replay = document.getElementById('btn-replay-tips');
    if (replay) {
      replay.addEventListener('click', () => {
        this._openedForPick = false;
        this.engine.replayTutorial();
        this._hide(this.els.settingsModal);
        this.update();
      });
    }

    this.els.settingsBtn.addEventListener('click', () => this._show(this.els.settingsModal));
    this.els.settingsClose.addEventListener('click', () => this._hide(this.els.settingsModal));
    this.els.settingsModal.addEventListener('click', (event) => {
      if (event.target !== this.els.settingsModal) {
        return;
      }
      const nestedOpen = [this.els.dangerModal, this.els.resetModal, this.els.saveModal].some(
        (modal) => !modal.classList.contains('hidden')
      );
      if (nestedOpen) {
        return;
      }
      this._hide(this.els.settingsModal);
    });
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (!this.els.resetModal.classList.contains('hidden')) {
        this._resetHold();
        this._hide(this.els.resetModal);
        return;
      }
      if (!this.els.dangerModal.classList.contains('hidden')) {
        this._hide(this.els.dangerModal);
        return;
      }
      if (!this.els.saveModal.classList.contains('hidden')) {
        this._hide(this.els.saveModal);
        return;
      }
      if (!this.els.expandModal.classList.contains('hidden')) {
        this._hide(this.els.expandModal);
        return;
      }
      if (!this.els.offlineModal.classList.contains('hidden')) {
        this._hide(this.els.offlineModal);
        return;
      }
      if (this.els.installHelp && !this.els.installHelp.classList.contains('hidden')) {
        this._hide(this.els.installHelp);
        return;
      }
      if (!this.els.settingsModal.classList.contains('hidden')) {
        this._hide(this.els.settingsModal);
      }
    });

    this.els.offlineDismiss.addEventListener('click', () => this._hide(this.els.offlineModal));
    document.getElementById('btn-danger').addEventListener('click', () => this._show(this.els.dangerModal));
    document.getElementById('danger-cancel').addEventListener('click', () => this._hide(this.els.dangerModal));
    document.getElementById('danger-continue').addEventListener('click', () => {
      this._hide(this.els.dangerModal);
      this._show(this.els.resetModal);
      this._resetHold();
    });
    document.getElementById('reset-cancel').addEventListener('click', () => {
      this._resetHold();
      this._hide(this.els.resetModal);
    });
    document.getElementById('expand-cancel').addEventListener('click', () => this._hide(this.els.expandModal));
    document.getElementById('expand-confirm').addEventListener('click', () => {
      if (this.engine.expandSector()) {
        this.renderUpgrades(true);
        this.renderSectors();
        this.fitCanvas();
        this.update();
      }
      this._hide(this.els.expandModal);
    });
    document.getElementById('coach-skip').addEventListener('click', () => {
      this.engine.skipTutorial();
      this.update();
    });
    document.getElementById('btn-export').addEventListener('click', () => {
      this.els.saveArea.value = StorageManager.exportPayload(this.engine.state);
      this._show(this.els.saveModal);
      this.els.saveArea.focus();
      this.els.saveArea.select();
    });
    document.getElementById('btn-import').addEventListener('click', () => {
      this.els.saveArea.value = '';
      this._show(this.els.saveModal);
      this.els.saveArea.focus();
    });
    document.getElementById('save-cancel').addEventListener('click', () => this._hide(this.els.saveModal));
    document.getElementById('save-apply').addEventListener('click', () => {
      try {
        StorageManager.importPayload(this.els.saveArea.value);
        window.location.reload();
      } catch (err) {
        this.engine.pushToast('Save file unreadable');
      }
    });
    document.getElementById('save-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.els.saveArea.value);
        this.engine.pushToast('Save copied');
      } catch (err) {
        this.els.saveArea.select();
      }
    });

    this._syncInstallButton();
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installEvent = event;
      this._syncInstallButton();
    });
    window.addEventListener('appinstalled', () => {
      this.installEvent = null;
      if (this.els.installHelp) {
        this._hide(this.els.installHelp);
      }
      this._syncInstallButton();
    });
    this.els.install.addEventListener('click', async () => {
      if (isStandaloneDisplay()) {
        this.engine.pushToast('Already installed');
        return;
      }
      if (this.installEvent) {
        try {
          this.installEvent.prompt();
          await this.installEvent.userChoice;
        } catch (err) {
          /* dismissed */
        }
        this.installEvent = null;
        this._syncInstallButton();
        return;
      }
      if (this.els.installHelp) {
        this._show(this.els.installHelp);
      }
    });
    if (this.els.installHelpClose) {
      this.els.installHelpClose.addEventListener('click', () => this._hide(this.els.installHelp));
    }
    if (this.els.installHelp) {
      this.els.installHelp.addEventListener('click', (event) => {
        if (event.target === this.els.installHelp) {
          this._hide(this.els.installHelp);
        }
      });
    }

    const holdBtn = this.els.holdBtn;
    const startHold = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.holding = true;
      this.holdTimer = performance.now();
      try {
        holdBtn.setPointerCapture(event.pointerId);
      } catch (err) {
        /* older WebViews */
      }
    };
    const endHold = () => {
      if (this.holding && performance.now() - this.holdTimer >= HOLD_MS) {
        this.holding = false;
        StorageManager.clear();
        window.location.reload();
        return;
      }
      this.holding = false;
      this._resetHold();
    };
    holdBtn.addEventListener('pointerdown', startHold);
    holdBtn.addEventListener('pointerup', endHold);
    holdBtn.addEventListener('pointerleave', endHold);
    holdBtn.addEventListener('pointercancel', endHold);
    holdBtn.addEventListener('lostpointercapture', endHold);
    holdBtn.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _cssPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  _bindFieldCamera(canvas) {
    const pointers = new Map();
    const TAP_PX = 24;
    let mode = 'none';
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;
    let pinchMid = { x: 0, y: 0 };

    const pinchStats = () => {
      const pts = [...pointers.values()];
      if (pts.length < 2) {
        return null;
      }
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      return { mid, dist: Math.max(1, dist) };
    };

    canvas.addEventListener('pointerdown', (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.engine.sound.unlock();
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (err) {
        /* older WebViews */
      }
      pointers.set(event.pointerId, this._cssPoint(event, canvas));
      if (pointers.size >= 2) {
        mode = 'pinch';
        const pinch = pinchStats();
        pinchDist = pinch.dist;
        pinchMid = pinch.mid;
        return;
      }
      mode = 'pending';
      lastX = event.clientX;
      lastY = event.clientY;
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      pointers.set(event.pointerId, this._cssPoint(event, canvas));
      if (mode === 'pinch') {
        const pinch = pinchStats();
        if (!pinch) {
          return;
        }
        this.engine.zoomView(pinch.mid.x, pinch.mid.y, pinch.dist / pinchDist);
        this.engine.panView(pinch.mid.x - pinchMid.x, pinch.mid.y - pinchMid.y);
        pinchDist = pinch.dist;
        pinchMid = pinch.mid;
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (mode === 'pending' && dx * dx + dy * dy > TAP_PX * TAP_PX) {
        mode = 'pan';
      }
      if (mode === 'pan') {
        this.engine.panView(dx, dy);
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });

    const endPointer = (event) => {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      if (mode === 'pending' && pointers.size === 1) {
        this.engine.tryTap(this.engine.eventToLogical(event));
      }
      pointers.delete(event.pointerId);
      if (pointers.size >= 2) {
        mode = 'pinch';
        const pinch = pinchStats();
        pinchDist = pinch.dist;
        pinchMid = pinch.mid;
      } else if (pointers.size === 1) {
        mode = 'pan';
        const remain = [...pointers.values()][0];
        const rect = canvas.getBoundingClientRect();
        lastX = remain.x + rect.left;
        lastY = remain.y + rect.top;
      } else {
        mode = 'none';
      }
    };

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const point = this._cssPoint(event, canvas);
        const steps = Math.max(-4, Math.min(4, -event.deltaY / 80));
        const factor = Math.pow(1.12, steps || (event.deltaY < 0 ? 1 : -1));
        this.engine.zoomView(point.x, point.y, factor);
      },
      { passive: false }
    );
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _bindSheetHandle() {
    const handle = this.els.handle;
    let startY = 0;
    let dragging = false;
    handle.addEventListener('pointerdown', (event) => {
      startY = event.clientY;
      dragging = true;
      try {
        handle.setPointerCapture(event.pointerId);
      } catch (err) {
        /* older WebViews */
      }
    });
    const endDrag = (event) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      const dy = event.clientY - startY;
      if (dy < -24) {
        this.sheetOpen = true;
        this.jobsPanel = false;
      } else if (dy > 24) {
        this.sheetOpen = false;
      } else if (this.sheetOpen && this.jobsPanel) {
        this.jobsPanel = false;
      } else {
        this.sheetOpen = !this.sheetOpen;
        if (this.sheetOpen) {
          this.jobsPanel = false;
        }
      }
      this._applySheet();
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  _applySheet() {
    this.els.app.dataset.sheet = this.sheetOpen ? '1' : '0';
    this.els.shop.dataset.open = this.sheetOpen ? '1' : '0';
    this.els.shop.dataset.jobsPanel = this.jobsPanel && this.sheetOpen ? '1' : '0';
    this.els.handle.setAttribute('aria-expanded', this.sheetOpen ? 'true' : 'false');
    this.els.sheetLabel.textContent = this.sheetOpen
      ? this.jobsPanel
        ? 'Upgrades'
        : TAB_LABELS[this.activeTab] || 'Upgrades'
      : 'Upgrades';
    requestAnimationFrame(() => {
      this.fitCanvas();
      requestAnimationFrame(() => this.fitCanvas());
    });
  }

  revealedTabs(snap) {
    const tabs = new Set(['tap']);
    if (snap.stats.asteroidsBroken > 0 || snap.tutorialStep > 0) {
      tabs.add('haul');
    }
    if (snap.stats.deposits > 0 || snap.tutorialStep > 1) {
      tabs.add('sector');
    }
    if (
      snap.stats.launches > 0 ||
      snap.credits >= snap.launchCost ||
      snap.tutorialStep >= 3
    ) {
      tabs.add('fleet');
    }
    return tabs;
  }

  _show(el) {
    el.hidden = false;
    el.removeAttribute('hidden');
    el.removeAttribute('inert');
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
  }

  _hide(el) {
    el.classList.add('hidden');
    el.hidden = true;
    el.setAttribute('hidden', '');
    el.setAttribute('inert', '');
    el.setAttribute('aria-hidden', 'true');
  }

  _resetHold() {
    this.holding = false;
    this.els.holdFill.style.width = '0%';
  }

  _syncInstallButton() {
    const btn = this.els.install;
    if (!btn) {
      return;
    }
    if (isStandaloneDisplay()) {
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    btn.textContent = this.installEvent ? 'Install app' : 'How to install';
  }

  pollHold() {
    if (!this.holding) {
      return;
    }
    const pct = Math.min(1, (performance.now() - this.holdTimer) / HOLD_MS);
    this.els.holdFill.style.width = `${pct * 100}%`;
    if (pct >= 1) {
      this.holding = false;
      StorageManager.clear();
      window.location.reload();
    }
  }

  _onBuy(event) {
    const button = event.target.closest('[data-buy]');
    if (!button || !button.dataset.buy) {
      return false;
    }
    const scroll = this.els.sheetBody.scrollTop;
    if (this.engine.tryBuy(button.dataset.buy)) {
      this.patchUpgrade(button.dataset.buy);
      this.patchPeek();
      this.els.sheetBody.scrollTop = scroll;
      this.update();
    }
    return true;
  }

  _onClaim(event) {
    const button = event.target.closest('[data-claim]');
    if (!button) {
      return;
    }
    this.engine.claimJob(Number(button.dataset.claim));
    this.update();
  }

  _onExpand(event) {
    const button = event.target.closest('[data-expand]');
    if (!button) {
      return false;
    }
    const next = this.engine.nextSector();
    if (!next) {
      return true;
    }
    document.getElementById('expand-title').textContent = `Warp to ${next.name}`;
    document.getElementById('expand-copy').textContent =
      `Tap, fleet, and haul upgrades reset. Company charter stays. Salvage keeps ${Math.round(this.engine.stats.salvageKeep * 100)}% of cash plus any treasury stipend.`;
    this._show(this.els.expandModal);
    return true;
  }

  setTab(name) {
    this.activeTab = name;
    this.jobsPanel = false;
    if (this.sheetOpen) {
      this.els.shop.dataset.jobsPanel = '0';
      this.els.sheetLabel.textContent = TAB_LABELS[name] || 'Upgrades';
    }
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === name);
    });
    document.querySelectorAll('.tab-page').forEach((page) => {
      page.classList.toggle('active', page.id === `tab-${name}`);
    });
  }

  syncSettings() {
    const s = this.engine.state.settings;
    this.els.volume.value = String(s.sfxVolume);
    this.els.volumeValue.textContent = `${Math.round(s.sfxVolume * 100)}%`;
    this.els.speed.value = String(s.gameSpeed);
    this.els.haptics.checked = s.haptics !== false;
    this.els.numbers.checked = s.damageNumbers !== false;
    this.els.motion.checked = s.reducedMotion === true;
    this.engine.sound.setVolume(s.sfxVolume);
  }

  renderUpgrades(force = false) {
    if (this._treesBuilt && !force) {
      return;
    }
    this.els.tap.innerHTML = this._upgradeGroups('tap');
    this.els.fleet.innerHTML = this._upgradeGroups('fleet');
    this.els.haul.innerHTML = this._upgradeGroups('haul');
    this._treesBuilt = true;
  }

  _upgradeGroups(tab) {
    const upgrades = this.engine.state.upgrades;
    const credits = this.engine.state.credits;
    return groupedUpgrades(tab)
      .map((group) => {
        const cards = group.items.map((def) => this._cardHtml(def, upgrades, credits)).join('');
        const blurb = GROUP_BLURBS[group.title]
          ? `<p class="group-blurb">${GROUP_BLURBS[group.title]}</p>`
          : '';
        return `<h2 class="group-title">${group.title}</h2>${blurb}<div class="upgrade-grid">${cards}</div>`;
      })
      .join('');
  }

  _cardHtml(def, upgrades, credits) {
    const unlocked = isUnlocked(def, upgrades);
    const level = upgrades[def.id] || 0;
    const maxed = level >= def.maxLevel;
    const cost = upgradeCost(def, level);
    const canBuy = unlocked && !maxed && credits >= cost;
    const badge = def.permanent ? '<span class="perm">Permanent</span>' : '';
    const lock = unlocked ? '' : `<span class="lock">Needs ${requirementText(def)}</span>`;
    return `
      <article class="upgrade-card${maxed ? ' maxed' : ''}${unlocked ? '' : ' locked'}" data-upgrade="${def.id}">
        <div class="upgrade-head">
          <h3>${def.name}</h3>
          ${badge}${lock}
        </div>
        <p class="upgrade-meta">Lv ${level}/${def.maxLevel} · ${def.describe(level)}</p>
        <button type="button" data-buy="${def.id}" ${canBuy ? '' : 'disabled'}>
          ${!unlocked ? 'Locked' : maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`}
        </button>
      </article>
    `;
  }

  patchUpgrade(id) {
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!def) {
      return;
    }
    const card = document.querySelector(`[data-upgrade="${id}"]`);
    if (!card) {
      this.renderUpgrades(true);
      return;
    }
    const upgrades = this.engine.state.upgrades;
    const credits = this.engine.state.credits;
    const unlocked = isUnlocked(def, upgrades);
    const level = upgrades[id] || 0;
    const maxed = level >= def.maxLevel;
    const cost = upgradeCost(def, level);
    const canBuy = unlocked && !maxed && credits >= cost;
    card.classList.toggle('maxed', maxed);
    card.classList.toggle('locked', !unlocked);
    const meta = card.querySelector('.upgrade-meta');
    if (meta) {
      meta.textContent = `Lv ${level}/${def.maxLevel} · ${def.describe(level)}`;
    }
    const button = card.querySelector('[data-buy]');
    if (button) {
      button.disabled = !canBuy;
      button.textContent = !unlocked ? 'Locked' : maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`;
    }
    const lock = card.querySelector('.lock');
    if (!unlocked && !lock) {
      const head = card.querySelector('.upgrade-head');
      if (head) {
        head.insertAdjacentHTML('beforeend', `<span class="lock">Needs ${requirementText(def)}</span>`);
      }
    } else if (unlocked && lock) {
      lock.remove();
    }
  }

  renderSectors() {
    const current = this.engine.state.sectorLevel;
    const harvested = this.engine.state.totalOreHarvested;
    const stats = this.engine.stats;
    const charter = groupedUpgrades('sector')
      .map((group) => {
        const cards = group.items
          .map((def) => this._cardHtml(def, this.engine.state.upgrades, this.engine.state.credits))
          .join('');
        const blurb = GROUP_BLURBS[group.title]
          ? `<p class="group-blurb">${GROUP_BLURBS[group.title]}</p>`
          : '';
        return `<h2 class="group-title">${group.title}</h2>${blurb}<div class="upgrade-grid">${cards}</div>`;
      })
      .join('');

    const sectors = SECTORS.map((sector) => {
      const isCurrent = sector.level === current;
      const need = sectorUnlockNeed(sector, stats);
      const canExpand = sector.level === current + 1 && harvested >= need;
      let status = 'Locked';
      if (isCurrent) status = 'Active claim';
      else if (sector.level < current) status = 'Charted';
      else if (canExpand) status = 'Ready to expand';
      const expandBtn = canExpand
        ? `<button type="button" data-expand="${sector.level}">Expand sector</button>`
        : sector.level > current
          ? `<button type="button" disabled>Need $${formatCredits(need)} lifetime</button>`
          : '';
      const tiers = sector.tiers.map((t) => `${t.id} ${Math.round(t.weight * 100)}%`).join(', ');
      return `
        <article class="sector-card${isCurrent ? ' current' : ''}${sector.level > current ? ' locked' : ''}">
          <h3>Sector ${sector.level}: ${sector.short}</h3>
          <p class="sector-meta">
            ${sector.name}<br />
            ${sector.lore || ''}<br />
            ${sector.width}×${sector.height} · Income ×${sector.incomeMult}<br />
            ${tiers}<br />
            ${status}
          </p>
          ${expandBtn}
        </article>
      `;
    }).join('');

    this.els.sector.innerHTML = `${charter}<h2 class="group-title">Star map</h2>${sectors}`;
  }

  nextRecommended(snap) {
    const revealed = this.revealedTabs(snap);
    let best = null;
    for (const def of UPGRADE_DEFS) {
      if (!revealed.has(def.tab)) {
        continue;
      }
      if (!isUnlocked(def, snap.upgrades)) {
        continue;
      }
      const level = snap.upgrades[def.id] || 0;
      if (level >= def.maxLevel) {
        continue;
      }
      const cost = upgradeCost(def, level);
      const loop = LOOP_BUYS.has(def.id) ? 0 : 1;
      const afford = snap.credits >= cost ? 0 : 1;
      const rank = afford * 1e9 + loop * 1e6 + cost;
      if (!best || rank < best.rank) {
        best = { def, cost, level, rank };
      }
    }
    return best;
  }

  patchPeek() {
    const snap = this.engine.hudSnapshot();
    const rec = this.nextRecommended(snap);
    if (!rec) {
      this.els.nextBuy.dataset.buy = '';
      this.els.nextBuy.disabled = true;
      this.els.nextBuy.textContent = 'All bought';
      return;
    }
    const can = snap.credits >= rec.cost;
    this.els.nextBuy.dataset.buy = rec.def.id;
    this.els.nextBuy.disabled = !can;
    this.els.nextBuy.textContent = `${rec.def.name} · $${formatCredits(rec.cost)}`;
  }

  update() {
    const snap = this.engine.hudSnapshot();
    this.els.credits.textContent = formatCredits(snap.credits);
    this.els.rate.textContent = snap.rate.toFixed(1);
    this.els.sectorBadge.textContent = `S${snap.sector.level} ${snap.sector.short}`;
    this.els.canvasWrap.classList.toggle('bank-live', Boolean(snap.banked));
    const ready = snap.tapInterval <= 0 ? 1 : 1 - snap.tapCooldown / snap.tapInterval;
    this.els.tapFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ready))})`;
    this._updateTabs(snap);
    this._updateDeploy(snap);
    this.patchPeek();
    this._updateUpgradeButtons(snap);
    this._updateLedger(snap);
    this._updateJobs(snap);
    this._updateEvent(snap);
    this._updateToasts(snap);
    this._updateCoach(snap);
    this.pollHold();
    if (this.engine.fitNeeded) {
      this.engine.fitNeeded = false;
      this.fitCanvas();
    }
  }

  _updateTabs(snap) {
    const revealed = this.revealedTabs(snap);
    document.querySelectorAll('.tab').forEach((tab) => {
      const show = revealed.has(tab.dataset.tab);
      tab.classList.toggle('hidden', !show);
      if (!show && this.activeTab === tab.dataset.tab) {
        this.setTab('tap');
      }
    });
    const visible = [...revealed];
    document.getElementById('tabs').style.gridTemplateColumns = `repeat(${Math.max(1, visible.length)}, minmax(0, 1fr))`;
  }

  _updateDeploy(snap) {
    const unlocked =
      snap.stats.launches > 0 || snap.credits >= snap.launchCost || snap.tutorialStep >= 3;
    this.els.deploy.classList.toggle('hidden', !unlocked);
    const atCap = snap.drones >= snap.maxDrones;
    const cost = snap.launchCost;
    if (atCap) {
      this.els.deploy.textContent = `Fleet full (${snap.drones}/${snap.maxDrones})`;
      this.els.deploy.disabled = true;
      return;
    }
    if (snap.manualCooldown > 0) {
      this.els.deploy.textContent = `Launching (${snap.manualCooldown.toFixed(1)}s)`;
      this.els.deploy.disabled = true;
      return;
    }
    const auto = snap.autoLaunchEnabled
      ? ` · AUTO ${Math.max(0, snap.autoDeployTimer).toFixed(1)}s`
      : '';
    this.els.deploy.textContent = `Launch · $${formatCredits(cost)}${auto}`;
    this.els.deploy.disabled = snap.credits < cost;
  }

  _updateUpgradeButtons(snap) {
    for (const def of UPGRADE_DEFS) {
      document.querySelectorAll(`[data-buy="${def.id}"]`).forEach((button) => {
        if (button === this.els.nextBuy) {
          return;
        }
        const unlocked = isUnlocked(def, snap.upgrades);
        const level = snap.upgrades[def.id] || 0;
        const maxed = level >= def.maxLevel;
        const cost = upgradeCost(def, level);
        button.disabled = !unlocked || maxed || snap.credits < cost;
        button.textContent = !unlocked ? 'Locked' : maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`;
      });
    }
  }

  _updateLedger(snap) {
    const s = snap.stats;
    this.els.ledger.textContent =
      `Taps ${s.taps.toLocaleString('en-US')} · Launches ${s.launches} · Lost ${s.probesLost} · Deposits ${s.deposits} · Rocks ${s.asteroidsBroken} · Crits ${s.crits} · Walls ${s.wallBounces || 0} · Banks ${s.bankHits || 0} · Jobs ${snap.jobsCompleted} · Lifetime $${formatCredits(s.lifetimeCredits)}`;
  }

  _updateJobs(snap) {
    const readyJobs = snap.jobs.filter((job) => job.progress >= job.amount);
    this.els.jobPip.textContent = String(readyJobs.length);
    this.els.jobBtn.classList.toggle('ready', readyJobs.length > 0);
    this.els.shop.dataset.jobs = readyJobs.length ? '1' : '0';
    if (readyJobs.length) {
      const job = readyJobs[0];
      const index = snap.jobs.indexOf(job);
      this.els.peekJob.classList.remove('hidden');
      this.els.peekJob.innerHTML = `<span>Claim ${job.label}</span><button type="button" data-claim="${index}">+$${formatCredits(job.reward)}</button>`;
    } else {
      this.els.peekJob.classList.add('hidden');
      this.els.peekJob.innerHTML = '';
    }
    const sig = snap.jobs.map((job) => `${job.defId}:${Math.floor(job.progress)}:${job.amount}:${job.reward}`).join('|');
    if (sig === this._jobsSig) {
      return;
    }
    this._jobsSig = sig;
    this.els.jobs.innerHTML =
      `<button type="button" class="ghost jobs-back" data-jobs-back="1">Back to upgrades</button>` +
      snap.jobs
        .map((job, index) => {
          const ready = job.progress >= job.amount;
          const pct = Math.round((job.progress / job.amount) * 100);
          return `
          <article class="job-card${ready ? ' ready' : ''}">
            <div class="upgrade-head">
              <h3>${job.label}</h3>
              <span class="job-pay">$${formatCredits(job.reward)}</span>
            </div>
            <p class="upgrade-meta">${Math.floor(job.progress)} / ${job.amount} · ${pct}%</p>
            <div class="job-track"><span style="width:${pct}%"></span></div>
            <button type="button" data-claim="${index}" ${ready ? '' : 'disabled'}>${ready ? 'Claim pay' : 'In progress'}</button>
          </article>
        `;
        })
        .join('');
  }

  _updateEvent(snap) {
    if (!snap.event) {
      this.els.eventBanner.classList.add('hidden');
      return;
    }
    this.els.eventBanner.classList.remove('hidden');
    this.els.eventBanner.style.borderColor = snap.event.color;
    this.els.eventBanner.textContent = `${snap.event.name} · ${Math.ceil(snap.event.ttl)}s — ${snap.event.blurb}`;
  }

  _updateToasts(snap) {
    const sig = snap.toasts.map((toast) => toast.text).join('|');
    if (sig === this._toastSig) {
      return;
    }
    this._toastSig = sig;
    this.els.toastStack.innerHTML = snap.toasts
      .map((toast) => `<div class="toast">${toast.text}</div>`)
      .join('');
  }

  _updateCoach(snap) {
    const chipsOnField = this.engine.particles.some((chip) => !chip.collected);
    let spotlight = '';
    if (snap.tutorial && snap.tutorial.id === 'tap') {
      spotlight = 'tap';
    } else if (snap.tutorial && snap.tutorial.id === 'haul') {
      spotlight = chipsOnField ? 'haul' : 'tap';
    } else if (snap.tutorial && snap.tutorial.id === 'upgrade') {
      spotlight = 'buy';
      if (!this.sheetOpen && !this._openedForPick) {
        this.sheetOpen = true;
        this._openedForPick = true;
        this._applySheet();
      }
    } else if (snap.tutorial && snap.tutorial.id === 'probe') {
      spotlight = 'launch';
    }
    this.els.canvasWrap.dataset.coach = spotlight;
    if (!snap.tutorial) {
      this.els.coach.classList.add('hidden');
      return;
    }
    this.els.coach.classList.remove('hidden');
    this.els.coachTitle.textContent = snap.tutorial.title;
    this.els.coachBody.textContent = snap.tutorial.body;
  }

  showOffline(offline) {
    if (!offline || offline.gains <= 0) {
      return;
    }
    this.els.offlineSummary.textContent =
      `Away ${formatDuration(offline.durationSec)}. Night crews recovered $${formatCredits(offline.gains)} (${formatDuration(offline.simSec)} sim).`;
    this._show(this.els.offlineModal);
  }
}

export { Shell as UIManager };
