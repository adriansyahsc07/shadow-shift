// input.js — keyboard + mouse, in one place. WASD/arrows move, Shift sneaks,
// Space tosses a pebble at the cursor, P/Esc pauses, R restarts, M mutes.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    left: false, right: false, up: false, down: false,
    sneak: false,
    clickTile: null, // {x, y} in tile units, set on mouse click, consumed by main
    mouseTile: { x: 0, y: 0 },
    pressed: new Set(), // edge-triggered keys, consumed by main
  };

  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ',
    'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  ]);

  function sync() {
    input.left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    input.right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
    input.up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
    input.down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
    input.sneak = keys.has('Shift');
  }

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.key)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keys.add(e.key);
    sync();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    sync();
  });
  window.addEventListener('blur', () => { keys.clear(); sync(); });

  function tileFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x: px / 40, y: py / 40, px, py };
  }

  canvas.addEventListener('mousemove', (e) => {
    const t = tileFromEvent(e);
    input.mouseTile = { x: t.x, y: t.y };
    input.mousePx = { x: t.px, y: t.py };
  });
  canvas.addEventListener('mousedown', (e) => {
    const t = tileFromEvent(e);
    input.clickTile = { x: t.x, y: t.y };
    input.mouseTile = { x: t.x, y: t.y };
  });

  input.consume = (key) => {
    if (input.pressed.has(key)) { input.pressed.delete(key); return true; }
    return false;
  };
  input.clearPressed = () => input.pressed.clear();
  return input;
}
