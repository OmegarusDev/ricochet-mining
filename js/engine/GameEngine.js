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
import { spawnOreBurst, spawnSalvageChip, spawnTapChip } from '../entities/OreParticle.js';
import {
  MILESTONES,
  TUTORIAL_STEPS,
  fillJobs,
  jobLabel,
  jobProgress,
  rollEvent
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
    this.toasts = [];
    this.stars = [];
    this.depotPulse = 0;
    this.nextCollectorId = 1;
    this.autoDeployTimer = 1.5;
    this.manualCooldown = 0;
    this.tapCooldown = 0;
    this.asteroidSpawnTimer = 0;
    this.creditEvents = [];
    this.creditsPerSec = 0;
    this.dirty = true;
    this.elapsed = 0;
    this.combo = 0;
    this.comboId = null;
    this.comboTimer = 0;
    this.shake = 0;
    this.event = null;
    this.flash = 0;
    this.hint = !state.flags?.tapped;
    state.stats.wallBounces = state.stats.wallBounces || 0;
    state.stats.bankHits = state.stats.bankHits || 0;
    fillJobs(this.state);
    this.stats = derivedStats(state.upgrades, state.sectorLevel, this.event);
    this.playfield = { width: this.stats.width, height: this.stats.height };
    this._seedStars();
    this._syncCollectors();
    this._fillAsteroids();
    this._checkMilestones(true);
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
    this.playfield = { width: this.stats.width, height: this.stats.height };
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
  }

  resizeCanvas(displayWidth, displayHeight) {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.playfield.width;
    const logicalHeight = this.playfield.height;
    const nextW = Math.max(1, Math.round(logicalWidth * dpr));
    const nextH = Math.max(1, Math.round(logicalHeight * dpr));
    if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
      this.canvas.width = nextW;
      this.canvas.height = nextH;
    }
    const scale = Math.min(displayWidth / logicalWidth, displayHeight / logicalHeight);
    this.canvas.style.width = `${Math.max(1, logicalWidth * scale)}px`;
    this.canvas.style.height = `${Math.max(1, logicalHeight * scale)}px`;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  eventToLogical(event) {
    const rect = this.canvas.getBoundingClientRect();
    const point = event.changedTouches ? event.changedTouches[0] : event;
    return new Vector2D(
      ((point.clientX - rect.left) / rect.width) * this.playfield.width,
      ((point.clientY - rect.top) / rect.height) * this.playfield.height
    );
  }

  update(dt) {
    this.elapsed += dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.depotPulse = Math.max(0, this.depotPulse - dt);
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboId = null;
    }
    let frameTime = Math.min(dt * this.state.settings.gameSpeed, 0.1);
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
    this._updateFloating(dt);
    this._updateRipples(dt);
    this._updateSparks(dt);
    this._updateToasts(dt);
    this._tickEvent(dt);
    this._updateRate();
  }

  updatePhysicsSubStep(dt) {
    this.tapCooldown = Math.max(0, this.tapCooldown - dt);
    this.manualCooldown = Math.max(0, this.manualCooldown - dt);
    this._tickAutoDeploy(dt);
    this._tickAsteroidSpawn(dt);
    this._syncCollectors();
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
    for (const particle of this.particles) {
      particle.isMagnetized = false;
    }
    for (const collector of this.collectors) {
      collector.update(dt, this.playfield, this.particles, depot, this.stats);
    }
    for (const particle of this.particles) {
      particle.update(dt, this.playfield);
    }
    this._collectParticles();
    this._unloadCollectors(depot, dt);
    this.particles = this.particles.filter((particle) => !particle.collected);
  }

  tryTap(point) {
    if (this.tapCooldown > 0) {
      return false;
    }
    const ranked = this.asteroids
      .filter((asteroid) => !asteroid.isDestroyed())
      .map((asteroid) => ({
        asteroid,
        d: point.dist(asteroid.pos) - asteroid.radius * 0.15
      }))
      .sort((a, b) => a.d - b.d);
    const target = ranked[0] && ranked[0].d < this.stats.tapRadius ? ranked[0].asteroid : null;
    if (!target) {
      this.ripples.push({ x: point.x, y: point.y, age: 0, life: 0.28, miss: true });
      return false;
    }

    this.tapCooldown = this.stats.tapInterval;
    this.state.stats.taps += 1;
    this.hint = false;
    this.state.flags.tapped = true;
    if (this.state.flags.tutorialStep === 0) {
      this.state.flags.tutorialStep = 1;
    }
    this.ripples.push({ x: point.x, y: point.y, age: 0, life: 0.35, miss: false });

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
    this._strikeAsteroid(target, damage, point, { tap: true, crit, over });

    if (this.stats.multiHit > 0 && ranked[1] && ranked[1].d < this.stats.tapRadius + 18) {
      const extra = Math.max(1, Math.floor(damage * this.stats.multiHit));
      this._strikeAsteroid(ranked[1].asteroid, extra, ranked[1].asteroid.pos, { tap: true, splash: true });
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

  deployDrone(force = false) {
    if (this.drones.length >= this.stats.maxDrones) {
      return false;
    }
    if (!force && this.manualCooldown > 0) {
      return false;
    }
    const cost = this.stats.launchCost;
    if (this.state.credits < cost) {
      this.sound.playDeny();
      return false;
    }
    this.state.credits -= cost;
    this._spawnProbe();
    if (
      this.stats.extraLaunchChance > 0 &&
      this.drones.length < this.stats.maxDrones &&
      Math.random() < this.stats.extraLaunchChance
    ) {
      const extraCost = Math.max(2, Math.floor(cost * 0.5));
      if (this.state.credits >= extraCost) {
        this.state.credits -= extraCost;
        this._spawnProbe();
        this.pushToast('Twin rails — second probe away');
      }
    }
    this.manualCooldown = this.stats.manualLaunchDelay;
    this.autoDeployTimer = this.stats.autoLaunchEnabled
      ? this.stats.autoDeployInterval
      : this.autoDeployTimer;
    this.state.stats.launches += 1;
    if (this.state.flags.tutorialStep === 3) {
      this.state.flags.tutorialStep = 4;
    }
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
    this.refreshStats();
    if (this.state.flags.tutorialStep === 2) {
      this.state.flags.tutorialStep = 3;
    }
    this.sound.playPurchase();
    this._checkMilestones();
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
    this.drones = [];
    this.asteroids = [];
    this.particles = [];
    this.collectors = [];
    this.floatingTexts = [];
    this.ripples = [];
    this.sparks = [];
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
    this.state.flags.tutorialStep = TUTORIAL_STEPS.length;
    this.markDirty();
  }

  hudSnapshot() {
    const cargoUsed = this.collectors.reduce((n, c) => n + c.used, 0);
    const cargoMax = this.collectors.reduce((n, c) => n + c.capacity, 0);
    const cargoValue = this.collectors.reduce((n, c) => n + c.cargoValue(), 0);
    fillJobs(this.state);
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
      launchCost: this.stats.launchCost,
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
      event: this.event && this.event.ttl > 0 ? this.event : null,
      tutorialStep: this.state.flags.tutorialStep,
      tutorial: TUTORIAL_STEPS[this.state.flags.tutorialStep] || null,
      toasts: this.toasts,
      banked: this.drones.some((drone) => drone.bankT > 0)
    };
  }

  draw() {
    const ctx = this.ctx;
    const { width: W, height: H } = this.playfield;
    ctx.save();
    if (this.shake > 0 && !this.state.settings.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
    ctx.clearRect(-8, -8, W + 16, H + 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    this._drawStars(ctx, W, H);
    this._drawSectorTint(ctx, W, H);
    this._drawGrid(ctx, W, H);
    this._drawDepot(ctx);
    this._drawRipples(ctx);
    this._drawSparks(ctx);

    for (const particle of this.particles) {
      particle.draw(ctx);
    }
    for (const collector of this.collectors) {
      collector.draw(ctx);
    }
    for (const drone of this.drones) {
      drone.draw(ctx);
    }
    for (const asteroid of this.asteroids) {
      asteroid.draw(ctx);
    }
    this._drawFloating(ctx);
    if (this.combo >= 2) {
      ctx.fillStyle = '#fde047';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO ×${this.combo}`, 10, 18);
    }
    if (this.drones.some((drone) => drone.bankT > 0)) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('BANKED', W - 10, 18);
    }
    if (this.hint) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAP UNTIL THE ROCK SHATTERS', W / 2, 28);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(251, 191, 36, ${0.18 * (this.flash / 0.25)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  _spawnProbe() {
    this.drones.push(launchMiningDrone(this.stats, this.playfield));
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
      this.particles.push(spawnTapChip(origin, asteroid, chipValue));
    }
    if (this.stats.luckyChip > 0 && Math.random() < this.stats.luckyChip) {
      this.particles.push(spawnTapChip(origin, asteroid, chipValue * 0.85));
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
        label = `${damage} BANK CRIT`;
        color = '#fde68a';
      } else if (meta.crit) {
        label = `${damage} CRIT`;
        color = '#fde047';
      } else if (meta.bank) {
        label = `${damage} BANK`;
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
      const burst = spawnOreBurst(
        asteroid,
        n,
        this.stats.oreValueMult,
        this.stats.sectorMult,
        this.stats.richVeins
      );
      this.particles.push(...burst);
      this.state.stats.asteroidsBroken += 1;
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
          this.sound.playProbeCrit();
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
    if (this.autoDeployTimer <= 0 && this.state.credits >= this.stats.launchCost) {
      this.deployDrone(true);
      this.autoDeployTimer = this.stats.autoDeployInterval;
    }
  }

  _tickAsteroidSpawn(dt) {
    if (this.asteroids.length >= this.stats.maxAsteroids) {
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
      this.stats.sectorMult,
      this.asteroids,
      this.stats.rareShift,
      this.stats.driftSpeed
    );
  }

  _fillAsteroids() {
    while (this.asteroids.length < this.stats.maxAsteroids) {
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
    drone.bankT = 0.5;
    drone.bounces += 1;
    this.state.stats.wallBounces += 1;
    this._spawnSparks(sparkX, sparkY, drone.bankT > 0 ? '#fbbf24' : '#7dd3fc', 8);
    this.sound.playBounce();
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
        const delta = Vector2D.sub(drone.pos, asteroid.pos);
        const dist = delta.mag();
        const radiusSum = drone.radius + asteroid.radius;
        if (dist > radiusSum) {
          continue;
        }
        const normal = dist === 0 ? new Vector2D(1, 0) : delta.normalize();
        drone.pos.x = asteroid.pos.x + normal.x * (radiusSum + 0.2);
        drone.pos.y = asteroid.pos.y + normal.y * (radiusSum + 0.2);
        drone.vel.reflect(normal);
        const recoil = Math.max(1, Math.round(drone.maxHp * this.stats.recoilFrac));
        drone.hp -= recoil;
        const impact = Vector2D.add(asteroid.pos, normal.copy().mult(asteroid.radius));
        let damage = drone.damage;
        const banked = drone.bankT > 0;
        if (banked && this.stats.bankShot > 0) {
          damage *= 1 + this.stats.bankShot;
        }
        let crit = false;
        if (Math.random() < this.stats.probeCrit) {
          damage *= this.stats.probeCritMult;
          crit = true;
          this.state.stats.crits += 1;
        }
        if (banked) {
          this.state.stats.bankHits += 1;
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
      const rebate = this.stats.launchCost * this.stats.scrapRebate;
      if (rebate > 0) {
        this.state.credits += rebate;
        this.state.stats.lifetimeCredits += rebate;
        this._spawnFloat(drone.pos.x, drone.pos.y, `+$${formatCredits(rebate)}`, '#7dd3fc');
      }
      this.particles.push(
        spawnSalvageChip(
          drone.pos,
          Math.max(0.4, this.stats.launchCost * 0.08 * this.stats.oreValueMult)
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
      while (collector.unloadAcc >= 1 && collector.used > 0) {
        collector.unloadAcc -= 1;
        const chip = collector.cargo.shift();
        if (!chip) {
          break;
        }
        gained += chip.value;
      }
      if (gained > 0) {
        this.state.credits += gained;
        this.state.totalOreHarvested += gained;
        this.state.stats.lifetimeCredits += gained;
        this.state.stats.deposits += 1;
        this.creditEvents.push({ t: this.elapsed, amount: gained });
        this._spawnFloat(depot.x, depot.y - 18, `+$${formatCredits(gained)}`, '#f59e0b');
        this.depotPulse = 0.45;
        this.sound.playUnload();
        if (this.state.flags.tutorialStep === 1) {
          this.state.flags.tutorialStep = 2;
        }
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
        this.event = rollEvent();
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

  _spawnFloat(x, y, text, color, life = 0.8) {
    this.floatingTexts.push({ x, y, text, color, age: 0, life });
    if (this.floatingTexts.length > 28) {
      this.floatingTexts.splice(0, this.floatingTexts.length - 28);
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
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        age: 0,
        life: 0.18 + Math.random() * 0.22,
        r: 1.1 + Math.random() * 1.8,
        color
      });
    }
    if (this.sparks.length > 70) {
      this.sparks.splice(0, this.sparks.length - 70);
    }
  }

  _updateSparks(dt) {
    for (const spark of this.sparks) {
      spark.age += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.92;
      spark.vy *= 0.92;
    }
    this.sparks = this.sparks.filter((spark) => spark.age < spark.life);
  }

  _updateFloating(dt) {
    for (const item of this.floatingTexts) {
      item.age += dt;
      item.y -= 28 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter((item) => item.age < item.life);
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
    const cutoff = this.elapsed - 5;
    this.creditEvents = this.creditEvents.filter((event) => event.t >= cutoff);
    const sum = this.creditEvents.reduce((acc, event) => acc + event.amount, 0);
    this.creditsPerSec = sum / 5;
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
        p: Math.random() * Math.PI * 2
      });
    }
  }

  _drawStars(ctx, width, height) {
    for (const star of this.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(this.elapsed * 2.1 + star.p);
      ctx.fillStyle = `rgba(186, 230, 253, ${star.a * twinkle})`;
      ctx.fillRect(star.x * width, star.y * height, star.r, star.r);
    }
  }

  _drawSectorTint(ctx, width, height) {
    const tint = this.stats.sector?.tint;
    if (!tint) {
      return;
    }
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);
  }

  _drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      for (let x = 0; x <= width; x += 40) {
        ctx.fillRect(x - 0.5, y - 0.5, 1.5, 1.5);
      }
    }
  }

  _drawDepot(ctx) {
    const depot = this.depot();
    const pulse = this.depotPulse > 0 ? this.depotPulse / 0.45 : 0;
    ctx.fillStyle = `rgba(56, 189, 248, ${0.1 + pulse * 0.22})`;
    ctx.beginPath();
    ctx.arc(depot.x, depot.y, depot.r + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(depot.x, 12);
    ctx.lineTo(depot.x, depot.y - depot.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(depot.x - depot.w / 2, depot.y - depot.h / 2, depot.w, depot.h);
    ctx.strokeStyle = pulse > 0 ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 1.6 + pulse * 1.4;
    ctx.strokeRect(depot.x - depot.w / 2, depot.y - depot.h / 2, depot.w, depot.h);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(depot.x - depot.w / 2 + 8, depot.y - 3, depot.w - 16, 4);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REFINERY', depot.x, depot.y - depot.h / 2 - 6);
  }

  _drawSparks(ctx) {
    for (const spark of this.sparks) {
      const t = 1 - spark.age / spark.life;
      ctx.beginPath();
      ctx.fillStyle = spark.color;
      ctx.globalAlpha = Math.max(0, t);
      ctx.arc(spark.x, spark.y, spark.r * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawRipples(ctx) {
    for (const ripple of this.ripples) {
      const t = ripple.age / ripple.life;
      ctx.beginPath();
      ctx.strokeStyle = ripple.miss
        ? `rgba(148, 163, 184, ${0.4 * (1 - t)})`
        : `rgba(56, 189, 248, ${0.7 * (1 - t)})`;
      ctx.lineWidth = 2;
      ctx.arc(ripple.x, ripple.y, 8 + t * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawFloating(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px system-ui, sans-serif';
    for (const item of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, 1 - item.age / item.life);
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.globalAlpha = 1;
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
