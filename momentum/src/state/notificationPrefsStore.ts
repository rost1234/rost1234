import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { DAILY_LIMIT_RANGE, DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/domain/notificationPlan';

const KEY = 'momentum.notifications.v1';

interface NotificationPrefsState extends NotificationPrefs {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  update: (changes: Partial<NotificationPrefs>) => void;
}

const isMinutes = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1440;

export function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  const d = DEFAULT_NOTIFICATION_PREFS;
  if (!raw) return d;
  const data = JSON.parse(raw) as Record<string, unknown>;
  const limit = data.dailyLimit;
  return {
    quietStart: isMinutes(data.quietStart) ? data.quietStart : d.quietStart,
    quietEnd: isMinutes(data.quietEnd) ? data.quietEnd : d.quietEnd,
    dailyLimit:
      typeof limit === 'number' && Number.isInteger(limit) && limit >= DAILY_LIMIT_RANGE.min && limit <= DAILY_LIMIT_RANGE.max
        ? limit
        : d.dailyLimit,
    streakRescue: typeof data.streakRescue === 'boolean' ? data.streakRescue : d.streakRescue,
    rescueMinutes: isMinutes(data.rescueMinutes) ? data.rescueMinutes : d.rescueMinutes,
    morningPlan: typeof data.morningPlan === 'boolean' ? data.morningPlan : d.morningPlan,
    morningMinutes: isMinutes(data.morningMinutes) ? data.morningMinutes : d.morningMinutes,
  };
}

function pick(state: NotificationPrefs): NotificationPrefs {
  const { quietStart, quietEnd, dailyLimit, streakRescue, rescueMinutes, morningPlan, morningMinutes } = state;
  return { quietStart, quietEnd, dailyLimit, streakRescue, rescueMinutes, morningPlan, morningMinutes };
}

/** Smart-notification settings (per device, not part of backups). */
export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  ...DEFAULT_NOTIFICATION_PREFS,
  isHydrated: false,

  hydrate: async () => {
    try {
      set(parseNotificationPrefs(await AsyncStorage.getItem(KEY)));
    } catch {
      // Defaults are fine.
    } finally {
      set({ isHydrated: true });
    }
  },

  update: (changes) => {
    set(changes);
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify(pick(get()))));
  },
}));

export const selectNotificationPrefs = pick;
