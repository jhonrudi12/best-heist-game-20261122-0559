// render.js — everything the player sees, drawn on one canvas: the gallery
// floor, the vault, the loot, the guards and their cones, the sweeping cameras,
// the thief, and the alarm meter. Safe cover is warm wood, danger is red light,
// loot is gold — readable at a glance, even shrunk to a contact sheet.
import { ROOM, WALLS, COVER, LOOT, VAULT, EXIT_ZONE } from './level.js';
import { GUARD_CONE_RANGE, GUARD_CONE_HALF } from './guard.js';
import { CAMERA_CONE_RANGE, CAMERA_CONE_HALF } from './camera.js';

const GOLD = '#e8b64c';
const RED = '#e5484d';
const TEAL = '#2dd4bf';

function drawCone(ctx, x, y, angle, range, half, color, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawFloor(ctx) {
  ctx.fillStyle = '#1b1712';
  ctx.fillRect(0, 0, ROOM.width, ROOM.height);
  // Parquet tiles.
  ctx.strokeStyle = 'rgba(255, 235, 200, 0.045)';
  ctx.lineWidth = 1;
  for (let x = 24; x < ROOM.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, ROOM.height - 24); ctx.stroke();
  }
  for (let y = 24; y < ROOM.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(ROOM.width - 24, y); ctx.stroke();
  }
  // Central red carpet runner, the thief's highway to the vault.
  ctx.fillStyle = '#5d1f24';
  ctx.fillRect(600, 24, 80, ROOM.height - 48);
  ctx.fillStyle = '#7a2a30';
  ctx.fillRect(606, 24, 68, ROOM.height - 48);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(606, 24, 68, ROOM.height - 48);
  // Wall border.
  ctx.fillStyle = '#2c2418';
  ctx.fillRect(0, 0, ROOM.width, 24);
  ctx.fillRect(0, ROOM.height - 24, ROOM.width, 24);
  ctx.fillRect(0, 0, 24, ROOM.height);
  ctx.fillRect(ROOM.width - 24, 0, 24, ROOM.height);
  ctx.strokeStyle = '#4a3a22';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, ROOM.width - 24, ROOM.height - 24);
}

function drawVaultAndLoot(ctx, state) {
  // Vault alcove.
  ctx.fillStyle = '#3a2f1d';
  ctx.fillRect(VAULT.x - 70, 24, 140, 78);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(VAULT.x - 70, 24, 140, 78);
  ctx.fillStyle = '#0e0c09';
  ctx.beginPath();
  ctx.arc(VAULT.x, VAULT.y, VAULT.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = state.thief.hasDiamond ? '#3f7d4e' : GOLD;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Vault door spokes.
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(VAULT.x, VAULT.y);
    ctx.lineTo(VAULT.x + Math.cos(a) * (VAULT.r - 6), VAULT.y + Math.sin(a) * (VAULT.r - 6));
    ctx.stroke();
  }

  // Loot sparkles.
  for (const loot of state.loot) {
    if (loot.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3 + loot.x);
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.fillStyle = loot.main ? '#7df9ff' : GOLD;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The diamond sits inside the vault circle, so its label goes below it.
    const nameY = loot.main ? loot.y + 52 : loot.y + 26;
    const valueY = loot.main ? loot.y + 66 : loot.y + 40;
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loot.name.toUpperCase(), loot.x, nameY);
    ctx.fillStyle = GOLD;
    ctx.fillText(`$${loot.value}`, loot.x, valueY);
  }
}

