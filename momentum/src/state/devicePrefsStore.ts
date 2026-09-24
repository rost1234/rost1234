import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { runDetached } from '@/core/errors';
import { isLocalDateString, type LocalDateString } from '@/core/localDate';

const KEY = 'momentum.device.v1';

/**
 * Settings that belong to this phone, not to the habit data (so they are not
 * part of backups): the auto-backup folder and the reflection lock.
 */
interface DevicePrefs {
  /** SAF folder the weekly backup is written to; null = off. */
  backupFolderUri: string | null;
  lastAutoBackup: LocalDateString | null;
  /** Last automatic backup failed (e.g. the folder was deleted). */
  autoBackupFailed: boolean;
  lockReflections: boolean;
}

interface DevicePrefsState extends DevicePrefs {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  update: (changes: Partial<DevicePrefs>) => void;
}

const DEFAULTS: DevicePrefs = { backupFolderUri: null, lastAutoBackup: null, autoBackupFailed: false, lockReflections: false };

function parse(raw: string | null): DevicePrefs {
  if (!raw) return DEFAULTS;
  const data = JSON.parse(raw) as Record<string, unknown>;
  return {
    backupFolderUri: typeof data.backupFolderUri === 'string' ? data.backupFolderUri : null,
    lastAutoBackup: typeof data.lastAutoBackup === 'string' && isLocalDateString(data.lastAutoBackup) ? data.lastAutoBackup : null,
    autoBackupFailed: data.autoBackupFailed === true,
    lockReflections: data.lockReflections === true,
  };
}

export const useDevicePrefsStore = create<DevicePrefsState>((set, get) => ({
  ...DEFAULTS,
  isHydrated: false,

  hydrate: async () => {
    try {
      set(parse(await AsyncStorage.getItem(KEY)));
    } catch {
      // Defaults are fine.
    } finally {
      set({ isHydrated: true });
    }
  },

  update: (changes) => {
    set(changes);
    const { backupFolderUri, lastAutoBackup, autoBackupFailed, lockReflections } = get();
    runDetached(AsyncStorage.setItem(KEY, JSON.stringify({ backupFolderUri, lastAutoBackup, autoBackupFailed, lockReflections })));
  },
}));
