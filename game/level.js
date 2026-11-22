// level.js — the one room of the Midnight Vault: walls, cover, loot, spawns.
// The whole heist happens in this single gallery hall (1280 x 720). Three lanes
// cross it — the west wing, the central carpet, the east wing — so the thief can
// always pick a route around a patrol instead of waiting on one door.
export const ROOM = { width: 1280, height: 720, wall: 24 };

export const WALLS = [
  // Outer shell is the room border; these are the interior walls.
  { x: 520, y: 24, w: 240, h: 26 }, // vault alcove header (top centre)
];

export const COVER = [
  // Display cases (rectangles) and pillars (circles) block sight and movement.
  { kind: 'case', x: 180, y: 180, w: 150, h: 64 },
  { kind: 'case', x: 950, y: 180, w: 150, h: 64 },
  { kind: 'case', x: 180, y: 480, w: 150, h: 64 },
  { kind: 'case', x: 950, y: 480, w: 150, h: 64 },
  { kind: 'case', x: 565, y: 330, w: 150, h: 56 }, // central display case
  { kind: 'pillar', x: 420, y: 300, r: 26 },
  { kind: 'pillar', x: 860, y: 300, r: 26 },
  { kind: 'pillar', x: 420, y: 560, r: 26 },
  { kind: 'pillar', x: 860, y: 560, r: 26 },
];

export const LOOT = [
  { id: 'diamond', name: 'Starlight Diamond', x: 640, y: 96, value: 500, main: true },
  { id: 'idol', name: 'Golden Idol', x: 140, y: 360, value: 200, main: false },
  { id: 'portrait', name: 'Emerald Portrait', x: 1140, y: 360, value: 200, main: false },
];

export const VAULT = { x: 640, y: 96, r: 34, crackSeconds: 2.5 };

export const EXIT_ZONE = { x: 565, y: 652, w: 150, h: 30 };

export const THIEF_SPAWN = { x: 640, y: 620 };

export const GUARD_PATROLS = [
  {
    name: 'Marco',
    waypoints: [
      { x: 300, y: 260 }, { x: 300, y: 560 }, { x: 980, y: 560 }, { x: 980, y: 260 },
    ],
    speed: 62,
  },
  {
    name: 'Vera',
    waypoints: [{ x: 470, y: 190 }, { x: 470, y: 620 }],
    speed: 55,
  },
  {
    name: 'Otis',
    waypoints: [{ x: 810, y: 620 }, { x: 810, y: 190 }],
    speed: 55,
  },
];

export const CAMERA_MOUNTS = [
  { id: 'cam-west', x: 48, y: 48, baseAngle: Math.PI / 4, sweep: 0.9, period: 4.2, phase: 0 },
  { id: 'cam-east', x: 1232, y: 48, baseAngle: (3 * Math.PI) / 4, sweep: 0.9, period: 5.1, phase: 1.7 },
];

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, cr, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

export function circleHitsPillar(cx, cy, cr, p) {
  const dx = cx - p.x;
  const dy = cy - p.y;
  return dx * dx + dy * dy < (cr + p.r) * (cr + p.r);
}

// True when a circle at (cx, cy) with radius cr overlaps any solid in the room.
export function collides(cx, cy, cr) {
  const w = ROOM.wall;
  if (cx < w + cr || cx > ROOM.width - w - cr) return true;
  if (cy < w + cr || cy > ROOM.height - w - cr) return true;
  for (const wall of WALLS) if (circleHitsRect(cx, cy, cr, wall)) return true;
  for (const item of COVER) {
    if (item.kind === 'case' && circleHitsRect(cx, cy, cr, item)) return true;
    if (item.kind === 'pillar' && circleHitsPillar(cx, cy, cr, item)) return true;
  }
  return false;
}

// Push a circle out of whatever solid it overlaps, so movement slides along cover.
export function resolveCollision(entity) {
  for (let step = 0; step < 3; step++) {
    let pushed = false;
    const solids = [...WALLS, ...COVER.filter((c) => c.kind === 'case')];
    for (const s of solids) {
      if (!circleHitsRect(entity.x, entity.y, entity.r, s)) continue;
      const left = entity.x - (s.x - entity.r);
      const right = s.x + s.w + entity.r - entity.x;
      const top = entity.y - (s.y - entity.r);
      const bottom = s.y + s.h + entity.r - entity.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) entity.x = s.x - entity.r;
      else if (m === right) entity.x = s.x + s.w + entity.r;
      else if (m === top) entity.y = s.y - entity.r;
      else entity.y = s.y + s.h + entity.r;
      pushed = true;
    }
    for (const p of COVER.filter((c) => c.kind === 'pillar')) {
      const dx = entity.x - p.x;
      const dy = entity.y - p.y;
      const d = Math.hypot(dx, dy);
      const min = entity.r + p.r;
      if (d < min && d > 0.001) {
        entity.x = p.x + (dx / d) * min;
        entity.y = p.y + (dy / d) * min;
        pushed = true;
      }
    }
    const w = ROOM.wall;
    if (entity.x < w + entity.r) { entity.x = w + entity.r; pushed = true; }
    if (entity.x > ROOM.width - w - entity.r) { entity.x = ROOM.width - w - entity.r; pushed = true; }
    if (entity.y < w + entity.r) { entity.y = w + entity.r; pushed = true; }
    if (entity.y > ROOM.height - w - entity.r) { entity.y = ROOM.height - w - entity.r; pushed = true; }
    if (!pushed) break;
  }
}
