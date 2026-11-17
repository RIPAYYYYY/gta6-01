// The wanted system and the Neon Bay police: stars rise with crimes, cops
// spawn to match them, chase the player on foot and in patrol cars, and give
// up when the heat dies down.
import { WORLD, COP_SPEED, ROAD_SPACING } from './config.js';
import { range, pick } from './random.js';

export const MAX_WANTED = 5;

/** How many patrol cars and foot cops each wanted level fields. */
export function copsForLevel(stars) {
  return { cars: Math.min(stars, 3), foot: Math.min(stars, 4) };
}

/** Raise the wanted level, capped at 5. Returns the new level. */
export function raiseWanted(state, amount) {
  const before = state.wanted;
  state.wanted = Math.min(MAX_WANTED, state.wanted + amount);
  state.heatTimer = 0;
  state.lastCrimeAt = state.elapsed;
  return { before, after: state.wanted };
}

/** Cool the wanted level down when the player stays clean and unseen. */
export function decayWanted(state, dt) {
  if (state.wanted === 0) return;
  state.heatTimer += dt;
  const quietFor = state.elapsed - state.lastCrimeAt;
  // One star cools off after 25 s clean, faster at low levels.
  const coolTime = 25 + state.wanted * 4;
  if (quietFor > coolTime && state.heatTimer > 8) {
    state.wanted -= 1;
    state.heatTimer = 0;
    state.lastCrimeAt = state.elapsed;
  }
}

/** Spawn a patrol car on a road near the player, already rolling toward them. */
export function spawnCopCar(rng, player) {
  const line = (Math.floor(rng() * 7) + 1) * ROAD_SPACING - ROAD_SPACING / 2;
  const along = player.y + (rng() < 0.5 ? -1 : 1) * 500;
  const vertical = rng() < 0.5;
  const car = {
    id: -Math.floor(rng() * 100000) - 1,
    x: vertical ? line : Math.max(120, Math.min(WORLD.width - 120, player.x + (rng() < 0.5 ? -1 : 1) * 520)),
    y: vertical ? Math.max(120, Math.min(WORLD.height - 120, along)) : line,
    angle: 0,
    speed: COP_SPEED * 0.7,
    kind: 'cop',
    color: '#20242e',
    parked: false,
    traffic: false,
    cop: true,
    driver: 'cop',
    axis: vertical ? 'y' : 'x',
    dir: 1,
    hp: 100,
    honkTimer: 0,
  };
  car.angle = Math.atan2(player.y - car.y, player.x - car.x);
  return car;
}

/** A foot cop who runs at the player and tries to bring them down. */
export function spawnFootCop(rng, player) {
  const angle = rng() * Math.PI * 2;
  return {
    x: player.x + Math.cos(angle) * 420,
    y: player.y + Math.sin(angle) * 420,
    angle: Math.atan2(player.y - (player.y + Math.sin(angle) * 420), player.x - (player.x + Math.cos(angle) * 420)),
    speed: 200,
    shirt: '#20242e',
    skin: pick(rng, ['#f2c89b', '#c98d5f', '#8a5a3b']),
    state: 'walk',
    fleeTimer: 0,
    changeTimer: 0,
    hailing: false,
    cop: true,
  };
}

/** Steer one cop car toward the player, ramming when it gets close. */
export function updateCopCar(car, player, dt) {
  const targetAngle = Math.atan2(player.y - car.y, player.x - car.x);
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
  const dist = Math.hypot(player.x - car.x, player.y - car.y);
  const target = dist > 120 ? COP_SPEED : COP_SPEED * 0.55;
  car.speed += Math.max(-500 * dt, Math.min(400 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(40, Math.min(WORLD.width - 40, car.x));
  car.y = Math.max(40, Math.min(WORLD.height - 40, car.y));
}
