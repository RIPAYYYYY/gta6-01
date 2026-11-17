// Boot and the one loop for Neon Bay Nights: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, busted (game over) and story complete.
//
// ?shot=cover|chase|street|mission (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_WIN } from './world.js';
import { createInput, clearEdgePresses } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const audio = createAudio();
world.state.audio = audio;
const renderer = createRenderer(canvas);

// Exposed for playtesting (and nothing else): the live world and its state.
window.__game = world;

function announce(message) {
  status.textContent = message;
}

function updateMouseWorld(input) {
  const view = renderer.view;
  const cam = world.state.camera;
  world.state.mouseWorld.x = cam.x + (input.mouseX - view.w / 2) / view.scale;
  world.state.mouseWorld.y = cam.y + (input.mouseY - view.h / 2) / view.scale;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, world);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let winShown = false;

  function startGame() {
    world.reset();
    winShown = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Meet Mara at the Marina Club.');
  }

  function step() {
    updateMouseWorld(input);
    const events = world.step(STEP, input);
    audio.musicTick(STEP, !!world.state.car);
    if (events & EVENT_OVER) {
      screen = SCREEN_OVER;
      world.save();
      announce('Busted. Press Enter to try again.');
    } else if ((events & EVENT_WIN) && !winShown) {
      winShown = true;
      screen = SCREEN_WIN;
      announce('Story complete!');
    }
    clearEdgePresses(input);
  }

  function handleScreens() {
    // Only the presses this function uses are consumed here; gameplay presses
    // (E, T, mouse) are left for step() to consume, never wiped by a frame.
    if (screen === SCREEN_TITLE && (input.anyPressed || input.shootPressed)) {
      startGame();
      clearEdgePresses(input);
    } else if (screen === SCREEN_OVER && (input.anyPressed || input.shootPressed)) {
      startGame();
      clearEdgePresses(input);
    } else if (screen === SCREEN_WIN && (input.anyPressed || input.shootPressed)) {
      screen = SCREEN_PLAY;
      clearEdgePresses(input);
      announce('Free roam.');
    } else if (screen === SCREEN_PLAY && input.pausePressed) {
      screen = SCREEN_PAUSED;
      input.pausePressed = false;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (input.pausePressed || input.anyPressed)) {
      screen = SCREEN_PLAY;
      clearEdgePresses(input);
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleScreens();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // Parked screens swallow stale presses so they never leak into play.
      if (screen === SCREEN_PAUSED || screen === SCREEN_OVER) clearEdgePresses(input);
    }
    renderer.draw(world.state, screen, world);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.save();
      announce('Paused.');
    }
  });

  announce('Neon Bay Nights. Click or press Enter to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
