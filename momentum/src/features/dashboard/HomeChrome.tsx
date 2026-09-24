import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { computeSnapshot } from '@/domain/focusTimer';
import { useNow } from '@/hooks/useNow';
import { useFocusStore } from '@/state/focusStore';
import { useT } from '@/i18n';

function IconButton({ icon, label, onPress }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={styles.icon}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

/** The two doors out of Home that aren't about today: settings and the research library. */
export function HomeTopBar() {
  const t = useT();
  const styles = useStyles();
  return (
    <View style={styles.bar}>
      <IconButton icon="settings-outline" label={t('home.settings')} onPress={() => router.push('/settings')} />
      <View style={{ flex: 1 }} />
      <IconButton icon="library-outline" label={t('home.library')} onPress={() => router.push('/library')} />
    </View>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Floating "▶ Focus" button; while a session runs it shows the time left and reopens it. */
export function FocusFab() {
  const t = useT();
  const styles = useStyles();
  const timer = useFocusStore((s) => s.timer);
  const running = timer !== null && timer.pausedAt === null;
  const now = useNow(running, 1000);
  const snapshot = timer ? computeSnapshot(timer, now) : null;
  const label = snapshot
    ? snapshot.isPaused
      ? t('home.focusPaused')
      : t('home.focusLeft', { time: formatClock(snapshot.remainingSeconds) })
    : t('home.focus');

  return (
    <View pointerEvents="box-none" style={styles.fabWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          haptics.select();
          router.push('/focus');
        }}
        style={({ pressed }) => [styles.fab, snapshot && styles.fabActive, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name={snapshot ? 'timer-outline' : 'play'} size={18} color={styles.fabText.color} />
        <Text style={styles.fabText} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    ...shadow,
    shadowOpacity: 0.25,
    elevation: 6,
  },
  fabActive: { backgroundColor: colors.primary },
  fabText: { color: colors.background, fontSize: 16, fontWeight: '700' },
}));
