// sound.js — every sound is synthesized with WebAudio: no audio files.
// Footsteps get louder as a guard nears; a sting when you are spotted.
export function createSound() {
  let ctx = null;
  let master = null;
  let muted = false;
  let hum = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // A low room tone so the silence never feels dead.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const g = ctx.createGain();
      g.gain.value = 0.018;
      osc.connect(g);
      g.connect(master);
      osc.start();
      hum = osc;
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    // A soft tap; volume 0..1 tracks how close the guard is.
    footstep(vol) { noiseBurst(0.07, 0.10 * vol, 420); },
    // A pebble clatters on the tiles.
    pebble() { blip(1900, 0.09, 'triangle', 0.16); blip(1300, 0.12, 'triangle', 0.12, 0.05); },
    // The alarm sting when a guard spots you.
    spotted() {
      blip(220, 0.5, 'sawtooth', 0.16);
      blip(233, 0.5, 'sawtooth', 0.16, 0.02);
      blip(440, 0.35, 'square', 0.08, 0.05);
    },
    // A bright chime for loot and the keycard.
    pickup() { blip(880, 0.18, 'sine', 0.18); blip(1318, 0.28, 'sine', 0.16, 0.07); },
    // The exit door sighs open.
    exitOpen() { blip(330, 0.4, 'sine', 0.14); blip(494, 0.5, 'sine', 0.12, 0.12); },
    // A low thud when you are caught.
    caught() { blip(98, 0.5, 'sine', 0.3); noiseBurst(0.25, 0.2, 300); },
    // Level-complete arpeggio.
    win() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.32, 'triangle', 0.16, i * 0.11));
    },
  };
}
