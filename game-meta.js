function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    return Object.assign({ shards: 0, tutorialSeen: false, sound: true, perks: { stockpile: 0, vanguard: 0, fortified: 0 }, achievements: {} }, raw || {});
  } catch {
    return { shards: 0, tutorialSeen: false, sound: true, perks: { stockpile: 0, vanguard: 0, fortified: 0 }, achievements: {} };
  }
}
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {} }
let meta = loadMeta();

let audioCtx = null;
let ambienceTimer = null;
function ensureAudio() {
  if (!meta.sound) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (!ambienceTimer) ambienceTimer = setInterval(() => {
    if (document.hidden || !meta.sound || !audioCtx || state.gameOver) return;
    tone(state.phase === 'night' ? 82 : 110, state.phase === 'night' ? .6 : .35, .025, 'sine');
    setTimeout(() => tone(state.phase === 'night' ? 123 : 165, .35, .018, 'triangle'), 220);
  }, 4200);
}
function tone(freq, duration=.08, volume=.035, type='square') {
  if (!meta.sound || !audioCtx) return;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = volume;
  o.connect(g); g.connect(audioCtx.destination); const now = audioCtx.currentTime;
  g.gain.setValueAtTime(volume, now); g.gain.exponentialRampToValueAtTime(.0001, now + duration);
  o.start(now); o.stop(now + duration);
}
function sfx(name) {
  if (!meta.sound) return;
  ensureAudio();
  if (name === 'build') { tone(330,.07,.035,'triangle'); setTimeout(()=>tone(440,.09,.025,'triangle'),65); }
  else if (name === 'shot') tone(180,.035,.015,'square');
  else if (name === 'tesla') tone(520,.06,.018,'sawtooth');
  else if (name === 'boss') { tone(72,.35,.06,'sawtooth'); setTimeout(()=>tone(54,.4,.05,'sawtooth'),180); }
  else if (name === 'reward') { tone(440,.08,.03,'triangle'); setTimeout(()=>tone(660,.12,.03,'triangle'),90); }
  else if (name === 'hurt') tone(95,.08,.025,'square');
}

function biomeForDay(day) { return biomeKeys[Math.floor((day - 1) / 4) % biomeKeys.length]; }
function heroMaxHp(level = 1) { return 130 + meta.perks.vanguard * 20 + (level - 1) * 14; }
function heroDamage() { return (13 + state.hero.level * 3) * (1 + meta.perks.vanguard * .12); }

const events = [
  {
    i: '🚪', t: 'Refugees at the perimeter', x: 'A family caravan asks to enter the city before dusk.',
    a: [
      ['Open the gates', '+3 population, -12 food, +4 morale', s => { s.pop += 3; s.food = Math.max(0, s.food - 12); s.morale += 4; }],
      ['Give supplies only', '-10 food, +8 morale', s => { s.food = Math.max(0, s.food - 10); s.morale += 8; }],
      ['Turn them away', '-5 morale', s => { s.morale -= 5; }]
    ]
  },
  {
    i: '📦', t: 'Abandoned convoy', x: 'Scouts discovered sealed cargo just outside the blast wall.',
    a: [
      ['Recover scrap', '+32 scrap', s => { s.scrap += 32; }],
      ['Secure batteries', '+28 power', s => { s.power += 28; }],
      ['Take rations', '+25 food', s => { s.food += 25; }]
    ]
  },
  {
    i: '⚠️', t: 'Generator overload', x: 'The grid spikes. You can play it safe or push your luck.',
    a: [
      ['Play it safe', '-12 power', s => { s.power = Math.max(0, s.power - 12); }],
      ['Push through', '+15 scrap, one building damaged', s => {
        s.scrap += 15;
        const candidates = s.buildings.filter(b => b.type !== 'hq');
        if (candidates.length) {
          const b = candidates[Math.floor(Math.random() * candidates.length)];
          b.hp = Math.max(1, b.hp - 35);
        }
      }]
    ]
  },
  {
    i: '📡', t: 'Old satellite link', x: 'A surviving data relay beams down battlefield telemetry.',
    a: [
      ['Archive research', '+1 tech point', s => { s.tech += 1; }],
      ['Scramble components', '+22 scrap', s => { s.scrap += 22; }]
    ]
  }
];
