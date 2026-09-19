function u(def) {
  return {
    maxLevel: 25,
    scale: 1.28,
    permanent: false,
    group: 'General',
    requires: null,
    ...def
  };
}

export const TAB_META = [
  { id: 'tap', label: 'Tap' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'haul', label: 'Haul' },
  { id: 'sector', label: 'Sector' }
];

export const GROUP_BLURBS = {
  'Manual Rig': 'Crack rocks with the pick. Ore drops on shatter. Chip Harvest can leak chips as they split.',
  Specialist: 'Precision toys. Crits, splash, and rhythm once the pick is worth swinging.',
  Overdrive: 'Late tap kits. Locked until the basic rig is actually upgraded.',
  Probes: 'Kinetic birds. They do not come back. Budget every launch.',
  Automation: 'Mid-game dispatch. Auto-launch still pays the launch fee.',
  Ballistics: 'Separate from the pick. Crits and banked wall shots are how a cheap bird punches up.',
  Ordnance: 'Guidance, chains, and twin rails for a real fleet.',
  Crew: 'Haulers you own. Buy more bays, then they keep working the pad.',
  Bay: 'Cargo, pumps, and the dump circle at the bottom of the claim.',
  Field: 'How mean the belt is — spawn rate, shatter yield, and rare rocks.',
  Logistics: 'Return burns, compression, and pad magnetism.',
  'Company Charter': 'Survives expansion. Buy these before you warp.'
};

