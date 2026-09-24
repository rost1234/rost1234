import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from './theme';

export interface TabItem {
  name: string;
  title: string;
  glyph: string;
}

interface SwipeTabBarProps {
  items: readonly TabItem[];
  activeIndex: number;
  onPress: (name: string, isFocused: boolean) => void;
}

/** Bottom tab bar for the swipeable pager (the pager itself handles swipes). */
export function SwipeTabBar({ items, activeIndex, onPress }: SwipeTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {items.map((item, index) => {
        const focused = index === activeIndex;
        const color = focused ? colors.primary : colors.textMuted;
        return (
          <Pressable
            key={item.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.title}
            onPress={() => onPress(item.name, focused)}
            style={styles.tab}
          >
            <Text style={[styles.glyph, { color }]}>{item.glyph}</Text>
            <Text style={[styles.label, { color }]}>{item.title}</Text>
            <View style={[styles.indicator, focused && { backgroundColor: colors.primary }]} />
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  glyph: { fontSize: 18 },
  label: { fontSize: 12, fontWeight: '600' },
  indicator: { width: 18, height: 3, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
});
