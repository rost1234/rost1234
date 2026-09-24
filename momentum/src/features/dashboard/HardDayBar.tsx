import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { activePause } from '@/domain/pauses';
import { usePlanningStore } from '@/state/planningStore';
import { useT } from '@/i18n';

const REASON_KEY = { vacation: 'pause.reason.vacation', sick: 'pause.reason.sick', other: 'pause.reason.other' } as const;

/** Low-energy toggle + an active-pause banner, for the days that aren't ideal. */
export function HardDayBar({ today }: { today: LocalDateString }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const dayMode = usePlanningStore((s) => s.dayMode);
  const pauses = usePlanningStore((s) => s.pauses);
  const toggleMinimumDay = usePlanningStore((s) => s.toggleMinimumDay);
  const pause = activePause(pauses, today);
  const isMinimum = dayMode === 'minimum';

  return (
    <View style={styles.container}>
      {pause ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={[styles.banner, styles.pause]}>
          <Ionicons name="airplane-outline" size={18} color={colors.freeze} />
          <Text style={[typography.body, styles.bannerText]}>
            {t('hardDay.pauseBanner', { reason: t(REASON_KEY[pause.reason]), date: formatFriendlyDate(pause.endDate, t.locale) })}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isMinimum }}
        accessibilityHint={t('hardDay.hint')}
        onPress={() => {
          haptics.select();
          runDetached(toggleMinimumDay());
        }}
        style={[styles.toggle, isMinimum && styles.toggleOn]}
      >
        <Ionicons name={isMinimum ? 'battery-half' : 'battery-half-outline'} size={16} color={isMinimum ? colors.onPrimary : colors.textMuted} />
        <Text style={[styles.toggleText, isMinimum && { color: colors.onPrimary }]}>
          {isMinimum ? t('hardDay.on') : t('hardDay.off')}
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  container: { gap: spacing.sm, marginBottom: spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  pause: { backgroundColor: colors.freezeSoft },
  bannerText: { flex: 1, fontSize: 14 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  toggleOn: { backgroundColor: colors.warning },
  toggleText: { ...typography.caption, fontWeight: '600' },
}));