function drawCover(ctx) {
  for (const item of COVER) {
    if (item.kind === 'case') {
      ctx.fillStyle = '#241c10';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = 'rgba(150, 200, 255, 0.16)';
      ctx.fillRect(item.x + 4, item.y + 4, item.w - 8, item.h - 8);
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#3a2c17';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#5a4520';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r - 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const wall of WALLS) {
    ctx.fillStyle = '#2c2418';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = '#4a3a22';
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawExit(ctx, state) {
  const open = state.thief.hasDiamond;
  ctx.fillStyle = open ? 'rgba(45, 212, 191, 0.35)' : 'rgba(45, 212, 191, 0.12)';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = open ? TEAL : '#1f7a6e';
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = open ? '#a7f3ea' : '#5f9d94';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GET OUT!' : 'EXIT (locked until the diamond is yours)', 640, EXIT_ZONE.y + 24);
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    if (!cam.disabled) {
      drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA_CONE_RANGE, CAMERA_CONE_HALF, '#ff7a1a', 0.30);
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.disabled ? '#666' : RED;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.angle) * 16, cam.y + Math.sin(cam.angle) * 16);
    ctx.stroke();
    if (cam.disabled) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP', cam.x, cam.y - 16);
    }
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    const alert = guard.state === 'chase' || guard.state === 'investigate';
    const color = guard.state === 'chase' ? RED : alert ? '#ff9f1a' : '#ffd166';
    drawCone(ctx, guard.x, guard.y, guard.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF, color, alert ? 0.42 : 0.30);
    // Body: navy uniform, brass buttons, cap.
    ctx.fillStyle = '#22335c';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d1526';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (guard.r + 5), guard.y + Math.sin(guard.angle) * (guard.r + 5));
    ctx.stroke();
    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - guard.r - 8);
    if (guard.state !== 'patrol') {
      ctx.fillStyle = guard.state === 'chase' ? RED : '#ff9f1a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - guard.r - 22);
    }
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  // Sneak shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 10, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure, dark cloak with a teal scarf.
  ctx.fillStyle = '#151019';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.angle) * 7, t.y + Math.sin(t.angle) * 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Lockpick progress ring around the thief while cracking.
  if (t.crackingVault) {
    const frac = t.cracking / 2.5;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING…', t.x, t.y - t.r - 12);
  }
  if (t.sneaking) {
    ctx.fillStyle = '#c9d6ff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', t.x, t.y + t.r + 14);
  }
  // Noise rings from thrown noisemakers.
  for (const noise of state.tools.noises) {
    const frac = 1 - noise.ttl / 2.5;
    ctx.strokeStyle = `rgba(255, 209, 102, ${1 - frac})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 8 + frac * 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state) {
  const alarm = state.alarm;
  // Top bar.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.82)';
  ctx.fillRect(0, 0, ROOM.width, 46);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MIDNIGHT VAULT', 16, 29);
  // Alarm meter.
  const ax = 230;
  const aw = 420;
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(ax, 13, aw, 20);
  const frac = alarm.level / 100;
  const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
  grad.addColorStop(0, '#3f9d4e');
  grad.addColorStop(0.6, '#e8b64c');
  grad.addColorStop(1, RED);
  ctx.fillStyle = grad;
  ctx.fillRect(ax, 13, aw * frac, 20);
  ctx.strokeStyle = alarm.level >= 60 ? RED : GOLD;
  ctx.lineWidth = alarm.level >= 60 ? 3 : 1.5;
  ctx.strokeRect(ax, 13, aw, 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ALARM ${Math.round(alarm.level)}%`, ax + aw / 2, 28);
  if (alarm.spotted) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SPOTTED!', ax + aw + 62, 29);
  }
  // Loot, tools, timer.
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LOOT $${state.thief.lootValue}`, 800, 29);
  ctx.fillStyle = '#c9d6ff';
  ctx.fillText(`NOISEMAKER ×${state.tools.noisemakers}   EMP ×${state.tools.emps}`, 930, 29);
  ctx.fillStyle = '#f5e6c8';
  ctx.textAlign = 'right';
  ctx.fillText(state.timerText, ROOM.width - 16, 29);
  // Objective line.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.66)';
  ctx.fillRect(0, ROOM.height - 30, ROOM.width, 30);
  ctx.fillStyle = '#e8d9b0';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.objective, ROOM.width / 2, ROOM.height - 11);
}

function drawOverlay(ctx, state) {
  if (state.phase === 'title') {
    ctx.fillStyle = 'rgba(8, 6, 4, 0.78)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIDNIGHT VAULT', ROOM.width / 2, 210);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '22px Georgia, serif';
    ctx.fillText('One room. Three guards. Two cameras. One diamond.', ROOM.width / 2, 258);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#c9d6ff';
    const lines = [
      'WASD / arrows — move    Shift — sneak    E — crack the vault / grab loot',
      'Click — throw a noisemaker (lures a guard)    Q — EMP the nearest camera',
      'Crack the vault, grab the Starlight Diamond, reach the exit. If the alarm hits 100%, you are caught.',
      '',
      'Press ENTER or click to begin the heist.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, ROOM.width / 2, 320 + i * 30));
  } else if (state.phase === 'caught') {
    ctx.fillStyle = 'rgba(60, 4, 6, 0.72)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAUGHT!', ROOM.width / 2, 300);
    ctx.font = '20px sans-serif';
    ctx.fillText(`The alarm hit 100%. Loot kept: $${state.thief.lootValue} — the vault keeps its diamond.`, ROOM.width / 2, 350);
    ctx.fillText('Press R to case the joint again.', ROOM.width / 2, 392);
  } else if (state.phase === 'escaped') {
    ctx.fillStyle = 'rgba(4, 30, 18, 0.78)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN GETAWAY!', ROOM.width / 2, 290);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Loot: $${state.thief.lootValue}    Time: ${state.timerText}    Peak alarm: ${Math.round(state.alarm.peak)}%`, ROOM.width / 2, 342);
    ctx.fillText(`Score: ${state.score} — press R to run it back, cleaner.`, ROOM.width / 2, 384);
  }
}

export function render(ctx, state) {
  drawFloor(ctx);
  drawVaultAndLoot(ctx, state);
  drawCover(ctx);
  drawExit(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state);
  drawOverlay(ctx, state);
}
