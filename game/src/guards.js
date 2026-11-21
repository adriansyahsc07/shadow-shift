// guards.js — patrol routes and the guard AI state machine.
// States: patrol → suspicious (heard something / glimpsed you) → alert (chase)
// → search (comb the last seen spot) → patrol. Breaking line of sight lets the
// alarm cool down, so a careful player can always recover.
import { isSolid, TILE } from './level.js';
import { detectionRate } from './vision.js';

export const GUARD_RANGE = 5.6; // tiles a guard can see, in the open
export const GUARD_HALF_ANGLE = 0.62; // radians, ~35 degrees each side

export function makeGuard(def, levelIndex) {
  const w = def.waypoints[0];
  return {
    x: w[0] + 0.5,
    y: w[1] + 0.5,
    angle: 0,
    waypoints: def.waypoints,
    wp: 1,
    speed: def.speed / TILE, // tiles per second
    state: 'patrol',
    meter: 0, // 0..100, fills while the player is seen
    lastSeen: null,
    lastSeenAt: 0,
    searchAt: null,
    searchTimer: 0,
    pauseTimer: 0,
    heardAt: null,
    chaseSpeed: (def.speed * 1.85) / TILE,
    levelIndex,
  };
}

function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.02) return true;
  const step = Math.min(d, speed * dt);
  const nx = guard.x + (dx / d) * step;
  const ny = guard.y + (dy / d) * step;
  // Slide along walls instead of sticking: try x then y separately.
  if (!isSolid(level, Math.floor(nx), Math.floor(guard.y))) guard.x = nx;
  if (!isSolid(level, Math.floor(guard.x), Math.floor(ny))) guard.y = ny;
  guard.angle = Math.atan2(dy, dx);
  return d - step < 0.05;
}

export function updateGuard(guard, level, player, dt, now, onSpotted) {
  const seen = detectionRate(level, guard, player, GUARD_RANGE, GUARD_HALF_ANGLE);

  if (seen > 0) {
    // Detection fills fast up close, slowly at the cone's edge.
    guard.meter += seen * 62 * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lastSeenAt = now;
    if (guard.meter >= 100 && guard.state !== 'alert') {
      guard.state = 'alert';
      onSpotted && onSpotted(guard);
    }
  } else {
    // Out of sight the alarm drains — hiding is how you recover.
    guard.meter = Math.max(0, guard.meter - 26 * dt);
  }
  if (guard.meter > 35 && guard.state === 'patrol') guard.state = 'suspicious';

  switch (guard.state) {
    case 'patrol': {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.angle += dt * 0.6; // glance around at a waypoint
        break;
      }
      const w = guard.waypoints[guard.wp];
      if (moveToward(guard, w[0] + 0.5, w[1] + 0.5, guard.speed, dt, level)) {
        guard.wp = (guard.wp + 1) % guard.waypoints.length;
        guard.pauseTimer = 0.7;
      }
      break;
    }
    case 'suspicious': {
      const target = guard.heardAt || guard.lastSeen;
      if (target) {
        if (moveToward(guard, target.x, target.y, guard.speed * 1.25, dt, level)) {
          guard.heardAt = null;
          guard.state = 'search';
          guard.searchTimer = 2.2;
          guard.searchAt = { x: guard.x, y: guard.y };
        }
      } else {
        guard.state = 'patrol';
      }
      if (guard.meter <= 0 && !guard.heardAt) guard.state = 'patrol';
      break;
    }
    case 'alert': {
      if (guard.lastSeen) {
        // A lunging sprint when the thief is almost within reach.
        const dist = Math.hypot(guard.lastSeen.x - guard.x, guard.lastSeen.y - guard.y);
        const speed = dist < 1.4 ? guard.chaseSpeed * 1.25 : guard.chaseSpeed;
        moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, speed, dt, level);
      }
      // Lost you for a while: give up the chase and search the area.
      if (now - guard.lastSeenAt > 2.6) {
        guard.state = 'search';
        guard.searchTimer = 3.0;
        guard.searchAt = guard.lastSeen ? { ...guard.lastSeen } : { x: guard.x, y: guard.y };
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      guard.angle += dt * 1.8; // sweep the area, looking around
      if (guard.searchTimer <= 0) {
        guard.state = 'patrol';
        guard.meter = 0;
        // Walk back to the nearest waypoint and resume the route.
        let best = 0;
        let bestD = Infinity;
        guard.waypoints.forEach((w, i) => {
          const d = Math.hypot(w[0] + 0.5 - guard.x, w[1] + 0.5 - guard.y);
          if (d < bestD) { bestD = d; best = i; }
        });
        guard.wp = best;
      }
      break;
    }
  }

  // A guard that catches you ends the run.
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  if (Math.hypot(dx, dy) < 0.55) return 'caught';
  return null;
}
