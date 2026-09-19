export const TUTORIAL_STEPS = [
  {
    id: 'tap',
    title: 'Shatter a rock',
    body: 'Tap until the rock cracks apart. Ore only drops on the shatter — not on every tap.'
  },
  {
    id: 'haul',
    title: 'Get paid',
    body: 'Chips do nothing in the field. The gold hauler must dump them on the REFINERY pad.'
  },
  {
    id: 'upgrade',
    title: 'Buy a pick',
    body: 'Open Tap and buy Rock Pick. Chip Harvest is later — a chance to leak ore as a rock takes damage.'
  },
  {
    id: 'probe',
    title: 'Spend a probe',
    body: 'Launch Probe is a purchase. Bank a wall — the bird glows gold — then hit. Probe crits are a separate Fleet tree.'
  }
];

export const JOB_DEFS = [
  {
    id: 'taps',
    verb: 'Land taps',
    stat: 'taps',
    amounts: [12, 30, 70, 140, 260],
    reward: (n, sector) => 6 + n * 0.55 * sector
  },
  {
    id: 'breaks',
    verb: 'Crack rocks',
    stat: 'asteroidsBroken',
    amounts: [3, 8, 18, 36, 70],
    reward: (n, sector) => 10 + n * 2.4 * sector
  },
  {
    id: 'deposits',
    verb: 'Unload at the pad',
    stat: 'deposits',
    amounts: [4, 10, 22, 45, 80],
    reward: (n, sector) => 8 + n * 1.8 * sector
  },
  {
    id: 'launches',
    verb: 'Launch probes',
    stat: 'launches',
    amounts: [1, 3, 6, 12, 20],
    reward: (n, sector) => 14 + n * 8 * sector
  },
  {
    id: 'earn',
    verb: 'Bank credits',
    stat: 'lifetimeCredits',
    amounts: [25, 80, 220, 700, 2200],
    reward: (n, sector) => 8 + n * 0.22 * Math.sqrt(sector)
  },
  {
    id: 'combo',
    verb: 'Hit a combo',
    stat: 'maxCombo',
    amounts: [4, 6, 9, 12, 16],
    reward: (n, sector) => 12 + n * 3.5 * sector
  },
  {
    id: 'crits',
    verb: 'Land crits',
    stat: 'crits',
    amounts: [2, 6, 14, 28, 50],
    reward: (n, sector) => 15 + n * 2.2 * sector
  },
  {
    id: 'salvage',
    verb: 'Scrap probes',
    stat: 'probesLost',
    amounts: [1, 3, 7, 14, 24],
    reward: (n, sector) => 16 + n * 6 * sector
  },
  {
    id: 'walls',
    verb: 'Bank a wall',
    stat: 'wallBounces',
    amounts: [4, 12, 28, 60, 110],
    reward: (n, sector) => 12 + n * 1.6 * sector
  },
  {
    id: 'banks',
    verb: 'Land banked hits',
    stat: 'bankHits',
    amounts: [2, 6, 16, 36, 70],
    reward: (n, sector) => 18 + n * 2.8 * sector
  }
];

export const EVENT_DEFS = [
  {
    id: 'gold_rush',
    name: 'Gold rush',
    blurb: 'Ore assays hot. Chip values doubled.',
    duration: 34,
    color: '#f59e0b'
  },
  {
    id: 'meteor',
    name: 'Meteor storm',
    blurb: 'Rocks warp in fast. Belt is crowded.',
    duration: 38,
    color: '#f87171'
  },
  {
    id: 'aftershock',
    name: 'Aftershock',
    blurb: 'Chip Harvest leaks pay almost double (needs the upgrade).',
    duration: 28,
    color: '#38bdf8'
  },
  {
    id: 'dense',
    name: 'Dense belt',
    blurb: 'More asteroids than the claim can legally hold.',
    duration: 32,
    color: '#a855f7'
  },
  {
    id: 'quiet',
    name: 'Quiet sector',
    blurb: 'Fewer rocks, richer cores.',
    duration: 36,
    color: '#22d3ee'
  },
  {
    id: 'tailwind',
    name: 'Ion tailwind',
    blurb: 'Haulers run hot. Return speed up.',
    duration: 30,
    color: '#fbbf24'
  },
  {
    id: 'cushion',
    name: 'Cushion fields',
    blurb: 'Walls go soft. Bank shots hit like a truck.',
    duration: 32,
    color: '#fde68a'
  },
  {
    id: 'deadeye',
    name: 'Deadeye window',
    blurb: 'Probe crits run hot. Pick crits stay their own tree.',
    duration: 28,
    color: '#38bdf8'
  }
];

