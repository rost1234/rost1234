import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SkeletonBlock } from '@/components/Skeleton';
import { Button, Card } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate, getLocalDeviceDate, parseLocalDate, addDays, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { pickInsight } from '@/domain/insightPicker';
import { buildWeeklySummary, previousWeek, type WeeklySummary } from '@/domain/weekly';
import { INSIGHTS } from '@/content/insights';
import { InsightView } from '@/features/insights/InsightCard';
import { useSettingsStore } from '@/state/settingsStore';
import { useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';
import { Sprout } from '@/features/garden/Sprout';
import { stageKey, useGardenGrowth } from '@/features/garden/useGarden';
import { useGardenStore } from '@/state/gardenStore';

/** Garden look: the week opens with a short postcard from the sprout, then the numbers. */
function Postcard({ wateredDays }: { wateredDays: number }) {
  const t = useT();
  const { colors, scenery } = useTheme();
  const styles = useStyles();
  const growth = useGardenGrowth();
  const name = useGardenStore((s) => s.name);
  const stage = t(stageKey(growth.stage));
  const text = wateredDays > 0 ? t.plural('weekly.postcard', wateredDays) : t('weekly.postcardQuiet');
  return (
    <View style={[styles.postcard, { backgroundColor: scenery.hill, borderColor: colors.surface }]} accessible accessibilityLabel={`${text} ${name ? `${name}, ` : ''}${stage}`}>
      <Sprout stage={growth.stage} mood="happy" size={72} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.postcardText}>{text}</Text>
        <Text style={styles.postcardSign}>{name ? `${name} · ${stage}` : stage}</Text>
      </View>
    </View>
  );
}

interface WeeklyData {
  summary: WeeklySummary;
  shown: Record<string, LocalDateString>;
  /** Every habit completion up to the end of the week, all history. */
  pathTotal: number;
  /** Days of the week with at least one habit done (the sprout's postcard). */
  wateredDays: number;
}

async function loadSummary(): Promise<WeeklyData> {
  const week = previousWeek(getLocalDeviceDate());
  const startIso = new Date(parseLocalDate(week.start).setHours(0, 0, 0, 0)).toISOString();
  const endIso = new Date(parseLocalDate(addDays(week.end, 1)).setHours(0, 0, 0, 0)).toISOString();
  const [habits, logs, sessions, shown, totals] = await Promise.all([
    repositories.habits.getAll(),
    repositories.habitLogs.getInRange(week.start, week.end),
    repositories.focusSessions.getInRange(startIso, endIso),
    repositories.shownInsights.getAll().catch(() => ({})),
    repositories.habitLogs.countCompletedBefore(addDays(week.end, 1)).catch((): Record<string, number> => ({})),
  ]);
  const pathTotal = Object.values(totals).reduce((sum, n) => sum + n, 0);
  const wateredDays = new Set(logs.filter((l) => l.status === 'completed').map((l) => l.logDate)).size;
  return { summary: buildWeeklySummary(habits, logs, sessions, week), shown, pathTotal, wateredDays };
}

/** A 30-second look back at last week: what worked, one thing to adjust. */
export function WeeklyScreen() {
  const t = useT();
  const { colors, typography, look } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const goal = useSettingsStore((s) => s.settings?.goal ?? null);
  const [data, setData] = useState<WeeklyData | null>(null);

  useEffect(() => {
    loadSummary().then(setData, () => router.back());
  }, []);

  if (!data) {
    return (
      <View style={styles.content}>
        <SkeletonBlock height={80} />
        <SkeletonBlock height={120} />
      </View>
    );
  }

  const { summary } = data;
  // Seeded by the week, not the day, and not recorded as shown: it doesn't touch the daily card.
  // Cards told on the week's first day (the daily one, any moment's) are left out, or one would just repeat.
  const shownBefore = Object.fromEntries(Object.entries(data.shown).filter(([, date]) => date !== summary.start));
  const repeats = new Set(Object.entries(data.shown).filter(([, date]) => date === summary.start).map(([id]) => id));
  const insight = pickInsight(
    INSIGHTS.filter((i) => !repeats.has(i.id)),
    summary.start,
    goal,
    [],
    shownBefore,
  );

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
      {look === 'garden' ? <Postcard wateredDays={data.wateredDays} /> : null}
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

      {data.pathTotal > 0 ? (
        <Card style={styles.section}>
          <Text style={typography.overline}>{t('path.title')}</Text>
          <View style={styles.row}>
            <Ionicons name="trail-sign-outline" size={18} color={colors.success} />
            <Text style={[typography.body, { flex: 1 }]}>
              {t.plural('path.total', data.pathTotal)}
              {summary.totalCompleted > 0 ? ` ${t('path.pace', { week: summary.totalCompleted, year: summary.totalCompleted * 52 })}` : ''}
            </Text>
          </View>
          <Text style={typography.caption}>{t('path.lead')}</Text>
        </Card>
      ) : null}

      {summary.toImprove ? (
        <Card style={styles.section}>
          <Text style={typography.overline}>{t('weekly.adjust')}</Text>
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={18} color={colors.primary} />
            <Text style={[typography.body, { flex: 1 }]}>
              {t('weekly.adjustBody', { title: summary.toImprove.title })}
            </Text>
          </View>
        </Card>
      ) : null}

      {insight ? <InsightView insight={insight} title={t('weekly.insight')} /> : null}

      <Button label={t('weekly.close')} onPress={() => router.back()} />
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  postcard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 22, borderWidth: 3 },
  postcardText: { fontSize: 16, lineHeight: 23, color: colors.text },
  postcardSign: { fontSize: 13, color: colors.textMuted },
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  big: { fontSize: 28, fontWeight: '800', color: colors.text },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
