// vision.js — cones, angles and line of sight. One shared answer to "can this
// watcher see the thief right now?" used by guards and cameras alike.
import { COVER, WALLS } from './level.js';

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Segment (x1,y1)-(x2,y2) against an axis-aligned rectangle. True if it hits.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Segment against a circle. True if the segment passes within radius of the centre.
function segmentHitsCircle(x1, y1, x2, y2, c) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((c.x - x1) * dx + (c.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx - c.x;
  const py = y1 + t * dy - c.y;
  return px * px + py * py < c.r * c.r;
}

// True when nothing solid stands between watcher and target.
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const w of WALLS) if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  for (const item of COVER) {
    if (item.kind === 'case' && segmentHitsRect(x1, y1, x2, y2, item)) return false;
    if (item.kind === 'pillar' && segmentHitsCircle(x1, y1, x2, y2, item)) return false;
  }
  return true;
}

// Is the target inside the watcher's cone? Returns { seen, distance, angle }.
// Sneaking shrinks the effective range: a crouched thief is harder to spot.
export function coneSees(watcher, target, range, halfAngle) {
  const dx = target.x - watcher.x;
  const dy = target.y - watcher.y;
  const distance = Math.hypot(dx, dy);
  const effectiveRange = target.sneaking ? range * 0.55 : range;
  if (distance > effectiveRange) return { seen: false, distance, angle: 0 };
  const a = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(a, watcher.angle)) > halfAngle) return { seen: false, distance, angle: a };
  if (!hasLineOfSight(watcher.x, watcher.y, target.x, target.y)) return { seen: false, distance, angle: a };
  return { seen: true, distance, angle: a };
}
