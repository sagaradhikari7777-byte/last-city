'use strict';
state = loadState() || freshState();
function gameOver() {
  state.gameOver = true; state.paused = true;
  const earned = Math.max(1, Math.floor(state.day / 2) + state.bossesKilled * 2);
  if (!state.metaRewarded) { meta.shards += earned; state.metaRewarded = true; checkAchievements(); saveMeta(); }
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  ui.gameOverTitle.textContent = `Survived ${state.day} days`;
  ui.gameOverStats.textContent = `Score ${Math.round(state.score)} · ${state.kills} enemies · ${state.bossesKilled} bosses · +${earned} Legacy shards`;
  ui.gameOverModal.classList.remove('hidden');
  tone(70,.6,.05,'sawtooth'); haptic(80);
}

function restartRun() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  state = freshState();
  renderBuildRail();
  renderObjectives();
  renderTechModal();
  refreshHUD();
  ui.gameOverModal.classList.add('hidden');
  if (!state.tutorialSeen) ui.tutorialModal.classList.remove('hidden');
}

function pointerToCell(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left - layout.ox) / layout.cell;
  const y = (ev.clientY - rect.top - layout.oy) / layout.cell;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= GRID.cols || iy >= GRID.rows) return null;
  return { x: ix, y: iy };
}

canvas.addEventListener('pointermove', (ev) => {
  pointerCell = pointerToCell(ev);
});
canvas.addEventListener('pointerleave', () => { pointerCell = null; });
canvas.addEventListener('pointerdown', (ev) => {
  if (state.eventOpen || state.techOpen || state.gameOver) return;
  const cell = pointerToCell(ev);
  if (!cell) return;
  const occupant = buildingAt(cell.x, cell.y);
  if (state.inspect || !state.selected) {
    if (occupant) openInspect(occupant.id);
    else if (state.inspect) showToast('No structure on that tile');
    return;
  }
  placeBuilding(state.selected, cell.x, cell.y);
});

ui.pauseBtn.onclick = () => { state.paused = !state.paused; refreshHUD(); haptic(); };
ui.speedBtn.onclick = () => { state.speed = state.speed === 1 ? 2 : 1; refreshHUD(); haptic(); };
ui.techBtn.onclick = () => { ensureAudio(); openTech(); };
ui.audioBtn.onclick = () => { meta.sound = !meta.sound; saveMeta(); if (meta.sound) ensureAudio(); refreshHUD(); };
ui.helpBtn.onclick = () => ui.tutorialModal.classList.remove('hidden');
ui.startRunBtn.onclick = () => {
  state.tutorialSeen = true; meta.tutorialSeen = true; saveMeta(); ensureAudio();
  ui.tutorialModal.classList.add('hidden');
  saveState();
};
ui.inspectMode.onclick = () => { state.inspect = !state.inspect; state.selected = null; refreshSelectionUI(); };
ui.clearSelection.onclick = () => { state.selected = null; state.inspect = false; refreshSelectionUI(); };
ui.closeInspect.onclick = () => closeInspect();
ui.inspectModal.onclick = (e) => { if (e.target === ui.inspectModal) closeInspect(); };
ui.upgradeBtn.onclick = () => upgradeBuilding(state.inspected);
ui.demolishBtn.onclick = () => demolishBuilding(state.inspected);
ui.closeTech.onclick = () => closeTech();
ui.techModal.onclick = (e) => { if (e.target === ui.techModal) closeTech(); };
ui.restartBtn.onclick = () => restartRun();

window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
window.addEventListener('beforeunload', saveState);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

function frame(now) {
  const dt = Math.min(.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  refreshHUD();
  requestAnimationFrame(frame);
}

resize();
renderBuildRail();
renderObjectives();
renderTechModal();
checkAchievements();
refreshHUD();
if (!state.tutorialSeen) {
  ui.tutorialModal.classList.remove('hidden');
} else {
  setTimeout(() => showToast('Build food, power and defenses before nightfall'), 420);
}
requestAnimationFrame(frame);
