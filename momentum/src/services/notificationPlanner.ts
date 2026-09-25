import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { runDetached } from '@/core/errors';
import { getLocalDeviceDate, parseLocalDate } from '@/core/localDate';
import type { Habit } from '@/domain/models';
import { planNotifications, type PlanInput, type PlannedNotification } from '@/domain/notificationPlan';
import { useHabitStore } from '@/state/habitStore';
import { selectNotificationPrefs, useNotificationPrefsStore } from '@/state/notificationPrefsStore';
import { usePlanningStore } from '@/state/planningStore';
import { usePrefsStore } from '@/state/prefsStore';
import { useReflectionStore } from '@/state/reflectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { currentLanguage, t, tPlural } from '@/i18n';
import { CHECKIN_CATEGORY, HABIT_REMINDER_CATEGORY } from './habitReminders';
import { hasPermission } from './notifications';

const REMINDER_CHANNEL_ID = 'reminders';
const PLAN_PREFIX = 'plan-';
/** Identifiers used before the planner existed; cleared on the first sync. */
const isLegacy = (id: string) => id.startsWith('habit-') || id === 'reflection-reminder';

/** Everything the planner needs, read from the stores; null until the day's data is loaded. */
export function currentPlanInput(now: Date = new Date()): PlanInput | null {
  const habitState = useHabitStore.getState();
  const settings = useSettingsStore.getState().settings;
  const notif = useNotificationPrefsStore.getState();
  const today = getLocalDeviceDate(now);
  if (habitState.status !== 'ready' || habitState.today !== today || !settings || !notif.isHydrated) return null;
  return {
    today,
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
    habits: habitState.habits,
    logsByHabit: habitState.logs,
    streaks: habitState.streaks,
    pauses: usePlanningStore.getState().pauses,
    prefs: selectNotificationPrefs(notif),
    reflectionMinutes: settings.reflectionReminderMinutes,
    reflectedToday: Boolean(useReflectionStore.getState().byDate[today]),
  };
}

export interface NotificationText {
  title: string;
  body: string;
}

const titlesOf = (ids: readonly string[], byId: ReadonlyMap<string, Habit>) =>
  ids.map((id) => byId.get(id)?.title).filter((x): x is string => Boolean(x));

/** The words a planned notification will show (also used for the preview in Settings). */
export function describePlanned(item: PlannedNotification, habits: readonly Habit[]): NotificationText {
  const lang = currentLanguage();
  const byId = new Map(habits.map((h) => [h.id, h]));
  const first = byId.get(item.habitIds[0] ?? '');
  const titles = titlesOf(item.habitIds, byId);
  switch (item.kind) {
    case 'habit':
      return {
        title: first?.title ?? '',
        body:
          item.gentle && first?.microStep
            ? t('notif.gentleBody', { step: first.microStep })
            : first?.microStep || first?.why || t('remind.defaultBody'),
      };
    case 'habits':
      return { title: tPlural(lang, 'notif.batchTitle', titles.length), body: titles.join(' · ') };
    case 'rescue':
      if (titles.length === 1 && first) {
        return {
          title: t('notif.rescueOne', { title: first.title }),
          body: first.microStep ? t('notif.rescueStep', { step: first.microStep }) : t('notif.rescueBody'),
        };
      }
      return { title: tPlural(lang, 'notif.rescueMany', titles.length), body: titles.join(' · ') };
    case 'morning':
      return { title: t('notif.morningTitle'), body: tPlural(lang, 'notif.morningBody', item.count ?? 0, { first: first?.title ?? '' }) };
    case 'reflection':
      return { title: t('notif.evening'), body: t('notif.eveningBody') };
    case 'checkin':
      if (titles.length === 1 && first) return { title: t('notif.checkinOne', { title: first.title }), body: t('notif.checkinOneBody') };
      return { title: tPlural(lang, 'notif.checkinMany', titles.length), body: titles.join(' · ') };
  }
}

/** Only a notification about exactly one habit can offer "Done ✓"; a check-in about several offers "All done ✓". */
function categoryOf(item: PlannedNotification): string | null {
  if (item.kind === 'checkin') return item.habitIds.length === 1 ? HABIT_REMINDER_CATEGORY : CHECKIN_CATEGORY;
  return (item.kind === 'habit' || item.kind === 'rescue') && item.habitIds.length === 1 ? HABIT_REMINDER_CATEGORY : null;
}

/** The plan for the coming week, or [] before the data is loaded. */
export function upcomingPlan(): PlannedNotification[] {
  const input = currentPlanInput();
  return input ? planNotifications(input) : [];
}

async function syncNow(): Promise<void> {
  if (Platform.OS === 'web') return;
  const input = currentPlanInput();
  if (!input) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (request.identifier.startsWith(PLAN_PREFIX) || isLegacy(request.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined);
    }
  }
  if (!(await hasPermission())) return;
  for (const item of planNotifications(input)) {
    const when = parseLocalDate(item.date);
    when.setHours(Math.floor(item.minutes / 60), item.minutes % 60, 0, 0);
    if (when.getTime() <= Date.now() + 30_000) continue;
    const text = describePlanned(item, input.habits);
    const category = categoryOf(item);
    await Notifications.scheduleNotificationAsync({
      identifier: `${PLAN_PREFIX}${item.kind}-${item.date}-${item.minutes}`,
      content: {
        ...text,
        ...(category ? { categoryIdentifier: category } : {}),
        data: category ? { kind: item.kind, habitIds: item.habitIds, date: item.date } : { kind: item.kind },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: REMINDER_CHANNEL_ID },
    });
  }
}

// Syncs run one at a time; a burst of changes collapses into one re-plan.
let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;

export function syncNotificationPlan(): Promise<void> {
  chain = chain.then(syncNow, syncNow);
  return chain;
}

export function requestNotificationSync(delayMs = 1500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runDetached(syncNotificationPlan());
  }, delayMs);
}

let started = false;

/**
 * Keeps scheduled notifications in step with the app: any change that could
 * alter the plan (a tap, a reflection, a pause, a setting, the language, or
 * coming back to the app) re-plans the week.
 */
export function startNotificationPlanner(): () => void {
  if (started) return () => undefined;
  started = true;
  const unsubscribers = [
    useHabitStore.subscribe((s, p) => {
      if (s.status !== p.status || s.habits !== p.habits || s.logs !== p.logs || s.today !== p.today) requestNotificationSync();
    }),
    useReflectionStore.subscribe((s, p) => {
      if (s.byDate !== p.byDate) requestNotificationSync();
    }),
    usePlanningStore.subscribe((s, p) => {
      if (s.pauses !== p.pauses) requestNotificationSync();
    }),
    useSettingsStore.subscribe((s, p) => {
      if (s.settings?.reflectionReminderMinutes !== p.settings?.reflectionReminderMinutes) requestNotificationSync(300);
    }),
    useNotificationPrefsStore.subscribe(() => requestNotificationSync(600)),
    usePrefsStore.subscribe((s, p) => {
      if (s.language !== p.language) requestNotificationSync();
    }),
  ];
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') requestNotificationSync();
  });
  runDetached(useNotificationPrefsStore.getState().hydrate());
  return () => {
    unsubscribers.forEach((u) => u());
    appState.remove();
    started = false;
  };
}
