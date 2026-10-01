function freshState() {
  const startBonus = meta.perks.stockpile || 0;
  const s = {
    day: 1,
    phase: 'day',
    time: DAY_LENGTH,
    food: 80 + startBonus * 8,
    power: 72,
    scrap: 138 + startBonus * 18,
    pop: 12,
    morale: 72,
    tech: 1,
    score: 0,
    kills: 0,
    bossesKilled: 0,
    paused: false,
    speed: 1,
    selected: null,
    inspect: false,
    inspected: null,
    eventOpen: false,
    techOpen: false,
    gameOver: false,
    weather: WEATHER_TYPES[0],
    biome: biomeForDay(1),
    tutorialSeen: meta.tutorialSeen,
    bossSpawned: false,
    metaRewarded: false,
    hero: { x: 4.5, y: 5.5, hp: heroMaxHp(1), maxHp: heroMaxHp(1), level: 1, xp: 0, cd: 0, down: false },
    buildings: [makeBuilding('hq', 4, 5)],
    enemies: [],
    shots: [],
    particles: [],
    civilians: [],
    objectives: objectiveDefs.map(o => ({ id: o.id, claimed: false })),
    techs: { agri: 0, grid: 0, armor: 0, targeting: 0, medics: 0 },
    spawnClock: 0
  };
  syncCivilians(s);
  return s;
}

function makeBuilding(type, x, y) {
  const d = defs[type];
  return { id: nextId++, type, x, y, level: 1, hp: baseBuildingHp(type, 1, null), maxHp: baseBuildingHp(type, 1, null), cd: 0 };
}

function baseBuildingHp(type, level, s) {
  const armor = s ? s.techs.armor : 0;
  const techMult = 1 + armor * 0.12;
  const legacyMult = 1 + (meta.perks.fortified || 0) * .08;
  return Math.round(defs[type].hp * (1 + (level - 1) * 0.34) * techMult * legacyMult);
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.buildings)) return null;
    nextId = Math.max(1, ...saved.buildings.map(b => b.id || 0), ...(saved.enemies || []).map(e => e.id || 0)) + 1;
    const s = Object.assign(freshState(), saved);
    s.objectives = objectiveDefs.map(def => { const old = (saved.objectives || []).find(o => o.id === def.id); return { id: def.id, claimed: !!old?.claimed }; });
    s.hero = Object.assign({ x: 4.5, y: 5.5, hp: heroMaxHp(1), maxHp: heroMaxHp(1), level: 1, xp: 0, cd: 0, down: false }, saved.hero || {});
    s.hero.maxHp = heroMaxHp(s.hero.level); s.hero.hp = Math.min(s.hero.hp || s.hero.maxHp, s.hero.maxHp);
    s.biome = saved.biome || biomeForDay(s.day);
    s.bossesKilled = saved.bossesKilled || 0;
    s.bossSpawned = false;
    s.enemies = [];
    s.shots = [];
    s.particles = [];
    s.civilians = [];
    s.paused = false;
    s.eventOpen = false;
    s.techOpen = false;
    s.gameOver = false;
    s.selected = null;
    s.inspect = false;
    s.inspected = null;
    normalizeBuildingHealth(s);
    syncCivilians(s);
    return s;
  } catch {
    return null;
  }
}

let state;

function normalizeBuildingHealth(s) {
  for (const b of s.buildings) {
    b.maxHp = baseBuildingHp(b.type, b.level, s);
    b.hp = Math.min(b.maxHp, Math.max(1, b.hp || b.maxHp));
    b.cd = b.cd || 0;
  }
}

function saveState() {
  if (state.gameOver) return;
  const snapshot = JSON.stringify({
    ...state,
    enemies: [], shots: [], particles: [], civilians: [], paused: false, eventOpen: false,
    techOpen: false, selected: null, inspect: false, inspected: null
  });
  try { localStorage.setItem(SAVE_KEY, snapshot); } catch {}
}

function haptic(ms = 10) { try { navigator.vibrate?.(ms); } catch {} }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }

function showToast(text, bad = false) {
  ui.toast.textContent = text;
  ui.toast.style.borderColor = bad ? 'rgba(255,111,120,.45)' : 'rgba(255,255,255,.1)';
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1500);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cell = Math.min(rect.width / GRID.cols, rect.height / GRID.rows);
  layout = {
    w: rect.width,
    h: rect.height,
    cell,
    ox: (rect.width - cell * GRID.cols) / 2,
    oy: (rect.height - cell * GRID.rows) / 2
  };
}

function maxPopulation() {
  return 12 + state.buildings.reduce((sum, b) => sum + (defs[b.type].pop || 0) * b.level, 0);
}

function usedCrew() {
  return state.buildings.reduce((sum, b) => sum + (defs[b.type].crew || 0) * b.level, 0);
}

function freeCrew() {
  return Math.max(0, state.pop - usedCrew());
}

function countDefense(s = state) {
  return s.buildings.filter(b => b.type === 'tower' || b.type === 'tesla').length;
}

function threatLabel() {
  if (state.day >= 8) return 'Severe';
  if (state.day >= 5) return 'High';
  if (state.day >= 3) return 'Medium';
  return 'Low';
}

function currentHQ() {
  return state.buildings.find(b => b.type === 'hq');
}

function buildingAt(x, y) {
  return state.buildings.find(b => b.x === x && b.y === y);
}

function syncCivilians(s = state) {
  const count = Math.min(18, s.pop);
  while (s.civilians.length < count) {
    const base = s.buildings[Math.floor(Math.random() * s.buildings.length)] || { x: 4, y: 5 };
    s.civilians.push({ x: base.x + .5 + rand(-.2, .2), y: base.y + .5 + rand(-.2, .2), tx: base.x + .5, ty: base.y + .5, speed: rand(.2, .42) });
  }
  s.civilians.length = count;
}

function updateCivilians(dt) {
  syncCivilians();
  for (const c of state.civilians) {
    if (Math.hypot(c.tx - c.x, c.ty - c.y) < .08) {
      const b = state.buildings[Math.floor(Math.random() * state.buildings.length)] || { x: 4, y: 5 };
      c.tx = b.x + .5 + rand(-.18, .18);
      c.ty = b.y + .5 + rand(-.18, .18);
    }
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.hypot(dx, dy) || 1;
    c.x += dx / dist * c.speed * dt;
    c.y += dy / dist * c.speed * dt;
  }
}
