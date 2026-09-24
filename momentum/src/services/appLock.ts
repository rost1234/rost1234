import * as LocalAuthentication from 'expo-local-authentication';
import { t } from '@/i18n';

/** True when the phone has a fingerprint/face or at least a PIN/pattern to check. */
export async function canLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) >= LocalAuthentication.SecurityLevel.SECRET;
  } catch {
    return false;
  }
}

/** Asks for fingerprint / face, falling back to the device PIN. */
export async function unlock(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('lock.prompt'),
      cancelLabel: t('common.cancel'),
    });
    return result.success;
  } catch {
    return false;
  }
}
