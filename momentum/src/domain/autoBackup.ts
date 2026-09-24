import { addDays, type LocalDateString } from '@/core/localDate';

export const AUTO_BACKUP_INTERVAL_DAYS = 7;

/** A weekly backup is due when none was written yet, or the last one is 7+ days old. */
export function isAutoBackupDue(lastBackup: LocalDateString | null, today: LocalDateString): boolean {
  return lastBackup === null || addDays(lastBackup, AUTO_BACKUP_INTERVAL_DAYS) <= today;
}

/** Readable name for a SAF folder URI (".../tree/primary%3ADocuments%2FMomentum" → "Documents/Momentum"). */
export function folderLabel(uri: string): string {
  const tail = decodeURIComponent(uri.split('/tree/').pop() ?? uri);
  const path = tail.includes(':') ? tail.slice(tail.indexOf(':') + 1) : tail;
  return path.split('/document/')[0] || tail;
}
