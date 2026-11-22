// guard.js — the patrol. Guards walk their waypoint loop, pause and look around
// at each stop, investigate a noise or a glimpse, and only chase once the alarm
// is high enough that the whole room knows something is wrong.
import { angleDiff, hasLineOfSight } from './vision.js';
import { resolveCollision } from './level.js';

export const GUARD_CONE_RANGE = 175;
export const GUARD_CONE_HALF = 0.58; // ~66 degrees of vision

export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    name: def.name,
    waypoints: def.waypoints,
    waypointIndex: 1,
    x: first.x,
    y: first.y,
    r: 14,
    angle: Math.atan2(
      def.waypoints[1].y - first.y,
      def.waypoints[1].x - first.x,
    ),
    speed: def.speed,
    state: 'patrol', // patrol | pause | investigate | chase
    pauseTimer: 0,
    investigateTarget: null,
    investigateTimer: 0,
    lastSeen: null,
    alerted: false,
  };
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  guard.x += (dx / d) * step;
  guard.y += (dy / d) * step;
  guard.angle = Math.atan2(dy, dx);
  resolveCollision(guard);
  return d - step < 4;
}

export function updateGuard(guard, dt, alarmLevel, thief, noises) {
  const hurry = alarmLevel > 50 ? 1.45 : 1;

  // A fresh noise pulls the nearest patrol off its loop.
  if (guard.state === 'patrol' || guard.state === 'pause') {
    for (const noise of noises) {
      const d = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (d < 340 && !noise.claimedBy) {
        noise.claimedBy = guard.name;
        guard.state = 'investigate';
        guard.investigateTarget = { x: noise.x, y: noise.y };
        guard.investigateTimer = 0;
        break;
      }
    }
  }

  // High alarm: chase the thief's last seen spot.
  if (alarmLevel > 65 && thief && guard.lastSeen) {
    guard.state = 'chase';
  } else if (guard.state === 'chase' && alarmLevel <= 40) {
    guard.state = 'patrol';
  }

  if (guard.state === 'patrol') {
    const target = guard.waypoints[guard.waypointIndex];
    const arrived = moveToward(guard, target.x, target.y, guard.speed * hurry, dt);
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.state = 'pause';
      guard.pauseTimer = 1.1;
    }
  } else if (guard.state === 'pause') {
    guard.pauseTimer -= dt;
    guard.angle += Math.sin(guard.pauseTimer * 3.2) * 0.9 * dt; // look around
    if (guard.pauseTimer <= 0) guard.state = 'patrol';
  } else if (guard.state === 'investigate') {
    const t = guard.investigateTarget;
    if (!t) { guard.state = 'patrol'; return; }
    const arrived = moveToward(guard, t.x, t.y, guard.speed * 1.25 * hurry, dt);
    guard.investigateTimer += dt;
    if (arrived || guard.investigateTimer > 6) {
      guard.state = 'pause';
      guard.pauseTimer = 1.6;
      guard.investigateTarget = null;
    }
  } else if (guard.state === 'chase' && thief) {
    const spot = guard.lastSeen || { x: thief.x, y: thief.y };
    moveToward(guard, spot.x, spot.y, guard.speed * 1.6, dt);
    if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < 26) {
      // Caught in the open: the chase itself ends the run.
      guard.caughtThief = true;
    }
  }
}

// A guard spots the thief only through its own cone; record the sighting.
export function guardSpotsThief(guard, thief) {
  if (!hasLineOfSight(guard.x, guard.y, thief.x, thief.y)) return false;
  guard.lastSeen = { x: thief.x, y: thief.y, at: performance.now() };
  guard.alerted = true;
  return true;
}
