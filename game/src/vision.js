// vision.js — line of sight and vision-cone geometry for Shadow Shift.
// All positions are in tile units; one tile is TILE pixels (see level.js).
import { blocksSight, TILE } from './level.js';

// Sample the segment from (x0,y0) to (x1,y1); true when no sight-blocking tile is hit.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 0.08));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor(x0 + dx * t);
    const ty = Math.floor(y0 + dy * t);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}

// Distance from (x,y) along direction (dx,dy) until a sight-blocking tile, capped at maxDist.
export function castRay(level, x, y, dx, dy, maxDist) {
  const step = 0.12;
  let d = step;
  while (d < maxDist) {
    const tx = Math.floor(x + dx * d);
    const ty = Math.floor(y + dy * d);
    if (blocksSight(level, tx, ty)) return d;
    d += step;
  }
  return maxDist;
}

// Build the polygon of a guard's vision cone, clipped by walls.
// Returns points in pixel space, starting at the guard's eye.
export function conePolygon(level, guard, rangeTiles, halfAngle) {
  const rays = 26;
  const pts = [{ x: guard.x * TILE, y: guard.y * TILE }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = castRay(level, guard.x, guard.y, Math.cos(a), Math.sin(a), rangeTiles);
    pts.push({ x: (guard.x + Math.cos(a) * d) * TILE, y: (guard.y + Math.sin(a) * d) * TILE });
  }
  return pts;
}

// Is the player inside this guard's cone and visible? Returns 0..1 (0 = unseen).
// Closer + standing still in the open fills detection fastest; sneaking or hiding in a
// bush shrinks the effective range and slows the fill.
export function detectionRate(level, guard, player, rangeTiles, halfAngle) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > rangeTiles || dist < 0.001) return dist < 0.001 ? 1 : 0;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - guard.angle);
  while (diff > Math.PI) diff -= 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  // Bushes hide you: a crouched figure in the leaves is nearly invisible.
  const hidden = level.bushes.has(Math.floor(player.x) + ',' + Math.floor(player.y));
  let rate = 1 - dist / rangeTiles; // 1 up close, ~0 at the edge
  rate = 0.25 + rate * 0.75;
  if (player.sneaking) rate *= 0.45;
  if (hidden) rate *= 0.25;
  if (player.moving) rate *= 1.25;
  return Math.min(1, rate);
}
