export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Ricochet Mining Co.',
    body: 'Welcome to Ricochet Mining Co. You have been contracted to mine asteroids in this sector of space. Shatter rock, haul chips to the REFINERY pad, and spend the take on better kit. HQ posts your work as contracts.',
    next: true
  },
  {
    id: 'jobs',
    title: 'Open Jobs',
    body: 'Start by opening Jobs on the top bar. That is where HQ pays you.',
    next: false
  },
  {
    id: 'good',
    title: 'Good.',
    body: 'Finish a contract, then Claim pay. Your first job is already on the board.',
    next: true
  }
];

export const TUTORIAL_JOBS = [
  {
    id: 'tut_laser',
    verb: 'Test your laser',
    stat: 'taps',
    amounts: [1],
    reward: () => 8,
    blurb: 'Tap a rock. A red bolt fires from the pad.'
  },
  {
    id: 'tut_break',
    verb: 'Destroy an asteroid',
    stat: 'asteroidsBroken',
    amounts: [1],
    reward: () => 12,
    blurb: 'Keep firing until it splits. Ore drops on the shatter.'
  },
  {
    id: 'tut_upgrade',
    verb: 'Buy an upgrade',
    stat: 'upgradesBought',
    amounts: [1],
    reward: () => 10,
    blurb: 'Open Upgrades or tap buy cheapest on the peek bar.'
  },
  {
    id: 'tut_license',
    verb: 'Buy a drill license',
    stat: 'drillLicenses',
    amounts: [1],
    reward: () => 16,
    blurb: 'Drills tab: Drill License. That is your first launch slot.'
  },
  {
    id: 'tut_launch',
    verb: 'Launch a drill',
    stat: 'launches',
    amounts: [1],
    reward: () => 12,
    blurb: 'Buy Drill on the peek bar. Rocks trade hull. Walls do not.'
  },
  {
    id: 'tut_wall',
    verb: 'Bounce a wall',
    stat: 'wallBounces',
    amounts: [1],
    reward: () => 10,
    blurb: 'Let the drill hit a claim wall. Walls bounce free. Rocks are what cost hull.',
    fromNow: true
  },
  {
    id: 'tut_dump',
    verb: 'Unload at the pad',
    stat: 'deposits',
    amounts: [1],
    reward: () => 14,
    blurb: 'Gold haulers dump chips at REFINERY. Claim this when a load lands.'
  },
  {
    id: 'tut_mine5',
    verb: 'Mine asteroids',
    stat: 'asteroidsBroken',
    amounts: [5],
    reward: () => 20,
    blurb: 'Five more rocks. Laser or drill, HQ does not care.',
    fromNow: true
  },
  {
    id: 'tut_license2',
    verb: 'Buy a second license',
    stat: 'drillLicenses',
    amounts: [2],
    reward: () => 18,
    blurb: 'One more Drill License. You cannot field two birds on a single slot.'
  },
  {
    id: 'tut_pair',
    verb: 'Field two drills',
    stat: 'maxLiveDrones',
    amounts: [2],
    reward: () => 22,
    blurb: 'Launch a second drill while the first is still alive. The next launch costs 20% more.'
  }
];

export const JOB_DEFS = [
  {
    id: 'taps',
    verb: 'Fire lasers',
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
    verb: 'Launch drills',
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
    verb: 'Scrap drills',
    stat: 'probesLost',
    amounts: [1, 3, 7, 14, 24],
    reward: (n, sector) => 16 + n * 6 * sector
  },
  {
    id: 'walls',
    verb: 'Bounce a wall',
    stat: 'wallBounces',
    amounts: [4, 12, 28, 60, 110],
    reward: (n, sector) => 12 + n * 1.6 * sector
  },
  {
    id: 'banks',
    verb: 'Land rebounds',
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
    blurb: 'Rocks drift in faster. Cap stays 25.',
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
    blurb: 'Walls go soft. Rebound hits land harder.',
    duration: 32,
    color: '#fde68a'
  },
  {
    id: 'deadeye',
    name: 'Deadeye window',
    blurb: 'Drill crits run hot. Laser crits stay their own tree.',
    duration: 28,
    color: '#38bdf8'
  }
];

