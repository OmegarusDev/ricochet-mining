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
  probeDamageBase: 3,
  probeDamageGrowth: 1.22,
  probeSpeedStart: 30,
  probeSpeedPerLevel: 13,
  startLaunchCost: 20,
  launchCostPerSlot: 7,

  surveyStart: 400,
  surveyPerLevel: 80,
  surveyCap: 1480,
  surveyMaxLevel: 14,
  surveyBaseCost: 55,
  surveyScale: 1.42,

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

export function probeSpeed(level) {
  return TUNING.probeSpeedStart + Math.max(0, level) * TUNING.probeSpeedPerLevel;
}

export function probeSlots(level) {
  return Math.min(TUNING.probeCap, 1 + Math.max(0, level));
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
  const raw = TUNING.startLaunchCost + Math.max(0, liveCount) * TUNING.launchCostPerSlot;
  return Math.max(5, Math.floor(raw * (1 - (discount || 0))));
}
