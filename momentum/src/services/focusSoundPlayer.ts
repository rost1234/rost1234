import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { MAX_LAYERS, type SoundLayer } from '@/features/focus/soundLayers';
import { findSound, type FocusSoundId } from '@/features/focus/sounds';
import { t } from '@/i18n';

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 700;
const FADE_STEP_MS = 40;
/** One independently faded player. Slot 0 owns the lock-screen media session. */
interface Slot {
  player: AudioPlayer | null;
  currentId: FocusSoundId;
  /** Bumped on every command so an older fade never overrides a newer action. */
  generation: number;
}

const slots: Slot[] = Array.from({ length: MAX_LAYERS }, () => ({ player: null, currentId: 'off', generation: 0 }));
let modeConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (modeConfigured) return;
  modeConfigured = true;
  // Keep playing with the screen locked, and don't stop the user's other audio.
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
}

/** Smoothly moves the volume; resolves false if a newer command took over. */
function fadeTo(slot: Slot, target: number, durationMs: number, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    const p = slot.player;
    if (!p) return resolve(false);
    const from = p.volume;
    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let step = 0;
    const id = setInterval(() => {
      if (token !== slot.generation || slot.player !== p) {
        clearInterval(id);
        resolve(false);
        return;
      }
      step += 1;
      // Ease-in-out curve sounds smoother than a linear ramp.
      const x = step / steps;
      const eased = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
      p.volume = from + (target - from) * eased;
      if (step >= steps) {
        clearInterval(id);
        resolve(true);
      }
    }, FADE_STEP_MS);
  });
}

function release(slot: Slot): void {
  if (!slot.player) return;
  slot.player.pause();
  slot.player.clearLockScreenControls();
  slot.player.remove();
  slot.player = null;
  slot.currentId = 'off';
}

async function stopSlot(slot: Slot, token: number): Promise<void> {
  if (!slot.player) return;
  const done = await fadeTo(slot, 0, FADE_OUT_MS, token);
  if (done && token === slot.generation) release(slot);
}

async function playSlot(index: number, layer: SoundLayer, lockScreenTitle: string): Promise<void> {
  const slot = slots[index]!;
  const token = ++slot.generation;
  const sound = findSound(layer.id);
  if (!sound) {
    await stopSlot(slot, token);
    return;
  }
  await ensureAudioMode();
  if (token !== slot.generation) return;

  if (!slot.player) {
    slot.player = createAudioPlayer(sound.source);
    slot.player.volume = 0;
  } else if (slot.currentId !== layer.id) {
    if (slot.player.playing && !(await fadeTo(slot, 0, FADE_OUT_MS, token))) return;
    slot.player.replace(sound.source);
  }
  slot.currentId = layer.id;
  slot.player.loop = true;
  slot.player.play();
  // Android stops background audio after ~3 min unless it is the active media session.
  if (index === 0) slot.player.setActiveForLockScreen(true, { title: t('sound.lockTitle'), artist: `Momentum · ${lockScreenTitle}` });
  await fadeTo(slot, layer.volume, FADE_IN_MS, token);
}

/** Starts, crossfades or stops each layer so the mix matches `layers`. */
export async function playFocusMix(layers: readonly SoundLayer[]): Promise<void> {
  const active = layers.filter((l) => findSound(l.id)).slice(0, MAX_LAYERS);
  const title = active.map((l) => t(findSound(l.id)!.label)).join(' + ');
  await Promise.all(
    slots.map((_, index) => {
      const layer = active[index];
      return layer ? playSlot(index, layer, title) : stopSlot(slots[index]!, ++slots[index]!.generation);
    }),
  );
}

export function setFocusSoundVolume(index: number, volume: number): void {
  const slot = slots[index];
  if (slot?.player) void fadeTo(slot, volume, 300, ++slot.generation);
}

export function pauseFocusSound(): void {
  for (const slot of slots) {
    const token = ++slot.generation;
    void fadeTo(slot, 0, FADE_OUT_MS, token).then((done) => {
      if (done && token === slot.generation) slot.player?.pause();
    });
  }
}

export function stopFocusSound(): void {
  for (const slot of slots) void stopSlot(slot, ++slot.generation);
}
