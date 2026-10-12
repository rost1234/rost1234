import { Platform, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
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
  const { colors, look } = useTheme();
  // The selected tab: red pen on paper, yellow chalk on the board, the primary color in the classic look.
  const active = look === 'paper' ? colors.danger : colors.primary;
  const bottomInset = useBottomInset();
  const due = useQueueCount();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.sm) }, Platform.OS === 'web' && t.isRTL && { direction: 'rtl' }]}
      accessibilityRole="tablist"
    >
      {look === 'chalk' ? (
        // The board's wooden chalk tray, with a stick of white and one of yellow chalk resting on it.
        <View style={styles.tray} pointerEvents="none">
          <View style={[styles.chalkStick, { left: '18%', backgroundColor: '#F4F4EC', transform: [{ rotate: '-3deg' }] }]} />
          <View style={[styles.chalkStick, { left: '24%', width: 22, backgroundColor: '#FFE27A', transform: [{ rotate: '4deg' }] }]} />
        </View>
      ) : null}
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
            <View style={[styles.iconWrap, look === 'classic' && focused && { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={focused ? tab.icon : (`${tab.icon}-outline` as const)} size={22} color={focused ? active : colors.textMuted} />
              {badge > 0 ? <Badge count={badge} colors={colors} /> : null}
            </View>
            <Text style={[styles.label, { color: focused ? active : colors.textMuted }]} numberOfLines={1}>
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

const useStyles = makeStyles(({ colors, textScale, look, fonts }) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.chrome,
    borderTopWidth: look === 'chalk' ? 0 : 1,
    borderTopColor: colors.border,
    paddingTop: look === 'chalk' ? spacing.md : spacing.xs,
  },
  tray: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 9,
    backgroundColor: '#7A5230',
    borderTopWidth: 2,
    borderTopColor: '#9A6B40',
    borderBottomWidth: 1,
    borderBottomColor: '#4E301A',
    boxShadow: '0px 3px 6px rgba(0,0,0,0.35)',
  },
  chalkStick: { position: 'absolute', top: -4, width: 34, height: 6, borderRadius: 3, boxShadow: '0px 1px 1px rgba(0,0,0,0.3)' },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52, justifyContent: 'center' },
  iconWrap: { paddingHorizontal: spacing.lg, paddingVertical: 4, borderRadius: radius.pill },
  label: look === 'chalk'
    ? { fontFamily: fonts.hand, fontSize: Math.round(22 * textScale), lineHeight: Math.round(24 * textScale), fontWeight: '700' }
    : { fontSize: Math.round(12 * textScale), fontWeight: '700' },
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
