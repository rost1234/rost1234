import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, ProgressBar } from '@/components/ui';
import { useContinueLearning } from '@/data/courses';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** "Continue where you left off": the next station of the course you worked on last. */
export function ContinueCard() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const query = useContinueLearning();
  const c = query.data;
  if (!c) return null;

  return (
    <View style={styles.hero}>
      <Text style={[typography.label, styles.kicker]}>{t('home.continue').toLocaleUpperCase()}</Text>
      <Text style={[typography.heading, styles.text]}>
        {c.course.title} · {c.station.title}
      </Text>
      <Text style={[typography.caption, styles.sub]}>
        {t(`level.${c.levelKey}`)}
        {c.station.unit ? ` · ${c.station.unit}` : ''}
      </Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={c.total ? c.done / c.total : 0} color={colors.onPrimary} height={6} />
        </View>
        <Text style={[typography.caption, styles.sub]}>{t('courses.progress', { done: c.done, total: c.total })}</Text>
      </View>
      <Button label={t('home.continueButton')} icon="play" variant="secondary" onPress={() => router.push(`/course/${c.course.id}/${c.station.key}`)} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.onPrimary, opacity: 0.85 },
  text: { color: colors.onPrimary },
  sub: { color: colors.onPrimary, opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
}));
