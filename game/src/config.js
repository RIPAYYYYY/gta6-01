// Every tuning number, place and colour for Neon Bay Nights, in one place.
// The city is a fixed 2880 x 2160 world; the camera shows a window of it.
export const WORLD = { width: 2880, height: 2160 };
export const ROAD_SPACING = 360;
export const ROAD_WIDTH = 76;
export const STEP = 1 / 60;
export const SAVE_KEY = 'neon-bay-nights.save.v1';

export const PLAYER = {
  walkSpeed: 185,
  runSpeed: 265,
  radius: 13,
  maxHealth: 100,
};

export const CAR = {
  accel: 520,
  brake: 760,
  reverseAccel: 300,
  maxForward: 430,
  maxReverse: 150,
  turnRate: 2.6,
  radius: 20,
};

export const TRAFFIC_SPEED = 150;
export const COP_SPEED = 330;
export const BULLET_SPEED = 720;

export const PAY = {
  mission: [400, 600, 800, 1000, 2500],
  taxiMin: 60,
  taxiMax: 180,
  stash: 150,
};

export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 960, h: 1080, ground: '#3a3f4a', roof: '#565d6e' },
  { name: 'Uptown', x: 960, y: 0, w: 960, h: 1080, ground: '#41434f', roof: '#6b5a7a' },
  { name: 'Downtown', x: 1920, y: 0, w: 960, h: 1080, ground: '#33363f', roof: '#4a5568' },
  { name: 'Marina', x: 0, y: 1080, w: 960, h: 1080, ground: '#2f3d46', roof: '#4d6a72' },
  { name: 'Harbor', x: 960, y: 1080, w: 960, h: 1080, ground: '#3d3a33', roof: '#6e5a44' },
  { name: 'Suburbs', x: 1920, y: 1080, w: 960, h: 1080, ground: '#3c4636', roof: '#5d7050' },
];

export const PALETTE = {
  road: '#23242c',
  roadLine: '#c9a227',
  sidewalk: '#4a4d58',
  grass: '#2e4030',
  water: '#1d4e5f',
  panel: 'rgba(12, 14, 22, 0.82)',
  panelBorder: '#f2c94c',
  text: '#f2f0e6',
  muted: '#a9adb8',
  gold: '#f2c94c',
  pink: '#ff5da2',
  cyan: '#37d3e6',
  red: '#ff4d4d',
  green: '#59d867',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Road centre lines: vertical and horizontal, every ROAD_SPACING px. */
export function roadLines() {
  const lines = [];
  for (let v = ROAD_SPACING / 2; v < WORLD.width; v += ROAD_SPACING) lines.push(v);
  return lines;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

/** True when the point is on a road (within the road half-width of a centre line). */
export function onRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  const lines = roadLines();
  for (const v of lines) {
    if (Math.abs(x - v) <= half || Math.abs(y - v) <= half) return true;
  }
  return false;
}

/** Nearest road centre coordinate on one axis. */
export function nearestRoadCoord(v) {
  return Math.round((v - ROAD_SPACING / 2) / ROAD_SPACING) * ROAD_SPACING + ROAD_SPACING / 2;
}
