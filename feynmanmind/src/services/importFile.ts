import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

/** Lets the user pick a lessons file (.json or .txt) and returns its name and text, or null if cancelled. */
export async function pickLessonsFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return { name: asset.name, text };
}
