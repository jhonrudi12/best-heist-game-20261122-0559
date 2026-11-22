// main.js — boot and game loop. Wires keyboard + mouse, owns the phase machine
// (title → playing → caught / escaped), ticks every system, and hands the whole
// state to render.js each frame. No network, no assets: canvas + WebAudio only.
import { ROOM, THIEF_SPAWN, GUARD_PATROLS, CAMERA_MOUNTS, LOOT } from './level.js';
import { createThief, updateThief, trySideLoot } from './thief.js';
import { createGuard, updateGuard, guardSpotsThief, GUARD_CONE_RANGE, GUARD_CONE_HALF } from './guard.js';
import { createCamera, updateCamera, cameraSeesThief } from './camera.js';
import { createAlarm, updateAlarm, sightingRate } from './alarm.js';
import { createTools, throwNoisemaker, fireEmp, updateTools } from './tools.js';
import { createAudio } from './audio.js';
import { coneSees } from './vision.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function freshLoot() {
  return LOOT.map((l) => ({ ...l, taken: false }));
}

function createState() {
  const state = {
    phase: 'title', // title | playing | caught | escaped
    time: 0,
    startedAt: 0,
    timerText: '0:00',
    score: 0,
    objective: 'Slip in, crack the vault, and get out with the Starlight Diamond.',
    thief: createThief(THIEF_SPAWN),
    guards: GUARD_PATROLS.map(createGuard),
    cameras: CAMERA_MOUNTS.map(createCamera),
    alarm: createAlarm(),
    tools: createTools(),
    loot: freshLoot(),
    audio: createAudio(),
    nearVault: false,
  };
  return state;
}

let state = createState();

const input = {
  up: false, down: false, left: false, right: false,
  sneak: false, interact: false,
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'interact',
};

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  const field = KEYMAP[event.code];
  if (field) input[field] = true;
  if (event.code === 'Enter' && state.phase === 'title') startHeist();
  if (event.code === 'KeyQ' && state.phase === 'playing') {
    const hit = fireEmp(state.tools, state.thief, state.cameras, state.time);
    if (hit) state.audio.empZap();
    else state.audio.denied();
  }
  if (event.code === 'KeyR' && (state.phase === 'caught' || state.phase === 'escaped')) {
    state = createState();
  }
  if (event.code === 'KeyM') {
    state.audio.muted = !state.audio.muted;
    if (state.audio.master) state.audio.master.gain.value = state.audio.muted ? 0 : 0.35;
  }
});

window.addEventListener('keyup', (event) => {
  const field = KEYMAP[event.code];
  if (field) input[field] = false;
});

canvas.addEventListener('mousedown', (event) => {
  state.audio.ensure();
  if (state.phase === 'title') { startHeist(); return; }
  if (state.phase !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = ROOM.width / rect.width;
  const scaleY = ROOM.height / rect.height;
  const tx = (event.clientX - rect.left) * scaleX;
  const ty = (event.clientY - rect.top) * scaleY;
  const noise = throwNoisemaker(state.tools, state.thief, tx, ty);
  if (noise) state.audio.throwClink();
  else state.audio.denied();
});

function startHeist() {
  state.phase = 'playing';
  state.startedAt = performance.now();
  state.audio.ensure();
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let lastStepSound = 0;

function tick(now, dt) {
  state.time += dt;
  if (state.phase !== 'playing') return;

  state.nearVault = updateThief(state.thief, input, dt, (id) => {
    state.audio.pickup();
    if (id === 'diamond') {
      state.objective = 'Diamond secured — get to the green exit, fast!';
    }
  });
  if (input.interact) {
    const grabbed = trySideLoot(state.thief, state.loot, (id) => state.audio.pickup());
    if (grabbed) {
      state.objective = `${grabbed.name} pocketed ($${grabbed.value}) — the diamond is still upstairs.`;
    }
  }
  if (state.thief.crackingVault && Math.floor(state.time * 8) !== Math.floor((state.time - dt) * 8)) {
    state.audio.tick();
  }
  if (state.thief.moving && state.time - lastStepSound > (state.thief.sneaking ? 0.55 : 0.34)) {
    lastStepSound = state.time;
    state.audio.step(state.thief.sneaking);
  }

  // Watchers: who sees the thief this frame?
  const sightings = [];
  for (const guard of state.guards) {
    const seen = coneSees(guard, state.thief, GUARD_CONE_RANGE, GUARD_CONE_HALF);
    if (seen.seen) {
      guardSpotsThief(guard, state.thief);
      sightings.push({ source: 'guard', rate: sightingRate('guard', state.thief.sneaking) });
    }
  }
  for (const cam of state.cameras) {
    const seen = cameraSeesThief(cam, state.thief);
    if (seen.seen) sightings.push({ source: 'camera', rate: sightingRate('camera', state.thief.sneaking) });
  }

  const caughtByAlarm = updateAlarm(state.alarm, dt, sightings);
  if (state.alarm.level >= 60) state.audio.startSiren();
  else state.audio.stopSiren();

  for (const guard of state.guards) {
    updateGuard(guard, dt, state.alarm.level, state.thief, state.tools.noises);
    if (guard.caughtThief) {
      endRun('caught');
      return;
    }
  }
  for (const cam of state.cameras) updateCamera(cam, dt, state.time);
  updateTools(state.tools, dt);

  state.timerText = formatTime(now - state.startedAt);
  if (state.nearVault && !state.thief.hasDiamond) {
    state.objective = 'Hold E to crack the vault…';
  }

  if (caughtByAlarm) {
    endRun('caught');
    return;
  }
  if (state.thief.escaped) {
    endRun('escaped');
  }
}

function endRun(phase) {
  state.phase = phase;
  state.audio.stopSiren();
  if (phase === 'escaped') {
    const seconds = Math.floor((performance.now() - state.startedAt) / 1000);
    const timeBonus = Math.max(0, 300 - seconds);
    const alarmPenalty = Math.round(state.alarm.peak);
    state.score = state.thief.lootValue + timeBonus - alarmPenalty;
    state.audio.fanfare();
  } else {
    state.audio.caughtSting();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
  lastNow = now;
  tick(now, dt);
  render(ctx, state);
  requestAnimationFrame(frame);
}

let lastNow = performance.now();

// Read-only handle for automated play-testing (lets a test script watch the
// thief, the alarm and the phase while it drives the real keyboard input).
window.__midnightVault = { get state() { return state; } };

// A staged screenshot state (?shot=cover|dodge|getaway) is a real game state:
// the same loop renders it, with the thief placed and the alarm set.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(state, shot);

requestAnimationFrame(frame);
