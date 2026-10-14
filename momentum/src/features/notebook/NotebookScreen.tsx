import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { SheetHeader } from '@/components/SheetHeader';
import { Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { addDays, formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { INSIGHTS } from '@/content/insights';
import { INSIGHT_CATEGORIES } from '@/content/insightSchema';
import { Sprout } from '@/features/garden/Sprout';
import { useGardenGrowth } from '@/features/garden/useGarden';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useT, type Translator } from '@/i18n';
import { useNotebookStore } from '@/state/notebookStore';
import { CATEGORY_LABEL, NoteEntry } from './NoteEntry';
import { byDay, toldEntries, type NotebookEntry } from './notebookEntries';
import { useShownInsights } from './useShownInsights';

type Row = { kind: 'day'; date: LocalDateString } | { kind: 'entry'; entry: NotebookEntry };

export function dayTitle(date: LocalDateString, today: LocalDateString, t: Translator): string {
  if (date === today) return t('notebook.today');
  if (date === addDays(today, -1)) return t('notebook.yesterday');
  return formatFriendlyDate(date, t.locale);
}

/** The sprout speaks a line at the top of a notebook page (Garden); a plain caption otherwise. */
export function NotebookIntro({ text, garden }: { text: string; garden: boolean }) {
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const growth = useGardenGrowth();
  if (!garden) return <Text style={typography.caption}>{text}</Text>;
  return (
    <View style={styles.intro}>
      <Sprout stage={growth.stage} mood="happy" size={56} />
      <View style={[styles.introBubble, { backgroundColor: colors.surface }]}>
        <Text style={typography.body}>{text}</Text>
      </View>
    </View>
  );
}

/**
 * The sprout's notebook: every research card it told, newest first, with why and when, a star to
 * keep one, and the sources (they show only here). At the bottom, all the cards by topic, including
 * the ones it hasn't told yet. In the regular look it's the same list as plain cards.
 */
export function NotebookScreen() {
  const t = useT();
  const { look, colors, typography } = useTheme();
  const styles = useStyles();
  const garden = look === 'garden';
  const today = useLocalDate();
  const growth = useGardenGrowth();
  const bottomSpace = useBottomSpace();
  const notes = useNotebookStore((s) => s.notes);
  const saved = useNotebookStore((s) => s.saved);
  const { shown } = useShownInsights();
  const [filter, setFilter] = useState<'told' | 'saved'>('told');

  const told = shown ? toldEntries(INSIGHTS, shown, notes) : [];
  const visible = filter === 'saved' ? told.filter((e) => saved.includes(e.insight.id)) : told;
  const rows: Row[] = byDay(visible).flatMap((day) => [{ kind: 'day' as const, date: day.date }, ...day.entries.map((entry) => ({ kind: 'entry' as const, entry }))]);
  const savedCount = told.filter((e) => saved.includes(e.insight.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'day' ? `day:${row.date}` : row.entry.insight.id)}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
        ListHeaderComponent={
          <View style={styles.head}>
            <SheetHeader title={t(garden ? 'notebook.title' : 'notebook.titleCalm')} />
            <NotebookIntro garden={garden} text={t(garden ? 'notebook.intro' : 'notebook.introCalm', { told: told.length, total: INSIGHTS.length })} />
            <View style={styles.chips}>
              <Chip label={t(garden ? 'notebook.told' : 'notebook.toldCalm')} selected={filter === 'told'} onPress={() => setFilter('told')} />
              <Chip label={t('notebook.saved', { count: savedCount })} selected={filter === 'saved'} onPress={() => setFilter('saved')} />
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <Text style={[typography.caption, styles.day]} accessibilityRole="header">
              {dayTitle(item.date, today, t)}
            </Text>
          ) : (
            <NoteEntry entry={item.entry} garden={garden} stage={growth.stage} />
          )
        }
        ListEmptyComponent={
          shown ? (
            <Text style={[typography.body, styles.empty]}>
              {filter === 'saved' ? t('notebook.emptySaved') : t(garden ? 'notebook.empty' : 'notebook.emptyCalm')}
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={[styles.topics, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={typography.label} accessibilityRole="header">
              {t('notebook.allTitle', { count: INSIGHTS.length })}
            </Text>
            <Text style={typography.caption}>{t('notebook.byTopic')}</Text>
            <View style={styles.grid}>
              {INSIGHT_CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/notebook/[topic]', params: { topic: category } })}
                  style={({ pressed }) => [styles.topic, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.topicText} numberOfLines={2}>
                    {t(CATEGORY_LABEL[category])} · {INSIGHTS.filter((i) => i.category === category).length}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  head: { gap: spacing.md, marginBottom: spacing.sm },
  intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  introBubble: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: 20, borderBottomStartRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: { marginTop: spacing.sm, marginBottom: spacing.xs },
  empty: { paddingVertical: spacing.lg, color: colors.textMuted },
  topics: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topic: { flexGrow: 1, flexBasis: '30%', minHeight: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  topicText: { fontSize: 14, color: colors.text, textAlign: 'center' },
}));
