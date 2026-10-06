import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { Card, SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DailyReflection, Habit, UrgeLog, UrgeTrigger } from '@/domain/models';
import { SHORT_SLEEP_HOURS } from '@/domain/motivation';
import { PARTS_OF_DAY, quitSavings, savedTime, TRIGGER_MAP_MIN, triggerMap, type PartOfDay } from '@/domain/urges';
import { useHabitStore } from '@/state/habitStore';
import { useT, type TranslationKey } from '@/i18n';

/** How far back the urge log and sleep are read. */
const WINDOW_DAYS = 90;

const PART_KEYS: Record<PartOfDay, TranslationKey> = {
  morning: 'quitIns.morning',
  afternoon: 'quitIns.afternoon',
  evening: 'quitIns.evening',
  night: 'quitIns.night',
};

const TRIGGER_KEYS: Record<UrgeTrigger, TranslationKey> = {
  tired: 'urge.tr.tired',
  stress: 'urge.tr.stress',
  bored: 'urge.tr.bored',
  meal: 'urge.tr.meal',
  people: 'urge.tr.people',
  other: 'urge.tr.other',
};

function Stat({ value, label, tone, a11y }: { value: string; label: string; tone: 'success' | 'primary'; a11y?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.stat, { backgroundColor: tone === 'success' ? colors.successSoft : colors.primarySoft }]} accessible accessibilityLabel={a11y ?? `${value} ${label}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuitHabitCard({ habit, urges, reflections }: { habit: Habit; urges: UrgeLog[]; reflections: DailyReflection[] }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const cleanDays = useHabitStore(
    (s) => (s.completedBefore[habit.id] ?? 0) + (s.today && s.logs[habit.id]?.[s.today]?.status === 'completed' ? 1 : 0),
  );
  const savings = quitSavings(cleanDays, habit.quitCost, habit.quitMinutes);
  const mine = urges.filter((u) => u.habitId === habit.id);
  const map = triggerMap(mine, reflections);
  if (!savings && mine.length === 0) return null;

  const maxPart = Math.max(1, ...PARTS_OF_DAY.map((p) => map.byPart[p]));
  const topPart = PARTS_OF_DAY.reduce((best, p) => (map.byPart[p] > map.byPart[best] ? p : best), 'morning' as PartOfDay);
  const time = savings?.minutes != null ? savedTime(savings.minutes) : null;

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{habit.title}</Text>
      <View style={styles.stats}>
        {savings?.money != null ? <Stat value={t('quit.money', { amount: savings.money.toLocaleString(t.locale) })} label={t('quitIns.saved')} tone="success" /> : null}
        {time ? (
          <Stat
            value={t.plural(time.unit === 'hours' ? 'quitIns.hoursShort' : 'quitIns.minutesShort', time.value)}
            label={t('quitIns.timeBack')}
            tone="success"
          />
        ) : null}
        {mine.length > 0 ? <Stat value={`${map.passed}/${map.total}`} label={t('quitIns.passed')} tone="primary" a11y={t('quitIns.passedA11y', { passed: map.passed, total: map.total })} /> : null}
      </View>

      {mine.length === 0 ? null : map.total < TRIGGER_MAP_MIN ? (
        <Text style={typography.caption}>{t.plural('quitIns.more', TRIGGER_MAP_MIN - map.total)}</Text>
      ) : (
        <>
          <View style={styles.divider} />
          <Text style={typography.label}>{t('quitIns.when')}</Text>
          <View
            style={styles.bars}
            accessible
            accessibilityLabel={PARTS_OF_DAY.map((p) => t('quitIns.partA11y', { part: t(PART_KEYS[p]), count: map.byPart[p] })).join('. ')}
          >
            {PARTS_OF_DAY.map((p) => (
              <View key={p} style={styles.barRow}>
                <Text style={[styles.barLabel, p === topPart && styles.barLabelTop]}>{t(PART_KEYS[p])}</Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${(map.byPart[p] / maxPart) * 100}%`, backgroundColor: p === topPart ? colors.primary : colors.primarySoft },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{map.byPart[p]}</Text>
              </View>
            ))}
          </View>
          {map.triggers.length > 0 ? (
            <>
              <Text style={typography.label}>{t('quitIns.what')}</Text>
              <View style={styles.tags}>
                {map.triggers.slice(0, 3).map(({ trigger, count }, index) => (
                  <View key={trigger} style={[styles.tag, index === 0 && styles.tagTop]}>
                    <Text style={[styles.tagText, index === 0 && styles.tagTextTop]}>{`${t(TRIGGER_KEYS[trigger])} · ${count}`}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {map.sleep ? (
            <Text style={typography.body}>
              {t('quitIns.sleep', { hours: SHORT_SLEEP_HOURS, short: map.sleep.short.toFixed(1), enough: map.sleep.enough.toFixed(1) })}
            </Text>
          ) : null}
          <Text style={typography.caption}>{t('quitIns.disclaimer')}</Text>
        </>
      )}
    </Card>
  );
}

/** Habits to quit: what was saved, how many urges passed, and when urges come (after 10 logged). */
export function QuitSection({ today }: { today: LocalDateString }) {
  const t = useT();
  const allHabits = useHabitStore((s) => s.habits);
  const habits = allHabits.filter((h) => h.isQuit && !h.isArchived);
  const hasQuit = habits.length > 0;
  const [data, setData] = useState<{ urges: UrgeLog[]; reflections: DailyReflection[] } | null>(null);

  useEffect(() => {
    if (!hasQuit) return;
    const start = addDays(today, -(WINDOW_DAYS - 1));
    runDetached(
      Promise.all([
        repositories.urges.getInRange(start, today).catch(() => []),
        repositories.reflections.getInRange(start, today).catch(() => []),
      ]).then(([urges, reflections]) => setData({ urges, reflections })),
    );
  }, [today, hasQuit]);

  if (!hasQuit || !data) return null;
  const cards = habits.map((habit) => <QuitHabitCard key={habit.id} habit={habit} urges={data.urges} reflections={data.reflections} />);
  return (
    <>
      <SectionTitle>{t('quitIns.title')}</SectionTitle>
      {cards}
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: radius.md, padding: spacing.sm + 2, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  bars: { gap: spacing.xs + 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 84, fontSize: 13, color: colors.textMuted },
  barLabelTop: { color: colors.text, fontWeight: '700' },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
  barCount: { width: 22, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  tagTop: { backgroundColor: colors.primarySoft },
  tagText: { fontSize: 13, color: colors.text },
  tagTextTop: { fontWeight: '700', color: colors.primary },
}));
