/**
 * Single knobboard for Ricochet Mining Co.
 *
 * Game code and balance.html both read these live. Change a number here,
 * reload, and the sim tells you what hour 1 / hour 40 / hour 200 feel like
 * without playing. balance.html can also patch this object in memory.
 */
export const TUNING = {
  fieldCap: 25,
  startRocks: 1,
  densityBaseCost: 24,
  densityScale: 1.48,

  spawnStart: 5.8,
  spawnFloor: 0.28,
  spawnPerLevel: 0.22,
  spawnBaseCost: 32,
  spawnScale: 1.34,
  spawnMaxLevel: 26,

  hpIncomeExponent: 0.52,

  tapDamageBase: 5,
  tapDamageGrowth: 1.2,
  tapIntervalStart: 2,
  tapIntervalFloor: 0.14,
  tapIntervalPerLevel: 0.058,

  probeCap: 20,
  probeDamageBase: 5,
  probeDamageGrowth: 1.22,
  probeHullBase: 20,
  probeHullGrowth: 1.05,
  /** Rock punch vs common HP. Later types hit harder; HP still scales faster so sponges stay sponges. */
  rockBiteHpExponent: 0.35,
  /** Extra punch from sector income. Keep below hpIncomeExponent so hull + Softer Wear outrun later belts. */
  rockBiteSectorExponent: 0.1,
  probeSpeedStart: 30,
  probeSpeedPerLevel: 13,
  startLaunchCost: 10,
  launchCostGrowth: 1,

  surveyStart: 400,
  surveyPerLevel: 80,
  surveyCap: 1480,
  surveyMaxLevel: 14,
  surveyBaseCost: 2200,
  surveyScale: 1.68,

  haulerSpeedStart: 14,
  haulerSpeedPerLevel: 11,

  particleCap: 96,
  hitSoundGap: 0.07,
  breakSoundGap: 0.11
};

export function fieldRocks(level) {
  return Math.min(TUNING.fieldCap, TUNING.startRocks + Math.max(0, level));
}

export function spawnDelay(level) {
  return Math.max(TUNING.spawnFloor, TUNING.spawnStart - Math.max(0, level) * TUNING.spawnPerLevel);
}

export function hpMult(incomeMult) {
  return Math.pow(Math.max(1, incomeMult), TUNING.hpIncomeExponent);
}

export function tapDamage(level) {
  return Math.floor(TUNING.tapDamageBase * Math.pow(TUNING.tapDamageGrowth, Math.max(0, level)));
}

export function tapInterval(level) {
  return Math.max(
    TUNING.tapIntervalFloor,
    TUNING.tapIntervalStart - Math.max(0, level) * TUNING.tapIntervalPerLevel
  );
}

export function probeDamage(level) {
  return Math.floor(TUNING.probeDamageBase * Math.pow(TUNING.probeDamageGrowth, Math.max(0, level)));
}

export function probeHull(level) {
  return Math.round(TUNING.probeHullBase * Math.pow(TUNING.probeHullGrowth, Math.max(0, level)));
}

/** How hard a rock hits a drill. Independent of drill damage. */
export function rockBite(baseHp, incomeMult = 1) {
  const hp = Math.max(1, baseHp);
  const fromHp = Math.pow(hp / TUNING.probeHullBase, TUNING.rockBiteHpExponent);
  const fromSector = Math.pow(Math.max(1, incomeMult), TUNING.rockBiteSectorExponent);
  return Math.max(1, Math.round(TUNING.probeDamageBase * fromHp * fromSector));
}

export function ramTaken(bite, recoilFrac) {
  const frac = Number.isFinite(recoilFrac) ? recoilFrac : 1;
  return Math.max(1, Math.floor(Math.max(1, bite) * frac));
}

export function probeSpeed(level) {
  return TUNING.probeSpeedStart + Math.max(0, level) * TUNING.probeSpeedPerLevel;
}

export function probeSlots(level) {
  return Math.min(TUNING.probeCap, Math.max(0, level));
}

export function haulerSpeed(level) {
  return TUNING.haulerSpeedStart + Math.max(0, level) * TUNING.haulerSpeedPerLevel;
}

export function fieldSize(level) {
  return Math.min(
    TUNING.surveyCap,
    TUNING.surveyStart + Math.max(0, level) * TUNING.surveyPerLevel
  );
}

export function launchFee(liveCount, discount) {
  const n = Math.max(0, liveCount);
  const raw = TUNING.startLaunchCost * Math.pow(1 + TUNING.launchCostGrowth, n);
  return Math.max(1, Math.floor(raw * (1 - (discount || 0))));
}
