import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { findSound, type FocusSoundId } from '@/features/focus/sounds';

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 700;
const FADE_STEP_MS = 40;

let player: AudioPlayer | null = null;
let currentId: FocusSoundId = 'off';
let targetVolume = 0.5;
let modeConfigured = false;
/** Bumped on every command so an older fade never overrides a newer action. */
let generation = 0;

async function ensureAudioMode(): Promise<void> {
  if (modeConfigured) return;
  modeConfigured = true;
  // Keep playing with the screen locked, and don't stop the user's other audio.
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
}

/** Smoothly moves the volume; resolves false if a newer command took over. */
function fadeTo(target: number, durationMs: number, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    const p = player;
    if (!p) return resolve(false);
    const from = p.volume;
    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let step = 0;
    const id = setInterval(() => {
      if (token !== generation || player !== p) {
        clearInterval(id);
        resolve(false);
        return;
      }
      step += 1;
      // Ease-in-out curve sounds smoother than a linear ramp.
      const t = step / steps;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      p.volume = from + (target - from) * eased;
      if (step >= steps) {
        clearInterval(id);
        resolve(true);
      }
    }, FADE_STEP_MS);
  });
}

function release(): void {
  if (!player) return;
  player.pause();
  player.clearLockScreenControls();
  player.remove();
  player = null;
  currentId = 'off';
}

/** Starts (or crossfades to) a looping focus sound. `off` fades out and stops. */
export async function playFocusSound(id: FocusSoundId, volume: number): Promise<void> {
  const token = ++generation;
  targetVolume = volume;
  const sound = findSound(id);
  if (!sound) {
    await stopFocusSoundAsync(token);
    return;
  }
  await ensureAudioMode();
  if (token !== generation) return;

  if (!player) {
    player = createAudioPlayer(sound.source);
    player.volume = 0;
  } else if (currentId !== id) {
    if (player.playing && !(await fadeTo(0, FADE_OUT_MS, token))) return;
    player.replace(sound.source);
  }
  currentId = id;
  player.loop = true;
  player.play();
  // Android stops background audio after ~3 min unless it is the active media session.
  player.setActiveForLockScreen(true, { title: 'Focus session', artist: `Momentum · ${sound.label}` });
  await fadeTo(targetVolume, FADE_IN_MS, token);
}

export function setFocusSoundVolume(volume: number): void {
  targetVolume = volume;
  if (player) void fadeTo(volume, 300, ++generation);
}

export function pauseFocusSound(): void {
  const token = ++generation;
  void fadeTo(0, FADE_OUT_MS, token).then((done) => {
    if (done && token === generation) player?.pause();
  });
}

async function stopFocusSoundAsync(token: number): Promise<void> {
  if (!player) return;
  const done = await fadeTo(0, FADE_OUT_MS, token);
  if (done && token === generation) release();
}

export function stopFocusSound(): void {
  void stopFocusSoundAsync(++generation);
}
