import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import type { LocalDateString } from '@/core/localDate';
import type { Insight } from '@/content/insightSchema';
import type { GrowthStage } from '@/domain/garden';
import { InsightView } from '@/features/insights/InsightCard';
import { useT } from '@/i18n';
import { useSproutTipStore } from '@/state/sproutTipStore';
import { Sprout } from './Sprout';

/**
 * The day's research insight, told by the sprout: a speech bubble under it with the finding,
 * "what to do" on tap, and the source. "Got it" puts it away until tomorrow's.
 */
export function SproutTip({ insight, today, stage }: { insight: Insight; today: LocalDateString; stage: GrowthStage }) {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const dismiss = useSproutTipStore((s) => s.dismiss);
  return (
    <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
      <View style={[styles.tail, { backgroundColor: colors.surface }]} />
      <InsightView
        insight={insight}
        title={t('tip.title')}
        bare
        icon={
          <View style={styles.avatar}>
            <Sprout stage={stage} mood="happy" size={30} />
          </View>
        }
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.tap();
          dismiss(today);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.gotIt, { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.8 }]}
      >
        <Text style={[styles.gotItText, { color: colors.primary }]}>{t('tip.gotIt')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  bubble: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm },
  tail: { position: 'absolute', top: -7, end: 64, width: 16, height: 16, transform: [{ rotate: '45deg' }] },
  avatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  gotIt: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center' },
  gotItText: { fontSize: 15, fontWeight: '700' },
}));
