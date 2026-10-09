import { Platform, Pressable, Text, View } from 'react-native';
import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueueCount } from '@/data/study';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';
import { makeStyles, radius, spacing, useTheme, type Palette } from '@/theme';
import { useBottomInset } from '@/lib/safeArea';

/** Swipeable tabs (material top tabs) with the tab bar moved to the bottom. */
const SwipeTabs = TopTabs;

const TABS = {
  index: { icon: 'home', label: 'tabs.today' },
  learn: { icon: 'book', label: 'tabs.learn' },
  review: { icon: 'repeat', label: 'tabs.review' },
  me: { icon: 'person', label: 'tabs.me' },
} as const;

/**
 * The four main areas — Today, Learn, Review, Me — reachable by tapping the
 * bar at the bottom or swiping left and right.
 */
export default function TabsLayout() {
  const t = useT();
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();
  // On web the pager positions pages left-to-right while the page itself is RTL, which pushes
  // every tab but the first out of view. Lay the pager out LTR there and keep scenes RTL.
  const webRtl = Platform.OS === 'web' && t.isRTL;
  return (
    <SwipeTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <BottomBar {...props} />}
      style={webRtl ? { direction: 'ltr' } : undefined}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: !reduceMotion,
        lazy: true,
        sceneStyle: { backgroundColor: colors.background, ...(webRtl ? { direction: 'rtl' as const } : null) },
      }}
    >
      <SwipeTabs.Screen name="index" />
      <SwipeTabs.Screen name="learn" />
      <SwipeTabs.Screen name="review" />
      <SwipeTabs.Screen name="me" />
    </SwipeTabs>
  );
}

function BottomBar({ state, navigation }: MaterialTopTabBarProps) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  const due = useQueueCount();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.sm) }, Platform.OS === 'web' && t.isRTL && { direction: 'rtl' }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const tab = TABS[route.name as keyof typeof TABS];
        if (!tab) return null;
        const focused = state.index === index;
        const label = t(tab.label);
        const badge = route.name === 'review' ? due : 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            aria-selected={focused}
            accessibilityLabel={badge ? `${label}, ${t.plural('tabs.dueBadge', badge)}` : label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptics.tap();
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={focused ? tab.icon : (`${tab.icon}-outline` as const)} size={22} color={focused ? colors.primary : colors.textMuted} />
              {badge > 0 ? <Badge count={badge} colors={colors} /> : null}
            </View>
            <Text style={[styles.label, { color: focused ? colors.primary : colors.textMuted }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Badge({ count, colors }: { count: number; colors: Palette }) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, { backgroundColor: colors.danger }]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52, justifyContent: 'center' },
  iconWrap: { paddingHorizontal: spacing.lg, paddingVertical: 4, borderRadius: radius.pill },
  label: { fontSize: Math.round(12 * textScale), fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
}));
