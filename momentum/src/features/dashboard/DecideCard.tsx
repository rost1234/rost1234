import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useTaskStore } from '@/state/taskStore';
import { useT } from '@/i18n';

/** Unfinished tasks never silently pile up: the user decides what happens to them. */
export function DecideCard() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const count = useTaskStore((s) => s.overdue.length);
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('decide.a11y', { count })}
      onPress={() => router.push('/review')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.emoji}>📋</Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>
          {t.plural('decide.title', count)}
        </Text>
        <Text style={typography.caption}>{t('decide.subtitle')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    marginTop: spacing.lg,
  },
  emoji: { fontSize: 24 },
  chevron: { fontSize: 28, color: colors.textMuted },
}));
