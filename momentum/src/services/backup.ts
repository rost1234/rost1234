import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getLocalDeviceDate } from '@/core/localDate';
import { repositories, type DatabaseSnapshot } from '@/data/repositories';
import { LATEST_SCHEMA_VERSION } from '@/data/db/schema';

export interface BackupFile {
  app: 'momentum';
  schemaVersion: number;
  exportedAt: string;
  tables: DatabaseSnapshot;
}

export async function buildBackup(): Promise<BackupFile> {
  return {
    app: 'momentum',
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables: await repositories.backup.exportAll(),
  };
}

export type ExportResult = { kind: 'shared'; uri: string } | { kind: 'saved'; uri: string };

/** Writes a JSON export of every table and opens the system share sheet. */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup();
  const file = new File(Paths.cache, `momentum-backup-${getLocalDeviceDate()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));

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
