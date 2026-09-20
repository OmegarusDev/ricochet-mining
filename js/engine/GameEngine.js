import { Vector2D } from './Vector2D.js';
import {
  SECTORS,
  UPGRADE_BY_ID,
  derivedStats,
  isUnlocked,
  sectorUnlockNeed,
  upgradeCost,
  zeroUpgrades
} from '../ui/Upgrades.js';
import { Asteroid } from '../entities/Asteroid.js';
import { launchMiningDrone } from '../entities/MiningDrone.js';
import { CollectorDrone } from '../entities/CollectorDrone.js';
import { spawnOreBurst, spawnSalvageChip, spawnTapChip, releaseOre } from '../entities/OreParticle.js';
import { TUNING, launchFee } from '../sim/Tuning.js';
import { Renderer } from '../view/Renderer.js';
import {
  MILESTONES,
  TUTORIAL_STEPS,
  fillJobs,
  jobLabel,
  jobProgress,
  rollEvent,
  skipOnboarding
} from '../content/Campaign.js';

export class GameEngine {
  constructor({ canvas, state, sound }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.sound = sound;
    this.drones = [];
    this.collectors = [];
    this.asteroids = [];
    this.particles = [];
    this.floatingTexts = [];
    this.ripples = [];
    this.sparks = [];
    this.bolts = [];
    this.toasts = [];
    this.stars = [];
    this._sparkPool = [];
    this._floatPool = [];
    this.wealthSamples = [];
    this.renderer = new Renderer(this);
    this.depotPulse = 0;
    this.nextCollectorId = 1;
    this.autoDeployTimer = 1.5;
    this.manualCooldown = 0;
    this.tapCooldown = 0;
    this.asteroidSpawnTimer = 0;
    this.creditsPerSec = 0;
    this.dirty = true;
    this.elapsed = 0;
    this.view = { scale: 1, ox: 0, oy: 0, cssW: 1, cssH: 1, cx: null, cy: null };
    this.combo = 0;
    this.comboId = null;
    this.comboTimer = 0;
    this.shake = 0;
    this.event = null;
    this.flash = 0;
    this.hint = !state.flags?.tapped;
    fillJobs(this.state);
    this.stats = derivedStats(state.upgrades, state.sectorLevel, this.event);
    this.playfield = { width: this.stats.width, height: this.stats.height };
    this._seedStars();
    this._syncCollectors();
    this._fillAsteroids();
    this._checkMilestones(true);
  }

  fieldCap() {
    return Math.min(TUNING.fieldCap, this.stats.maxAsteroids);
  }

  launchCostNow() {
    return launchFee(this.drones.length, this.stats.launchDiscount);
  }

  depot() {
    return {
      x: this.playfield.width / 2,
      y: this.playfield.height - 18,
      w: 92,
      h: 22,
      r: this.stats.depotRadius
    };
  }

  markDirty() {
    this.dirty = true;
    if (typeof this.onChange === 'function') {
      this.onChange();
    }
  }

  refreshStats() {
    this.stats = derivedStats(this.state.upgrades, this.state.sectorLevel, this.event);
    const nextW = this.stats.width;
    const nextH = this.stats.height;
    if (!this.playfield || this.playfield.width !== nextW || this.playfield.height !== nextH) {
      this.playfield = { width: nextW, height: nextH };
      this.fitNeeded = true;
    }
    for (const drone of this.drones) {
      drone.applyStats({
        damage: this.stats.droneDamage,
        maxHp: this.stats.droneMaxHp,
        speed: this.stats.droneSpeed,
        radius: this.stats.probeRadius
      });
    }
    for (const collector of this.collectors) {
      collector.applyStats({
        maxSpeed: this.stats.collectorSpeed,
        magnetRadius: this.stats.magnetRadius,
        capacity: this.stats.cargoCapacity
      });
    }
    this._syncCollectors();
    if (this.renderer) {
      this.renderer.invalidate();
    }
  }

