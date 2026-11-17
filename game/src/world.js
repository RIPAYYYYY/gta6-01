// The rules and state of Neon Bay Nights, with no drawing in it: the player
// on foot and in cars, traffic, pedestrians, police and wanted stars, combat,
// missions, taxi fares, cash stashes, the day cycle and the save. step()
// advances one fixed step and returns what happened as bit flags.
import { WORLD, STEP, PLAYER, CAR, PAY, SAVE_KEY, BULLET_SPEED } from './config.js';
import { buildCity, collideBuildings, hitsBuilding } from './city.js';
import { createRandom } from './random.js';
import { PLACES, MISSION_TITLES, MISSION_INTROS, missionSteps, stashSpots } from './missions.js';
import { makeCar, spawnParkedCar, spawnTrafficCar, updateTrafficCar, drivePlayerCar } from './vehicles.js';
import { spawnPed, updatePed } from './pedestrians.js';
import { MAX_WANTED, copsForLevel, raiseWanted, decayWanted, spawnCopCar, spawnFootCop, updateCopCar } from './police.js';

export const EVENT_OVER = 1;
export const EVENT_WIN = 2;
export const EVENT_MISSION = 4;
export const EVENT_PICKUP = 8;
export const EVENT_CRIME = 16;

const TAXI_WAIT = 26;

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const state = {
    seed,
    city,
    elapsed: 0,
    clock: 17.2, // golden hour at the start
    money: 250,
    health: PLAYER.maxHealth,
    wanted: 0,
    heatTimer: 0,
    lastCrimeAt: -100,
    missionIndex: 0,
    missionStepIndex: 0,
    storyDone: false,
    screen: 'title',
    player: { x: 540, y: 1900, angle: -Math.PI / 2, radius: PLAYER.radius },
    car: null, // the car the player is driving, or null on foot
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    pickups: [],
    taxi: null,
    taxiTimer: 12,
    hailPed: null,
    effects: [],
    camera: { x: 540, y: 1900 },
    mouseWorld: { x: 0, y: 0 },
    view: { w: 1280, h: 800 },
    message: '',
    messageTimer: 0,
    banner: '',
    bannerTimer: 0,
    shootCooldown: 0,
    copSpawnTimer: 0,
    stats: { kills: 0, carsStolen: 0, fares: 0, missionsDone: 0 },
    audio: null,
  };

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const save = JSON.parse(raw);
      if (typeof save.money === 'number') state.money = save.money;
      if (typeof save.missionIndex === 'number') state.missionIndex = Math.min(4, Math.max(0, save.missionIndex));
      if (typeof save.health === 'number') state.health = Math.min(PLAYER.maxHealth, Math.max(1, save.health));
    } catch { /* a bad save just starts fresh */ }
  }

  function save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money, missionIndex: state.missionIndex, health: state.health,
      }));
    } catch { /* storage can be off; the game still plays */ }
  }

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 4;
  }

  function announce(text, seconds) {
    state.banner = text;
    state.bannerTimer = seconds || 3.5;
  }

  function currentSteps() {
    return missionSteps(Math.min(state.missionIndex, 4));
  }

  function currentStep() {
    const steps = currentSteps();
    return steps[Math.min(state.missionStepIndex, steps.length - 1)];
  }

  function missionObjective() {
    if (state.storyDone) return 'Story complete \u2014 free roam. Earn cash with taxi fares and stashes.';
    const step = currentStep();
    return `Job ${state.missionIndex + 1}/5 \u2014 ${MISSION_TITLES[state.missionIndex]}: ${step.text}`;
  }

  function reset() {
    state.elapsed = 0;
    state.clock = 17.2;
    state.money = 250;
    state.health = PLAYER.maxHealth;
    state.wanted = 0;
    state.heatTimer = 0;
    state.lastCrimeAt = -100;
    state.missionIndex = 0;
    state.missionStepIndex = 0;
    state.storyDone = false;
    state.player.x = 900;
    state.player.y = 1620;
    state.player.angle = -Math.PI / 2;
    state.car = null;
    state.cars = [];
    state.peds = [];
    state.cops = [];
    state.bullets = [];
    state.effects = [];
    state.taxi = null;
    state.taxiTimer = 12;
    state.hailPed = null;
    state.shootCooldown = 0;
    state.stats = { kills: 0, carsStolen: 0, fares: 0, missionsDone: 0 };
    state.pickups = stashSpots().map((s) => ({ x: s.x, y: s.y, kind: 'cash', taken: false }));
    state.pickups.push({ x: 900, y: 900, kind: 'health', taken: false });
    state.pickups.push({ x: 1980, y: 1980, kind: 'health', taken: false });
    state.pickups.push({ x: 2700, y: 540, kind: 'health', taken: false });
    // A starter car parked by the Marina Club, and parked cars across town.
    const starter = makeCar(900, 1590, -Math.PI / 2, 'sedan', '#d94f3d', { parked: true });
    state.cars.push(starter);
    for (let i = 0; i < 9; i += 1) {
      const car = spawnParkedCar(rng, city, 900, 1620);
      if (car) state.cars.push(car);
    }
    // One sports car waiting in Uptown for the Hot Wheels job.
    const sports = makeCar(PLACES.uptownSports.x, PLACES.uptownSports.y + 30, 0, 'sport', '#f2c94c', { parked: true });
    state.cars.push(sports);
    state.sportsCar = sports;
    for (let i = 0; i < 8; i += 1) {
      const car = spawnTrafficCar(rng, city, 900, 1620);
      if (car) state.cars.push(car);
    }
    for (let i = 0; i < 16; i += 1) state.peds.push(spawnPed(rng, 900, 1620));
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    loadSave();
    say(MISSION_INTROS[state.missionIndex], 5);
  }

  function playerPos() {
    return state.car ? { x: state.car.x, y: state.car.y } : state.player;
  }

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of state.cars) {
      if (car.cop) continue;
      const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
      if (d < bestD) { best = car; bestD = d; }
    }
    return best;
  }

  function enterCar(car) {
    const wasTraffic = car.driver === 'traffic';
    car.parked = false;
    car.traffic = false;
    car.driver = 'player';
    car.speed = 0;
    state.car = car;
    state.player.angle = car.angle;
    if (wasTraffic) {
      state.stats.carsStolen += 1;
      raiseWanted(state, 1);
      say('You stole a car! The cops were told.', 3);
      if (state.audio) state.audio.wanted();
      return EVENT_CRIME;
    }
    return 0;
  }

  function exitCar() {
    const car = state.car;
    if (!car) return;
    car.parked = true;
    car.driver = 'none';
    car.speed = 0;
    state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    const pos = state.player;
    if (hitsBuilding(city, pos.x, pos.y, 14)) {
      state.player.x = car.x - Math.cos(car.angle + Math.PI / 2) * 34;
      state.player.y = car.y - Math.sin(car.angle + Math.PI / 2) * 34;
    }
    collideBuildings(city, state.player, 14);
    state.car = null;
  }

  function shoot() {
    if (state.shootCooldown > 0) return;
    state.shootCooldown = 0.28;
    const from = playerPos();
    const angle = Math.atan2(state.mouseWorld.y - from.y, state.mouseWorld.x - from.x);
    state.bullets.push({
      x: from.x + Math.cos(angle) * 22,
      y: from.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: 0.9,
    });
    state.effects.push({ x: from.x + Math.cos(angle) * 26, y: from.y + Math.sin(angle) * 26, kind: 'flash', life: 0.08 });
    if (state.audio) state.audio.shoot();
  }

  function damagePed(ped, amount) {
    if (ped.state === 'down') return 0;
    ped.state = 'down';
    ped.fleeTimer = 0;
    state.stats.kills += 1;
    state.effects.push({ x: ped.x, y: ped.y, kind: 'hit', life: 0.4 });
    if (ped.cop) {
      raiseWanted(state, 1);
      if (state.audio) state.audio.wanted();
      return EVENT_CRIME;
    }
    raiseWanted(state, 1);
    if (state.audio) state.audio.wanted();
    return EVENT_CRIME;
  }

  function completeStep() {
    const steps = currentSteps();
    const step = steps[state.missionStepIndex];
    if (step.raisesHeat) raiseWanted(state, step.raisesHeat);
    state.missionStepIndex += 1;
    if (state.audio) state.audio.pickup();
    if (state.missionStepIndex >= steps.length) {
      const pay = PAY.mission[state.missionIndex];
      state.money += pay;
      state.stats.missionsDone += 1;
      announce(`${MISSION_TITLES[state.missionIndex]} complete! +$${pay}`, 4);
      if (state.audio) state.audio.mission();
      state.missionIndex += 1;
      state.missionStepIndex = 0;
      save();
      if (state.missionIndex >= 5) {
        state.storyDone = true;
        announce('STORY COMPLETE \u2014 Rico owns Neon Bay. Free roam!', 6);
        return EVENT_MISSION | EVENT_WIN;
      }
      say(MISSION_INTROS[state.missionIndex], 5);
      return EVENT_MISSION;
    }
    return EVENT_MISSION;
  }

  function checkMission() {
    if (state.storyDone) return 0;
    const step = currentStep();
    if (step.loseHeat) {
      if (state.wanted === 0) return completeStep();
      return 0;
    }
    if (!step.target) return 0;
    const pos = playerPos();
    const d = Math.hypot(pos.x - step.target.x, pos.y - step.target.y);
    if (d > step.radius) return 0;
    if (step.needCar && !state.car) return 0;
    if (step.stealSports) {
      if (state.car !== state.sportsCar) {
        if (!state.car) say('Get in the yellow sports car (E).', 2);
        return 0;
      }
    }
    return completeStep();
  }

  function updateTaxi(dt, input) {
    state.taxiTimer -= dt;
    if (!state.taxi && !state.hailPed && state.car && state.taxiTimer <= 0) {
      // A fare waves from the sidewalk ahead of the car.
      const angle = state.car.angle + (rng() < 0.5 ? -0.4 : 0.4);
      const px = state.car.x + Math.cos(angle) * 260;
      const py = state.car.y + Math.sin(angle) * 260;
      if (px > 100 && px < WORLD.width - 100 && py > 100 && py < WORLD.height - 100) {
        const ped = spawnPed(rng, px, py);
        ped.x = px;
        ped.y = py;
        ped.hailing = true;
        ped.state = 'walk';
        state.hailPed = ped;
        state.peds.push(ped);
        say('A fare is waving. Drive close and press T.', 4);
      }
      state.taxiTimer = TAXI_WAIT;
    }
    if (state.hailPed) {
      const d = Math.hypot(state.hailPed.x - state.player.x, state.hailPed.y - state.player.y);
      const nearCar = state.car && Math.hypot(state.hailPed.x - state.car.x, state.hailPed.y - state.car.y) < 90;
      if (nearCar && input.taxiPressed) {
        const dests = Object.values(PLACES);
        const dest = dests[Math.floor(rng() * dests.length)];
        const fare = Math.max(PAY.taxiMin, Math.min(PAY.taxiMax, Math.floor(d / 4)));
        state.taxi = { dest, fare, state: 'dropoff' };
        state.peds = state.peds.filter((p) => p !== state.hailPed);
        state.hailPed = null;
        say(`Fare aboard \u2014 take them to ${dest.name} ($${fare}).`, 4);
        if (state.audio) state.audio.pickup();
      } else if (d > 700) {
        state.peds = state.peds.filter((p) => p !== state.hailPed);
        state.hailPed = null;
      }
    }
    if (state.taxi && state.car) {
      const d = Math.hypot(state.taxi.dest.x - state.car.x, state.taxi.dest.y - state.car.y);
      if (d < 80) {
        state.money += state.taxi.fare;
        state.stats.fares += 1;
        announce(`Fare delivered! +$${state.taxi.fare}`, 3);
        if (state.audio) state.audio.cash();
        state.taxi = null;
        state.taxiTimer = TAXI_WAIT;
        save();
      }
    }
  }

  function updatePolice(dt) {
    decayWanted(state, dt);
    const wanted = state.wanted;
    const want = copsForLevel(wanted);
    const pos = playerPos();
    state.copSpawnTimer -= dt;
    const copCars = state.cars.filter((c) => c.cop);
    if (wanted > 0 && copCars.length < want.cars && state.copSpawnTimer <= 0) {
      const car = spawnCopCar(rng, pos);
      state.cars.push(car);
      state.copSpawnTimer = 2.5;
      if (state.audio) state.audio.siren(true);
    }
    if (wanted === 0) {
      if (state.audio) state.audio.siren(false);
      // Cops give up and drive off once the heat is gone.
      state.cars = state.cars.filter((c) => !c.cop || Math.hypot(c.x - pos.x, c.y - pos.y) < 900);
      state.cops = [];
    }
    if (wanted > 0 && state.cops.length < want.foot && state.copSpawnTimer <= 0) {
      state.cops.push(spawnFootCop(rng, pos));
      state.copSpawnTimer = 2;
    }
    for (const car of state.cars) {
      if (car.cop) updateCopCar(car, pos, dt);
    }
    for (const cop of state.cops) {
      const dx = pos.x - cop.x;
      const dy = pos.y - cop.y;
      const d = Math.hypot(dx, dy);
      cop.angle = Math.atan2(dy, dx);
      if (d > 24) {
        cop.x += (dx / d) * cop.speed * dt;
        cop.y += (dy / d) * cop.speed * dt;
      }
      collideBuildings(city, cop, 12);
      if (!state.car && d < 26) {
        state.health -= 14 * dt;
        state.effects.push({ x: cop.x, y: cop.y, kind: 'hit', life: 0.2 });
      }
    }
    // A patrol car ramming the player's car damages it; on foot it hurts.
    for (const car of state.cars) {
      if (!car.cop) continue;
      const d = Math.hypot(car.x - pos.x, car.y - pos.y);
      if (state.car && d < 44) {
        car.speed *= 0.4;
        state.car.speed *= 0.7;
        state.health -= 6 * dt;
        if (state.audio) state.audio.crash();
      }
    }
  }

  function step(dt, input) {
    let events = 0;
    state.elapsed += dt;
    state.clock = (state.clock + dt * (24 / 480)) % 24;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shootCooldown > 0) state.shootCooldown -= dt;
    if (state.wanted === 0 && state.health < PLAYER.maxHealth) {
      state.health = Math.min(PLAYER.maxHealth, state.health + 2.5 * dt);
    }

    const pos = playerPos();
    const danger = state.bullets.length > 0 ? { x: state.bullets[0].x, y: state.bullets[0].y } : null;

    // --- Player movement ---
    if (state.car) {
      drivePlayerCar(state.car, input, dt);
      // Move one axis at a time so the car slides along walls instead of wedging.
      const nx = state.car.x + Math.cos(state.car.angle) * state.car.speed * dt;
      const ny = state.car.y + Math.sin(state.car.angle) * state.car.speed * dt;
      if (!hitsBuilding(city, nx, state.car.y, CAR.radius)) state.car.x = nx;
      else if (Math.abs(state.car.speed) > 180 && state.audio) state.audio.crash();
      if (!hitsBuilding(city, state.car.x, ny, CAR.radius)) state.car.y = ny;
      else if (Math.abs(state.car.speed) > 180 && state.audio) state.audio.crash();
      if (hitsBuilding(city, state.car.x, state.car.y, CAR.radius)) state.car.speed *= -0.25;
      state.car.x = Math.max(40, Math.min(WORLD.width - 40, state.car.x));
      state.car.y = Math.max(40, Math.min(WORLD.height - 40, state.car.y));
      // Running over pedestrians is a crime.
      for (const ped of state.peds) {
        if (ped.state === 'down' || ped.cop) continue;
        const d = Math.hypot(ped.x - state.car.x, ped.y - state.car.y);
        if (d < 26 && Math.abs(state.car.speed) > 120) {
          events |= damagePed(ped, 100);
          state.car.speed *= 0.8;
        }
      }
      if (state.audio) state.audio.engine(Math.abs(state.car.speed) / CAR.maxForward);
    } else {
      const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const moving = mx !== 0 || my !== 0;
      const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (moving) {
        const len = Math.hypot(mx, my);
        state.player.x += (mx / len) * speed * dt;
        state.player.y += (my / len) * speed * dt;
        state.player.angle = Math.atan2(my, mx);
      }
      state.player.x = Math.max(30, Math.min(WORLD.width - 30, state.player.x));
      state.player.y = Math.max(30, Math.min(WORLD.height - 30, state.player.y));
      collideBuildings(city, state.player, PLAYER.radius);
      if (state.audio) state.audio.engine(0);
    }

    // --- Enter / exit cars ---
    if (input.interactPressed) {
      if (state.car) exitCar();
      else {
        const car = nearestCar(70);
        if (car) events |= enterCar(car);
      }
    }

    // --- Shooting (mouse aim) ---
    if ((input.shootPressed || input.shoot) && !state.car) shoot();
    else if (input.shootPressed && state.car) {
      // Honk from the car.
      if (state.audio) state.audio.horn();
    }

    // --- Bullets ---
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > WORLD.width || b.y < 0 || b.y > WORLD.height;
      if (!dead && hitsBuilding(city, b.x, b.y, 2)) dead = true;
      if (!dead) {
        for (const ped of state.peds) {
          if (ped.state === 'down') continue;
          if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
            events |= damagePed(ped, 50);
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const cop of state.cops) {
          if (Math.hypot(cop.x - b.x, cop.y - b.y) < 16) {
            cop.x = -9999; cop.y = -9999; // removed below
            state.stats.kills += 1;
            raiseWanted(state, 1);
            events |= EVENT_CRIME;
            dead = true;
            break;
          }
        }
        state.cops = state.cops.filter((c) => c.x > -100);
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // --- Traffic and pedestrians ---
    for (const car of state.cars) {
      if (car.traffic) updateTrafficCar(car, dt, rng, state.cars);
    }
    // Keep traffic topped up near the player.
    const nearTraffic = state.cars.filter((c) => c.traffic && Math.hypot(c.x - pos.x, c.y - pos.y) < 1300).length;
    if (nearTraffic < 7) {
      const car = spawnTrafficCar(rng, city, pos.x, pos.y);
      if (car) state.cars.push(car);
    }
    state.cars = state.cars.filter((c) => c.driver === 'player' || c.cop || c.parked || Math.hypot(c.x - pos.x, c.y - pos.y) < 1600);
    for (const ped of state.peds) updatePed(ped, dt, rng, danger);
    if (state.peds.filter((p) => p.state !== 'down').length < 14) {
      state.peds.push(spawnPed(rng, pos.x, pos.y));
    }
    state.peds = state.peds.filter((p) => p.state !== 'down' || Math.hypot(p.x - pos.x, p.y - pos.y) < 500);
    // Clean up downed pedestrians after a while.
    state.peds = state.peds.filter((p) => !(p.state === 'down' && Math.hypot(p.x - pos.x, p.y - pos.y) > 400));

    // --- Pickups ---
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      const d = Math.hypot(pk.x - pos.x, pk.y - pos.y);
      if (d < 34) {
        pk.taken = true;
        if (pk.kind === 'cash') {
          state.money += PAY.stash;
          announce(`Cash stash! +$${PAY.stash}`, 2.5);
          if (state.audio) state.audio.cash();
        } else {
          state.health = Math.min(PLAYER.maxHealth, state.health + 40);
          announce('First aid +40 health', 2.5);
          if (state.audio) state.audio.pickup();
        }
        events |= EVENT_PICKUP;
        save();
      }
    }

    updateTaxi(dt, input);
    updatePolice(dt);
    events |= checkMission();
    state.currentStepTarget = state.storyDone ? null : (currentStep().target || null);

    // --- Effects and camera ---
    for (let i = state.effects.length - 1; i >= 0; i -= 1) {
      state.effects[i].life -= dt;
      if (state.effects[i].life <= 0) state.effects.splice(i, 1);
    }
    const camTarget = playerPos();
    state.camera.x += (camTarget.x - state.camera.x) * Math.min(1, 5 * dt);
    state.camera.y += (camTarget.y - state.camera.y) * Math.min(1, 5 * dt);

    if (state.health <= 0) {
      state.health = 0;
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state, reset, step, save, missionObjective, currentStep,
    get missionIndex() { return state.missionIndex; },
  };
}
