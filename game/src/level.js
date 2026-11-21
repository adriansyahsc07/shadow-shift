// level.js — hand-designed top-down maps for Shadow Shift.
// Maps are built from coordinates (wall rectangles, cover points), never from
// hand-counted strings, so every tile is exactly where it is meant to be.
// Legend: wall = solid + blocks sight · crate = cover, blocks sight + movement ·
// bush = hides you, blocks sight only when you crouch inside it, walkable.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;

// A wall rectangle [x0, y0, x1, y1], inclusive, in tile coordinates.
// The outer border is added automatically.
function buildGrid(wallRects, crates, bushes, start, exit, keycard, loot) {
  const walls = new Set();
  const crateSet = new Set();
  const bushSet = new Set();
  for (let x = 0; x < COLS; x++) {
    walls.add(x + ',0');
    walls.add(x + ',' + (ROWS - 1));
  }
  for (let y = 0; y < ROWS; y++) {
    walls.add('0,' + y);
    walls.add((COLS - 1) + ',' + y);
  }
  wallRects.forEach(([x0, y0, x1, y1]) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) walls.add(x + ',' + y);
    }
  });
  crates.forEach(([x, y]) => crateSet.add(x + ',' + y));
  bushes.forEach(([x, y]) => bushSet.add(x + ',' + y));
  return {
    walls,
    crates: crateSet,
    bushes: bushSet,
    start: { x: start[0] + 0.5, y: start[1] + 0.5 },
    exit: { x: exit[0] + 0.5, y: exit[1] + 0.5 },
    keycard: keycard ? { x: keycard[0] + 0.5, y: keycard[1] + 0.5 } : null,
    loot: loot.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, taken: false })),
  };
}

const L1 = buildGrid(
  // Pillars: nine 2x2 wall blocks in an open gallery hall.
  [[5, 3, 6, 4], [13, 3, 14, 4], [21, 3, 22, 4],
   [9, 8, 10, 9], [17, 8, 18, 9], [25, 8, 26, 9],
   [5, 13, 6, 14], [13, 13, 14, 14], [21, 13, 22, 14]],
  [[8, 6], [19, 5], [11, 11], [26, 12], [4, 9], [16, 16], [28, 6]],
  [[3, 6], [13, 6], [24, 5], [7, 15], [19, 15], [27, 9], [2, 11]],
  [1, 1], [29, 17], null, [[27, 2], [15, 16]],
);

const L2 = buildGrid(
  // One long wall across row 9 with two door gaps (cols 5-6 and 24-25),
  // plus pillars top and bottom.
  [[1, 9, 4, 9], [7, 9, 23, 9], [26, 9, 30, 9],
   [5, 3, 6, 4], [13, 3, 14, 4], [21, 3, 22, 4], [26, 3, 27, 4],
   [5, 13, 6, 14], [13, 13, 14, 14], [21, 13, 22, 14], [26, 13, 27, 14]],
  [[9, 5], [17, 6], [11, 12], [24, 15], [3, 16], [28, 10]],
  [[3, 5], [15, 5], [25, 6], [8, 15], [18, 16], [27, 16], [12, 17]],
  [1, 1], [29, 14], null, [[27, 2], [15, 16], [3, 17]],
);

const L3 = buildGrid(
  // Pillars, a wall across row 9 with three door gaps (cols 8, 16, 24),
  // a stub wall at x=12 rows 1-4, and one at x=19 rows 14-18.
  [[1, 9, 7, 9], [9, 9, 15, 9], [17, 9, 23, 9], [25, 9, 30, 9],
   [12, 1, 12, 4], [19, 14, 19, 18],
   [5, 3, 6, 4], [13, 3, 14, 4], [21, 3, 22, 4],
   [5, 13, 6, 14], [13, 13, 14, 14], [21, 13, 22, 14]],
  [[9, 6], [17, 6], [10, 12], [25, 15], [3, 16], [27, 11]],
  [[3, 6], [15, 5], [24, 6], [8, 15], [18, 16], [27, 10], [11, 17]],
  [1, 1], [29, 17], [16, 5], [[27, 2], [2, 14], [28, 18]],
);

const MAPS = [L1, L2, L3];

export const LEVELS = [
  {
    name: 'Gallery After Dark',
    brief: 'Slip past the night guards and reach the green exit. Stay out of the yellow cones.',
    guards: [
      { waypoints: [[10, 2], [10, 6], [17, 6], [17, 2]], speed: 52 },
      { waypoints: [[24, 11], [24, 17], [28, 17], [28, 11]], speed: 52 },
      { waypoints: [[4, 12], [4, 17], [8, 17], [8, 12]], speed: 46 },
    ],
    keycard: false,
    loot: 2,
  },
  {
    name: 'The Vault Floor',
    brief: 'More guards, tighter patrols. Bushes hide you — crates block their sight.',
    guards: [
      { waypoints: [[4, 2], [4, 6], [8, 6], [8, 2]], speed: 58 },
      { waypoints: [[23, 2], [23, 6], [28, 6], [28, 2]], speed: 58 },
      { waypoints: [[4, 12], [4, 17], [8, 17], [8, 12]], speed: 54 },
      { waypoints: [[23, 12], [23, 17], [28, 17], [28, 12]], speed: 60 },
    ],
    keycard: false,
    loot: 3,
  },
  {
    name: 'The Director’s Wing',
    brief: 'The exit is locked. Grab the gold keycard first — then vanish.',
    guards: [
      { waypoints: [[4, 2], [4, 6], [8, 6], [8, 2]], speed: 64 },
      { waypoints: [[24, 2], [24, 6], [28, 6], [28, 2]], speed: 62 },
      { waypoints: [[4, 12], [4, 17], [8, 17], [8, 12]], speed: 60 },
      { waypoints: [[23, 13], [23, 17], [27, 17], [27, 13]], speed: 66 },
      { waypoints: [[16, 10], [16, 12], [18, 12], [18, 10]], speed: 58 },
    ],
    keycard: true,
    loot: 3,
  },
];

// Parse one map into walls, cover, bushes, start, exit, keycard and loot spots.
// Loot is copied fresh on every call so a level restart resets pickups.
export function parseLevel(index) {
  const grid = MAPS[index];
  const def = LEVELS[index];
  return {
    index,
    def,
    walls: grid.walls,
    crates: grid.crates,
    bushes: grid.bushes,
    start: { ...grid.start },
    exit: { ...grid.exit },
    keycard: grid.keycard ? { ...grid.keycard } : null,
    loot: grid.loot.map((item) => ({ ...item, taken: false })),
  };
}

// Tile helpers: everything is addressed in tile units (1 tile = TILE px).
export function tileKey(tx, ty) { return tx + ',' + ty; }
export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const k = tileKey(tx, ty);
  return level.walls.has(k) || level.crates.has(k);
}
// Blocks a guard's line of sight (walls and crates; bushes hide you but not a cone's edge).
export function blocksSight(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const k = tileKey(tx, ty);
  return level.walls.has(k) || level.crates.has(k);
}
export function inBush(level, tx, ty) {
  return level.bushes.has(tileKey(tx, ty));
}
