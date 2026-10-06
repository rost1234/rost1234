import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { nowIso } from '@/core/id';
import type { UrgeMode } from '@/domain/models';
import { URGE_MINUTES } from '@/domain/urges';
import { cancelNotification, scheduleFocusNotification } from '@/services/notifications';
import { t } from '@/i18n';

const KEY = 'momentum.urge.v1';

/** A running "urge now" timer. Kept on disk, so it survives the phone being locked or the app closing. */
export interface UrgeSession {
  habitId: string;
  mode: UrgeMode;
  startedAt: string;
  /** Wall-clock end, ms since epoch. */
  endsAt: number;
  notificationId: string | null;
  /** Home already opened the "did it pass?" question once. */
  prompted: boolean;
}

interface UrgeState {
  session: UrgeSession | null;
  isHydrated: boolean;
  /** The urge screen is showing, so Home shouldn't open it again. */
  isScreenOpen: boolean;
  hydrate: () => Promise<void>;
  start: (habitId: string, mode: UrgeMode) => Promise<void>;
  /** Ends the session (answered or left), cancelling the end notification if it's still pending. */
  clear: () => void;
  markPrompted: () => void;
  setScreenOpen: (open: boolean) => void;
}

const persist = (session: UrgeSession | null) =>
  runDetached(session ? AsyncStorage.setItem(KEY, JSON.stringify(session)) : AsyncStorage.removeItem(KEY));

const isSession = (value: unknown): value is UrgeSession => {
  const s = value as Partial<UrgeSession> | null;
  return !!s && typeof s.habitId === 'string' && typeof s.endsAt === 'number' && (s.mode === 'sit' || s.mode === 'walk') && typeof s.startedAt === 'string';
};

export const useUrgeStore = create<UrgeState>((set, get) => ({
  session: null,
  isHydrated: false,
  isScreenOpen: false,

  hydrate: async () => {
    if (get().isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      // A session left open for over a day is stale; drop it quietly.
      const session = isSession(parsed) && Date.now() - parsed.endsAt < 24 * 60 * 60 * 1000 ? parsed : null;
      set({ session: get().session ?? session, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  start: async (habitId, mode) => {
    const minutes = URGE_MINUTES[mode];
    const endsAt = Date.now() + minutes * 60 * 1000;
    const session: UrgeSession = { habitId, mode, startedAt: nowIso(), endsAt, notificationId: null, prompted: false };
    set({ session });
    persist(session);
    const notificationId = await scheduleFocusNotification(new Date(endsAt), t('urge.notifTitle', { minutes }), t('urge.notifBody')).catch(() => null);
    // Only keep the id if this is still the same session.
    if (get().session?.startedAt === session.startedAt) {
      const withId = { ...session, notificationId };
      set({ session: withId });
      persist(withId);
    } else {
      runDetached(cancelNotification(notificationId));
    }
  },

  clear: () => {
    const id = get().session?.notificationId ?? null;
    set({ session: null });
    persist(null);
    // Harmless once it has fired; stops it when the urge was answered early.
    runDetached(cancelNotification(id));
  },

  markPrompted: () => {
    const session = get().session;
    if (!session || session.prompted) return;
    const next = { ...session, prompted: true };
    set({ session: next });
    persist(next);
  },

  setScreenOpen: (open) => set({ isScreenOpen: open }),
}));

/**
 * Home opens "did it pass?" once when an urge timer has ended while the screen
 * was closed (the end notification was tapped, or the app was simply reopened).
 */
export function openEndedUrge(navigate: () => void): void {
  const { session, isScreenOpen, markPrompted } = useUrgeStore.getState();
  if (!session || isScreenOpen || session.prompted || Date.now() < session.endsAt) return;
  markPrompted();
  navigate();
}
