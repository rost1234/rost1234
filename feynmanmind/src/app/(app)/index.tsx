import { Text, View } from 'react-native';
import { Screen } from '@/components/ui';
import { CoursesSection } from '@/features/home/CoursesSection';
import { LibrarySection } from '@/features/home/LibrarySection';
import { SettingsSection } from '@/features/home/SettingsSection';
import { ProgressSection, TodaySection } from '@/features/home/TodaySection';
import { useT } from '@/i18n';
import { greetingKey } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

/**
 * The whole app on one scrolling screen: today's review, stats, guided
 * learning paths, the library,
 * progress charts and settings. Detail flows (concept, explain, generate,
 * review session) open on top of it.
 */
export default function HomeScreen() {
  const t = useT();
  const { typography } = useTheme();
  return (
    <Screen edges={['top']}>
      <View style={{ gap: 2, marginTop: spacing.sm }}>
        <Text style={typography.caption}>{new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={typography.title} accessibilityRole="header">
          {t(greetingKey())}
        </Text>
      </View>
      <TodaySection />
      <CoursesSection />
      <LibrarySection />
      <ProgressSection />
      <SettingsSection />
    </Screen>
  );
}
