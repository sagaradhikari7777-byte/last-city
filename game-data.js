const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  food: $('food'), power: $('power'), scrap: $('scrap'), population: $('population'),
  morale: $('morale'), moraleBar: $('moraleBar'), phaseLabel: $('phaseLabel'),
  phaseTimer: $('phaseTimer'), phaseDot: $('phaseDot'), techPoints: $('techPoints'),
  freeCrew: $('freeCrew'), forecastLabel: $('forecastLabel'), legacyShards: $('legacyShards'), hqHealth: $('hqHealth'), heroHealth: $('heroHealth'),
  enemyCount: $('enemyCount'), score: $('score'), kills: $('kills'), bossBanner: $('bossBanner'), bossName: $('bossName'), bossBar: $('bossBar'),
  pauseBtn: $('pauseBtn'), speedBtn: $('speedBtn'), techBtn: $('techBtn'), audioBtn: $('audioBtn'), helpBtn: $('helpBtn'),
  buildRail: $('buildRail'), selectionLabel: $('selectionLabel'), clearSelection: $('clearSelection'),
  inspectMode: $('inspectMode'), objectivePanel: $('objectivePanel'), toast: $('toast'),
  eventModal: $('eventModal'), eventIcon: $('eventIcon'), eventTitle: $('eventTitle'),
  eventText: $('eventText'), eventChoices: $('eventChoices'),
  inspectModal: $('inspectModal'), inspectName: $('inspectName'), inspectLevel: $('inspectLevel'),
  inspectHealth: $('inspectHealth'), inspectOutput: $('inspectOutput'), inspectDescription: $('inspectDescription'),
  upgradeBtn: $('upgradeBtn'), demolishBtn: $('demolishBtn'), closeInspect: $('closeInspect'),
  techModal: $('techModal'), techList: $('techList'), legacyList: $('legacyList'), legacyCount: $('legacyCount'), achievementList: $('achievementList'), closeTech: $('closeTech'),
  tutorialModal: $('tutorialModal'), startRunBtn: $('startRunBtn'),
  gameOverModal: $('gameOverModal'), gameOverTitle: $('gameOverTitle'),
  gameOverStats: $('gameOverStats'), restartBtn: $('restartBtn')
};

const SAVE_KEY = 'last-city-upgrade-v1';
const META_KEY = 'last-city-meta-v2';
const GRID = { cols: 9, rows: 11 };
const DAY_LENGTH = 46;
const NIGHT_LENGTH = 36;
const WEATHER_TYPES = ['Clear', 'Dust', 'Windy', 'Cloudy'];
let nextId = 1;
let layout = { w: 0, h: 0, cell: 32, ox: 0, oy: 0 };
let pointerCell = null;
let toastTimer = null;
let lastTime = performance.now();

const defs = {
  farm: { n: 'Hydro Farm', emoji: '🌱', cost: 30, crew: 2, hp: 100, food: 7, desc: 'Produces food each dawn.', color: '#65e3a6' },
  solar: { n: 'Solar Array', emoji: '☀️', cost: 34, crew: 2, hp: 92, power: 9, desc: 'Produces power every dawn.', color: '#73b8ff' },
  recycler: { n: 'Recycler', emoji: '♻️', cost: 44, crew: 3, hp: 112, scrap: 5, desc: 'Converts ruins into scrap.', color: '#b6f48c' },
  shelter: { n: 'Shelter', emoji: '🏠', cost: 48, crew: 0, hp: 124, pop: 5, desc: 'Increases population capacity.', color: '#ffcd6b' },
  tower: { n: 'Guard Tower', emoji: '🛡️', cost: 56, crew: 3, hp: 126, range: 3.2, dmg: 13, rate: .74, desc: 'Automatic ballistic defense.', color: '#ced7df' },
  tesla: { n: 'Tesla Coil', emoji: '⚡', cost: 86, crew: 4, hp: 102, range: 2.9, dmg: 22, rate: 1.05, desc: 'Consumes power for strong shocks.', color: '#73b8ff' },
  clinic: { n: 'Field Clinic', emoji: '🏥', cost: 72, crew: 3, hp: 106, heal: 3, desc: 'Repairs structures at dawn.', color: '#ff9bb7' },
  wall: { n: 'Barricade', emoji: '🧱', cost: 22, crew: 0, hp: 230, desc: 'Cheap durable obstacle.', color: '#9d8065' },
  hq: { n: 'City Core', emoji: '🏛️', cost: 0, crew: 0, hp: 430, desc: 'Keep it alive at all costs.', color: '#70f0b0' }
};