  resizeCanvas(displayWidth, displayHeight, { reset = false } = {}) {
    this.playfield = { width: this.stats.width, height: this.stats.height };
    const dpr = window.devicePixelRatio || 1;
    const nextW = Math.max(1, Math.round(displayWidth * dpr));
    const nextH = Math.max(1, Math.round(displayHeight * dpr));
    if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
      this.canvas.width = nextW;
      this.canvas.height = nextH;
      for (const asteroid of this.asteroids) {
        asteroid._fill = null;
        asteroid._fillCtx = null;
      }
      if (this.renderer) {
        this.renderer.invalidate();
      }
    }
    const prevScale = this.view.scale;
    const prevCx = this.view.cx;
    const prevCy = this.view.cy;
    const prevW = this.view.cssW;
    const prevH = this.view.cssH;
    const fieldChanged =
      this._viewFieldW !== this.playfield.width || this._viewFieldH !== this.playfield.height;
    this._viewFieldW = this.playfield.width;
    this._viewFieldH = this.playfield.height;
    this.view.cssW = displayWidth;
    this.view.cssH = displayHeight;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    const wasFitted = this.isViewFitted(prevScale, prevCx, prevCy, prevW, prevH);
    const sizeJump = Math.max(Math.abs(displayWidth - (prevW || 0)), Math.abs(displayHeight - (prevH || 0)));
    if (reset || fieldChanged || prevCx == null || prevCy == null || (wasFitted && sizeJump > 80)) {
      this.resetView();
    } else {
      this.view.scale = prevScale;
      this.view.cx = prevCx;
      this.view.cy = prevCy;
      this.clampView();
    }
  }

  isViewFitted(scale = this.view.scale, cx = this.view.cx, cy = this.view.cy, cssW = this.view.cssW, cssH = this.view.cssH) {
    if (cx == null || cy == null || cssW < 8 || cssH < 8) {
      return true;
    }
    const contain = Math.min(cssW / this.playfield.width, cssH / this.playfield.height);
    const slop = Math.max(0.04, contain * 0.04);
    return (
      Math.abs((scale || 0) - contain) <= slop &&
      Math.abs(cx - this.playfield.width / 2) <= 4 &&
      Math.abs(cy - this.playfield.height / 2) <= 4
    );
  }

  containScale(cssW = this.view.cssW, cssH = this.view.cssH) {
    const width = Math.max(1, this.playfield.width);
    const height = Math.max(1, this.playfield.height);
    return Math.min(cssW / width, cssH / height);
  }

  resetView() {
    this.view.scale = this.containScale();
    this.view.cx = this.playfield.width / 2;
    this.view.cy = this.playfield.height / 2;
    this.syncView();
  }

  syncView() {
    const { cssW, cssH, scale, cx, cy } = this.view;
    this.view.ox = cssW / 2 - cx * scale;
    this.view.oy = cssH / 2 - cy * scale;
    this.applyViewTransform();
  }

  clampView() {
    const { cssW, cssH } = this.view;
    const width = this.playfield.width;
    const height = this.playfield.height;
    const contain = this.containScale(cssW, cssH);
    const minScale = contain * 0.75;
    const maxScale = Math.max(contain * 3.6, 2.4);
    this.view.scale = Math.min(maxScale, Math.max(minScale, this.view.scale || contain));
    const scale = this.view.scale;
    const viewW = cssW / scale;
    const viewH = cssH / scale;
    if (viewW >= width) {
      this.view.cx = width / 2;
    } else {
      const half = viewW / 2;
      this.view.cx = Math.min(width - half, Math.max(half, this.view.cx));
    }
    if (viewH >= height) {
      this.view.cy = height / 2;
    } else {
      const half = viewH / 2;
      this.view.cy = Math.min(height - half, Math.max(half, this.view.cy));
    }
    this.syncView();
  }

  panView(dxCss, dyCss) {
    const scale = this.view.scale || 1;
    this.view.cx -= dxCss / scale;
    this.view.cy -= dyCss / scale;
    this.clampView();
  }

  zoomView(cssX, cssY, factor) {
    const scale = this.view.scale || 1;
    const worldX = (cssX - this.view.ox) / scale;
    const worldY = (cssY - this.view.oy) / scale;
    this.view.scale = scale * factor;
    this.clampView();
    this.view.ox = cssX - worldX * this.view.scale;
    this.view.oy = cssY - worldY * this.view.scale;
    this.view.cx = (this.view.cssW / 2 - this.view.ox) / this.view.scale;
    this.view.cy = (this.view.cssH / 2 - this.view.oy) / this.view.scale;
    this.clampView();
  }

  applyViewTransform() {
    const dpr = window.devicePixelRatio || 1;
    const { scale, ox, oy } = this.view;
    this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
  }

  eventToLogical(event) {
    const rect = this.canvas.getBoundingClientRect();
    const point = event.changedTouches ? event.changedTouches[0] : event;
    const scale = this.view.scale || 1;
    return new Vector2D(
      (point.clientX - rect.left - this.view.ox) / scale,
      (point.clientY - rect.top - this.view.oy) / scale
    );
  }

  update(dt) {
    const simDt = Math.min(dt * (this.state.settings.gameSpeed || 1), 0.1);
    this.elapsed += simDt;
    this.comboTimer = Math.max(0, this.comboTimer - simDt);
    this.shake = Math.max(0, this.shake - simDt);
    this.flash = Math.max(0, this.flash - simDt);
    this.depotPulse = Math.max(0, this.depotPulse - simDt);
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboId = null;
    }
    let frameTime = simDt;
    while (frameTime > 0) {
      const subDt = Math.min(frameTime, 0.008);
      this.updatePhysicsSubStep(subDt);
      frameTime -= subDt;
    }
    if (!this.state.settings.reducedMotion) {
      for (const drone of this.drones) {
        drone.recordTrail();
      }
    }
    this._updateFloating(simDt);
    this._updateRipples(simDt);
    this._updateSparks(simDt);
    this._updateBolts(simDt);
    this._updateToasts(simDt);
    this._tickEvent(simDt);
    this._updateRate();
  }

  updatePhysicsSubStep(dt) {
    this.tapCooldown = Math.max(0, this.tapCooldown - dt);
    this.manualCooldown = Math.max(0, this.manualCooldown - dt);
    this._tickAutoDeploy(dt);
    this._tickAsteroidSpawn(dt);
    this._tickRegen(dt);
    this._tickGuidance(dt);

    for (const drone of this.drones) {
      drone.integrate(dt);
      this._bounceWalls(drone);
    }
    this._resolveDroneAsteroids();
    this._reapDrones();

    for (const asteroid of this.asteroids) {
      asteroid.update(dt, this.playfield);
    }
    this.asteroids = this.asteroids.filter((asteroid) => !asteroid.isDestroyed());

    const depot = this.depot();
    const loose = [];
    for (const particle of this.particles) {
      particle.isMagnetized = false;
      if (!particle.collected) {
        loose.push(particle);
      }
    }
    for (const collector of this.collectors) {
      collector.update(dt, this.playfield, loose, depot, this.stats);
    }
    for (const particle of this.particles) {
      particle.update(dt, this.playfield);
    }
    this._collectParticles();
    this._unloadCollectors(depot, dt);
    this.particles = this.particles.filter((particle) => {
      if (!particle.collected) {
        return true;
      }
      this._releaseChip(particle);
      return false;
    });
  }

  tryTap(point) {
    if (this.tapCooldown > 0) {
      return false;
    }
    let target = null;
    let best = Infinity;
    let second = null;
    let secondD = Infinity;
    for (const asteroid of this.asteroids) {
      if (asteroid.isDestroyed()) {
        continue;
      }
      const d = point.dist(asteroid.pos) - asteroid.radius * 0.15;
      if (d < best) {
        second = target;
        secondD = best;
        target = asteroid;
        best = d;
      } else if (d < secondD) {
        second = asteroid;
        secondD = d;
      }
    }
    if (!target || best >= this.stats.tapRadius) {
      return false;
    }

    this.tapCooldown = this.stats.tapInterval;
    this.state.stats.taps += 1;
    this.state.flags.tapped = true;
    this.ripples.push({ x: point.x, y: point.y, age: 0, life: 0.35 });

    if (this.comboId === target.id) {
      this.combo += 1;
    } else {
      this.combo = 1;
      this.comboId = target.id;
    }
    this.comboTimer = 1.4;
    this.state.stats.maxCombo = Math.max(this.state.stats.maxCombo, this.combo);

    let damage = this.stats.tapDamage * this.stats.tapSoften * (1 + (this.combo - 1) * this.stats.tapCombo);
    let crit = false;
    let over = false;
    if (this.stats.overchargeEvery > 0 && this.state.stats.taps % this.stats.overchargeEvery === 0) {
      damage *= 3.1;
      over = true;
    }
    if (Math.random() < this.stats.tapCrit) {
      damage *= 2.6;
      crit = true;
      this.state.stats.crits += 1;
    }
    damage = Math.max(1, Math.floor(damage));
    const extraTarget =
      this.stats.multiHit > 0 && second && secondD < this.stats.tapRadius + 18 ? second : null;
    this._spawnLaserBolt(target.pos, {
      targetId: target.id,
      damage,
      crit,
      over,
      secondId: extraTarget ? extraTarget.id : null,
      extra: extraTarget ? Math.max(1, Math.floor(damage * this.stats.multiHit)) : 0
    });
    this.sound.playTap(crit || over);
    if (this.state.settings.haptics && navigator.vibrate) {
      navigator.vibrate(crit || over ? 18 : 8);
    }
    if ((crit || over) && !this.state.settings.reducedMotion) {
      this.shake = 0.16;
    }
    this._checkMilestones();
    this.markDirty();
    return true;
  }

  _spawnLaserBolt(dest, payload) {
    const depot = this.depot();
    const ox = depot.x;
    const oy = depot.y - depot.h / 2 - 4;
    const dx = dest.x - ox;
    const dy = dest.y - oy;
    const dist = Math.hypot(dx, dy) || 1;
    const fast = this.state.settings.reducedMotion;
    const speed = fast ? 6000 : 1280;
    this.bolts.push({
      x: ox,
      y: oy,
      ox,
      oy,
      tx: dest.x,
      ty: dest.y,
      angle: Math.atan2(dy, dx),
      t: 0,
      dur: Math.min(fast ? 0.05 : 0.42, dist / speed),
      payload
    });
  }

  _updateBolts(dt) {
    const live = [];
    for (const bolt of this.bolts) {
      if (bolt.payload) {
        const homing = this.asteroids.find((rock) => rock.id === bolt.payload.targetId && !rock.isDestroyed());
        if (homing) {
          bolt.tx = homing.pos.x;
          bolt.ty = homing.pos.y;
          bolt.angle = Math.atan2(bolt.ty - bolt.oy, bolt.tx - bolt.ox);
        }
      }
      bolt.t += dt;
      const u = Math.min(1, bolt.dur <= 0 ? 1 : bolt.t / bolt.dur);
      bolt.x = bolt.ox + (bolt.tx - bolt.ox) * u;
      bolt.y = bolt.oy + (bolt.ty - bolt.oy) * u;
      if (u < 1) {
        live.push(bolt);
        continue;
      }
      this._resolveLaserBolt(bolt);
    }
    this.bolts = live;
  }

  _resolveLaserBolt(bolt) {
    if (!bolt.payload) {
      return;
    }
    const { targetId, damage, crit, over, secondId, extra } = bolt.payload;
    const target = this.asteroids.find((rock) => rock.id === targetId && !rock.isDestroyed());
    if (!target) {
      this._spawnSparks(bolt.tx, bolt.ty, '#f87171', 5);
      return;
    }
    const shot = new Vector2D(target.pos.x - bolt.ox, target.pos.y - bolt.oy);
    if (shot.magSq() === 0) {
      shot.y = -1;
    } else {
      shot.normalize();
    }
    const impact = new Vector2D(target.pos.x + shot.x, target.pos.y + shot.y);
    this._strikeAsteroid(target, damage, impact, { tap: true, crit, over });
    if (extra > 0 && secondId) {
      const second = this.asteroids.find((rock) => rock.id === secondId && !rock.isDestroyed());
      if (second) {
        this._strikeAsteroid(second, extra, second.pos, { tap: true, splash: true });
      }
    }
    if (this.stats.tapSplash > 0) {
      for (const other of this.asteroids) {
        if (other === target || other.isDestroyed()) {
          continue;
        }
        if (other.pos.dist(target.pos) <= this.stats.splashRadius) {
          const splash = Math.max(1, Math.floor(damage * this.stats.tapSplash));
          this._strikeAsteroid(other, splash, other.pos, { tap: true, splash: true });
        }
      }
    }
    this.depotPulse = Math.max(this.depotPulse, 0.18);
    this.markDirty();
  }

  deployDrone(force = false) {
    if (this.stats.maxDrones <= 0 || this.drones.length >= this.stats.maxDrones) {
      return false;
    }
    if (!force && this.manualCooldown > 0) {
      return false;
    }
    const cost = this.launchCostNow();
    if (this.state.credits < cost) {
      this.sound.playDeny();
      return false;
    }
    this.state.credits -= cost;
    this._spawnDrill();
    this.state.stats.launches += 1;
    if (
      this.stats.extraLaunchChance > 0 &&
      this.drones.length < this.stats.maxDrones &&
      Math.random() < this.stats.extraLaunchChance
    ) {
      const extraCost = Math.max(2, Math.floor(cost * 0.5));
      if (this.state.credits >= extraCost) {
        this.state.credits -= extraCost;
        this._spawnDrill();
        this.state.stats.launches += 1;
        this.pushToast('Twin rails — second drill away');
      }
    }
    this.manualCooldown = this.stats.manualLaunchDelay;
    this.autoDeployTimer = this.stats.autoLaunchEnabled
      ? this.stats.autoDeployInterval
      : this.autoDeployTimer;
    this.sound.playLaunch();
    this._checkMilestones();
    this.markDirty();
    return true;
  }

  tryBuy(upgradeId) {
    const def = UPGRADE_BY_ID[upgradeId];
    if (!def) {
      return false;
    }
    if (!isUnlocked(def, this.state.upgrades)) {
      this.sound.playDeny();
      return false;
    }
    const level = this.state.upgrades[upgradeId] || 0;
    if (level >= def.maxLevel) {
      return false;
    }
    const cost = upgradeCost(def, level);
    if (this.state.credits < cost) {
      this.sound.playDeny();
      return false;
    }
    this.state.credits -= cost;
    this.state.upgrades[upgradeId] = level + 1;
    this.state.stats.upgradesBought += 1;
    if (upgradeId === 'drone_max_count') {
      this.state.stats.drillLicenses = (this.state.stats.drillLicenses || 0) + 1;
    }
    this.refreshStats();
    this.sound.playPurchase();
    this._checkMilestones();
    fillJobs(this.state);
    this.markDirty();
    return true;
  }

  claimJob(index) {
    fillJobs(this.state);
    const job = this.state.jobs.slots[index];
    if (!job || jobProgress(job, this.state.stats) < job.amount) {
      return false;
    }
    this.state.credits += job.reward;
    this.state.stats.lifetimeCredits += job.reward;
    this.state.jobs.completed += 1;
    this.state.stats.jobsCompleted = this.state.jobs.completed;
    this.pushToast(`Contract paid · $${formatCredits(job.reward)}`);
    this.state.jobs.slots.splice(index, 1);
    if (job.tutorial) {
      this.state.jobs.tutorialIndex = (this.state.jobs.tutorialIndex || 0) + 1;
    }
    fillJobs(this.state);
    this.sound.playJob();
    this._checkMilestones();
    this.markDirty();
    return true;
  }

  nextSector() {
    return SECTORS.find((sector) => sector.level === this.state.sectorLevel + 1) || null;
  }

  canExpand() {
    const next = this.nextSector();
    return Boolean(next && this.state.totalOreHarvested >= sectorUnlockNeed(next, this.stats));
  }

  expandSector() {
    if (!this.canExpand()) {
      return false;
    }
    const keep = Math.floor(this.state.credits * this.stats.salvageKeep);
    const stipend = this.stats.stipend;
    this.state.sectorLevel += 1;
    this.state.upgrades = zeroUpgrades({
      keepPermanent: true,
      current: this.state.upgrades
    });
    this.state.credits = keep + stipend;
    this.state.stats.drillLicenses = this.state.upgrades.drone_max_count || 0;
    this.drones = [];
    this.asteroids = [];
    this.particles = [];
    this.collectors = [];
    this.floatingTexts = [];
    this.ripples = [];
    this.sparks = [];
    this.bolts = [];
    this.wealthSamples = [];
    this.depotPulse = 0;
    this.event = null;
    this.nextCollectorId = 1;
    this.autoDeployTimer = 2;
    this.asteroidSpawnTimer = 0;
    this.combo = 0;
    fillJobs(this.state);
    this.refreshStats();
    this._seedStars();
    this._syncCollectors();
    this._fillAsteroids();
    this.fitNeeded = true;
    this.pushToast(`Claim jumped — ${this.stats.sector.name}`);
    this.markDirty();
    return true;
  }

  pushToast(text) {
    this.toasts.push({ text, age: 0, life: 3.2 });
    if (this.toasts.length > 4) {
      this.toasts.shift();
    }
  }

  skipTutorial() {
    skipOnboarding(this.state);
    fillJobs(this.state);
    this.markDirty();
  }

  advanceTutorial() {
    const step = this.state.flags.tutorialStep || 0;
    if (step < TUTORIAL_STEPS.length) {
      this.state.flags.tutorialStep = step + 1;
      this.markDirty();
    }
  }

  replayTutorial() {
    this.state.flags.tutorialStep = 0;
    this.markDirty();
  }

  hudSnapshot() {
    const cargoUsed = this.collectors.reduce((n, c) => n + c.used, 0);
    const cargoMax = this.collectors.reduce((n, c) => n + c.capacity, 0);
    const cargoValue = this.collectors.reduce((n, c) => n + c.cargoValue(), 0);
    const jobs = this.state.jobs.slots.map((job) => ({
      ...job,
      progress: jobProgress(job, this.state.stats),
      label: jobLabel(job)
    }));
    return {
      credits: this.state.credits,
      drones: this.drones.length,
      maxDrones: this.stats.maxDrones,
      rate: this.creditsPerSec,
      sector: this.stats.sector,
      tapCooldown: this.tapCooldown,
      tapInterval: this.stats.tapInterval,
      launchCost: this.launchCostNow(),
      autoLaunchEnabled: this.stats.autoLaunchEnabled,
      autoDeployTimer: this.autoDeployTimer,
      autoDeployInterval: this.stats.autoDeployInterval,
      manualCooldown: this.manualCooldown,
      totalOreHarvested: this.state.totalOreHarvested,
      upgrades: this.state.upgrades,
      cargoUsed,
      cargoMax,
      cargoValue,
      combo: this.combo,
      hint: this.hint,
      stats: this.state.stats,
      jobs,
      jobsCompleted: this.state.jobs.completed,
      tutorialIndex: this.state.jobs.tutorialIndex || 0,
      event: this.event && this.event.ttl > 0 ? this.event : null,
      tutorialStep: this.state.flags.tutorialStep,
      tutorial: TUTORIAL_STEPS[this.state.flags.tutorialStep] || null,
      toasts: this.toasts,
      rocks: this.asteroids.length,
      maxAsteroids: this.fieldCap()
    };
  }

  draw() {
    this.renderer.draw();
  }

  _spawnDrill() {
    this.drones.push(launchMiningDrone(this.stats, this.playfield));
    this.state.stats.maxLiveDrones = Math.max(this.state.stats.maxLiveDrones || 0, this.drones.length);
  }

  _maybeLeakOre(asteroid, origin) {
    const chance = this.stats.chipLeakChance || 0;
    const count = this.stats.tapChipCount || 0;
    if (chance <= 0 || count <= 0 || asteroid.hp <= 0) {
      return;
    }
    if (Math.random() >= chance) {
      return;
    }
    const chipValue =
      asteroid.unitValue * this.stats.oreValueMult * this.stats.sectorMult * this.stats.tapChipMult;
    for (let i = 0; i < count; i++) {
      this._absorbChip(spawnTapChip(origin, asteroid, chipValue));
    }
    if (this.stats.luckyChip > 0 && Math.random() < this.stats.luckyChip) {
      this._absorbChip(spawnTapChip(origin, asteroid, chipValue * 0.85));
    }
    this.sound.playLeak();
  }

  _strikeAsteroid(asteroid, damage, origin, meta) {
    asteroid.hp -= damage;
    asteroid.noteHit();
    if (this.state.settings.damageNumbers !== false && !meta.splash) {
      let label = `-${damage}`;
      let color = '#ef4444';
      if (meta.over) {
        label = `${damage} OVER`;
        color = '#c4b5fd';
      } else if (meta.bank && meta.crit) {
        label = `${damage} REBOUND CRIT`;
        color = '#fde68a';
      } else if (meta.crit) {
        label = `${damage} CRIT`;
        color = '#fde047';
      } else if (meta.bank) {
        label = `${damage} REBOUND`;
        color = '#fbbf24';
      }
      this._spawnFloat(origin.x, origin.y - 8, label, color, meta.crit || meta.bank ? 1 : 0.8);
    }
    if (asteroid.hp <= 0) {
      const n = Vector2D.sub(origin, asteroid.pos);
      if (n.magSq() === 0) {
        n.x = 0;
        n.y = -1;
      } else {
        n.normalize();
      }
      this._absorbChips(
        spawnOreBurst(
          asteroid,
          n,
          this.stats.oreValueMult,
          this.stats.sectorMult,
          this.stats.richVeins
        )
      );
      this.state.stats.asteroidsBroken += 1;
      this.hint = false;
      const rare = asteroid.tier && ['gold', 'platinum', 'dark', 'void', 'horizon'].includes(asteroid.tier.id);
      if (rare) {
        this.flash = 0.22;
        this._spawnFloat(asteroid.pos.x, asteroid.pos.y - asteroid.radius - 6, asteroid.tier.name, asteroid.tier.color, 1.15);
      }
      if (meta.bank) {
        this.flash = Math.max(this.flash, 0.14);
      }
      this.sound.playAsteroidBreak();
      this._checkMilestones();
    } else {
      this._maybeLeakOre(asteroid, origin);
      if (!meta.tap) {
        if (meta.crit) {
          this.sound.playDrillCrit();
        } else {
          this.sound.playHit(damage);
        }
      }
    }
  }

  _tickAutoDeploy(dt) {
    if (!this.stats.autoLaunchEnabled) {
      return;
    }
    this.autoDeployTimer = Math.max(0, this.autoDeployTimer - dt);
    if (this.drones.length >= this.stats.maxDrones) {
      return;
    }
    if (this.autoDeployTimer <= 0 && this.state.credits >= this.launchCostNow()) {
      this.deployDrone(true);
      this.autoDeployTimer = this.stats.autoDeployInterval;
    }
  }

  _tickAsteroidSpawn(dt) {
    if (this.asteroids.length >= this.fieldCap()) {
      return;
    }
    this.asteroidSpawnTimer -= dt;
    if (this.asteroidSpawnTimer <= 0) {
      this.asteroids.push(this._spawnRock());
      this.asteroidSpawnTimer = this.stats.asteroidSpawnDelay;
    }
  }

  _spawnRock() {
    return Asteroid.spawn(
      this.playfield,
      this.state.sectorLevel,
      this.stats.hpMult || 1,
      this.asteroids,
      this.stats.rareShift,
      this.stats.driftSpeed
    );
  }

  _fillAsteroids() {
    while (this.asteroids.length < this.fieldCap()) {
      this.asteroids.push(this._spawnRock());
    }
    this.asteroidSpawnTimer = this.stats.asteroidSpawnDelay;
  }

  _syncCollectors() {
    while (this.collectors.length < this.stats.maxCollectors) {
      const depot = this.depot();
      this.collectors.push(
        new CollectorDrone({
          id: this.nextCollectorId++,
          pos: new Vector2D(depot.x + (Math.random() - 0.5) * 36, depot.y - 28),
          maxSpeed: this.stats.collectorSpeed,
          magnetRadius: this.stats.magnetRadius,
          capacity: this.stats.cargoCapacity
        })
      );
    }
  }

  _tickRegen(dt) {
    if (this.stats.hullRegen <= 0) {
      return;
    }
    for (const drone of this.drones) {
      drone.hp = Math.min(drone.maxHp, drone.hp + this.stats.hullRegen * dt);
    }
  }

  _tickGuidance(dt) {
    if (this.stats.guidance <= 0 || this.asteroids.length === 0) {
      return;
    }
    for (const drone of this.drones) {
      let nearest = null;
      let best = Infinity;
      for (const asteroid of this.asteroids) {
        const d = drone.pos.dist(asteroid.pos);
        if (d < best) {
          best = d;
          nearest = asteroid;
        }
      }
      if (!nearest) {
        continue;
      }
      const desired = Vector2D.sub(nearest.pos, drone.pos);
      if (desired.magSq() === 0) {
        continue;
      }
      desired.normalize().mult(this.stats.droneSpeed);
      const steer = Vector2D.sub(desired, drone.vel).mult(this.stats.guidance * dt * 6);
      drone.vel.add(steer).clamp(this.stats.droneSpeed);
    }
  }

  _bounceWalls(drone) {
    const W = this.playfield.width;
    const H = this.playfield.height;
    const r = drone.radius;
    const damp = this.stats.wallDamp;
    let bounced = false;
    let sparkX = drone.pos.x;
    let sparkY = drone.pos.y;
    if (drone.pos.x - r <= 0 || drone.pos.x + r >= W) {
      drone.vel.x = -drone.vel.x * damp;
      drone.pos.x = Math.max(r, Math.min(W - r, drone.pos.x));
      sparkX = drone.pos.x <= r + 0.5 ? 1 : W - 1;
      sparkY = drone.pos.y;
      bounced = true;
    }
    if (drone.pos.y - r <= 0 || drone.pos.y + r >= H) {
      drone.vel.y = -drone.vel.y * damp;
      drone.pos.y = Math.max(r, Math.min(H - r, drone.pos.y));
      sparkX = drone.pos.x;
      sparkY = drone.pos.y <= r + 0.5 ? 1 : H - 1;
      bounced = true;
    }
    if (!bounced || drone.bounceLock > 0) {
      return;
    }
    drone.bounceLock = 0.085;
    drone.bounces += 1;
    this.state.stats.wallBounces += 1;
    if (this.stats.bankShot > 0) {
      drone.bankT = 0.5;
    }
    this._spawnSparks(sparkX, sparkY, this.stats.bankShot > 0 ? '#fbbf24' : '#7dd3fc', 8);
    this.sound.playBounce();
    if (this.stats.bankShot > 0 && !this.state.flags.seenBank) {
      this.state.flags.seenBank = true;
      this.pushToast('Rebound');
    }
    this._checkMilestones();
  }

  _resolveDroneAsteroids() {
    for (const drone of this.drones) {
      if (drone.isDestroyed()) {
        continue;
      }
      for (const asteroid of this.asteroids) {
        if (asteroid.isDestroyed()) {
          continue;
        }
        const dx = drone.pos.x - asteroid.pos.x;
        const dy = drone.pos.y - asteroid.pos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = drone.radius + asteroid.radius;
        if (distSq > radiusSum * radiusSum) {
          continue;
        }
        const nx = distSq === 0 ? 1 : dx / Math.sqrt(distSq);
        const ny = distSq === 0 ? 0 : dy / Math.sqrt(distSq);
        drone.pos.x = asteroid.pos.x + nx * (radiusSum + 0.2);
        drone.pos.y = asteroid.pos.y + ny * (radiusSum + 0.2);
        const vn = drone.vel.x * nx + drone.vel.y * ny;
        if (vn < 0) {
          drone.vel.reflect(new Vector2D(nx, ny));
        }
        if (drone.rockLock > 0) {
          continue;
        }
        drone.rockLock = 0.12;
        const trade = Math.max(1, Math.floor(drone.damage));
        const recoilFrac = Number.isFinite(this.stats.recoilFrac) ? this.stats.recoilFrac : 1;
        drone.hp -= Math.max(1, Math.floor(trade * recoilFrac));
        const impact = new Vector2D(
          asteroid.pos.x + nx * asteroid.radius,
          asteroid.pos.y + ny * asteroid.radius
        );
        let damage = trade;
        const charged = drone.bankT > 0;
        const banked = charged && this.stats.bankShot > 0;
        if (charged) {
          drone.bankT = 0;
        }
        if (banked) {
          damage *= 1 + this.stats.bankShot;
          this.state.stats.bankHits += 1;
        }
        let crit = false;
        if (Math.random() < this.stats.probeCrit) {
          damage *= this.stats.probeCritMult;
          crit = true;
          this.state.stats.crits += 1;
        }
        damage = Math.max(1, Math.floor(damage));
        this._strikeAsteroid(asteroid, damage, impact, { tap: false, crit, bank: banked });
        this._spawnSparks(impact.x, impact.y, banked ? '#fbbf24' : crit ? '#fde047' : '#7dd3fc', crit ? 10 : 5);
        if ((crit || banked) && this.state.settings.haptics && navigator.vibrate) {
          navigator.vibrate(crit ? 16 : 10);
        }
        if (banked && !this.state.settings.reducedMotion) {
          this.shake = Math.max(this.shake, 0.09);
        }
        if (drone.isDestroyed()) {
          break;
        }
        if (this.stats.chainFrac > 0) {
          let chain = null;
          let best = 90;
          for (const other of this.asteroids) {
            if (other === asteroid || other.isDestroyed()) {
              continue;
            }
            const d = asteroid.pos.dist(other.pos);
            if (d < best) {
              best = d;
              chain = other;
            }
          }
          if (chain) {
            const chained = Math.max(1, Math.floor(drone.damage * this.stats.chainFrac));
            this._strikeAsteroid(chain, chained, chain.pos, { tap: false, splash: true });
          }
        }
      }
    }
  }

  _reapDrones() {
    const live = [];
    for (const drone of this.drones) {
      if (!drone.isDestroyed()) {
        live.push(drone);
        continue;
      }
      this.state.stats.probesLost += 1;
      const liveCount = this.drones.filter((item) => !item.isDestroyed()).length;
      const rebate = launchFee(liveCount, this.stats.launchDiscount) * this.stats.scrapRebate;
      if (rebate > 0) {
        this.state.credits += rebate;
        this.state.stats.lifetimeCredits += rebate;
        this._spawnFloat(drone.pos.x, drone.pos.y, `+$${formatCredits(rebate)}`, '#7dd3fc');
      }
      this._absorbChip(
        spawnSalvageChip(
          drone.pos,
          Math.max(0.4, launchFee(liveCount, this.stats.launchDiscount) * 0.08 * this.stats.oreValueMult)
        )
      );
      this.sound.playDeny();
      this._checkMilestones();
      this.markDirty();
    }
    this.drones = live;
  }

  _collectParticles() {
    for (const particle of this.particles) {
      if (particle.collected) {
        continue;
      }
      for (const collector of this.collectors) {
        if (collector.full) {
          continue;
        }
        if (collector.pos.dist(particle.pos) <= 8) {
          particle.collected = true;
          collector.cargo.push({ value: particle.value, color: particle.color });
          if (collector.targetParticle === particle) {
            collector.targetParticle = null;
          }
          this.sound.playCollect();
          break;
        }
      }
    }
  }

  _unloadCollectors(depot, dt) {
    const pad = new Vector2D(depot.x, depot.y);
    for (const collector of this.collectors) {
      if (collector.used <= 0) {
        continue;
      }
      if (collector.pos.dist(pad) > depot.r) {
        collector.unloadAcc = 0;
        continue;
      }
      collector.unloadAcc += this.stats.unloadPerSec * dt;
      let gained = 0;
      let chips = 0;
      while (collector.unloadAcc >= 1 && collector.used > 0) {
        collector.unloadAcc -= 1;
        const chip = collector.cargo.shift();
        if (!chip) {
          break;
        }
        gained += chip.value;
        chips += 1;
      }
      if (gained > 0) {
        this.state.credits += gained;
        this.state.totalOreHarvested += gained;
        this.state.stats.lifetimeCredits += gained;
        this.state.stats.deposits += chips;
        this._spawnFloat(depot.x, depot.y - 18, `+$${formatCredits(gained)}`, '#f59e0b');
        this.depotPulse = 0.45;
        this.sound.playUnload();
        this._checkMilestones();
        this.markDirty();
      }
    }
  }

  _tickEvent(dt) {
    if (this.event && this.event.ttl > 0) {
      this.event.ttl -= dt;
      if (this.event.ttl <= 0) {
        this.pushToast(`${this.event.name} ended`);
        this.event = null;
        this.refreshStats();
      }
      return;
    }
    this.state.jobs.nextEvent = (this.state.jobs.nextEvent || 80) - dt;
    if (this.state.jobs.nextEvent <= 0) {
      this.state.jobs.nextEvent = 75 + Math.random() * 55;
      if (this.state.stats.taps >= 8 && Math.random() < 0.62) {
        this.event = rollEvent(this.state);
        this.refreshStats();
        this.pushToast(this.event.name);
        this.sound.playEvent();
        this.markDirty();
      }
    }
  }

  _checkMilestones(silent = false) {
    const claimed = new Set(this.state.milestones || []);
    const snapshot = { ...this.state.stats };
    for (const mile of MILESTONES) {
      if (claimed.has(mile.id) || !mile.test(snapshot)) {
        continue;
      }
      this.state.milestones.push(mile.id);
      this.state.credits += mile.reward;
      this.state.stats.lifetimeCredits += mile.reward;
      if (!silent) {
        this.pushToast(`${mile.name} · +$${mile.reward}`);
        this.sound.playJob();
      }
      this.markDirty();
    }
  }

  _absorbChips(list) {
    for (const chip of list) {
      this._absorbChip(chip);
    }
  }

  _absorbChip(chip) {
    if (this.particles.length >= TUNING.particleCap) {
      let host = null;
      let best = Infinity;
      for (const particle of this.particles) {
        if (particle.collected) {
          continue;
        }
        const d = particle.pos.dist(chip.pos);
        if (d < best) {
          best = d;
          host = particle;
        }
      }
      if (host) {
        host.value += chip.value;
        host.radius = Math.min(8, host.radius + 0.12);
        this._releaseChip(chip);
        return;
      }
    }
    this.particles.push(chip);
  }

  _spawnFloat(x, y, text, color, life = 0.8) {
    const item = this._floatPool.pop() || { x: 0, y: 0, text: '', color: '', age: 0, life: 0 };
    item.x = x;
    item.y = y;
    item.text = text;
    item.color = color;
    item.age = 0;
    item.life = life;
    this.floatingTexts.push(item);
    if (this.floatingTexts.length > 28) {
      this._floatPool.push(this.floatingTexts.shift());
    }
  }

  _spawnSparks(x, y, color, count) {
    if (this.state.settings.reducedMotion) {
      return;
    }
    const n = Math.max(3, count || 6);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 120;
      const spark = this._sparkPool.pop() || {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        life: 0,
        r: 0,
        color: ''
      };
      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(ang) * spd;
      spark.vy = Math.sin(ang) * spd;
      spark.age = 0;
      spark.life = 0.18 + Math.random() * 0.22;
      spark.r = 1.1 + Math.random() * 1.8;
      spark.color = color;
      this.sparks.push(spark);
    }
    while (this.sparks.length > 70) {
      this._sparkPool.push(this.sparks.shift());
    }
  }

  _updateSparks(dt) {
    const live = [];
    for (const spark of this.sparks) {
      spark.age += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.92;
      spark.vy *= 0.92;
      if (spark.age < spark.life) {
        live.push(spark);
      } else if (this._sparkPool.length < 80) {
        this._sparkPool.push(spark);
      }
    }
    this.sparks = live;
  }

  _updateFloating(dt) {
    const live = [];
    for (const item of this.floatingTexts) {
      item.age += dt;
      item.y -= 28 * dt;
      if (item.age < item.life) {
        live.push(item);
      } else if (this._floatPool.length < 32) {
        this._floatPool.push(item);
      }
    }
    this.floatingTexts = live;
  }

  _updateRipples(dt) {
    for (const ripple of this.ripples) {
      ripple.age += dt;
    }
    this.ripples = this.ripples.filter((ripple) => ripple.age < ripple.life);
  }

  _updateToasts(dt) {
    for (const toast of this.toasts) {
      toast.age += dt;
    }
    this.toasts = this.toasts.filter((toast) => toast.age < toast.life);
  }

  _updateRate() {
    const cargo = this.collectors.reduce((n, c) => n + c.cargoValue(), 0);
    let field = 0;
    for (const particle of this.particles) {
      if (!particle.collected) {
        field += particle.value;
      }
    }
    const wealth = this.state.credits + cargo + field;
    const samples = this.wealthSamples;
    samples.push({ t: this.elapsed, w: wealth });
    const cutoff = this.elapsed - 5;
    let start = 0;
    while (start < samples.length && samples[start].t < cutoff) {
      start += 1;
    }
    if (start > 0) {
      samples.splice(0, start);
    }
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const span = Math.max(0.25, last.t - first.t);
      this.creditsPerSec = Math.max(0, (last.w - first.w) / span);
    }
  }

  _seedStars() {
    this.stars = [];
    const count = 36 + this.state.sectorLevel * 8;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.3,
        a: 0.15 + Math.random() * 0.45,
        p: Math.random() * Math.PI * 2,
        layer: Math.random() < 0.35 ? 1 : 0
      });
    }
    this.nebula = [];
    const tint = this.stats.sector?.tint || 'rgba(56, 189, 248, 0.06)';
    for (let i = 0; i < 3; i++) {
      this.nebula.push({
        x: 0.18 + Math.random() * 0.64,
        y: 0.16 + Math.random() * 0.5,
        r: 0.18 + Math.random() * 0.22,
        a: 0.07 + Math.random() * 0.05,
        tint,
        p: Math.random() * Math.PI * 2
      });
    }
    if (this.renderer) {
      this.renderer.invalidate();
    }
  }

  _releaseChip(chip) {
    releaseOre(chip);
  }
}

export function formatCredits(value) {
  const n = Math.floor(value);
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  return n.toLocaleString('en-US');
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}
