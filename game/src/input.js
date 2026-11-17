// Keyboard and mouse state for Neon Bay Nights. The game reads this object
// once per fixed step; nothing else touches the DOM events.
export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    run: false,
    interactPressed: false,
    shoot: false,
    shootPressed: false,
    taxiPressed: false,
    pausePressed: false,
    anyPressed: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
  };

  const keyMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };

  window.addEventListener('keydown', (event) => {
    const field = keyMap[event.code];
    if (field) input[field] = true;
    if (event.code === 'KeyE' && !event.repeat) input.interactPressed = true;
    if (event.code === 'KeyT' && !event.repeat) input.taxiPressed = true;
    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) input.pausePressed = true;
    if (event.code === 'Space') event.preventDefault();
    if (!event.repeat) input.anyPressed = true;
  });
  window.addEventListener('keyup', (event) => {
    const field = keyMap[event.code];
    if (field) input[field] = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.run = false;
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.shoot = true;
      input.shootPressed = true;
      input.anyPressed = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
      input.mouseDown = false;
      input.shoot = false;
    }
  });
  return input;
}

/** Clear the edge-triggered presses after one step has consumed them. */
export function clearEdgePresses(input) {
  input.interactPressed = false;
  input.taxiPressed = false;
  input.pausePressed = false;
  input.shootPressed = false;
  input.anyPressed = false;
}
