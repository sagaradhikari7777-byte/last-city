function tickEnemies(dt) {
  state.spawnClock -= dt;
  if (state.spawnClock <= 0 && state.time > 2) {
    spawnEnemy();
    state.spawnClock = Math.max(.46, 1.72 - state.day * .07);
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    const def = enemyDefs[enemy.type];
    enemy.special = (enemy.special || 0) - dt;
    if (enemy.type === 'broodmother' && enemy.special <= 0 && state.enemies.length < 45) {
      for (let k = 0; k < 2; k++) { const d = enemyDefs.runner; state.enemies.push({ id: nextId++, type: 'runner', x: enemy.x + rand(-.15,.15), y: enemy.y + rand(-.15,.15), hp: d.hp * (1 + state.day*.07), maxHp: d.hp * (1 + state.day*.07), atk: 0, special: 0, shield: 0, lastHit: null }); }
      enemy.special = 4.2;
    }
    if (enemy.type === 'warden' && enemy.special <= 0) { enemy.shield = enemy.shield ? 0 : 1; enemy.special = 3.8; }
    const [target, dist] = targetForEnemy(enemy);
    if (!target) continue;

    if (dist < .46) {
      enemy.atk -= dt;
      if (enemy.atk <= 0) {
        target.hp -= def.dmg * (1 + state.day * .035);
        sfx('hurt'); enemy.atk = 1.05;
        if (target.hp <= 0) {
          if (target.type === 'hq') {
            gameOver();
            return;
          }
          state.buildings = state.buildings.filter(b => b.id !== target.id);
          syncCivilians();
          showToast(`${defs[target.type].n} destroyed`, true);
        }
      }
    } else {
      enemy.x += ((target.x + .5 - enemy.x) / dist) * def.spd * dt;
      enemy.y += ((target.y + .5 - enemy.y) / dist) * def.spd * dt;
    }

    if (enemy.hp <= 0) {
      const boss = !!def.boss;
      state.kills += 1;
      state.scrap += boss ? 52 : 2 + Math.floor(Math.random() * 3);
      if (boss) { state.tech += 1; state.bossesKilled += 1; meta.shards += 1; saveMeta(); }
      if (enemy.lastHit === 'hero') { state.hero.xp += boss ? 24 : 3; while (state.hero.xp >= state.hero.level * 18) { state.hero.xp -= state.hero.level * 18; state.hero.level += 1; state.hero.maxHp = heroMaxHp(state.hero.level); state.hero.hp = state.hero.maxHp; showToast(`Rook reached level ${state.hero.level}`); } }
      state.score += boss ? 280 : 12;
      burst(enemy.x, enemy.y, def.color, boss ? 18 : 10);
      state.enemies.splice(i, 1);
      checkAchievements();
    }
  }
}

function tickDefenses(dt) {
  for (const b of state.buildings) {
    const d = defs[b.type];
    if (!d.dmg) continue;
    b.cd -= dt;
    if (b.cd > 0) continue;
    const range = defenseRange(b);
    let target = null;
    let bestDist = range;
    for (const enemy of state.enemies) {
      const dist = Math.hypot(enemy.x - (b.x + .5), enemy.y - (b.y + .5));
      if (dist < bestDist) {
        bestDist = dist;
        target = enemy;
      }
    }
    if (!target) continue;
    const costPower = b.type === 'tesla' ? .55 : .25;
    if (state.power < costPower) continue;
    state.power = Math.max(0, state.power - costPower);
    const dmg = defenseDamage(b) * (target.type === 'warden' && target.shield ? .45 : 1);
    target.hp -= dmg; target.lastHit = 'tower';
    state.shots.push({ x: b.x + .5, y: b.y + .5, tx: target.x, ty: target.y, life: .14, color: b.type === 'tesla' ? '#73b8ff' : '#ffcd6b' });
    b.cd = d.rate / (1 + (b.level - 1) * .12);
    sfx(b.type === 'tesla' ? 'tesla' : 'shot');
  }
}

