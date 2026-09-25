import { addDays, getWeekday, type LocalDateString } from '@/core/localDate';
import { habitStartDate, isHabitDueOn } from './habitSchedule';
import type { Habit, HabitLog, Pause } from './models';
import { isPaused } from './pauses';
import { orderByTimeOfDay, reminderDates, usualReminderMinutes } from './rhythm';

/** Per-device settings for the smart notification planner. Times are minutes after local midnight. */
export interface NotificationPrefs {
  /** Automatic habit reminders never land between quietStart and quietEnd (may wrap midnight). */
  quietStart: number;
  quietEnd: number;
  /** Most notifications on any single day; lower-priority ones are dropped first. */
  dailyLimit: number;
  /** One evening nudge when a streak of 3+ days is still open today. */
  streakRescue: boolean;
  rescueMinutes: number;
  /** A short "here's today" note in the morning. */
  morningPlan: boolean;
  morningMinutes: number;
  /** Evening "did you already do these?" for habits still unlogged, so a habit done away from the phone still gets logged. */
  checkIn: boolean;
  checkInMinutes: number;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  quietStart: 22 * 60,
  quietEnd: 7 * 60,
  dailyLimit: 4,
  streakRescue: true,
  rescueMinutes: 20 * 60 + 30,
  morningPlan: false,
  morningMinutes: 8 * 60,
  checkIn: true,
  checkInMinutes: 21 * 60,
};

export const DAILY_LIMIT_RANGE = { min: 1, max: 8 } as const;
/** Habit reminders this close together become one notification. */
export const BATCH_WINDOW_MINUTES = 30;
/** Streaks shorter than this aren't worth an extra evening ping. */
export const RESCUE_MIN_STREAK = 3;
/** Days ahead that are planned; nothing is scheduled beyond, so an unopened app goes quiet on its own. */
export const PLAN_DAYS = 7;

export type PlannedKind = 'habit' | 'habits' | 'rescue' | 'morning' | 'reflection' | 'checkin';

export interface PlannedNotification {
  kind: PlannedKind;
  date: LocalDateString;
  minutes: number;
  /** Habits the notification is about (rescue/habit/habits), in display order. */
  habitIds: string[];
  /** Habit reminder that is being ignored: shown every other day with the tiny step only. */
  gentle?: boolean;
  /** Morning plan: how many habits are due that day. */
  count?: number;
}

export interface PlanInput {
  today: LocalDateString;
  /** Minutes after midnight right now; nothing is planned for a time that has passed. */
  nowMinutes: number;
  habits: readonly Habit[];
  logsByHabit: Readonly<Record<string, Readonly<Record<LocalDateString, HabitLog>>>>;
  /** Current streaks (today counts only once done). */
  streaks: Readonly<Record<string, number>>;
  pauses: readonly Pause[];
  prefs: NotificationPrefs;
  /** Evening reflection reminder time, or null when off. */
  reflectionMinutes: number | null;
  reflectedToday: boolean;
}

const PRIORITY: Record<PlannedKind, number> = { reflection: 4, rescue: 3, checkin: 3, morning: 2, habit: 1, habits: 1 };

