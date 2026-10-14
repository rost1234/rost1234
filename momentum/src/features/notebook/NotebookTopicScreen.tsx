import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { SheetHeader } from '@/components/SheetHeader';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { haptics } from '@/core/haptics';
import { INSIGHTS, insightLines, teaserOf } from '@/content/insights';
import { INSIGHT_CATEGORIES, type InsightCategory } from '@/content/insightSchema';
import { useGardenGrowth } from '@/features/garden/useGarden';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useT } from '@/i18n';
import { useNotebookStore } from '@/state/notebookStore';
import { CATEGORY_LABEL, NoteEntry } from './NoteEntry';
import { NotebookIntro } from './NotebookScreen';
import { toldEntries } from './notebookEntries';
import { useShownInsights } from './useShownInsights';

const isCategory = (value: unknown): value is InsightCategory => typeof value === 'string' && (INSIGHT_CATEGORIES as readonly string[]).includes(value);

/**
 * One topic of the notebook: what the sprout already told about it, and the rest as short teasers
 * ("I read a study from London…") to hear now. Hearing one counts it as told today.
 */
export function NotebookTopicScreen() {
  const t = useT();
  const { look, colors, typography } = useTheme();
  const styles = useStyles();
  const garden = look === 'garden';
  const he = t.language === 'he';
  const today = useLocalDate();
  const growth = useGardenGrowth();
  const bottomSpace = useBottomSpace();
  const notes = useNotebookStore((s) => s.notes);
  const { shown, listen } = useShownInsights();
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = isCategory(params.topic) ? params.topic : 'habits';

  const cards = INSIGHTS.filter((i) => i.category === topic);
  const told = shown ? toldEntries(cards, shown, notes) : [];
  const untold = shown ? cards.filter((i) => shown[i.id] === undefined) : [];
  const name = t(CATEGORY_LABEL[topic]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={name} />
        <NotebookIntro
          garden={garden}
          text={t(garden ? 'notebook.topicIntro' : 'notebook.topicIntroCalm', { topic: name, count: cards.length, told: told.length })}
        />

        {told.length > 0 ? (
          <Text style={[typography.caption, styles.section]} accessibilityRole="header">
            {t(garden ? 'notebook.toldCount' : 'notebook.toldCountCalm', { count: told.length })}
          </Text>
        ) : null}
        {told.map((entry) => (
          <NoteEntry key={entry.insight.id} entry={entry} garden={garden} stage={growth.stage} />
        ))}

        {untold.length > 0 ? (
          <Text style={[typography.caption, styles.section]} accessibilityRole="header">
            {t(garden ? 'notebook.untoldCount' : 'notebook.untoldCountCalm', { count: untold.length })}
          </Text>
        ) : null}
        {untold.map((insight) => (
          <Pressable
            key={insight.id}
            accessibilityRole="button"
            accessibilityHint={t(garden ? 'notebook.listenHint' : 'notebook.showHint')}
            onPress={() => {
              haptics.select();
              listen(insight.id, today);
            }}
            style={({ pressed }) => [styles.untold, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name={garden ? 'chatbubble-ellipses-outline' : 'bulb-outline'} size={20} color={colors.primary} />
            <View style={styles.untoldText}>
              <Text style={typography.body}>{teaserOf(insightLines(insight, he, garden).finding)}</Text>
              <Text style={typography.caption}>{t(garden ? 'notebook.listen' : 'notebook.show')}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  section: { marginTop: spacing.md },
  untold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  untoldText: { flex: 1, gap: 2 },
}));
