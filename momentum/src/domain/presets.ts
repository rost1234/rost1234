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

export interface TemplateGroup {
  id: string;
  title: string;
  emoji: string;
  presets: readonly HabitPreset[];
}

/** Extra starter sets beyond the onboarding goals (used by "Browse templates"). */
const EXTRA_GROUPS: readonly TemplateGroup[] = [
  {
    id: 'sleep',
    title: 'Better Sleep',
    emoji: '🌙',
    presets: [
      { key: 'same-wake', habit: binary('Same Wake-up Time', 'Put the alarm across the room'), summary: 'Once a day' },
      { key: 'morning-light', habit: binary('Morning Daylight', 'Step outside for 5 minutes'), summary: 'Once a day' },
      { key: 'no-late-coffee', habit: binary('No Caffeine After 14:00', 'Swap the afternoon coffee for water'), summary: 'Once a day' },
    ],
  },
  {
    id: 'study',
    title: 'Study & Learning',
    emoji: '📚',
    presets: [
      { key: 'study-block', habit: counted('Study Block', 'Open the notes and set a 25-min timer', 2, 'blocks'), summary: '2 blocks/day' },
      { key: 'recall', habit: binary('Active Recall', 'Close the book and write what you remember'), summary: 'Once a day' },
      { key: 'flashcards', habit: counted('Flashcards', 'Review the first card', 20, 'cards'), summary: '20 cards/day' },
    ],
  },
  {
    id: 'fitness',
    title: 'Fitness',
    emoji: '🏃',
    presets: [
      { key: 'steps', habit: counted('Walk', 'Walk to the end of the street', 30, 'min'), summary: '30 min/day' },
      { key: 'pushups', habit: counted('Push-ups', 'Do one push-up', 20, 'reps'), summary: '20 reps/day' },
      { key: 'stretch', habit: binary('Stretch', 'Touch your toes once'), summary: 'Once a day' },
    ],
  },
  {
    id: 'adhd',
    title: 'ADHD-friendly',
    emoji: '⚡',
    presets: [
      { key: 'launchpad', habit: binary('Launch Pad Reset', 'Put keys, wallet and phone in one spot'), summary: 'Once a day' },
      { key: 'one-thing', habit: binary('Pick One Thing', 'Write the single most important task'), summary: 'Once a day' },
      { key: 'body-double', habit: counted('Short Focus Sprint', 'Start a 15-min timer, anything counts', 2, 'sprints'), summary: '2 sprints/day' },
    ],
  },
];

export const TEMPLATE_GROUPS: readonly TemplateGroup[] = [
  ...GOALS.map((goal) => ({ id: goal.id, title: goal.title, emoji: goal.emoji, presets: PRESETS[goal.id] })),
  ...EXTRA_GROUPS,
];

/** Three quick starters for an empty Today screen: one per onboarding goal. */
export function starterSuggestions(): HabitPreset[] {
  return GOALS.map((goal) => PRESETS[goal.id][0]).filter((p): p is HabitPreset => p !== undefined);
}
