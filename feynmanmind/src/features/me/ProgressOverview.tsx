import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SketchBorder, SketchCircle, useSeed } from '@/components/sketch';
import { SectionHeader, type IconName } from '@/components/ui';
import { useProgress } from '@/data/study';
import { useT } from '@/i18n';
import type { AchievementKey } from '@/local/logic';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Four numbers (streak, minutes this week, recall rate, concepts) and the achievement badges. */
export function ProgressOverview() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography, look } = useTheme();
  // A stamp's ink: faded red on paper, yellow chalk on the board.
  const stampInk = look === 'chalk' ? colors.primary : 'rgba(163,48,31,0.85)';
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
              look === 'classic'
                ? a.earned
                  ? { backgroundColor: colors.accentSoft }
                  : { backgroundColor: colors.surfaceMuted, opacity: 0.55 }
                : !a.earned && { opacity: 0.45 },
              look === 'classic' && selected === a.key && { borderColor: colors.primary, borderWidth: 2 },
              // Earned badges are stamped into the notebook at a slight angle.
              look !== 'classic' && a.earned && { transform: [{ rotate: `${(a.key.length % 5) * 4 - 8}deg` }] },
            ]}
          >
            {look === 'classic' ? null : (
              <SketchCircle
                size={56}
                color={a.earned ? stampInk : selected === a.key ? colors.primary : colors.border}
                seed={a.key.length * 19 + a.key.charCodeAt(0)}
                width={a.earned ? 3 : 2}
              />
            )}
            {look === 'paper' && a.earned ? <View style={styles.stampInner} /> : null}
            <Ionicons
              name={(a.earned ? a.icon : `${a.icon}-outline`) as IconName}
              size={24}
              color={a.earned ? (look === 'classic' ? colors.accent : stampInk) : colors.textMuted}
            />
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
  const { typography, look } = useTheme();
  const seed = useSeed();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      {look === 'chalk' ? <SketchBorder color="rgba(238,240,232,0.75)" seed={seed} radius={14} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale, look, fonts }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: look === 'chalk' ? 'rgba(255,255,255,0.035)' : colors.surface,
    borderWidth: look === 'chalk' ? 0 : 1,
    borderColor: colors.border,
    borderRadius: look === 'paper' ? 3 : radius.lg,
    padding: spacing.md,
    gap: 2,
    ...(look === 'paper' ? { boxShadow: '0px 1px 0px #CDB68A' } : {}),
  },
  value:
    look === 'chalk'
      ? { color: colors.text, fontFamily: fonts.hand, fontSize: Math.round(38 * textScale), lineHeight: Math.round(40 * textScale), fontWeight: '700' }
      : { color: colors.text, fontFamily: fonts.heading, fontSize: Math.round(24 * textScale), fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge:
    look === 'classic'
      ? { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' }
      : { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  // The inner ring of a rubber stamp.
  stampInner: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(163,48,31,0.6)' },
  detail: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 2 },
}));
