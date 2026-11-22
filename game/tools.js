// tools.js — the thief's kit. Everything costs something, so every use is a
// decision: a noisemaker buys a patrol's attention, an EMP buys a blind camera,
// and the lockpick buys the diamond with seconds spent standing still.
import { empCamera } from './camera.js';

export function createTools() {
  return {
    noisemakers: 3,
    emps: 2,
    noises: [], // { x, y, ttl, claimedBy }
  };
}

// Click to throw a noisemaker at a point (within throwing range). Guards within
// earshot leave their patrol to check the noise.
export function throwNoisemaker(tools, thief, tx, ty) {
  if (tools.noisemakers <= 0) return null;
  const dx = tx - thief.x;
  const dy = ty - thief.y;
  const d = Math.hypot(dx, dy);
  if (d > 300) return null;
  if (d < 20) return null;
  tools.noisemakers -= 1;
  const noise = { x: tx, y: ty, ttl: 2.5, claimedBy: null };
  tools.noises.push(noise);
  return noise;
}

// Q fires an EMP at the nearest live camera in range. It sleeps for 8 seconds.
export function fireEmp(tools, thief, cameras, now) {
  if (tools.emps <= 0) return null;
  let best = null;
  let bestDist = 380;
  for (const cam of cameras) {
    if (cam.disabled) continue;
    const d = Math.hypot(cam.x - thief.x, cam.y - thief.y);
    if (d < bestDist) { best = cam; bestDist = d; }
  }
  if (!best) return null;
  tools.emps -= 1;
  empCamera(best, now, 8);
  return best;
}

export function updateTools(tools, dt) {
  for (const noise of tools.noises) noise.ttl -= dt;
  tools.noises = tools.noises.filter((n) => n.ttl > 0);
}
