// thief.js — the player. Moves with WASD/arrows, sneaks with Shift, cracks the
// vault with E, and throws tools with the mouse. Slow when sneaking, fast when
// running — and running is exactly what a cone notices first.
import { resolveCollision, VAULT, EXIT_ZONE } from './level.js';

export const THIEF_RUN_SPEED = 215;
export const THIEF_SNEAK_SPEED = 105;

export function createThief(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    r: 13,
    angle: -Math.PI / 2, // facing up the room, toward the vault
    moving: false,
    sneaking: false,
    cracking: 0, // seconds of lockpick progress on the vault
    crackingVault: false,
    lootValue: 0,
    lootTaken: [],
    hasDiamond: false,
    escaped: false,
    steps: 0,
  };
}

export function updateThief(thief, input, dt, onPickup) {
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  thief.sneaking = !!input.sneak;
  thief.moving = mx !== 0 || my !== 0;
  if (thief.moving) {
    const len = Math.hypot(mx, my);
    const speed = thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_RUN_SPEED;
    thief.x += (mx / len) * speed * dt;
    thief.y += (my / len) * speed * dt;
    thief.angle = Math.atan2(my, mx);
    thief.steps += speed * dt;
    resolveCollision(thief);
    thief.cracking = 0;
    thief.crackingVault = false;
  }

  // Hold E beside the vault to crack it open.
  const vaultDist = Math.hypot(thief.x - VAULT.x, thief.y - VAULT.y);
  const nearVault = vaultDist < VAULT.r + 40;
  if (input.interact && nearVault && !thief.hasDiamond) {
    thief.crackingVault = true;
    thief.cracking += dt;
    if (thief.cracking >= VAULT.crackSeconds) {
      thief.hasDiamond = true;
      thief.lootValue += 500;
      thief.lootTaken.push('diamond');
      thief.cracking = 0;
      thief.crackingVault = false;
      onPickup('diamond');
    }
  } else {
    thief.cracking = 0;
    thief.crackingVault = false;
  }

  // The exit only counts once the diamond is in hand.
  if (
    thief.hasDiamond &&
    thief.x > EXIT_ZONE.x && thief.x < EXIT_ZONE.x + EXIT_ZONE.w &&
    thief.y > EXIT_ZONE.y - 6 && thief.y < EXIT_ZONE.y + EXIT_ZONE.h
  ) {
    thief.escaped = true;
  }
  return nearVault;
}

// Side loot (idol, portrait) is grabbed by walking over it and pressing E.
export function trySideLoot(thief, lootList, onPickup) {
  for (const loot of lootList) {
    if (loot.main || loot.taken) continue;
    const d = Math.hypot(thief.x - loot.x, thief.y - loot.y);
    if (d < 36) {
      loot.taken = true;
      thief.lootValue += loot.value;
      thief.lootTaken.push(loot.id);
      onPickup(loot.id);
      return loot;
    }
  }
  return null;
}
