// camera.js — wall-mounted security cameras. Each sweeps its cone back and forth
// on a slow, readable rhythm: the player can time a crossing between sweeps,
// or burn an EMP charge to freeze one for a while.
import { coneSees } from './vision.js';

export const CAMERA_CONE_RANGE = 230;
export const CAMERA_CONE_HALF = 0.42;

export function createCamera(def) {
  return {
    id: def.id,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    period: def.period,
    phase: def.phase,
    angle: def.baseAngle,
    disabledUntil: 0,
    time: def.phase,
  };
}

export function updateCamera(camera, dt, now) {
  camera.time += dt;
  const swing = Math.sin((camera.time / camera.period) * Math.PI * 2);
  camera.angle = camera.baseAngle + swing * camera.sweep;
  camera.disabled = now < camera.disabledUntil;
}

export function cameraSeesThief(camera, thief) {
  if (camera.disabled) return { seen: false, distance: 0, angle: 0 };
  return coneSees(camera, thief, CAMERA_CONE_RANGE, CAMERA_CONE_HALF);
}

export function empCamera(camera, now, seconds) {
  camera.disabledUntil = now + seconds;
}
