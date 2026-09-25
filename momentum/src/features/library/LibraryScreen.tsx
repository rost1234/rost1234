import { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SheetHeader } from '@/components/SheetHeader';
import { Chip } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { INSIGHT_CATEGORIES, type InsightCategory } from '@/content/insightSchema';
import { INSIGHTS, InsightView } from '@/features/insights/InsightCard';
import { type TranslationKey, useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

const CATEGORY_LABEL: Record<InsightCategory, TranslationKey> = {
  habits: 'lib.cat.habits',
  focus: 'lib.cat.focus',
  sleep_energy: 'lib.cat.sleep_energy',
  mood: 'lib.cat.mood',
  social: 'lib.cat.social',
  motivation: 'lib.cat.motivation',
};

/** Every research card, browsable by topic. Opened from the 📚 button on Home. */
export function LibraryScreen() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const [category, setCategory] = useState<InsightCategory | null>(null);
  const items = category ? INSIGHTS.filter((i) => i.category === category) : INSIGHTS;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
        ListHeaderComponent={
          <View style={styles.head}>
            <SheetHeader title={t('lib.title')} />
            <Text style={typography.caption}>{t('lib.lead', { count: INSIGHTS.length })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('lib.all')} selected={category === null} onPress={() => setCategory(null)} />
              {INSIGHT_CATEGORIES.map((c) => (
                <Chip key={c} label={t(CATEGORY_LABEL[c])} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => <InsightView insight={item} title={t(CATEGORY_LABEL[item.category])} />}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  head: { gap: spacing.sm, marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
}));
