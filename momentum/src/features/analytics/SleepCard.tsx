import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { addDays, formatShortDate, lastNDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { DailyReflection } from '@/domain/models';
import { SHORT_SLEEP_HOURS, sleepSummary } from '@/domain/motivation';
import { useT } from '@/i18n';
import { useReflectionStore } from '@/state/reflectionStore';

const NIGHTS = 14;
const MAX_BAR_HOURS = 10;

const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

/** Sleep from the evening reflection: the last two weeks, and mood after short vs. enough sleep. */
export function SleepCard({ today }: { today: LocalDateString }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const [reflections, setReflections] = useState<DailyReflection[] | null>(null);
  // Reload when a reflection is saved while Insights is open.
  const savedReflections = useReflectionStore((s) => s.byDate);

  useEffect(() => {
    runDetached(
      repositories.reflections
        .getInRange(addDays(today, -59), today)
        .catch(() => [])
        .then(setReflections),
    );
  }, [today, savedReflections]);

  if (!reflections) return null;
  // The comparison uses the last 60 days; the average matches the 14 nights shown.
  const summary = sleepSummary(reflections);
  const days = lastNDays(today, NIGHTS);
  const shown = sleepSummary(reflections.filter((r) => r.logDate >= (days[0] ?? today)));
  if (summary.nights === 0) return null;
  const byDate = new Map(reflections.map((r) => [r.logDate, r.sleepMinutes]));

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={typography.label}>{t('sleep.title')}</Text>
        {shown.averageMinutes !== null ? (
          <Text style={styles.value}>{t('sleep.avg', { hours: hours(shown.averageMinutes) })}</Text>
        ) : null}
      </View>
      <View
        style={styles.bars}
        accessible
        accessibilityLabel={[
          t('sleep.barsA11y', { nights: NIGHTS }),
          ...days.flatMap((date) => {
            const minutes = byDate.get(date);
            return minutes ? [t('sleep.nightA11y', { date: formatShortDate(date), hours: hours(minutes) })] : [];
          }),
        ].join('. ')}
      >
        {days.map((date) => {
          const minutes = byDate.get(date) ?? null;
          const short = minutes !== null && minutes < SHORT_SLEEP_HOURS * 60;
          return (
            <View key={date} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: minutes ? `${Math.min(100, (minutes / 60 / MAX_BAR_HOURS) * 100)}%` : 3,
                    backgroundColor: minutes ? (short ? colors.warning : colors.primary) : colors.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {summary.moodAfterShort !== null && summary.moodAfterEnough !== null ? (
        <Text style={typography.caption}>
          {t('sleep.mood', {
            short: summary.moodAfterShort.toFixed(1),
            enough: summary.moodAfterEnough.toFixed(1),
            hours: SHORT_SLEEP_HOURS,
          })}
        </Text>
      ) : (
        <Text style={typography.caption}>{t('sleep.more')}</Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 3 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 3 },
}));