export const UPGRADE_DEFS = [
  u({
    id: 'tap_damage',
    name: 'Rock Pick',
    tab: 'tap',
    group: 'Manual Rig',
    baseCost: 8,
    scale: 1.24,
    maxLevel: 80,
    effect: (level) => Math.floor(7 * Math.pow(1.21, level)),
    describe: (level) => `Tap damage: ${Math.floor(7 * Math.pow(1.21, level))}`
  }),
  u({
    id: 'tap_rate',
    name: 'Drill Cadence',
    tab: 'tap',
    group: 'Manual Rig',
    baseCost: 14,
    scale: 1.3,
    maxLevel: 26,
    effect: (level) => Math.max(0.15, 1.62 - level * 0.054),
    describe: (level) => `Tap interval: ${Math.max(0.15, 1.62 - level * 0.054).toFixed(2)} s`
  }),
  u({
    id: 'tap_radius',
    name: 'Targeting Overlay',
    tab: 'tap',
    group: 'Manual Rig',
    baseCost: 18,
    scale: 1.32,
    maxLevel: 18,
    effect: (level) => 36 + level * 9,
    describe: (level) => `Aim assist: ${36 + level * 9} px`
  }),
  u({
    id: 'tap_chips',
    name: 'Chip Harvest',
    tab: 'tap',
    group: 'Manual Rig',
    requires: { id: 'tap_damage', level: 1 },
    baseCost: 20,
    scale: 1.33,
    maxLevel: 22,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.64, 0.11 + (level - 1) * 0.025)),
    describe: (level) =>
      level <= 0
        ? 'Off — ore only drops when a rock shatters'
        : `Leak chance: ${(Math.min(0.64, 0.11 + (level - 1) * 0.025) * 100).toFixed(0)}% · ${
            1 + Math.floor((level - 1) / 6)
          } chip${1 + Math.floor((level - 1) / 6) === 1 ? '' : 's'} · value ×${(
            0.4 +
            (level - 1) * 0.12
          ).toFixed(2)}`
  }),
  u({
    id: 'tap_crit',
    name: 'Precision Strike',
    tab: 'tap',
    group: 'Specialist',
    baseCost: 40,
    scale: 1.36,
    maxLevel: 20,
    effect: (level) => Math.min(0.58, level * 0.028),
    describe: (level) => `Crit chance: ${(Math.min(0.58, level * 0.028) * 100).toFixed(1)}%`
  }),
  u({
    id: 'tap_splash',
    name: 'Shockwave Bit',
    tab: 'tap',
    group: 'Specialist',
    baseCost: 55,
    scale: 1.38,
    maxLevel: 15,
    effect: (level) => Math.min(0.72, level * 0.046),
    describe: (level) => `Splash damage: ${(Math.min(0.72, level * 0.046) * 100).toFixed(0)}%`
  }),
  u({
    id: 'tap_combo',
    name: 'Rhythm Bonus',
    tab: 'tap',
    group: 'Specialist',
    baseCost: 70,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => 0.07 + level * 0.042,
    describe: (level) => `Combo bonus: +${((0.07 + level * 0.042) * 100).toFixed(0)}%/stack`
  }),
  u({
    id: 'tap_soften',
    name: 'Fault Finder',
    tab: 'tap',
    group: 'Overdrive',
    requires: { id: 'tap_damage', level: 4 },
    baseCost: 95,
    scale: 1.37,
    maxLevel: 16,
    effect: (level) => 1 + level * 0.07,
    describe: (level) => `Tap damage ×${(1 + level * 0.07).toFixed(2)} vs rock HP`
  }),
  u({
    id: 'tap_lucky',
    name: 'Lucky Flakes',
    tab: 'tap',
    group: 'Overdrive',
    requires: { id: 'tap_chips', level: 3 },
    baseCost: 110,
    scale: 1.39,
    maxLevel: 14,
    effect: (level) => Math.min(0.7, level * 0.048),
    describe: (level) =>
      level <= 0
        ? 'Extra chip when a leak already drops'
        : `Bonus leak chip: ${(Math.min(0.7, level * 0.048) * 100).toFixed(0)}%`
  }),
  u({
    id: 'tap_overcharge',
    name: 'Capacitor Pick',
    tab: 'tap',
    group: 'Overdrive',
    requires: { id: 'tap_rate', level: 4 },
    baseCost: 130,
    scale: 1.41,
    maxLevel: 12,
    effect: (level) => (level <= 0 ? 0 : Math.max(4, 11 - level)),
    describe: (level) =>
      level <= 0 ? 'Every Nth tap detonates' : `Overcharge every ${Math.max(4, 11 - level)} taps (×3.1)`
  }),
  u({
    id: 'tap_pierce',
    name: 'Core Auger',
    tab: 'tap',
    group: 'Overdrive',
    requires: { id: 'tap_splash', level: 2 },
    baseCost: 150,
    scale: 1.4,
    maxLevel: 10,
    effect: (level) => 58 + level * 10,
    describe: (level) => `Splash radius: ${58 + level * 10} px`
  }),
  u({
    id: 'tap_multihit',
    name: 'Twin Bit',
    tab: 'tap',
    group: 'Overdrive',
    requires: { id: 'tap_radius', level: 5 },
    baseCost: 180,
    scale: 1.44,
    maxLevel: 8,
    effect: (level) => Math.min(0.85, level * 0.1),
    describe: (level) => `2nd target: ${(Math.min(0.85, level * 0.1) * 100).toFixed(0)}% damage`
  }),

  u({
    id: 'drone_max_count',
    name: 'Max Probe Fleet',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 36,
    scale: 1.82,
    maxLevel: 20,
    effect: (level) => 1 + level,
    describe: (level) => `Max probes: ${1 + level}`
  }),
  u({
    id: 'drone_damage',
    name: 'Kinetic Energy',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 18,
    scale: 1.23,
    maxLevel: 80,
    effect: (level) => Math.floor(4 * Math.pow(1.23, level)),
    describe: (level) => `Probe damage: ${Math.floor(4 * Math.pow(1.23, level))}`
  }),
  u({
    id: 'drone_hull',
    name: 'Reinforced Hull',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 20,
    scale: 1.27,
    maxLevel: 40,
    effect: (level) => 18 + level * 15,
    describe: (level) => `Max HP: ${18 + level * 15}`
  }),
  u({
    id: 'drone_speed',
    name: 'Impulse Thrusters',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 24,
    scale: 1.2,
    maxLevel: 32,
    effect: (level) => 46 + level * 15,
    describe: (level) => `Speed: ${46 + level * 15} px/s`
  }),
  u({
    id: 'launch_discount',
    name: 'Bulk Launch Contract',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 40,
    scale: 1.38,
    maxLevel: 18,
    effect: (level) => Math.min(0.72, level * 0.04),
    describe: (level) => `Launch cost −${(Math.min(0.72, level * 0.04) * 100).toFixed(0)}%`
  }),
  u({
    id: 'drone_recoil',
    name: 'Inertial Dampers',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 32,
    scale: 1.33,
    maxLevel: 16,
    effect: (level) => Math.max(0.04, 0.17 - level * 0.0075),
    describe: (level) => `Recoil: ${(Math.max(0.04, 0.17 - level * 0.0075) * 100).toFixed(1)}% HP/hit`
  }),
  u({
    id: 'bounce_damp',
    name: 'Elastic Plating',
    tab: 'fleet',
    group: 'Probes',
    baseCost: 28,
    scale: 1.31,
    maxLevel: 14,
    effect: (level) => Math.min(0.995, 0.92 + level * 0.0055),
    describe: (level) => `Wall conserve: ${(Math.min(0.995, 0.92 + level * 0.0055) * 100).toFixed(1)}%`
  }),
  u({
    id: 'probe_crit',
    name: 'Deadeye Core',
    tab: 'fleet',
    group: 'Ballistics',
    requires: { id: 'drone_damage', level: 3 },
    baseCost: 210,
    scale: 1.36,
    maxLevel: 20,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.48, 0.07 + (level - 1) * 0.021)),
    describe: (level) =>
      level <= 0
        ? 'Off — probes never crit (pick crits stay separate)'
        : `Probe crit chance: ${(Math.min(0.48, 0.07 + (level - 1) * 0.021) * 100).toFixed(0)}%`
  }),
  u({
    id: 'probe_crit_dmg',
    name: 'Tungsten Tips',
    tab: 'fleet',
    group: 'Ballistics',
    requires: { id: 'probe_crit', level: 2 },
    baseCost: 280,
    scale: 1.4,
    maxLevel: 16,
    effect: (level) => 1.85 + level * 0.15,
    describe: (level) => `Probe crit damage: ${Math.round((1.85 + level * 0.15) * 100)}%`
  }),
  u({
    id: 'bank_shot',
    name: 'Bank Shot',
    tab: 'fleet',
    group: 'Ballistics',
    requires: { id: 'bounce_damp', level: 1 },
    baseCost: 165,
    scale: 1.34,
    maxLevel: 14,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.92, 0.18 + (level - 1) * 0.056)),
    describe: (level) =>
      level <= 0
        ? 'Wall bounces light the bird — buy this to make that glow hit harder'
        : `After a wall: +${(Math.min(0.92, 0.18 + (level - 1) * 0.056) * 100).toFixed(0)}% damage for 0.5s`
  }),
  u({
    id: 'auto_launch',
    name: 'Auto-Launch System',
    tab: 'fleet',
    group: 'Automation',
    requires: { id: 'drone_max_count', level: 3 },
    baseCost: 980,
    scale: 1.58,
    maxLevel: 16,
    effect: (level) => (level <= 0 ? 0 : Math.max(0.4, 11 - (level - 1) * 0.65)),
    describe: (level) =>
      level <= 0
        ? 'Locked until Max Probe Fleet 3 — still pays each launch'
        : `Auto-launch every ${Math.max(0.4, 11 - (level - 1) * 0.65).toFixed(2)} s (pays fee)`
  }),
  u({
    id: 'burst_launch',
    name: 'Hot Rails',
    tab: 'fleet',
    group: 'Automation',
    requires: { id: 'drone_max_count', level: 2 },
    baseCost: 220,
    scale: 1.36,
    maxLevel: 12,
    effect: (level) => Math.max(0.12, 0.62 - level * 0.04),
    describe: (level) => `Manual launch delay: ${Math.max(0.12, 0.62 - level * 0.04).toFixed(2)} s`
  }),
  u({
    id: 'dual_launch',
    name: 'Twin Rails',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'launch_discount', level: 2 },
    baseCost: 420,
    scale: 1.48,
    maxLevel: 10,
    effect: (level) => Math.min(0.9, level * 0.09),
    describe: (level) => `Second probe: ${(Math.min(0.9, level * 0.09) * 100).toFixed(0)}% (half fee)`
  }),
  u({
    id: 'scrap_rebate',
    name: 'Scrap Rights',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'drone_hull', level: 3 },
    baseCost: 160,
    scale: 1.35,
    maxLevel: 14,
    effect: (level) => Math.min(0.55, level * 0.04),
    describe: (level) => `Death rebate: ${(Math.min(0.55, level * 0.04) * 100).toFixed(0)}% of launch fee`
  }),
  u({
    id: 'hull_regen',
    name: 'Nanite Seals',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'drone_hull', level: 5 },
    baseCost: 260,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => level * 1.8,
    describe: (level) => `Hull regen: ${(level * 1.8).toFixed(1)} HP/s`
  }),
  u({
    id: 'guidance',
    name: 'Guidance Kit',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'drone_speed', level: 4 },
    baseCost: 240,
    scale: 1.38,
    maxLevel: 12,
    effect: (level) => Math.min(0.55, level * 0.045),
    describe: (level) => `Homing: ${(Math.min(0.55, level * 0.045) * 100).toFixed(0)}%`
  }),
  u({
    id: 'chain_shot',
    name: 'Shock Chain',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'drone_damage', level: 6 },
    baseCost: 300,
    scale: 1.42,
    maxLevel: 10,
    effect: (level) => Math.min(0.6, level * 0.055),
    describe: (level) => `Chain hit: ${(Math.min(0.6, level * 0.055) * 100).toFixed(0)}%`
  }),
  u({
    id: 'probe_mass',
    name: 'Heavy Nose',
    tab: 'fleet',
    group: 'Ordnance',
    requires: { id: 'bounce_damp', level: 2 },
    baseCost: 190,
    scale: 1.34,
    maxLevel: 12,
    effect: (level) => 8 + level * 0.45,
    describe: (level) => `Probe radius: ${(8 + level * 0.45).toFixed(1)} px`
  }),

  u({
    id: 'collector_max',
    name: 'Hauler Fleet',
    tab: 'haul',
    group: 'Crew',
    baseCost: 70,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => 1 + level,
    describe: (level) => `Max haulers: ${1 + level}`
  }),
  u({
    id: 'collector_speed',
    name: 'Hauler Engines',
    tab: 'haul',
    group: 'Crew',
    baseCost: 30,
    scale: 1.22,
    maxLevel: 30,
    effect: (level) => 22 + level * 14,
    describe: (level) => `Speed: ${22 + level * 14} px/s`
  }),
  u({
    id: 'collector_magnet',
    name: 'Gravity Tether',
    tab: 'haul',
    group: 'Crew',
    baseCost: 52,
    scale: 1.28,
    maxLevel: 20,
    effect: (level) => 38 + level * 13,
    describe: (level) => `Magnet: ${38 + level * 13} px`
  }),
  u({
    id: 'hauler_agility',
    name: 'RCS Thrusters',
    tab: 'haul',
    group: 'Crew',
    requires: { id: 'collector_speed', level: 2 },
    baseCost: 85,
    scale: 1.3,
    maxLevel: 14,
    effect: (level) => 7 + level * 1.1,
    describe: (level) => `Steer rate: ${(7 + level * 1.1).toFixed(1)}`
  }),
  u({
    id: 'collector_capacity',
    name: 'Cargo Hold',
    tab: 'haul',
    group: 'Bay',
    baseCost: 34,
    scale: 1.34,
    maxLevel: 24,
    effect: (level) => 2 + level * 2,
    describe: (level) => `Capacity: ${2 + level * 2} chips`
  }),
  u({
    id: 'unload_speed',
    name: 'Refinery Pumps',
    tab: 'haul',
    group: 'Bay',
    baseCost: 40,
    scale: 1.3,
    maxLevel: 18,
    effect: (level) => 5 + level * 5,
    describe: (level) => `Unload: ${5 + level * 5} chips/s`
  }),
  u({
    id: 'depot_radius',
    name: 'Pad Beacon',
    tab: 'haul',
    group: 'Bay',
    baseCost: 48,
    scale: 1.32,
    maxLevel: 12,
    effect: (level) => 28 + level * 8,
    describe: (level) => `Dump radius: ${28 + level * 8} px`
  }),
  u({
    id: 'value_seek',
    name: 'Assay Sensors',
    tab: 'haul',
    group: 'Bay',
    baseCost: 95,
    scale: 1.45,
    maxLevel: 8,
    effect: (level) => Math.min(1, level * 0.14),
    describe: (level) => `Prefer rich chips: ${(Math.min(1, level * 0.14) * 100).toFixed(0)}%`
  }),
  u({
    id: 'cargo_compress',
    name: 'Ore Press',
    tab: 'haul',
    group: 'Logistics',
    requires: { id: 'collector_capacity', level: 4 },
    baseCost: 160,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => level * 0.1,
    describe: (level) => `Bonus capacity: +${Math.round(level * 10)}%`
  }),
  u({
    id: 'return_boost',
    name: 'Home Burn',
    tab: 'haul',
    group: 'Logistics',
    requires: { id: 'collector_speed', level: 3 },
    baseCost: 120,
    scale: 1.34,
    maxLevel: 12,
    effect: (level) => 1 + level * 0.09,
    describe: (level) => `Return speed: ×${(1 + level * 0.09).toFixed(2)}`
  }),
  u({
    id: 'depot_pull',
    name: 'Pad Gravity',
    tab: 'haul',
    group: 'Logistics',
    requires: { id: 'collector_magnet', level: 3 },
    baseCost: 140,
    scale: 1.36,
    maxLevel: 10,
    effect: (level) => level * 0.16,
    describe: (level) => `Magnet near pad: +${Math.round(level * 16)}%`
  }),
  u({
    id: 'asteroid_max',
    name: 'Sector Asteroids',
    tab: 'haul',
    group: 'Field',
    baseCost: 30,
    scale: 1.35,
    maxLevel: 16,
    effect: (level) => 3 + level,
    describe: (level) => `Max rocks: ${3 + level}`
  }),
  u({
    id: 'asteroid_spawn_rate',
    name: 'Warp Beacon',
    tab: 'haul',
    group: 'Field',
    baseCost: 38,
    scale: 1.3,
    maxLevel: 20,
    effect: (level) => Math.max(0.18, 3.7 - level * 0.16),
    describe: (level) => `Spawn delay: ${Math.max(0.18, 3.7 - level * 0.16).toFixed(2)} s`
  }),
  u({
    id: 'ore_value_mult',
    name: 'Refining Process',
    tab: 'haul',
    group: 'Field',
    baseCost: 48,
    scale: 1.38,
    maxLevel: 80,
    effect: (level) => 1 + level * 0.32,
    describe: (level) => `Ore value: ×${(1 + level * 0.32).toFixed(2)}`
  }),
  u({
    id: 'rich_veins',
    name: 'Rich Veins',
    tab: 'haul',
    group: 'Field',
    baseCost: 68,
    scale: 1.36,
    maxLevel: 15,
    effect: (level) => 1 + level * 0.18,
    describe: (level) => `Shatter chips: ×${(1 + level * 0.18).toFixed(2)}`
  }),
  u({
    id: 'rare_shift',
    name: 'Prospecting Array',
    tab: 'haul',
    group: 'Field',
    baseCost: 85,
    scale: 1.42,
    maxLevel: 10,
    effect: (level) => Math.min(0.38, level * 0.038),
    describe: (level) => `Rare bias: +${(Math.min(0.38, level * 0.038) * 100).toFixed(0)}%`
  }),
  u({
    id: 'chip_split',
    name: 'Fracture Plan',
    tab: 'haul',
    group: 'Field',
    requires: { id: 'rich_veins', level: 2 },
    baseCost: 170,
    scale: 1.38,
    maxLevel: 10,
    effect: (level) => 1 + level * 0.12,
    describe: (level) => `Break chips: ×${(1 + level * 0.12).toFixed(2)}`
  }),
  u({
    id: 'rock_drift',
    name: 'Unstable Belt',
    tab: 'haul',
    group: 'Field',
    requires: { id: 'asteroid_max', level: 3 },
    baseCost: 150,
    scale: 1.4,
    maxLevel: 8,
    effect: (level) => level * 12,
    describe: (level) => (level <= 0 ? 'Rocks sit still' : `Rock drift: ${level * 12} px/s`)
  }),

  u({
    id: 'salvage_rights',
    name: 'Salvage Rights',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 120,
    scale: 1.55,
    maxLevel: 10,
    effect: (level) => Math.min(0.55, level * 0.055),
    describe: (level) => `Keep ${(Math.min(0.55, level * 0.055) * 100).toFixed(0)}% credits on expansion`
  }),
  u({
    id: 'veteran_picks',
    name: 'Veteran Picks',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 150,
    scale: 1.48,
    maxLevel: 15,
    effect: (level) => level * 2,
    describe: (level) => `Permanent tap damage +${level * 2}`
  }),
  u({
    id: 'charter_hold',
    name: 'Charter Holds',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 180,
    scale: 1.5,
    maxLevel: 8,
    effect: (level) => level,
    describe: (level) => `Permanent cargo +${level}`
  }),
  u({
    id: 'offline_ops',
    name: 'Night Shift',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 200,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => 0.42 + level * 0.055,
    describe: (level) => `Offline efficiency: ${((0.42 + level * 0.055) * 100).toFixed(0)}%`
  }),
  u({
    id: 'starting_capital',
    name: 'Treasury Buffer',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 220,
    scale: 1.6,
    maxLevel: 8,
    effect: (level) => Math.floor(20 * Math.pow(2.1, level)),
    describe: (level) =>
      level <= 0
        ? 'No expansion stipend'
        : `Expansion stipend: $${Math.floor(20 * Math.pow(2.1, level)).toLocaleString('en-US')}`
  }),
  u({
    id: 'veteran_hulls',
    name: 'Veteran Hulls',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 240,
    scale: 1.5,
    maxLevel: 12,
    effect: (level) => level * 8,
    describe: (level) => `Permanent probe HP +${level * 8}`
  }),
  u({
    id: 'veteran_engines',
    name: 'Veteran Engines',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 260,
    scale: 1.5,
    maxLevel: 12,
    effect: (level) => level * 6,
    describe: (level) => `Permanent probe speed +${level * 6}`
  }),
  u({
    id: 'veteran_optics',
    name: 'Veteran Optics',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 260,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => level * 0.012,
    describe: (level) => `Permanent probe crit +${(level * 1.2).toFixed(1)}%`
  }),
  u({
    id: 'veteran_tether',
    name: 'Veteran Tethers',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 250,
    scale: 1.48,
    maxLevel: 10,
    effect: (level) => level * 5,
    describe: (level) => `Permanent magnet +${level * 5} px`
  }),
  u({
    id: 'charter_yield',
    name: 'Assay Charter',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 280,
    scale: 1.54,
    maxLevel: 12,
    effect: (level) => 1 + level * 0.08,
    describe: (level) => `Permanent ore value ×${(1 + level * 0.08).toFixed(2)}`
  }),
  u({
    id: 'expansion_scout',
    name: 'Scout Fees',
    tab: 'sector',
    group: 'Company Charter',
    permanent: true,
    baseCost: 300,
    scale: 1.56,
    maxLevel: 8,
    effect: (level) => Math.min(0.4, level * 0.05),
    describe: (level) => `Next sector unlock −${(Math.min(0.4, level * 0.05) * 100).toFixed(0)}%`
  })
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, def]));

