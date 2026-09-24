import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/core/haptics';
import { colors, radius, spacing } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface TabItem {
  name: string;
  title: string;
  icon: IconName;
  iconActive: IconName;
}

interface SwipeTabBarProps {
  items: readonly TabItem[];
  activeIndex: number;
  /** Dark variant (used while the focus screen is showing). */
  dark?: boolean;
  onPress: (name: string, isFocused: boolean) => void;
}

/** Bottom tab bar for the swipeable pager (the pager itself handles swipes). */
export function SwipeTabBar({ items, activeIndex, dark = false, onPress }: SwipeTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, dark && styles.barDark, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      accessibilityRole="tablist"
    >
      {items.map((item, index) => {
        const focused = index === activeIndex;
        const color = focused ? (dark ? '#FFFFFF' : colors.primary) : dark ? '#8E8FB8' : colors.textMuted;
        return (
          <Pressable
            key={item.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.title}
            onPress={() => {
              if (!focused) haptics.select();
              onPress(item.name, focused);
            }}
            style={styles.tab}
          >
            <View style={[styles.pill, focused && (dark ? styles.pillActiveDark : styles.pillActive)]}>
              <Ionicons name={focused ? item.iconActive : item.icon} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{item.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  barDark: { backgroundColor: '#0B0C1A', borderTopColor: 'rgba(255,255,255,0.08)' },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: 4, borderRadius: radius.pill },
  pillActive: { backgroundColor: colors.primarySoft },
  pillActiveDark: { backgroundColor: 'rgba(139,139,255,0.22)' },
  label: { fontSize: 12, fontWeight: '600' },
});
