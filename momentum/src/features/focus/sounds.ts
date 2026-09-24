import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { AudioSource } from 'expo-audio';
import type { TranslationKey } from '@/i18n';
import rainSound from '../../../assets/sounds/rain.ogg';
import oceanSound from '../../../assets/sounds/ocean.ogg';
import brownNoise from '../../../assets/sounds/brown-noise.ogg';
import pinkNoise from '../../../assets/sounds/pink-noise.ogg';
import whiteNoise from '../../../assets/sounds/white-noise.ogg';
import binaural40 from '../../../assets/sounds/binaural-40hz.ogg';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type FocusSoundId = 'off' | 'rain' | 'ocean' | 'brown' | 'pink' | 'white' | 'binaural40';

export interface FocusSound {
  id: Exclude<FocusSoundId, 'off'>;
  label: TranslationKey;
  description: TranslationKey;
  /** Honest one-liner about the research, shown in the picker. */
  evidence: TranslationKey;
  needsHeadphones: boolean;
  icon: IconName;
  /** Accent used for the sound's card. */
  tint: string;
  source: AudioSource;
}

/*
 * Research summary (kept deliberately modest):
 * - Steady broadband noise masks distracting speech and sudden sounds. Studies
 *   find small attention benefits on average, larger for people with ADHD
 *   symptoms, and none (or a slight cost) for some people — so it's opt-in.
 * - Binaural beats: results are mixed; some studies report small effects on
 *   attention, many don't replicate. Offered as "experimental".
 */
export const FOCUS_SOUNDS: readonly FocusSound[] = [
  {
    id: 'rain',
    label: 'sound.rain.label',
    description: 'sound.rain.desc',
    evidence: 'sound.evNature',
    needsHeadphones: false,
    icon: 'rainy-outline',
    tint: '#3B82F6',
    source: rainSound,
  },
  {
    id: 'ocean',
    label: 'sound.ocean.label',
    description: 'sound.ocean.desc',
    evidence: 'sound.evNature',
    needsHeadphones: false,
    icon: 'water-outline',
    tint: '#0EA5E9',
    source: oceanSound,
  },
  {
    id: 'brown',
    label: 'sound.brown.label',
    description: 'sound.brown.desc',
    evidence: 'sound.evNoise',
    needsHeadphones: false,
    icon: 'cloudy-outline',
    tint: '#A16207',
    source: brownNoise,
  },
  {
    id: 'pink',
    label: 'sound.pink.label',
    description: 'sound.pink.desc',
    evidence: 'sound.evNoise',
    needsHeadphones: false,
    icon: 'leaf-outline',
    tint: '#DB2777',
    source: pinkNoise,
  },
  {
    id: 'white',
    label: 'sound.white.label',
    description: 'sound.white.desc',
    evidence: 'sound.evWhite',
    needsHeadphones: false,
    icon: 'radio-outline',
    tint: '#64748B',
    source: whiteNoise,
  },
  {
    id: 'binaural40',
    label: 'sound.binaural40.label',
    description: 'sound.binaural40.desc',
    evidence: 'sound.evBinaural',
    needsHeadphones: true,
    icon: 'headset-outline',
    tint: '#7C3AED',
    source: binaural40,
  },
];

export const VOLUME_LEVELS = [
  { label: 'sound.vol.low', value: 0.25 },
  { label: 'sound.vol.medium', value: 0.5 },
  { label: 'sound.vol.high', value: 0.85 },
] as const;

export function findSound(id: FocusSoundId): FocusSound | undefined {
  return FOCUS_SOUNDS.find((s) => s.id === id);
}
