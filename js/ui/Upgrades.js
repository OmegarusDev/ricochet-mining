import {
  TUNING,
  fieldRocks,
  spawnDelay,
  hpMult as sectorHpMult,
  tapDamage as tapDamageAt,
  tapInterval as tapIntervalAt,
  probeDamage as probeDamageAt,
  probeHull as probeHullAt,
  probeSpeed as probeSpeedAt,
  probeSlots,
  haulerSpeed as haulerSpeedAt,
  launchFee,
  fieldSize
} from '../sim/Tuning.js?v=50';

function u(def) {
  return {
    maxLevel: 25,
    scale: 1.28,
    permanent: false,
    group: 'General',
    requires: null,
    hidden: false,
    ...def
  };
}

/** Every rock starts at 2 shards. Richness multiplies that count. */
export const BASE_SHARDS = 2;

export function richnessMult(level) {
  return 1 + Math.max(0, level) * 0.5;
}

export function shardsOnBreak(richnessLevel, yieldCount = BASE_SHARDS) {
  return Math.max(1, Math.round(yieldCount * richnessMult(richnessLevel)));
}

export const TAB_META = [
  { id: 'tap', label: 'Laser' },
  { id: 'fleet', label: 'Drills' },
  { id: 'haul', label: 'Haul' },
  { id: 'scan', label: 'Survey' },
  { id: 'sector', label: 'Claim' }
];

export const GROUP_BLURBS = {
  'Laser Kit': 'Tap a rock. Shards fall when it breaks. Early Shards can knock some loose while you are still shooting.',
  'Lucky Shots': 'Bonus laser tricks: lucky hits, splash, and combos.',
  'Big Laser': 'Late laser toys. Locked until the basic laser is upgraded.',
  Drills: 'Drills bounce off walls for free. Hitting a rock wears them down.',
  'Hands-Free': 'Launch drills for you. You still pay the launch fee every time.',
  'Lucky Drills': 'Lucky hits for drills. Separate from the laser.',
  'Drill Extras': 'Homing, jumping to the next rock, and extra launches.',
  Haulers: 'The gold ships that pick up shards and dump them at REFINERY.',
  'The Pad': 'How much they carry, how fast they dump, and how close they must get.',
  Payday: 'How many shards drop, and how much each shard is worth.',
  'The Field': 'How many rocks, how fast they show up, and how big the square is.',
  Shortcuts: 'Faster trips home, extra cargo, stronger magnet near the pad.',
  'Keep Forever': 'These stay when you warp to a new sector. Buy them before you leave.'
};

