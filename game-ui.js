function renderBuildRail() {
  ui.buildRail.innerHTML = '';
  Object.entries(defs).filter(([k]) => k !== 'hq').forEach(([key, d]) => {
    const btn = document.createElement('button');
    btn.className = 'build-card';
    btn.dataset.type = key;
    btn.innerHTML = `<span class="emoji">${d.emoji}</span><b>${d.n}</b><small>${d.crew ? d.crew + ' crew' : 'no crew'}</small><span class="cost-badge">🔩 ${d.cost}</span>`;
    btn.onclick = () => {
      state.selected = state.selected === key ? null : key;
      state.inspect = false;
      pointerCell = null;
      refreshSelectionUI();
      haptic();
    };
    ui.buildRail.appendChild(btn);
  });
  refreshSelectionUI();
}

function refreshSelectionUI() {
  document.querySelectorAll('.build-card').forEach(el => el.classList.toggle('selected', el.dataset.type === state.selected));
  ui.selectionLabel.textContent = state.selected ? defs[state.selected].n : 'Choose a structure';
  ui.inspectMode.classList.toggle('active', !!state.inspect);
}

function renderObjectives() {
  const lines = [`<div class="objective-title"><span>Missions</span><span>Rewards</span></div>`];
  for (const obj of state.objectives) {
    const def = objectiveDefs.find(d => d.id === obj.id);
    if (!def) continue;
    lines.push(`<div class="objective-item ${obj.claimed ? 'done' : ''}"><span class="bullet">${obj.claimed ? '✓' : '•'}</span><span>${def.text}</span><span style="margin-left:auto;color:#9fb2ab">${def.reward}</span></div>`);
  }
  ui.objectivePanel.innerHTML = lines.join('');
}

function checkObjectives() {
  for (const obj of state.objectives) {
    const def = objectiveDefs.find(d => d.id === obj.id);
    if (!def) continue;
    const done = def.check(state);
    if (done && !obj.claimed) {
      obj.claimed = true;
      def.award(state);
      showToast(`Mission complete: ${def.reward}`);
      sfx('reward'); haptic(18);
    }
  }
  checkAchievements();
  renderObjectives();
}

function outputText(b) {
  const d = defs[b.type];
  if (d.food) return `+${Math.round(d.food * b.level)} food`;
  if (d.power) return `+${Math.round(d.power * b.level)} power`;
  if (d.scrap) return `+${Math.round(d.scrap * b.level)} scrap`;
  if (d.pop) return `+${d.pop * b.level} cap`;
  if (d.heal) return `Repair ${d.heal * b.level}/dawn`;
  if (d.dmg) return `${Math.round(defenseDamage(b))} dmg`;
  return 'Support';
}

function openInspect(id) {
  const b = state.buildings.find(x => x.id === id);
  if (!b) return;
  state.inspected = id;
  const d = defs[b.type];
  ui.inspectName.textContent = d.n;
  ui.inspectLevel.textContent = String(b.level);
  ui.inspectHealth.textContent = `${Math.round((b.hp / b.maxHp) * 100)}%`;
  ui.inspectOutput.textContent = outputText(b);
  ui.inspectDescription.textContent = d.desc;
  ui.upgradeBtn.disabled = b.type === 'hq' || b.level >= 4;
  ui.demolishBtn.disabled = b.type === 'hq';
  ui.inspectModal.classList.remove('hidden');
}

function closeInspect() {
  state.inspected = null;
  ui.inspectModal.classList.add('hidden');
}

function renderTechModal() {
  const html = [];
  for (const [key, tech] of Object.entries(techDefs)) {
    const level = state.techs[key];
    const maxed = level >= tech.max;
    const cost = tech.cost(level);
    html.push(`
      <button class="tech-card-btn ${maxed ? 'maxed' : ''}" data-tech="${key}">
        <div>
          <b>${tech.n}</b>
          <small>${tech.desc}</small>
        </div>
        <div class="right">
          <div>Lv ${level}/${tech.max}</div>
          <div>${maxed ? 'MAX' : cost + ' tech'}</div>
        </div>
      </button>`);
  }
  ui.techList.innerHTML = html.join('');
  ui.techList.querySelectorAll('[data-tech]').forEach(btn => { btn.onclick = () => purchaseTech(btn.dataset.tech); });

  ui.legacyCount.textContent = String(meta.shards);
  const legacyHtml = [];
  for (const [key, perk] of Object.entries(legacyDefs)) {
    const level = meta.perks[key] || 0; const maxed = level >= perk.max; const cost = perk.cost(level);
    legacyHtml.push(`<button class="tech-card-btn ${maxed ? 'maxed' : ''}" data-legacy="${key}"><div><b>${perk.n}</b><small>${perk.desc}</small></div><div class="right"><div>Lv ${level}/${perk.max}</div><div>${maxed ? 'MAX' : '◆ ' + cost}</div></div></button>`);
  }
  ui.legacyList.innerHTML = legacyHtml.join('');
  ui.legacyList.querySelectorAll('[data-legacy]').forEach(btn => { btn.onclick = () => purchaseLegacy(btn.dataset.legacy); });

  ui.achievementList.innerHTML = achievementDefs.map(a => {
    const unlocked = !!meta.achievements[a.id];
    return `<div class="achievement-row ${unlocked ? '' : 'locked'}"><span class="badge">${unlocked ? '✓' : '◇'}</span><div><b>${a.name}</b><small>${a.desc}${unlocked ? ' · unlocked' : ''}</small></div></div>`;
  }).join('');
}

