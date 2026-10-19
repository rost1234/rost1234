import { useEffect, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { unlock } from '@/services/appLock';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { useT } from '@/i18n';

/** Stays unlocked until the app goes to the background. */
let unlockedThisVisit = false;
/** Open screens close their reflections again when the app leaves the foreground. */
const relockers = new Set<() => void>();
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    unlockedThisVisit = false;
    relockers.forEach((relock) => relock());
  }
});

/** Shows reflections only while this visit is unlocked; leaving the app locks them again. */
function useUnlockedThisVisit(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(unlockedThisVisit);
  useEffect(() => {
    const relock = () => setOpen(false);
    relockers.add(relock);
    return () => {
      relockers.delete(relock);
    };
  }, []);
  return [open, setOpen];
}

/** For inline reflection text: whether it may be read now, and a way to ask for the fingerprint / PIN. Shares the unlock with `ReflectionLock`. */
export function useReflectionAccess(): { canRead: boolean; ask: () => Promise<boolean> } {
  const locked = useDevicePrefsStore((s) => s.lockReflections || !s.isHydrated);
  const [open, setOpen] = useUnlockedThisVisit();
  const ask = () =>
    unlock().then((ok) => {
      unlockedThisVisit = ok;
      setOpen(ok);
      return ok;
    });
  return { canRead: !locked || open, ask };
}

/** Asks for fingerprint / PIN before showing reflections, when the user turned the lock on. */
export function ReflectionLock({ children }: { children: ReactNode }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  // Until the preference is read, treat reflections as locked (never flash private text).
  const locked = useDevicePrefsStore((s) => s.lockReflections || !s.isHydrated);
  const hydrated = useDevicePrefsStore((s) => s.isHydrated);
  const [open, setOpen] = useUnlockedThisVisit();

  const tryUnlock = () =>
    runDetached(
      unlock().then((ok) => {
        unlockedThisVisit = ok;
        setOpen(ok);
      }),
    );

  useEffect(() => {
    if (locked && !unlockedThisVisit) tryUnlock();
    // Prompt once when the screen opens, and again when coming back to it from the background.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && locked && !unlockedThisVisit) tryUnlock();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (!locked || open) return <>{children}</>;
  if (!hydrated) return <View style={styles.center} />;
  return (
    <View style={styles.center}>
      <Ionicons name="lock-closed" size={40} color={colors.textMuted} />
      <Text style={typography.heading}>{t('lock.title')}</Text>
      <Text style={[typography.caption, styles.text]}>{t('lock.body')}</Text>
      <Button label={t('lock.unlock')} onPress={tryUnlock} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  text: { textAlign: 'center' },
}));
