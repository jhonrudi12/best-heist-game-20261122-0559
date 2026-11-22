// shots.js — staged moments for the maker's screenshots. Each one is a real
// game state (thief placed, guards on patrol, alarm set) rendered by the same
// loop that plays the game, so the screenshots are honest renders of the code.
// ?shot=cover   — mid-heist: thief sneaking up the carpet, cones sweeping.
// ?shot=dodge   — tense cone-dodge: thief at a cone's edge, alarm climbing.
// ?shot=getaway — diamond in hand, thief sprinting for the exit, alarm high.
// Alarm levels are set a little high: the meter bleeds away while the thief
// hides, so the shot still reads hot a second after the page loads.
export function applyShot(state, name) {
  if (name === 'cover') {
    state.thief.x = 640;
    state.thief.y = 470;
    state.thief.sneaking = true;
    state.thief.angle = -Math.PI / 2;
    state.alarm.level = 45;
    state.phase = 'playing';
    state.startedAt = performance.now() - 42000;
  } else if (name === 'dodge') {
    state.thief.x = 545;
    state.thief.y = 330;
    state.thief.sneaking = true;
    state.thief.angle = Math.PI;
    state.alarm.level = 85;
    state.alarm.spotted = true;
    state.alarm.spottedBy = 'guard';
    state.phase = 'playing';
    state.startedAt = performance.now() - 96000;
    const vera = state.guards[1];
    vera.x = 470;
    vera.y = 300;
    vera.angle = Math.PI / 2;
    vera.state = 'pause';
    vera.pauseTimer = 1.2;
    const marco = state.guards[0];
    marco.x = 700;
    marco.y = 560;
    marco.angle = -Math.PI / 2;
  } else if (name === 'getaway') {
    state.thief.x = 640;
    state.thief.y = 600;
    state.thief.angle = Math.PI / 2;
    state.thief.hasDiamond = true;
    state.thief.lootValue = 700;
    state.thief.lootTaken = ['diamond', 'idol'];
    state.alarm.level = 72;
    state.phase = 'playing';
    state.startedAt = performance.now() - 154000;
    for (const loot of state.loot) {
      if (loot.id === 'diamond' || loot.id === 'idol') loot.taken = true;
    }
    // Guards placed well clear of the thief's run to the exit, so the alarm
    // bleeds down instead of ending the run before the screenshot lands.
    const marco = state.guards[0];
    marco.x = 300;
    marco.y = 300;
    marco.angle = Math.PI / 2;
    marco.state = 'patrol';
    marco.waypointIndex = 1;
    const vera = state.guards[1];
    vera.x = 470;
    vera.y = 200;
    vera.angle = Math.PI / 2;
    vera.state = 'patrol';
    vera.waypointIndex = 1;
    const otis = state.guards[2];
    otis.x = 810;
    otis.y = 200;
    otis.angle = Math.PI / 2;
    // Otis heard something near the carpet and is checking it — the "?" sells
    // the chase without him ever reaching the thief.
    otis.state = 'investigate';
    otis.investigateTarget = { x: 700, y: 540 };
    otis.investigateTimer = 0;
  }
  return state;
}
