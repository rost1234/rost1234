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
  active = false,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** When the short visible word needs more for a screen reader. */
  a11yLabel?: string;
  /** Highlighted (a focus session is running). */
  active?: boolean;
  onPress: () => void;
}) {
  const { colors, scenery } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, active && { backgroundColor: scenery.sun }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={23} color={active ? scenery.onSun : colors.text} />
      <Text style={[styles.itemLabel, active && { color: scenery.onSun }, active && styles.clock]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
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
 * Garden's floating dock: settings, the month, focus and the library, four equal buttons.
 * While a session runs, Focus turns sun-yellow and shows the time left.
 */
export function GardenDock() {
  const t = useT();
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
      {/* Focus is one quiet icon like the others; while a session runs it shows the time left. */}
      <DockButton
        icon={snapshot ? (snapshot.isPaused ? 'pause-outline' : 'timer') : 'timer-outline'}
        label={snapshot ? formatClock(snapshot.remainingSeconds) : t('home.focus')}
        a11yLabel={focusLabel}
        active={snapshot !== null}
        onPress={() => {
          haptics.select();
          router.push('/focus');
        }}
      />
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
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.16,
    elevation: 8,
  },
  item: { minWidth: 64, height: 58, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: radius.lg },
  itemLabel: { fontSize: 11, color: colors.textMuted },
  clock: { fontVariant: ['tabular-nums'] },
}));
