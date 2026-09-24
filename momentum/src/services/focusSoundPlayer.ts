import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { findSound, type FocusSoundId } from '@/features/focus/sounds';

let player: AudioPlayer | null = null;
let currentId: FocusSoundId = 'off';
let modeConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (modeConfigured) return;
  modeConfigured = true;
  // Keep playing with the screen locked, and don't stop the user's other audio.
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
}

function release(): void {
  if (!player) return;
  player.pause();
  player.clearLockScreenControls();
  player.remove();
  player = null;
  currentId = 'off';
}

/** Starts (or switches to) a looping focus sound. `off` stops playback. */
export async function playFocusSound(id: FocusSoundId, volume: number): Promise<void> {
  const sound = findSound(id);
  if (!sound) {
    release();
    return;
  }
  await ensureAudioMode();
  if (!player) {
    player = createAudioPlayer(sound.source);
  } else if (currentId !== id) {
    player.replace(sound.source);
  }
  currentId = id;
  player.loop = true;
  player.volume = volume;
  player.play();
  // Android stops background audio after ~3 min unless it is the active media session.
  player.setActiveForLockScreen(true, { title: 'Focus session', artist: `Momentum · ${sound.label}` });
}

export function setFocusSoundVolume(volume: number): void {
  if (player) player.volume = volume;
}

export function pauseFocusSound(): void {
  player?.pause();
}

export function stopFocusSound(): void {
  release();
}
