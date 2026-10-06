import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, Chevron, ProgressBar, SectionHeader, type IconName } from '@/components/ui';
import { useContinueLearning } from '@/data/courses';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** "Continue learning": the next station of the course you worked on last. */
export function ContinueCard() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const c = useContinueLearning().data;
  if (!c) return null;

  return (
    <>
      <SectionHeader title={t('home.continue')} />
      <Card onPress={() => router.push(`/course/${c.course.id}/${c.station.key}`)} accessibilityLabel={`${c.course.title}: ${c.station.title}`}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={c.course.icon as IconName} size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.subheading} numberOfLines={1}>
              {c.course.title}
            </Text>
            <Text style={typography.caption} numberOfLines={1}>
              {c.station.title}
            </Text>
            <View style={[styles.row, { marginTop: 4 }]}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={c.total ? c.done / c.total : 0} height={6} />
              </View>
              <Text style={typography.caption}>{t('courses.progress', { done: c.done, total: c.total })}</Text>
            </View>
          </View>
          <Chevron />
        </View>
      </Card>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
