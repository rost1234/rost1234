import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { unlock } from '@/services/appLock';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { useT } from '@/i18n';

/** Stays unlocked until the app goes to the background. */
let unlockedThisVisit = false;
AppState.addEventListener('change', (state) => {
  if (state === 'background') unlockedThisVisit = false;
});

/** Asks for fingerprint / PIN before showing reflections, when the user turned the lock on. */
export function ReflectionLock({ children }: { children: ReactNode }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  // Until the preference is read, treat reflections as locked (never flash private text).
  const locked = useDevicePrefsStore((s) => s.lockReflections || !s.isHydrated);
  const hydrated = useDevicePrefsStore((s) => s.isHydrated);
  const [open, setOpen] = useState(unlockedThisVisit);

  const tryUnlock = () =>
    runDetached(
      unlock().then((ok) => {
        unlockedThisVisit = ok;
        setOpen(ok);
      }),
    );

  useEffect(() => {
    if (locked && !unlockedThisVisit) tryUnlock();
    // Prompt once when the screen opens.
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
