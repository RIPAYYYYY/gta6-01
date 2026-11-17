// The screenshot scenes behind ?shot=cover|chase|street|mission. Each one
// starts from a fresh seeded world, places the player and the traffic where
// the scene needs them, then plays the real rules forward for a few seconds,
// so the frame is what a short game really looks like and the same seed
// always gives the same frame.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { PLACES, MISSION_INTROS } from './missions.js';
import { EVENT_OVER } from './world.js';
import { spawnCopCar } from './police.js';
import { spawnTrafficCar } from './vehicles.js';
import { spawnPed } from './pedestrians.js';
import { SCREEN_PLAY } from './render.js';

function fakeInput(overrides) {
  return Object.assign({
    up: false, down: false, left: false, right: false, run: false,
    interactPressed: false, taxiPressed: false, shoot: false, shootPressed: false,
  }, overrides || {});
}

function driveFor(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.step(STEP, fakeInput({ up: true })) & EVENT_OVER) break;
  }
}

function idleFor(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.step(STEP, fakeInput()) & EVENT_OVER) break;
  }
}

function putPlayerInCar(world, x, y, angle, speed) {
  const state = world.state;
  const car = state.cars.find((c) => c.parked && !c.cop) || state.cars[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  car.parked = false;
  car.traffic = false;
  car.driver = 'player';
  state.car = car;
  state.player.x = x;
  state.player.y = y;
  state.camera.x = x;
  state.camera.y = y;
  return car;
}

function addTrafficNear(world, x, y, count) {
  const state = world.state;
  const rng = createRandom(state.seed + 99);
  for (let i = 0; i < count; i += 1) {
    const car = spawnTrafficCar(rng, state.city, x, y);
    if (car) {
      car.x = x + (rng() * 700 - 350);
      car.y = y + (rng() * 500 - 250);
      state.cars.push(car);
    }
  }
}

function addPedsNear(world, x, y, count) {
  const state = world.state;
  const rng = createRandom(state.seed + 77);
  for (let i = 0; i < count; i += 1) {
    const ped = spawnPed(rng, x, y);
    ped.x = x + (rng() * 500 - 250);
    ped.y = y + (rng() * 400 - 200);
    state.peds.push(ped);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the cover.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  state.money = 1250;
  state.health = 100;
  state.screen = 'play';

  if (name === 'chase') {
    state.missionIndex = 2;
    state.missionStepIndex = 0;
    state.clock = 12.0;
    state.wanted = 3;
    state.lastCrimeAt = state.elapsed;
    state.message = MISSION_INTROS[2];
    state.messageTimer = 5;
    putPlayerInCar(world, 1260, 900, 0, 260);
    addTrafficNear(world, 1800, 900, 5);
    for (let i = 0; i < 3; i += 1) state.cars.push(spawnCopCar(createRandom(state.seed + 55 + i), { x: 1260, y: 900 }));
    driveFor(world, 2.5);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'street') {
    state.missionIndex = 0;
    state.missionStepIndex = 0;
    state.clock = 12.0;
    state.player.x = 1980;
    state.player.y = 900;
    state.camera.x = 1980;
    state.camera.y = 900;
    addPedsNear(world, 1980, 900, 12);
    addTrafficNear(world, 1980, 900, 4);
    idleFor(world, 1.5);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    state.missionIndex = 2;
    state.missionStepIndex = 0;
    state.clock = 19.4;
    // Just outside the pickup radius, so the beacon still shows at the docks.
    state.player.x = PLACES.harbor.x - 140;
    state.player.y = PLACES.harbor.y + 40;
    state.player.angle = 0;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.message = 'Pick up the package at the Harbor Docks.';
    state.messageTimer = 5;
    addPedsNear(world, PLACES.harbor.x, PLACES.harbor.y, 6);
    addTrafficNear(world, PLACES.harbor.x, PLACES.harbor.y, 3);
    idleFor(world, 1.5);
    return { screen: SCREEN_PLAY };
  }

  // Cover: golden-hour drive through Downtown, HUD, minimap and traffic.
  state.missionIndex = 0;
  state.missionStepIndex = 0;
  state.clock = 17.2;
  putPlayerInCar(world, 1260, 900, 0, 240);
  addTrafficNear(world, 1900, 900, 7);
  addPedsNear(world, 1900, 900, 6);
  driveFor(world, 1.5);
  return { screen: SCREEN_PLAY };
}
