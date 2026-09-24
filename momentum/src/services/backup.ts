import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getLocalDeviceDate } from '@/core/localDate';
import { parseBackup, type BackupError, type BackupFile, type BackupTables } from '@/data/backup/backupFormat';
import { LATEST_SCHEMA_VERSION, type TableName } from '@/data/db/schema';
import { inTransaction, repositories } from '@/data/repositories';
import { isAutoBackupDue } from '@/domain/autoBackup';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';

export async function buildBackup(): Promise<BackupFile> {
  return {
    app: 'momentum',
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    // Rows come straight from SQLite, so they already match the backup shape.
    tables: (await repositories.backup.exportAll()) as BackupTables,
  };
}

function writeJson(file: File, backup: BackupFile): void {
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));
}

export type ExportResult = { kind: 'shared'; uri: string } | { kind: 'saved'; uri: string };

/** Writes a JSON export of every table and opens the system share sheet. */
export async function exportBackup(): Promise<ExportResult> {
  const file = new File(Paths.cache, `momentum-backup-${getLocalDeviceDate()}.json`);
  writeJson(file, await buildBackup());

  if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Momentum data',
      UTI: 'public.json',
    });
    return { kind: 'shared', uri: file.uri };
  }
  return { kind: 'saved', uri: file.uri };
}

/** Asks for a folder once (Android's folder picker); the weekly backup goes there. */
export async function chooseBackupFolder(): Promise<boolean> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    return false; // canceled
  }
  useDevicePrefsStore.getState().update({ backupFolderUri: folder.uri, lastAutoBackup: null, autoBackupFailed: false });
  await backUpToFolder();
  return true;
}

/** Writes today's backup into the chosen folder. */
export async function backUpToFolder(): Promise<void> {
  const prefs = useDevicePrefsStore.getState();
  if (!prefs.backupFolderUri) return;
  const today = getLocalDeviceDate();
  try {
    const file = new Directory(prefs.backupFolderUri).createFile(`momentum-backup-${today}.json`, 'application/json');
    file.write(JSON.stringify(await buildBackup(), null, 2));
    prefs.update({ lastAutoBackup: today, autoBackupFailed: false });
  } catch (error) {
    prefs.update({ autoBackupFailed: true });
    throw error;
  }
}

/** Called on app open: runs the weekly backup when it's due. Never throws. */
export async function runAutoBackupIfDue(): Promise<void> {
  const prefs = useDevicePrefsStore.getState();
  if (Platform.OS !== 'android' || !prefs.backupFolderUri) return;
  if (!isAutoBackupDue(prefs.lastAutoBackup, getLocalDeviceDate())) return;
  try {
    await backUpToFolder();
  } catch {
    // Shown in Settings via `autoBackupFailed`.
  }
}

export interface PendingImport {
  backup: BackupFile;
  counts: Record<TableName, number>;
}

export type PickImportResult =
  | { kind: 'ready'; pending: PendingImport }
  | { kind: 'canceled' }
  | { kind: 'invalid'; error: BackupError };

/** Lets the user choose a backup file and validates it without touching data. */
export async function pickBackupFile(): Promise<PickImportResult> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return { kind: 'canceled' };
  const parsed = parseBackup(await picked.result.text());
  return parsed.ok ? { kind: 'ready', pending: { backup: parsed.backup, counts: parsed.counts } } : { kind: 'invalid', error: parsed.error };
}

/**
 * Replaces all local data with the backup. The current data is first saved to
 * a safety file in the app's documents folder, and the swap is one
 * transaction: either everything is restored or nothing changes.
 */
export async function restoreBackup(pending: PendingImport): Promise<{ safetyCopyUri: string }> {
  const safetyCopy = new File(Paths.document, `momentum-before-restore-${Date.now()}.json`);
  writeJson(safetyCopy, await buildBackup());
  await inTransaction('backup.restore', (repos) => repos.backup.replaceAll(pending.backup.tables));
  return { safetyCopyUri: safetyCopy.uri };
}
