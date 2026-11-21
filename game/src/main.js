// main.js — Shadow Shift: the game loop, states and wiring.
// States: title → playing ⇄ paused → caught / levelDone → gameDone, plus
// levelSelect. In ?shot= mode the game is staged and frozen for screenshots.
import { TILE, LEVELS, parseLevel } from './level.js';
import { makeGuard, updateGuard } from './guards.js';
import { makePlayer, updatePlayer, throwPebble } from './player.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { drawGame, W, H } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
const statusEl = document.getElementById('status');

const input = createInput(canvas);
const sound = createSound();

const game = {
  state: 'title',
  levelIndex: 0,
  level: parseLevel(0),
  player: null,
  guards: [],
  pebbles: [], // pebbles in flight
  lamps: [],
  toasts: [],
  time: 0,
  timer: 0,
  levelTime: 0,
  levelTimeText: '0:00',
  totalTime: 0,
  totalTimeText: '0:00',
  totalLoot: 0,
  neverSeen: true,
  anyAlert: false,
  unlocked: [true, false, false],
  levelNames: LEVELS.map((l) => l.name),
  shotMode: false,
  caughtFlash: 0,
  lastStep: 0, // last whole step-phase crossed, for footstep sounds
};

function fmtTime(t) {
  const s = Math.floor(t);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function toast(text, seconds = 3) {
  game.toasts.push({ text, life: seconds });
  if (game.toasts.length > 2) game.toasts.shift();
}

// Fixed lamp positions per level: warm pools of light on the floor.
const LAMPS = [
  [[6, 2], [16, 6], [26, 3], [8, 13], [22, 15]],
  [[5, 2], [18, 5], [26, 8], [8, 15], [22, 16]],
  [[6, 2], [18, 4], [26, 6], [8, 14], [24, 15]],
];

game.startLevel = function (index) {
  game.levelIndex = index;
  game.level = parseLevel(index);
  game.player = makePlayer(game.level.start);
  game.guards = game.level.def.guards.map((d) => makeGuard(d, index));
  game.pebbles = [];
  game.lamps = LAMPS[index];
  game.toasts = [];
  game.levelTime = 0;
  game.timer = 0;
  game.anyAlert = false;
  game.state = 'playing';
  toast(game.level.def.brief, 4);
  statusEl.textContent = 'Level ' + (index + 1) + ': ' + game.level.def.name + '. ' + game.level.def.brief;
};

function restartLevel() {
  game.startLevel(game.levelIndex);
}

function nextLevel() {
  if (game.levelIndex < 2) {
    game.unlocked[game.levelIndex + 1] = true;
    game.startLevel(game.levelIndex + 1);
  } else {
    game.state = 'gameDone';
    game.totalTimeText = fmtTime(game.totalTime);
    sound.win();
  }
}

function onSpotted() {
  game.neverSeen = false;
  game.anyAlert = true;
  sound.spotted();
  toast('SPOTTED! Break line of sight!', 2.5);
}

function update(dt) {
  game.time += dt;
  if (game.state !== 'playing') return;
  game.timer += dt;
  game.levelTime += dt;
  game.totalTime += dt;
  game.levelTimeText = fmtTime(game.levelTime);

  const player = game.player;
  const prevX = player.x;
  const prevY = player.y;
  updatePlayer(player, game.level, input, dt);

  // Footstep sounds: one soft tap each time the walk cycle crosses a step,
  // louder when a guard is close, softer while sneaking.
  if (player.moving && Math.floor(player.stepPhase) !== game.lastStep) {
    game.lastStep = Math.floor(player.stepPhase);
    let nearest = Infinity;
    game.guards.forEach((g) => {
      nearest = Math.min(nearest, Math.hypot(g.x - player.x, g.y - player.y));
    });
    const vol = player.sneaking ? 0.25 : Math.max(0.15, 1 - nearest / 8);
    if (nearest < 7) sound.footstep(vol);
  }

  // Pebble throws: click, or Space at the cursor.
  const click = input.clickTile;
  input.clickTile = null;
  const space = input.consume(' ');
  if ((click || space) && game.state === 'playing') {
    const target = click || input.mouseTile;
    const landing = throwPebble(player, game.level, target.x, target.y);
    if (landing) {
      game.pebbles.push({ from: { x: player.x, y: player.y }, to: landing, t: 0 });
      sound.pebble();
    }
  }
  game.pebbles = game.pebbles.filter((p) => {
    p.t += dt;
    if (p.t >= 0.35 && !p.rang) {
      p.rang = true;
      // Every guard in earshot walks over to investigate the noise.
      game.guards.forEach((g) => {
        if (Math.hypot(g.x - p.to.x, g.y - p.to.y) < 5.5 && g.state !== 'alert') {
          g.heardAt = { x: p.to.x, y: p.to.y };
          g.state = 'suspicious';
        }
      });
    }
    return p.t < 1.4;
  });

  // Guards.
  game.anyAlert = game.guards.some((g) => g.state === 'alert');
  for (const guard of game.guards) {
    const caught = updateGuard(guard, game.level, player, dt, game.time, onSpotted);
    if (caught === 'caught') {
      game.state = 'caught';
      sound.caught();
      statusEl.textContent = 'Caught by a guard. Press R to try again.';
      return;
    }
  }

  // Loot pickup.
  game.level.loot.forEach((item) => {
    if (!item.taken && Math.hypot(item.x - player.x, item.y - player.y) < 0.6) {
      item.taken = true;
      player.loot += 1;
      game.totalLoot += 1;
      sound.pickup();
      toast('Loot pocketed ◆', 1.6);
    }
  });

  // Keycard pickup (level 3).
  const kc = game.level.keycard;
  if (kc && !player.hasKeycard && Math.hypot(kc.x - player.x, kc.y - player.y) < 0.7) {
    player.hasKeycard = true;
    sound.pickup();
    toast('Keycard acquired — the exit is open!', 3);
  }

  // Exit: locked until the keycard on level 3.
  const e = game.level.exit;
  if (Math.hypot(e.x - player.x, e.y - player.y) < 0.7) {
    if (game.level.def.keycard && !player.hasKeycard) {
      toast('Locked — find the gold keycard first', 2);
    } else {
      game.state = 'levelDone';
      sound.exitOpen();
      statusEl.textContent = 'Level cleared in ' + game.levelTimeText + '. Press Enter for the next level.';
    }
  }

  // Toast decay.
  game.toasts.forEach((t) => { t.life -= dt; });
  game.toasts = game.toasts.filter((t) => t.life > 0);
}

function handleKeys() {
  if (input.consume('Enter') || input.consume('enter')) {
    sound.unlock();
    if (game.state === 'title') game.startLevel(0);
    else if (game.state === 'levelDone') nextLevel();
    else if (game.state === 'gameDone') { game.totalTime = 0; game.totalLoot = 0; game.neverSeen = true; game.startLevel(0); }
    else if (game.state === 'caught') restartLevel();
  }
  if (input.consume('r') || input.consume('R')) {
    if (game.state === 'playing' || game.state === 'caught' || game.state === 'paused') restartLevel();
  }
  if (input.consume('p') || input.consume('P') || input.consume('Escape')) {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
    else if (game.state === 'levelSelect') game.state = 'title';
  }
  if (input.consume('m') || input.consume('M')) {
    sound.toggleMute();
  }
  if (input.consume('l') || input.consume('L')) {
    if (game.state === 'title' || game.state === 'gameDone') game.state = 'levelSelect';
  }
  if (game.state === 'title' || game.state === 'gameDone' || game.state === 'levelSelect') {
    ['1', '2', '3'].forEach((k, i) => {
      if (input.consume(k) && game.unlocked[i]) { sound.unlock(); game.startLevel(i); }
    });
  }
  if (game.state === 'levelSelect' && input.consume('Escape')) game.state = 'title';
  input.clearPressed();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.shotMode) {
    handleKeys();
    update(dt);
  }
  drawGame(ctx, game);
  requestAnimationFrame(frame);
}

// Screenshot staging: ?shot=start|play|alert|win freezes the frame.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
} else {
  game.state = 'title';
}

// A world is always loaded behind the title and level-select screens,
// so those screens render over the museum floor instead of an empty canvas.
if (!game.player) {
  game.level = parseLevel(0);
  game.player = makePlayer(game.level.start);
  game.guards = game.level.def.guards.map((d) => makeGuard(d, 0));
  game.lamps = LAMPS[0];
}

requestAnimationFrame(frame);
