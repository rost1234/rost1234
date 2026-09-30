import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useStudyStats } from '@/data/study';
import { ContinueCard } from '@/features/home/ContinueCard';
import { CoursesSection } from '@/features/home/CoursesSection';
import { LibrarySection } from '@/features/home/LibrarySection';
import { ReviewCalendar } from '@/features/home/ReviewCalendar';
import { TodaySection } from '@/features/home/TodaySection';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { greetingKey } from '@/lib/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type Mode = 'learn' | 'review';

/**
 * Home: a greeting with the settings button, then two clear modes —
 * "learn" (continue, learning paths, library) and "review" (due cards,
 * today's numbers, a calendar of reviews and upcoming cards).
 */
export default function HomeScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const stats = useStudyStats();
  const [mode, setMode] = useState<Mode>('learn');
  const due = stats.data?.due_now ?? 0;
  const streak = stats.data?.streak_days ?? 0;

  return (
    <Screen edges={['top']}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tabs.settings')}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.gear, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="settings-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.caption}>{new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={typography.title} accessibilityRole="header">
            {t(greetingKey())}
          </Text>
        </View>
        {streak > 0 ? (
          <View style={styles.streak} accessible accessibilityLabel={t.plural('today.streak', streak)}>
            <Ionicons name="flame" size={16} color={colors.accent} />
            <Text style={[typography.subheading, { color: colors.accent }]}>{streak}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.switch} accessibilityRole="tablist">
        <ModeButton icon="book" label={t('home.learn')} active={mode === 'learn'} onPress={() => setMode('learn')} />
        <ModeButton icon="repeat" label={t('home.review')} active={mode === 'review'} badge={due} onPress={() => setMode('review')} />
      </View>

      {mode === 'learn' ? (
        <>
          <ContinueCard />
          <CoursesSection />
          <LibrarySection />
        </>
      ) : stats.data && stats.data.total_cards === 0 ? (
        <EmptyState
          icon="albums-outline"
          title={t('home.noReviewsTitle')}
          body={t('home.noReviewsBody')}
          action={<Button label={t('home.goLearn')} icon="book-outline" onPress={() => setMode('learn')} />}
        />
      ) : (
        <TodaySection>
          <ReviewCalendar />
        </TodaySection>
      )}
    </Screen>
  );
}

function ModeButton({ icon, label, active, badge = 0, onPress }: { icon: 'book' | 'repeat'; label: string; active: boolean; badge?: number; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Ionicons name={active ? icon : (`${icon}-outline` as const)} size={18} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  switch: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md + 2, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentLabel: { fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 7, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
}));
