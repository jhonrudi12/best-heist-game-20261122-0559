// alarm.js — the room's suspicion, 0 to 100. Being inside a cone raises it,
// hiding lets it bleed away, and at 100 the guards know exactly where you are.
// The rise is slow enough to forgive a clipped cone edge and fast enough that
// standing in the open ends the run — a fair caught moment, not an instant fail.
export function createAlarm() {
  return {
    level: 0,
    peak: 0,
    spotted: false, // anyone sees the thief right now
    spottedBy: null,
    warningShown: false,
  };
}

export function updateAlarm(alarm, dt, sightings) {
  // sightings: [{ source: 'guard'|'camera', rate }] for every watcher that sees.
  alarm.spotted = sightings.length > 0;
  alarm.spottedBy = alarm.spotted ? sightings[0].source : null;
  if (alarm.spotted) {
    let rise = 0;
    for (const s of sightings) rise += s.rate;
    alarm.level = Math.min(100, alarm.level + rise * dt);
  } else {
    alarm.level = Math.max(0, alarm.level - 9 * dt);
  }
  if (alarm.level > alarm.peak) alarm.peak = alarm.level;
  alarm.warningShown = alarm.level >= 60;
  return alarm.level >= 100;
}

// Alarm rise per second while the thief stands in a cone. Sneaking halves it.
export function sightingRate(source, sneaking) {
  const base = source === 'camera' ? 22 : 34;
  return sneaking ? base * 0.5 : base;
}