export const UPGRADE_DEFS = [
  u({
    id: 'tap_damage',
    name: 'Laser Power',
    tab: 'tap',
    group: 'Laser Kit',
    baseCost: 8,
    scale: 1.24,
    maxLevel: 80,
    effect: (level) => tapDamageAt(level),
    describe: (level) => `Laser damage: ${tapDamageAt(level)}`
  }),
  u({
    id: 'tap_rate',
    name: 'Faster Shots',
    tab: 'tap',
    group: 'Laser Kit',
    baseCost: 14,
    scale: 1.3,
    maxLevel: 30,
    effect: (level) => tapIntervalAt(level),
    describe: (level) => `Wait between shots: ${tapIntervalAt(level).toFixed(2)} s`
  }),
  u({
    id: 'tap_radius',
    name: 'Easier Aim',
    tab: 'tap',
    group: 'Laser Kit',
    baseCost: 18,
    scale: 1.32,
    maxLevel: 18,
    effect: (level) => 36 + level * 9,
    describe: (level) => `You can miss by more (reach ${36 + level * 9})`
  }),
  u({
    id: 'tap_chips',
    name: 'Early Shards',
    tab: 'tap',
    group: 'Laser Kit',
    requires: { id: 'tap_damage', level: 1 },
    baseCost: 20,
    scale: 1.33,
    maxLevel: 22,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.64, 0.11 + (level - 1) * 0.025)),
    describe: (level) =>
      level <= 0
        ? 'Off — shards only drop when a rock breaks'
        : `${(Math.min(0.64, 0.11 + (level - 1) * 0.025) * 100).toFixed(0)}% chance while shooting · ${
            1 + Math.floor((level - 1) / 6)
          } shard${1 + Math.floor((level - 1) / 6) === 1 ? '' : 's'} · each worth ×${(
            0.4 +
            (level - 1) * 0.12
          ).toFixed(2)}`
  }),
  u({
    id: 'tap_crit',
    name: 'Lucky Hits',
    tab: 'tap',
    group: 'Lucky Shots',
    baseCost: 40,
    scale: 1.36,
    maxLevel: 20,
    effect: (level) => Math.min(0.58, level * 0.028),
    describe: (level) => `Lucky hit chance: ${(Math.min(0.58, level * 0.028) * 100).toFixed(1)}%`
  }),
  u({
    id: 'tap_splash',
    name: 'Shockwave',
    tab: 'tap',
    group: 'Lucky Shots',
    baseCost: 55,
    scale: 1.38,
    maxLevel: 15,
    effect: (level) => Math.min(0.72, level * 0.046),
    describe: (level) => `Nearby rocks take ${(Math.min(0.72, level * 0.046) * 100).toFixed(0)}% extra`
  }),
  u({
    id: 'tap_combo',
    name: 'Combo Bonus',
    tab: 'tap',
    group: 'Lucky Shots',
    baseCost: 70,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => 0.07 + level * 0.042,
    describe: (level) => `Each tap in a row: +${((0.07 + level * 0.042) * 100).toFixed(0)}%`
  }),
  u({
    id: 'tap_soften',
    name: 'Tough-Rock Laser',
    tab: 'tap',
    group: 'Big Laser',
    requires: { id: 'tap_damage', level: 4 },
    baseCost: 95,
    scale: 1.37,
    maxLevel: 16,
    effect: (level) => 1 + level * 0.07,
    describe: (level) => `Extra vs big rocks: ×${(1 + level * 0.07).toFixed(2)}`
  }),
  u({
    id: 'tap_lucky',
    name: 'Extra Shard',
    tab: 'tap',
    group: 'Big Laser',
    requires: { id: 'tap_chips', level: 3 },
    baseCost: 110,
    scale: 1.39,
    maxLevel: 14,
    effect: (level) => Math.min(0.7, level * 0.048),
    describe: (level) =>
      level <= 0
        ? 'Sometimes drops one more shard when Early Shards already popped one'
        : `${(Math.min(0.7, level * 0.048) * 100).toFixed(0)}% chance of a bonus shard`
  }),
  u({
    id: 'tap_overcharge',
    name: 'Charged Shot',
    tab: 'tap',
    group: 'Big Laser',
    requires: { id: 'tap_rate', level: 4 },
    baseCost: 130,
    scale: 1.41,
    maxLevel: 12,
    effect: (level) => (level <= 0 ? 0 : Math.max(4, 11 - level)),
    describe: (level) =>
      level <= 0 ? 'Every so often, a huge blast' : `Huge blast every ${Math.max(4, 11 - level)} shots (×3.1)`
  }),
  u({
    id: 'tap_pierce',
    name: 'Wider Shockwave',
    tab: 'tap',
    group: 'Big Laser',
    requires: { id: 'tap_splash', level: 2 },
    baseCost: 150,
    scale: 1.4,
    maxLevel: 10,
    effect: (level) => 58 + level * 10,
    describe: (level) => `Shockwave reach: ${58 + level * 10}`
  }),
  u({
    id: 'tap_multihit',
    name: 'Two Rocks',
    tab: 'tap',
    group: 'Big Laser',
    requires: { id: 'tap_radius', level: 5 },
    baseCost: 180,
    scale: 1.44,
    maxLevel: 8,
    effect: (level) => Math.min(0.85, level * 0.1),
    describe: (level) => `Second rock takes ${(Math.min(0.85, level * 0.1) * 100).toFixed(0)}%`
  }),

  u({
    id: 'drone_max_count',
    name: 'Drill Slot',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 22,
    scale: 1.88,
    maxLevel: TUNING.probeCap,
    effect: (level) => probeSlots(level),
    describe: (level) => `Drills you can fly at once: ${probeSlots(level)}`
  }),
  u({
    id: 'drone_damage',
    name: 'Harder Hits',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 18,
    scale: 1.23,
    maxLevel: 80,
    effect: (level) => probeDamageAt(level),
    describe: (level) => `Drill damage: ${probeDamageAt(level)}`
  }),
  u({
    id: 'drone_hull',
    name: 'Tougher Drill',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 20,
    scale: 1.27,
    maxLevel: 40,
    effect: (level) => probeHullAt(level),
    describe: (level) => `Health: ${probeHullAt(level)}`
  }),
  u({
    id: 'drone_speed',
    name: 'Faster Drills',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 24,
    scale: 1.2,
    maxLevel: 32,
    effect: (level) => probeSpeedAt(level),
    describe: (level) => `Speed: ${probeSpeedAt(level)}`
  }),
  u({
    id: 'launch_discount',
    name: 'Cheaper Launches',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 40,
    scale: 1.38,
    maxLevel: 18,
    effect: (level) => Math.min(0.72, level * 0.04),
    describe: (level) => `Launch fee −${(Math.min(0.72, level * 0.04) * 100).toFixed(0)}%`
  }),
  u({
    id: 'drone_recoil',
    name: 'Softer Wear',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 32,
    scale: 1.33,
    maxLevel: 16,
    effect: (level) => Math.max(0.28, 1 - level * 0.045),
    describe: (level) =>
      level <= 0
        ? "Take the rock's full punch"
        : `Take ${(Math.max(0.28, 1 - level * 0.045) * 100).toFixed(0)}% of the rock's punch`
  }),
  u({
    id: 'bounce_damp',
    name: 'Bouncy Armor',
    tab: 'fleet',
    group: 'Drills',
    baseCost: 28,
    scale: 1.31,
    maxLevel: 14,
    effect: (level) => Math.min(0.995, 0.92 + level * 0.0055),
    describe: (level) => `After a wall, keep ${(Math.min(0.995, 0.92 + level * 0.0055) * 100).toFixed(1)}% speed`
  }),
  u({
    id: 'probe_crit',
    name: 'Lucky Drill Hits',
    tab: 'fleet',
    group: 'Lucky Drills',
    requires: { id: 'drone_damage', level: 3 },
    baseCost: 210,
    scale: 1.36,
    maxLevel: 20,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.48, 0.07 + (level - 1) * 0.021)),
    describe: (level) =>
      level <= 0
        ? 'Off — drills have no lucky hits (laser lucky hits stay separate)'
        : `Lucky drill chance: ${(Math.min(0.48, 0.07 + (level - 1) * 0.021) * 100).toFixed(0)}%`
  }),
  u({
    id: 'probe_crit_dmg',
    name: 'Harder Lucky Hits',
    tab: 'fleet',
    group: 'Lucky Drills',
    requires: { id: 'probe_crit', level: 2 },
    baseCost: 280,
    scale: 1.4,
    maxLevel: 16,
    effect: (level) => 1.85 + level * 0.15,
    describe: (level) => `Lucky drill hits deal ${Math.round((1.85 + level * 0.15) * 100)}%`
  }),
  u({
    id: 'bank_shot',
    name: 'Rebound',
    tab: 'fleet',
    group: 'Lucky Drills',
    requires: { id: 'bounce_damp', level: 1 },
    baseCost: 165,
    scale: 1.34,
    maxLevel: 14,
    effect: (level) => (level <= 0 ? 0 : Math.min(0.92, 0.18 + (level - 1) * 0.056)),
    describe: (level) =>
      level <= 0
        ? 'After a wall bounce, the next rock hit hits harder'
        : `After a wall: +${(Math.min(0.92, 0.18 + (level - 1) * 0.056) * 100).toFixed(0)}% damage for 0.5s`
  }),
  u({
    id: 'auto_launch',
    name: 'Auto Launch',
    tab: 'fleet',
    group: 'Hands-Free',
    requires: { id: 'drone_max_count', level: 3 },
    baseCost: 980,
    scale: 1.58,
    maxLevel: 16,
    effect: (level) => (level <= 0 ? 0 : Math.max(0.4, 11 - (level - 1) * 0.65)),
    describe: (level) =>
      level <= 0
        ? 'Locked until Drill Slot 3 — still pays each launch'
        : `Launches a drill every ${Math.max(0.4, 11 - (level - 1) * 0.65).toFixed(2)} s (still pays)`
  }),
  u({
    id: 'burst_launch',
    name: 'Quicker Buy',
    tab: 'fleet',
    group: 'Hands-Free',
    requires: { id: 'drone_max_count', level: 2 },
    baseCost: 220,
    scale: 1.36,
    maxLevel: 12,
    effect: (level) => Math.max(0.12, 0.62 - level * 0.04),
    describe: (level) => `Wait after you buy a drill: ${Math.max(0.12, 0.62 - level * 0.04).toFixed(2)} s`
  }),
  u({
    id: 'dual_launch',
    name: 'Two At Once',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'launch_discount', level: 2 },
    baseCost: 420,
    scale: 1.48,
    maxLevel: 10,
    effect: (level) => Math.min(0.9, level * 0.09),
    describe: (level) => `${(Math.min(0.9, level * 0.09) * 100).toFixed(0)}% chance of a second drill (half price)`
  }),
  u({
    id: 'scrap_rebate',
    name: 'Scrap Refund',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'drone_hull', level: 3 },
    baseCost: 160,
    scale: 1.35,
    maxLevel: 14,
    effect: (level) => Math.min(0.55, level * 0.04),
    describe: (level) => `When a drill dies, get back ${(Math.min(0.55, level * 0.04) * 100).toFixed(0)}% of the launch fee`
  }),
  u({
    id: 'hull_regen',
    name: 'Self-Repair',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'drone_hull', level: 5 },
    baseCost: 260,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => level * 1.8,
    describe: (level) => `Heals ${(level * 1.8).toFixed(1)} health per second`
  }),
  u({
    id: 'guidance',
    name: 'Homing',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'drone_speed', level: 4 },
    baseCost: 240,
    scale: 1.38,
    maxLevel: 12,
    effect: (level) => Math.min(0.55, level * 0.045),
    describe: (level) => `Steers toward rocks: ${(Math.min(0.55, level * 0.045) * 100).toFixed(0)}%`
  }),
  u({
    id: 'chain_shot',
    name: 'Jump Hit',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'drone_damage', level: 6 },
    baseCost: 300,
    scale: 1.42,
    maxLevel: 10,
    effect: (level) => Math.min(0.6, level * 0.055),
    describe: (level) => `${(Math.min(0.6, level * 0.055) * 100).toFixed(0)}% chance to jump to another rock`
  }),
  u({
    id: 'probe_mass',
    name: 'Heavy Nose',
    tab: 'fleet',
    group: 'Drill Extras',
    requires: { id: 'bounce_damp', level: 2 },
    baseCost: 190,
    scale: 1.34,
    maxLevel: 12,
    effect: (level) => 8 + level * 0.45,
    describe: (level) => `Bigger drill (easier rams): ${(8 + level * 0.45).toFixed(1)}`
  }),

  u({
    id: 'collector_max',
    name: 'More Haulers',
    tab: 'haul',
    group: 'Haulers',
    baseCost: 70,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => 1 + level,
    describe: (level) => `Haulers you own: ${1 + level}`
  }),
  u({
    id: 'collector_speed',
    name: 'Faster Haulers',
    tab: 'haul',
    group: 'Haulers',
    baseCost: 30,
    scale: 1.22,
    maxLevel: 30,
    effect: (level) => haulerSpeedAt(level),
    describe: (level) => `Speed: ${haulerSpeedAt(level)}`
  }),
  u({
    id: 'collector_magnet',
    name: 'Magnet Reach',
    tab: 'haul',
    group: 'Haulers',
    baseCost: 52,
    scale: 1.28,
    maxLevel: 20,
    effect: (level) => 38 + level * 13,
    describe: (level) => `Pick-up reach: ${38 + level * 13}`
  }),
  u({
    id: 'hauler_agility',
    name: 'Tighter Turns',
    tab: 'haul',
    group: 'Haulers',
    requires: { id: 'collector_speed', level: 2 },
    baseCost: 85,
    scale: 1.3,
    maxLevel: 14,
    effect: (level) => 7 + level * 1.1,
    describe: (level) => `How fast they turn: ${(7 + level * 1.1).toFixed(1)}`
  }),
  u({
    id: 'collector_capacity',
    name: 'Bigger Load',
    tab: 'haul',
    group: 'The Pad',
    baseCost: 34,
    scale: 1.34,
    maxLevel: 24,
    effect: (level) => 2 + level * 2,
    describe: (level) => `Carries ${2 + level * 2} shards`
  }),
  u({
    id: 'unload_speed',
    name: 'Faster Dump',
    tab: 'haul',
    group: 'The Pad',
    baseCost: 40,
    scale: 1.3,
    maxLevel: 18,
    effect: (level) => 5 + level * 5,
    describe: (level) => `Dumps ${5 + level * 5} shards/s at the pad`
  }),
  u({
    id: 'depot_radius',
    name: 'Bigger Dump Zone',
    tab: 'haul',
    group: 'The Pad',
    baseCost: 48,
    scale: 1.32,
    maxLevel: 12,
    effect: (level) => 28 + level * 8,
    describe: (level) => `Can dump this far from REFINERY: ${28 + level * 8}`
  }),
  u({
    id: 'value_seek',
    name: 'Grab The Rich Ones',
    tab: 'haul',
    group: 'The Pad',
    baseCost: 95,
    scale: 1.45,
    maxLevel: 8,
    effect: (level) => Math.min(1, level * 0.14),
    describe: (level) => `Prefer pricey shards: ${(Math.min(1, level * 0.14) * 100).toFixed(0)}%`
  }),
  u({
    id: 'cargo_compress',
    name: 'Squeeze More In',
    tab: 'haul',
    group: 'Shortcuts',
    requires: { id: 'collector_capacity', level: 4 },
    baseCost: 160,
    scale: 1.4,
    maxLevel: 12,
    effect: (level) => level * 0.1,
    describe: (level) => `Extra space: +${Math.round(level * 10)}%`
  }),
  u({
    id: 'return_boost',
    name: 'Rush Home',
    tab: 'haul',
    group: 'Shortcuts',
    requires: { id: 'collector_speed', level: 3 },
    baseCost: 120,
    scale: 1.34,
    maxLevel: 12,
    effect: (level) => 1 + level * 0.09,
    describe: (level) => `Faster when heading to dump: ×${(1 + level * 0.09).toFixed(2)}`
  }),
  u({
    id: 'depot_pull',
    name: 'Magnet At The Pad',
    tab: 'haul',
    group: 'Shortcuts',
    requires: { id: 'collector_magnet', level: 3 },
    baseCost: 140,
    scale: 1.36,
    maxLevel: 10,
    effect: (level) => level * 0.16,
    describe: (level) => `Stronger magnet near REFINERY: +${Math.round(level * 16)}%`
  }),
  u({
    id: 'ore_value_mult',
    name: 'Better Pay',
    tab: 'haul',
    group: 'Payday',
    baseCost: 48,
    scale: 1.38,
    maxLevel: 80,
    effect: (level) => 1 + level * 0.32,
    describe: (level) => `Each shard is worth ×${(1 + level * 0.32).toFixed(2)}`
  }),
  u({
    id: 'rich_veins',
    name: 'Richness',
    tab: 'haul',
    group: 'Payday',
    baseCost: 68,
    scale: 1.36,
    maxLevel: 15,
    effect: (level) => richnessMult(level),
    describe: (level) => `${shardsOnBreak(level)} shards when a rock breaks`
  }),
  u({
    id: 'rare_shift',
    name: 'Rarer Rocks',
    tab: 'scan',
    group: 'The Field',
    baseCost: 85,
    scale: 1.42,
    maxLevel: 10,
    effect: (level) => Math.min(0.38, level * 0.038),
    describe: (level) =>
      level <= 0
        ? 'Normal mix of rocks'
        : `Fancy rocks +${(Math.min(0.38, level * 0.038) * 100).toFixed(0)}%`
  }),
  u({
    id: 'chip_split',
    name: 'Fracture Plan',
    tab: 'haul',
    group: 'Payday',
    hidden: true,
    requires: { id: 'rich_veins', level: 2 },
    baseCost: 170,
    scale: 1.38,
    maxLevel: 10,
    effect: (level) => 1 + level * 0.12,
    describe: (level) => `Extra shards: ×${(1 + level * 0.12).toFixed(2)}`
  }),
  u({
    id: 'asteroid_max',
    name: 'More Rocks',
    tab: 'scan',
    group: 'The Field',
    baseCost: TUNING.densityBaseCost,
    scale: TUNING.densityScale,
    maxLevel: TUNING.fieldCap - TUNING.startRocks,
    effect: (level) => fieldRocks(level),
    describe: (level) => `Rocks on the field: ${fieldRocks(level)} / ${TUNING.fieldCap}`
  }),
  u({
    id: 'asteroid_spawn_rate',
    name: 'Rocks Sooner',
    tab: 'scan',
    group: 'The Field',
    baseCost: TUNING.spawnBaseCost,
    scale: TUNING.spawnScale,
    maxLevel: TUNING.spawnMaxLevel,
    effect: (level) => spawnDelay(level),
    describe: (level) => `New rock every ${spawnDelay(level).toFixed(2)} s`
  }),
  u({
    id: 'survey_range',
    name: 'Bigger Field',
    tab: 'scan',
    group: 'The Field',
    baseCost: TUNING.surveyBaseCost,
    scale: TUNING.surveyScale,
    maxLevel: TUNING.surveyMaxLevel,
    effect: (level) => fieldSize(level),
    describe: (level) => `Field size: ${fieldSize(level)}×${fieldSize(level)}`
  }),
  u({
    id: 'rock_drift',
    name: 'Faster Drift',
    tab: 'scan',
    group: 'The Field',
    requires: { id: 'asteroid_max', level: 3 },
    baseCost: 150,
    scale: 1.4,
    maxLevel: 8,
    effect: (level) => level * 12,
    describe: (level) =>
      level <= 0 ? 'Rocks drift at their normal speed' : `Rocks drift faster: +${level * 12}`
  }),

  u({
    id: 'salvage_rights',
    name: 'Keep Cash On Warp',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 1200,
    scale: 1.55,
    maxLevel: 10,
    effect: (level) => Math.min(0.55, level * 0.055),
    describe: (level) => `Keep ${(Math.min(0.55, level * 0.055) * 100).toFixed(0)}% of your cash when you warp`
  }),
  u({
    id: 'veteran_picks',
    name: 'Forever Laser',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 1500,
    scale: 1.48,
    maxLevel: 15,
    effect: (level) => level * 2,
    describe: (level) => `Laser damage that survives warps: +${level * 2}`
  }),
  u({
    id: 'charter_hold',
    name: 'Forever Cargo',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 1800,
    scale: 1.5,
    maxLevel: 8,
    effect: (level) => level,
    describe: (level) => `Extra cargo that survives warps: +${level}`
  }),
  u({
    id: 'offline_ops',
    name: 'Night Shift',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2000,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => 0.42 + level * 0.055,
    describe: (level) => `Earn this much while the game is closed: ${((0.42 + level * 0.055) * 100).toFixed(0)}%`
  }),
  u({
    id: 'starting_capital',
    name: 'Warp Bonus Cash',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2200,
    scale: 1.6,
    maxLevel: 8,
    effect: (level) => Math.floor(20 * Math.pow(2.1, level)),
    describe: (level) =>
      level <= 0
        ? 'No extra cash when you warp'
        : `Cash gift on warp: $${Math.floor(20 * Math.pow(2.1, level)).toLocaleString('en-US')}`
  }),
  u({
    id: 'veteran_hulls',
    name: 'Forever Drill Health',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2400,
    scale: 1.5,
    maxLevel: 12,
    effect: (level) => level * 8,
    describe: (level) => `Drill health that survives warps: +${level * 8}`
  }),
  u({
    id: 'veteran_engines',
    name: 'Forever Drill Speed',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2600,
    scale: 1.5,
    maxLevel: 12,
    effect: (level) => level * 6,
    describe: (level) => `Drill speed that survives warps: +${level * 6}`
  }),
  u({
    id: 'veteran_optics',
    name: 'Forever Lucky Drills',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2600,
    scale: 1.52,
    maxLevel: 12,
    effect: (level) => level * 0.012,
    describe: (level) => `Lucky drill chance that survives warps: +${(level * 1.2).toFixed(1)}%`
  }),
  u({
    id: 'veteran_tether',
    name: 'Forever Magnet',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2500,
    scale: 1.48,
    maxLevel: 10,
    effect: (level) => level * 5,
    describe: (level) => `Magnet reach that survives warps: +${level * 5}`
  }),
  u({
    id: 'charter_yield',
    name: 'Forever Better Pay',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 2800,
    scale: 1.54,
    maxLevel: 12,
    effect: (level) => 1 + level * 0.08,
    describe: (level) => `Shard pay that survives warps: ×${(1 + level * 0.08).toFixed(2)}`
  }),
  u({
    id: 'expansion_scout',
    name: 'Cheaper Next Sector',
    tab: 'sector',
    group: 'Keep Forever',
    permanent: true,
    baseCost: 3000,
    scale: 1.56,
    maxLevel: 8,
    effect: (level) => Math.min(0.4, level * 0.05),
    describe: (level) => `Need ${(Math.min(0.4, level * 0.05) * 100).toFixed(0)}% less ore to unlock the next sector`
  })
];