export const MILESTONES = [
  { id: 'first_pay', name: 'Payroll', test: (s) => s.deposits >= 1, reward: 10 },
  { id: 'first_buy', name: 'Tooling', test: (s) => s.upgradesBought >= 1, reward: 14 },
  { id: 'first_bird', name: 'First bird', test: (s) => s.launches >= 1, reward: 22 },
  { id: 'first_bank', name: 'Rebound', test: (s) => s.bankHits >= 1, reward: 28 },
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
  return { slots: [], completed: 0, nextEvent: 70 + Math.random() * 40, tutorialIndex: 0 };
}

export function allJobDefs() {
  return [...TUTORIAL_JOBS, ...JOB_DEFS];
}

export function jobById(id) {
  return allJobDefs().find((item) => item.id === id) || null;
}

export function jobLabel(job) {
  const def = jobById(job.defId);
  if (!def) {
    return 'Contract';
  }
  return `${def.verb} · ${job.amount}`;
}

export function onboardingComplete(state) {
  return (
    (state.flags?.tutorialStep || 0) >= TUTORIAL_STEPS.length &&
    (state.jobs?.tutorialIndex || 0) >= TUTORIAL_JOBS.length
  );
}

export function skipOnboarding(state) {
  state.flags.tutorialStep = TUTORIAL_STEPS.length;
  if (!state.jobs) {
    state.jobs = emptyJobs();
  }
  state.jobs.tutorialIndex = TUTORIAL_JOBS.length;
}

function jobSeed(state, avoid) {
  const rebound = (state.upgrades?.bank_shot || 0) > 0;
  const pool = JOB_DEFS.filter((def) => !avoid.includes(def.id) && (rebound || def.id !== 'banks'));
  const source = pool.length
    ? pool
    : JOB_DEFS.filter((item) => rebound || item.id !== 'banks');
  const def = source[Math.floor(Math.random() * source.length)];
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
    baseline: Number(state.stats?.[def.stat] || 0)
  };
}

function tutorialJobSeed(state, def) {
  const amount = def.amounts[0];
  const baseline = def.fromNow ? Number(state.stats?.[def.stat] || 0) : 0;
  return {
    defId: def.id,
    amount,
    reward: Math.max(6, Math.floor(def.reward(amount, state.sectorLevel || 1))),
    baseline,
    tutorial: true,
    blurb: def.blurb || ''
  };
}

export function fillJobs(state) {
  if (!state.jobs) {
    state.jobs = emptyJobs();
  }
  if (typeof state.jobs.tutorialIndex !== 'number') {
    state.jobs.tutorialIndex = 0;
  }
  const idx = state.jobs.tutorialIndex;
  if (idx < TUTORIAL_JOBS.length) {
    const def = TUTORIAL_JOBS[idx];
    const current = state.jobs.slots[0];
    if (!current || current.defId !== def.id) {
      state.jobs.slots = [tutorialJobSeed(state, def)];
    } else {
      state.jobs.slots = [current];
    }
    return state.jobs;
  }
  const rebound = (state.upgrades?.bank_shot || 0) > 0;
  const slots = state.jobs.slots.filter(
    (job) => job && !job.tutorial && (rebound || job.defId !== 'banks')
  );
  while (slots.length < 3) {
    const avoid = slots.map((job) => job.defId);
    slots.push(jobSeed(state, avoid));
  }
  state.jobs.slots = slots;
  return state.jobs;
}

export function jobProgress(job, stats) {
  const def = jobById(job.defId);
  if (!def) {
    return 0;
  }
  const current = Number(stats[def.stat] || 0);
  return Math.max(0, Math.min(job.amount, current - (job.baseline || 0)));
}

export function rollEvent(state) {
  const rebound = (state?.upgrades?.bank_shot || 0) > 0;
  const pool = EVENT_DEFS.filter((def) => rebound || def.id !== 'cushion');
  const def = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: def.id,
    name: def.name,
    blurb: def.blurb,
    color: def.color,
    ttl: def.duration
  };
}
