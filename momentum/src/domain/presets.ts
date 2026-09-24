import type { NewHabit } from './models';

export type GoalId = 'focus' | 'health' | 'mindset';

export interface Goal {
  id: GoalId;
  title: string;
  subtitle: string;
  emoji: string;
}

export interface HabitPreset {
  key: string;
  habit: NewHabit;
  /** Short human summary, e.g. "4 times/day". */
  summary: string;
}

export const GOALS: readonly Goal[] = [
  { id: 'focus', title: 'Focus & Deep Work', subtitle: 'Protect your attention', emoji: '🎯' },
  { id: 'health', title: 'Health & Vitality', subtitle: 'Energy you can feel', emoji: '💪' },
  { id: 'mindset', title: 'Mindset & Peace', subtitle: 'A calmer, clearer mind', emoji: '🧘' },
];

const binary = (title: string, microStep: string): NewHabit => ({
  title,
  microStep,
  isQuantitative: false,
  targetCount: 1,
  unit: '',
  targetFrequency: 'daily',
  targetDays: [],
});

const counted = (title: string, microStep: string, targetCount: number, unit: string): NewHabit => ({
  title,
  microStep,
  isQuantitative: true,
  targetCount,
  unit,
  targetFrequency: 'daily',
  targetDays: [],
});

export const PRESETS: Readonly<Record<GoalId, readonly HabitPreset[]>> = {
  focus: [
    { key: 'deep-work', habit: counted('Deep Work Block', 'Close all tabs, start a 25-min timer', 2, 'blocks'), summary: '2 blocks/day' },
    { key: 'read', habit: counted('Read', 'Open the book to the bookmark', 10, 'pages'), summary: '10 pages/day' },
    { key: 'plan', habit: binary('Plan Tomorrow', 'Write the top 3 tasks for tomorrow'), summary: 'Once a day' },
  ],
  health: [
    { key: 'water', habit: counted('Drink Water', 'Fill a glass and drink it', 4, 'glasses'), summary: '4 times/day' },
    { key: 'walk', habit: binary('Move 20 Minutes', 'Put on your shoes'), summary: 'Once a day' },
    { key: 'sleep', habit: binary('Screens Off by 23:00', 'Plug the phone in outside the bedroom'), summary: 'Once a day' },
  ],
  mindset: [
    { key: 'meditate', habit: binary('Meditate', 'Sit down and take 3 slow breaths'), summary: 'Once a day' },
    { key: 'journal', habit: binary('Journal', 'Write one sentence'), summary: 'Once a day' },
    { key: 'gratitude', habit: counted('Gratitude Notes', 'Name one good thing right now', 3, 'notes'), summary: '3 times/day' },
  ],
};