function tickHero(dt) {
  const h = state.hero;
  if (!h || h.down) return;
  h.cd -= dt;
  let target = null; let dist = 99;
  for (const e of state.enemies) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < dist) { dist = d; target = e; } }
  if (state.phase === 'night' && target) {
    if (dist > 2.35) { h.x += (target.x - h.x) / dist * .62 * dt; h.y += (target.y - h.y) / dist * .62 * dt; }
    if (dist < 2.75 && h.cd <= 0) { const mult = target.type === 'warden' && target.shield ? .55 : 1; target.hp -= heroDamage() * mult; target.lastHit = 'hero'; state.shots.push({ x: h.x, y: h.y, tx: target.x, ty: target.y, life: .12, color: '#70f0b0' }); h.cd = .52; sfx('shot'); }
    if (dist < .42) { h.hp -= enemyDefs[target.type].dmg * .18 * dt; if (h.hp <= 0) { h.hp = 0; h.down = true; showToast('Rook is down until dawn', true); } }
  } else {
    const homeX = 4.5, homeY = 5.5; const d = Math.hypot(homeX - h.x, homeY - h.y);
    if (d > .05) { h.x += (homeX - h.x) / d * .4 * dt; h.y += (homeY - h.y) / d * .4 * dt; }
  }
}

function burst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    state.particles.push({ x, y, vx: rand(-1.2, 1.2), vy: rand(-1.2, 1.2), life: rand(.3, .8), maxLife: .8, color });
  }
}

function tickFX(dt) {
  for (const s of state.shots) s.life -= dt;
  state.shots = state.shots.filter(s => s.life > 0);
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function update(dt) {
  if (state.paused || state.eventOpen || state.techOpen || state.gameOver) return;
  dt *= state.speed;
  state.time -= dt;
  updateCivilians(dt);
  tickHero(dt);
  if (state.phase === 'night') {
    tickEnemies(dt);
    tickDefenses(dt);
  }
  tickFX(dt);
  if (state.time <= 0) {
    if (state.phase === 'day') {
      startNight();
    } else if (state.enemies.length === 0) {
      startDay();
    } else {
      state.time = 0;
    }
  }
  if (state.phase === 'night' && state.time === 0 && state.enemies.length === 0) startDay();
}

function refreshHUD() {
  ui.food.textContent = Math.floor(state.food);
  ui.power.textContent = Math.floor(state.power);
  ui.scrap.textContent = Math.floor(state.scrap);
  ui.population.textContent = `${state.pop}/${maxPopulation()}`;
  ui.morale.textContent = `${Math.round(state.morale)}%`;
  ui.moraleBar.style.width = `${Math.max(0, state.morale)}%`;
  ui.techPoints.textContent = String(state.tech);
  ui.freeCrew.textContent = String(freeCrew());
  ui.forecastLabel.textContent = threatLabel();
  ui.legacyShards.textContent = String(meta.shards);
  ui.heroHealth.textContent = state.hero.down ? 'DOWN' : `${Math.round(state.hero.hp / state.hero.maxHp * 100)}%`;
  ui.audioBtn.textContent = meta.sound ? '🔊' : '🔇';
  ui.phaseLabel.textContent = `${state.phase.toUpperCase()} ${state.day}`;
  ui.phaseTimer.textContent = `00:${String(Math.ceil(state.time)).padStart(2, '0')}`;
  ui.phaseDot.style.background = state.phase === 'day' ? '#ffcd6b' : '#73b8ff';
  const hq = currentHQ();
  ui.hqHealth.textContent = hq ? `${Math.max(0, Math.round(hq.hp / hq.maxHp * 100))}%` : '0%';
  ui.enemyCount.textContent = String(state.enemies.length);
  ui.score.textContent = String(Math.round(state.score));
  ui.kills.textContent = String(state.kills);
  ui.pauseBtn.textContent = state.paused ? '▶' : 'Ⅱ';
  ui.speedBtn.textContent = `${state.speed}×`;
  const boss = state.enemies.find(e => enemyDefs[e.type].boss);
  ui.bossBanner.classList.toggle('hidden', !boss);
  if (boss) { ui.bossName.textContent = enemyDefs[boss.type].name; ui.bossBar.style.width = `${clamp(boss.hp / boss.maxHp * 100,0,100)}%`; }
}
