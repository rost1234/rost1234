import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useT } from '@/i18n';

/**
 * A section shown as one line ("📋 3 for today · 1 open") until tapped. Used on
 * days off, so work waits quietly instead of leading the screen.
 */
export function FoldedSection({ icon, title, summary, children }: { icon: string; title: string; summary: string; children: ReactNode }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <>
        <SectionTitle>{title}</SectionTitle>
        {children}
      </>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${summary}`}
      accessibilityHint={t('dayoff.openHint')}
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
}));
