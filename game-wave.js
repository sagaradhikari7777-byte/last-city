function startNight() {
  state.phase = 'night';
  state.time = NIGHT_LENGTH;
  state.spawnClock = .2;
  state.bossSpawned = false;
  state.selected = null;
  pointerCell = null;
  refreshSelectionUI();
  showToast(`Night ${state.day} — defend the Core!`);
  ensureAudio(); tone(110,.14,.03,'triangle'); haptic(24);
}

function startDay() {
  state.day += 1;
  state.phase = 'day';
  state.time = DAY_LENGTH;
  state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
  state.biome = biomeForDay(state.day);
  state.hero.down = false; state.hero.maxHp = heroMaxHp(state.hero.level); state.hero.hp = state.hero.maxHp; state.hero.x = 4.5; state.hero.y = 5.5;

  const dawnBonus = state.day % 2 === 0 ? 1 : 0;
  state.tech += dawnBonus;

  for (const b of state.buildings) {
    const d = defs[b.type];
    const lv = b.level;
    if (d.food) state.food += d.food * lv * farmMult();
    if (d.power) state.power += d.power * lv * gridMult();
    if (d.scrap) state.scrap += d.scrap * lv * biomeDefs[state.biome].scrap;
    if (d.heal) {
      for (const other of state.buildings) {
        other.hp = Math.min(other.maxHp, other.hp + d.heal * lv * 4 * healMult());
      }
      state.morale = clamp(state.morale + 2 * state.techs.medics, 0, 100);
    }
  }

  const cap = maxPopulation();
  state.pop = Math.min(cap, state.pop + 1);
  const needFood = Math.max(5, Math.round(state.pop * .65));
  if (state.food >= needFood) {
    state.food -= needFood;
    state.morale = clamp(state.morale + 3, 0, 100);
  } else {
    state.food = 0;
    state.morale = clamp(state.morale - 14, 0, 100);
    state.pop = Math.max(1, state.pop - 1);
    showToast('Food shortage — survivor lost', true);
  }

  state.scrap += 10 + state.day * 2;
  state.score += state.day * 20;
  syncCivilians();
  checkObjectives();
  saveState();

  if (state.day % 3 === 0) {
    setTimeout(openRandomEvent, 420);
  } else {
    showToast(`Dawn ${state.day} · ${biomeDefs[state.biome].name} · ${state.weather.toLowerCase()}`);
  }
}

function openRandomEvent() {
  if (state.eventOpen || state.gameOver) return;
  const e = events[Math.floor(Math.random() * events.length)];
  state.eventOpen = true;
  ui.eventIcon.textContent = e.i;
  ui.eventTitle.textContent = e.t;
  ui.eventText.textContent = e.x;
  ui.eventChoices.innerHTML = '';
  e.a.forEach(([label, desc, action]) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<b>${label}</b><small>${desc}</small>`;
    btn.onclick = () => {
      action(state);
      state.morale = clamp(state.morale, 0, 100);
      state.food = Math.max(0, state.food);
      state.power = Math.max(0, state.power);
      state.eventOpen = false;
      ui.eventModal.classList.add('hidden');
      checkObjectives();
      saveState();
      haptic(14);
    };
    ui.eventChoices.appendChild(btn);
  });
  ui.eventModal.classList.remove('hidden');
}

function spawnEnemy() {
  const bossTypes = ['titan', 'broodmother', 'warden'];
  const bossWindow = state.day % 5 === 0 && !state.bossSpawned && state.time < NIGHT_LENGTH * .65;
  const type = bossWindow
    ? bossTypes[(Math.floor(state.day / 5) - 1) % bossTypes.length]
    : ['crawler', 'crawler', 'runner', state.day > 2 ? 'brute' : 'crawler', state.day > 3 ? 'spitter' : 'runner'][Math.floor(Math.random() * 5)];
  if (bossWindow) { state.bossSpawned = true; sfx('boss'); showToast(`${enemyDefs[type].name} incoming!`, true); }
  const def = enemyDefs[type];
  const edge = Math.floor(Math.random() * 4);
  const x = edge === 0 ? -.3 : edge === 1 ? GRID.cols - .7 : rand(0, GRID.cols - 1);
  const y = edge === 2 ? -.3 : edge === 3 ? GRID.rows - .7 : rand(0, GRID.rows - 1);
  const scale = 1 + (state.day - 1) * .1;
  state.enemies.push({ id: nextId++, type, x, y, hp: def.hp * scale, maxHp: def.hp * scale, atk: 0, special: 2.5, shield: type === 'warden' ? 1 : 0, lastHit: null });
}

function targetForEnemy(enemy) {
  let best = null;
  let bestDist = 1e9;
  for (const b of state.buildings) {
    const dist = Math.hypot(b.x + .5 - enemy.x, b.y + .5 - enemy.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }
  return [best, bestDist];
}
