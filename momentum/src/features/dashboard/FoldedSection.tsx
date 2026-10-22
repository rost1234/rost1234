import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useT } from '@/i18n';

/**
 * A section shown as one line ("📋 3 for today · 1 open") until tapped, then open. Used on
 * days off, so work waits quietly instead of leading the screen, and for Progress details.
 * Once open, "Close" next to the title folds it back.
 */
export function FoldedSection({
  icon,
  title,
  summary,
  hint,
  children,
}: {
  icon: string;
  title: string;
  summary: string;
  /** What opening it shows (for screen readers); the day-off tasks hint by default. */
  hint?: string;
  children: ReactNode;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <>
        <SectionTitle
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fold.closeA11y', { title })}
              accessibilityState={{ expanded: true }}
              onPress={() => setOpen(false)}
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
            >
              <Text style={typography.caption}>{t('fold.close')}</Text>
              <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
            </Pressable>
          }
        >
          {title}
        </SectionTitle>
        {children}
      </>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${summary}`}
      accessibilityHint={hint ?? t('dayoff.openHint')}
      accessibilityState={{ expanded: false }}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text style={typography.label}>{title}</Text>
        <Text style={typography.caption}>· {summary}</Text>
      </View>
      <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: { fontSize: 18 },
  close: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32, paddingHorizontal: spacing.sm },
}));
