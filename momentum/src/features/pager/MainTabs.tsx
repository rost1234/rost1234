import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { useT, type TranslationKey } from '@/i18n';
import { PAGES, usePagerStore, type PageId } from './pager';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<PageId, { label: TranslationKey; icon: IconName; iconOn: IconName; gardenIcon?: IconName; gardenIconOn?: IconName }> = {
  home: { label: 'tabs.home', icon: 'today-outline', iconOn: 'today', gardenIcon: 'leaf-outline', gardenIconOn: 'leaf' },
  calendar: { label: 'tabs.calendar', icon: 'calendar-outline', iconOn: 'calendar' },
  insights: { label: 'tabs.insights', icon: 'bar-chart-outline', iconOn: 'bar-chart' },
};

/** Height of the bar and the gap under it (pages leave this much room at the bottom). */
export const TAB_BAR_SPACE = 88;

/**
 * The tab bar of the main screens (they also swipe). In the Garden look it's the rounded
 * dock with a sun-yellow current tab; in the regular look a slim floating bar.
 */
export function MainTabs() {
  const t = useT();
  const { colors, scenery, look } = useTheme();
  const styles = useStyles();
  const bottomInset = useSafeAreaInsets().bottom;
  const page = usePagerStore((s) => s.page);
  const go = usePagerStore((s) => s.go);
  const keyboardOpen = useKeyboardOpen();
  const garden = look === 'garden';
  if (keyboardOpen) return null;

  return (
    <View accessibilityRole="tablist" style={[styles.bar, garden && styles.gardenBar, { bottom: bottomInset + spacing.md }]}>
      {PAGES.map((id) => {
        const tab = TABS[id];
        const on = id === page;
        const icon = garden ? (on ? (tab.gardenIconOn ?? tab.iconOn) : (tab.gardenIcon ?? tab.icon)) : on ? tab.iconOn : tab.icon;
        const tint = on ? (garden ? scenery.onSun : colors.primary) : colors.textMuted;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(tab.label)}
            onPress={() => {
              if (on) return;
              haptics.select();
              go(id);
            }}
            style={({ pressed }) => [
              styles.tab,
              on && { backgroundColor: garden ? scenery.sun : colors.primarySoft },
              pressed && !on && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={icon} size={22} color={tint} />
            <Text style={[styles.label, { color: tint }, on && styles.labelOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow, flat }) => ({
  bar: {
    position: 'absolute',
    start: spacing.md,
    end: spacing.md,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...flat,
    ...shadow,
    shadowOpacity: 0.12,
    elevation: 6,
  },
  gardenBar: { height: 72, borderRadius: 36, borderWidth: 2 },
  tab: { flex: 1, height: 54, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: radius.md },
  label: { fontSize: 11 },
  labelOn: { fontWeight: '700' },
}));
