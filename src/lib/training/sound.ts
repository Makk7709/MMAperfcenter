type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Browsers only allow sound after a user gesture: call from a click handler. */
export function unlockAudio(): void {
  const c = context();
  if (c?.state === "suspended") void c.resume();
}

export function beep(frequency = 880, durationMs = 180, volume = 0.25): void {
  const c = context();
  if (!c || c.state !== "running") return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

/** Round bell: three short high tones. */
export function bell(): void {
  [0, 220, 440].forEach((delay) => setTimeout(() => beep(1320, 160, 0.3), delay));
  navigator.vibrate?.([200, 100, 200]);
}
