import { FOCUS_SOUNDS, VOLUME_LEVELS, type FocusSoundId } from './sounds';

/** Up to two sounds can be layered (e.g. rain + brown noise). */
export const MAX_LAYERS = 2;
export const DEFAULT_VOLUME = VOLUME_LEVELS[1].value;

export interface SoundLayer {
  id: FocusSoundId;
  volume: number;
}

const isSoundId = (v: unknown): v is Exclude<FocusSoundId, 'off'> => FOCUS_SOUNDS.some((s) => s.id === v);
const isVolume = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;

/** Keeps only valid, distinct layers — tolerant of whatever was stored. */
export function normalizeLayers(value: unknown): SoundLayer[] {
  if (!Array.isArray(value)) return [];
  const result: SoundLayer[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, volume } = item as Record<string, unknown>;
    if (!isSoundId(id) || result.some((l) => l.id === id)) continue;
    result.push({ id, volume: isVolume(volume) ? volume : DEFAULT_VOLUME });
  }
  return result.slice(0, MAX_LAYERS);
}

