import type { MoodScore } from '@/domain/models';

export interface MoodOption {
  score: MoodScore;
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { score: 1, emoji: '😞', label: 'Rough' },
  { score: 2, emoji: '😕', label: 'Meh' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];
