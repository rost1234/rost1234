import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IconName } from './ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** A settings row (icon, title, current value) that opens in place to show its controls. */
export function Collapsible({
  icon,
  title,
  summary,
  children,
  initiallyOpen = false,
  grouped = false,
}: {
  icon: IconName;
  title: string;
  summary?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  /** Part of a stacked group (no own border and radius). */
  grouped?: boolean;
}) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={grouped ? styles.grouped : styles.box}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={summary ? `${title}, ${summary}` : title}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.head, pressed && { backgroundColor: colors.surfaceMuted }]}
      >
        <View style={styles.icon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.subheading}>{title}</Text>
          {summary ? (
            <Text style={typography.caption} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

/** Stacks Collapsibles (with `grouped`) into one card with dividers. */
export function CollapsibleGroup({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.group}>{children}</View>;
}

const useStyles = makeStyles(({ colors }) => ({
  box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  grouped: { borderBottomWidth: 1, borderBottomColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 60 },
  icon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
}));