function openTech() {
  renderTechModal();
  state.techOpen = true;
  ui.techModal.classList.remove('hidden');
}

function closeTech() {
  state.techOpen = false;
  ui.techModal.classList.add('hidden');
}

function purchaseLegacy(key) {
  const perk = legacyDefs[key]; const level = meta.perks[key] || 0;
  if (!perk || level >= perk.max) return;
  const cost = perk.cost(level);
  if (meta.shards < cost) return showToast('Not enough Legacy shards', true);
  meta.shards -= cost; meta.perks[key] = level + 1; saveMeta();
  normalizeBuildingHealth(state);
  if (key === 'vanguard') { state.hero.maxHp = heroMaxHp(state.hero.level); state.hero.hp = state.hero.maxHp; }
  renderTechModal(); refreshHUD(); showToast(`${perk.n} unlocked`); sfx('reward'); haptic(15);
}

function checkAchievements() {
  let changed = false;
  for (const a of achievementDefs) {
    if (!meta.achievements[a.id] && a.check(state)) {
      meta.achievements[a.id] = true; meta.shards += 1; changed = true;
      showToast(`Achievement: ${a.name} · +1 Legacy`); sfx('reward');
    }
  }
  if (changed) saveMeta();
}

function purchaseTech(key) {
  const tech = techDefs[key];
  const level = state.techs[key];
  if (level >= tech.max) return;
  const cost = tech.cost(level);
  if (state.tech < cost) {
    showToast('Not enough tech points', true);
    return;
  }
  state.tech -= cost;
  state.techs[key]++;
  normalizeBuildingHealth(state);
  renderTechModal();
  refreshHUD();
  showToast(`${tech.n} upgraded`);
  haptic(14);
  saveState();
}

function canAfford(type) {
  const d = defs[type];
  return state.scrap >= d.cost && freeCrew() >= d.crew;
}

function placeBuilding(type, x, y) {
  const d = defs[type];
  if (state.phase !== 'day') return showToast('Build during daylight', true);
  if (buildingAt(x, y)) return showToast('Tile occupied', true);
  if (state.scrap < d.cost) return showToast('Not enough scrap', true);
  if (freeCrew() < d.crew) return showToast('Not enough free crew', true);
  const b = makeBuilding(type, x, y);
  normalizeBuildingHealth(state);
  b.maxHp = baseBuildingHp(type, 1, state);
  b.hp = b.maxHp;
  state.scrap -= d.cost;
  state.buildings.push(b);
  state.score += d.cost;
  if (type === 'shelter') state.pop = Math.min(maxPopulation(), state.pop + 1);
  syncCivilians();
  showToast(`${d.n} constructed`);
  sfx('build'); haptic(14);
  checkObjectives();
  saveState();
}

function upgradeBuilding(id) {
  const b = state.buildings.find(x => x.id === id);
  if (!b || b.type === 'hq' || b.level >= 4) return;
  const d = defs[b.type];
  const cost = Math.round(d.cost * (.65 + .3 * b.level));
  if (state.scrap < cost) return showToast('Not enough scrap', true);
  if (freeCrew() < d.crew) return showToast('Need more free crew', true);
  state.scrap -= cost;
  b.level += 1;
  b.maxHp = baseBuildingHp(b.type, b.level, state);
  b.hp = b.maxHp;
  openInspect(id);
  showToast(`${d.n} upgraded`);
  haptic(16);
  saveState();
}

function demolishBuilding(id) {
  const index = state.buildings.findIndex(x => x.id === id);
  if (index < 0) return;
  const b = state.buildings[index];
  if (b.type === 'hq') return;
  state.scrap += Math.round(defs[b.type].cost * .4 * b.level);
  state.buildings.splice(index, 1);
  state.pop = Math.min(state.pop, maxPopulation());
  closeInspect();
  syncCivilians();
  showToast('Structure dismantled');
  saveState();
}

function farmMult() { return (1 + state.techs.agri * 0.15) * biomeDefs[state.biome].farm; }
function gridMult() { return (1 + state.techs.grid * 0.15) * biomeDefs[state.biome].power; }
function healMult() { return 1 + state.techs.medics * 0.35; }
function defenseRange(b) { return (defs[b.type].range || 0) * (1 + state.techs.targeting * 0.05) + (b.level - 1) * 0.25; }
function defenseDamage(b) { return defs[b.type].dmg * (1 + state.techs.targeting * 0.15) * (1 + (b.level - 1) * 0.35); }
