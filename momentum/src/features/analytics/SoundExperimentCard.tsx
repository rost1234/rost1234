import { Text, View } from 'react-native';
import { Card, ProgressBar } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { MIN_SESSIONS_PER_GROUP, type SessionGroupStats, type SoundExperiment } from '@/domain/soundExperiment';
import { findSound, type FocusSoundId } from '@/features/focus/sounds';
import { useT } from '@/i18n';

function GroupRow({ label, stats, color }: { label: string; stats: SessionGroupStats; color: string }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <Text style={typography.label}>{label}</Text>
        <Text style={typography.caption}>{t.plural('exp.sessions', stats.sessions)}</Text>
      </View>
      <ProgressBar value={stats.completionRate} color={color} />
      <Text style={typography.caption}>
        {t('exp.stats', { percent: Math.round(stats.completionRate * 100), minutes: stats.averageMinutes })}
      </Text>
    </View>
  );
}

/** "Does sound help *me*?" — compares the user's own sessions with and without sound. */
export function SoundExperimentCard({ experiment }: { experiment: SoundExperiment }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const favorite = experiment.favoriteSound
    ?.split('+')
    .map((id) => findSound(id as FocusSoundId))
    .filter((s) => s !== undefined)
    .map((s) => t(s.label))
    .join(' + ');

  return (
    <Card style={styles.card}>
      <Text style={typography.caption}>{t('exp.intro')}</Text>
      <GroupRow label={t('exp.withSound')} stats={experiment.withSound} color={colors.primary} />
      <GroupRow label={t('exp.silence')} stats={experiment.silence} color={colors.textMuted} />
      {favorite ? <Text style={typography.caption}>{t('exp.favorite', { sound: favorite })}</Text> : null}
      <Text style={[typography.caption, styles.verdict]}>
        {experiment.enoughData
          ? t('exp.caveat')
          : t('exp.notEnough', { min: MIN_SESSIONS_PER_GROUP })}
      </Text>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  group: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verdict: { fontStyle: 'italic' },
}));
