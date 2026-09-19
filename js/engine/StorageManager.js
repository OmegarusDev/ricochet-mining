import { derivedStats, zeroUpgrades } from '../ui/Upgrades.js';
import { emptyJobs, fillJobs } from '../content/Campaign.js';

export const SAVE_KEY = 'RICOCHET_MINING_SAVE_V4';
export const LEGACY_KEYS = ['RICOCHET_MINING_SAVE_V3', 'RICOCHET_MINING_SAVE_V2'];

export function defaultState() {
  return {
    version: 4,
    lastSaved: Date.now(),
    credits: 0,
    totalOreHarvested: 0,
    sectorLevel: 1,
    upgrades: zeroUpgrades(),
    settings: {
      sfxVolume: 0.7,
      gameSpeed: 1,
      haptics: true,
      damageNumbers: true,
      reducedMotion: false
    },
    stats: {
      taps: 0,
      launches: 0,
      deposits: 0,
      asteroidsBroken: 0,
      lifetimeCredits: 0,
      crits: 0,
      probesLost: 0,
      wallBounces: 0,
      bankHits: 0,
      maxCombo: 0,
      upgradesBought: 0,
      jobsCompleted: 0
    },
    flags: {
      tapped: false,
      tutorialStep: 0
    },
    jobs: emptyJobs(),
    milestones: []
  };
}

function mergeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const merged = {
    version: 4,
    lastSaved: typeof raw.lastSaved === 'number' ? raw.lastSaved : base.lastSaved,
    credits: Number.isFinite(raw.credits) ? raw.credits : 0,
    totalOreHarvested: Number.isFinite(raw.totalOreHarvested) ? raw.totalOreHarvested : 0,
    sectorLevel: Number.isFinite(raw.sectorLevel) ? raw.sectorLevel : 1,
    upgrades: { ...base.upgrades, ...(raw.upgrades || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
    stats: { ...base.stats, ...(raw.stats || {}) },
    flags: { ...base.flags, ...(raw.flags || {}) },
    jobs: raw.jobs && Array.isArray(raw.jobs.slots) ? raw.jobs : emptyJobs(),
    milestones: Array.isArray(raw.milestones) ? raw.milestones : []
  };
  fillJobs(merged);
  return merged;
}

export function applyOfflineGains(state) {
  const elapsed = (Date.now() - state.lastSaved) / 1000;
  if (elapsed <= 10) {
    return null;
  }
  const dtSim = Math.min(elapsed, 28800);
  const stats = derivedStats(state.upgrades, state.sectorLevel);
  const breakPart = (1 / stats.tapInterval) * (stats.tapDamage / 90) * 0.28;
  const flakePart =
    stats.chipLeakChance > 0
      ? (1 / stats.tapInterval) * stats.chipLeakChance * 0.22 * stats.tapChipCount * stats.tapChipMult
      : 0;
  const tapPart = breakPart + flakePart;
  const dronePart = stats.autoLaunchEnabled
    ? (1 / stats.autoDeployInterval) * (stats.droneDamage / 60)
    : 0;
  const estimatedGains =
    dtSim * (tapPart + dronePart) * stats.sectorMult * stats.oreValueMult * stats.offlineEff;
  state.credits += estimatedGains;
  state.totalOreHarvested += estimatedGains;
  state.stats.lifetimeCredits += estimatedGains;
  return {
    durationSec: elapsed,
    simSec: dtSim,
    gains: estimatedGains
  };
}

function readRaw() {
  try {
    const fresh = localStorage.getItem(SAVE_KEY);
    if (fresh) {
      return JSON.parse(fresh);
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        return JSON.parse(legacy);
      }
    }
  } catch (err) {
    console.warn('Failed to read save.', err);
  }
  return null;
}

export const StorageManager = {
  locked: false,

  load() {
    let state = mergeState(readRaw());
    const offline = applyOfflineGains(state);
    return { state, offline };
  },

  save(state) {
    if (this.locked) {
      return;
    }
    const payload = {
      version: 4,
      lastSaved: Date.now(),
      credits: state.credits,
      totalOreHarvested: state.totalOreHarvested,
      sectorLevel: state.sectorLevel,
      upgrades: { ...state.upgrades },
      settings: { ...state.settings },
      stats: { ...state.stats },
      flags: { ...state.flags },
      jobs: {
        slots: (state.jobs?.slots || []).map((job) => ({ ...job })),
        completed: state.jobs?.completed || 0,
        nextEvent: state.jobs?.nextEvent || 90
      },
      milestones: [...(state.milestones || [])]
    };
    state.lastSaved = payload.lastSaved;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist save.', err);
    }
  },

  exportPayload(state) {
    this.save(state);
    return localStorage.getItem(SAVE_KEY) || '{}';
  },

  importPayload(text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid save');
    }
    const state = mergeState(raw);
    this.locked = false;
    this.save(state);
    return state;
  },

  clear() {
    this.locked = true;
    try {
      localStorage.removeItem(SAVE_KEY);
      for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn('Failed to clear save.', err);
    }
  }
};
