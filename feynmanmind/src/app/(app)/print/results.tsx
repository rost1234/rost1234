import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, EmptyState, Screen } from '@/components/ui';
import { enterPaperResults } from '@/data/printKit';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { openPrintKit } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { makeStyles, spacing, useTheme } from '@/theme';

/**
 * End of a paper month: tick the lessons you learned and copy your star
 * rating from the tracker. Learned lessons start in the app with their cards
 * scheduled by the rating, so nothing done on paper is lost.
 */
export default function PaperResultsScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const kit = useDBStore((s) => openPrintKit(s.db));
  const [results, setResults] = useState<Record<number, { done: boolean; stars: number }>>({});

  if (!kit) return <EmptyState icon="print-outline" title={t('print.noKit')} body={t('print.noKitBody')} action={<Button label={t('print.back')} onPress={() => router.back()} />} />;

  const get = (n: number) => results[n] ?? { done: false, stars: 0 };
  const set = (n: number, patch: Partial<{ done: boolean; stars: number }>) => setResults((r) => ({ ...r, [n]: { ...get(n), ...patch, ...(patch.stars ? { done: true } : {}) } }));
  const month = new Date(kit.year, kit.month, 1).toLocaleDateString(t.locale, { month: 'long' });
  const done = kit.stations.filter((s) => get(s.n).done).length;

  return (
    <Screen>
      <Text style={typography.heading}>{t('print.resultsTitle', { month })}</Text>
      <Text style={typography.caption}>{t('print.resultsBody')}</Text>
      <Card style={{ padding: 0, gap: 0 }}>
        {kit.stations.map((s) => {
          const r = get(s.n);
          return (
            <View key={s.n} style={styles.row}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: r.done }} accessibilityLabel={s.title} onPress={() => set(s.n, { done: !r.done })} style={styles.check} hitSlop={6}>
                <Ionicons name={r.done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={r.done ? colors.success : colors.border} />
              </Pressable>
              <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
                {s.n}. {s.title}
              </Text>
              <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={t('print.starsA11y', { n: r.stars })}>
                {[1, 2, 3, 4, 5].map((k) => (
                  <Pressable key={k} onPress={() => set(s.n, { stars: k })} hitSlop={4}>
                    <Ionicons name={k <= r.stars ? 'star' : 'star-outline'} size={20} color={k <= r.stars ? colors.accent : colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </Card>
      <Text style={typography.caption}>{t('print.starsHint')}</Text>
      <Button
        label={t('print.saveResults', { n: done })}
        icon="checkmark-done-outline"
        onPress={() => {
          enterPaperResults(
            kit.id,
            kit.stations.map((s) => ({ n: s.n, ...get(s.n) })),
          );
          haptics.success();
          router.replace('/print');
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  check: { padding: 2 },
  stars: { flexDirection: 'row', gap: 2 },
}));
