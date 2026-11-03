import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dayKey, fromBackup, toBackup } from '@/local/logic';
import { getDB } from '@/local/store';
import type { LocalDB } from '@/local/types';
import { recordError } from '@/services/errorLog';
import { usePrefsStore } from '@/state/prefsStore';

/**
 * The library lives only on this device, so a backup file is the way to keep
 * it safe or move it to another device.
 */
export async function exportBackup(): Promise<void> {
  const now = new Date();
  const name = `feynmanmind-backup-${dayKey(now)}.json`;
  const text = toBackup(getDB(), now);

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: name });
  usePrefsStore.getState().set({ lastBackupAt: now.toISOString() });
}

/** Automatic backups write into a folder the learner picks once (Android's folder picker; it survives uninstalling). */
export const autoBackupSupported = Platform.OS === 'android';
/** A backup is due after this many days. */
export const AUTO_BACKUP_DAYS = 7;
/** How many backup files to keep in the folder (oldest are removed). */
const KEEP_BACKUPS = 5;
const BACKUP_NAME = /^feynmanmind-backup-.*\.json$/;

/** Days since the last backup, or null if there never was one. */
export function daysSinceBackup(lastBackupAt: string, now: Date): number | null {
  if (!lastBackupAt) return null;
  return Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / 86_400_000);
}

/** Opens the folder picker; returns the folder's address, or null if cancelled. */
export async function pickBackupFolder(): Promise<string | null> {
  try {
    return (await Directory.pickDirectoryAsync()).uri;
  } catch {
    return null;
  }
}

/** Writes today's backup into the folder (replacing today's file) and keeps only the newest few. */
export function writeBackupToFolder(uri: string, now = new Date()): void {
  const dir = new Directory(uri);
  const name = `feynmanmind-backup-${dayKey(now)}.json`;
  for (const item of dir.list()) if (item instanceof File && item.name === name) item.delete();
  const file = dir.createFile(name, 'application/json');
  file.write(toBackup(getDB(), now));
  const backups = dir
    .list()
    .filter((item): item is File => item instanceof File && BACKUP_NAME.test(item.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const old of backups.slice(0, Math.max(0, backups.length - KEEP_BACKUPS))) old.delete();
  usePrefsStore.getState().set({ lastBackupAt: now.toISOString() });
}

/** Backs up into the chosen folder if a week has passed (or `force`). Never throws; failures go to the error log. */
export function autoBackupIfDue(force = false): boolean {
  const { backupDirUri, lastBackupAt } = usePrefsStore.getState();
  if (!autoBackupSupported || !backupDirUri) return false;
  const days = daysSinceBackup(lastBackupAt, new Date());
  if (!force && days !== null && days < AUTO_BACKUP_DAYS) return false;
  try {
    writeBackupToFolder(backupDirUri);
    return true;
  } catch (e) {
    recordError('backup', e);
    return false;
  }
}

/** Lets the user pick a backup file and returns its contents, or null if cancelled. Throws if invalid. */
export async function pickBackup(): Promise<LocalDB | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return fromBackup(text);
}
