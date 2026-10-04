import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import rawInsights from '@/content/insights.json';
import type { Insight } from '@/content/insightSchema';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, localDateFromIso, parseLocalDate, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { contextTriggers, pickInsight, type InsightTriggerId } from '@/domain/insightPicker';
import { hasCompletionBefore } from '@/domain/streaks';
import { useT } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';
import { useSettingsStore } from '@/state/settingsStore';
import { FreshStartCard, useFreshStart } from './FreshStartCard';

/** Validated by src/content/__tests__/insights.test.ts. */
export const INSIGHTS = rawInsights as unknown as Insight[];

function useActiveTriggers(today: LocalDateString): InsightTriggerId[] {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const streaks = useHabitStore((s) => s.streaks);
  const perfectWeek = useHabitStore((s) => s.lastFreezeAwarded);
  const triggers: InsightTriggerId[] = [];
  if (habits.some((h) => localDateFromIso(h.createdAt) >= addDays(today, -3))) triggers.push('new_habit');
  if (perfectWeek) triggers.push('perfect_week');
  const comeback = habits.some((h) => {
    if ((streaks[h.id] ?? 0) > 0) return false;
    const byDate = logs[h.id] ?? {};
    return hasCompletionBefore(new Map(Object.entries(byDate).map(([d, l]) => [d, l.status])), today);
  });
  if (comeback) triggers.push('streak_broken');
  return triggers;
}

/** What was shown before, plus triggers from recent reflections and focus sessions. Never throws. */
async function loadPickContext(today: LocalDateString): Promise<{ shown: Record<string, LocalDateString>; context: InsightTriggerId[] }> {
  const yesterday = addDays(today, -1);
  const since = new Date(parseLocalDate(yesterday).setHours(0, 0, 0, 0)).toISOString();
  const until = new Date(parseLocalDate(addDays(today, 1)).setHours(0, 0, 0, 0)).toISOString();
  const [shown, reflections, sessions] = await Promise.all([
    repositories.shownInsights.getAll().catch(() => ({})),
    repositories.reflections.getInRange(yesterday, today).catch(() => []),
    repositories.focusSessions.getInRange(since, until).catch(() => []),
  ]);
  return { shown, context: contextTriggers(reflections, sessions, today) };
}

/** "One insight a day": research-backed, sourced, and one small action. */
export function InsightCard({ today }: { today: LocalDateString }) {
  const t = useT();
  const goal = useSettingsStore((s) => s.settings?.goal ?? null);
  const habitTriggers = useActiveTriggers(today);
  // The first pick of the day is saved and kept all day, so wait until everything about *this*
  // day is in: the recent context, and the habit store reloaded for it (after midnight it lags).
  const [loaded, setLoaded] = useState<{ date: LocalDateString; shown: Record<string, LocalDateString>; context: InsightTriggerId[] } | null>(null);
  const habitsReady = useHabitStore((s) => s.today === today && s.status === 'ready');
  // On a fresh-start day with a habit to invite back, that card takes this slot.
  const freshStart = useFreshStart(today);

  useEffect(() => {
    let current = true;
    runDetached(
      loadPickContext(today).then((result) => {
        if (current) setLoaded({ date: today, ...result });
      }),
    );
    return () => {
      current = false;
    };
  }, [today]);

  const ready = habitsReady && loaded?.date === today && !freshStart;
  const insight = ready && loaded ? pickInsight(INSIGHTS, today, goal, [...habitTriggers, ...loaded.context], loaded.shown) : null;
  const shown = ready && loaded ? loaded.shown : null;

  useEffect(() => {
    if (insight && shown && shown[insight.id] !== today) {
      runDetached(repositories.shownInsights.markShown(insight.id, today));
    }
  }, [insight, shown, today]);

  if (freshStart && habitsReady) return <FreshStartCard {...freshStart} />;
  if (!insight) return null;
  return <InsightView insight={insight} title={t('insight.title')} />;
}

/** One insight card: finding (and stat) up front; action and caveat on tap; source behind its own button. */
export function InsightView({ insight, title, defaultOpen = false }: { insight: Insight; title: string; defaultOpen?: boolean }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(defaultOpen);
  const [sourceOpen, setSourceOpen] = useState(false);
  const he = t.language === 'he';
  const finding = he ? insight.he.finding : insight.finding;
  const action = he ? insight.he.action : insight.action;
  const statLabel = he ? insight.he.statLabel : insight.stat?.label;
  const caveat = he ? insight.he.caveat : insight.caveat;

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={colors.accent} />
        <Text style={[typography.overline, { flex: 1, color: colors.accent }]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {insight.stat ? (
        <View style={styles.statRow}>
          <Text style={styles.stat}>{insight.stat.value}</Text>
          <Text style={[typography.caption, { flex: 1 }]}>{statLabel}</Text>
        </View>
      ) : null}
      <Text style={typography.body}>{finding}</Text>
      {open ? (
        <View style={styles.more}>
          <View style={styles.actionRow}>
            <Ionicons name="arrow-forward-circle" size={18} color={colors.primary} />
            <Text style={[typography.label, { flex: 1 }]}>{action}</Text>
          </View>
          {caveat ? <Text style={typography.caption}>{t('insight.caveat', { caveat })}</Text> : null}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: sourceOpen }}
        accessibilityLabel={sourceOpen ? t('insight.hideSource') : t('insight.source')}
        onPress={() => setSourceOpen((v) => !v)}
        hitSlop={8}
        style={({ pressed }) => [styles.sourceToggle, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name={sourceOpen ? 'close' : 'information-circle-outline'} size={14} color={colors.textMuted} />
        <Text style={styles.sourceToggleLabel}>{sourceOpen ? t('insight.hideSource') : t('insight.source')}</Text>
      </Pressable>
      {sourceOpen ? (
        <View style={styles.sourceBox}>
          <Pressable accessibilityRole="link" onPress={() => runDetached(Linking.openURL(insight.source.url))} hitSlop={6}>
            <Text style={[typography.caption, styles.source]}>
              {insight.source.authors} ({insight.source.year}) · {insight.source.venue ?? insight.source.title}
              {insight.source.institution ? ` · ${insight.source.institution}` : ''}
            </Text>
          </Pressable>
          <Text style={typography.caption}>{t(`insight.evidence.${insight.evidence}`)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.md, ...shadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stat: { fontSize: 30, fontWeight: '800', color: colors.accent },
  more: { gap: spacing.sm, marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  source: { textDecorationLine: 'underline' },
  sourceToggle: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  sourceToggleLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  sourceBox: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
}));
