/**
 * Synthesizes authentic medical OSPE/OSCE brass bell chimes using Web Audio API.
 * Purely client-side and 100% offline.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Initialize sound preference
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('scrub_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('scrub_sound_enabled', String(enabled));
  }
}

export function toggleSound(): boolean {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}

/**
 * Plays an authentic resonant brass station rotation bell chime
 */
export function playStationBell(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Dual chime strike (two strikes 0.22s apart)
  [0, 0.22].forEach((offset) => {
    const strikeTime = now + offset;

    // Fundamental and harmonics characteristic of a brass bell
    const harmonics = [
      { freq: 880, gain: 0.35, decay: 1.4 },
      { freq: 1760, gain: 0.2, decay: 1.1 },
      { freq: 2640, gain: 0.12, decay: 0.8 },
      { freq: 520, gain: 0.18, decay: 1.6 }, // Hum tone
    ];

    harmonics.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, strikeTime);

      gainNode.gain.setValueAtTime(gain, strikeTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, strikeTime + decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(strikeTime);
      osc.stop(strikeTime + decay);
    });
  });
}

/**
 * Plays a single subtle warning chime for "10 seconds remaining"
 */
export function playWarningChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(659.25, now); // E5 note
  osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.3); // D5

  gainNode.gain.setValueAtTime(0.18, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

/**
 * Plays a subtle click when advancing stations manually
 */
export function playStationClick(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);

  gainNode.gain.setValueAtTime(0.05, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Plays a distinct melodic pacing alert chime when 1 minute 30s, 1 minute, or 30s remain
 */
export function playPacingWarningChime(
  toneType: 'ninety_seconds' | 'one_minute' | 'thirty_seconds' = 'one_minute'
): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (toneType === 'thirty_seconds') {
    // Dual alert chime for 30 seconds remaining (more urgent: 784Hz -> 880Hz)
    [0, 0.16].forEach((offset, idx) => {
      const strike = now + offset;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 784 : 880, strike);
      gainNode.gain.setValueAtTime(0.24, strike);
      gainNode.gain.exponentialRampToValueAtTime(0.001, strike + 0.35);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(strike);
      osc.stop(strike + 0.35);
    });
  } else {
    // Gentle melodic 2-note pacing chime for 1m 30s / 1m (D5 -> F#5)
    [0, 0.18].forEach((offset, idx) => {
      const strike = now + offset;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 587.33 : 739.99, strike);
      gainNode.gain.setValueAtTime(0.2, strike);
      gainNode.gain.exponentialRampToValueAtTime(0.001, strike + 0.45);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(strike);
      osc.stop(strike + 0.45);
    });
  }
}

