// Drawing only: the city, cars, people and effects of Neon Bay Nights, in
// world coordinates under a camera that follows the player. No rules here.
import { WORLD, ROAD_SPACING, ROAD_WIDTH, DISTRICTS, PALETTE, FONT } from './config.js';
import { districtAt } from './config.js';
import { drawHud, drawTitle, drawPaused, drawOver, drawWin } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, w: 1280, h: 800 };

  function resize() {
    canvas.width = Math.round(window.innerWidth);
    canvas.height = Math.round(window.innerHeight);
    view.w = canvas.width;
    view.h = canvas.height;
    view.scale = Math.max(canvas.width / 1400, canvas.height / 900);
  }

  function text(value, x, y, size, color, align) {
    ctx.font = `${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawGround(state) {
    // District ground colours.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }
    // Marina water in the south-west corner.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WORLD.height - 220, 260, 220);
    ctx.fillStyle = '#2a6b7d';
    ctx.fillRect(0, WORLD.height - 220, 260, 6);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (let v = ROAD_SPACING / 2; v < WORLD.width; v += ROAD_SPACING) {
      ctx.fillRect(v - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
      ctx.fillRect(0, v - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);
    }
    // Sidewalks.
    ctx.fillStyle = PALETTE.sidewalk;
    for (let v = ROAD_SPACING / 2; v < WORLD.width; v += ROAD_SPACING) {
      ctx.fillRect(v - ROAD_WIDTH / 2 - 10, 0, 10, WORLD.height);
      ctx.fillRect(v + ROAD_WIDTH / 2, 0, 10, WORLD.height);
      ctx.fillRect(0, v - ROAD_WIDTH / 2 - 10, WORLD.width, 10);
      ctx.fillRect(0, v + ROAD_WIDTH / 2, WORLD.width, 10);
    }
    // Dashed centre lines.
    ctx.fillStyle = PALETTE.roadLine;
    for (let v = ROAD_SPACING / 2; v < WORLD.width; v += ROAD_SPACING) {
      for (let d = 0; d < WORLD.height; d += 46) ctx.fillRect(v - 2, d, 4, 22);
      for (let d = 0; d < WORLD.width; d += 46) ctx.fillRect(d, v - 2, 22, 4);
    }
    // District name labels on the ground.
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    }
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      // Height shadow, then the roof, then windows.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 6, b.y + 6 + b.height * 2, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,220,120,0.75)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 26));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if ((c * 7 + r * 3 + b.height) % 3 === 0) {
            ctx.fillRect(b.x + 8 + c * 26, b.y + 8 + r * 26, 10, 12);
          }
        }
      }
      if (b.sign) {
        ctx.font = `bold 15px ${FONT}`;
        ctx.fillStyle = b.signColor;
        ctx.textAlign = 'center';
        ctx.fillText(b.sign, b.x + b.w / 2, b.y - 6);
      }
    }
  }

  function drawCar(car, time) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const len = car.kind === 'van' ? 52 : car.kind === 'sport' ? 48 : 44;
    const wid = car.kind === 'van' ? 26 : 22;
    // Wheels.
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(-len / 2 + 4, -wid / 2 - 3, 12, 6);
    ctx.fillRect(-len / 2 + 4, wid / 2 - 3, 12, 6);
    ctx.fillRect(len / 2 - 16, -wid / 2 - 3, 12, 6);
    ctx.fillRect(len / 2 - 16, wid / 2 - 3, 12, 6);
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(-6, -wid / 2 + 4, 16, wid - 8, 4);
    ctx.fill();
    if (car.kind === 'cop') {
      const flash = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
      ctx.fillRect(-2, -wid / 2 - 2, 8, 5);
      ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
      ctx.fillRect(-2, wid / 2 - 3, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.font = `bold 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('NBP', 0, 2);
    }
    if (car.kind === 'sport') {
      ctx.fillStyle = '#111';
      ctx.fillRect(len / 2 - 8, -3, 8, 6);
    }
    ctx.restore();
  }

  function drawPed(ped) {
    if (ped.state === 'down') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 14, 8, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.cop ? '#20242e' : ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(8, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    if (ped.cop) {
      ctx.fillStyle = '#f2c94c';
      ctx.font = `bold 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PD', 0, 3);
    }
    if (ped.hailing) {
      ctx.fillStyle = '#f2c94c';
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('TAXI?', 0, -18);
    }
    ctx.restore();
  }

  function drawPlayer(state, time) {
    const p = state.player;
    const car = state.car;
    if (car) return; // the player is inside the car, drawn with it
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#1d2b53';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5da2';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(9, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // Gun barrel when aiming.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.restore();
    // A soft ring so the player is easy to spot in a crowd.
    ctx.strokeStyle = 'rgba(255,93,162,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMarkers(state, time) {
    const pulse = 1 + Math.sin(time * 5) * 0.15;
    // Mission target beacon.
    const target = !state.storyDone && state.currentStepTarget ? state.currentStepTarget : null;
    if (target) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 46 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(242,201,76,0.25)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 46 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y - 52);
      ctx.lineTo(target.x + 8, target.y - 34);
      ctx.lineTo(target.x - 8, target.y - 34);
      ctx.closePath();
      ctx.fill();
    }
    // Taxi destination.
    if (state.taxi) {
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.taxi.dest.x, state.taxi.dest.y, 34 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.cyan;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', state.taxi.dest.x, state.taxi.dest.y + 5);
    }
    // Pickups.
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      if (pk.kind === 'cash') {
        ctx.fillStyle = '#2fae4e';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 14px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('$', pk.x, pk.y + 5);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(pk.x - 12, pk.y - 4, 24, 8);
        ctx.fillRect(pk.x - 4, pk.y - 12, 8, 24);
        ctx.strokeStyle = '#d94f3d';
        ctx.lineWidth = 2;
        ctx.strokeRect(pk.x - 12, pk.y - 12, 24, 24);
      }
    }
  }

  function drawEffects(state) {
    for (const fx of state.effects) {
      if (fx.kind === 'flash') {
        ctx.fillStyle = `rgba(255,220,120,${fx.life / 0.08})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,80,80,${fx.life / 0.4})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ffe27a';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Day-cycle tint: golden dusk, blue night, pale dawn, clear noon. */
  function dayTint(clock) {
    if (clock >= 6 && clock < 10) return 'rgba(255,170,90,0.10)';
    if (clock >= 10 && clock < 16) return null;
    if (clock >= 16 && clock < 19) return 'rgba(255,120,60,0.16)';
    if (clock >= 19 && clock < 21) return 'rgba(80,60,140,0.22)';
    if (clock >= 21 || clock < 5) return 'rgba(10,10,50,0.28)';
    return 'rgba(255,190,140,0.08)';
  }

  function draw(state, screen, worldApi) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0c0e16';
    ctx.fillRect(0, 0, view.w, view.h);
    const cam = state.camera;
    const s = view.scale;
    // Clamp the camera so the view never shows the void past the city's edge.
    const halfW = view.w / 2 / s;
    const halfH = view.h / 2 / s;
    const cx = Math.max(halfW, Math.min(WORLD.width - halfW, cam.x));
    const cy = Math.max(halfH, Math.min(WORLD.height - halfH, cam.y));
    ctx.setTransform(s, 0, 0, s, view.w / 2 - cx * s, view.h / 2 - cy * s);
    drawGround(state);
    drawMarkers(state, state.elapsed);
    drawBuildings(state);
    for (const car of state.cars) drawCar(car, state.elapsed);
    for (const ped of state.peds) drawPed(ped);
    for (const cop of state.cops) drawPed(cop);
    drawPlayer(state, state.elapsed);
    drawEffects(state);
    // Night/dusk tint over the visible window.
    const tint = dayTint(state.clock);
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(cx - view.w / 2 / s, cy - view.h / 2 / s, view.w / s, view.h / s);
    }
    // HUD and screens in screen space.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHud(ctx, state, worldApi, view);
    if (screen === SCREEN_TITLE) drawTitle(ctx, state, view);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx, view);
    else if (screen === SCREEN_OVER) drawOver(ctx, state, view);
    else if (screen === SCREEN_WIN) drawWin(ctx, state, view);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