const UPGRADE_HELP = {
  tap_damage: 'How hard each laser shot hits. Higher damage breaks rocks in fewer taps.',
  tap_rate: 'How long you wait after a shot before you can fire again. Lower is faster.',
  tap_radius: 'How close your tap needs to be to a rock. Bigger number means you can miss by more.',
  tap_chips: 'Shards can fall off while you are still shooting, not only when the rock breaks. Those shards are worth a bit less.',
  tap_crit: 'Chance for a laser hit to be a lucky hit and deal extra damage. Separate from lucky drill hits.',
  tap_splash: 'Part of the laser damage also hits rocks next to the one you tapped.',
  tap_combo: 'Each tap in a row makes the laser hit a little harder. Miss, and the streak resets.',
  tap_soften: 'Extra laser damage against the really tough rocks.',
  tap_lucky: 'When Early Shards already knocks a shard loose, this can drop one more.',
  tap_overcharge: 'Every so many laser shots, one of them is a huge blast.',
  tap_pierce: 'How far the shockwave reaches after you have Shockwave.',
  tap_multihit: 'A second nearby rock takes part of the shot. Needs Easier Aim first.',
  drone_max_count: 'Each level lets you fly one more drill at the same time.',
  drone_damage: 'How hard a drill hits a rock. Does not change how hard the rock hits back.',
  drone_hull: 'How much health a drill has. Each level is +5%. Rocks wear it down. Walls do not.',
  drone_speed: 'How fast drills fly.',
  launch_discount: 'Makes each drill launch cheaper.',
  drone_recoil: 'How much of a rock\'s punch a drill takes. Lower lasts longer. Does not make your hits weaker.',
  bounce_damp: 'How much speed a drill keeps after bouncing off a wall. Walls never cost health.',
  probe_crit: 'Chance for a drill hit to be a lucky hit. Laser lucky hits are a different upgrade.',
  probe_crit_dmg: 'How hard a lucky drill hit is, once Lucky Drill Hits is on.',
  bank_shot: 'After a wall bounce, the next rock hit deals bonus damage for a short moment.',
  auto_launch: 'Launches a drill on its own whenever a slot is free. You still pay the launch fee every time.',
  burst_launch: 'Shortens the wait after you buy a drill before you can buy another.',
  dual_launch: 'Chance to launch a second drill with the first, at half price.',
  scrap_rebate: 'When a drill dies, you get this percent of the launch fee back.',
  hull_regen: 'Flying drills slowly heal.',
  guidance: 'Drills steer toward rocks.',
  chain_shot: 'After hitting a rock, a drill can jump and hit another nearby rock.',
  probe_mass: 'A bigger drill is easier to ram into rocks.',
  collector_max: 'How many gold haulers you own. They pick up shards and dump them at REFINERY by themselves.',
  collector_speed: 'How fast haulers fly to shards and back to REFINERY.',
  collector_magnet: 'How far away a hauler can grab a shard.',
  hauler_agility: 'How quickly haulers turn. Helps them line up dumps and pickups.',
  collector_capacity: 'How many shards one hauler can carry before it must dump at REFINERY.',
  unload_speed: 'How fast a hauler empties shards once it is on the REFINERY pad.',
  depot_radius: 'How close a hauler has to be to REFINERY before it can dump.',
  value_seek: 'Haulers prefer the shards that are worth more money.',
  cargo_compress: 'Extra cargo space on top of Bigger Load.',
  return_boost: 'Haulers fly faster when they are heading back to dump.',
  depot_pull: 'Stronger magnet when a hauler is near REFINERY.',
  ore_value_mult: 'Each shard is worth more money when it dumps. Same number of shards, fatter paycheck.',
  rich_veins: 'Every rock starts at 2 shards. Richness adds more shards when the rock breaks.',
  rare_shift: 'New rocks are more likely to be the fancy kinds that pay more per shard. Not more shards — better shards.',
  chip_split: 'Hidden leftover from older saves. Extra shards stacked on Richness.',
  asteroid_max: 'How many rocks can be on the field at once.',
  asteroid_spawn_rate: 'How quickly a new rock shows up after one leaves.',
  survey_range: 'Grows the square field. Bigger field, more room to fly — the walls move out.',
  rock_drift: 'Rocks drift faster. More motion, easier to miss if you are sloppy.',
  salvage_rights: 'Keep this percent of your cash when you warp to the next sector. Stays forever.',
  veteran_picks: 'Extra laser damage that stays when you warp.',
  charter_hold: 'Extra cargo space that stays when you warp.',
  offline_ops: 'How much you still earn while the game is closed. Stays forever.',
  starting_capital: 'A cash gift when you warp to a new sector. Stays forever.',
  veteran_hulls: 'Extra drill health that stays when you warp.',
  veteran_engines: 'Extra drill speed that stays when you warp.',
  veteran_optics: 'Extra lucky-drill chance that stays when you warp.',
  veteran_tether: 'Extra magnet reach that stays when you warp.',
  charter_yield: 'Shards pay more, and this stays when you warp.',
  expansion_scout: 'You need less total ore before the next sector unlocks. Stays forever.'
};

