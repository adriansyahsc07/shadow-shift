// player.js — the thief: WASD/arrows to move, Shift to sneak, click or Space
// to toss a pebble that draws guards to the noise.
import { isSolid, inBush, TILE } from './level.js';

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    radius: 0.32, // tiles
    sneaking: false,
    moving: false,
    pebbles: 3,
    hasKeycard: false,
    loot: 0,
    stepPhase: 0,
    hidden: false,
  };
}

const WALK_SPEED = 3.4; // tiles per second
const SNEAK_SPEED = 1.7;

export function updatePlayer(player, level, input, dt) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  player.sneaking = !!input.sneak;
  if (len > 0) {
    mx /= len;
    my /= len;
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = player.x + mx * speed * dt;
    const ny = player.y + my * speed * dt;
    const r = player.radius;
    // Circle-vs-tile collision, axis by axis so you slide along walls.
    if (!hitsWall(level, nx + Math.sign(mx) * r, player.y, r) && !hitsWall(level, nx, player.y, r)) player.x = nx;
    if (!hitsWall(level, player.x, ny + Math.sign(my) * r, r) && !hitsWall(level, player.x, ny, r)) player.y = ny;
    player.angle = Math.atan2(my, mx);
    player.stepPhase += dt * (player.sneaking ? 5 : 9);
  }
  player.hidden = inBush(level, Math.floor(player.x), Math.floor(player.y));
}

function hitsWall(level, x, y, r) {
  const minTx = Math.floor(x - r);
  const maxTx = Math.floor(x + r);
  const minTy = Math.floor(y - r);
  const maxTy = Math.floor(y + r);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolid(level, tx, ty)) continue;
      // Closest point on the tile to the circle centre.
      const cx = Math.max(tx, Math.min(x, tx + 1));
      const cy = Math.max(ty, Math.min(y, ty + 1));
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
  }
  return false;
}

// A pebble flies to the clicked tile and clatters: every guard in earshot
// walks over to investigate it. Returns the landing tile, or null.
export function throwPebble(player, level, tx, ty) {
  if (player.pebbles <= 0) return null;
  if (isSolid(level, Math.floor(tx), Math.floor(ty))) return null;
  player.pebbles -= 1;
  return { x: tx + 0.5, y: ty + 0.5, t: 0, radius: 4.5 };
}