function isQuiet(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

const circular = (from: number, to: number) => (((to - from) % 1440) + 1440) % 1440;

/**
 * Moves a time out of the quiet window to its nearer edge: just before it starts
 * (a 23:00 habit → 21:45) or right when it ends (a 06:00 habit → 07:00).
 */
export function fitQuietHours(minutes: number, start: number, end: number): number {
  if (!isQuiet(minutes, start, end)) return minutes;
  const sinceStart = circular(start, minutes);
  const untilEnd = circular(minutes, end);
  return sinceStart + 15 <= untilEnd ? (start - 15 + 1440) % 1440 : end;
}

function isDoneOrSkipped(log: HabitLog | undefined): boolean {
  return log?.status === 'completed' || log?.status === 'skipped';
}

/**
 * Notification fatigue: 7 scheduled (not paused) days before today with at most
 * one completion means the reminder isn't working. Reminding less often and
 * asking only for the tiny step beats nagging louder.
 */
export function isReminderIgnored(
  habit: Habit,
  logs: Readonly<Record<LocalDateString, HabitLog>>,
  pauses: readonly Pause[],
  today: LocalDateString,
): boolean {
  const start = habitStartDate(habit);
  let due = 0;
  let done = 0;
  for (let i = 1; i <= 28 && due < 7; i += 1) {
    const date = addDays(today, -i);
    if (date < start) break;
    if (!isHabitDueOn(habit, date) || isPaused(pauses, date)) continue;
    due += 1;
    if (logs[date]?.status === 'completed') done += 1;
  }
  return due >= 7 && done <= 1;
}

function habitReminders(input: PlanInput): PlannedNotification[] {
  const { today, habits, logsByHabit, pauses, prefs } = input;
  const singles: PlannedNotification[] = [];
  for (const habit of habits) {
    if (habit.isArchived || habit.reminder !== 'smart') continue;
    const logs = logsByHabit[habit.id] ?? {};
    const history = Object.values(logs).sort((a, b) => a.logDate.localeCompare(b.logDate));
    const gentle = isReminderIgnored(habit, logs, pauses, today);
    const dates = reminderDates(habit, today, isDoneOrSkipped(logs[today]), PLAN_DAYS).filter((d) => !isPaused(pauses, d));
    dates.forEach((date, index) => {
      if (gentle && index % 2 === 1) return;
      const usual = usualReminderMinutes(habit, history, getWeekday(date));
      singles.push({
        kind: 'habit',
        date,
        minutes: fitQuietHours(usual, prefs.quietStart, prefs.quietEnd),
        habitIds: [habit.id],
        gentle,
      });
    });
  }
  return batch(singles);
}

/** Merges habit reminders on the same day that fall within the batch window of each other. */
function batch(singles: PlannedNotification[]): PlannedNotification[] {
  const sorted = [...singles].sort((a, b) => a.date.localeCompare(b.date) || a.minutes - b.minutes);
  const result: PlannedNotification[] = [];
  for (const next of sorted) {
    const last = result[result.length - 1];
    if (last && last.date === next.date && next.minutes - last.minutes <= BATCH_WINDOW_MINUTES) {
      result[result.length - 1] = {
        ...last,
        kind: 'habits',
        habitIds: [...last.habitIds, ...next.habitIds],
        gentle: last.gentle && next.gentle,
      };
    } else {
      result.push(next);
    }
  }
  return result;
}

function streakRescue(input: PlanInput): PlannedNotification[] {
  const { today, habits, logsByHabit, streaks, pauses, prefs } = input;
  if (!prefs.streakRescue || isPaused(pauses, today)) return [];
  const atRisk = habits
    .filter((h) => !h.isArchived && isHabitDueOn(h, today))
    .filter((h) => !isDoneOrSkipped(logsByHabit[h.id]?.[today]))
    .filter((h) => (streaks[h.id] ?? 0) >= RESCUE_MIN_STREAK)
    .sort((a, b) => (streaks[b.id] ?? 0) - (streaks[a.id] ?? 0));
  if (atRisk.length === 0) return [];
  return [{ kind: 'rescue', date: today, minutes: prefs.rescueMinutes, habitIds: atRisk.map((h) => h.id) }];
}

/**
 * One evening check-in per day listing the due habits not logged yet. Today it
 * skips what's done, skipped or already in the streak rescue; later days list
 * every due habit (the plan is redone whenever something is logged).
 */
function checkIns(input: PlanInput, rescued: ReadonlySet<string>): PlannedNotification[] {
  const { today, habits, logsByHabit, pauses, prefs } = input;
  if (!prefs.checkIn) return [];
  const minutes = fitQuietHours(prefs.checkInMinutes, prefs.quietStart, prefs.quietEnd);
  const result: PlannedNotification[] = [];
  for (let i = 0; i < PLAN_DAYS; i += 1) {
    const date = addDays(today, i);
    if (isPaused(pauses, date)) continue;
    const open = habits.filter(
      (h) =>
        !h.isArchived &&
        isHabitDueOn(h, date) &&
        (date !== today || (!isDoneOrSkipped(logsByHabit[h.id]?.[today]) && !rescued.has(h.id))),
    );
    if (open.length > 0) result.push({ kind: 'checkin', date, minutes, habitIds: open.map((h) => h.id) });
  }
  return result;
}

function morningPlans(input: PlanInput): PlannedNotification[] {
  const { today, habits, pauses, prefs } = input;
  if (!prefs.morningPlan) return [];
  const result: PlannedNotification[] = [];
  for (let i = 0; i < PLAN_DAYS; i += 1) {
    const date = addDays(today, i);
    if (isPaused(pauses, date)) continue;
    // Same order as Today at that hour, so "first up" matches what the user will see.
    const due = orderByTimeOfDay(
      habits.filter((h) => !h.isArchived && isHabitDueOn(h, date)),
      Math.floor(prefs.morningMinutes / 60),
    );
    if (due.length === 0) continue;
    result.push({ kind: 'morning', date, minutes: prefs.morningMinutes, habitIds: due.map((h) => h.id), count: due.length });
  }
  return result;
}

function reflections(input: PlanInput): PlannedNotification[] {
  const { today, reflectionMinutes, reflectedToday } = input;
  if (reflectionMinutes === null) return [];
  const result: PlannedNotification[] = [];
  for (let i = reflectedToday ? 1 : 0; i < PLAN_DAYS; i += 1) {
    result.push({ kind: 'reflection', date: addDays(today, i), minutes: reflectionMinutes, habitIds: [] });
  }
  return result;
}

/** Keeps at most `limit` per day, dropping the lowest priority (then latest) first. */
function applyDailyLimit(items: PlannedNotification[], limit: number): PlannedNotification[] {
  const byDate = new Map<LocalDateString, PlannedNotification[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  const kept: PlannedNotification[] = [];
  for (const day of byDate.values()) {
    const ranked = [...day].sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || a.minutes - b.minutes);
    kept.push(...ranked.slice(0, Math.max(0, limit)));
  }
  return kept;
}

/**
 * The whole notification plan for the next week, as pure data. Re-planned on
 * every change (a tap, a reflection, a setting), so it always reflects what is
 * still open: done habits aren't reminded, close reminders are bundled, ignored
 * ones back off, quiet hours and the daily limit are respected.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const rescue = streakRescue(input);
  const rescued = new Set(rescue.flatMap((n) => n.habitIds));
  const all = [...habitReminders(input), ...rescue, ...checkIns(input, rescued), ...morningPlans(input), ...reflections(input)].filter(
    (n) => n.date !== input.today || n.minutes > input.nowMinutes,
  );
  return applyDailyLimit(all, input.prefs.dailyLimit).sort((a, b) => a.date.localeCompare(b.date) || a.minutes - b.minutes);
}
