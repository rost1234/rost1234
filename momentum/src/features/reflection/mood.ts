import type { MoodScore } from '@/domain/models';
import type { TranslationKey } from '@/i18n';

export interface MoodOption {
  score: MoodScore;
  emoji: string;
  label: TranslationKey;
}

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { score: 1, emoji: '😞', label: 'mood.1' },
  { score: 2, emoji: '😕', label: 'mood.2' },
  { score: 3, emoji: '😐', label: 'mood.3' },
  { score: 4, emoji: '🙂', label: 'mood.4' },
  { score: 5, emoji: '😄', label: 'mood.5' },
];