for (const def of UPGRADE_DEFS) {
  def.help = UPGRADE_HELP[def.id] || def.help || '';
}

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, def]));

export const ASTEROID_TIERS = {
  common: {
    id: 'common',
    name: 'Common',
    baseHp: 20,
    radius: 26,
    color: '#94a3b8',
    yield: 2,
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
    yield: 2,
    unitValue: 7.5,
    drift: 42
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    baseHp: 380,
    radius: 42,
    color: '#cbd5e1',
    yield: 2,
    unitValue: 12.0
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    baseHp: 900,
    radius: 46,
    color: '#fbbf24',
    yield: 2,
    unitValue: 28.0
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    baseHp: 1400,
    radius: 44,
    color: '#e2e8f0',
    yield: 2,
    unitValue: 44.0
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    baseHp: 2000,
    radius: 52,
    color: '#a855f7',
    yield: 2,
    unitValue: 50.0
  },
  void: {
    id: 'void',
    name: 'Voidglass',
    baseHp: 5200,
    radius: 60,
    color: '#22d3ee',
    yield: 2,
    unitValue: 140.0
  },
  horizon: {
    id: 'horizon',
    name: 'Horizon Shard',
    baseHp: 9800,
    radius: 68,
    color: '#fb7185',
    yield: 2,
    unitValue: 260.0
  }
};