export const ASTEROID_TIERS = {
  common: {
    id: 'common',
    name: 'Common',
    baseHp: 22,
    radius: 26,
    color: '#94a3b8',
    yield: 1,
    unitValue: 1.0
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    baseHp: 55,
    radius: 30,
    color: '#78716c',
    yield: 2,
    unitValue: 2.2
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    baseHp: 90,
    radius: 34,
    color: '#d97706',
    yield: 2,
    unitValue: 4.0
  },
  comet: {
    id: 'comet',
    name: 'Comet',
    baseHp: 140,
    radius: 22,
    color: '#67e8f9',
    yield: 3,
    unitValue: 7.5,
    drift: 42
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    baseHp: 380,
    radius: 42,
    color: '#cbd5e1',
    yield: 4,
    unitValue: 12.0
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    baseHp: 900,
    radius: 46,
    color: '#fbbf24',
    yield: 5,
    unitValue: 28.0
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    baseHp: 1400,
    radius: 44,
    color: '#e2e8f0',
    yield: 6,
    unitValue: 44.0
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    baseHp: 2000,
    radius: 52,
    color: '#a855f7',
    yield: 8,
    unitValue: 50.0
  },
  void: {
    id: 'void',
    name: 'Voidglass',
    baseHp: 5200,
    radius: 60,
    color: '#22d3ee',
    yield: 12,
    unitValue: 140.0
  },
  horizon: {
    id: 'horizon',
    name: 'Horizon Shard',
    baseHp: 9800,
    radius: 68,
    color: '#fb7185',
    yield: 16,
    unitValue: 260.0
  }
};

