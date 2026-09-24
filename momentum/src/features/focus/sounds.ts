import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { AudioSource } from 'expo-audio';
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
  label: string;
  description: string;
  /** Honest one-liner about the research, shown in the picker. */
  evidence: string;
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
    label: 'Rain',
    description: 'Soft rain on a window',
    evidence: 'Pleasant masking. Many people find it calming; benefits vary.',
    needsHeadphones: false,
    icon: 'rainy-outline',
    tint: '#3B82F6',
    source: rainSound,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Slow, distant waves',
    evidence: 'Pleasant masking. Many people find it calming; benefits vary.',
    needsHeadphones: false,
    icon: 'water-outline',
    tint: '#0EA5E9',
    source: oceanSound,
  },
  {
    id: 'brown',
    label: 'Brown noise',
    description: 'Deep, soft rumble — like a waterfall',
    evidence: 'Masks distractions. Small, person-dependent benefit.',
    needsHeadphones: false,
    icon: 'cloudy-outline',
    tint: '#A16207',
    source: brownNoise,
  },
  {
    id: 'pink',
    label: 'Pink noise',
    description: 'Balanced and even, like steady rain',
    evidence: 'Masks distractions. Small, person-dependent benefit.',
    needsHeadphones: false,
    icon: 'leaf-outline',
    tint: '#DB2777',
    source: pinkNoise,
  },
  {
    id: 'white',
    label: 'White noise',
    description: 'Brighter hiss, strongest masking (softened highs)',
    evidence: 'Best studied for attention, mostly with ADHD symptoms.',
    needsHeadphones: false,
    icon: 'radio-outline',
    tint: '#64748B',
    source: whiteNoise,
  },
  {
    id: 'binaural40',
    label: '40 Hz binaural',
    description: '200 / 240 Hz tones over warm noise',
    evidence: 'Experimental — research is mixed. Needs headphones.',
    needsHeadphones: true,
    icon: 'headset-outline',
    tint: '#7C3AED',
    source: binaural40,
  },
];

export const VOLUME_LEVELS = [
  { label: 'Low', value: 0.25 },
  { label: 'Medium', value: 0.5 },
  { label: 'High', value: 0.85 },
] as const;

export function findSound(id: FocusSoundId): FocusSound | undefined {
  return FOCUS_SOUNDS.find((s) => s.id === id);
}
