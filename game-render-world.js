function worldToCanvas(x, y) {
  return { x: layout.ox + x * layout.cell, y: layout.oy + y * layout.cell };
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function tileSeed(x, y) {
  const n = Math.sin(x * 91.73 + y * 57.23) * 43758.5453;
  return n - Math.floor(n);
}

function currentBiome() {
  return biomeDefs[state.biome] || biomeDefs.ruins;
}

function drawBackground() {
  const biome = currentBiome();
  const t = performance.now() * 0.001;

  const sky = ctx.createLinearGradient(0, 0, 0, layout.h);
  sky.addColorStop(0, state.phase === 'night' ? '#07111f' : biome.top);
  sky.addColorStop(0.55, state.phase === 'night' ? '#0b1522' : mixColor(biome.top, biome.bottom, 0.4));
  sky.addColorStop(1, state.phase === 'night' ? '#08100f' : biome.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, layout.w, layout.h);

  // sun/moon glow
  const orbX = layout.w * 0.78;
  const orbY = layout.h * 0.14;
  const orbR = Math.max(36, layout.cell * 0.9);
  const orb = ctx.createRadialGradient(orbX, orbY, 1, orbX, orbY, orbR * 2.2);
  if (state.phase === 'night') {
    orb.addColorStop(0, 'rgba(165,199,255,.28)');
    orb.addColorStop(.36, 'rgba(105,145,210,.12)');
    orb.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    orb.addColorStop(0, 'rgba(255,211,109,.34)');
    orb.addColorStop(.36, 'rgba(255,170,76,.10)');
    orb.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // skyline silhouettes
  ctx.save();
  ctx.globalAlpha = state.phase === 'night' ? 0.34 : 0.18;
  const skylineColor = state.phase === 'night' ? '#0b1a24' : 'rgba(14,18,20,.55)';
  ctx.fillStyle = skylineColor;
  for (let i = 0; i < 12; i++) {
    const w = 26 + (i % 4) * 10;
    const h = 38 + ((i * 13) % 5) * 16;
    const x = i * (layout.w / 10) - 12;
    const y = layout.h * 0.28 + (i % 2) * 8;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();

  // haze / clouds
  ctx.globalAlpha = .11;
  ctx.fillStyle = state.weather === 'Dust' ? '#c9a978' : state.weather === 'Cloudy' ? '#95a9ad' : biome.accent;
  for (let i = 0; i < 5; i++) {
    const phase = t * (0.6 + i * 0.08);
    const x = (layout.w * (.14 + i * .19) + Math.sin(phase) * 14);
    const y = layout.h * (.12 + (i % 2) * .06) + Math.cos(phase * .7) * 7;
    ctx.beginPath();
    ctx.ellipse(x, y, 68 + i * 10, 18 + (i % 3) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // stars
  if (state.phase === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 28; i++) {
      const x = ((i * 67.5) % layout.w);
      const y = ((i * 33.3) % (layout.h * .4));
      const twinkle = .4 + .6 * Math.abs(Math.sin(t * 2 + i));
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
  }
}

function drawGrid() {
  const t = performance.now() * 0.001;
  for (let y = 0; y < GRID.rows; y++) {
    for (let x = 0; x < GRID.cols; x++) {
      const px = layout.ox + x * layout.cell + 1.5;
      const py = layout.oy + y * layout.cell + 1.5;
      const seed = tileSeed(x, y);
      const hueAlpha = .05 + (seed * .02);
      const tileGrad = ctx.createLinearGradient(px, py, px, py + layout.cell);
      tileGrad.addColorStop(0, `rgba(43,66,61,${hueAlpha + 0.03})`);
      tileGrad.addColorStop(1, `rgba(19,32,30,${hueAlpha})`);
      ctx.fillStyle = tileGrad;
      roundedRect(px, py, layout.cell - 3, layout.cell - 3, Math.max(5, layout.cell * .12));
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + seed * .03})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // terrain details
      ctx.save();
      ctx.globalAlpha = .32;
      if (seed > .75) {
        ctx.fillStyle = 'rgba(130,166,110,.12)';
        ctx.beginPath();
        ctx.arc(px + layout.cell * .26, py + layout.cell * .3, 2.4, 0, Math.PI * 2);
        ctx.arc(px + layout.cell * .36, py + layout.cell * .22, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (seed < .18) {
        ctx.fillStyle = 'rgba(176,162,142,.12)';
        ctx.fillRect(px + layout.cell * .25, py + layout.cell * .68, 4, 2);
        ctx.fillRect(px + layout.cell * .31, py + layout.cell * .72, 2, 2);
      }
      ctx.restore();
    }
  }

  if (pointerCell && state.selected && state.phase === 'day') {
    const blocked = !!buildingAt(pointerCell.x, pointerCell.y);
    const px = layout.ox + pointerCell.x * layout.cell + 3;
    const py = layout.oy + pointerCell.y * layout.cell + 3;
    ctx.fillStyle = blocked || !canAfford(state.selected) ? 'rgba(255,111,120,.15)' : 'rgba(112,240,176,.16)';
    ctx.strokeStyle = blocked || !canAfford(state.selected) ? 'rgba(255,111,120,.55)' : 'rgba(112,240,176,.58)';
    ctx.lineWidth = 2;
    roundedRect(px, py, layout.cell - 6, layout.cell - 6, 10);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = .35;
    ctx.strokeStyle = blocked ? '#ff6f78' : '#70f0b0';
    ctx.strokeRect(px + 4, py + 4, layout.cell - 14, layout.cell - 14);
    ctx.restore();
  }
}

function drawRoads() {
  const hq = currentHQ();
  if (!hq) return;
  const a = worldToCanvas(hq.x + .5, hq.y + .5);
  for (const b of state.buildings) {
    if (b.id === hq.id) continue;
    const c = worldToCanvas(b.x + .5, b.y + .5);
    ctx.save();
    ctx.strokeStyle = 'rgba(120,160,150,.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(223,244,236,.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShadowedBase(x, y, w, h, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 12;
  roundedRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

function drawGlow(cx, cy, r, color, alpha = .35) {
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `,${alpha})`));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function mixColor(a, b, t) {
  function p(c) { const n = c.replace('#',''); return [parseInt(n.slice(0,2),16), parseInt(n.slice(2,4),16), parseInt(n.slice(4,6),16)]; }
  const aa = p(a), bb = p(b);
  const cc = aa.map((v,i)=>Math.round(v+(bb[i]-v)*t));
  return `rgb(${cc[0]},${cc[1]},${cc[2]})`;
}

function panelBodyGradient(colorA, colorB, x, y, size) {
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, colorA);
  g.addColorStop(1, colorB);
  return g;
}

function drawWindowStrip(x, y, w, count, color) {
  const step = w / count;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.fillRect(x + i * step + 2, y, Math.max(3, step - 4), 3);
  }
}

function drawBuildingArt(b) {
  const t = performance.now() * 0.001;
  const d = defs[b.type];
  const center = worldToCanvas(b.x + .5, b.y + .5);
  const size = layout.cell * (b.type === 'hq' ? .82 : .68);
  const x = center.x - size / 2;
  const y = center.y - size / 2;

  // platform shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(center.x, y + size + 7, size * .52, size * .18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (b.type === 'wall') {
    ctx.fillStyle = panelBodyGradient('#6b5447', '#4d3c32', x, y, size);
    drawShadowedBase(x, y + size * .24, size, size * .42, 8);
    ctx.fillStyle = '#8e705d';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 5 + i * (size / 3), y + size * .13, size / 5.8, size * .22);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x + 4, y + size * .27, size - 8, 2);
  } else {
    ctx.fillStyle = panelBodyGradient('#223632', '#142321', x, y, size);
    drawShadowedBase(x, y, size, size, size * .18);
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    roundedRect(x, y, size, size, size * .18);
    ctx.stroke();

    switch (b.type) {
      case 'hq': {
        ctx.fillStyle = panelBodyGradient('#335754', '#203b39', x + 4, y + 5, size - 8);
        roundedRect(x + 4, y + 5, size - 8, size - 8, 13);
        ctx.fill();
        ctx.fillStyle = '#8af6c1';
        drawGlow(center.x, center.y - 5, size * .5, 'rgb(112,240,176)', .12 + .06 * Math.sin(t * 3));
        ctx.beginPath();
        ctx.arc(center.x, center.y - 5, size * .16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(center.x - 3, center.y - size * .18, 6, size * .35);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        drawWindowStrip(x + 8, y + size * .68, size - 16, 4, 'rgba(212,255,236,.22)');
        break;
      }
      case 'farm': {
        ctx.fillStyle = '#314f48';
        roundedRect(x + 5, y + 8, size - 10, size - 14, 10);
        ctx.fill();
        for (let row = 0; row < 2; row++) {
          ctx.fillStyle = row ? '#58d89a' : '#7cf0b8';
          const yy = y + size * (.23 + row * .28);
          ctx.fillRect(x + 8, yy, size - 16, 4);
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 12 + i * (size - 24) / 2, yy - 2, 4 + Math.sin(t * 2 + i + row) * .35, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case 'solar': {
        ctx.fillStyle = panelBodyGradient('#284359', '#1d2f43', x + 6, y + 10, size - 12);
        ctx.fillRect(x + 8, y + 10, size - 16, size * .44);
        ctx.strokeStyle = '#8bc4ff';
        ctx.lineWidth = 1.25;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 10 + i * (size * .44) / 3);
          ctx.lineTo(x + size - 8, y + 10 + i * (size * .44) / 3);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(center.x, y + size * .55);
        ctx.lineTo(center.x, y + size - 8);
        ctx.strokeStyle = '#c0dcff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(x + 10, y + 12, size * .18, 3);
        break;
      }
      case 'recycler': {
        ctx.fillStyle = panelBodyGradient('#4d645e', '#3b504b', x + 8, y + 8, size - 16);
        roundedRect(x + 8, y + 8, size - 16, size - 16, 10);
        ctx.fill();
        ctx.fillStyle = '#b8f48c';
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.translate(center.x, center.y + 1);
          ctx.rotate((Math.PI * 2 / 3) * k + Math.sin(t * 1.4) * .08);
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(9, -2);
          ctx.lineTo(1, -2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'shelter': {
        ctx.fillStyle = '#725a48';
        ctx.fillRect(x + 10, y + size * .38, size - 20, size * .32);
        ctx.fillStyle = panelBodyGradient('#ffdc83', '#daaa4e', x, y, size);
        ctx.beginPath();
        ctx.moveTo(center.x, y + 8);
        ctx.lineTo(x + size - 8, y + size * .42);
        ctx.lineTo(x + 8, y + size * .42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3c2e23';
        ctx.fillRect(center.x - 5, y + size * .46, 10, size * .24);
        ctx.fillStyle = '#ffd98e';
        ctx.fillRect(x + 13, y + size * .49, 7, 7);
        ctx.fillRect(x + size - 20, y + size * .49, 7, 7);
        break;
      }
      case 'tower': {
        ctx.fillStyle = panelBodyGradient('#617383', '#465664', x, y, size);
        ctx.fillRect(center.x - 6, y + 10, 12, size - 18);
        ctx.fillStyle = '#d4dde8';
        roundedRect(center.x - 14, y + 8, 28, 8, 4);
        ctx.fill();
        ctx.fillStyle = '#ffcd6b';
        ctx.fillRect(center.x + 8, y + 10, 8, 3);
        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath();
        ctx.moveTo(center.x - 8, y + size - 8);
        ctx.lineTo(center.x + 8, y + size - 8);
        ctx.stroke();
        break;
      }
      case 'tesla': {
        ctx.strokeStyle = '#7dd0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(center.x, y + 10);
        ctx.lineTo(center.x, y + size - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x - 11, y + 18);
        ctx.lineTo(center.x, y + 8);
        ctx.lineTo(center.x + 11, y + 18);
        ctx.stroke();
        drawGlow(center.x, y + 22, 18, 'rgb(115,184,255)', .17 + .05 * Math.sin(t * 8));
        ctx.fillStyle = '#73b8ff';
        ctx.beginPath();
        ctx.arc(center.x, y + 22, 4.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'clinic': {
        ctx.fillStyle = panelBodyGradient('#eef4f4', '#cad6d8', x + 8, y + 8, size - 16);
        roundedRect(x + 8, y + 8, size - 16, size - 16, 10);
        ctx.fill();
        ctx.fillStyle = '#ff6f78';
        ctx.fillRect(center.x - 4, y + 15, 8, size - 30);
        ctx.fillRect(x + 15, center.y - 4, size - 30, 8);
        drawGlow(center.x, center.y, 16, 'rgb(255,111,120)', .08 + .04 * Math.sin(t * 4));
        break;
      }
    }
  }

  // level pips
  for (let i = 0; i < Math.min(4, b.level); i++) {
    ctx.fillStyle = i < b.level ? 'rgba(255,205,107,.95)' : 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.arc(x + 8 + i * 7, y + 8, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (b.hp < b.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,.58)';
    ctx.fillRect(center.x - size * .38, y + size + 4, size * .76, 4);
    ctx.fillStyle = b.hp / b.maxHp > .4 ? '#70f0b0' : '#ff6f78';
    ctx.fillRect(center.x - size * .38, y + size + 4, size * .76 * clamp(b.hp / b.maxHp, 0, 1), 4);
  }
}

function drawForegroundFX() {
  const t = performance.now() * 0.001;
  // weather streaks / dust
  ctx.save();
  if (state.weather === 'Windy' || state.weather === 'Dust') {
    ctx.globalAlpha = state.weather === 'Dust' ? .11 : .08;
    ctx.strokeStyle = state.weather === 'Dust' ? '#d6b27d' : '#b1d5d8';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      const x = (i * 37 + t * 120) % (layout.w + 80) - 40;
      const y = (i * 23 + t * 25) % layout.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18, y + 6);
      ctx.stroke();
    }
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(layout.w / 2, layout.h / 2, layout.h * .18, layout.w / 2, layout.h / 2, layout.h * .72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, layout.w, layout.h);
}
