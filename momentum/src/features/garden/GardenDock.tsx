import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { computeSnapshot, formatClock } from '@/domain/focusTimer';
import { useNow } from '@/hooks/useNow';
import { useFocusStore } from '@/state/focusStore';
import { useT } from '@/i18n';


function DockButton({
  icon,
  label,
  a11yLabel,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** When the short visible word needs more for a screen reader. */
  a11yLabel?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={23} color={colors.text} />
      <Text style={styles.itemLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** True while the on-screen keyboard is up (the dock would ride up with it and cover the field). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/**
 * Garden's floating dock: settings, the month, a big sun-yellow Focus button, and the library.
 * While a session runs, Focus shows the time left and reopens it.
 */
export function GardenDock() {
  const t = useT();
  const { scenery } = useTheme();
  const styles = useStyles();
  const bottomInset = useSafeAreaInsets().bottom;
  const timer = useFocusStore((s) => s.timer);
  const running = timer !== null && timer.pausedAt === null;
  const now = useNow(running, 1000);
  const snapshot = timer ? computeSnapshot(timer, now) : null;
  const keyboardOpen = useKeyboardOpen();
  const focusLabel = snapshot
    ? snapshot.isPaused
      ? t('home.focusPaused')
      : t('home.focusLeft', { time: formatClock(snapshot.remainingSeconds) })
    : t('home.focus');

  if (keyboardOpen) return null;
  return (
    <View style={[styles.dock, { bottom: bottomInset + spacing.md }]}>
      <DockButton icon="settings-outline" label={t('garden.dockSettings')} onPress={() => router.push('/settings')} />
      <DockButton icon="calendar-outline" label={t('garden.dockMonth')} a11yLabel={t('cal.title')} onPress={() => router.push('/calendar')} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={focusLabel}
        onPress={() => {
          haptics.select();
          router.push('/focus');
        }}
        style={({ pressed }) => [styles.focus, { backgroundColor: scenery.sun }, pressed && { opacity: 0.88 }]}
      >
        <Ionicons name={snapshot ? (snapshot.isPaused ? 'pause' : 'timer-outline') : 'play'} size={20} color={scenery.onSun} />
        {/* While a session runs the button shows just the time; the full words are in the label. */}
        <Text style={[styles.focusLabel, { color: scenery.onSun }, snapshot && styles.clock]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {snapshot ? formatClock(snapshot.remainingSeconds) : focusLabel}
        </Text>
      </Pressable>
      <DockButton icon="library-outline" label={t('garden.dockLibrary')} onPress={() => router.push('/library')} />
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  dock: {
    position: 'absolute',
    start: spacing.md,
    end: spacing.md,
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.16,
    elevation: 8,
  },
  item: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: radius.lg },
  itemLabel: { fontSize: 11, color: colors.textMuted },
  focus: {
    flex: 1,
    height: 56,
    marginHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 28,
    paddingHorizontal: spacing.md,
  },
  focusLabel: { fontSize: 18, fontWeight: '800' },
  // Regular weight: Varela Round's digits are all the same width, so the time doesn't wobble.
  clock: { fontWeight: '400', fontVariant: ['tabular-nums'] },
}));
