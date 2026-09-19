import {
  ASTEROID_TIERS,
  SECTORS,
  UPGRADE_BY_ID,
  UPGRADE_DEFS,
  derivedStats,
  getSector,
  isUnlocked,
  sectorUnlockNeed,
  upgradeCost,
  zeroUpgrades,
  applyTuningToUpgrades
} from '../ui/Upgrades.js';
import { TUNING, hpMult } from './Tuning.js';

export function geometricSum(base, scale, levels) {
  if (levels <= 0) {
    return 0;
  }
  if (Math.abs(scale - 1) < 1e-9) {
    return base * levels;
  }
  return base * (Math.pow(scale, levels) - 1) / (scale - 1);
}

export function costToMax(def, fromLevel = 0) {
  const left = Math.max(0, def.maxLevel - fromLevel);
  return Math.floor(geometricSum(upgradeCost(def, fromLevel), def.scale, left));
}

export function beltMean(sectorLevel, rareBias = 0) {
  const sector = getSector(sectorLevel);
  const hpScale = hpMult(sector.incomeMult);
  const weights = sector.tiers.map((entry, index) => {
    const lateBoost = index / Math.max(1, sector.tiers.length - 1);
    return Math.max(0.02, entry.weight + rareBias * lateBoost);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let hp = 0;
  let value = 0;
  let yieldCount = 0;
  let radius = 0;
  for (let i = 0; i < sector.tiers.length; i++) {
    const w = weights[i] / sum;
    const tier = ASTEROID_TIERS[sector.tiers[i].id];
    hp += w * tier.baseHp * hpScale;
    value += w * tier.unitValue * sector.incomeMult;
    yieldCount += w * tier.yield;
    radius += w * tier.radius;
  }
  return { hp, value, yieldCount, radius, hpScale, incomeMult: sector.incomeMult };
}

function critExpect(chance, mult) {
  return 1 + Math.max(0, chance) * Math.max(0, mult - 1);
}

export function snapshot(upgrades, sectorLevel, event = null, opts = {}) {
  const tapping = opts.tapping !== false;
  const d = derivedStats(upgrades, sectorLevel, event);
  const belt = beltMean(sectorLevel, d.rareShift);
  const combo = 1 + 2.2 * d.tapCombo;
  const tapHit = d.tapDamage * d.tapSoften * combo * critExpect(d.tapCrit, 2.6);
  const tapDps = tapping ? tapHit / Math.max(0.05, d.tapInterval) : 0;
  const probeCount = opts.probes != null ? opts.probes : d.autoLaunchEnabled ? d.maxDrones : tapping ? 1 : 0;
  const path = Math.max(220, 0.62 * Math.hypot(d.width, d.height));
  const hitsPerProbe = d.droneSpeed / path;
  const bankUptime = 0.22 + Math.min(0.35, d.bankShot * 0.25);
  const probeHit =
    d.droneDamage *
    (1 + d.bankShot * bankUptime) *
    critExpect(d.probeCrit, d.probeCritMult);
  const tapCover = Math.min(1, 0.62 + 0.38 * Math.min(1, d.maxAsteroids / 4));
  const probeCover = 1 - Math.exp(-d.maxAsteroids / 7);
  const tapDpsEff = tapDps * tapCover;
  const probeDps = probeCount * hitsPerProbe * probeHit * probeCover;
  const fieldDps = tapDpsEff + probeDps;
  const killRate = belt.hp > 0 ? fieldDps / belt.hp : 0;
  const spawnRate = 1 / Math.max(0.16, d.asteroidSpawnDelay);
  const fill = killRate <= 0 ? 1 : Math.min(1, spawnRate / Math.max(killRate, 1e-6));
  const rocks = Math.max(1, Math.round(d.maxAsteroids * (killRate > spawnRate ? fill : 1)));
  const ttk = fieldDps > 0 ? (belt.hp * Math.max(1, rocks)) / fieldDps : Infinity;
  const chips = belt.yieldCount * d.richVeins;
  const chipValue = belt.value * d.oreValueMult;
  const leakHits = tapping ? 1 / Math.max(0.05, d.tapInterval) : 0;
  const leakOre =
    d.chipLeakChance > 0
      ? leakHits * d.chipLeakChance * d.tapChipCount * d.tapChipMult * chipValue
      : 0;
  const shatterOre = Math.min(killRate, spawnRate) * chips * chipValue;
  const meanDist = 0.38 * Math.hypot(d.width, d.height);
  const roundTrip =
    (2 * meanDist) / Math.max(8, d.collectorSpeed * (d.returnBoost || 1)) +
    d.cargoCapacity / Math.max(1, d.unloadPerSec);
  const haulTrips = d.maxCollectors / Math.max(0.4, roundTrip);
  const haulCap = haulTrips * d.cargoCapacity * chipValue;
  const mined = shatterOre + leakOre;
  const orePerSec = Math.min(mined, haulCap);
  let bottleneck = 'shatter';
  if (haulCap < mined * 0.97) {
    bottleneck = 'haul';
  } else if (spawnRate + 1e-6 < killRate) {
    bottleneck = 'spawn';
  }
  const launchTax = d.autoLaunchEnabled
    ? (d.maxDrones / Math.max(0.5, d.autoDeployInterval)) * d.launchCost * 0.15
    : 0;
  return {
    stats: d,
    belt,
    tapDps,
    probeDps,
    fieldDps,
    killRate,
    spawnRate,
    fill,
    rocks,
    ttk,
    mined,
    haulCap,
    orePerSec: Math.max(0, orePerSec - launchTax * 0),
    bottleneck,
    probeCount,
    launchCost: d.launchCost,
    maxAsteroids: d.maxAsteroids,
    spawnDelay: d.asteroidSpawnDelay,
    tapInterval: d.tapInterval,
    tradesUntilDeath: d.droneDamage > 0 ? d.droneMaxHp / Math.max(1, d.droneDamage * (d.recoilFrac || 1)) : Infinity
  };
}

function cloneUpgrades(upgrades) {
  return { ...upgrades };
}

function bestBuy(upgrades, sectorLevel, credits, tapping) {
  const now = snapshot(upgrades, sectorLevel, null, { tapping });
  let best = null;
  for (const def of UPGRADE_DEFS) {
    const level = upgrades[def.id] || 0;
    if (level >= def.maxLevel || !isUnlocked(def, upgrades)) {
      continue;
    }
    if (def.id === 'asteroid_max' && def.effect(level) >= TUNING.fieldCap) {
      continue;
    }
    const cost = upgradeCost(def, level);
    const next = cloneUpgrades(upgrades);
    next[def.id] = level + 1;
    const then = snapshot(next, sectorLevel, null, { tapping });
    const delta = then.orePerSec - now.orePerSec;
    const wait = cost / Math.max(now.orePerSec, 0.08);
    let score = delta <= 0 ? 0 : delta / cost;
    if (def.id === 'asteroid_max' && now.maxAsteroids < TUNING.fieldCap) {
      score = Math.max(score, ((TUNING.fieldCap - now.maxAsteroids) * 0.018) / cost);
    }
    if (def.id === 'asteroid_spawn_rate' && now.spawnDelay > TUNING.spawnFloor + 0.02) {
      const hunger = now.bottleneck === 'spawn' || now.bottleneck === 'shatter' ? 0.05 : 0.02;
      score = Math.max(score, hunger / cost);
    }
    if (!best || score > best.score) {
      best = { def, cost, delta, wait, score, then };
    }
  }
  return best;
}

export function simulateGreedy({
  hours = 50,
  tapping = true,
  expand = true,
  startCredits = 0
} = {}) {
  applyTuningToUpgrades();
  const upgrades = zeroUpgrades();
  let sectorLevel = 1;
  let credits = startCredits;
  let harvested = 0;
  let t = 0;
  const end = hours * 3600;
  const marks = [60, 300, 900, 3600, 4 * 3600, 12 * 3600, 24 * 3600, 48 * 3600, 100 * 3600, 200 * 3600];
  const log = [];
  const stamp = (label) => {
    const snap = snapshot(upgrades, sectorLevel, null, { tapping });
    log.push({
      label,
      t,
      hours: t / 3600,
      sector: sectorLevel,
      credits,
      harvested,
      orePerSec: snap.orePerSec,
      bottleneck: snap.bottleneck,
      rocks: snap.maxAsteroids,
      spawn: snap.spawnDelay,
      tapInterval: snap.tapInterval,
      ttk: snap.ttk,
      fill: snap.fill,
      probes: snap.stats.maxDrones,
      auto: snap.stats.autoLaunchEnabled,
      haulCap: snap.haulCap,
      mined: snap.mined
    });
  };
  stamp('t=0');
  let guard = 0;
  while (t < end && guard < 8000) {
    guard += 1;
    const snap = snapshot(upgrades, sectorLevel, null, { tapping });
    const rate = Math.max(0.05, snap.orePerSec);
    const buy = bestBuy(upgrades, sectorLevel, credits, tapping);
    const next = SECTORS.find((sector) => sector.level === sectorLevel + 1) || null;
    const need = next ? sectorUnlockNeed(next, snap.stats) : Infinity;
    const idle = !buy || buy.score <= 0;
    const expandReady =
      expand &&
      next &&
      next.level <= 8 &&
      harvested >= need &&
      snap.maxAsteroids >= 5 &&
      (idle || snap.maxAsteroids >= 8);
    const timeBuy = buy && buy.score > 0 ? Math.max(0, (buy.cost - credits) / rate) : Infinity;
    const dt = Math.min(end - t, idle ? 45 : timeBuy + 0.05);
    credits += rate * dt;
    harvested += rate * dt;
    t += dt;
    if (expandReady && t <= end) {
      const keep = Math.floor(credits * snap.stats.salvageKeep);
      credits = keep + snap.stats.stipend;
      sectorLevel += 1;
      const kept = zeroUpgrades({ keepPermanent: true, current: upgrades });
      Object.assign(upgrades, kept);
      stamp(`expand S${sectorLevel}`);
      continue;
    }
    if (buy && buy.score > 0 && credits >= buy.cost - 1e-6) {
      credits -= buy.cost;
      upgrades[buy.def.id] = (upgrades[buy.def.id] || 0) + 1;
    }
    while (marks.length && t >= marks[0]) {
      const m = marks.shift();
      stamp(m >= 3600 ? `${m / 3600}h` : `${m / 60}m`);
    }
  }
  if (!log.some((row) => Math.abs(row.t - end) < 1)) {
    t = end;
    stamp(`${hours}h`);
  }
  return { log, upgrades, sectorLevel, credits, harvested };
}

export function catalogCosts() {
  applyTuningToUpgrades();
  const rows = UPGRADE_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    tab: def.tab,
    max: def.maxLevel,
    toMax: costToMax(def, 0)
  }));
  const byTab = {};
  for (const row of rows) {
    byTab[row.tab] = (byTab[row.tab] || 0) + row.toMax;
  }
  return { rows, byTab };
}

export function hoursToDensity(targetRocks, tapping = true) {
  const sim = simulateGreedy({ hours: 200, tapping, expand: false });
  const hit = sim.log.find((row) => row.rocks >= targetRocks);
  return hit ? hit.hours : null;
}

export { SECTORS, TUNING };