export const SECTORS = [
  {
    level: 1,
    name: 'Alpha Sector',
    short: 'Alpha',
    lore: 'A quiet gravel claim. Tap everything. Do not waste a drill yet.',
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
    lore: 'Buy Keep Forever upgrades before you warp.',
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
    lore: 'Voidglass sings when it breaks. Bring extra drill health.',
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
  const eventId = event && event.ttl > 0 ? event.id : null;
  const oreEvent = eventId === 'gold_rush' ? 2.15 : eventId === 'quiet' ? 1.45 : 1;
  const spawnEvent =
    eventId === 'meteor' ? 0.42 : eventId === 'dense' ? 0.55 : eventId === 'quiet' ? 1.55 : 1;
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
    launchDiscount: discount,
    launchCost: launchFee(0, discount),
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
    bankShot:
      lv('bank_shot') > 0 ? UPGRADE_BY_ID.bank_shot.effect(lv('bank_shot')) + bankEvent : 0,
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
    maxAsteroids: Math.min(
      TUNING.fieldCap,
      UPGRADE_BY_ID.asteroid_max.effect(lv('asteroid_max'))
    ),
    asteroidSpawnDelay: Math.max(
      0.16,
      UPGRADE_BY_ID.asteroid_spawn_rate.effect(lv('asteroid_spawn_rate')) * spawnEvent
    ),
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
    hpMult: sectorHpMult(sector.incomeMult),
    width: fieldSize(lv('survey_range')),
    height: fieldSize(lv('survey_range')),
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
  for (const def of UPGRADE_DEFS.filter((item) => item.tab === tab && !item.hidden)) {
    if (!map.has(def.group)) {
      const group = { title: def.group, blurb: GROUP_BLURBS[def.group] || '', items: [] };
      map.set(def.group, group);
      groups.push(group);
    }
    map.get(def.group).items.push(def);
  }
  return groups;
}

export function applyTuningToUpgrades() {
  const density = UPGRADE_BY_ID.asteroid_max;
  density.baseCost = TUNING.densityBaseCost;
  density.scale = TUNING.densityScale;
  density.maxLevel = Math.max(1, TUNING.fieldCap - TUNING.startRocks);
  const spawn = UPGRADE_BY_ID.asteroid_spawn_rate;
  spawn.baseCost = TUNING.spawnBaseCost;
  spawn.scale = TUNING.spawnScale;
  spawn.maxLevel = TUNING.spawnMaxLevel;
  const fleet = UPGRADE_BY_ID.drone_max_count;
  fleet.maxLevel = Math.max(1, TUNING.probeCap);
  const survey = UPGRADE_BY_ID.survey_range;
  survey.baseCost = TUNING.surveyBaseCost;
  survey.scale = TUNING.surveyScale;
  survey.maxLevel = TUNING.surveyMaxLevel;
}

export function sectorUnlockNeed(sector, stats) {
  return Math.floor(sector.unlock * (1 - (stats?.unlockCut || 0)));
}

applyTuningToUpgrades();