const enemyDefs = {
  crawler: { hp: 36, spd: .52, dmg: 8, r: .18, color: '#ff7b72' },
  runner: { hp: 28, spd: .82, dmg: 6, r: .16, color: '#ffb45d' },
  brute: { hp: 96, spd: .34, dmg: 16, r: .25, color: '#d97757' },
  spitter: { hp: 54, spd: .42, dmg: 10, r: .19, color: '#be7cff' },
  titan: { hp: 540, spd: .22, dmg: 30, r: .36, color: '#ff4d67', boss: true, name: 'THE TITAN' },
  broodmother: { hp: 430, spd: .27, dmg: 20, r: .34, color: '#d86cff', boss: true, name: 'BROODMOTHER' },
  warden: { hp: 680, spd: .18, dmg: 24, r: .38, color: '#62c9ff', boss: true, name: 'THE WARDEN' }
};

const techDefs = {
  agri: { n: 'Hydro Efficiency', max: 3, cost: (lvl) => lvl + 1, desc: 'Farms produce +15% food each level.' },
  grid: { n: 'Battery Grid', max: 3, cost: (lvl) => lvl + 1, desc: 'Solar arrays produce +15% power each level.' },
  armor: { n: 'Reinforced Hulls', max: 3, cost: (lvl) => lvl + 1, desc: 'All structures gain +12% max health each level.' },
  targeting: { n: 'Targeting Suite', max: 3, cost: (lvl) => lvl + 1, desc: 'Defenses gain damage and range bonuses.' },
  medics: { n: 'Crisis Protocols', max: 2, cost: (lvl) => lvl + 2, desc: 'Clinics restore extra health and morale.' }
};

const objectiveDefs = [
  { id: 'defense', text: 'Build 2 defenses', reward: '+1 tech', check: s => countDefense(s) >= 2, award: s => { s.tech += 1; } },
  { id: 'population', text: 'Reach 18 survivors', reward: '+40 scrap', check: s => s.pop >= 18, award: s => { s.scrap += 40; } },
  { id: 'survive5', text: 'Survive to day 5', reward: '+2 tech, +60 scrap', check: s => s.day >= 5, award: s => { s.tech += 2; s.scrap += 60; } }
];

const legacyDefs = {
  stockpile: { n: 'Emergency Stockpile', max: 4, cost: lvl => 2 + lvl * 2, desc: 'Start each run with +18 scrap and +8 food per level.' },
  vanguard: { n: 'Vanguard Training', max: 4, cost: lvl => 2 + lvl * 2, desc: 'Rook gains +20 HP and +12% damage per level.' },
  fortified: { n: 'Core Engineering', max: 4, cost: lvl => 3 + lvl * 2, desc: 'All structures gain +8% max HP per level.' }
};

const achievementDefs = [
  { id: 'dawn', name: 'First Dawn', desc: 'Survive your first night.', check: s => s.day >= 2 },
  { id: 'builder', name: 'City Planner', desc: 'Own 10 structures at once.', check: s => s.buildings.length >= 10 },
  { id: 'slayer', name: 'Pest Control', desc: 'Defeat 50 enemies in one run.', check: s => s.kills >= 50 },
  { id: 'boss', name: 'Giant Killer', desc: 'Defeat any boss.', check: s => s.bossesKilled >= 1 },
  { id: 'ten', name: 'Still Standing', desc: 'Reach day 10.', check: s => s.day >= 10 },
  { id: 'crowded', name: 'Beacon of Hope', desc: 'Reach 25 survivors.', check: s => s.pop >= 25 }
];

const biomeDefs = {
  ruins: { name: 'Green Ruins', top: '#17231f', bottom: '#08110f', accent: '#76b6a8', farm: 1, power: 1, scrap: 1 },
  ash: { name: 'Ash Quarter', top: '#2a201b', bottom: '#0e0b0a', accent: '#c28e6a', farm: .88, power: 1.05, scrap: 1.18 },
  storm: { name: 'Storm District', top: '#101d2a', bottom: '#071019', accent: '#78a7c9', farm: 1.08, power: .82, scrap: 1.05 }
};
const biomeKeys = Object.keys(biomeDefs);
