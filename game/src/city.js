// The city of Neon Bay: a seeded road grid with buildings in every block,
// plus the collision and district helpers the rest of the game uses.
import { WORLD, ROAD_SPACING, ROAD_WIDTH, districtAt, roadLines } from './config.js';
import { range, rangeInt, pick } from './random.js';

const ROOF_COLORS = ['#5a6274', '#6b5a7a', '#4a5568', '#4d6a72', '#6e5a44', '#5d7050', '#7a5a4a', '#54627a'];
const NEON_SIGNS = ['CLUB', 'BAR', 'HOTEL', 'PIZZA', '24H', 'CASINO', 'GYM', 'TATTOO', 'MOTEL', 'DINER'];

/** Build every building in the city from the seed. Blocks are the squares between roads. */
export function buildCity(rng) {
  const buildings = [];
  const half = ROAD_WIDTH / 2;
  const lines = roadLines();
  for (let ci = 0; ci < lines.length - 1; ci += 1) {
    for (let ri = 0; ri < lines.length - 1; ri += 1) {
      const x0 = lines[ci] + half + 8;
      const x1 = lines[ci + 1] - half - 8;
      const y0 = lines[ri] + half + 8;
      const y1 = lines[ri + 1] - half - 8;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      // The marina corner is water, not buildings.
      if (cx < 300 && cy > WORLD.height - 300) continue;
      const district = districtAt(cx, cy);
      const count = rangeInt(rng, 1, 3);
      for (let i = 0; i < count; i += 1) {
        const w = range(rng, 70, Math.min(190, (x1 - x0) / count - 12));
        const h = range(rng, 60, Math.min(170, y1 - y0 - 12));
        const bx = x0 + ((x1 - x0 - w) * (count === 1 ? 0.5 : (i + 0.5) / count - w / (2 * (x1 - x0)) * 0 + (rng() * 0.2 - 0.1)));
        const by = y0 + range(rng, 0, Math.max(0, y1 - y0 - h));
        const b = {
          x: Math.max(x0, Math.min(x1 - w, bx)),
          y: Math.max(y0, Math.min(y1 - h, by)),
          w, h,
          height: rangeInt(rng, 1, 5),
          roof: pick(rng, ROOF_COLORS),
          district: district.name,
          sign: rng() < 0.3 ? pick(rng, NEON_SIGNS) : null,
          signColor: pick(rng, ['#ff5da2', '#37d3e6', '#f2c94c', '#59d867']),
        };
        buildings.push(b);
      }
    }
  }
  return { buildings };
}

/** Push a circle (x, y, radius) out of every building it overlaps. Returns true if it hit one. */
export function collideBuildings(city, pos, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - nx;
    const dy = pos.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 0.01) {
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * radius;
      pos.y = ny + (dy / d) * radius;
    } else {
      // Centre inside the building: push out along the smallest penetration.
      const left = pos.x - b.x;
      const right = b.x + b.w - pos.x;
      const top = pos.y - b.y;
      const bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - radius;
      else if (m === right) pos.x = b.x + b.w + radius;
      else if (m === top) pos.y = b.y - radius;
      else pos.y = b.y + b.h + radius;
    }
  }
  return hit;
}

/** True when a circle at (x, y) overlaps any building. */
export function hitsBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** A free spot on a road near (x, y): snap to the nearest road centre line. */
export function snapToRoad(x, y) {
  const coord = (v) => Math.round((v - ROAD_SPACING / 2) / ROAD_SPACING) * ROAD_SPACING + ROAD_SPACING / 2;
  return { x: coord(x), y: coord(y) };
}
