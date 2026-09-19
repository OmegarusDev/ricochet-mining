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
import { formatCredits, formatDuration } from '../engine/GameEngine.js';
import { StorageManager } from '../engine/StorageManager.js';

const HOLD_MS = 2200;

export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.activeTab = 'tap';
    this.holdTimer = 0;
    this.holding = false;
    this.installEvent = null;
    this.els = {
      credits: document.getElementById('stat-credits'),
      drones: document.getElementById('stat-drones'),
      cargo: document.getElementById('stat-cargo'),
      rate: document.getElementById('stat-rate'),
      combo: document.getElementById('stat-combo'),
      sectorBadge: document.getElementById('sector-badge'),
      deploy: document.getElementById('btn-deploy'),
      canvasWrap: document.getElementById('canvas-wrap'),
      canvas: document.getElementById('game-canvas'),
      tap: document.getElementById('tab-tap'),
      fleet: document.getElementById('tab-fleet'),
      haul: document.getElementById('tab-haul'),
      sector: document.getElementById('tab-sector'),
      jobs: document.getElementById('jobs-board'),
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
      settingsBtn: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      settingsClose: document.getElementById('settings-close')
    };
    this._bind();
    this.renderUpgrades();
    this.renderSectors();
    this.syncSettings();
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
    this.engine.resizeCanvas(rect.width, rect.height);
  }

  _bind() {
    this.els.deploy.addEventListener('click', () => {
      this.engine.sound.unlock();
      this.engine.deployDrone(false);
      this.update();
    });

    const canvas = this.els.canvas;
    const onPointer = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.engine.sound.unlock();
      const point = this.engine.eventToLogical(event);
      this.engine.tryTap(point);
    };
    canvas.addEventListener('pointerdown', onPointer);
    canvas.style.touchAction = 'none';

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
    });

    this.els.tap.addEventListener('click', (event) => this._onBuy(event));
    this.els.fleet.addEventListener('click', (event) => this._onBuy(event));
    this.els.haul.addEventListener('click', (event) => this._onBuy(event));
    this.els.sector.addEventListener('click', (event) => this._onBuy(event) || this._onExpand(event));
    this.els.jobs.addEventListener('click', (event) => this._onClaim(event));

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

    this.els.settingsBtn.addEventListener('click', () => this._show(this.els.settingsModal));
    this.els.settingsClose.addEventListener('click', () => this._hide(this.els.settingsModal));
    this.els.settingsModal.addEventListener('click', (event) => {
      if (event.target !== this.els.settingsModal) {
        return;
      }
      const nestedOpen = [this.els.dangerModal, this.els.resetModal, this.els.saveModal]
        .some((modal) => !modal.classList.contains('hidden'));
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
        this.renderUpgrades();
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

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installEvent = event;
      this.els.install.classList.remove('hidden');
    });
    this.els.install.addEventListener('click', async () => {
      if (!this.installEvent) {
        return;
      }
      this.installEvent.prompt();
      await this.installEvent.userChoice;
      this.installEvent = null;
      this.els.install.classList.add('hidden');
    });

    const holdBtn = this.els.holdBtn;
    const startHold = (event) => {
      event.preventDefault();
      this.holding = true;
      this.holdTimer = performance.now();
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
    holdBtn.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _show(el) {
    el.classList.remove('hidden');
  }

  _hide(el) {
    el.classList.add('hidden');
  }

  _resetHold() {
    this.holding = false;
    this.els.holdFill.style.width = '0%';
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
    if (!button) {
      return false;
    }
    if (this.engine.tryBuy(button.dataset.buy)) {
      this.renderUpgrades();
      this.renderSectors();
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
    if (name === 'menu') {
      this._show(this.els.settingsModal);
      return;
    }
    this.activeTab = name;
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

  renderUpgrades() {
    this.els.tap.innerHTML = this._upgradeGroups('tap');
    this.els.fleet.innerHTML = this._upgradeGroups('fleet');
    this.els.haul.innerHTML = this._upgradeGroups('haul');
  }

  _upgradeGroups(tab) {
    const upgrades = this.engine.state.upgrades;
    const credits = this.engine.state.credits;
    return groupedUpgrades(tab)
      .map((group) => {
        const cards = group.items
          .map((def) => {
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
          })
          .join('');
        const blurb = GROUP_BLURBS[group.title]
          ? `<p class="group-blurb">${GROUP_BLURBS[group.title]}</p>`
          : '';
        return `<h2 class="group-title">${group.title}</h2>${blurb}<div class="upgrade-grid">${cards}</div>`;
      })
      .join('');
  }

  renderSectors() {
    const current = this.engine.state.sectorLevel;
    const harvested = this.engine.state.totalOreHarvested;
    const stats = this.engine.stats;
    const charter = groupedUpgrades('sector')
      .map((group) => {
        const cards = group.items
          .map((def) => {
            const level = this.engine.state.upgrades[def.id] || 0;
            const maxed = level >= def.maxLevel;
            const cost = upgradeCost(def, level);
            const canBuy = !maxed && this.engine.state.credits >= cost;
            return `
              <article class="upgrade-card${maxed ? ' maxed' : ''}">
                <div class="upgrade-head"><h3>${def.name}</h3><span class="perm">Permanent</span></div>
                <p class="upgrade-meta">Lv ${level}/${def.maxLevel} · ${def.describe(level)}</p>
                <button type="button" data-buy="${def.id}" ${canBuy ? '' : 'disabled'}>
                  ${maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`}
                </button>
              </article>
            `;
          })
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

  update() {
    const snap = this.engine.hudSnapshot();
    this.els.credits.textContent = formatCredits(snap.credits);
    this.els.drones.textContent = `${snap.drones}/${snap.maxDrones}`;
    this.els.cargo.textContent = `${snap.cargoUsed}/${snap.cargoMax}`;
    this.els.rate.textContent = snap.rate.toFixed(1);
    if (this.els.combo) {
      this.els.combo.textContent = snap.combo >= 2 ? `×${snap.combo}` : '—';
    }
    this.els.sectorBadge.textContent = `S${snap.sector.level} ${snap.sector.short}`;
    this.els.canvasWrap.classList.toggle('bank-live', Boolean(snap.banked));
    const ready = snap.tapInterval <= 0 ? 1 : 1 - snap.tapCooldown / snap.tapInterval;
    this.els.tapFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ready))})`;
    this._updateDeploy(snap);
    this._updateUpgradeButtons(snap);
    this._updateLedger(snap);
    this._updateJobs(snap);
    this._updateEvent(snap);
    this._updateToasts(snap);
    this._updateCoach(snap);
    this.pollHold();
  }

  _updateDeploy(snap) {
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
    this.els.deploy.textContent = `Launch Probe · $${formatCredits(cost)}${auto}`;
    this.els.deploy.disabled = snap.credits < cost;
  }

  _updateUpgradeButtons(snap) {
    for (const def of UPGRADE_DEFS) {
      const button = document.querySelector(`[data-buy="${def.id}"]`);
      if (!button) {
        continue;
      }
      const unlocked = isUnlocked(def, snap.upgrades);
      const level = snap.upgrades[def.id] || 0;
      const maxed = level >= def.maxLevel;
      const cost = upgradeCost(def, level);
      button.disabled = !unlocked || maxed || snap.credits < cost;
      button.textContent = !unlocked ? 'Locked' : maxed ? 'MAX' : `Buy · $${formatCredits(cost)}`;
    }
  }

  _updateLedger(snap) {
    const s = snap.stats;
    this.els.ledger.textContent =
      `Taps ${s.taps.toLocaleString('en-US')} · Launches ${s.launches} · Lost ${s.probesLost} · Deposits ${s.deposits} · Rocks ${s.asteroidsBroken} · Crits ${s.crits} · Walls ${s.wallBounces || 0} · Banks ${s.bankHits || 0} · Jobs ${snap.jobsCompleted} · Lifetime $${formatCredits(s.lifetimeCredits)}`;
  }

  _updateJobs(snap) {
    const sig = snap.jobs.map((job) => `${job.defId}:${Math.floor(job.progress)}:${job.amount}:${job.reward}`).join('|');
    if (sig === this._jobsSig) {
      return;
    }
    this._jobsSig = sig;
    this.els.jobs.innerHTML = snap.jobs
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
