function drawCivilians() {
  const t = performance.now() * 0.001;
  for (let i = 0; i < state.civilians.length; i++) {
    const c = state.civilians[i];
    const p = worldToCanvas(c.x, c.y);
    const bob = Math.sin(t * 6 + i) * 0.6;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 5, 3.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ['#e7f7f2', '#f8e4d7', '#d7e5f9'][i % 3];
    ctx.beginPath();
    ctx.arc(p.x, p.y - 1 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 1 + bob);
    ctx.lineTo(p.x, p.y + 5 + bob);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHero() {
  const h = state.hero; if (!h) return;
  const p = worldToCanvas(h.x, h.y);
  const r = Math.max(6, layout.cell * .16);
  const t = performance.now() * 0.001;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.24)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 7, r * .95, r * .4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = h.down ? .35 : 1;
  drawGlow(p.x, p.y, r * 2.2, 'rgb(112,240,176)', .12 + .06 * Math.sin(t * 6));
  ctx.fillStyle = '#70f0b0';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 4, r * .55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#193930';
  roundedRect(p.x - r * .65, p.y - 1, r * 1.3, r * 1.7, 4);
  ctx.fill();
  ctx.strokeStyle = '#b5f9d8';
  ctx.beginPath();
  ctx.moveTo(p.x + r * .2, p.y + 2);
  ctx.lineTo(p.x + r * 1.2, p.y - 2 + Math.sin(t * 12) * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#ffcd6b';
  ctx.beginPath();
  ctx.arc(p.x + r * 1.25, p.y - 2 + Math.sin(t * 12) * 1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!h.down) {
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(p.x-r, p.y-r-10, r*2, 4);
    ctx.fillStyle='#70f0b0'; ctx.fillRect(p.x-r, p.y-r-10, r*2*(h.hp/h.maxHp), 4);
  }
}

function drawEnemyBody(e, p, r, t) {
  const def = enemyDefs[e.type];
  ctx.save();
  ctx.shadowColor = def.color;
  ctx.shadowBlur = enemyDefs[e.type].boss ? 16 : 9;
  ctx.fillStyle = def.color;
  if (e.type === 'runner') {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r);
    ctx.lineTo(p.x + r * .95, p.y + r * .9);
    ctx.lineTo(p.x - r * .95, p.y + r * .9);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'spitter') {
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + t * .5;
      const rr = i % 2 ? r * .72 : r;
      const px = p.x + Math.cos(a) * rr;
      const py = p.y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'broodmother') {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.15, r * .92, Math.sin(t * 2 + e.id) * .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(p.x + s * r * .65, p.y + 1);
      ctx.lineTo(p.x + s * r * 1.15, p.y + r * .8);
      ctx.stroke();
    }
  } else if (e.type === 'warden') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (e.shield) {
      ctx.strokeStyle = 'rgba(183,236,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // facial details
  ctx.fillStyle = 'rgba(20,8,12,.58)';
  ctx.beginPath();
  ctx.arc(p.x - r * .22, p.y - r * .1, Math.max(1.4, r * .15), 0, Math.PI * 2);
  ctx.arc(p.x + r * .22, p.y - r * .1, Math.max(1.4, r * .15), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.moveTo(p.x - r * .32, p.y + r * .2);
  ctx.fineTo(p.x + r * .32, p.y + r * .18);
  ctx.stroke();
}

function drawEnemies() {
  const t = performance.now() * 0.001;
  for (const e of state.enemies) {
    const p = worldToCanvas(e.x, e.y);
    const def = enemyDefs[e.type];
    const r = layout.cell * def.r;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * .9, r * .9, r * .4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEnemyBody(e, p, r, t);

    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(p.x - r, p.y - r - 8, r * 2, 4);
      ctx.fillStyle = def.boss ? '#ff9ab0' : '#ff8a7e';
      ctx.fillRect(p.x - r, p.y - r - 8, r * 2 * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }
}

function drawShotsAndFX() {
  for (const s of state.shots) {
    const a = worldToCanvas(s.x, s.y);
    const b = worldToCanvas(s.tx, s.ty);
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.color === '#73b8ff' ? 2.8 : 2.3;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of state.particles) {
    const q = worldToCanvas(p.x, p.y);
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 1.8 + (1 - p.life / p.maxLife) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSelectionHint() {
  if (!state.selected || !pointerCell) return;
  const d = defs[state.selected];
  const c = worldToCanvas(pointerCell.x + .5, pointerCell.y + .5);
  ctx.globalAlpha = .72;
  drawGhostBuilding(d, c.x, c.y);
  ctx.globalAlpha = 1;
}

function drawGhostBuilding(d, cx, cy) {
  const size = layout.cell * .56;
  drawGlow(cx, cy, size * 1.4, 'rgb(112,240,176)', .10);
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.arc(cx, cy, size * .38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, size * .48, 0, Math.PI * 2);
  ctx.stroke();
}

function draw() {
  if (!layout.w) return;
  ctx.clearRect(0, 0, layout.w, layout.h);
  drawBackground();
  drawGrid();
  drawRoads();
  for (const b of state.buildings) drawBuildingArt(b);
  drawCivilians();
  drawHero();
  drawSelectionHint();
  drawEnemies();
  drawShotsAndFX();
  drawForegroundFX();
}
