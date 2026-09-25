import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SkeletonBlock } from '@/components/Skeleton';
import { Button, Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate, getLocalDeviceDate, parseLocalDate, addDays } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { buildWeeklySummary, previousWeek, type WeeklySummary } from '@/domain/weekly';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

async function loadSummary(): Promise<WeeklySummary> {
  const week = previousWeek(getLocalDeviceDate());
  const startIso = new Date(parseLocalDate(week.start).setHours(0, 0, 0, 0)).toISOString();
  const endIso = new Date(parseLocalDate(addDays(week.end, 1)).setHours(0, 0, 0, 0)).toISOString();
  const [habits, logs, sessions] = await Promise.all([
    repositories.habits.getAll(),
    repositories.habitLogs.getInRange(week.start, week.end),
    repositories.focusSessions.getInRange(startIso, endIso),
  ]);
  return buildWeeklySummary(habits, logs, sessions, week);
}

/** A 30-second look back at last week: what worked, one thing to adjust. */
export function WeeklyScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    loadSummary().then(setSummary, () => router.back());
  }, []);

  if (!summary) {
    return (
      <View style={styles.content}>
        <SkeletonBlock height={80} />
        <SkeletonBlock height={120} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
      <Text style={typography.caption}>
        {formatFriendlyDate(summary.start, t.locale)} – {formatFriendlyDate(summary.end, t.locale)}
      </Text>
      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <Text style={styles.big}>{summary.totalCompleted}</Text>
          <Text style={typography.caption}>{t('weekly.checkoffs')}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.big}>{summary.perfectDays}</Text>
          <Text style={typography.caption}>{t('weekly.perfectDays')}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.big}>{summary.focusMinutes}</Text>
          <Text style={typography.caption}>{t('weekly.focusMin')}</Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <Text style={typography.overline}>{t('weekly.wins')}</Text>
        {summary.wins.length === 0 ? <Text style={typography.body}>{t('weekly.noWins')}</Text> : null}
        {summary.wins.map((w) => (
          <View key={w.habitId} style={styles.row}>
            <Ionicons name="trophy" size={18} color={colors.warning} />
            <Text style={[typography.body, { flex: 1 }]}>{w.title}</Text>
            <Text style={typography.label}>
              {w.completed}/{w.scheduled}
            </Text>
          </View>
        ))}
      </Card>

      {summary.toImprove ? (
        <Card style={styles.section}>
          <Text style={typography.overline}>{t('weekly.adjust')}</Text>
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={18} color={colors.primary} />
            <Text style={[typography.body, { flex: 1 }]}>
              {t('weekly.adjustBody', {
                title: summary.toImprove.title,
                done: summary.toImprove.completed,
                scheduled: summary.toImprove.scheduled,
              })}
            </Text>
          </View>
        </Card>
      ) : null}

      <Button label={t('weekly.close')} onPress={() => router.back()} />
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  big: { fontSize: 28, fontWeight: '800', color: colors.text },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
