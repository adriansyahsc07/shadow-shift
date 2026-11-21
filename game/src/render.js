// render.js — everything the player sees: floor, walls, cover, bushes, the
// exit door, guards with their vision cones, the thief, and the screens.
// All art is drawn in code; there are no image assets.
import { TILE, COLS, ROWS } from './level.js';
import { conePolygon } from './vision.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { drawHud } from './hud.js';

const W = COLS * TILE;
const H = ROWS * TILE;

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  if (game.state === 'title') { drawTitle(ctx, game); return; }
  drawFloor(ctx, game);
  drawExit(ctx, game);
  drawLootAndKeycard(ctx, game);
  drawCover(ctx, game);
  drawGuards(ctx, game);
  drawPebblesInFlight(ctx, game);
  drawPlayer(ctx, game);
  drawHud(ctx, game);
  if (game.state === 'paused') drawPaused(ctx, game);
  if (game.state === 'caught') drawCaught(ctx, game);
  if (game.state === 'levelDone') drawLevelDone(ctx, game);
  if (game.state === 'gameDone') drawGameDone(ctx, game);
  if (game.state === 'levelSelect') drawLevelSelect(ctx, game);
}

function drawFloor(ctx, game) {
  const level = game.level;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = x + ',' + y;
      const px = x * TILE;
      const py = y * TILE;
      if (level.walls.has(k)) {
        ctx.fillStyle = '#232733';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#31364a';
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = '#171a23';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
        continue;
      }
      // Checkerboard stone tiles, with a faint pool-of-light variation.
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? '#1a1d27' : '#181b24';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Warm pools of lamplight on the floor.
  ctx.save();
  game.lamps.forEach((lamp) => {
    const lx = lamp[0] * TILE;
    const ly = lamp[1] * TILE;
    const g = ctx.createRadialGradient(lx, ly, 8, lx, ly, 110);
    g.addColorStop(0, 'rgba(242, 193, 78, 0.10)');
    g.addColorStop(1, 'rgba(242, 193, 78, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 110, ly - 110, 220, 220);
  });
  ctx.restore();
  // A vignette darkens the corners, so the lit middle of the hall draws the eye.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // When any guard is alerted, a red pulse creeps in from the screen edges.
  if (game.anyAlert) {
    const pulse = 0.10 + 0.07 * Math.sin(game.time * 5);
    const eg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    eg.addColorStop(0, 'rgba(229,72,77,0)');
    eg.addColorStop(1, 'rgba(229,72,77,' + pulse + ')');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const px = e.x * TILE;
  const py = e.y * TILE;
  const pulse = 0.55 + 0.35 * Math.sin(game.time * 2.4);
  ctx.save();
  const g = ctx.createRadialGradient(px, py, 4, px, py, 66);
  g.addColorStop(0, 'rgba(46, 224, 122, ' + (0.5 * pulse + 0.2) + ')');
  g.addColorStop(1, 'rgba(46, 224, 122, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(px - 66, py - 66, 132, 132);
  ctx.fillStyle = '#123524';
  ctx.fillRect(px - 17, py - 19, 34, 38);
  ctx.fillStyle = '#2ee07a';
  ctx.fillRect(px - 13, py - 15, 26, 30);
  ctx.fillStyle = '#0b2e1c';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', px, py + 32);
  ctx.restore();
}

function drawLootAndKeycard(ctx, game) {
  const level = game.level;
  ctx.save();
  level.loot.forEach((item) => {
    if (item.taken) return;
    const px = item.x * TILE;
    const py = item.y * TILE;
    const bob = Math.sin(game.time * 3 + item.x) * 2;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(px, py - 10 + bob);
    ctx.lineTo(px + 8, py + bob);
    ctx.lineTo(px, py + 10 + bob);
    ctx.lineTo(px - 8, py + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(px, py - 5 + bob);
    ctx.lineTo(px + 3, py + bob);
    ctx.lineTo(px, py + 5 + bob);
    ctx.lineTo(px - 3, py + bob);
    ctx.closePath();
    ctx.fill();
  });
  if (level.keycard && !game.player.hasKeycard) {
    const k = level.keycard;
    const px = k.x * TILE;
    const py = k.y * TILE;
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(px - 11, py - 7, 22, 14);
    ctx.fillStyle = '#1a1a12';
    ctx.fillRect(px - 7, py - 3, 8, 3);
    ctx.fillRect(px - 7, py + 2, 12, 2);
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEYCARD', px, py + 22);
  }
  ctx.restore();
}

function drawCover(ctx, game) {
  const level = game.level;
  ctx.save();
  level.crates.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = '#4a3620';
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = '#6b4e2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 5.5, py + 5.5, TILE - 11, TILE - 11);
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 5);
    ctx.lineTo(px + TILE - 5, py + TILE - 5);
    ctx.moveTo(px + TILE - 5, py + 5);
    ctx.lineTo(px + 5, py + TILE - 5);
    ctx.stroke();
  });
  level.bushes.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const px = x * TILE + TILE / 2;
    const py = y * TILE + TILE / 2;
    ctx.fillStyle = 'rgba(46, 94, 52, 0.85)';
    [[-8, -6, 12], [8, -7, 11], [0, 4, 13], [-9, 7, 10], [9, 6, 10]].forEach(([ox, oy, r]) => {
      ctx.beginPath();
      ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(120, 190, 110, 0.5)';
    ctx.beginPath();
    ctx.arc(px - 4, py - 5, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function coneColor(guard) {
  if (guard.state === 'alert') return 'rgba(229, 72, 77, 0.34)';
  if (guard.state === 'suspicious' || guard.state === 'search') return 'rgba(240, 138, 36, 0.30)';
  if (guard.meter > 35) return 'rgba(242, 193, 78, 0.30)';
  return 'rgba(242, 193, 78, 0.20)';
}

function drawGuards(ctx, game) {
  const level = game.level;
  // Faint dots mark each guard's patrol route, so the player can read it.
  ctx.save();
  game.guards.forEach((guard) => {
    ctx.fillStyle = 'rgba(154, 163, 178, 0.28)';
    guard.waypoints.forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc((wx + 0.5) * TILE, (wy + 0.5) * TILE, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.restore();
  game.guards.forEach((guard) => {
    // Vision cone, clipped by walls.
    const poly = conePolygon(level, guard, GUARD_RANGE, GUARD_HALF_ANGLE);
    ctx.save();
    ctx.fillStyle = coneColor(guard);
    ctx.beginPath();
    poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const px = guard.x * TILE;
    const py = guard.y * TILE;
    // Body: a night guard in a dark uniform with a brass badge.
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 4, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = guard.state === 'alert' ? '#7a2e35' : '#2e3a55';
    ctx.beginPath();
    ctx.arc(px, py, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.state === 'alert' ? '#e5484d' : '#5a6b8c';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick and helmet brim.
    ctx.strokeStyle = '#d8d2c0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(guard.angle) * 18, py + Math.sin(guard.angle) * 18);
    ctx.stroke();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(px - Math.sin(guard.angle) * 5, py + Math.cos(guard.angle) * 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // "?" over a suspicious guard, "!" over an alerted one.
    if (guard.state === 'suspicious' || guard.state === 'search') {
      ctx.fillStyle = '#f2c14e';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', px, py - 24);
    } else if (guard.state === 'alert') {
      ctx.fillStyle = '#e5484d';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', px, py - 24);
    }
    // Detection meter ring while it fills.
    if (guard.meter > 2 && guard.state !== 'alert') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (guard.meter / 100));
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawPebblesInFlight(ctx, game) {
  game.pebbles.forEach((p) => {
    const t = Math.min(1, p.t / 0.35);
    const x = p.from.x + (p.to.x - p.from.x) * t;
    const y = p.from.y + (p.to.y - p.from.y) * t;
    const px = x * TILE;
    const py = y * TILE - Math.sin(t * Math.PI) * 18;
    ctx.save();
    ctx.fillStyle = '#c9c2b0';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.t > 0.35) {
      ctx.strokeStyle = 'rgba(242, 193, 78,' + Math.max(0, 1 - (p.t - 0.35) / 0.8) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 12 + (p.t - 0.35) * 60, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const px = p.x * TILE;
  const py = p.y * TILE;
  const bob = p.moving ? Math.sin(p.stepPhase) * 1.5 : 0;
  ctx.save();
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(px, py + 10, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded thief: deep teal cloak, pale face, dark hood.
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.arc(px, py + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5eead4';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0b3b36';
  ctx.beginPath();
  ctx.arc(px + Math.cos(p.angle) * 3, py + Math.sin(p.angle) * 3 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f1e6';
  ctx.beginPath();
  ctx.arc(px + Math.cos(p.angle) * 6, py + Math.sin(p.angle) * 6 + bob, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Sneak indicator: a small crouch line under the thief.
  if (p.sneaking) {
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 10, py + 15);
    ctx.lineTo(px + 10, py + 15);
    ctx.stroke();
  }
  // Hidden in a bush: leafy ring so the player knows they are concealed.
  if (p.hidden) {
    ctx.strokeStyle = 'rgba(120, 190, 110, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(px, py, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(4, 5, 9, 0.78)';
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = '#12141d';
  ctx.strokeStyle = '#3a4152';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function drawTitle(ctx, game) {
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, W, H);
  // A faint museum floor and one patrol cone behind the title, for mood.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#1a1d27';
  for (let y = 0; y < ROWS; y += 2) for (let x = 0; x < COLS; x += 2) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = 'rgba(242, 193, 78, 0.16)';
  ctx.beginPath();
  ctx.moveTo(880, 560);
  ctx.lineTo(1080, 420);
  ctx.lineTo(1080, 700);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('SHADOW SHIFT', 640, 210);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('A top-down stealth game — slip past the guards, reach the exit unseen.', 640, 262);
  panel(ctx, 340, 320, 600, 250);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '19px Georgia, serif';
  const lines = [
    'WASD / Arrows — move        Shift — sneak (slower, harder to spot)',
    'Click — toss a pebble and lure a guard away      Space — pebble at cursor',
    'Hide in bushes · crouch behind crates · break line of sight to cool the alarm',
    'Reach the green EXIT. On level 3, grab the gold keycard first.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 362 + i * 40));
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('Press ENTER to play — 1 / 2 / 3 to choose a level', 640, 640);
  ctx.fillStyle = '#9aa3b2';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('3 levels · original art, sound and code · P pauses · M mutes · R restarts', 640, 676);
  ctx.restore();
}

function drawPaused(ctx, game) {
  dim(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('PAUSED', 640, 360);
  ctx.font = '20px Georgia, serif';
  ctx.fillText('P or Esc to resume · R to restart the level', 640, 410);
  ctx.restore();
}

function drawCaught(ctx, game) {
  dim(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5484d';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('CAUGHT!', 640, 350);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('A guard grabbed you in the ' + game.level.def.name + '.', 640, 400);
  ctx.fillText('Press R to try the level again.', 640, 436);
  ctx.restore();
}

function drawLevelDone(ctx, game) {
  dim(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2ee07a';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY!', 640, 330);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(game.level.def.name + ' cleared in ' + game.levelTimeText + ' · loot ' + game.player.loot, 640, 382);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(game.levelIndex < 2 ? 'Press ENTER for the next level' : 'Press ENTER to see your score', 640, 440);
  ctx.restore();
}

function drawGameDone(ctx, game) {
  dim(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('GHOST OF THE GALLERY', 640, 320);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('All three levels cleared in ' + game.totalTimeText + ' · loot ' + game.totalLoot + ' · never seen: ' + (game.neverSeen ? 'yes' : 'no'), 640, 372);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('Press ENTER to play again · 1 / 2 / 3 to replay a level', 640, 430);
  ctx.restore();
}

function drawLevelSelect(ctx, game) {
  dim(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('CHOOSE A LEVEL', 640, 300);
  ctx.font = '22px Georgia, serif';
  game.unlocked.forEach((ok, i) => {
    ctx.fillStyle = ok ? '#e8e4d8' : '#555b6a';
    ctx.fillText((i + 1) + ' — ' + game.levelNames[i] + (ok ? '' : '  (locked)'), 640, 370 + i * 44);
  });
  ctx.fillStyle = '#9aa3b2';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Press 1, 2 or 3 · Esc to go back', 640, 540);
  ctx.restore();
}

export { W, H };
