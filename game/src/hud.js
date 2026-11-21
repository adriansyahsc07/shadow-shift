// hud.js — the top bar, objective line, detection eye and message toasts.
// Drawn on the same canvas as the game so screenshots show the whole picture.
import { TILE } from './level.js';

export function drawHud(ctx, game) {
  const W = 1280;
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(5, 7, 12, 0.82)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#2a2f3d';
  ctx.fillRect(0, 46, W, 2);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('SHADOW SHIFT', 16, 24);
  ctx.fillStyle = '#9aa3b2';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('·  ' + game.level.def.name + '  ·  Level ' + (game.levelIndex + 1) + ' of 3', 190, 24);

  // Objective, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = game.level.def.keycard && !game.player.hasKeycard ? '#f2c14e' : '#7ee2a0';
  ctx.font = '15px Georgia, serif';
  const obj = game.level.def.keycard && !game.player.hasKeycard
    ? 'Find the gold keycard, then reach the exit'
    : 'Reach the green exit unseen';
  ctx.fillText(obj, W - 16, 24);
  ctx.restore();

  drawDetectionEye(ctx, game);
  drawPebbles(ctx, game);
  drawToasts(ctx, game);
  if (game.timer != null) drawTimer(ctx, game);
}

// The detection eye: calm grey, then yellow, orange, red as the worst guard's
// meter fills. It is the player's early-warning system.
function drawDetectionEye(ctx, game) {
  const worst = Math.max(0, ...game.guards.map((g) => g.meter));
  const cx = 640;
  const cy = 74;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let color = '#8b93a5';
  let label = 'UNSEEN';
  if (worst > 0) { color = '#f2c14e'; label = 'GLIMPSED'; }
  if (worst > 40) { color = '#f08a24'; label = 'SUSPICIOUS'; }
  if (worst > 75) { color = '#e5484d'; label = 'SPOTTED'; }
  if (game.anyAlert) { color = '#e5484d'; label = 'ALARM — RUN!'; }
  // Eye outline.
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.quadraticCurveTo(cx, cy - 20, cx + 26, cy);
  ctx.quadraticCurveTo(cx, cy + 20, cx - 26, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 + worst * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Meter arc under the eye.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, Math.PI * 0.15, Math.PI * (0.15 + 0.7 * (worst / 100)));
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(label, cx, cy + 42);
  ctx.restore();
}

function drawPebbles(ctx, game) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9c2b0';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Pebbles: ' + '●'.repeat(game.player.pebbles) + '○'.repeat(Math.max(0, 3 - game.player.pebbles)), 16, 70);
  if (game.player.loot > 0) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillText('◆ Loot ' + game.player.loot, 16, 94);
  }
  if (game.player.hasKeycard) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillText('⬢ Keycard', 150, 94);
  }
  ctx.restore();
}

function drawTimer(ctx, game) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9aa3b2';
  ctx.font = '15px Georgia, serif';
  const t = Math.floor(game.timer);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  ctx.fillText(mm + ':' + ss, 1264, 70);
  ctx.restore();
}

function drawToasts(ctx, game) {
  if (!game.toasts) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  game.toasts.forEach((toast, i) => {
    const alpha = Math.max(0, Math.min(1, toast.life));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f5f1e6';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(toast.text, 640, 150 + i * 28);
  });
  ctx.restore();
}
