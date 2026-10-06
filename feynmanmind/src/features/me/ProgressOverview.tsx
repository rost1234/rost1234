import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SectionHeader, type IconName } from '@/components/ui';
import { useProgress } from '@/data/study';
import { useT } from '@/i18n';
import type { AchievementKey } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Four numbers (streak, minutes this week, recall rate, concepts) and the achievement badges. */
export function ProgressOverview() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const { summary: p, achievements } = useProgress();
  const [selected, setSelected] = useState<AchievementKey | null>(null);
  const earned = achievements.filter((a) => a.earned).length;
  const shown = achievements.find((a) => a.key === selected);

  return (
    <>
      <View style={styles.grid}>
        <Stat icon="flame" color={colors.accent} value={p.streak} label={t('me.streak')} />
        <Stat icon="time-outline" color={colors.primary} value={p.weekMinutes} label={t('me.weekMinutes')} />
        <Stat icon="checkmark-done" color={colors.success} value={p.accuracy === null ? '–' : `${p.accuracy}%`} label={t('me.accuracy')} />
        <Stat icon="bulb-outline" color={colors.primary} value={p.concepts} label={t('me.concepts')} />
      </View>

      <SectionHeader title={t('me.achievements', { earned, total: achievements.length })} />
      <View style={styles.badges}>
        {achievements.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={`${t(`ach.${a.key}.title`)}. ${a.earned ? t('me.earned') : t('me.locked')}`}
            accessibilityState={{ selected: selected === a.key }}
            onPress={() => setSelected(selected === a.key ? null : a.key)}
            style={[
              styles.badge,
              a.earned ? { backgroundColor: colors.accentSoft } : { backgroundColor: colors.surfaceMuted, opacity: 0.55 },
              selected === a.key && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <Ionicons name={(a.earned ? a.icon : `${a.icon}-outline`) as IconName} size={24} color={a.earned ? colors.accent : colors.textMuted} />
          </Pressable>
        ))}
      </View>
      {shown ? (
        <View style={styles.detail} accessibilityLiveRegion="polite">
          <Text style={typography.subheading}>
            {t(`ach.${shown.key}.title`)} {shown.earned ? '✓' : ''}
          </Text>
          <Text style={typography.caption}>{t(`ach.${shown.key}.body`)}</Text>
        </View>
      ) : (
        <Text style={typography.caption}>{t('me.achievementsHint')}</Text>
      )}
    </>
  );
}

function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: string | number; label: string }) {
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  value: { color: colors.text, fontSize: Math.round(24 * textScale), fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  detail: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 2 },
}));
