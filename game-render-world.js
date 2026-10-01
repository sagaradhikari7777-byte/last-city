function worldToCanvas(x, y) {
  return { x: layout.ox + x * layout.cell, y: layout.oy + y * layout.cell };
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackground() {
  const biome = biomeDefs[state.biome] || biomeDefs.ruins;
  const bg = ctx.createLinearGradient(0, 0, 0, layout.h);
  bg.addColorStop(0, state.phase === 'night' ? '#06101b' : biome.top);
  bg.addColorStop(1, state.phase === 'night' ? '#07100f' : biome.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, layout.w, layout.h);

  if (state.phase === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 16; i++) {
      const x = (i * 79) % layout.w;
      const y = (i * 47) % (layout.h * .45);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  ctx.globalAlpha = .08;
  ctx.fillStyle = state.weather === 'Dust' ? '#c5aa74' : state.weather === 'Cloudy' ? '#95a9ad' : biome.accent;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(layout.w * (.2 + i * .26), layout.h * (.13 + (i % 2) * .04), 90, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  for (let y = 0; y < GRID.rows; y++) {
    for (let x = 0; x < GRID.cols; x++) {
      ctx.fillStyle = `rgba(110,145,130,${.052 + ((x * 7 + y * 11) % 5) * .01})`;
      roundedRect(layout.ox + x * layout.cell + 1.5, layout.oy + y * layout.cell + 1.5, layout.cell - 3, layout.cell - 3, Math.max(4, layout.cell * .11));
      ctx.fill();
    }
  }

  if (pointerCell && state.selected && state.phase === 'day') {
    const blocked = !!buildingAt(pointerCell.x, pointerCell.y);
    ctx.fillStyle = blocked || !canAfford(state.selected) ? 'rgba(255,111,120,.15)' : 'rgba(112,240,176,.16)';
    ctx.strokeStyle = blocked || !canAfford(state.selected) ? 'rgba(255,111,120,.42)' : 'rgba(112,240,176,.5)';
    ctx.lineWidth = 2;
    roundedRect(layout.ox + pointerCell.x * layout.cell + 3, layout.oy + pointerCell.y * layout.cell + 3, layout.cell - 6, layout.cell - 6, 10);
    ctx.fill();
    ctx.stroke();
  }
}

function drawRoads() {
  const hq = currentHQ();
  if (!hq) return;
  ctx.strokeStyle = 'rgba(120,160,150,.12)';
  ctx.lineWidth = 3;
  for (const b of state.buildings) {
    if (b.id === hq.id) continue;
    const a = worldToCanvas(hq.x + .5, hq.y + .5);
    const c = worldToCanvas(b.x + .5, b.y + .5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }
}

function drawBuildingArt(b) {
  const d = defs[b.type];
  const center = worldToCanvas(b.x + .5, b.y + .5);
  const size = layout.cell * (b.type === 'hq' ? .78 : .64);
  const x = center.x - size / 2;
  const y = center.y - size / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 10;

  if (b.type === 'wall') {
    ctx.fillStyle = '#57483d';
    roundedRect(x, y + size * .2, size, size * .45, 8);
    ctx.fill();
    ctx.fillStyle = '#896e5a';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * size / 3, y + size * .12, size / 5, size * .22);
  } else {
    ctx.fillStyle = '#1b2d29';
    ctx.strokeStyle = 'rgba(255,255,255,.11)';
    roundedRect(x, y, size, size, size * .18);
    ctx.fill();
    ctx.stroke();

    switch (b.type) {
      case 'hq':
        ctx.fillStyle = '#284844';
        roundedRect(x + 5, y + 5, size - 10, size - 10, 12);
        ctx.fill();
        ctx.fillStyle = '#70f0b0';
        ctx.beginPath();
        ctx.arc(center.x, center.y - 4, size * .18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(center.x - 3, center.y - size * .18, 6, size * .34);
        break;
      case 'farm':
        ctx.fillStyle = '#38554c';
        ctx.fillRect(x + 6, y + size * .2, size - 12, 5);
        ctx.fillRect(x + 6, y + size * .45, size - 12, 5);
        ctx.fillStyle = '#65e3a6';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + 12 + i * (size - 24) / 2, y + size * .15, 4, 0, Math.PI * 2);
          ctx.arc(x + 12 + i * (size - 24) / 2, y + size * .40, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'solar':
        ctx.fillStyle = '#2c4a5c';
        ctx.fillRect(x + 8, y + 10, size - 16, size * .46);
        ctx.strokeStyle = '#73b8ff';
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 10 + i * (size * .46) / 3);
          ctx.lineTo(x + size - 8, y + 10 + i * (size * .46) / 3);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(center.x, y + size * .56);
        ctx.lineTo(center.x, y + size - 8);
        ctx.strokeStyle = '#9fc3db';
        ctx.stroke();
        break;
      case 'recycler':
        ctx.fillStyle = '#486057';
        roundedRect(x + 8, y + 10, size - 16, size - 18, 10);
        ctx.fill();
        ctx.fillStyle = '#b6f48c';
        ctx.beginPath();
        ctx.moveTo(center.x, y + 14);
        ctx.lineTo(center.x + 10, y + 24);
        ctx.lineTo(center.x + 1, y + 24);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(center.x + 8, y + 30);
        ctx.lineTo(center.x - 2, y + 40);
        ctx.lineTo(center.x - 2, y + 31);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(center.x - 11, y + 35);
        ctx.lineTo(center.x - 1, y + 25);
        ctx.lineTo(center.x - 1, y + 34);
        ctx.closePath();
        ctx.fill();
        break;
      case 'shelter':
        ctx.fillStyle = '#6a5645';
        ctx.fillRect(x + 10, y + size * .38, size - 20, size * .32);
        ctx.fillStyle = '#ffcd6b';
        ctx.beginPath();
        ctx.moveTo(center.x, y + 8);
        ctx.lineTo(x + size - 8, y + size * .42);
        ctx.lineTo(x + 8, y + size * .42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3c2e23';
        ctx.fillRect(center.x - 5, y + size * .45, 10, size * .25);
        break;
      case 'tower':
        ctx.fillStyle = '#536370';
        ctx.fillRect(center.x - 5, y + 10, 10, size - 18);
        ctx.fillStyle = '#d3dbe5';
        ctx.fillRect(center.x - 12, y + 8, 24, 8);
        ctx.fillStyle = '#ffcd6b';
        ctx.fillRect(center.x + 8, y + 10, 8, 3);
        break;
      case 'tesla':
        ctx.strokeStyle = '#73b8ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(center.x, y + 10);
        ctx.lineTo(center.x, y + size - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x - 10, y + 18);
        ctx.lineTo(center.x, y + 8);
        ctx.lineTo(center.x + 10, y + 18);
        ctx.stroke();
        ctx.shadowColor = '#73b8ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#73b8ff';
        ctx.beginPath();
        ctx.arc(center.x, y + 22, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'clinic':
        ctx.fillStyle = '#dae9ea';
        roundedRect(x + 8, y + 8, size - 16, size - 16, 10);
        ctx.fill();
        ctx.fillStyle = '#ff6f78';
        ctx.fillRect(center.x - 4, y + 15, 8, size - 30);
        ctx.fillRect(x + 15, center.y - 4, size - 30, 8);
        break;
    }
  }

  ctx.restore();

  if (b.hp < b.maxHp) {
    ctx.fillStyle = '#111';
    ctx.fillRect(center.x - size * .38, y + size + 4, size * .76, 3);
    ctx.fillStyle = b.hp / b.maxHp > .4 ? '#70f0b0' : '#ff6f78';
    ctx.fillRect(center.x - size * .38, y + size + 4, size * .76 * clamp(b.hp / b.maxHp, 0, 1), 3);
  }
}
