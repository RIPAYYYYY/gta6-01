// Cars for Neon Bay Nights: the player's driveable car, parked cars to steal,
// and traffic that follows the road grid and turns at intersections.
import { WORLD, ROAD_SPACING, ROAD_WIDTH, CAR, TRAFFIC_SPEED } from './config.js';
import { hitsBuilding } from './city.js';
import { range, rangeInt, pick } from './random.js';

const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8b73a', '#7a4fd9', '#3da67a', '#c9c9c9', '#e86aa8', '#4fd9c9'];
const CAR_KINDS = ['sedan', 'sedan', 'sedan', 'hatch', 'van', 'sport'];

let nextCarId = 1;

export function makeCar(x, y, angle, kind, color, opts) {
  const o = opts || {};
  return {
    id: nextCarId,
    x, y, angle,
    speed: 0,
    kind: kind || 'sedan',
    color: color || pick(Math.random, CAR_COLORS),
    parked: !!o.parked,
    traffic: !!o.traffic,
    cop: !!o.cop,
    driver: o.driver || 'none', // 'player' | 'traffic' | 'none' | 'cop'
    axis: o.axis || 'x', // traffic travel axis
    dir: o.dir || 1,
    hp: 100,
    honkTimer: 0,
  };
}

/** A parked car on a roadside, clear of buildings and of the given point. */
export function spawnParkedCar(rng, city, avoidX, avoidY) {
  for (let tries = 0; tries < 40; tries += 1) {
    const line = (Math.floor(rng() * 7) + 1) * ROAD_SPACING - ROAD_SPACING / 2;
    const along = range(rng, 200, WORLD.width - 200);
    const vertical = rng() < 0.5;
    const x = vertical ? line + ROAD_WIDTH / 2 - 14 : along;
    const y = vertical ? along : line + ROAD_WIDTH / 2 - 14;
    if (Math.hypot(x - avoidX, y - avoidY) < 500) continue;
    if (hitsBuilding(city, x, y, 24)) continue;
    const kind = pick(rng, CAR_KINDS);
    const car = makeCar(x, y, vertical ? Math.PI / 2 : 0, kind, pick(rng, CAR_COLORS), { parked: true });
    nextCarId += 1;
    return car;
  }
  return null;
}

/** A traffic car cruising a road, moving along one axis. */
export function spawnTrafficCar(rng, city, nearX, nearY) {
  const vertical = rng() < 0.5;
  const line = (Math.floor(rng() * 7) + 1) * ROAD_SPACING - ROAD_SPACING / 2;
  const along = range(rng, 150, WORLD.width - 150);
  const lane = (rng() < 0.5 ? -1 : 1) * 16;
  const x = vertical ? line + lane : along;
  const y = vertical ? along : line + lane;
  if (nearX !== undefined && Math.hypot(x - nearX, y - nearY) > 1400) return null;
  const dir = rng() < 0.5 ? -1 : 1;
  const car = makeCar(x, y, vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    pick(rng, CAR_KINDS), pick(rng, CAR_COLORS),
    { traffic: true, driver: 'traffic', axis: vertical ? 'y' : 'x', dir });
  car.speed = TRAFFIC_SPEED * range(rng, 0.8, 1.15);
  nextCarId += 1;
  return car;
}

/** Steer one traffic car along the grid; it turns at intersections sometimes. */
export function updateTrafficCar(car, dt, rng, cars) {
  const nearIntersection = (v) => {
    const rem = ((v - ROAD_SPACING / 2) % ROAD_SPACING + ROAD_SPACING) % ROAD_SPACING;
    return Math.min(rem, ROAD_SPACING - rem) < 26;
  };
  // Slow down for a car ahead on the same lane.
  let target = TRAFFIC_SPEED;
  for (const other of cars) {
    if (other === car || other.parked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = car.axis === 'x' ? dx * car.dir : dy * car.dir;
    const side = car.axis === 'x' ? Math.abs(dy) : Math.abs(dx);
    if (ahead > 0 && ahead < 90 && side < 30) { target = 0; break; }
  }
  car.speed += Math.max(-400 * dt, Math.min(200 * dt, target - car.speed));
  if (nearIntersection(car.x) && nearIntersection(car.y) && rng() < 0.012) {
    // Turn: swap axis, keep moving.
    if (car.axis === 'x') {
      car.axis = 'y';
      car.dir = rng() < 0.5 ? -1 : 1;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.axis = 'x';
      car.dir = rng() < 0.5 ? -1 : 1;
      car.angle = car.dir > 0 ? 0 : Math.PI;
    }
  }
  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  car.x = Math.max(60, Math.min(WORLD.width - 60, car.x + vx * dt));
  car.y = Math.max(60, Math.min(WORLD.height - 60, car.y + vy * dt));
  if (car.x <= 61 || car.x >= WORLD.width - 61 || car.y <= 61 || car.y >= WORLD.height - 61) {
    car.dir *= -1;
    car.angle += Math.PI;
  }
}

/** Drive the player's car: throttle steers with the car, not the screen.
 * Only the angle and speed change here; the caller moves the car with
 * axis-separated collision, so it slides along walls instead of wedging. */
export function drivePlayerCar(car, input, dt) {
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const forward = Math.abs(car.speed) > 1 ? Math.sign(car.speed) : 1;
  car.angle += steer * CAR.turnRate * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.25) * forward;
  if (input.up) car.speed += CAR.accel * dt;
  else if (input.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  else car.speed -= car.speed * 1.4 * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxForward, car.speed));
}
