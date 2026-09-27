import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate } from '@/core/localDate';
import { activePause } from '@/domain/pauses';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useT } from '@/i18n';
import { usePlanningStore } from '@/state/planningStore';

/** Settings row that opens the streak protection screen (freezes and pauses). */
export function StreakProtectionLink({ freezes }: { freezes: number }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const today = useLocalDate();
  const pause = activePause(usePlanningStore((s) => s.pauses), today);
  const status = [
    t.plural('today.freezes', freezes),
    pause ? t('protect.pausedUntil', { date: formatFriendlyDate(pause.endDate, t.locale) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/streaks')} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.icon}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.freeze} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.label}>{t('protect.title')}</Text>
        <Text style={typography.caption}>{status}</Text>
        <Text style={typography.caption}>{t('protect.linkLead')}</Text>
      </View>
      <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.freezeSoft },
}));
