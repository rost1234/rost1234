import type { AudioSource } from 'expo-audio';

export type FocusSoundId = 'off' | 'white' | 'pink' | 'brown' | 'binaural40';

export interface FocusSound {
  id: Exclude<FocusSoundId, 'off'>;
  label: string;
  description: string;
  /** Honest one-liner about the research, shown in the picker. */
  evidence: string;
  needsHeadphones: boolean;
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
    id: 'brown',
    label: 'Brown noise',
    description: 'Deep, soft rumble — like a waterfall',
    evidence: 'Masks distractions. Small, person-dependent benefit.',
    needsHeadphones: false,
    source: require('../../../assets/sounds/brown-noise.wav'),
  },
  {
    id: 'pink',
    label: 'Pink noise',
    description: 'Balanced, like steady rain',
    evidence: 'Masks distractions. Small, person-dependent benefit.',
    needsHeadphones: false,
    source: require('../../../assets/sounds/pink-noise.wav'),
  },
  {
    id: 'white',
    label: 'White noise',
    description: 'Bright hiss, strongest masking',
    evidence: 'Best studied for attention, mostly with ADHD symptoms.',
    needsHeadphones: false,
    source: require('../../../assets/sounds/white-noise.wav'),
  },
  {
    id: 'binaural40',
    label: '40 Hz binaural',
    description: '200/240 Hz tones over soft pink noise',
    evidence: 'Experimental — research is mixed. Needs headphones.',
    needsHeadphones: true,
    source: require('../../../assets/sounds/binaural-40hz.wav'),
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
