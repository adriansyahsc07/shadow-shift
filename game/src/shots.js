// shots.js — deterministic screenshot states, driven by ?shot=...&seed=1.
// Each state stages a real frame of the game: the title screen, a mid-level
// sneak with two cones in view, an alerted guard by the exit, and the win screen.
// Nothing here fakes a render — it only positions the real game objects.
export const SHOT_NAMES = ['start', 'play', 'play2', 'alert', 'win'];

export function applyShot(game, name) {
  game.shotMode = true;
  if (name === 'start') {
    game.state = 'title';
    return;
  }
  if (name === 'win') {
    game.startLevel(0);
    game.state = 'levelDone';
    game.levelTimeText = '1:47';
    game.player.loot = 2;
    return;
  }
  // 'play' and 'alert' stage level 1 mid-run; 'play2' stages level 2.
  if (name === 'play2') {
    game.startLevel(1);
    game.state = 'playing';
    const h0 = game.guards[0];
    const h1 = game.guards[1];
    const h3 = game.guards[3];
    // The thief hides in a bush while a patrol cone sweeps past; loot glints nearby.
    game.player.x = 3.5;
    game.player.y = 5.5;
    game.player.angle = Math.PI;
    game.player.sneaking = true;
    h0.x = 4.5; h0.y = 4.5; h0.angle = Math.PI / 2; h0.state = 'patrol'; h0.meter = 0;
    h1.x = 25.5; h1.y = 4.5; h1.angle = Math.PI; h1.state = 'patrol'; h1.meter = 20;
    h3.x = 25.5; h3.y = 15.5; h3.angle = -Math.PI / 2; h3.state = 'suspicious'; h3.meter = 48;
    game.toasts = [{ text: 'Bushes hide you — wait for the cone to pass…', life: 1 }];
    return;
  }
  game.startLevel(0);
  game.state = 'playing';
  const g0 = game.guards[0];
  const g1 = game.guards[1];
  const g2 = game.guards[2];
  if (name === 'play') {
    // The thief sneaks at the edge of a patrol cone while a second cone sweeps
    // the hall; the green exit glows at the right edge of the frame.
    game.player.x = 12.5;
    game.player.y = 6.5;
    game.player.angle = Math.PI / 2;
    game.player.sneaking = true;
    g0.x = 10.5; g0.y = 3.5; g0.angle = Math.PI / 2; g0.state = 'patrol'; g0.meter = 0;
    g1.x = 20.5; g1.y = 10.5; g1.angle = -Math.PI / 2; g1.state = 'patrol'; g1.meter = 0;
    g2.x = 5.5; g2.y = 15.5; g2.angle = 0; g2.state = 'patrol'; g2.meter = 0;
    game.toasts = [{ text: 'Stay out of the yellow cones…', life: 1 }];
    return;
  }
  if (name === 'alert') {
    // Spotted at the door: the nearest guard is alerted, red cone sweeping
    // the exit, the thief crouched a breath from freedom.
    game.player.x = 28.5;
    game.player.y = 16.5;
    game.player.angle = Math.PI;
    game.player.sneaking = true;
    g1.x = 25.5; g1.y = 17.5; g1.angle = -0.32; g1.state = 'alert'; g1.meter = 100;
    g1.lastSeen = { x: 28.5, y: 16.5 };
    g0.x = 14.5; g0.y = 11.5; g0.angle = Math.PI / 4; g0.state = 'suspicious'; g0.meter = 62;
    g2.x = 8.5; g2.y = 15.5; g2.angle = 0; g2.state = 'patrol'; g2.meter = 0;
    game.anyAlert = true;
    game.toasts = [{ text: 'SPOTTED! Break line of sight!', life: 1 }];
    return;
  }
  // Unknown ?shot= falls back to the title screen.
  game.state = 'title';
}
