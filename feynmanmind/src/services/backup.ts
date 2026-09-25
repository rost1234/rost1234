import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dayKey, fromBackup, toBackup } from '@/local/logic';
import { getDB } from '@/local/store';
import type { LocalDB } from '@/local/types';

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
