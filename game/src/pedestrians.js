// Pedestrians for Neon Bay Nights: walkers on the sidewalks who stroll, cross
// at intersections, flee from gunfire and speeding cars, and can hail a taxi.
import { WORLD, ROAD_SPACING, ROAD_WIDTH } from './config.js';
import { range, rangeInt, pick } from './random.js';

const SHIRT_COLORS = ['#e8e8e8', '#d94f3d', '#3d7bd9', '#e8b73a', '#7a4fd9', '#3da67a', '#e86aa8', '#ff8c42'];
const SKIN_COLORS = ['#f2c89b', '#c98d5f', '#8a5a3b', '#f7d7b0', '#6e4423'];

export function makePed(rng, x, y) {
  const vertical = rng() < 0.5;
  return {
    x, y,
    angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
    speed: range(rng, 45, 75),
    shirt: pick(rng, SHIRT_COLORS),
    skin: pick(rng, SKIN_COLORS),
    state: 'walk', // 'walk' | 'flee' | 'down'
    fleeTimer: 0,
    changeTimer: range(rng, 2, 6),
    hailing: false,
  };
}

/** A pedestrian on a sidewalk near (cx, cy). */
export function spawnPed(rng, cx, cy) {
  const line = (Math.floor(rng() * 7) + 1) * ROAD_SPACING - ROAD_SPACING / 2;
  const along = range(rng, 150, WORLD.width - 150);
  const off = ROAD_WIDTH / 2 + 16;
  const vertical = rng() < 0.5;
  const x = vertical ? line + (rng() < 0.5 ? off : -off) : along;
  const y = vertical ? along : line + (rng() < 0.5 ? off : -off);
  const ped = makePed(rng, Math.max(80, Math.min(WORLD.width - 80, x)), Math.max(80, Math.min(WORLD.height - 80, y)));
  return ped;
}

export function updatePed(ped, dt, rng, danger) {
  if (ped.state === 'down') return;
  ped.changeTimer -= dt;
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
  }
  // Flee from a nearby danger point (gunshot, speeding car, police chase).
  if (danger && Math.hypot(ped.x - danger.x, ped.y - danger.y) < 260 && ped.state !== 'flee') {
    ped.state = 'flee';
    ped.fleeTimer = range(rng, 1.5, 3);
    ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
  }
  const speed = ped.state === 'flee' ? 190 : ped.speed;
  if (ped.changeTimer <= 0 && ped.state === 'walk') {
    ped.changeTimer = range(rng, 3, 8);
    if (rng() < 0.4) ped.angle += (rng() < 0.5 ? -1 : 1) * (Math.PI / 2);
  }
  ped.x += Math.cos(ped.angle) * speed * dt;
  ped.y += Math.sin(ped.angle) * speed * dt;
  // Keep pedestrians inside the city and roughly near roads.
  if (ped.x < 60 || ped.x > WORLD.width - 60 || ped.y < 60 || ped.y > WORLD.height - 60) {
    ped.angle += Math.PI;
    ped.x = Math.max(60, Math.min(WORLD.width - 60, ped.x));
    ped.y = Math.max(60, Math.min(WORLD.height - 60, ped.y));
  }
}
