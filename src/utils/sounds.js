const audioCtx = () => {
  if (!window._lccAudioCtx) {
    window._lccAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._lccAudioCtx;
};

function playTone(freq, duration, type = 'sine', volume = 0.12) {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // silently fail if audio not available
  }
}

function playChord(freqs, duration, type = 'sine', volume = 0.06) {
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, duration, type, volume), i * 30);
  });
}

export const sounds = {
  // Task completed — satisfying major chord arpeggio
  taskComplete: () => {
    playTone(523.25, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.1), 80);
    setTimeout(() => playTone(783.99, 0.2, 'sine', 0.12), 160);
  },

  // Check item — quick pop
  check: () => playTone(880, 0.08, 'sine', 0.08),

  // Uncheck — lower pop
  uncheck: () => playTone(440, 0.06, 'sine', 0.06),

  // Phase switch — sweeping whoosh with chord
  phaseSwitch: () => {
    playChord([261.63, 329.63, 392.0], 0.4, 'sine', 0.05);
    setTimeout(() => playChord([329.63, 392.0, 523.25], 0.5, 'sine', 0.06), 200);
  },

  // Navigate / click
  click: () => playTone(600, 0.04, 'triangle', 0.05),

  // Streak milestone
  streak: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.08), i * 100));
  },

  // Warning / alert
  warning: () => {
    playTone(440, 0.12, 'sawtooth', 0.04);
    setTimeout(() => playTone(440, 0.12, 'sawtooth', 0.04), 150);
  },

  // Timer tick
  tick: () => playTone(1200, 0.02, 'sine', 0.03),

  // Timer complete — bell-like
  timerDone: () => {
    playChord([523.25, 659.25, 783.99, 1046.5], 0.6, 'sine', 0.08);
    setTimeout(() => playChord([587.33, 739.99, 880.0, 1174.66], 0.8, 'sine', 0.06), 300);
  },

  // Pomodoro start
  pomodoroStart: () => {
    playTone(392.0, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(523.25, 0.15, 'sine', 0.1), 100);
  },

  // Study suggestion select
  suggest: () => {
    playTone(440, 0.08, 'triangle', 0.06);
    setTimeout(() => playTone(554.37, 0.1, 'triangle', 0.07), 60);
    setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.08), 120);
  },

  // Add block / create
  create: () => {
    playTone(523.25, 0.06, 'sine', 0.07);
    setTimeout(() => playTone(659.25, 0.08, 'sine', 0.09), 50);
  },

  // Drop / snap into place
  drop: () => {
    playTone(261.63, 0.06, 'sine', 0.08);
    setTimeout(() => playTone(392.0, 0.1, 'sine', 0.1), 40);
  },

  // Drag start
  dragStart: () => playTone(350, 0.04, 'triangle', 0.04),

  // Resize tick (subtle)
  resizeTick: () => playTone(800, 0.02, 'sine', 0.02),

  // Delete
  remove: () => playTone(220, 0.15, 'sawtooth', 0.04),

  // Morning checkin step
  checkinStep: () => playTone(698.46, 0.06, 'sine', 0.06),

  // Success / day log complete
  success: () => {
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.25, 'sine', 0.07), i * 80));
  },
};
