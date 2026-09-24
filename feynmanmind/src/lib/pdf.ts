import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export interface PickedPdf {
  name: string;
  size: number;
  base64: string;
}

export class PdfTooLargeError extends Error {}

/** Opens the system picker for one PDF and returns it base64-encoded, or null if cancelled. */
export async function pickPdf(): Promise<PickedPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if ((asset.size ?? 0) > MAX_PDF_BYTES) throw new PdfTooLargeError();

  const base64 =
    Platform.OS === 'web' && asset.file ? await blobToBase64(asset.file) : await new File(asset.uri).base64();
  const size = asset.size ?? Math.floor((base64.length * 3) / 4);
  if (size > MAX_PDF_BYTES) throw new PdfTooLargeError();
  return { name: asset.name, size, base64 };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    // Result is "data:application/pdf;base64,<data>"
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}