export const SECTORS = [
  {
    level: 1,
    name: 'Alpha Sector',
    short: 'Alpha',
    lore: 'A quiet gravel claim. Tap everything. Do not waste a probe yet.',
    tint: 'rgba(56, 189, 248, 0.055)',
    unlock: 0,
    width: 400,
    height: 400,
    incomeMult: 1.0,
    tiers: [
      { id: 'common', weight: 0.86 },
      { id: 'iron', weight: 0.14 }
    ]
  },
  {
    level: 2,
    name: 'Beta Sector',
    short: 'Beta',
    lore: 'Bronze shows up. Hauler capacity starts to matter.',
    tint: 'rgba(217, 119, 6, 0.06)',
    unlock: 3500,
    width: 560,
    height: 560,
    incomeMult: 2.4,
    tiers: [
      { id: 'common', weight: 0.42 },
      { id: 'iron', weight: 0.28 },
      { id: 'bronze', weight: 0.3 }
    ]
  },
  {
    level: 3,
    name: 'Gamma Sector',
    short: 'Gamma',
    lore: 'Comets cut the field. Guidance kits earn their keep.',
    tint: 'rgba(34, 211, 238, 0.07)',
    unlock: 85000,
    width: 720,
    height: 720,
    incomeMult: 6.5,
    tiers: [
      { id: 'iron', weight: 0.22 },
      { id: 'bronze', weight: 0.36 },
      { id: 'comet', weight: 0.16 },
      { id: 'silver', weight: 0.26 }
    ]
  },
  {
    level: 4,
    name: 'Delta Reach',
    short: 'Delta',
    lore: 'Gold belts. Auto-launch is no longer a luxury.',
    tint: 'rgba(245, 158, 11, 0.07)',
    unlock: 720000,
    width: 900,
    height: 900,
    incomeMult: 16.0,
    tiers: [
      { id: 'bronze', weight: 0.16 },
      { id: 'silver', weight: 0.34 },
      { id: 'comet', weight: 0.14 },
      { id: 'gold', weight: 0.36 }
    ]
  },
  {
    level: 5,
    name: 'Kuiper Yard',
    short: 'Kuiper',
    lore: 'Platinum and dark ice. Charter upgrades before you warp.',
    tint: 'rgba(168, 85, 247, 0.08)',
    unlock: 6500000,
    width: 1040,
    height: 1040,
    incomeMult: 38.0,
    tiers: [
      { id: 'silver', weight: 0.16 },
      { id: 'gold', weight: 0.28 },
      { id: 'platinum', weight: 0.3 },
      { id: 'dark', weight: 0.26 }
    ]
  },
  {
    level: 6,
    name: 'Deep Space',
    short: 'Deep',
    lore: 'Voidglass sings when it breaks. Bring spare hulls.',
    tint: 'rgba(34, 211, 238, 0.09)',
    unlock: 42000000,
    width: 1180,
    height: 1180,
    incomeMult: 95.0,
    tiers: [
      { id: 'gold', weight: 0.12 },
      { id: 'platinum', weight: 0.22 },
      { id: 'dark', weight: 0.38 },
      { id: 'void', weight: 0.28 }
    ]
  },
  {
    level: 7,
    name: 'Event Horizon',
    short: 'Horizon',
    lore: 'The company letterhead still looks official out here. Barely.',
    tint: 'rgba(244, 63, 94, 0.08)',
    unlock: 280000000,
    width: 1320,
    height: 1320,
    incomeMult: 240.0,
    tiers: [
      { id: 'dark', weight: 0.22 },
      { id: 'void', weight: 0.48 },
      { id: 'horizon', weight: 0.3 }
    ]
  },
  {
    level: 8,
    name: 'Singularity Claim',
    short: 'Singular',
    lore: 'If the pad is still lit, keep hauling. Physics is a suggestion.',
    tint: 'rgba(99, 102, 241, 0.1)',
    unlock: 1800000000,
    width: 1480,
    height: 1480,
    incomeMult: 620.0,
    tiers: [
      { id: 'void', weight: 0.4 },
      { id: 'horizon', weight: 0.6 }
    ]
  }
];

