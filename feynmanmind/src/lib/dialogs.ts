import { Alert, Platform } from 'react-native';

/**
 * Yes/no confirmation. React Native's Alert buttons don't work on web, so
 * web falls back to window.confirm.
 */
export function confirmAsync(opts: { title: string; message: string; confirmLabel: string; cancelLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${opts.title}\n\n${opts.message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
