// The HUD and the menus of Neon Bay Nights: health, money, wanted stars,
// the mission objective, the minimap, and the title / pause / end screens.
import { WORLD, PALETTE, FONT, PLAYER } from './config.js';
import { districtAt } from './config.js';

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || ''} ${size}px ${FONT}`.trim();
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(242,201,76,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function clockText(clock) {
  const h = Math.floor(clock) % 24;
  const m = Math.floor((clock % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawMinimap(ctx, state, x, y, w, h) {
  panel(ctx, x, y, w, h);
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  // District blocks.
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (const d of state.city.buildings.slice(0, 0)) { /* no-op, keeps the loop cheap */ }
  // Roads.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let v = 180; v < WORLD.width; v += 360) {
    ctx.fillRect(x + v * sx - 1, y, 2, h);
    ctx.fillRect(x, y + v * sy - 1, w, 2);
  }
  // Mission target.
  if (state.currentStepTarget) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x + state.currentStepTarget.x * sx, y + state.currentStepTarget.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Taxi destination.
  if (state.taxi) {
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(x + state.taxi.dest.x * sx, y + state.taxi.dest.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cop cars.
  ctx.fillStyle = '#ff4d4d';
  for (const car of state.cars) {
    if (car.cop) {
      ctx.beginPath();
      ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Player arrow.
  const pos = state.car ? state.car : state.player;
  const px = x + pos.x * sx;
  const py = y + pos.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.car ? state.car.angle : state.player.angle);
  ctx.fillStyle = PALETTE.pink;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, 'NEON BAY', x + 6, y + h - 6, 10, PALETTE.muted, 'left', 'bold');
}

export function drawHud(ctx, state, worldApi, view) {
  const w = view.w;
  const h = view.h;
  // Top-left status panel.
  panel(ctx, 12, 12, 300, 96);
  const hpFrac = Math.max(0, state.health / PLAYER.maxHealth);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 26, 180, 16);
  ctx.fillStyle = hpFrac > 0.5 ? '#59d867' : hpFrac > 0.25 ? '#f2c94c' : '#ff4d4d';
  ctx.fillRect(24, 26, 180 * hpFrac, 16);
  text(ctx, `HP ${Math.ceil(state.health)}`, 210, 39, 14, PALETTE.text, 'left', 'bold');
  text(ctx, `$${state.money.toLocaleString('en-US')}`, 24, 68, 22, PALETTE.gold, 'left', 'bold');
  // Wanted stars.
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '\u2605' : '\u2606';
  text(ctx, stars, 24, 94, 20, state.wanted > 0 ? '#ff4d4d' : '#888', 'left');
  text(ctx, `WANTED ${state.wanted}`, 150, 94, 13, state.wanted > 0 ? '#ff4d4d' : PALETTE.muted, 'left', 'bold');
  // Top-right clock and district.
  const pos = state.car ? state.car : state.player;
  const district = districtAt(pos.x, pos.y);
  panel(ctx, w - 212, 12, 200, 56);
  text(ctx, clockText(state.clock), w - 24, 36, 20, PALETTE.text, 'right', 'bold');
  text(ctx, district.name, w - 24, 58, 13, PALETTE.muted, 'right');
  // Mission objective bar, top centre.
  const objective = worldApi.missionObjective();
  ctx.font = `bold 16px ${FONT}`;
  const ow = Math.min(w - 40, ctx.measureText(objective).width + 32);
  panel(ctx, (w - ow) / 2, 12, ow, 34);
  text(ctx, objective, w / 2, 34, 15, PALETTE.text, 'center', 'bold');
  // Transient message under the objective.
  if (state.messageTimer > 0 && state.message) {
    text(ctx, state.message, w / 2, 68, 15, PALETTE.gold, 'center');
  }
  // Big banner (mission complete, story complete).
  if (state.bannerTimer > 0 && state.banner) {
    ctx.font = `bold 30px ${FONT}`;
    const bw = ctx.measureText(state.banner).width + 40;
    panel(ctx, (w - bw) / 2, 84, bw, 46);
    text(ctx, state.banner, w / 2, 115, 26, PALETTE.gold, 'center', 'bold');
  }
  // Bottom-left controls and context hints.
  const hints = state.car
    ? 'WASD drive \u00b7 E exit car \u00b7 Click honk \u00b7 T taxi fare \u00b7 P pause'
    : 'WASD move \u00b7 Shift run \u00b7 E enter car \u00b7 Click shoot \u00b7 P pause';
  text(ctx, hints, 14, h - 14, 13, 'rgba(255,255,255,0.75)', 'left');
  if (state.taxi) {
    text(ctx, `FARE: take them to ${state.taxi.dest.name} \u2014 $${state.taxi.fare}`, 14, h - 36, 14, PALETTE.cyan, 'left', 'bold');
  }
  // Minimap, bottom right.
  drawMinimap(ctx, state, w - 232, h - 182, 220, 165);
}

function centrePanel(ctx, view, title, lines, prompt, titleColor) {
  const w = Math.min(640, view.w - 40);
  const h = 150 + lines.length * 30;
  const x = (view.w - w) / 2;
  const y = (view.h - h) / 2;
  ctx.fillStyle = 'rgba(8,10,18,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  text(ctx, title, view.w / 2, y + 62, 44, titleColor || PALETTE.gold, 'center', 'bold');
  lines.forEach((line, i) => {
    text(ctx, line, view.w / 2, y + 108 + i * 30, 17, PALETTE.text, 'center');
  });
  text(ctx, prompt, view.w / 2, y + h - 24, 16, PALETTE.cyan, 'center', 'bold');
}

export function drawTitle(ctx, state, view) {
  centrePanel(ctx, view, 'NEON BAY NIGHTS', [
    'Rico Vane, wheelman for hire. Five jobs from Mara at the Marina Club.',
    'Drive the city, steal cars, outrun the Neon Bay police, finish the story.',
    `Money $${state.money} \u00b7 Jobs done ${state.stats.missionsDone}/5 \u00b7 Progress saves automatically.`,
  ], 'Click or press Enter to play', PALETTE.pink);
}

export function drawPaused(ctx, view) {
  centrePanel(ctx, view, 'PAUSED', ['The city waits for no one. Except now.'], 'Press P to resume');
}

export function drawOver(ctx, state, view) {
  centrePanel(ctx, view, 'BUSTED', [
    `Rico went down in ${districtAt(state.player.x, state.player.y).name}.`,
    `Money $${state.money} \u00b7 Jobs done ${state.stats.missionsDone}/5 \u00b7 Fares ${state.stats.fares}`,
  ], 'Click or press Enter to try again', '#ff4d4d');
}

export function drawWin(ctx, state, view) {
  centrePanel(ctx, view, 'STORY COMPLETE', [
    'All five jobs done. Rico owns Neon Bay.',
    `Money $${state.money} \u00b7 Cars stolen ${state.stats.carsStolen} \u00b7 Fares ${state.stats.fares}`,
    'Free roam continues \u2014 keep earning with taxi fares and stashes.',
  ], 'Click or press Enter to keep playing');
}