export const MILESTONES = [
  { id: 'first_tap', name: 'First swing', test: (s) => s.taps >= 1, reward: 6 },
  { id: 'first_pay', name: 'Payroll', test: (s) => s.deposits >= 1, reward: 10 },
  { id: 'first_buy', name: 'Tooling', test: (s) => s.upgradesBought >= 1, reward: 14 },
  { id: 'first_bird', name: 'First bird', test: (s) => s.launches >= 1, reward: 22 },
  { id: 'first_bank', name: 'Banked', test: (s) => s.bankHits >= 1, reward: 28 },
  { id: 'rocks_10', name: 'Surveyor', test: (s) => s.asteroidsBroken >= 10, reward: 30 },
  { id: 'taps_80', name: 'Calloused', test: (s) => s.taps >= 80, reward: 45 },
  { id: 'dump_20', name: 'Pad rat', test: (s) => s.deposits >= 20, reward: 55 },
  { id: 'fleet_8', name: 'Dispatch', test: (s) => s.launches >= 8, reward: 70 },
  { id: 'combo_8', name: 'Rhythm', test: (s) => s.maxCombo >= 8, reward: 40 },
  { id: 'crits_15', name: 'Deadeye', test: (s) => s.crits >= 15, reward: 60 },
  { id: 'bounce_50', name: 'Cushion kid', test: (s) => s.wallBounces >= 50, reward: 70 },
  { id: 'bank_20', name: 'Geometry', test: (s) => s.bankHits >= 20, reward: 90 },
  { id: 'lost_5', name: 'Scrap lord', test: (s) => s.probesLost >= 5, reward: 50 },
  { id: 'life_2k', name: 'Going concern', test: (s) => s.lifetimeCredits >= 2000, reward: 120 },
  { id: 'jobs_6', name: 'Contractor', test: (s) => s.jobsCompleted >= 6, reward: 80 },
  { id: 'rocks_80', name: 'Belt butcher', test: (s) => s.asteroidsBroken >= 80, reward: 160 }
];

export function emptyJobs() {
  return { slots: [], completed: 0, nextEvent: 70 + Math.random() * 40 };
}

export function jobLabel(job) {
  const def = JOB_DEFS.find((item) => item.id === job.defId);
  if (!def) {
    return 'Contract';
  }
  return `${def.verb} · ${job.amount}`;
}

function jobSeed(state, avoid) {
  const pool = JOB_DEFS.filter((def) => !avoid.includes(def.id));
  const def = (pool.length ? pool : JOB_DEFS)[Math.floor(Math.random() * (pool.length || JOB_DEFS.length))];
  const tier = Math.min(
    def.amounts.length - 1,
    Math.max(0, (state.sectorLevel || 1) - 1 + (state.jobs?.completed > 12 ? 1 : 0))
  );
  const amount = def.amounts[tier];
  const reward = Math.max(8, Math.floor(def.reward(amount, state.sectorLevel || 1)));
  return {
    defId: def.id,
    amount,
    reward,
    baseline: Number(state.stats?.[def.stat] || 0),
    claimed: false
  };
}

export function fillJobs(state) {
  if (!state.jobs) {
    state.jobs = emptyJobs();
  }
  const slots = state.jobs.slots.filter(Boolean);
  while (slots.length < 3) {
    const avoid = slots.map((job) => job.defId);
    slots.push(jobSeed(state, avoid));
  }
  state.jobs.slots = slots;
  return state.jobs;
}

export function jobProgress(job, stats) {
  const def = JOB_DEFS.find((item) => item.id === job.defId);
  if (!def) {
    return 0;
  }
  const current = Number(stats[def.stat] || 0);
  return Math.max(0, Math.min(job.amount, current - job.baseline));
}

export function rollEvent() {
  const def = EVENT_DEFS[Math.floor(Math.random() * EVENT_DEFS.length)];
  return {
    id: def.id,
    name: def.name,
    blurb: def.blurb,
    color: def.color,
    ttl: def.duration
  };
}
