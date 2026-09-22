import {
  GROUP_BLURBS,
  SECTORS,
  UPGRADE_DEFS,
  groupedUpgrades,
  isUnlocked,
  requirementList,
  requirementText,
  sectorUnlockNeed,
  upgradeCost
} from './Upgrades.js';
import { formatCredits, formatDuration } from '../engine/GameEngine.js';
import { StorageManager } from '../engine/StorageManager.js';
import { isStandaloneDisplay } from '../pwa.js';

const HOLD_MS = 2200;

const LOOP_BUYS = new Set([
  'tap_damage',
  'tap_rate',
  'asteroid_max',
  'asteroid_spawn_rate',
  'survey_range',
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
    this._desktopMq = window.matchMedia('(min-width: 900px)');
    this.sheetOpen = this._desktopMq.matches;
    this.jobsPanel = false;
    this.holdTimer = 0;
    this.holding = false;
    this.installEvent = null;
    this._jobsSig = '';
    this._toastSig = '';
    this._treesBuilt = false;
    this._sectorSig = '';
    this.tabButtons = [...document.querySelectorAll('.tab')];
    this.tabsEl = document.getElementById('tabs');
    this.els = {
      credits: document.getElementById('stat-credits'),
      rate: document.getElementById('stat-rate'),
      sectorBadge: document.getElementById('sector-badge'),
      deploy: document.getElementById('btn-deploy'),
      canvasWrap: document.getElementById('canvas-wrap'),
      playfield: document.getElementById('playfield'),
      canvas: document.getElementById('game-canvas'),
      app: document.getElementById('app'),
      hud: document.getElementById('hud'),
      shop: document.getElementById('shop'),
      handle: document.getElementById('sheet-handle'),
      sheetLabel: document.getElementById('sheet-label'),
      nextBuy: document.getElementById('btn-next-buy'),
      nextBuyLabel: document.getElementById('next-buy-label'),
      deployHint: document.getElementById('deploy-hint'),
      deployLabel: document.getElementById('deploy-label'),
      jobBtn: document.getElementById('btn-jobs'),
      jobPip: document.getElementById('job-pip'),
      tap: document.getElementById('tab-tap'),
      fleet: document.getElementById('tab-fleet'),
      haul: document.getElementById('tab-haul'),
      sector: document.getElementById('tab-sector'),
      scan: document.getElementById('tab-scan'),
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
      coachNext: document.getElementById('coach-next'),
      install: document.getElementById('btn-install'),
      installHelp: document.getElementById('install-help'),
      installHelpClose: document.getElementById('install-help-close'),
      settingsBtn: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      settingsClose: document.getElementById('settings-close'),
      speedHud: document.getElementById('btn-speed')
    };
    this._bind();
    if (typeof this._desktopMq.addEventListener === 'function') {
      this._desktopMq.addEventListener('change', (event) => {
        if (event.matches) {
          this.sheetOpen = true;
        }
        this._applySheet();
      });
    }
    this.renderUpgrades(true);
    this.renderSectors();
    this.syncSettings();
    this._applySheet();
    this.observeCanvas();
    this.update();
  }

  observeCanvas() {
    const observer = new ResizeObserver(() => this.fitCanvas());
    observer.observe(this.els.playfield || this.els.canvasWrap);
    window.addEventListener('resize', () => {
      this.fitCanvas();
      this._fitHud();
    });
    window.visualViewport?.addEventListener('resize', () => {
      this.fitCanvas();
      this._fitHud();
    });
    this.fitCanvas();
  }

  fitCanvas() {
    const el = this.els.playfield || this.els.canvasWrap;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (width < 32 || height < 32) {
      return;
    }
    const reset = this.engine.fitNeeded === true;
    this.engine.fitNeeded = false;
    this.engine.resizeCanvas(width, height, { reset });
  }

  _fitHud() {
    const hud = this.els.hud;
    if (!hud) {
      return;
    }
    hud.style.removeProperty('--hud-fs');
    const base = Number.parseFloat(getComputedStyle(hud).getPropertyValue('--hud-fs')) || 16;
    let size = base;
    while (hud.scrollWidth > hud.clientWidth + 1 && size > 11) {
      size -= 0.5;
      hud.style.setProperty('--hud-fs', String(size));
    }
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

    this._bindSheetHandle();

    this.els.nextBuy.addEventListener('click', (event) => this._onBuy(event));

    this.tabButtons.forEach((tab) => {
      tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
    });

    this.els.tap.addEventListener('click', (event) => this._onUpgradePanel(event));
    this.els.fleet.addEventListener('click', (event) => this._onUpgradePanel(event));
    this.els.haul.addEventListener('click', (event) => this._onUpgradePanel(event));
    this.els.scan.addEventListener('click', (event) => this._onUpgradePanel(event));
    this.els.sector.addEventListener('click', (event) => this._onUpgradePanel(event) || this._onExpand(event));
    this.els.jobs.addEventListener('click', (event) => {
      if (event.target.closest('[data-jobs-back]')) {
        this.jobsPanel = false;
        this._applySheet();
        return;
      }
      this._onClaim(event);
    });

    this.els.jobBtn.addEventListener('click', () => {
      this.sheetOpen = true;
      this.jobsPanel = true;
      if ((this.engine.state.flags.tutorialStep || 0) === 1) {
        this.engine.advanceTutorial();
      }
      this._applySheet();
      this.els.jobBtn.blur();
      this.els.sheetBody.scrollTop = 0;
    });

    this.els.hud?.addEventListener(
      'pointerup',
      () => {
        const active = document.activeElement;
        if (active && this.els.hud.contains(active) && typeof active.blur === 'function') {
          active.blur();
        }
        window.scrollTo(0, 0);
      },
      { passive: true }
    );

    this.els.volume.addEventListener('input', () => {
      const value = Number(this.els.volume.value);
      this.engine.state.settings.sfxVolume = value;
      this.engine.sound.setVolume(value);
      this.els.volumeValue.textContent = `${Math.round(value * 100)}%`;
      this.engine.markDirty();
    });
    this.els.speed.addEventListener('change', () => {
      this.engine.state.settings.gameSpeed = Number(this.els.speed.value);
      this._syncSpeedButton();
      this.engine.markDirty();
    });
    this.els.speedHud.addEventListener('click', () => {
      const current = Number(this.engine.state.settings.gameSpeed) || 1;
      const next = current >= 2 ? 1 : 2;
      this.engine.state.settings.gameSpeed = next;
      this.els.speed.value = String(next);
      this._syncSpeedButton();
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
      this.els.app.dataset.reduced = this.els.motion.checked ? '1' : '0';
      this.engine.markDirty();
    });

    const replay = document.getElementById('btn-replay-tips');
    if (replay) {
      replay.addEventListener('click', () => {
        this.engine.replayTutorial();
        this._hide(this.els.settingsModal);
        this.update();
      });
    }

    this.els.settingsBtn.addEventListener('click', () => {
      this._updateLedger(this.engine.hudSnapshot());
      this._show(this.els.settingsModal);
    });
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
    this.els.coachNext?.addEventListener('click', () => {
      this.engine.advanceTutorial();
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
    const DOUBLE_MS = 320;
    const DOUBLE_PX = 36;
    let mode = 'none';
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;
    let pinchMid = { x: 0, y: 0 };
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;

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
        this.engine.noteViewAction('zoom');
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
        this.engine.noteViewAction('pan');
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });

    const endPointer = (event) => {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      if (mode === 'pending' && pointers.size === 1) {
        const now = performance.now();
        const dist = Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY);
        if (now - lastTapAt < DOUBLE_MS && dist < DOUBLE_PX) {
          this.engine.resetView();
          this.engine.noteViewAction('recenter');
          lastTapAt = 0;
        } else {
          lastTapAt = now;
          lastTapX = event.clientX;
          lastTapY = event.clientY;
          this.engine.tryTap(this.engine.eventToLogical(event));
        }
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
        this.engine.noteViewAction('zoom');
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
    this.els.sheetLabel.textContent = 'Upgrades';
    const drawer = document.getElementById('sheet-drawer');
    if (drawer) {
      const show = this.sheetOpen || this._desktopMq.matches;
      drawer.toggleAttribute('inert', !show);
    }
    if (this.sheetOpen) {
      const snap = this.engine.hudSnapshot();
      this._updateTabs(snap);
      this._updateUpgradeButtons(snap);
    }
    if (this._desktopMq.matches) {
      requestAnimationFrame(() => {
        this.fitCanvas();
        requestAnimationFrame(() => this.fitCanvas());
      });
    }
  }

  revealedTabs(snap) {
    const tabs = new Set(['tap']);
    if (snap.stats.asteroidsBroken > 0 || snap.tutorialStep > 0 || (snap.tutorialIndex || 0) >= 1) {
      tabs.add('haul');
      tabs.add('scan');
    }
    if (snap.stats.deposits > 0 || snap.tutorialStep > 1) {
      tabs.add('sector');
    }
    if (snap.maxDrones > 0 || snap.stats.launches > 0 || (snap.tutorialIndex || 0) >= 5) {
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

  _onUpgradePanel(event) {
    if (this._onBuy(event)) {
      return true;
    }
    const card = event.target.closest('.upgrade-card');
    if (!card) {
      return false;
    }
    const open = card.classList.contains('is-info');
    this.els.shop.querySelectorAll('.upgrade-card.is-info').forEach((item) => {
      item.classList.remove('is-info');
      item.setAttribute('aria-expanded', 'false');
      item.querySelector('.upgrade-info')?.setAttribute('hidden', '');
    });
    if (!open) {
      card.classList.add('is-info');
      card.setAttribute('aria-expanded', 'true');
      card.querySelector('.upgrade-info')?.removeAttribute('hidden');
    }
    return true;
  }

  _onBuy(event) {
    const button = event.target.closest('[data-buy]');
    if (!button || !button.dataset.buy) {
      return false;
    }
    event.stopPropagation();
    const scroll = this.els.sheetBody.scrollTop;
    if (this.engine.tryBuy(button.dataset.buy)) {
      this.patchUpgrade(button.dataset.buy);
      this._syncUnlocks(button.dataset.buy);
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
      `Laser, drills, and haul upgrades reset. Keep Forever upgrades stay. You keep ${Math.round(this.engine.stats.salvageKeep * 100)}% of your cash plus any warp bonus cash.`;
    this._show(this.els.expandModal);
    return true;
  }

  setTab(name) {
    this.activeTab = name;
    this.jobsPanel = false;
    if (this.sheetOpen) {
      this.els.shop.dataset.jobsPanel = '0';
    }
    this.els.sheetLabel.textContent = 'Upgrades';
    this.tabButtons.forEach((tab) => {
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
    this._syncSpeedButton();
    this.els.haptics.checked = s.haptics !== false;
    this.els.numbers.checked = s.damageNumbers !== false;
    this.els.motion.checked = s.reducedMotion === true;
    this.els.app.dataset.reduced = s.reducedMotion === true ? '1' : '0';
    this.engine.sound.setVolume(s.sfxVolume);
  }

  _syncSpeedButton() {
    const speed = Number(this.engine.state.settings.gameSpeed) || 1;
    const fast = speed >= 2;
    this.els.speedHud.textContent = speed === 1 ? '1x' : `${speed}x`;
    this.els.speedHud.classList.toggle('on', fast);
    this.els.speedHud.setAttribute('aria-pressed', fast ? 'true' : 'false');
  }

  renderUpgrades(force = false) {
    if (this._treesBuilt && !force) {
      return;
    }
    this.els.tap.innerHTML = this._upgradeGroups('tap');
    this.els.fleet.innerHTML = this._upgradeGroups('fleet');
    this.els.haul.innerHTML = this._upgradeGroups('haul');
    this.els.scan.innerHTML = this._upgradeGroups('scan');
    this._treesBuilt = true;
  }

  _upgradeGroups(tab) {
    const upgrades = this.engine.state.upgrades;
    const credits = this.engine.state.credits;
    return groupedUpgrades(tab)
      .map((group) => {
        const cards = group.items
          .filter((def) => def.id !== 'bank_shot' || isUnlocked(def, upgrades) || (upgrades[def.id] || 0) > 0)
          .map((def) => this._cardHtml(def, upgrades, credits))
          .join('');
        if (!cards) {
          return '';
        }
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
    const badge = def.permanent ? '<span class="perm">Keep forever</span>' : '';
    const lock = unlocked ? '' : `<span class="lock">Needs ${requirementText(def)}</span>`;
    const meta = `Lv ${level}/${def.maxLevel} · ${def.describe(level)}`;
    return `
      <article class="upgrade-card${maxed ? ' maxed' : ''}${unlocked ? '' : ' locked'}" data-upgrade="${def.id}" aria-expanded="false">
        <div class="upgrade-buy">
          <div class="upgrade-main">
            <div class="upgrade-head">
              <h3>${def.name}</h3>
              ${badge}${lock}
            </div>
            <p class="upgrade-meta">${meta}</p>
          </div>
          <button type="button" data-buy="${def.id}" ${canBuy ? '' : 'disabled'}>
            ${!unlocked ? 'Locked' : maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`}
          </button>
        </div>
        <div class="upgrade-info" hidden>
          <div class="upgrade-head">
            <h3>${def.name}</h3>
            ${badge}
          </div>
          <p class="upgrade-help">${def.help || def.describe(level)}</p>
          <p class="upgrade-meta">${meta}</p>
          <p class="upgrade-info-hint">Tap to return</p>
        </div>
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
    const meta = card.querySelectorAll('.upgrade-meta');
    const line = `Lv ${level}/${def.maxLevel} · ${def.describe(level)}`;
    meta.forEach((el) => {
      el.textContent = line;
    });
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
        : sector.level === current + 1
          ? `<button type="button" disabled data-sector-need="${need}">Need $${formatCredits(Math.max(0, need - harvested))} more</button>`
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
            Income ×${sector.incomeMult}<br />
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
      if (def.hidden) {
        continue;
      }
      if (def.id === 'bank_shot' && !isUnlocked(def, snap.upgrades) && !(snap.upgrades[def.id] || 0)) {
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
      if (this.els.nextBuyLabel) {
        this.els.nextBuyLabel.textContent = 'All bought';
      } else {
        this.els.nextBuy.textContent = 'All bought';
      }
      return;
    }
    const can = snap.credits >= rec.cost;
    this.els.nextBuy.dataset.buy = rec.def.id;
    this.els.nextBuy.disabled = !can;
    if (this.els.nextBuyLabel) {
      this.els.nextBuyLabel.textContent = `${rec.def.name} · $${formatCredits(rec.cost)}`;
    } else {
      this.els.nextBuy.textContent = `${rec.def.name} · $${formatCredits(rec.cost)}`;
    }
  }

  update() {
    const snap = this.engine.hudSnapshot();
    this.els.credits.textContent = formatCredits(snap.credits);
    this.els.rate.textContent = snap.rate.toFixed(1);
    this.els.sectorBadge.textContent = `S${snap.sector.level} ${snap.sector.short}`;
    const hud = this.els.hud;
    const hudSig = [
      this.els.credits.textContent,
      this.els.rate.textContent,
      this.els.sectorBadge.textContent,
      this.els.jobPip?.textContent || '',
      hud ? hud.clientWidth : 0
    ].join('|');
    if (this._hudFitSig !== hudSig) {
      this._hudFitSig = hudSig;
      this._fitHud();
    }
    const ready = snap.tapInterval <= 0 ? 1 : 1 - snap.tapCooldown / snap.tapInterval;
    this.els.tapFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ready))})`;
    if (this.sheetOpen) {
      this._updateTabs(snap);
      this._updateUpgradeButtons(snap);
    }
    this._updateDeploy(snap);
    this.patchPeek();
    this._updateSectorExpand(snap);
    if (!this.els.settingsModal.classList.contains('hidden')) {
      this._updateLedger(snap);
    }
    this._updateJobs(snap);
    this._updateEvent(snap);
    this._updateToasts(snap);
    this._updateCoach(snap);
    this.pollHold();
    if (this.engine.fitNeeded) {
      this.fitCanvas();
    }
  }

  _updateTabs(snap) {
    const revealed = this.revealedTabs(snap);
    this.tabButtons.forEach((tab) => {
      const show = revealed.has(tab.dataset.tab);
      tab.classList.toggle('hidden', !show);
      if (!show && this.activeTab === tab.dataset.tab) {
        this.setTab('tap');
      }
    });
    const visible = [...revealed];
    if (this.tabsEl) {
      this.tabsEl.style.gridTemplateColumns = `repeat(${Math.max(1, visible.length)}, minmax(0, 1fr))`;
    }
  }

  _updateDeploy(snap) {
    const unlocked = snap.maxDrones > 0;
    this.els.deploy.classList.toggle('hidden', !unlocked);
    const atCap = snap.drones >= snap.maxDrones;
    const cost = snap.launchCost;
    const count = `${snap.drones}/${snap.maxDrones}`;
    if (atCap) {
      this.els.deployHint.textContent = 'drills';
      this.els.deployLabel.textContent = `${count} full`;
      this.els.deploy.disabled = true;
      return;
    }
    if (snap.manualCooldown > 0) {
      this.els.deployHint.textContent = 'drilling';
      this.els.deployLabel.textContent = `${count} · ${snap.manualCooldown.toFixed(1)}s`;
      this.els.deploy.disabled = true;
      return;
    }
    const auto = snap.autoLaunchEnabled
      ? ` · auto ${Math.max(0, snap.autoDeployTimer).toFixed(1)}s`
      : '';
    this.els.deployHint.textContent = 'buy drill';
    this.els.deployLabel.textContent = `${count} · $${formatCredits(cost)}${auto}`;
    this.els.deploy.disabled = snap.credits < cost;
  }

  _updateUpgradeButtons(snap) {
    for (const def of UPGRADE_DEFS) {
      if (document.querySelector(`[data-upgrade="${def.id}"]`)) {
        this.patchUpgrade(def.id);
      }
    }
  }

  _syncUnlocks(boughtId) {
    let missing = false;
    for (const def of UPGRADE_DEFS) {
      if (!requirementList(def).some((req) => req.id === boughtId)) {
        continue;
      }
      if (!document.querySelector(`[data-upgrade="${def.id}"]`)) {
        missing = true;
        break;
      }
      this.patchUpgrade(def.id);
    }
    if (missing) {
      this.renderUpgrades(true);
    }
  }

  _updateSectorExpand(snap) {
    const next = this.engine.nextSector();
    const need = next ? sectorUnlockNeed(next, this.engine.stats) : Infinity;
    const ready = Boolean(next && snap.totalOreHarvested >= need);
    const sig = `${this.engine.state.sectorLevel}:${ready}:${next ? next.level : 0}`;
    if (sig !== this._sectorSig) {
      this._sectorSig = sig;
      this.renderSectors();
      return;
    }
    const btn = this.els.sector.querySelector('[data-sector-need]');
    if (!btn || ready) {
      return;
    }
    btn.textContent = `Need $${formatCredits(Math.max(0, need - snap.totalOreHarvested))} more`;
  }

  _updateLedger(snap) {
    const s = snap.stats;
    const rebound = (snap.upgrades.bank_shot || 0) > 0;
    this.els.ledger.textContent =
      `Taps ${s.taps.toLocaleString('en-US')} · Launches ${s.launches} · Lost ${s.probesLost} drills · Dumps ${s.deposits} · Rocks ${s.asteroidsBroken} · Lucky hits ${s.crits} · Walls ${s.wallBounces || 0}${
        rebound ? ` · Rebounds ${s.bankHits || 0}` : ''
      } · Jobs ${snap.jobsCompleted} · Lifetime $${formatCredits(s.lifetimeCredits)}`;
  }

  _updateJobs(snap) {
    const readyJobs = snap.jobs.filter((job) => job.progress >= job.amount);
    this.els.jobPip.textContent = String(readyJobs.length);
    this.els.jobBtn.classList.toggle('ready', readyJobs.length > 0);
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
            ${job.blurb ? `<p class="upgrade-meta">${job.blurb}</p>` : ''}
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
    if (!snap.tutorial) {
      if (!this.els.coach.classList.contains('hidden')) {
        this.els.coach.classList.add('hidden');
        this.els.canvasWrap.dataset.coach = '';
        if (this.els.playfield) {
          this.els.playfield.dataset.coach = '';
        }
        this.els.app.dataset.coach = '';
      }
      return;
    }
    const spotlight = snap.tutorial.id === 'jobs' ? 'jobs' : '';
    this.els.canvasWrap.dataset.coach = '';
    if (this.els.playfield) {
      this.els.playfield.dataset.coach = '';
    }
    this.els.app.dataset.coach = spotlight;
    this.els.coach.classList.remove('hidden');
    this.els.coachTitle.textContent = snap.tutorial.title;
    this.els.coachBody.textContent = snap.tutorial.body;
    if (this.els.coachNext) {
      this.els.coachNext.classList.toggle('hidden', snap.tutorial.next === false);
    }
    const skip = document.getElementById('coach-skip');
    if (skip) {
      skip.classList.toggle('hidden', snap.tutorial.id === 'done');
    }
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
