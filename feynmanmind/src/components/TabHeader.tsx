import { View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stamp } from '@/components/sketch';
import { useStudyStats } from '@/data/study';
import { useT } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

/** Top of each main tab: a small caption, a big title, and the streak. */
export function TabHeader({ title, caption }: { title: string; caption?: string }) {
  const t = useT();
  const { colors, typography, look } = useTheme();
  const streak = useStudyStats().data?.streak_days ?? 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
      <View style={{ flex: 1, gap: 2 }}>
        {caption ? <Text style={typography.caption}>{caption}</Text> : null}
        <Text style={typography.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {streak > 0 && look !== 'classic' ? (
        // The notebook looks mark the streak with a stamp (red ink on paper, yellow chalk on the board).
        <View accessible accessibilityLabel={t.plural('today.streak', streak)}>
          <Stamp tilt={-7}>{t.plural('today.streak', streak)}</Stamp>
        </View>
      ) : streak > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
          accessible
          accessibilityLabel={t.plural('today.streak', streak)}
        >
          <Ionicons name="flame" size={16} color={colors.accent} />
          <Text style={[typography.subheading, { color: colors.accent }]}>{streak}</Text>
        </View>
      ) : null}
    </View>
  );
}