export function upgradeCost(def, level) {
  return Math.floor(def.baseCost * Math.pow(def.scale, level));
}

export function getSector(sectorLevel) {
  return SECTORS.find((s) => s.level === sectorLevel) || SECTORS[0];
}

export function requirementList(def) {
  if (!def.requires) {
    return [];
  }
  return Array.isArray(def.requires) ? def.requires : [def.requires];
}

export function isUnlocked(def, upgrades) {
  return requirementList(def).every((req) => (upgrades[req.id] || 0) >= req.level);
}

export function requirementText(def) {
  return requirementList(def)
    .map((req) => {
      const other = UPGRADE_BY_ID[req.id];
      return `${other ? other.name : req.id} ${req.level}`;
    })
    .join(', ');
}

export function pickAsteroidTier(sectorLevel, rareBias = 0) {
  const sector = getSector(sectorLevel);
  const weights = sector.tiers.map((entry, index) => {
    const lateBoost = index / Math.max(1, sector.tiers.length - 1);
    return Math.max(0.02, entry.weight + rareBias * lateBoost);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * sum;
  for (let i = 0; i < sector.tiers.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return ASTEROID_TIERS[sector.tiers[i].id];
    }
  }
  return ASTEROID_TIERS[sector.tiers[sector.tiers.length - 1].id];
}

export function derivedStats(upgrades, sectorLevel, event = null) {
  const sector = getSector(sectorLevel);
  const lv = (id) => upgrades[id] || 0;
  const autoLevel = lv('auto_launch');
  const discount = UPGRADE_BY_ID.launch_discount.effect(lv('launch_discount'));
  const rawLaunch = 12 + lv('drone_max_count') * 6;
  const eventId = event && event.ttl > 0 ? event.id : null;
  const oreEvent = eventId === 'gold_rush' ? 2.15 : eventId === 'quiet' ? 1.45 : 1;
  const spawnEvent = eventId === 'meteor' ? 0.34 : eventId === 'quiet' ? 1.55 : 1;
  const rockEvent = eventId === 'dense' ? 4 : 0;
  const chipEvent = eventId === 'aftershock' ? 1.85 : 1;
  const returnEvent = eventId === 'tailwind' ? 1.35 : 1;
  const bounceEvent = eventId === 'cushion' ? 0.035 : 0;
  const bankEvent = eventId === 'cushion' ? 0.22 : 0;
  const probeCritEvent = eventId === 'deadeye' ? 0.12 : 0;
  const rareEvent = eventId === 'quiet' ? 0.18 : eventId === 'gold_rush' ? 0.08 : 0;
  const baseCap = UPGRADE_BY_ID.collector_capacity.effect(lv('collector_capacity'));
  const compress = UPGRADE_BY_ID.cargo_compress.effect(lv('cargo_compress'));
  return {
    maxDrones: UPGRADE_BY_ID.drone_max_count.effect(lv('drone_max_count')),
    droneDamage: UPGRADE_BY_ID.drone_damage.effect(lv('drone_damage')),
    droneMaxHp:
      UPGRADE_BY_ID.drone_hull.effect(lv('drone_hull')) +
      UPGRADE_BY_ID.veteran_hulls.effect(lv('veteran_hulls')),
    droneSpeed:
      UPGRADE_BY_ID.drone_speed.effect(lv('drone_speed')) +
      UPGRADE_BY_ID.veteran_engines.effect(lv('veteran_engines')),
    launchCost: Math.max(5, Math.floor(rawLaunch * (1 - discount))),
    autoLaunchEnabled: autoLevel > 0,
    autoDeployInterval: UPGRADE_BY_ID.auto_launch.effect(autoLevel),
    recoilFrac: UPGRADE_BY_ID.drone_recoil.effect(lv('drone_recoil')),
    wallDamp: Math.min(0.995, UPGRADE_BY_ID.bounce_damp.effect(lv('bounce_damp')) + bounceEvent),
    extraLaunchChance: UPGRADE_BY_ID.dual_launch.effect(lv('dual_launch')),
    scrapRebate: UPGRADE_BY_ID.scrap_rebate.effect(lv('scrap_rebate')),
    hullRegen: UPGRADE_BY_ID.hull_regen.effect(lv('hull_regen')),
    guidance: UPGRADE_BY_ID.guidance.effect(lv('guidance')),
    chainFrac: UPGRADE_BY_ID.chain_shot.effect(lv('chain_shot')),
    probeRadius: UPGRADE_BY_ID.probe_mass.effect(lv('probe_mass')),
    probeCrit: Math.min(
      0.58,
      UPGRADE_BY_ID.probe_crit.effect(lv('probe_crit')) +
        UPGRADE_BY_ID.veteran_optics.effect(lv('veteran_optics')) +
        probeCritEvent
    ),
    probeCritMult: UPGRADE_BY_ID.probe_crit_dmg.effect(lv('probe_crit_dmg')),
    bankShot: UPGRADE_BY_ID.bank_shot.effect(lv('bank_shot')) + bankEvent,
    manualLaunchDelay: UPGRADE_BY_ID.burst_launch.effect(lv('burst_launch')),
    tapDamage:
      UPGRADE_BY_ID.tap_damage.effect(lv('tap_damage')) +
      UPGRADE_BY_ID.veteran_picks.effect(lv('veteran_picks')),
    tapInterval: UPGRADE_BY_ID.tap_rate.effect(lv('tap_rate')),
    tapRadius: UPGRADE_BY_ID.tap_radius.effect(lv('tap_radius')),
    chipLeakChance: UPGRADE_BY_ID.tap_chips.effect(lv('tap_chips')),
    tapChipCount:
      lv('tap_chips') <= 0
        ? 0
        : 1 + Math.floor((lv('tap_chips') - 1) / 6) + (eventId === 'aftershock' && lv('tap_chips') > 0 ? 1 : 0),
    tapChipMult:
      (lv('tap_chips') <= 0 ? 0 : 0.4 + (lv('tap_chips') - 1) * 0.12) * chipEvent,
    tapCrit: UPGRADE_BY_ID.tap_crit.effect(lv('tap_crit')),
    tapSplash: UPGRADE_BY_ID.tap_splash.effect(lv('tap_splash')),
    tapCombo: UPGRADE_BY_ID.tap_combo.effect(lv('tap_combo')),
    tapSoften: UPGRADE_BY_ID.tap_soften.effect(lv('tap_soften')),
    luckyChip: UPGRADE_BY_ID.tap_lucky.effect(lv('tap_lucky')),
    overchargeEvery: UPGRADE_BY_ID.tap_overcharge.effect(lv('tap_overcharge')),
    splashRadius: UPGRADE_BY_ID.tap_pierce.effect(lv('tap_pierce')),
    multiHit: UPGRADE_BY_ID.tap_multihit.effect(lv('tap_multihit')),
    maxAsteroids: UPGRADE_BY_ID.asteroid_max.effect(lv('asteroid_max')) + rockEvent,
    asteroidSpawnDelay: UPGRADE_BY_ID.asteroid_spawn_rate.effect(lv('asteroid_spawn_rate')) * spawnEvent,
    oreValueMult:
      UPGRADE_BY_ID.ore_value_mult.effect(lv('ore_value_mult')) *
      UPGRADE_BY_ID.charter_yield.effect(lv('charter_yield')) *
      oreEvent,
    richVeins:
      UPGRADE_BY_ID.rich_veins.effect(lv('rich_veins')) *
      UPGRADE_BY_ID.chip_split.effect(lv('chip_split')),
    rareShift: UPGRADE_BY_ID.rare_shift.effect(lv('rare_shift')) + rareEvent,
    maxCollectors: UPGRADE_BY_ID.collector_max.effect(lv('collector_max')),
    collectorSpeed: UPGRADE_BY_ID.collector_speed.effect(lv('collector_speed')),
    magnetRadius:
      UPGRADE_BY_ID.collector_magnet.effect(lv('collector_magnet')) +
      UPGRADE_BY_ID.veteran_tether.effect(lv('veteran_tether')),
    cargoCapacity:
      Math.max(2, Math.floor(baseCap * (1 + compress))) +
      UPGRADE_BY_ID.charter_hold.effect(lv('charter_hold')),
    unloadPerSec: UPGRADE_BY_ID.unload_speed.effect(lv('unload_speed')),
    depotRadius: UPGRADE_BY_ID.depot_radius.effect(lv('depot_radius')),
    valueSeek: UPGRADE_BY_ID.value_seek.effect(lv('value_seek')),
    returnBoost: UPGRADE_BY_ID.return_boost.effect(lv('return_boost')) * returnEvent,
    depotPull: UPGRADE_BY_ID.depot_pull.effect(lv('depot_pull')),
    steerRate: UPGRADE_BY_ID.hauler_agility.effect(lv('hauler_agility')),
    driftSpeed: UPGRADE_BY_ID.rock_drift.effect(lv('rock_drift')),
    salvageKeep: UPGRADE_BY_ID.salvage_rights.effect(lv('salvage_rights')),
    stipend: UPGRADE_BY_ID.starting_capital.effect(lv('starting_capital')),
    unlockCut: UPGRADE_BY_ID.expansion_scout.effect(lv('expansion_scout')),
    offlineEff: UPGRADE_BY_ID.offline_ops.effect(lv('offline_ops')),
    sectorMult: sector.incomeMult,
    width: sector.width,
    height: sector.height,
    sector,
    eventId
  };
}

export function zeroUpgrades({ keepPermanent = false, current } = {}) {
  const upgrades = {};
  for (const def of UPGRADE_DEFS) {
    if (keepPermanent && def.permanent && current) {
      upgrades[def.id] = current[def.id] || 0;
    } else {
      upgrades[def.id] = 0;
    }
  }
  return upgrades;
}

export function groupedUpgrades(tab) {
  const groups = [];
  const map = new Map();
  for (const def of UPGRADE_DEFS.filter((item) => item.tab === tab)) {
    if (!map.has(def.group)) {
      const group = { title: def.group, blurb: GROUP_BLURBS[def.group] || '', items: [] };
      map.set(def.group, group);
      groups.push(group);
    }
    map.get(def.group).items.push(def);
  }
  return groups;
}

export function sectorUnlockNeed(sector, stats) {
  return Math.floor(sector.unlock * (1 - (stats?.unlockCut || 0)));
}
