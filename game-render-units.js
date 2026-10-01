function drawCivilians() {
  for (const c of state.civilians) {
    const p = worldToCanvas(c.x, c.y);
    ctx.fillStyle = 'rgba(240,250,248,.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHero() {
  const h = state.hero; if (!h) return;
  const p = worldToCanvas(h.x, h.y); const r = Math.max(5, layout.cell * .13);
  ctx.save(); ctx.shadowColor = '#70f0b0'; ctx.shadowBlur = h.down ? 0 : 10; ctx.globalAlpha = h.down ? .35 : 1;
  ctx.fillStyle = '#70f0b0'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#092119'; ctx.fillRect(p.x-2, p.y-r*.55, 4, r*1.1); ctx.fillRect(p.x-r*.55, p.y-2, r*1.1, 4); ctx.restore();
  if (!h.down) { ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(p.x-r, p.y-r-6, r*2, 3); ctx.fillStyle='#70f0b0'; ctx.fillRect(p.x-r, p.y-r-6, r*2*(h.hp/h.maxHp), 3); }
}

function drawEnemies() {
  for (const e of state.enemies) {
    const p = worldToCanvas(e.x, e.y);
    const def = enemyDefs[e.type];
    const r = layout.cell * def.r;
    ctx.save();
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = def.color;
    if (e.type === 'runner') {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y + r);
      ctx.lineTo(p.x - r, p.y + r);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'spitter') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const rr = i % 2 ? r * .7 : r;
        const px = p.x + Math.cos(a) * rr;
        const py = p.y + Math.sin(a) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#111';
      ctx.fillRect(p.x - r, p.y - r - 6, r * 2, 3);
      ctx.fillStyle = '#ff8a7e';
      ctx.fillRect(p.x - r, p.y - r - 6, r * 2 * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
  }
}

function drawShotsAndFX() {
  for (const s of state.shots) {
    const a = worldToCanvas(s.x, s.y);
    const b = worldToCanvas(s.tx, s.ty);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.color === '#73b8ff' ? 2.4 : 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of state.particles) {
    const q = worldToCanvas(p.x, p.y);
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(q.x, q.y, 3, 3);
    ctx.globalAlpha = 1;
  }
}

function drawSelectionHint() {
  if (!state.selected || !pointerCell) return;
  const d = defs[state.selected];
  const c = worldToCanvas(pointerCell.x + .5, pointerCell.y + .5);
  ctx.globalAlpha = .65;
  drawGhostBuilding(d, c.x, c.y);
  ctx.globalAlpha = 1;
}

function drawGhostBuilding(d, cx, cy) {
  const size = layout.cell * .56;
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.arc(cx, cy, size * .38, 0, Math.PI * 2);
  ctx.fill();
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
}
