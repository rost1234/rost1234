import type { Weekday } from '@/core/localDate';
import type { Habit, HabitReminder, NewHabit, TargetFrequency, TimeOfDay, GrowthMode } from '@/domain/models';
import type { HabitPreset, TemplateGroup } from '@/domain/presets';
import type { TranslationKey } from '@/i18n';

/** Everything the add and edit screens can change, with every optional field filled in. */
export interface HabitDraft {
  title: string;
  microStep: string;
  isQuantitative: boolean;
  targetCount: number;
  unit: string;
  targetFrequency: TargetFrequency;
  targetDays: Weekday[];
  why: string;
  growthMode: GrowthMode;
  goalCount: number | null;
  levelStep: number | null;
  cue: string;
  pairing: string;
  afterHabitId: string | null;
  timeOfDay: TimeOfDay;
  reminder: HabitReminder;
  isQuit: boolean;
  quitCost: number | null;
  quitMinutes: number | null;
  groupName: string;
}

export const TIMES: { id: TimeOfDay; key: TranslationKey }[] = [
  { id: 'any', key: 'rhythm.any' },
  { id: 'morning', key: 'rhythm.morning' },
  { id: 'afternoon', key: 'rhythm.afternoon' },
  { id: 'evening', key: 'rhythm.evening' },
];

export const WORKDAYS: Weekday[] = [0, 1, 2, 3, 4];

export function emptyDraft(isQuit = false): HabitDraft {
  return {
    title: '',
    microStep: '',
    isQuantitative: false,
    targetCount: 1,
    unit: '',
    targetFrequency: 'daily',
    targetDays: [],
    why: '',
    growthMode: 'maintain',
    goalCount: null,
    levelStep: null,
    cue: '',
    pairing: '',
    afterHabitId: null,
    timeOfDay: 'any',
    reminder: 'off',
    isQuit,
    quitCost: null,
    quitMinutes: null,
    groupName: '',
  };
}

export function draftFromHabit(habit: Habit): HabitDraft {
  const { id: _id, createdAt: _createdAt, isArchived: _isArchived, levelSnoozeUntil: _snooze, ...fields } = habit;
  return { ...fields, targetDays: [...habit.targetDays] };
}

/** A ready-made idea becomes a full draft (everything it doesn't set keeps the default). */
export function draftFromPreset(preset: HabitPreset): HabitDraft {
  return { ...emptyDraft(), ...preset.habit, targetDays: [...preset.habit.targetDays] } as HabitDraft;
}

/** What gets saved: fields that don't apply (a quit habit's amount, a yes/no habit's unit) are cleared. */
export function toNewHabit(draft: HabitDraft): NewHabit {
  const quit = draft.isQuit;
  const counted = draft.isQuantitative && !quit;
  const grow = !quit && draft.growthMode === 'grow';
  const specific = draft.targetFrequency === 'specific_days' && draft.targetDays.length > 0;
  return {
    title: draft.title.trim(),
    microStep: draft.microStep.trim(),
    isQuantitative: counted,
    targetCount: counted ? Math.max(1, Math.min(999, Math.round(draft.targetCount))) : 1,
    unit: counted ? draft.unit.trim() : '',
    targetFrequency: specific ? 'specific_days' : 'daily',
    targetDays: specific ? [...draft.targetDays].sort((a, b) => a - b) : [],
    why: draft.why.trim(),
    growthMode: grow ? 'grow' : 'maintain',
    goalCount: grow && draft.goalCount && draft.goalCount > 0 ? draft.goalCount : null,
    levelStep: grow && draft.levelStep && draft.levelStep > 0 ? draft.levelStep : null,
    cue: draft.cue.trim(),
    pairing: quit ? '' : draft.pairing.trim(),
    afterHabitId: quit ? null : draft.afterHabitId,
    timeOfDay: draft.timeOfDay,
    reminder: quit ? 'off' : draft.reminder,
    isQuit: quit,
    quitCost: quit && draft.quitCost && draft.quitCost > 0 ? draft.quitCost : null,
    quitMinutes: quit && draft.quitMinutes && draft.quitMinutes > 0 ? draft.quitMinutes : null,
    groupName: draft.groupName.trim(),
  };
}

export const canSave = (draft: HabitDraft): boolean => draft.title.trim().length > 0;

/** How many of the "make it easier" extras are set (shown on the Edit screen). */
export function extrasCount(draft: HabitDraft): number {
  return [
    draft.microStep.trim(),
    draft.cue.trim(),
    draft.afterHabitId,
    draft.pairing.trim(),
    draft.why.trim(),
    draft.growthMode === 'grow' ? 'grow' : '',
    draft.groupName.trim(),
  ].filter(Boolean).length;
}

const normalize = (text: string) => text.trim().toLocaleLowerCase();

/** Ideas whose title (or group) contains what was typed; with nothing typed, none. */
export function matchIdeas(groups: readonly TemplateGroup[], text: string, limit = 3): HabitPreset[] {
  const query = normalize(text);
  if (query.length < 2) return [];
  const all = groups.flatMap((g) => g.presets.map((preset) => ({ preset, group: normalize(g.title) })));
  const hits = all.filter(({ preset, group }) => normalize(preset.habit.title).includes(query) || group.includes(query));
  return hits.slice(0, limit).map((h) => h.preset);
}

/** Is there already an active habit with this title? (So a ready-made idea isn't added twice.) */
export const hasHabitTitled = (habits: readonly Pick<Habit, 'title'>[], title: string): boolean =>
  habits.some((h) => normalize(h.title) === normalize(title));
